\# planner\_frontend\_fragment\_HomePlus\_SECCION\_1\_PRODUCTO

\#\# 1\. Fuente

\* Documento: \`HomePlus — SECCION 1 PRODUCTO.md\`  
\* Archivo de comprensión asociado: \`Seccion 1 Producto.txt\`  
\* Tipo de documento: Product Brain / sección de producto / extracción estructurada asociada.  
\* Alcance del documento: define problema central, visión, misión, propuesta de valor, dominios oficiales, adopción, principios de visibilidad, Geni, navegación y entidades/relaciones de alto nivel.  
\* Nivel de utilidad para Planner Frontend: Medio.  
\* Motivo: aporta muy buena filosofía, rol de Planner dentro del ecosistema, navegación general, relación con Home, relación con Quick Actions, entidades base de Tasks/Calendar/Goals y algunas reglas visuales/funcionales indirectas. No define pantallas completas, formularios, layout detallado, componentes finales ni contratos API.

\#\# 2\. Resumen útil para Planner Frontend

Este documento posiciona Planner como el núcleo operativo de HomePlus. Planner administra Tasks, Calendar y Goals, y existe para reducir la carga mental del coordinador, hacer visible quién hace qué y permitir que cada miembro vea sus propias tareas, eventos y metas sin tener que preguntar.

Para el frontend ideal de Planner, el documento aporta estas ideas centrales:

\* Planner debe sentirse como una herramienta de coordinación familiar diaria, no como una app genérica de tareas.  
\* El usuario debe entender rápidamente qué tiene que hacer, cuándo, y quién es responsable.  
\* La pantalla debe ayudar a reemplazar WhatsApp, memoria personal, notas sueltas, calendarios aislados y recordatorios dispersos.  
\* Las tareas y responsabilidades deben ser visibles para reducir conflicto y carga invisible.  
\* Planner debe funcionar incluso con un solo usuario activo.  
\* Cuando la familia se suma, Planner debe mostrar valor individual inmediato: “mis tareas”, “mis eventos”, “mis metas”.  
\* Home resume información de Planner; Planner administra.  
\* Quick Actions debe dar acceso rápido a acciones frecuentes relacionadas con Planner.  
\* Responsabilidades no son un dominio independiente: son propiedad de Task y eje organizador dentro de Tasks.  
\* Goals aparecen como parte de Planner, pero para el MVP actual deben tratarse como referencia futura o visual, no como foco principal.

\#\# 3\. Principios de producto aplicables

\#\#\# 3.1 Reducir carga mental

El problema central identificado es la “asimetría de coordinación”: una persona recuerda, pide, organiza y coordina más que el resto. Planner debe diseñarse para reducir esa carga mental haciendo visibles tareas, eventos y responsabilidades.

Aplicación al frontend:

\* Mostrar pendientes de forma clara.  
\* Priorizar “qué tengo que hacer hoy / pronto”.  
\* Evitar que el usuario tenga que buscar información en múltiples lugares.  
\* Hacer obvio quién es responsable de cada tarea o evento cuando ese dato exista.  
\* Evitar pantallas sobrecargadas que reproduzcan la fragmentación del problema original.

\#\#\# 3.2 Centralizar información dispersa

El documento menciona que las familias usan calendarios, chats de WhatsApp, notas sueltas, apps de tareas, recordatorios y otros canales aislados. Planner debe contribuir a centralizar tareas, calendario y metas.

Aplicación al frontend:

\* Planner debe unificar tareas y eventos en una experiencia coherente.  
\* Calendar debe mostrar eventos y, si corresponde en otros documentos, tareas con fecha.  
\* La navegación interna debe evitar separar excesivamente cosas que para la familia pertenecen al mismo problema operativo.

\#\#\# 3.3 Visibilidad del esfuerzo

El documento indica que HomePlus hace visible quién hace qué y cómo se distribuye la carga. Cada responsabilidad tiene rostro y cada acción relevante queda visible/registrada.

Aplicación al frontend:

\* Las tareas deben mostrar responsable cuando esté disponible.  
\* Las acciones completadas deben tener feedback visible.  
\* El diseño debe presentar hechos, no juicios.  
\* La UI debe evitar lenguaje acusatorio.  
\* Los estados deben mostrar progreso y responsabilidad sin generar culpa.

\#\#\# 3.4 Proactividad por defecto

HomePlus debe anticipar conflictos de horarios, vencimientos de tareas y otros problemas antes de que generen fricción.

Aplicación al frontend:

\* Mostrar vencimientos y próximos eventos con prioridad visual.  
\* Destacar atención requerida.  
\* Permitir que Home o Planner muestren alertas/resúmenes.  
\* Para MVP, esto puede ser visual o mock si no hay lógica real definida.

\#\#\# 3.5 Ecosistema integrado

El documento define que los dominios no se comportan como apps separadas. Planner se relaciona con otros dominios.

Aplicación al frontend:

\* Planner debe tener entrada clara desde Bottom Navigation.  
\* Home debe mostrar resúmenes de Planner.  
\* Quick Actions debe permitir acciones relacionadas.  
\* Las integraciones con otros dominios deben marcarse como futuras/demo si no están en scope actual.

\#\#\# 3.6 Valor desde el minuto 1

Cada dominio debe funcionar con un solo usuario activo. Planner debe dar control sobre tareas, calendario y metas personales sin depender de que otros miembros se sumen.

Aplicación al frontend:

\* Debe existir estado útil aunque haya un solo usuario.  
\* El empty state no debe depender de invitar familiares.  
\* Crear una tarea o evento debe ser posible como valor individual.  
\* Debe mostrar “mis tareas / mis eventos” de forma comprensible.

\#\#\# 3.7 Valor individual para miembros invitados

Cuando un miembro se suma, debe ver lo que le importa en los primeros 60 segundos. Para Planner: sus propias tareas, eventos y metas.

Aplicación al frontend:

\* Planner debería permitir vistas personales o filtros “mis tareas / mis eventos” si otros documentos lo confirman.  
\* El primer contacto del receptor con Planner debe ser simple, orientado a acción y no centrado en administración.

\#\#\# 3.8 Transparencia radical con tono de reconocimiento

El documento establece transparencia radical, pero con presentación de hechos y tono de reconocimiento, sin acusar.

Aplicación al frontend:

\* Mostrar datos operativos sin lenguaje punitivo.  
\* Evitar mensajes como “no cumpliste”.  
\* Preferir mensajes neutrales: “Pendiente”, “Vence hoy”, “Completada”, “Esperando revisión”, si otros documentos lo definen.  
\* Las cards de tareas/eventos deben ser claras y humanas.

\#\# 4\. UX/UI aplicable

\#\#\# 4.1 Navegación principal

La estructura de navegación V1 está definida como:

\`Home | People | \+ | Planner | More\`

Aplicación a Planner Frontend:

\* Planner tiene tab propio en la navegación principal.  
\* El botón \`+\` central existe como Quick Actions.  
\* Home está separado de Planner: Home resume; Planner administra.  
\* More contiene módulos de menor frecuencia, no Planner.

\#\#\# 4.2 Quick Actions

El documento de comprensión define Quick Actions como botón \`+\` central en Bottom Nav, con panel flotante, Geni fijo y acciones dinámicas ordenadas por frecuencia y contexto.

Aplicación a Planner Frontend:

\* Crear tarea y crear evento son candidatos naturales para aparecer como acciones rápidas, aunque este documento no los enumera explícitamente.  
\* Geni aparece fijo en Quick Actions, pero Geni real debe quedar fuera del MVP actual si no está implementado.  
\* El panel debe priorizar frecuencia/contexto.

\#\#\# 4.3 Home como pantalla inicial

El archivo de comprensión describe Home como centro operativo del hogar, que resume información y no administra. También indica que Home siempre es la pantalla inicial y el usuario no puede cambiarlo.

Aplicación a Planner Frontend:

\* Planner debe ser accesible desde Home cuando Home muestre tareas/eventos.  
\* Home puede mostrar cards de tareas y eventos, pero la administración completa debe vivir en Planner.  
\* El patrón “ver todo” desde Home hacia Planner es coherente, aunque el texto exacto no aparece en este documento.

\#\#\# 4.4 Header

El archivo de comprensión indica que Header contiene Avatar y selector de hogar solo visible con 2+ hogares.

Aplicación a Planner Frontend:

\* Planner puede reutilizar el header global.  
\* Si hay selector de hogar, afecta qué tareas/eventos se ven.  
\* Multi-hogar avanzado queda fuera del MVP actual, pero el patrón visual de selector existe.

\#\#\# 4.5 Mobile First

El archivo de comprensión registra la decisión “Mobile First confirmado. Tablet: 2 columnas. Desktop: sidebar pendiente confirmación final.”

Aplicación a Planner Frontend:

\* Planner debe priorizar uso mobile.  
\* La lista de tareas/eventos debe ser rápida de escanear en móvil.  
\* En tablet puede considerarse una distribución de dos columnas como referencia futura.  
\* Desktop/sidebar queda pendiente.

\#\#\# 4.6 Tono de mensajes

El documento establece que HomePlus presenta hechos, no juicios; “nunca acusa, siempre informa”.

Aplicación a Planner Frontend:

\* Estados y mensajes deben usar tono neutral.  
\* Las tareas vencidas, pendientes o no realizadas deben mostrarse como información operativa.  
\* Los mensajes de Geni/Briefing, si se usan como mock, deben tener tono de reconocimiento.

\#\#\# 4.7 Organización por frecuencia

El archivo de comprensión indica navegación por tiers de frecuencia: Tier 1 diario, Tier 2 semanal, Tier 3 ocasional, Tier 0 siempre disponible.

Aplicación a Planner Frontend:

\* Planner está en navegación primaria porque es de uso frecuente.  
\* Acciones más frecuentes deben estar más cerca: crear tarea, revisar pendientes, ver calendario.  
\* Funciones avanzadas deben ir detrás de más taps o quedar fuera del MVP.

\#\# 5\. Información directa sobre Planner

\#\#\# 5.1 Rol del dominio

Planner es definido como:

\* Núcleo operativo.  
\* Administra Tasks, Calendar y Goals.  
\* Permite administrar tareas, calendario y metas.  
\* Ayuda al coordinador a gestionar responsabilidades del hogar.  
\* Reduce carga mental.  
\* Da valor individual aunque el usuario esté solo.  
\* Da valor al receptor mostrando sus propias tareas, eventos y metas.

\#\#\# 5.2 Planner dentro de la propuesta de valor

Planner aparece como uno de los dominios unificados por HomePlus junto con Finance, HomeCloud y Presence.

Información aplicable:

\* Planner debe contribuir a que “las tareas y responsabilidades se ejecuten sin tener que pedirlas dos veces”.  
\* Debe ayudar a que la información del hogar esté centralizada.  
\* Debe evitar que una persona tenga que coordinar todo manualmente.

\#\#\# 5.3 Subpartes de Planner

El documento / archivo de comprensión identifica:

\* Tasks.  
\* Calendar.  
\* Goals.  
\* Responsabilidades como eje organizador dentro de Tasks.

\#\#\# 5.4 Planner y adopción

Etapa 1 — un solo usuario activo:

\* El Coordinador usa Planner para administrar tareas, calendario y metas.  
\* Gestiona responsabilidades del hogar aunque sea el único que las vea.  
\* El sistema reduce su carga mental.

Etapa 2 — miembro invitado:

\* El nuevo miembro ve sus propias tareas, eventos y metas.  
\* Sabe qué le toca hacer sin preguntar.

Mitigación MVP:

\* Planner da control total sobre tareas, calendario y metas personales sin depender de nadie.

\#\#\# 5.5 Planner y ecosistema

Relaciones detectadas:

\* Geni usa Planner.  
\* Home referencia Tasks.  
\* Home referencia Calendar.  
\* Auditoría tracks Planner.  
\* Automatización triggers Planner.  
\* InventoryItem references Planner.  
\* Asset references Planner.  
\* Asset generates Task.  
\* InventoryItem generates Task.  
\* FamilyHub Recap anual depende de Planner.  
\* Geni Search busca en Planner.  
\* Quick Actions contiene Geni Chat y puede ejecutar acciones contextuales.

Para MVP actual, las relaciones con Geni real, automatizaciones, Inventory, Assets, auditoría completa y FamilyHub Recap deben tratarse como POST-MVP o referencia visual, salvo que otro documento las convierta en MVP.

\#\# 6\. Información sobre Tasks

\#\#\# MVP actual

Información explícita aplicable:

\* Tasks representa trabajo pendiente o realizado.  
\* Task puede tener responsable.  
\* Task puede tener fechas.  
\* Task puede tener prioridad.  
\* Task puede tener estado.  
\* Task puede tener responsabilidad asociada.  
\* Task puede relacionarse con Persona.  
\* Task puede relacionarse con Responsabilidades.  
\* Task puede relacionarse con Goal.  
\* Tasks forma parte de Planner.  
\* Home referencia Tasks.  
\* Task puede generar Notificación según el archivo de comprensión.  
\* Responsabilidades agrupa áreas operativas del hogar como Compras, Mascotas, Limpieza, Vehículos.  
\* Responsabilidades no es un dominio independiente; es propiedad de la tarea y eje organizador en Tasks.  
\* Las tareas y responsabilidades deben ejecutarse sin tener que pedirlas dos veces.  
\* Planner debe permitir al usuario ver sus propias tareas.  
\* Planner debe permitir al coordinador administrar responsabilidades del hogar aunque sea el único usuario activo.

Campos explícitos detectados para Task:

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

Estados explícitos detectados para Task:

\* Pendiente.  
\* En progreso.  
\* Completada.  
\* Cancelada.  
\* Vencida como estado calculado, no estado persistido.

Acciones explícitas o claramente derivadas del documento:

\* Ver tareas propias.  
\* Administrar tareas.  
\* Gestionar responsabilidades del hogar.  
\* Completar tareas no aparece como flujo UI detallado en el documento, pero “trabajo pendiente o realizado” y estado “Completada” indican que existe concepto de completitud.  
\* Ver tarea en Home aparece por relación Home → Tasks.

\#\#\# POST-MVP / futuro

Información que aparece pero debe tratarse como POST-MVP o no MVP actual salvo validación posterior:

\* Archivos en Task.  
\* Comentarios en Task.  
\* Subtareas.  
\* Dependencias entre tareas.  
\* Recurrencia de Tasks con generación de nuevas instancias.  
\* Notificaciones reales.  
\* Auditoría completa sobre Planner.  
\* Automatizaciones que disparan Planner.  
\* Asset generates Task.  
\* InventoryItem generates Task.  
\* Integración con Geni real.  
\* Geni Search sobre Tasks.  
\* Task Detail con timeline de actividad automática \+ comentarios humanos.  
\* Goals vinculadas a Task.  
\* FamilyHub Recap anual usa Planner.

\#\#\# Dudas o decisiones abiertas

\* No se define pantalla de lista de tareas.  
\* No se define pantalla de creación/edición de tarea.  
\* No se define layout de card de tarea.  
\* No se definen filtros/tabs específicos.  
\* No se definen prioridades posibles.  
\* No se define formato de fecha.  
\* No se define si “En progreso” entra en el MVP actual o queda fuera por conflicto con estados actuales esperados.  
\* No se define verification flow en este documento.  
\* No se definen templates predefinidas MVP.  
\* No se define si responsabilidades son editables o constantes.  
\* No se define acción de completar tarea a nivel UI.  
\* No se define feedback inmediato.  
\* No se define empty state.  
\* No se define contrato API.  
\* No se define service frontend.

\#\# 7\. Información sobre Calendar / Events

\#\#\# MVP actual

Información explícita aplicable:

\* Calendar forma parte de Planner.  
\* Calendar administra eventos familiares y personales.  
\* Event puede referenciar Persona.  
\* Event tiene estados: Programado, Completado, Cancelado.  
\* Event puede tener múltiples participantes.  
\* Event genera Notificación según archivo de comprensión.  
\* Calendar genera Notificación según archivo de comprensión.  
\* Home referencia Calendar.  
\* El receptor ve sus propios eventos.  
\* Planner incluye calendario como parte del valor individual.  
\* Adulto Mayor recibe experiencia adaptada priorizando personas, eventos, medicación y recordatorios.  
\* Geni ve calendarios y puede anticipar conflictos de horarios.  
\* Calendar puede relacionarse con HomeCloud mediante álbum automático desde Calendar, pero eso queda fuera del MVP actual.

\#\#\# POST-MVP / futuro

\* Participantes múltiples/avanzados de Event.  
\* Notificaciones reales.  
\* Álbum automático desde Calendar.  
\* Reconocimiento facial relacionado con Calendar.  
\* Automatizaciones reales.  
\* Geni real anticipando conflictos de horarios.  
\* Calendar como fuente para FamilyCloud/Recuerdos.  
\* Event Detail con participantes e información asociada si no hay pantalla definida en otros documentos.  
\* Recurrencia avanzada no aparece en esta sección y no debe inventarse.  
\* RRULE/EXDATE no aparecen en este documento.

\#\#\# Dudas o decisiones abiertas

\* No se definen vistas día/semana/mes.  
\* No se define agenda.  
\* No se define formulario de evento.  
\* No se definen campos de Event excepto relación con Persona y participantes.  
\* No se definen fecha/hora/ubicación en esta sección.  
\* No se define crear/editar/cancelar evento a nivel UI.  
\* No se define cómo Calendar muestra tareas con fecha.  
\* No se define cómo Home ordena próximos eventos.  
\* No se define contrato API.  
\* No se define service frontend.

\#\# 8\. Información sobre Goals

Goals aparece como parte de Planner, pero para esta extracción debe quedar como referencia visual/futura salvo que la spec final decida incluirlo.

Información explícita:

\* Planner administra Goals.  
\* Goals son objetivos personales o familiares.  
\* Goal tiene estructura Goal → Hitos → Tasks.  
\* Goal tiene estados: Activa, Completada, Fallida.  
\* Goal puede referenciar Task.  
\* Goal puede referenciar Fondo.  
\* Fondos pueden vincularse a Goals.  
\* Geni usa Goals.  
\* Briefing resume Goals junto con Planner, Finance, Presence, eventos y alertas.  
\* El receptor puede ver sus propias metas.  
\* El coordinador puede administrar metas personales en Planner.

POST-MVP / fuera del MVP actual:

\* Implementación real de Goals.  
\* Hitos/Milestones.  
\* Integración con Finance/Fondos.  
\* Progreso avanzado.  
\* Recap anual que depende de Planner.  
\* Goals dentro de Geni real.

Uso posible para frontend ideal:

\* Mantener espacio visual futuro para Goals si se diseña navegación interna de Planner.  
\* No bloquear el MVP de Tasks/Calendar por Goals.  
\* Si se muestra, hacerlo como referencia visual o card deshabilitada/futura, no como backend real.

\#\# 9\. Responsabilidades, templates y categorías

\#\#\# Responsabilidades

Información explícita:

\* Responsabilidades agrupa áreas operativas del hogar.  
\* Ejemplos explícitos: Compras, Mascotas, Limpieza, Vehículos.  
\* No es un dominio independiente.  
\* Es propiedad de la tarea.  
\* Es eje organizador dentro de Tasks.  
\* La decisión busca mantener arquitectura simple y evitar fragmentación innecesaria.  
\* Gasto puede referenciar Responsabilidades, pero Finance no debe desarrollarse desde este fragment.  
\* Compras Cerca depende de Responsabilidades, Presence e Inventory, pero queda como función pendiente/futura.

Aplicación al frontend:

\* Las tareas pueden agruparse visualmente por responsabilidad.  
\* Responsabilidad puede funcionar como chip/label visible de tarea.  
\* Debe evitarse tratar Responsabilidades como sección independiente o tab principal si otros documentos no lo definen.  
\* Compras, Mascotas, Limpieza y Vehículos son nombres explícitos reutilizables.

\#\#\# Templates

Información explícita:

\* El archivo de comprensión menciona “Plantillas de tareas” como feature de Planner.  
\* Se describen como plantillas reutilizables para creación de Tasks.

POST-MVP / dudas:

\* No se definen templates concretas.  
\* No se define CRUD.  
\* No se definen campos de template.  
\* No se define pantalla de selección.  
\* No se define si son sistema o usuario.  
\* No se mencionan Limpieza, Compras, Mascotas, Medicación, Estudios y Pagos como templates MVP en este documento; solo aparecen algunas como responsabilidades/categorías o en otros dominios.

\#\#\# Categorías

Información explícita relacionada:

\* Responsabilidades cumple un rol de agrupación operativa.  
\* Ejemplos explícitos de responsabilidades: Compras, Mascotas, Limpieza, Vehículos.  
\* Medicamentos aparece en Inventory, no en Planner.  
\* Pagos/finanzas aparecen en Finance, no como categoría de Planner en este documento.  
\* Estudios no aparece como categoría de Planner en este documento.

Duda abierta:

\* El documento no distingue formalmente entre responsabilidad, template y categoría.  
\* La decisión explícita es que Responsabilidades son propiedad de Task y eje organizador, lo cual sugiere evitar duplicar categoría si responsabilidad ya cubre esa necesidad, pero esto queda como decisión de spec final.

\#\# 10\. Quick Actions aplicables a Planner

Información explícita:

\* Quick Actions es el botón \`+\` central en Bottom Nav.  
\* Abre un panel flotante.  
\* Contiene Geni fijo.  
\* Incluye acciones dinámicas ordenadas por frecuencia y contexto.  
\* Bottom Navigation V1 incluye \`Home | People | \+ | Planner | More\`.

Aplicación directa a Planner:

\* Planner, por frecuencia diaria, puede aportar acciones dinámicas al panel.  
\* Este documento no enumera explícitamente “crear tarea” ni “crear evento” dentro de Quick Actions.  
\* Geni Chat aparece dentro de Quick Actions, pero Geni real no debe implementarse desde este fragment.

Propuesta UX derivada / requiere validación del usuario:

\* Incluir “Crear tarea” como acción rápida contextual.  
\* Incluir “Crear evento” como acción rápida contextual.  
\* Incluir “Ver pendientes” si Planner tiene pantalla/listado de pendientes.  
\* Mantener Geni como acceso visual/mock si no existe IA real.

\#\# 11\. Home relacionado con Planner

Información explícita:

\* Home es el centro operativo del hogar.  
\* Home resume información, no la administra.  
\* Home siempre es la pantalla inicial; el usuario no puede cambiarlo.  
\* Home contiene Briefing.  
\* Home referencia Tasks.  
\* Home referencia Calendar.  
\* Briefing es el primer widget de Home.  
\* Briefing resume Planner, Finance, Presence, Goals, eventos y alertas en una única card.  
\* Briefing tiene versión resumida permanente y ampliada ante cambios.  
\* Geni genera briefings personalizados por rol.  
\* HomePlus busca actuar antes de que el usuario tenga que intervenir.  
\* Geni puede anticipar vencimientos de tareas y conflictos de horarios.

Aplicación al frontend ideal:

\* Home puede mostrar tareas pendientes o relevantes.  
\* Home puede mostrar eventos próximos.  
\* Home puede mostrar resumen de Planner dentro de Briefing.  
\* Home puede tener una card de atención requerida basada en vencimientos, eventos o tareas.  
\* Home debe navegar hacia Planner para administrar.  
\* Home no debe reemplazar la pantalla de Planner.

Clasificación para MVP:

\* Tareas en Home: aplicable si el MVP tiene Tasks reales.  
\* Eventos en Home: aplicable si el MVP tiene Events reales.  
\* Briefing: puede ser mock/simple si no hay Geni real.  
\* Alertas inteligentes de Geni: POST-MVP o mock visual.  
\* Goals en Briefing: fuera del MVP actual salvo referencia visual.

\#\# 12\. Patrones visuales reutilizables

\#\#\# Aplicable ahora a Planner

\* Mobile First.  
\* Bottom Nav fija con Planner visible.  
\* Botón central \`+\` para acciones rápidas.  
\* Home como pantalla inicial con resumen.  
\* Planner como tab principal.  
\* Header global con avatar.  
\* Selector de hogar solo si hay 2+ hogares.  
\* Cards/resúmenes para Home y Briefing.  
\* Panel flotante para Quick Actions.  
\* Agrupación por frecuencia/contexto.  
\* Responsabilidades como chip/label/eje visual dentro de tareas.  
\* Tono visual informativo, no acusatorio.  
\* Transparencia de acciones y responsables.  
\* Mostrar responsable/persona cuando aplique.

\#\#\# Referencia visual para más adelante

\* Tablet con 2 columnas.  
\* Desktop con sidebar pendiente de confirmación.  
\* Geni Chat desde Quick Actions.  
\* Task Detail con timeline.  
\* Event Detail con participantes.  
\* Perfil individual con tareas/eventos/goals/responsabilidades.  
\* Briefing ampliado ante cambios.  
\* Geni Search que busca Planner.

\#\#\# No aplicable

\* Feed real.  
\* Finance real.  
\* Inventory real.  
\* Assets real.  
\* HomeCloud real.  
\* SOS real.  
\* Presence GPS real.  
\* Automatizaciones reales.  
\* Auditoría completa.  
\* OCR.  
\* Reconocimiento facial.  
\* Web app de invitación.  
\* Multi-hogar avanzado.

\#\# 13\. Reglas funcionales extraídas

\* Planner es el núcleo operativo.  
\* Planner administra Tasks, Calendar y Goals.  
\* Tasks representa trabajo pendiente o realizado.  
\* Calendar administra eventos familiares y personales.  
\* Responsabilidades no son un dominio independiente.  
\* Responsabilidades son propiedad de Task.  
\* Responsabilidades son eje organizador dentro de Tasks.  
\* Ejemplos explícitos de responsabilidades: Compras, Mascotas, Limpieza, Vehículos.  
\* Home resume información; no administra.  
\* Home referencia Tasks y Calendar.  
\* Home contiene Briefing.  
\* Briefing resume Planner, Finance, Presence, Goals, eventos y alertas.  
\* Bottom Navigation V1 es \`Home | People | \+ | Planner | More\`.  
\* Quick Actions es el botón \`+\` central.  
\* Quick Actions muestra Geni fijo y acciones dinámicas por frecuencia/contexto.  
\* Planner debe funcionar con un solo usuario activo.  
\* Planner debe dar valor individual sin depender de adopción familiar.  
\* Un miembro invitado debe ver sus propias tareas, eventos y metas.  
\* El sistema debe hacer visible quién hace qué.  
\* Las acciones que afectan al hogar deben ser visibles.  
\* El sistema presenta hechos, no juicios.  
\* Vencida es calculada, no estado de Task.  
\* Event tiene estados Programado, Completado, Cancelado.  
\* Goal tiene estructura Goal → Hitos → Tasks, pero Goals queda fuera del foco MVP actual.  
\* Geni real, automatizaciones reales, auditoría completa y notificaciones reales no deben implementarse desde este fragment.

\#\# 14\. Ideas derivadas útiles

\* Propuesta UX derivada / requiere validación del usuario: usar una pantalla principal de Planner con tabs simples para \`Tareas\` y \`Calendario\`, dejando \`Goals\` oculto o como acceso futuro.  
\* Propuesta UX derivada / requiere validación del usuario: usar chips de Responsabilidad en cada task card: Compras, Mascotas, Limpieza, Vehículos.  
\* Propuesta UX derivada / requiere validación del usuario: mostrar en la parte superior de Planner un resumen breve: tareas pendientes, eventos de hoy, tareas vencidas calculadas.  
\* Propuesta UX derivada / requiere validación del usuario: permitir crear tarea desde Quick Actions y desde Planner.  
\* Propuesta UX derivada / requiere validación del usuario: permitir crear evento desde Quick Actions y desde Calendar.  
\* Propuesta UX derivada / requiere validación del usuario: usar copy neutral para vencimientos: “Vence hoy”, “Pendiente”, “Completada”, “Programado”, “Cancelado”.  
\* Propuesta UX derivada / requiere validación del usuario: usar Home como teaser de Planner con cards compactas y navegación a “Ver todo”.  
\* Propuesta UX derivada / requiere validación del usuario: para demo, Briefing puede resumir tareas y eventos con texto fijo basado en cantidades reales o mock.  
\* Propuesta UX derivada / requiere validación del usuario: priorizar “Mis tareas” o “Para mí” como filtro inicial para miembros receptores.  
\* Propuesta UX derivada / requiere validación del usuario: mantener acciones avanzadas como adjuntos, comentarios, subtareas y dependencias fuera de la primera UI para evitar ruido.

\#\# 15\. Decisiones que quedan abiertas

\* Estructura exacta de pantalla principal de Planner.  
\* Si Planner tendrá tabs internas.  
\* Si Calendar aparece dentro de Planner o como subpantalla independiente.  
\* Cómo se crea una tarea.  
\* Cómo se edita una tarea.  
\* Cómo se completa una tarea.  
\* Cómo se crea un evento.  
\* Cómo se edita/cancela un evento.  
\* Qué campos son obligatorios en Task.  
\* Qué campos son obligatorios en Event.  
\* Qué valores exactos de prioridad existen.  
\* Cómo se representan responsables en UI.  
\* Cómo se muestran miembros sin avatar.  
\* Cómo se resuelve verification flow.  
\* Si “En progreso” entra o no en MVP actual.  
\* Cómo mapear estados del documento con estados MVP esperados en otros prompts.  
\* Si Templates existen en MVP o solo como referencia.  
\* Qué templates predefinidas usar.  
\* Si Responsabilidades son configurables o fijas.  
\* Cómo se ven estados vacíos.  
\* Cómo se ven errores.  
\* Cómo se ve loading.  
\* Qué datos exactos aparecen en Home.  
\* Si Briefing será mock, real simple o generado.  
\* Si hay service real, mock service o AsyncStorage.  
\* Endpoints y contratos API.  
\* Permisos específicos por rol para crear/reasignar/verificar tareas o eventos.

\#\# 16\. Qué NO debe entrar al MVP actual

\* Geni real.  
\* Automatizaciones reales.  
\* Auditoría completa.  
\* Notificaciones reales/push.  
\* Geni Search real.  
\* Geni Chat real.  
\* Goals backend real.  
\* Hitos/Milestones.  
\* Integración real con Finance/Fondos.  
\* Integración real con Inventory.  
\* Integración real con Assets.  
\* Asset generates Task real.  
\* InventoryItem generates Task real.  
\* Álbum automático desde Calendar.  
\* Reconocimiento facial.  
\* OCR.  
\* FamilyHub Recap anual.  
\* Línea temporal familiar.  
\* Web app como puente de adopción.  
\* Multi-hogar avanzado.  
\* Presence GPS real.  
\* Geocercas.  
\* Offline Sync.  
\* Comentarios en tareas.  
\* Adjuntos en tareas.  
\* Subtareas complejas.  
\* Dependencias entre tareas.  
\* Timeline de actividad de Task Detail.  
\* Participantes avanzados de eventos.  
\* Configuración avanzada por rol/permisos finos.

\#\# 17\. Extractos o referencias internas importantes

\* \`PROBLEMA CENTRAL\`: Asimetría de coordinación, carga invisible, fragmentación de herramientas, calendarios/chats/notas/tareas/recordatorios dispersos.  
\* \`MISIÓN\`: hacer visible el esfuerzo invisible del hogar para coordinar sin fricción.  
\* \`PROPUESTA DE VALOR\`: tareas y responsabilidades deben ejecutarse sin pedir dos veces; Planner unifica tareas, calendario y metas.  
\* \`DIFERENCIACIÓN\`: visibilidad del esfuerzo, proactividad por defecto.  
\* \`TARGET USERS\`: Receptor obtiene valor viendo sus tareas y eventos en Planner.  
\* \`GENI\`: ve tareas y calendarios; genera briefings; no implementar IA real desde este fragment.  
\* \`PRINCIPIO DE VISIBILIDAD\`: acciones visibles, cambios registrados, tono de reconocimiento.  
\* \`DOMINIOS OFICIALES\`: Planner administra Tasks, Calendar y Goals.  
\* \`ADOPCIÓN — MODELO Y RIESGOS\`: Planner debe funcionar con un solo usuario activo; nuevos miembros ven sus propias tareas, eventos y metas.  
\* \`DECISIONES DE PRODUCTO TOMADAS\`: ecosistema integrado, transparencia radical, dominios oficiales.  
\* Archivo de comprensión / Entities:

  \* Planner: núcleo operativo; administra Tasks, Calendar y Goals.  
  \* Tasks: título, descripción, responsable, fechas, prioridad, estado, responsabilidad asociada, goal, archivos, comentarios.  
  \* Calendar: eventos familiares/personales; estados Programado, Completado, Cancelado.  
  \* Responsabilidades: Compras, Mascotas, Limpieza, Vehículos; propiedad de Task.  
  \* Quick Actions: botón \+ central.  
  \* Bottom Navigation: Home | People | \+ | Planner | More.  
  \* Home: resume información; referencia Tasks y Calendar.  
  \* Briefing: primer widget de Home; resume Planner, Finance, Presence, Goals, eventos y alertas.

\#\# 18\. Conclusión operativa

Este documento aporta principalmente dirección de producto, principios de UX y relaciones estructurales para Planner Frontend. No aporta una pantalla final ni un flujo completo, pero sí define cómo debe sentirse Planner dentro de HomePlus:

\* operativo;  
\* familiar;  
\* visible;  
\* orientado a reducir carga mental;  
\* útil desde el primer uso;  
\* integrado con Home y Quick Actions;  
\* centrado en tareas, calendario y responsabilidades.

Partes que deben usarse en la spec final:

\* Planner como núcleo operativo.  
\* Tasks \+ Calendar como foco principal.  
\* Goals solo como referencia futura.  
\* Responsabilidades como propiedad/eje de Task.  
\* Bottom Nav con Planner visible.  
\* Quick Actions con botón \`+\`.  
\* Home como resumen de Tasks/Calendar.  
\* Briefing como card mock/simple si no hay Geni real.  
\* Visibilidad del esfuerzo y tono no acusatorio.  
\* Valor individual desde el primer uso.  
\* Mobile First.

Partes que deben ignorarse por ahora:

\* Geni real.  
\* Automatizaciones reales.  
\* Auditoría completa.  
\* Integraciones reales con Finance, Inventory, Assets, HomeCloud, SOS o Presence GPS.  
\* Multi-hogar avanzado.  
\* Web app post-MVP.  
\* Goals reales.  
\* Subtareas, comentarios, adjuntos, dependencias y notificaciones reales salvo que otra fuente los convierta explícitamente en MVP.

\# planner\_frontend\_fragment\_HomePlus\_SECCION\_2\_PRINCIPIOS\_DEL\_PRODUCTO

\#\# 1\. Fuente

\* Documento: \`HomePlus — SECCION 2 PRINCIPIOS DEL PRODUCTO.md\`  
\* Archivo de comprensión asociado consultado: \`Seccion 2 Principios de producto.txt\`  
\* Tipo de documento: principios de producto, decisiones fundacionales, restricciones arquitectónicas y extracción estructurada de entidades/relaciones/reglas.  
\* Alcance del documento: define principios transversales de HomePlus, navegación, Home, roles, privacidad, coordinación, proactividad de Geni y varias reglas de dominio aplicables a Planner.  
\* Nivel de utilidad para Planner Frontend: Alto.  
\* Motivo: no es un documento visual específico de Planner, pero aporta reglas muy útiles para diseñar el frontend ideal: navegación, jerarquía de uso, Home como resumen, Planner como módulo administrador, tareas visibles por defecto, calendario visible, responsabilidades, tareas vencidas, foco por rol, Quick Actions, principios de simplicidad y restricciones de interacción. Fuentes principales:  

\#\# 2\. Resumen útil para Planner Frontend

Este documento aporta una base fuerte para orientar el frontend de Planner como módulo diario de coordinación familiar. Define que HomePlus prioriza coordinación, transparencia operativa, simplicidad visual, adopción rápida y datos accionables. Para Planner esto implica que las tareas, eventos y responsabilidades deben mostrarse con claridad, sin esconder vencimientos ni asimetrías de carga, pero sin transformar la pantalla en una herramienta de vigilancia.

Planner aparece como parte del ecosistema del hogar, no como una app aislada de tareas. Está conectado con Home, People, Calendar, Geni, notificaciones, responsabilidades y eventualmente otros módulos. Home debe resumir tareas y eventos; Planner debe administrar esas tareas y eventos. Tasks y Calendar son módulos de uso diario y por eso pertenecen a navegación primaria o Home.

El documento también aporta entidades y reglas directas: Task, Calendar, Evento, Goal, Hito, Responsabilidad, Plantilla de Tarea, Verificación, Recurrencia, Dependencia, Subtarea, ComentarioTask, Adjunto y Timeline. Varias de estas entidades son útiles para una visión ideal, pero algunas deben marcarse como POST-MVP si exceden el alcance actual.

\#\# 3\. Principios de producto aplicables

\#\#\# Coordinación primero

\* El sistema prioriza coordinación sobre jerarquía.  
\* El Coordinador administra el hogar, no la vida privada de las personas.  
\* Aplicación a Planner Frontend:

  \* Planner debe mostrar compromisos compartidos, tareas asignadas, estados y calendario familiar.  
  \* Planner no debe diseñarse como herramienta para controlar personas, sino para coordinar responsabilidades.  
  \* Las acciones de supervisión deben sentirse operativas, no invasivas.

\#\#\# Transparencia operativa

\* Los datos del hogar son visibles.  
\* La realidad operativa no se suaviza para mantener la paz.  
\* Tareas vencidas, carga desigual y patrones problemáticos no se ocultan.  
\* Aplicación a Planner Frontend:

  \* Las tareas vencidas deben verse claramente.  
  \* El estado de una tarea no debe maquillarse.  
  \* Si una tarea está vencida, pendiente o completada, el frontend debe expresarlo con claridad.  
  \* Las métricas de carga familiar pueden servir como referencia visual, pero si se usan en MVP deben ser mock o derivadas de datos simples.

\#\#\# Simplicidad visual

\* La interfaz debe mantenerse simple aunque la complejidad interna sea alta.  
\* Defaults inteligentes tienen prioridad sobre configuración obligatoria.  
\* Aplicación a Planner Frontend:

  \* Planner debe evitar formularios largos en el flujo principal.  
  \* Las acciones frecuentes deben estar a pocos taps.  
  \* Las opciones avanzadas deben ocultarse o quedar fuera del MVP.  
  \* La creación de tareas/eventos debe ser rápida.  
  \* La pantalla principal debe poder entenderse sin capacitación.

\#\#\# Valor desde el minuto 1

\* Cada módulo debe entregar valor individual desde el primer uso.  
\* Aplicación a Planner Frontend:

  \* Aunque no todos los miembros estén activos, Planner debe mostrar valor al usuario individual: tareas propias, eventos próximos, vencimientos y acciones rápidas.  
  \* La pantalla vacía debe guiar a crear la primera tarea o evento.  
  \* No debe depender de que toda la familia configure todo para ser útil.

\#\#\# Proactividad calibrada

\* Geni actúa cuando detecta patrones, no incidentes aislados.  
\* Una tarea atrasada no requiere intervención fuerte; varias tareas atrasadas en período corto sí pueden disparar sugerencias.  
\* Aplicación a Planner Frontend:

  \* El frontend puede mostrar señales suaves para tareas próximas a vencer.  
  \* El frontend puede mostrar alerta más fuerte para tareas vencidas.  
  \* Las sugerencias de reorganización deben mostrarse como ayuda, no como juicio.  
  \* No debe haber ruido constante por cada micro-evento.

\#\#\# Datos duros, tono respetuoso

\* Geni presenta datos, no juicios.  
\* Ejemplo explícito: “Tres tareas pendientes desde el lunes”, no “\[Nombre\] está siendo irresponsable”.  
\* Aplicación a Planner Frontend:

  \* Copy de tareas vencidas: usar hechos concretos.  
  \* Evitar frases culpabilizantes.  
  \* Mostrar estado, responsable y fecha sin acusaciones.  
  \* Ejemplo de tono aplicable: “3 tareas pendientes desde el lunes” / “Tarea vencida” / “Pendiente de completar”.

\#\#\# Privacidad no es opacidad

\* Tareas asignadas y estado son visibles por defecto para todo el hogar.  
\* Calendario y eventos familiares son visibles por defecto.  
\* Los compromisos compartidos son visibles; los datos privados personales no.  
\* Aplicación a Planner Frontend:

  \* Tareas del hogar y eventos familiares pueden mostrarse a miembros del hogar.  
  \* Metas privadas, documentos privados o finanzas personales no deben mezclarse en Planner sin consentimiento.  
  \* Planner debe distinguir visualmente lo familiar/compartido de lo personal si el documento final lo define.

\#\#\# Home resume, Planner administra

\* Home es centro operativo y punto de entrada.  
\* Home nunca administra información.  
\* Toda información mostrada en Home debe conducir al módulo que la administra.  
\* Aplicación a Planner Frontend:

  \* Home puede mostrar tareas y próximos eventos.  
  \* Al tocar una card de tarea/evento en Home, debe abrir Planner/Task detail/Calendar.  
  \* La administración real ocurre dentro de Planner.

\#\#\# Navegación por frecuencia

\* Home, Tasks, Calendar y Feed son Tier 1, uso diario.  
\* Tier 1 vive en Bottom Nav o Home.  
\* More no debe esconder funciones diarias.  
\* Aplicación a Planner Frontend:

  \* Planner debe estar en navegación primaria.  
  \* Tasks y Calendar deben ser accesibles desde Home o Bottom Nav.  
  \* Planner no debe vivir solo en More.

\#\#\# Menos de 4 niveles de navegación

\* Más de 4 niveles de navegación es fallo.  
\* Objetivo: 95% de acciones en 3 niveles o menos.  
\* Aplicación a Planner Frontend:

  \* Ver tareas debe estar a 1 tap desde Bottom Nav o Home.  
  \* Completar tarea debe estar a 1 tap desde lista o detalle.  
  \* Crear tarea/evento debe estar a 1-2 taps desde Quick Actions o Planner.  
  \* Evitar flujos profundos para tareas comunes.

\#\# 4\. UX/UI aplicable

\#\#\# Navegación principal

\* Bottom Navigation detectada: \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\`.  
\* El botón \`+\` abre Quick Actions.  
\* Geni no tiene tab propio; su acceso principal es por Quick Actions.  
\* More contiene accesos a dominios y settings, pero no dashboards.  
\* Aplicación a Planner:

  \* Planner debe tener entrada directa desde Bottom Nav.  
  \* Crear tarea/evento puede estar en Quick Actions.  
  \* Planner no debe ocultarse en More.  
  \* Geni puede aparecer como acción sugerida, pero no como pantalla central de Planner.

\#\#\# Home como entrada operativa

\* Home es pantalla inicial.  
\* El usuario no puede cambiar el punto de entrada de la app.  
\* Estructura oficial del Home:

  1\. Briefing Geni.  
  2\. Atención Requerida.  
  3\. Carga Familiar.  
  4\. Próximos Eventos.  
  5\. Tareas.  
  6\. Finanzas Relevantes.  
  7\. Presence Resumido.  
  8\. Actividad Familiar.  
\* Aplicación a Planner:

  \* Planner debe recibir tráfico desde “Atención Requerida”, “Próximos Eventos” y “Tareas”.  
  \* La sección de Home “Tareas” debe agrupar por Responsabilidad.  
  \* “Próximos Eventos” debe llevar a Calendar/Event detail.  
  \* “Atención Requerida” puede contener tareas vencidas.

\#\#\# Jerarquía visual aplicable

\* Modelo mental de Home: “Atención → Acción → Exploración”.  
\* Aplicación a Planner:

  \* La pantalla de Planner puede priorizar:

    1\. Lo urgente: vencidas / hoy / próximas.  
    2\. Acciones: crear tarea, completar, crear evento.  
    3\. Exploración: calendario, responsabilidades, historial o categorías.  
  \* Lo vencido o bloqueante debe aparecer antes que lo decorativo.

\#\#\# Copywriting

\* El tono debe ser respetuoso, directo y basado en datos.  
\* Geni no juzga; presenta datos.  
\* Ejemplos explícitos:

  \* “Tres tareas pendientes desde el lunes”.  
  \* “¿Querés que le recuerde sobre las tareas?”  
  \* “Veo que estás prestando mucha atención a esto. ¿Querés que te ayude con algo?”  
\* Aplicación a Planner:

  \* Usar copy factual para tareas y eventos.  
  \* Evitar frases culpabilizantes.  
  \* Las sugerencias deben sonar asistivas, no autoritarias.

\#\#\# Estados visuales / feedback

Información directa encontrada:

\* Tarea asignada → notificación inmediata al responsable.  
\* Tarea próxima a vencer → recordatorio al responsable.  
\* Tarea vencida → notificación al responsable.  
\* Si la tarea vencida persiste → alerta al Coordinador.  
\* Patrón de tareas vencidas → sugerencia de reorganización o redistribución.  
\* Conflicto de horarios → alerta proactiva con sugerencia.  
\* Regla de notificación: si Geni interrumpe, el contenido debe justificar la interrupción.  
\* No notificar sobre cosas que el usuario no puede actuar inmediatamente.  
\* No repetir el mismo problema sin nueva información.

Aplicación a Planner Frontend:

\* Badge/estado “próxima a vencer”.  
\* Badge/estado “vencida”.  
\* Feedback claro al completar tarea.  
\* Sugerencias visibles solo cuando hay patrón o situación accionable.  
\* No llenar la UI de alertas repetidas.

\#\#\# Diseño mobile / simplicidad

\* La interfaz debe mantenerse simple.  
\* Las features de uso diario no deben esconderse.  
\* El usuario no debe tener que aprender dónde está cada cosa.  
\* Aplicación a Planner:

  \* Tabs o secciones simples: Tasks / Calendar.  
  \* CTA visible para crear tarea o evento.  
  \* Estados y filtros simples.  
  \* Evitar configuración avanzada en pantalla principal.  
  \* Acceso rápido desde Home y Quick Actions.

\#\# 5\. Información directa sobre Planner

\#\#\# Entidades directas detectadas

\* Planner:

  \* Contiene Task.  
  \* Contiene Calendar.  
  \* Contiene Goal.  
  \* Contiene Responsabilidad.  
\* Task:

  \* Trabajo pendiente o realizado.  
  \* Estados detectados: Pendiente, En progreso, Completada, Cancelada.  
  \* Vencida es calculado, no estado propio.  
\* Calendar:

  \* Administración de eventos familiares y personales.  
\* Evento:

  \* Eventos familiares o personales.  
  \* Estados: Programado, Completado, Cancelado.  
  \* No existe Postergado.  
\* Goal:

  \* Meta personal o familiar.  
  \* Estructura: Goal → Hitos → Tasks.  
  \* Estados: Activa, Completada, Fallida.  
\* Responsabilidad:

  \* Agrupa áreas operativas del hogar.  
  \* Ejemplos detectados: Compras, Mascotas, Limpieza, Vehículos.  
  \* Una tarea tiene una única responsabilidad principal.  
\* Plantilla de Tarea:

  \* Plantillas predefinidas de tareas.  
\* Verificación:

  \* Opcional.  
  \* Cuando se verifica, la tarea pasa a estado final sin estado separado.  
\* Recurrencia:

  \* Genera nuevas instancias de tarea.  
  \* No reutiliza la misma tarea para preservar historial.  
\* Dependencia:

  \* Una tarea puede depender de otra.  
  \* Si la previa no se completa, la dependiente queda bloqueada.  
\* Subtarea:

  \* Único nivel de anidamiento bajo Task.  
  \* No hay subtareas anidadas.  
\* ComentarioTask:

  \* Comentarios en tareas.  
\* Adjunto:

  \* Archivos adjuntos a tareas: imágenes, PDFs, archivos, audio.  
\* Timeline:

  \* Línea temporal automática por tarea: creación, cambios de responsable, fechas, completado, comentarios.

\#\#\# Relaciones directas detectadas

\* Hogar contiene Planner.  
\* Planner contiene Task.  
\* Planner contiene Calendar.  
\* Planner contiene Goal.  
\* Planner contiene Responsabilidad.  
\* Task pertenece a Responsabilidad.  
\* Task usa Plantilla de Tarea.  
\* Task puede requerir Verificación.  
\* Task puede depender de otra Task.  
\* Task puede tener Recurrencia.  
\* Task contiene Subtarea.  
\* Task contiene ComentarioTask.  
\* Task contiene Adjunto.  
\* Task tiene Timeline.  
\* Persona puede estar asignada a Task.  
\* Persona participa en Evento.  
\* Persona puede ser miembro de una Responsabilidad.  
\* Goal contiene Hito.  
\* Goal contiene Task.

\#\#\# Reglas directas detectadas

\* Una tarea posee una única responsabilidad principal.  
\* Vencida no es un estado de tarea; se calcula automáticamente.  
\* Las tareas pueden requerir verificación opcional.  
\* Cuando se verifica, la tarea pasa a estado final.  
\* No existe un estado separado para verificación en este documento.  
\* Las recurrencias generan nuevas instancias.  
\* Las subtareas no se anidan más de un nivel.  
\* El progreso de subtareas se calcula automáticamente.  
\* No existe “Postergado” para eventos; postergar equivale a modificar fecha.  
\* Home resume; Planner administra.  
\* Cada hogar tiene su propio Planner.  
\* Tareas asignadas y estado son visibles por defecto en el hogar.  
\* Calendario y eventos familiares son visibles por defecto en el hogar.

\#\# 6\. Información sobre Tasks

\#\#\# MVP actual

Información explícita aplicable al frontend MVP:

\* Task representa trabajo pendiente o realizado.  
\* Task tiene estados detectados:

  \* Pendiente.  
  \* En progreso.  
  \* Completada.  
  \* Cancelada.  
\* “Vencida” no es estado propio; debe calcularse.  
\* Tareas asignadas y estado son visibles para todo el hogar.  
\* Las tareas pueden asignarse a una Persona.  
\* Las tareas pertenecen a una Responsabilidad.  
\* Una tarea tiene una única responsabilidad principal.  
\* Las tareas pueden usar Plantilla de Tarea.  
\* Las tareas pueden requerir Verificación opcional.  
\* Adulto puede crear y reasignar tareas.  
\* Adolescente administra tareas propias.  
\* Empleado Familiar no puede crear tareas; solo completar, comentar y adjuntar evidencia.  
\* Home muestra tareas agrupadas por Responsabilidad.  
\* Widget de tareas en Home es dinámico: desaparece al completar.  
\* Atención Requerida puede mostrar tareas vencidas.  
\* Geni puede sugerir reorganización o redistribución ante patrón de tareas vencidas.  
\* Geni nunca completa tareas automáticamente.  
\* La responsabilidad de completar es humana.  
\* Tarea asignada produce notificación al responsable.  
\* Tarea próxima a vencer produce recordatorio al responsable.  
\* Tarea vencida produce notificación al responsable.  
\* Si la tarea vencida persiste, puede alertar al Coordinador.  
\* Cualquier miembro puede consultar, según permisos, historial de tareas de otros miembros del hogar.

\#\#\# POST-MVP / futuro

Información que aparece pero conviene tratar como futura o no obligatoria para MVP actual:

\* Subtareas.  
\* Comentarios en tareas.  
\* Adjuntos en tareas.  
\* Timeline automático.  
\* Dependencias entre tareas.  
\* Recurrencia avanzada de tareas.  
\* Automatizaciones que crean tareas.  
\* Geni creando tareas.  
\* Auditoría completa visible de cambios importantes.  
\* Offline sync completo.  
\* Cola de sincronización.  
\* Resolución de conflictos Last Write Wins.  
\* Evidencia adjunta por Empleado Familiar.  
\* Registro de autor, fecha original y fecha de sincronización en acciones offline.  
\* Reorganización o redistribución automática real basada en patrones.  
\* Geni real para detección de patrones.  
\* Notificaciones push/email reales.

\#\#\# Dudas o decisiones abiertas

\* El documento de comprensión define estados de Task como Pendiente, En progreso, Completada, Cancelada, pero el MVP actual de Planner puede requerir otros estados específicos en otra fuente.  
\* El documento dice que la verificación no crea estado separado; si el MVP final exige \`awaiting\_verification\` o \`verified\`, hay contradicción a resolver en merge.  
\* No aparecen campos detallados de Task con tipos.  
\* No aparecen prioridades explícitas de Task.  
\* No aparece formulario de creación de tarea.  
\* No aparece estructura visual exacta de la card de tarea.  
\* No aparece contrato API de tareas.  
\* No aparecen mensajes exactos de success/error/loading para acciones de Task.  
\* No aparecen templates concretas completas más allá de “Plantilla de Tarea” y áreas de responsabilidad como Compras, Mascotas, Limpieza, Vehículos.

\#\# 7\. Información sobre Calendar / Events

\#\#\# MVP actual

Información explícita aplicable al frontend MVP:

\* Calendar es módulo de Planner.  
\* Calendar administra eventos familiares y personales.  
\* Evento representa eventos familiares o personales.  
\* Estados detectados de Evento:

  \* Programado.  
  \* Completado.  
  \* Cancelado.  
\* No existe estado “Postergado”.  
\* Postergar equivale a modificar fecha.  
\* Persona participa en Evento.  
\* Calendario y eventos familiares son visibles por defecto para todo el hogar.  
\* Home muestra Próximos Eventos como agenda inmediata.  
\* Home de Adulto Mayor prioriza personas, eventos, recordatorios y medicación.  
\* Home de Adolescente tiene más foco en tareas, eventos y coordinación.  
\* Conflicto de horarios puede generar alerta proactiva con sugerencia.  
\* Cualquier miembro puede consultar, según permisos, calendario de otros miembros del hogar.  
\* Cada hogar tiene su propio Planner y su propio Home.

\#\#\# POST-MVP / futuro

Información que aparece pero conviene dejar fuera del MVP actual:

\* Participantes avanzados si implican RSVP o estados complejos.  
\* Conflictos de horario detectados automáticamente por Geni real.  
\* Eventos que generan recuerdos en FamilyCloud.  
\* Geocercas que disparan eventos.  
\* Automatizaciones que crean eventos.  
\* Calendar relacionado con empleado familiar como schedule avanzado.  
\* Notificaciones reales de eventos.  
\* Offline sync completo para eventos.

\#\#\# Dudas o decisiones abiertas

\* No aparecen vistas explícitas día/semana/mes en este documento.  
\* No aparecen campos detallados de Evento con tipo.  
\* No aparece formulario visual de creación/edición de evento.  
\* No aparece contrato API de eventos.  
\* No aparece recurrencia simple de eventos en esta fuente.  
\* No aparece cómo mostrar tareas con fecha dentro del calendario.  
\* No aparece estructura visual concreta de Calendar.  
\* No aparecen estados de loading/error/empty para Calendar.

\#\# 8\. Información sobre Goals

\* Goal aparece como parte de Planner.  
\* Goal puede ser personal o familiar.  
\* Estructura detectada: Goal → Hitos → Tasks.  
\* Estados detectados:

  \* Activa.  
  \* Completada.  
  \* Fallida.  
\* Task puede avanzar una Goal.  
\* Goal contiene Hito.  
\* Goal contiene Task.  
\* Meta en riesgo puede generar alerta con sugerencia.  
\* Home puede mostrar “Meta en riesgo” como dato operativo, según el principio de dashboards que muestran realidad.

Clasificación:

\* Fuera del MVP actual de Planner si el alcance actual se concentra en Tasks, Events y Calendar.  
\* Útil como referencia visual futura.  
\* No debe implementarse como backend real desde este fragment.  
\* No debe mezclarse con Tasks MVP salvo como inspiración de progreso visual.

\#\# 9\. Responsabilidades, templates y categorías

\#\#\# Responsabilidad

Información explícita:

\* Responsabilidad agrupa áreas operativas del hogar.  
\* Ejemplos detectados:

  \* Compras.  
  \* Mascotas.  
  \* Limpieza.  
  \* Vehículos.  
\* Una tarea tiene una única responsabilidad principal.  
\* Persona puede ser miembro de una Responsabilidad.  
\* Task pertenece a Responsabilidad.  
\* Home muestra tareas agrupadas por Responsabilidad.  
\* Empleado Familiar puede estar asignado a Responsabilidad.

Aplicación a Planner Frontend:

\* Responsabilidad puede funcionar como agrupador visual principal de tareas.  
\* La lista de tareas puede organizarse por Responsabilidad.  
\* La card de tarea puede mostrar un badge/chip de responsabilidad.  
\* No debe permitirse múltiples responsabilidades principales por tarea, según esta fuente.

\#\#\# Plantilla de Tarea

Información explícita:

\* Task puede usar Plantilla de Tarea.  
\* Plantilla de Tarea existe como entidad detectada en comprensión.  
\* Se describe como “plantillas predefinidas de tareas”.

Dudas:

\* No aparecen nombres de plantillas específicas en este documento.  
\* No aparece si la plantilla es editable o no.  
\* No aparece si existe CRUD.  
\* No aparece UI de selección de plantilla.  
\* No aparecen campos de plantilla.

\#\#\# Categorías

Información explícita:

\* El documento no define “Categoría” como entidad propia para Planner.  
\* Las áreas operativas detectadas se llaman Responsabilidad.  
\* Para Planner Frontend ideal, este documento favorece usar Responsabilidad como agrupador antes que crear una categoría separada.

\#\#\# Creación rápida

Información aplicable:

\* Las acciones frecuentes deben estar en navegación primaria o Quick Actions.  
\* Quick Actions es panel flotante desde \`+\`.  
\* Acciones dinámicas por frecuencia.  
\* Geni va fijo primero en Quick Actions.  
\* Crear tarea y crear evento no aparecen explícitamente listadas dentro de Quick Actions en este documento, pero son acciones de uso diario vinculadas a Planner.

Clasificación de “crear tarea/evento desde Quick Actions”:

\* Propuesta UX derivada / requiere validación del usuario.

\#\# 10\. Quick Actions aplicables a Planner

Información explícita:

\* Existe un botón \`+\` en Bottom Navigation.  
\* \`+\` abre QuickActions.  
\* QuickActions es un panel flotante.  
\* Geni aparece siempre primero.  
\* Las acciones son dinámicas por frecuencia.  
\* Geni no tiene tab en Bottom Nav ni botón global dedicado.  
\* El acceso principal a Geni es vía Quick Actions.

Aplicación directa a Planner:

\* Planner puede beneficiarse de Quick Actions porque Tasks y Calendar son uso diario.  
\* Acciones relacionadas con Planner que podrían derivarse:

  \* Crear tarea.  
  \* Crear evento.  
  \* Abrir pendientes.  
  \* Pedir sugerencia a Geni sobre tareas.  
\* Estas acciones no están explícitamente nombradas en la fuente como items de Quick Actions, por lo tanto deben marcarse como derivadas.

POST-MVP:

\* Geni real creando tareas.  
\* Automatizaciones reales desde Quick Actions.  
\* Sugerencias inteligentes reales.  
\* Acciones dinámicas basadas en frecuencia real si no existe tracking implementado.

\#\# 11\. Home relacionado con Planner

\#\#\# Tareas en Home

Información explícita:

\* Home incluye un bloque “Tareas”.  
\* Las tareas se agrupan por Responsabilidad.  
\* El widget de tareas es dinámico y desaparece al completar.  
\* Home incluye “Atención Requerida”, que contiene tareas vencidas.  
\* Home debe conducir al módulo que administra la información.  
\* Home resume; Planner administra.

Aplicación a Planner Frontend:

\* Planner debe tener una vista o filtro coherente con lo que Home muestra.  
\* Si Home muestra tareas por Responsabilidad, Planner debe poder abrir esa responsabilidad o lista.  
\* Si Home muestra tareas vencidas, Planner debe tener estado/filtro para tareas vencidas.  
\* Si una tarea se completa desde Home o Planner, el widget puede actualizarse/desaparecer.

\#\#\# Eventos en Home

Información explícita:

\* Home incluye “Próximos Eventos”.  
\* Próximos Eventos es agenda inmediata.  
\* Calendar administra eventos familiares y personales.  
\* Calendario y eventos familiares son visibles por defecto.  
\* Home de ciertos roles prioriza eventos.

Aplicación a Planner Frontend:

\* Tocar un evento próximo en Home debería llevar al detalle o calendario.  
\* Calendar debe ser coherente con los próximos eventos resumidos en Home.

\#\#\# Atención requerida

Información explícita:

\* Atención Requerida incluye tareas vencidas.  
\* También incluye aprobaciones pendientes y otros elementos no Planner.  
\* Para Planner, solo tareas vencidas son directamente relevantes.  
\* Las tareas vencidas no son estado propio; se calculan.

\#\#\# Briefing

Información explícita:

\* Briefing Geni es el primer bloque de Home.  
\* Briefing es resumen inteligente.  
\* Geni presenta datos, no juicios.  
\* Ejemplo aplicable: “Tres tareas pendientes desde el lunes”.  
\* Para MVP actual, si no hay Geni real, puede tratarse como referencia de copy o mock.

\#\#\# Carga Familiar

Información explícita:

\* Carga Familiar muestra distribución del esfuerzo del hogar.  
\* Principio: no ocultar asimetrías de carga.  
\* Ejemplo: si un miembro sostuvo 87% de tareas, ese número es visible.  
\* Para Planner Frontend, puede inspirar métricas visuales, pero si no existe cálculo real debe quedar como mock o POST-MVP.

\#\#\# Links hacia Planner

Regla explícita:

\* Toda información mostrada en Home debe conducir al módulo que la administra.  
\* Aplicación:

  \* Tareas → Planner / Tasks.  
  \* Tareas vencidas → Planner con filtro vencidas.  
  \* Próximos eventos → Planner / Calendar.  
  \* Briefing sobre tareas/eventos → Planner correspondiente.

\#\# 12\. Patrones visuales reutilizables

\#\#\# Aplicable ahora a Planner

\* Home con orden fijo y modelo “Atención → Acción → Exploración”.  
\* Cards o widgets de:

  \* Atención Requerida.  
  \* Próximos Eventos.  
  \* Tareas.  
\* Agrupación por Responsabilidad.  
\* Bottom Nav con Planner.  
\* Botón central \`+\` para Quick Actions.  
\* Indicadores rápidos en More solo si corresponde, pero no dashboard en More.  
\* Role-based focus:

  \* Coordinador: visión completa del hogar.  
  \* Adulto: visión operativa.  
  \* Adolescente: foco en tareas, eventos y coordinación.  
  \* Niño: experiencia simplificada.  
  \* Adulto Mayor: prioridad en personas, eventos, recordatorios y medicación.  
  \* Invitado: acceso mínimo.  
  \* Empleado Familiar: trabajo asignado.

\#\#\# Referencia visual para más adelante

\* Carga Familiar como distribución visual de esfuerzo.  
\* Timeline de tarea.  
\* Estados de patrones de consulta con intervención de Geni.  
\* Métricas de tareas completadas/vencidas.  
\* Alertas por patrón de tareas vencidas.  
\* Sugerencia de redistribución.  
\* Meta en riesgo.

\#\#\# No aplicable

\* Dashboards de Finance completos.  
\* Presence GPS real.  
\* Feed real.  
\* SOS real.  
\* Automations reales.  
\* FamilyCloud real.  
\* Inventory real.  
\* Assets real.  
\* Geni IA real.  
\* Offline sync completo.

\#\# 13\. Reglas funcionales extraídas

\* Home resume; Planner administra.  
\* Home es pantalla inicial.  
\* Todo lo que Home muestra debe conducir al módulo que lo administra.  
\* Tasks y Calendar son funciones de uso diario.  
\* Las funciones diarias deben estar en Bottom Nav o Home, no escondidas en More.  
\* Bottom Nav V1: \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\`.  
\* Quick Actions se abre desde \`+\`.  
\* Geni aparece primero en Quick Actions.  
\* Geni no tiene tab propio en Bottom Nav.  
\* La interfaz debe mantenerse simple aunque la lógica interna sea compleja.  
\* El usuario no debe tener que aprender dónde está cada cosa.  
\* Más de 4 niveles de navegación es fallo.  
\* Objetivo: 95% de acciones en 3 niveles o menos.  
\* Tareas asignadas y estado son visibles para todo el hogar.  
\* Calendario y eventos familiares son visibles para todo el hogar.  
\* No ocultar tareas vencidas ni patrones problemáticos.  
\* Vencida no es estado de tarea; se calcula automáticamente.  
\* Una tarea tiene una única responsabilidad principal.  
\* Las tareas se agrupan por Responsabilidad en Home.  
\* El widget de tareas en Home desaparece al completar.  
\* Las tareas pueden usar Plantilla de Tarea.  
\* Las tareas pueden requerir Verificación opcional.  
\* En este documento, verificación no crea un estado separado.  
\* Las recurrencias generan nuevas instancias y no reutilizan la misma tarea.  
\* No hay subtareas anidadas.  
\* El progreso de subtareas se calcula automáticamente.  
\* No existe Postergado para eventos.  
\* Postergar un evento equivale a modificar fecha.  
\* Geni nunca completa tareas automáticamente.  
\* Geni sugiere acciones, no las ejecuta unilateralmente.  
\* Geni interviene por patrones, no por incidentes aislados.  
\* Las notificaciones deben justificar la interrupción.  
\* No notificar sobre cosas que el usuario no puede actuar inmediatamente.  
\* No repetir notificaciones del mismo problema sin nueva información.  
\* Los datos deben presentarse sin juicio.  
\* Cada hogar tiene su propio Planner.

\#\# 14\. Ideas derivadas útiles

\* Propuesta UX derivada / requiere validación del usuario: pantalla principal de Planner con tabs simples \`Tareas\` y \`Calendario\`, porque el documento define Planner como contenedor de Task y Calendar y ambos son de uso diario.  
\* Propuesta UX derivada / requiere validación del usuario: sección superior “Atención” dentro de Planner con tareas vencidas y eventos próximos, siguiendo el modelo de Home “Atención → Acción → Exploración”.  
\* Propuesta UX derivada / requiere validación del usuario: botón principal “Crear” dentro de Planner que abra crear tarea o evento, alineado con acciones frecuentes y navegación de pocos taps.  
\* Propuesta UX derivada / requiere validación del usuario: chips de Responsabilidad en tareas: Limpieza, Compras, Mascotas, Vehículos y otros que se definan en documentos posteriores.  
\* Propuesta UX derivada / requiere validación del usuario: filtro “Vencidas” calculado visualmente, no como estado persistente.  
\* Propuesta UX derivada / requiere validación del usuario: card de tarea con título, responsable, responsabilidad, fecha límite, estado visible y acción rápida de completar.  
\* Propuesta UX derivada / requiere validación del usuario: card de evento con título, fecha/hora, tipo familiar/personal y participantes si están definidos.  
\* Propuesta UX derivada / requiere validación del usuario: empty state de Planner orientado a acción: crear primera tarea o primer evento.  
\* Propuesta UX derivada / requiere validación del usuario: Home → Planner deep link por filtros: tareas vencidas, responsabilidad específica, próximos eventos.  
\* Propuesta UX derivada / requiere validación del usuario: completar tarea desde Home actualiza inmediatamente el widget o lo elimina si no quedan tareas.  
\* Propuesta UX derivada / requiere validación del usuario: usar copy factual: “2 tareas vencidas”, “3 eventos esta semana”, “Tarea pendiente desde el lunes”.  
\* Propuesta UX derivada / requiere validación del usuario: Quick Actions con “Nueva tarea” y “Nuevo evento”, aunque el documento no enumera esas acciones de forma literal.

\#\# 15\. Decisiones que quedan abiertas

\* Estados definitivos de Task para MVP.  
\* Si \`awaiting\_verification\` y \`verified\` deben existir como estados reales, porque este documento dice que la verificación no genera estado separado.  
\* Campos concretos de Task.  
\* Tipos de campos de Task.  
\* Prioridades de Task.  
\* Fecha límite y formato visual.  
\* Estructura de formulario para crear/editar tarea.  
\* Permisos exactos para completar/verificar/cancelar tareas.  
\* Si Child, Senior y Guest pueden crear, completar o ver tareas.  
\* Si la verificación requiere otro usuario autorizado.  
\* Templates MVP exactas.  
\* Si Plantilla de Tarea es constante, editable o entidad persistente.  
\* Cómo diferenciar Responsabilidad, Template y Categoría en UI.  
\* Vistas exactas de Calendar.  
\* Si Calendar debe mostrar tareas con fecha.  
\* Campos concretos de Evento.  
\* Recurrencia de eventos.  
\* Participantes de eventos.  
\* Estados vacíos de Planner.  
\* Loading/error/success states.  
\* Contrato API.  
\* Service frontend.  
\* Sincronización en tiempo real.  
\* Qué parte de Home se alimenta de Planner real vs mock.  
\* Cómo adaptar Planner por rol de manera mínima.  
\* Qué contenido del Briefing puede ser mock en MVP.  
\* Qué datos de Carga Familiar se calculan realmente y cuáles quedan mock.

\#\# 16\. Qué NO debe entrar al MVP actual

\* Geni IA real.  
\* Detección real de patrones por Geni.  
\* Automatizaciones reales.  
\* Notificaciones push/email reales.  
\* Auditoría completa.  
\* Offline sync completo.  
\* Cola de sincronización.  
\* Resolución de conflictos Last Write Wins.  
\* Adjuntos reales.  
\* Comentarios reales en tareas.  
\* Timeline completo.  
\* Subtareas complejas.  
\* Dependencias de tareas.  
\* Recurrencia compleja.  
\* Goals backend real.  
\* Hitos reales.  
\* Métricas avanzadas de carga familiar si no están calculadas.  
\* Presence GPS real.  
\* Feed real.  
\* SOS real.  
\* Inventory real.  
\* Assets real.  
\* FamilyCloud real.  
\* Storage real.  
\* OCR real.  
\* Geofencing real.  
\* Dashboards financieros.  
\* Multi-hogar avanzado.  
\* SearchGlobal real.  
\* GeniSearch real.  
\* Participantes avanzados de eventos si no están definidos.

\#\# 17\. Extractos o referencias internas importantes

\* \`DECISIONES FUNDACIONALES\`: coordinación primero, datos visibles, simplicidad, privacidad individual, adopción, poder acotado del Coordinador, acceso a datos con guardrails.  
\* \`PRINCIPIOS RECTORES / 1\. La verdad primero, el confort después\`: tareas vencidas, métricas visibles, dashboards muestran realidad.  
\* \`PRINCIPIOS RECTORES / 2\. Geni no reemplaza conversaciones\`: datos sin juicio, sugerencias sin ejecución unilateral, Geni no completa tareas.  
\* \`PRINCIPIOS RECTORES / 4\. Privacidad no es opacidad\`: tareas asignadas y estado visibles; calendario y eventos familiares visibles.  
\* \`PRINCIPIOS RECTORES / 5\. Proactividad calibrada\`: tarea asignada, próxima a vencer, vencida, patrón de vencidas, conflicto de horarios.  
\* \`PRINCIPIOS RECTORES / 6\. Priorización por frecuencia de uso\`: Home, Tasks y Calendar como Tier 1; Bottom Nav o Home.  
\* \`Estructura oficial del Home\`: Briefing, Atención Requerida, Carga Familiar, Próximos Eventos, Tareas.  
\* \`Regla Home\`: Home resume, módulos administran.  
\* \`Home adaptado por rol\`: Coordinador, Adulto, Adolescente, Niño, Adulto Mayor, Invitado, Empleado Familiar.  
\* \`OUTPUT 1 — ENTITIES\`: Task, Subtarea, ComentarioTask, Adjunto, Timeline, Verificación, Dependencia, Recurrencia, Plantilla de Tarea, Responsabilidad, Calendar, Evento, Goal, Hito.  
\* \`OUTPUT 2 — RELATIONSHIPS\`: Planner contiene Task/Calendar/Goal/Responsabilidad; Task pertenece a Responsabilidad; Task usa Plantilla; Persona asignada a Task; Persona participa en Evento.  
\* \`OUTPUT 5 — RULES\`: tarea con única responsabilidad principal; vencida calculada; no existe Postergado; Home orden oficial; navegación de máximo 3 niveles objetivo; More sin dashboards.  
\* \`OUTPUT 6 — ARCHITECTURAL DECISIONS\`: sistema operativo del hogar, Home resume, Planner administra, vencida calculada automáticamente.

\#\# 18\. Conclusión operativa

Este documento debe usarse en la spec final de Planner Frontend como base de filosofía, navegación, jerarquía visual y reglas de interacción. Su aporte más fuerte no está en pantallas detalladas ni contratos API, sino en definir cómo debe sentirse Planner dentro de HomePlus: simple, diario, transparente, accionable, conectado a Home, con foco en coordinación y sin convertirse en una herramienta invasiva.

Partes que deben usarse en la spec final:

\* Home resume; Planner administra.  
\* Tasks y Calendar como uso diario.  
\* Planner en Bottom Nav.  
\* Quick Actions desde \`+\`.  
\* Tareas visibles por estado y responsabilidad.  
\* Tareas vencidas visibles y calculadas.  
\* Eventos familiares visibles.  
\* Home mostrando Atención Requerida, Próximos Eventos y Tareas.  
\* Copy factual y no acusatorio.  
\* Navegación máxima de pocos niveles.  
\* Responsabilidad como agrupador operativo.  
\* Verificación como regla a revisar por contradicción.  
\* Roles como referencia de adaptación visual.

Partes que deben ignorarse o dejarse fuera por ahora:

\* Geni real.  
\* Automatizaciones reales.  
\* Offline completo.  
\* Auditoría completa.  
\* Goals reales.  
\* Adjuntos/comentarios/subtareas/timeline reales.  
\* Finance/Inventory/Assets/Presence/FamilyCloud/SOS/Feed reales.  
\* Multi-hogar avanzado.  
\* Detección real de patrones.

Este fragment debe fusionarse después con documentos más visuales, técnicos o específicos de Planner para completar pantallas, formularios, servicios, endpoints, estados UX y datos demo concretos.

\# planner\_frontend\_fragment\_HomePlus\_SECCION\_3\_FILOSOFIA

\#\# 1\. Fuente

\* Documento: \`HomePlus — SECCION 3 FILOSOFIA.md\`  
\* Archivo de comprensión asociado: \`Seccion 3 Filosofia.txt\`  
\* Tipo de documento: Filosofía de producto / reglas operativas / principios sistémicos.  
\* Alcance del documento: Define postura fundacional, polaridades resueltas, principios de coordinación, transparencia, escalamiento, tono de Geni, adopción gradual y relación entre tareas, calendario, Home, miembros y hogar.  
\* Nivel de utilidad para Planner Frontend: \*\*Medio-Alto\*\*  
\* Motivo: El documento no define pantallas concretas, layouts, endpoints ni componentes visuales específicos de Planner, pero sí aporta reglas muy fuertes para el frontend ideal: transparencia de tareas/calendario, visibilidad del esfuerzo, escalamiento progresivo, tono de mensajes, dashboards, distribución de carga, navegación desde Home, Quick Actions y carácter obligatorio de Tasks \+ Calendar dentro del núcleo inicial. 

\---

\#\# 2\. Resumen útil para Planner Frontend

Este documento aporta una base filosófica y operativa para que Planner no se sienta como una simple lista de tareas, sino como el núcleo de coordinación visible del hogar.

Aporta especialmente:

\* Planner debe hacer visible quién hizo qué, quién no cumplió y cómo se distribuye la carga.  
\* Tasks y Calendar son parte del núcleo obligatorio desde el día 1\.  
\* Las tareas completadas y pendientes no deben ocultarse.  
\* Los eventos del calendario familiar son visibles para todos los miembros del hogar.  
\* Geni no debe completar, reasignar ni cambiar tareas/eventos automáticamente.  
\* Geni puede recordar, alertar, escalar y mostrar patrones.  
\* El frontend debe evitar tono acusatorio: mostrar hechos, números y contexto.  
\* Home resume información de Planner; Planner administra.  
\* La distribución de carga debe verse como esfuerzo real, no solo cantidad de tareas.  
\* Deben existir dashboards o vistas visibles con distribución de tareas, vencimientos y patrones.  
\* Quick Actions y Bottom Nav aparecen como navegación relevante para entrar o actuar sobre Planner.  
\* Hay datos demo útiles: \`lavar los platos\`, \`sacar la basura\`, \`pagar alquiler\`, \`comprar medicación\`, \`turnos médicos\`, tareas vencidas, tareas críticas y distribución semanal.

\---

\#\# 3\. Principios de producto aplicables

\#\#\# 3.1 Planner no es productividad individual

Información explícita:

\* HomePlus no es una app de productividad.  
\* HomePlus es un sistema operativo del hogar.  
\* La función central es coordinación familiar.  
\* Debe sostener sin controlar.  
\* Debe recordar sin acusar.  
\* Debe forzar conversaciones necesarias sin convertirse en juez.

Aplicación a Planner Frontend:

\* Planner no debe parecer Trello doméstico ni checklist individual.  
\* Debe mostrar coordinación, responsabilidad, visibilidad y carga compartida.  
\* Las tareas no son solo “cosas por hacer”; son evidencia de funcionamiento del hogar.

\#\#\# 3.2 Hacer visible lo invisible

Información explícita:

\* HomePlus existe para hacer visible lo invisible.  
\* No tolera la invisibilidad del esfuerzo.  
\* Si un miembro no completa sus responsabilidades, HomePlus lo registra, alerta y escala.  
\* Si alguien sostiene el hogar solo, HomePlus lo hace visible.

Aplicación a Planner Frontend:

\* Planner debe mostrar:

  \* tareas pendientes;  
  \* tareas completadas;  
  \* responsables;  
  \* incumplimientos;  
  \* distribución de carga;  
  \* patrones de repetición;  
  \* tareas críticas;  
  \* vencimientos.  
\* El frontend no debe esconder tareas vencidas o incompletas para “mantener lindo” el dashboard.  
\* La pantalla debe ser clara pero honesta.

\#\#\# 3.3 Transparencia forzada en coordinación

Información explícita:

\* La transparencia no es negociable en tareas del hogar.  
\* Todos ven quién hizo qué.  
\* Todos ven quién no cumplió.  
\* Todos ven cómo se distribuye la carga.  
\* Nadie puede ocultar tareas completadas ni pendientes.  
\* El calendario familiar también es transparencia forzada: todos ven compromisos del calendario compartido.  
\* Nadie puede ocultar un evento del calendario familiar.

Aplicación a Planner Frontend:

\* Una tarea asignada debe mostrar responsable visible.  
\* Una tarea completada debe seguir siendo visible en historial o sección completada.  
\* Una tarea vencida debe marcarse visualmente.  
\* El calendario familiar debe mostrar eventos compartidos sin opción de ocultarlos dentro del hogar.  
\* El frontend debe evitar acciones como “ocultar tarea incumplida” o “eliminar evento sin visibilidad”.

\#\#\# 3.4 Autonomía protegida fuera de coordinación

Información explícita:

\* Si el dato es necesario para coordinar el hogar, es transparencia forzada.  
\* Si el dato es sobre vida interna/personal, es autonomía protegida.  
\* Notificaciones pueden configurarse.  
\* Ubicación en tiempo real se puede pausar.  
\* Feed es opcional en participación.

Aplicación a Planner Frontend:

\* Planner debe distinguir entre:

  \* tarea/evento del hogar: visible;  
  \* configuración de notificaciones: personal;  
  \* presencia/ubicación: no debe volverse obligatoria dentro de Planner.  
\* No convertir Planner en vigilancia personal.  
\* No mezclar ubicación GPS real dentro de Tasks MVP.

\#\#\# 3.5 Geni ayuda, no reemplaza decisiones humanas

Información explícita:

\* Geni nunca reasigna automáticamente una tarea.  
\* Geni nunca cambia eventos del calendario sin confirmación humana.  
\* Geni nunca toma decisiones operativas en nombre de la familia.  
\* Geni detecta, alerta, escala y presenta patrones.  
\* La conversación la tiene que tener la familia.

Aplicación a Planner Frontend:

\* Las recomendaciones de Geni deben verse como sugerencias o alertas, no como acciones automáticas.  
\* Si hay una tarea vencida, el frontend puede mostrar:

  \* “Recordar al responsable”  
  \* “Hablar con responsable”  
  \* “Reasignar”  
  \* “Ver patrón”  
\* Pero no debe sugerir que el sistema ya reasignó o resolvió la tarea automáticamente.

\#\#\# 3.6 Datos visibles siempre; alertas solo cuando importa

Información explícita:

\* HomePlus opera con dos capas:

  \* datos siempre visibles;  
  \* alertas activas cuando cruzan umbrales.  
\* Dashboards muestran distribución de tareas semanal/mensual.  
\* Dashboards muestran próximos vencimientos.  
\* Geni no oculta ni suaviza datos.  
\* Geni no bombardea con alertas.  
\* Alerta cuando:

  \* asimetría \> 40%;  
  \* tarea crítica incumplida;  
  \* patrón problemático confirmado;  
  \* problema recurrente 3+ semanas.

Aplicación a Planner Frontend:

\* Planner puede tener dashboards o cards pasivas siempre visibles.  
\* Las alertas deben reservarse para vencimientos críticos, patrones o incumplimientos repetidos.  
\* El frontend debe evitar llenar la pantalla de alertas por diferencias menores.  
\* Las métricas pueden estar presentes sin ser alarmistas.

\#\#\# 3.7 Equidad contextual

Información explícita:

\* HomePlus no asigna tareas en partes iguales numéricamente.  
\* Asigna esfuerzo real.  
\* Esfuerzo real considera:

  \* tiempo disponible;  
  \* carga temporal;  
  \* capacidad física/mental;  
  \* contexto familiar.  
\* Cada miembro puede tener disponibilidad declarada:

  \* 1-2hs por día;  
  \* 3-4hs por día;  
  \* 5+hs por día.  
\* La distribución de tareas debe ajustarse al contexto.  
\* El ajuste debe comunicarse a toda la familia.

Aplicación a Planner Frontend:

\* No mostrar solo “cantidad de tareas por persona” como métrica definitiva.  
\* Mostrar carga familiar con contexto.  
\* Separar:

  \* número de tareas;  
  \* esfuerzo estimado;  
  \* disponibilidad declarada;  
  \* contexto temporal.  
\* Para MVP, si esto es demasiado avanzado, puede quedar como visualización mock o futura.

\#\#\# 3.8 Núcleo obligatorio desde el día 1

Información explícita:

\* Capa 1 activa desde onboarding:

  \* Calendario familiar;  
  \* Tareas del hogar;  
  \* Feed familiar.  
\* Calendario y tareas son corazón de HomePlus.  
\* No se pueden desactivar.  
\* No se puede usar solo calendario y desactivar tareas.  
\* Día 1: la familia carga calendario y tareas. Valor inmediato. No abrumador.

Aplicación a Planner Frontend:

\* Planner debe estar visible desde el inicio.  
\* Bottom Nav debe incluir Planner.  
\* Home debe reflejar tareas y eventos desde el día 1\.  
\* El onboarding posterior debería llevar naturalmente a cargar primeras tareas/eventos.  
\* Para Planner ideal, el primer uso debe enfocarse en crear valor rápido: cargar tarea y evento.

\#\#\# 3.9 Tono: factual, cálido, no acusatorio

Información explícita:

\* Geni presenta datos con:

  \* número contundente;  
  \* contexto que da significado;  
  \* tono cálido pero no efusivo.  
\* No usa adjetivos valorativos.  
\* No acusa.  
\* No usa exageración.  
\* Los números hablan solos.  
\* Puede usar un emoji cuando el tono lo amerita:

  \* 💜 reconocimiento;  
  \* ⚠️ alerta urgente;  
  \* 🎯 logro cumplido.  
\* Nunca usa 3+ emojis.  
\* Nunca usa emojis genéricos de celebración como 🎉🎊🥳.

Aplicación a Planner Frontend:

\* Mensajes de tareas deben ser concretos:

  \* “Tomás no completó 2 tareas esta semana.”  
  \* “Valeria completó 15 de 18 tareas.”  
  \* “La familia completó las 18 tareas asignadas esta semana.”  
\* Evitar:

  \* “Tomás es irresponsable.”  
  \* “Valeria hizo todo sola.”  
  \* “¡Increíble trabajoooo\! 🎉🎉🎉”  
\* Usar labels objetivos:

  \* Vence hoy;  
  \* Vencida;  
  \* Crítica;  
  \* Requiere atención;  
  \* Patrón detectado;  
  \* Completada.

\---

\#\# 4\. UX/UI aplicable

\#\#\# 4.1 Navegación principal

Información encontrada en archivo de comprensión:

\* BottomNav contiene:

  \* Home;  
  \* People;  
  \* QuickActions;  
  \* Planner;  
  \* More.  
\* Home navega a Planner.  
\* Home navega a Calendar.  
\* QuickActions contiene Geni.  
\* QuickActions aparece como botón \`+\` central.  
\* SearchGlobal indexa Planner.

Aplicación a Planner Frontend:

\* Planner debe vivir como tab principal en Bottom Nav.  
\* Quick Actions debe permitir acciones rápidas relacionadas con Planner.  
\* Home debe tener cards que naveguen hacia Planner/Calendar.  
\* SearchGlobal puede encontrar tareas/eventos, pero esto no está desarrollado en detalle para MVP.

\#\#\# 4.2 Home como centro operativo

Información encontrada:

\* Home es centro operativo.  
\* Home resume información, no administra.  
\* Home es punto de entrada principal inmutable.  
\* Home contiene:

  \* Briefing;  
  \* Atención Requerida;  
  \* Carga Familiar;  
  \* Próximos Eventos;  
  \* Actividad Familiar.  
\* Calendar alimenta Próximos Eventos.  
\* Task aparece en Home.  
\* Home navega a Planner y Calendar.

Aplicación a Planner Frontend:

\* Planner administra tareas y calendario.  
\* Home solo muestra resumen y accesos.  
\* Una card de Home sobre tareas debe llevar a Planner.  
\* Una card de Home sobre próximos eventos debe llevar a Calendar/Planner.  
\* Atención Requerida puede incluir tareas vencidas.

\#\#\# 4.3 Dashboards y datos visibles

Información encontrada:

\* Datos siempre visibles en dashboards:

  \* distribución de tareas semanal/mensual;  
  \* próximos vencimientos.  
\* Los datos no se ocultan ni suavizan.  
\* Alertas solo cuando cruzan umbrales.

Aplicación a Planner Frontend:

\* Planner puede tener una sección superior tipo resumen:

  \* “Hoy”  
  \* “Pendientes”  
  \* “Vencidas”  
  \* “Completadas”  
  \* “Carga familiar”  
\* La distribución de carga debería aparecer como card o gráfico simple.  
\* Próximos vencimientos pueden ser una sección destacada.

\#\#\# 4.4 Estados visuales aplicables

Estados encontrados o inferidos directamente desde reglas del documento:

\* Pendiente.  
\* Completada.  
\* Vencida.  
\* Vence pronto.  
\* Crítica.  
\* Patrón emergente.  
\* Patrón confirmado.  
\* Asimetría menor.  
\* Asimetría grave.  
\* Tarea crítica incumplida.  
\* Recordatorio privado.  
\* Alerta privada.  
\* Alerta al coordinador.  
\* Exposición familiar.

No aparecen componentes visuales concretos como chips, tabs o badges, pero las reglas justifican usarlos como patrones de frontend.

\#\#\# 4.5 Copywriting aplicable

Ejemplos explícitos reutilizables como tono/copy:

\* “Tomás, tu tarea ‘lavar los platos’ vence en 2 horas.”  
\* “Tomás, tu tarea ‘lavar los platos’ venció hace 3 horas y sigue sin completarse.”  
\* “Valeria, Tomás no completó ‘lavar los platos’ por segunda vez esta semana. ¿Querés reasignar la tarea o hablar con él?”  
\* “Tomás no completó 8 de las últimas 10 tareas asignadas. La distribución de carga esta semana fue: Valeria 15 tareas, Tomás 2, Roberto 1.”  
\* “Valeria, completaste 15 de 18 tareas esta semana — el 83% del esfuerzo total del hogar. Tomás completó 2, Roberto 1.”  
\* “La familia completó las 18 tareas asignadas esta semana. Es la primera vez en 3 semanas que todas las tareas se cumplen. 💜”  
\* “La distribución de tareas esta semana fue: Valeria 83%, Tomás 11%, Roberto 6%.”  
\* “La distribución de tareas viene cambiando en las últimas 3 semanas. Semana 1: 60-40. Semana 2: 65-35. Semana 3: 70-30. La carga sobre Valeria está aumentando.”  
\* “Tomás está en época de exámenes hasta el 15 de junio. Su carga de tareas se redujo temporalmente. Roberto y Valeria están cubriendo las tareas redistribuidas.”  
\* “Tomás, tu tarea ‘sacar la basura’ vence en 1 hora.”  
\* “Tomás, tu tarea ‘sacar la basura’ venció hace 2 horas. ¿Podés completarla ahora?”  
\* “Valeria, Tomás no completó ‘sacar la basura’ por tercera vez este mes. ¿Querés reasignarla o hablar con él?”  
\* “Tomás no completó ‘sacar la basura’ en 4 de las últimas 5 semanas. Valeria cubrió la tarea 3 de esas veces.”  
\* “Tomás, tu parte del alquiler ($50.000) vence hoy y no está registrada. Valeria también fue notificada.”  
\* “Tomás debe $50.000 de alquiler hace 7 días. Valeria cubrió el pago completo temporalmente. La deuda interna es de $50.000.”

Uso para Planner Frontend:

\* Mensajes de cards.  
\* Empty/alert states.  
\* Tooltips.  
\* Banner de atención requerida.  
\* Briefing mock.  
\* Cards de carga familiar.

\---

\#\# 5\. Información directa sobre Planner

\#\#\# 5.1 Planner como núcleo operativo

Información del archivo de comprensión:

\* Planner es módulo del ecosistema.  
\* Planner contiene:

  \* Task;  
  \* Calendar;  
  \* Goal;  
  \* Responsabilidad.  
\* Planner es núcleo operativo.  
\* Administra Tasks, Calendar y Goals.  
\* Responsabilidades funcionan como eje organizador.  
\* BottomNav contiene Planner.  
\* Home navega a Planner.  
\* SearchGlobal indexa Planner.  
\* OfflineMode soporta Planner, pero Offline Sync queda fuera del MVP actual.  
\* Cada hogar tiene su propio Planner en contexto multi-hogar, pero multi-hogar avanzado queda fuera del MVP actual.

\#\#\# 5.2 Elementos directos detectados

\* Task.  
\* Calendar.  
\* Event.  
\* Goal.  
\* Responsabilidad.  
\* Plantilla.  
\* Subtarea.  
\* Dependencia.  
\* Recurrencia.  
\* Verificación.  
\* Timeline.  
\* Comentario.  
\* Adjunto.

\#\#\# 5.3 Clasificación para frontend ideal

MVP actual:

\* Tasks.  
\* Calendar.  
\* Events.  
\* Responsabilidad como agrupador si se usa visualmente.  
\* Plantillas como atajo si se mantienen simples.  
\* Verificación si el MVP la requiere.

POST-MVP / futuro:

\* Goals.  
\* Subtareas complejas.  
\* Dependencias.  
\* Timeline.  
\* Comentarios.  
\* Adjuntos.  
\* Recurrencia avanzada.  
\* Offline Sync.  
\* Auditoría completa.  
\* Geni Planner real.

\---

\#\# 6\. Información sobre Tasks

\#\#\# MVP actual

Información explícita aplicable:

\* Las tareas del hogar son parte de la transparencia forzada.  
\* Todos ven quién hizo qué.  
\* Todos ven quién no cumplió.  
\* Todos ven cómo se distribuye la carga.  
\* Nadie puede ocultar tareas completadas ni pendientes.  
\* Si un miembro no completa responsabilidades, HomePlus lo registra, alerta y escala.  
\* Geni no puede marcar tareas completadas automáticamente.  
\* Geni no reasigna automáticamente tareas a otro miembro.  
\* Geni puede recordar, alertar, escalar y presentar patrones.  
\* La familia puede ver distribución de carga en cualquier momento.  
\* Las tareas pueden ser leves o graves.  
\* Una tarea crítica incumplida se considera problema grave.  
\* Tareas del hogar son núcleo obligatorio desde día 1\.  
\* Día 1: la familia carga calendario y tareas.

Acciones útiles para frontend:

\* Ver tareas pendientes.  
\* Ver tareas completadas.  
\* Ver responsable.  
\* Completar tarea manualmente.  
\* Ver tarea vencida.  
\* Ver próxima fecha de vencimiento.  
\* Ver distribución semanal/mensual.  
\* Ver alertas por incumplimiento.  
\* Ver patrón de incumplimiento.  
\* Reasignar tarea solo como acción humana, no automática.  
\* Hablar con responsable / decidir en familia como acción sugerida, no automática.

Datos y ejemplos explícitos:

\* \`lavar los platos\`.  
\* \`sacar la basura\`.  
\* \`pagar alquiler\`.  
\* \`comprar medicación\`.  
\* \`turnos médicos\`.  
\* Tareas asignadas semanalmente.  
\* 18 tareas semanales.  
\* Valeria completó 15 tareas.  
\* Tomás completó 2 tareas.  
\* Roberto completó 1 tarea.  
\* Tomás no completó 8 de las últimas 10 tareas.  
\* Tomás no completó sacar la basura en 4 de las últimas 5 semanas.  
\* Valeria cubrió la tarea 3 veces.  
\* Tarea crítica incumplida.  
\* Tareas livianas, rápidas.  
\* Tareas medianas.  
\* Tareas que requieren más tiempo.

Estados o labels funcionales detectados:

\* pendiente;  
\* completada;  
\* vencida;  
\* vence en 1 hora;  
\* vence en 2 horas;  
\* venció hace 2 horas;  
\* venció hace 3 horas;  
\* tarea crítica;  
\* olvido de tarea menor;  
\* patrón emergente;  
\* patrón confirmado;  
\* incumplimiento recurrente;  
\* carga temporal reducida;  
\* carga redistribuida.

\#\#\# POST-MVP / futuro

Información existente pero demasiado avanzada o no MVP frontend actual:

\* Geni ajusta carga según disponibilidad declarada.  
\* Geni redistribuye carga dinámicamente.  
\* Ajustes temporales de carga por exámenes, enfermedad o proyecto laboral.  
\* Detección de manipulación de disponibilidad.  
\* Escalamiento automático con notificaciones push reales.  
\* Auditoría permanente de cambios.  
\* Timeline de tarea.  
\* Comentarios.  
\* Adjuntos.  
\* Dependencias.  
\* Subtareas.  
\* Generación de tareas desde Assets, Inventory o Medicamentos.  
\* Automatizaciones que crean eventos/tareas.  
\* GeniPlanner como motor de análisis real.

\#\#\# Dudas o decisiones abiertas

\* El documento no define campos exactos de Task.  
\* No define tipos.  
\* No define pantalla de lista de tareas.  
\* No define tabs.  
\* No define filtros.  
\* No define formulario de creación.  
\* No define prioridades como campo formal.  
\* No define fecha límite como campo formal, aunque sí aparecen vencimientos.  
\* No define responsable como campo, aunque sí aparecen responsables en ejemplos.  
\* No define estados técnicos compatibles con backend.  
\* No define verification flow técnico, aunque menciona verificación como entidad en archivo de comprensión.  
\* No define templates concretas de Planner.  
\* No define si Responsabilidad, Template y Categoría son entidades separadas o labels visuales.

\---

\#\# 7\. Información sobre Calendar / Events

\#\#\# MVP actual

Información explícita aplicable:

\* El calendario familiar es parte de la transparencia forzada.  
\* Todos ven los compromisos de todos.  
\* Nadie puede ocultar un evento del calendario compartido.  
\* Calendario familiar es parte del núcleo obligatorio desde el día 1\.  
\* La familia carga calendario y tareas el día 1\.  
\* No se puede usar solo calendario y desactivar tareas.  
\* Geni no puede cambiar eventos del calendario sin confirmación humana.  
\* Home navega a Calendar.  
\* Calendar alimenta Próximos Eventos.  
\* Calendar contiene Event.  
\* Event tiene participantes Persona, según archivo de comprensión.  
\* Event puede notificar a Empleado Familiar, según archivo de comprensión.  
\* Event puede generar AlbumAutomatico o Recuerdo en otros dominios, pero eso queda fuera del MVP actual.

Acciones útiles para frontend:

\* Ver calendario familiar.  
\* Ver próximos eventos.  
\* Crear/cargar evento manualmente.  
\* Cambiar evento solo con confirmación humana.  
\* Navegar desde Home a Calendar.  
\* Mostrar eventos compartidos como visibles para la familia.  
\* Mostrar eventos próximos en Home.

Datos y ejemplos explícitos:

\* “Calendario familiar”.  
\* “Compromisos de todos”.  
\* “Horarios de todos”.  
\* “Próximos eventos”.  
\* “Llegadas tarde eventuales” como problema leve si no impacta operación.  
\* “Turnos médicos” como asunto crítico cuando se relaciona con tareas críticas.

\#\#\# POST-MVP / futuro

\* Participantes avanzados de eventos.  
\* Notificaciones reales.  
\* Cambios de calendario asistidos por Geni.  
\* Integración con Presence real.  
\* Eventos generados por automatizaciones.  
\* Geocercas que generan eventos.  
\* Álbum automático desde evento finalizado.  
\* Recuerdos generados desde eventos.  
\* Offline Sync.  
\* Multi-hogar avanzado con Calendar separado por hogar.

\#\#\# Dudas o decisiones abiertas

\* No se definen vistas día/semana/mes.  
\* No se define layout de calendario.  
\* No se define formulario de evento.  
\* No se definen campos exactos: título, fecha, hora, ubicación, descripción.  
\* No se definen estados técnicos de evento.  
\* No se define recurrencia.  
\* No se define cancelación de evento.  
\* No se define edición de evento.  
\* No se define RSVP.  
\* No se define si eventos personales aparecen dentro del calendario familiar o separados.  
\* No se define cómo mostrar tareas con fecha dentro del calendario.

\---

\#\# 8\. Información sobre Goals

\#\#\# Información encontrada

Del archivo de comprensión:

\* Planner contiene Goal.  
\* Goal es objetivo personal o familiar.  
\* Estados mencionados:

  \* Activa;  
  \* Completada;  
  \* Fallida.  
\* Goal puede contener Hito.  
\* Hito se vincula con Task.  
\* Goal puede asociarse con Fondo.  
\* Task puede avanzar Goal.  
\* Goal puede tener scope Hogar.  
\* Goal puede trackear progreso vía Fondo.

\#\#\# Uso para referencia visual o futuro

\* Goals puede inspirar una futura pestaña o card visual dentro de Planner.  
\* Puede aparecer como referencia visual futura de progreso.  
\* Puede relacionarse con tareas que avanzan una meta.  
\* Para MVP actual, Goals no debe desplazar Tasks/Calendar.

\#\#\# Clasificación

\* POST-MVP / futuro.  
\* No implementar como Planner MVP real desde este documento.  
\* Puede usarse como referencia visual futura si la spec final lo decide.

\---

\#\# 9\. Responsabilidades, templates y categorías

\#\#\# Responsabilidades

Información encontrada:

\* Planner contiene Responsabilidad.  
\* Responsabilidad es área operativa del hogar.  
\* Responsabilidad agrupa tareas.  
\* Responsabilidad posee miembros asignados.  
\* Task pertenece a Responsabilidad.  
\* Empleado Familiar puede estar asignado a Responsabilidad.  
\* SugerenciaComprasCerca referencia Responsabilidad.  
\* Gasto puede asociarse con Responsabilidad, pero Finance no se desarrolla para Planner MVP.

Aplicación a Planner Frontend:

\* Responsabilidad puede ser agrupador visual de tareas.  
\* Puede servir para secciones/cards como:

  \* tareas de una responsabilidad;  
  \* miembros asignados;  
  \* carga por responsabilidad;  
  \* tareas vencidas dentro de una responsabilidad.  
\* No se debe asumir CRUD completo de Responsabilidad si el documento no lo define.

\#\#\# Templates / Plantillas

Información encontrada:

\* Plantilla aplica a Task.  
\* Plantilla aparece como feature de Planner.  
\* Plantillas de tareas son inicialmente solo para Tasks.

Aplicación a Planner Frontend:

\* Template puede ser atajo de creación de tarea.  
\* No se especifican nombres de templates en este documento.  
\* No se define CRUD.  
\* No se define estructura de plantilla.  
\* No se define si una plantilla equivale a categoría.

\#\#\# Categorías

Información encontrada:

\* No aparece una entidad “Categoría” explícita para Planner en este documento.  
\* Hay ejemplos de tipos o gravedad de tareas:

  \* tareas no críticas;  
  \* tareas críticas;  
  \* tareas livianas;  
  \* tareas medianas;  
  \* tareas que requieren más tiempo.  
\* Hay responsabilidades como posible agrupador.

Aplicación a Planner Frontend:

\* Si se necesita agrupar visualmente, Responsabilidad tiene más soporte documental que Categoría.  
\* Categoría queda como decisión abierta si no está definida por otros documentos.

\#\#\# Creación rápida

Información encontrada:

\* QuickActions existe como botón central \`+\`.  
\* QuickActions puede adaptarse a Persona.  
\* QuickActions contiene Geni.  
\* No se especifican acciones concretas de crear tarea/evento en esta sección.

Aplicación a Planner Frontend:

\* Crear tarea y crear evento desde Quick Actions es una propuesta razonable, pero en este documento no está explícitamente detallada.  
\* Debe marcarse como “Propuesta UX derivada / requiere validación del usuario” si se usa.

\---

\#\# 10\. Quick Actions aplicables a Planner

\#\#\# Información encontrada

\* QuickActions es un botón \`+\` central en Bottom Nav.  
\* QuickActions abre un panel flotante con acciones rápidas.  
\* Geni es slot fijo.  
\* QuickActions contiene Geni.  
\* QuickActions se adapta a Persona.  
\* BottomNav contiene QuickActions.  
\* Geni no tiene tab propio en Bottom Nav.  
\* Geni opera como capa transversal, no módulo aislado.

\#\#\# Aplicación a Planner Frontend

Posible uso para Planner:

\* Acceso rápido a acciones frecuentes.  
\* Entrada rápida a Geni para asistencia contextual sobre tareas/calendario.  
\* Acciones relacionadas con Planner deben ser simples y manuales.

\#\#\# Acciones explícitas

No aparecen acciones rápidas concretas de Planner en este documento.

\#\#\# Propuesta UX derivada / requiere validación del usuario

\* Quick Action: “Crear tarea”.  
\* Quick Action: “Crear evento”.  
\* Quick Action: “Ver pendientes”.  
\* Quick Action: “Preguntar a Geni sobre carga familiar”.  
\* Quick Action: “Registrar tarea completada”.

Estas acciones derivan de la existencia del botón \`+\`, del panel de acciones rápidas y del rol central de Planner, pero no están escritas explícitamente como lista en este documento.

\---

\#\# 11\. Home relacionado con Planner

\#\#\# Información encontrada

\* Home es centro operativo.  
\* Home resume, no administra.  
\* Home contiene Briefing.  
\* Home contiene Atención Requerida.  
\* Home contiene Carga Familiar.  
\* Home contiene Próximos Eventos.  
\* Task aparece en Home.  
\* Calendar alimenta Próximos Eventos.  
\* Presence aparece en Home.  
\* Home navega a Planner.  
\* Home navega a Calendar.  
\* Home es personalizado por Geni.  
\* Geni genera Briefing.  
\* GeniPlanner analiza CargaFamiliar.

\#\#\# Tareas en Home

Aplicable:

\* Mostrar tareas pendientes.  
\* Mostrar tareas vencidas.  
\* Mostrar distribución de carga.  
\* Mostrar atención requerida por tareas vencidas o críticas.  
\* Mostrar patrones relevantes si se cruzan umbrales.  
\* Mostrar resumen breve, no administración completa.  
\* Link “Ver todo” o navegación hacia Planner puede derivarse del rol de Home como resumen, pero el texto exacto no aparece.

\#\#\# Eventos en Home

Aplicable:

\* Mostrar próximos eventos.  
\* Calendar alimenta PróximosEventos.  
\* Home navega a Calendar.

\#\#\# Atención requerida

Información encontrada:

\* Atención Requerida incluye elementos urgentes:

  \* tareas vencidas;  
  \* pagos vencidos;  
  \* aprobaciones;  
  \* SOS.  
\* Para Planner, solo corresponde extraer:

  \* tareas vencidas;  
  \* aprobaciones si afectan tareas/verificación en otros documentos;  
  \* eventos próximos si son relevantes.

\#\#\# Briefing

Información encontrada:

\* Briefing es primer widget de Home.  
\* Briefing es card única con resumen Geni.  
\* Tiene versión resumida y ampliada.  
\* Geni genera Briefing.

Aplicación a Planner Frontend:

\* Para MVP, Briefing puede mostrar resumen mock basado en tareas/eventos.  
\* No implementar IA real desde este documento.  
\* Ejemplos de tono pueden venir de los mensajes de Geni sobre tareas/carga.

\#\#\# Carga Familiar

Información encontrada:

\* CargaFamiliar es widget de Home mostrando distribución de carga de tareas.  
\* GeniPlanner analiza CargaFamiliar.  
\* El documento da varios ejemplos de distribución:

  \* Valeria 15 tareas;  
  \* Tomás 2;  
  \* Roberto 1;  
  \* Valeria 83%;  
  \* Tomás 11%;  
  \* Roberto 6%;  
  \* 88% vs 12%;  
  \* 57% vs 43%;  
  \* 60-40, 65-35, 70-30.

Aplicación a Planner Frontend:

\* Carga Familiar puede aparecer en Home como mock o resumen visual.  
\* Planner puede tener vista más detallada de carga.  
\* Para MVP, se puede simular si no hay backend completo de análisis.

\---

\#\# 12\. Patrones visuales reutilizables

\#\#\# Aplicable ahora a Planner

No hay capturas ni detalles visuales concretos en esta sección, pero sí patrones funcionales traducibles a UI:

\* Cards de resumen.  
\* Dashboard visible.  
\* Lista de tareas con responsable.  
\* Badges de estado:

  \* pendiente;  
  \* completada;  
  \* vencida;  
  \* crítica;  
  \* patrón;  
  \* requiere atención.  
\* Cards de carga familiar.  
\* Sección de próximos vencimientos.  
\* Sección de próximos eventos.  
\* Alertas con tono factual.  
\* Mensajes privados/públicos según nivel de escalamiento.  
\* Indicadores porcentuales de distribución.  
\* Histórico semanal o mensual.  
\* Un emoji máximo por mensaje cuando el tono lo amerita.

\#\#\# Referencia visual para más adelante

\* Dashboard de distribución semanal/mensual.  
\* Tendencias de carga por semanas.  
\* Card expandible de Briefing.  
\* Vista ampliada de Carga Familiar.  
\* Visualización de esfuerzo real ajustado por disponibilidad.  
\* Panel Geni con explicación contextual.  
\* Vista de patrones recurrentes.

\#\#\# No aplicable

\* Feed real.  
\* Finance real.  
\* Presence GPS real.  
\* SOS real.  
\* Inventory real.  
\* Assets real.  
\* FamilyCloud real.  
\* Automatizaciones reales.  
\* Offline Sync.

\---

\#\# 13\. Reglas funcionales extraídas

\* Planner debe hacer visible tareas pendientes y completadas.  
\* Nadie puede ocultar tareas completadas ni pendientes dentro del hogar.  
\* Planner debe mostrar quién hizo qué.  
\* Planner debe mostrar quién no cumplió.  
\* Planner debe mostrar cómo se distribuye la carga.  
\* Calendario familiar debe ser visible para los miembros del hogar.  
\* Nadie puede ocultar un evento del calendario compartido.  
\* Tareas y calendario son núcleo obligatorio desde el día 1\.  
\* No se puede usar solo calendario y desactivar tareas.  
\* Home resume; Planner administra.  
\* Home debe mostrar tareas y próximos eventos.  
\* Calendar debe alimentar Próximos Eventos en Home.  
\* Task aparece en Home.  
\* Carga Familiar muestra distribución de carga de tareas.  
\* Atención Requerida puede incluir tareas vencidas.  
\* Geni no puede marcar tareas completadas automáticamente.  
\* Geni no puede reasignar automáticamente tareas a otro miembro.  
\* Geni no puede cambiar eventos del calendario sin confirmación humana.  
\* Geni puede recordar, alertar, escalar y mostrar patrones.  
\* Problemas leves deben tener oportunidad privada de autocorrección.  
\* Problemas graves escalan antes.  
\* Una tarea crítica incumplida es problema grave.  
\* Patrón recurrente confirmado se considera grave.  
\* Los datos deben estar visibles siempre.  
\* Las alertas deben activarse solo cuando importan.  
\* Diferencias menores no deberían generar alerta invasiva.  
\* La asimetría \> 40% puede activar alerta.  
\* Patrón confirmado 3+ semanas puede activar alerta.  
\* El tono debe ser factual, cálido y no acusatorio.  
\* No usar adjetivos valorativos.  
\* No usar múltiples emojis.  
\* La distribución de carga no debe ser solo 50/50 numérico.  
\* La carga debe considerar disponibilidad, contexto y capacidad.  
\* Si se muestra una sugerencia de Geni, debe quedar claro que la decisión final es humana.  
\* Multi-hogar avanzado queda fuera del MVP actual, pero cada hogar tiene su propio Planner según el documento.  
\* Empleado Familiar queda fuera del MVP actual, pero el documento indica que puede completar tareas asignadas y no crear tareas.

\---

\#\# 14\. Ideas derivadas útiles

\#\#\# Propuesta UX derivada / requiere validación del usuario

\* Crear pantalla inicial de Planner con dos tabs principales:

  \* Tasks;  
  \* Calendar.  
\* Crear una tercera sección futura o desactivada para Goals.  
\* Mostrar arriba una card “Hoy en el hogar” con:

  \* tareas pendientes;  
  \* tareas vencidas;  
  \* próximos eventos;  
  \* carga familiar resumida.  
\* Mostrar tareas agrupadas por:

  \* Hoy;  
  \* Vencidas;  
  \* Esta semana;  
  \* Completadas.  
\* Mostrar una card de “Carga familiar” dentro de Planner con porcentajes por miembro.  
\* Usar chips de estado:

  \* Hoy;  
  \* Vencida;  
  \* Crítica;  
  \* Completada;  
  \* Requiere atención.  
\* Agregar un botón rápido “Completar” visible en cada tarea.  
\* Agregar un botón “Ver patrón” cuando una tarea se incumple varias veces.  
\* Agregar un banner no invasivo cuando hay asimetría fuerte.  
\* Usar Quick Actions para crear tarea y crear evento.  
\* Usar el copy factual de Geni en cards de resumen.  
\* Crear una pantalla de detalle de tarea con:

  \* responsable;  
  \* vencimiento;  
  \* estado;  
  \* historial simple;  
  \* acciones humanas sugeridas.  
\* Crear estado vacío orientado a valor:

  \* “Cargá la primera tarea del hogar para que todos sepan qué hay que hacer.”  
\* Crear estado vacío para calendario:

  \* “Agregá el primer evento familiar para que todos vean los próximos compromisos.”  
\* Mostrar Home como resumen y Planner como lugar donde se edita/administra.

\---

\#\# 15\. Decisiones que quedan abiertas

\* No se define estructura visual exacta de Planner.  
\* No se define si Planner tiene tabs internas.  
\* No se define si Tasks y Calendar son pantallas separadas o vistas dentro de Planner.  
\* No se define formulario de crear tarea.  
\* No se define formulario de crear evento.  
\* No se definen campos obligatorios de tarea.  
\* No se definen campos obligatorios de evento.  
\* No se define prioridad como campo.  
\* No se define fecha límite como campo técnico, aunque hay vencimientos.  
\* No se define responsable como campo técnico, aunque aparece en ejemplos.  
\* No se define assignment UI.  
\* No se define si “Responsabilidad” debe ser entidad visible, filtro o sección.  
\* No se definen templates concretas.  
\* No se define categoría.  
\* No se define relación entre template, responsabilidad y categoría.  
\* No se define verification flow para frontend.  
\* No se define calendario día/semana/mes.  
\* No se define si tareas con fecha aparecen dentro del calendario.  
\* No se define recurrencia de tareas o eventos.  
\* No se define qué acciones puede hacer cada rol del MVP.  
\* No se define cómo se muestran permisos en UI.  
\* No se define loading state.  
\* No se define error state.  
\* No se define empty state explícito.  
\* No se define diseño visual: colores, sombras, bordes, espaciado.  
\* No se define contrato API.  
\* No se define service frontend.  
\* No se define almacenamiento local.  
\* No se define sincronización real.  
\* No se define cómo representar Geni en Planner sin IA real.  
\* No se define si Carga Familiar es real o mock en MVP.

\---

\#\# 16\. Qué NO debe entrar al MVP actual

\* Geni real.  
\* Reasignación automática de tareas.  
\* Cambio automático de eventos.  
\* Automatizaciones reales.  
\* Push notifications reales.  
\* Auditoría completa.  
\* Offline Sync.  
\* Multi-hogar avanzado.  
\* Empleado Familiar completo.  
\* Presence GPS real.  
\* Finance real.  
\* Inventory real.  
\* Assets real.  
\* FamilyCloud real.  
\* Feed real.  
\* SOS real.  
\* Goals backend real.  
\* Milestones / Hitos como implementación real.  
\* Fondos asociados a Goals.  
\* Comentarios en tareas.  
\* Adjuntos en tareas.  
\* Evidencia adjunta de tareas.  
\* Timeline completo de tarea.  
\* Dependencias de tareas.  
\* Subtareas complejas.  
\* Recurrencia avanzada.  
\* Geocercas generando eventos.  
\* Automatizaciones creando eventos.  
\* Álbum automático desde evento.  
\* Recuerdos desde evento.  
\* SearchGlobal avanzado.  
\* GeniPlanner analizando carga real con IA.  
\* Detección real de manipulación de disponibilidad.  
\* Redistribución automática de carga.  
\* Configuración avanzada de disponibilidad.  
\* Dashboards históricos complejos.

\---

\#\# 17\. Extractos o referencias internas importantes

\#\#\# Documento principal: \`HomePlus — SECCION 3 FILOSOFIA.md\`

Secciones relevantes:

\* \`DEFINICIÓN DE SISTEMA\`

  \* HomePlus como sistema operativo del hogar.  
  \* Siempre disponible pero nunca invasivo.  
  \* Recordar sin acusar.  
  \* Sostener sin controlar.

\* \`POSTURA FUNDACIONAL\`

  \* Hacer visible lo invisible.  
  \* No tolerar evasión.  
  \* No reemplazar conversación humana.  
  \* No permitir fragmentación.

\* \`POLARIDADES RESUELTAS\`

  \* \`1. AUTONOMÍA INDIVIDUAL vs COHESIÓN GRUPAL\`

    \* Transparencia forzada en tareas, finanzas compartidas y calendario familiar.  
    \* Todos ven quién hizo qué.  
    \* Nadie puede ocultar tareas pendientes/completadas.  
    \* Nadie puede ocultar eventos del calendario familiar.

  \* \`2. EFICIENCIA vs PROCESO HUMANO\`

    \* Geni no reasigna tareas automáticamente.  
    \* Geni no cambia eventos sin confirmación.  
    \* Escalamiento de tareas en 4 niveles.  
    \* Ejemplos de mensajes para tareas vencidas.

  \* \`3. RECONOCIMIENTO EMPÁTICO vs NEUTRALIDAD DE DATOS\`

    \* Números \+ contexto \+ tono cálido.  
    \* Ejemplos de distribución de tareas.  
    \* Regla de no usar adjetivos valorativos.  
    \* Uso moderado de emojis.

  \* \`4. PREVENCIÓN DE CONFLICTOS vs EXPOSICIÓN DE CONFLICTOS\`

    \* Datos siempre visibles.  
    \* Alertas por umbrales.  
    \* Dashboard de distribución de tareas semanal/mensual.  
    \* Próximos vencimientos.  
    \* Asimetría \> 40%.  
    \* Patrón 3+ semanas.

  \* \`5. OPTIMIZACIÓN DE TAREAS vs RESPETO AL CONTEXTO HUMANO\`

    \* Equidad por esfuerzo real.  
    \* Disponibilidad 1-2hs / 3-4hs / 5+hs.  
    \* Ejemplo de 18 tareas semanales.  
    \* Ajustes temporales por exámenes/enfermedad.

  \* \`6. ADOPCIÓN GRADUAL vs COMPROMISO TOTAL\`

    \* Calendario \+ tareas como núcleo obligatorio desde día 1\.  
    \* Día 1: familia carga calendario y tareas.  
    \* No se puede usar solo calendario.

  \* \`7. INTERVENCIÓN TEMPRANA vs RESPETO AL RITMO FAMILIAR\`

    \* Problemas leves vs graves.  
    \* Tareas no críticas.  
    \* Tareas críticas.  
    \* Escalamiento progresivo.  
    \* Ejemplos de \`sacar la basura\`, \`alquiler\`, \`medicación\`, \`turnos médicos\`.

\* \`EJEMPLOS FILOSÓFICOS\`

  \* Multi-hogar real como contexto de Planner por hogar.  
  \* Empleado Familiar puede completar tareas asignadas, comentar y adjuntar evidencia.  
  \* Empleado Familiar no puede crear tareas ni administrar hogar.  
  \* Para MVP actual, esto queda como referencia futura.

\#\#\# Archivo de comprensión: \`Seccion 3 Filosofia.txt\`

Elementos relevantes:

\* \`Planner\`

  \* Contiene Task, Calendar, Goal, Responsabilidad.  
\* \`Task\`

  \* Estados del archivo de comprensión: Pendiente, En progreso, Completada, Cancelada.  
  \* Se asocia con Persona.  
  \* Pertenece a Responsabilidad.  
  \* Tiene Subtarea, Dependencia, Recurrencia, Verificación, Comentario, Adjunto, Timeline.  
\* \`Calendar\`

  \* Contiene Event.  
  \* Alimenta PróximosEventos.  
\* \`Event\`

  \* Estados del archivo de comprensión: Programado, Completado, Cancelado.  
  \* Tiene participantes Persona.  
\* \`Home\`

  \* Centro operativo.  
  \* Resume información, no administra.  
  \* Contiene Briefing, Atención Requerida, CargaFamiliar, PróximosEventos, ActividadFamiliar.  
\* \`QuickActions\`

  \* Botón \+ central en Bottom Nav.  
  \* Panel flotante con acciones rápidas.  
  \* Geni es slot fijo.  
\* \`BottomNav\`

  \* Home, People, \+, Planner, More.  
\* \`SearchGlobal\`

  \* Indexa Planner.

\---

\#\# 18\. Conclusión operativa

Este documento aporta principalmente \*\*principios de experiencia, reglas de visibilidad y comportamiento UX\*\* para Planner Frontend.

Debe usarse en la spec final para definir:

\* tono de Planner;  
\* visibilidad de tareas;  
\* visibilidad del calendario familiar;  
\* reglas de no ocultar pendientes/completadas;  
\* carga familiar;  
\* escalamiento visual;  
\* Home como resumen;  
\* Planner como administración;  
\* Quick Actions como acceso rápido;  
\* copywriting factual y cálido;  
\* diferencias entre datos visibles y alertas activas;  
\* separación entre MVP real y futuras funciones avanzadas.

No debe usarse como fuente única para:

\* contratos API;  
\* modelo de datos final;  
\* diseño visual detallado;  
\* tabs definitivas;  
\* formularios;  
\* campos exactos;  
\* endpoints;  
\* permisos técnicos;  
\* estados técnicos definitivos;  
\* implementación de Geni real;  
\* automatizaciones;  
\* offline sync;  
\* módulos externos.

La parte más útil para el Planner ideal es convertir la filosofía en frontend visible:

\* tareas claras;  
\* calendario claro;  
\* responsables visibles;  
\* vencimientos visibles;  
\* carga familiar visible;  
\* alertas no invasivas;  
\* acciones humanas simples;  
\* Home resumido;  
\* Planner operativo.

\# planner\_frontend\_fragment\_HomePlus\_SECCION\_4\_EMOTIONAL\_DESING

\#\# 1\. Fuente

\* Documento: \`HomePlus — SECCION 4 EMOTIONAL DESING.md\`  
\* Archivo de comprensión asociado: \`Seccion 4 Emotional Design.txt\`  
\* Tipo de documento: Product Brain / Arquitectura emocional del sistema.  
\* Alcance del documento: Define emociones objetivo, emociones prohibidas, tono de interacción, escalada de Geni, carga reducida, rachas, visibilidad del rendimiento, composición del hogar y restricciones emocionales aplicables al producto.  
\* Nivel de utilidad para Planner Frontend: Medio.

Este documento no define pantallas completas de Planner, diseño visual detallado, contratos API ni formularios. Aporta principios de UX, tono, reglas emocionales, relación Planner–Home, entidades de Planner y restricciones útiles para diseñar un Planner claro, no punitivo y orientado a coordinación familiar.  

\---

\#\# 2\. Resumen útil para Planner Frontend

Este documento aporta al Planner Frontend principalmente:

\* El Planner debe ayudar a resolver la asimetría de coordinación sin generar resentimiento, desgaste ni explosión.  
\* Las tareas deben tener responsable visible y estado claro.  
\* El sistema debe reducir carga cognitiva: recordar, organizar y anticipar sin abrumar.  
\* El Planner debe mostrar información con contexto, no como números aislados.  
\* La visibilidad del esfuerzo es central, pero los incumplimientos no deben exponerse públicamente.  
\* El tono debe ser afirmativo, no evaluativo.  
\* Las notificaciones sobre tareas/eventos deben ser útiles, segmentadas y no repetitivas.  
\* El Calendar puede usarse como contexto para calibrar carga de tareas.  
\* El modo carga reducida existe como mecanismo de cuidado y agencia.  
\* Las rachas, recuperación de racha, memoria histórica y escalada de Geni aparecen como conceptos avanzados.  
\* Home resume información del Planner mediante próximos eventos, tareas por responsabilidad, atención requerida y briefing.  
\* Planner aparece en la navegación principal congelada: Home, People, \+, Planner, More.  
\* Quick Actions aparece como panel flotante desde el botón \`+\`, con Geni como slot fijo y acciones dinámicas.  
\* Planner es definido por el archivo de comprensión como núcleo operativo que administra Tasks, Calendar, Goals y Responsabilidades.

\---

\#\# 3\. Principios de producto aplicables

\#\#\# Reducción de carga mental

\* HomePlus debe reducir la carga cognitiva del coordinador.  
\* La app debe recordar, organizar y anticipar para que el usuario no tenga que sostener todo en la cabeza.  
\* Aplicable a Planner Frontend:

  \* Planner debe priorizar claridad de pendientes.  
  \* Las tareas y eventos deben estar ordenados por urgencia/contexto.  
  \* La pantalla no debe sentirse abrumadora.  
  \* Los recordatorios deben ser útiles y no decorativos.

\#\#\# Claridad operativa

\* Cada miembro debe saber qué le toca, qué hizo el resto y cuál es el estado del hogar.  
\* La información debe existir y ser accesible sin preguntar, adivinar ni recordar.  
\* Las tareas tienen responsable visible y estado claro.  
\* Aplicable a Planner Frontend:

  \* Cada task card debería mostrar responsable y estado.  
  \* El estado visual de la tarea debe ser inequívoco.  
  \* La pantalla debe permitir entender rápidamente qué está pendiente, completado o requiere atención.  
  \* Los datos deben mostrarse con contexto.

\#\#\# Reconocimiento sin humillación

\* El esfuerzo de cada miembro debe ser visible.  
\* La visibilidad del esfuerzo produce reconocimiento antes de que aparezca resentimiento.  
\* El sistema no debe convertir visibilidad en exposición pública de fallos.  
\* Aplicable a Planner Frontend:

  \* Mostrar tareas completadas puede reforzar reconocimiento.  
  \* Evitar copies que expongan incumplimientos con tono acusatorio.  
  \* Las faltas deben tratarse de forma privada o contextual, no como vergüenza pública.  
  \* Los textos deben celebrar avances sin comparar miembros.

\#\#\# Pertenencia y agencia

\* Cada miembro debe sentir que es parte activa del hogar, no un destinatario pasivo de instrucciones.  
\* El sistema debe reforzar que el hogar es un proyecto colectivo, no una estructura de mando.  
\* Aplicable a Planner Frontend:

  \* Las tareas asignadas no deberían sentirse como órdenes.  
  \* Las acciones de completar, declarar carga reducida o gestionar pendientes deben sentirse simples y con agencia.  
  \* El tono debe ser colaborativo.

\#\#\# Control saludable

\* Los miembros tienen agencia real.  
\* Pueden declarar que necesitan un día más liviano.  
\* Pueden ver su historial.  
\* Pueden decidir visibilidad en ciertos módulos.  
\* El sistema da información, no órdenes.  
\* Geni sugiere, no impone.  
\* Aplicable a Planner Frontend:

  \* El Planner puede incluir, en futuro, una acción para solicitar carga reducida.  
  \* Las sugerencias deben presentarse como ayuda, no imposición.  
  \* Los estados y resúmenes deben informar sin juzgar.

\#\#\# Coordinación sobre control

\* El documento marca que Presence debe regirse por coordinación sobre control.  
\* Este principio es trasladable al Planner:

  \* Asignar tareas no debe sentirse como vigilancia.  
  \* El Planner debe coordinar responsabilidades, no controlar personas.  
  \* Los estados de tarea deben ayudar al hogar a organizarse.

\#\#\# Tono no evaluativo

\* Geni no debe usar etiquetas como “rendimiento bajo” o “rendimiento excelente”.  
\* Debe presentar datos concretos con contexto y dirección.  
\* Ejemplo explícito del documento:

  \* “Esta semana completaste 6 de 10 tareas. Tu mejor semana del mes fue la segunda, con 9 de 10.”  
\* Aplicable a Planner Frontend:

  \* Usar métricas descriptivas.  
  \* Evitar labels moralizantes.  
  \* Evitar mensajes que parezcan juicio o reporte disciplinario.  
  \* Preferir frases orientadas a acción.

\---

\#\# 4\. UX/UI aplicable

\#\#\# Navegación

\* BottomNavigation contiene:

  \* Home.  
  \* People.  
  \* QuickActions mediante botón \`+\`.  
  \* Planner.  
  \* More.  
\* Planner aparece como tab principal de navegación.  
\* Home es centro operativo y resume información.  
\* More contiene herramientas especializadas, pero Planner no vive en More según el archivo de comprensión.  
\* QuickActions es un panel flotante desde el botón \`+\`.

\#\#\# Jerarquía de información

\* La complejidad interna no debe reflejarse en la interfaz.  
\* Home resume información, no administra.  
\* La administración ocurre en el módulo correspondiente.  
\* Aplicable:

  \* Home puede mostrar cards de tareas/eventos.  
  \* Planner debe ser el lugar donde se administra el detalle.  
  \* Desde Home debería poder navegarse a Planner para gestionar.

\#\#\# Cards / widgets mencionados o inferidos desde el archivo de comprensión

\* \`Widget\_UpcomingEvents\`: bloque de próximos eventos en Home.  
\* \`Widget\_TasksByResponsibility\`: bloque de tareas agrupadas por responsabilidad en Home.  
\* \`Widget\_AttentionRequired\`: bloque de atención requerida en Home; incluye tareas vencidas.  
\* \`Briefing\`: resumen del hogar generado por Geni, primer widget de Home.  
\* \`Widget\_FamilyLoad\`: bloque de Carga Familiar en Home.  
\* \`Widget\_FamilyActivity\`: bloque de Actividad Familiar en Home.

\#\#\# Estados visibles

\* Las tareas deben tener responsable visible.  
\* Las tareas deben tener estado claro.  
\* “Vencida” no es un estado de tarea; se calcula automáticamente.  
\* Los eventos tienen estados: Programado, Completado, Cancelado.  
\* Las tareas tienen estados detectados en el archivo de comprensión:

  \* Pendiente.  
  \* En progreso.  
  \* Completada.  
  \* Cancelada.  
\* Estos estados no coinciden exactamente con los estados MVP técnicos actuales si ese MVP usa otra nomenclatura; queda como decisión abierta para el merge.

\#\#\# Copywriting / tono

\* El tono debe evitar:

  \* Culpa acumulada.  
  \* Presión social.  
  \* Ansiedad por notificaciones.  
  \* Sensación de vigilancia.  
  \* Juicio evaluativo.  
\* Los mensajes deben:

  \* Dar contexto.  
  \* Ser afirmativos.  
  \* Sugerir, no imponer.  
  \* Facilitar conversaciones reales.  
  \* Evitar denuncia o exposición.

\#\#\# Notificaciones / avisos

\* Las notificaciones son útiles, no decorativas.  
\* Las notificaciones se segmentan en cuatro prioridades:

  \* Crítica.  
  \* Alta: aprobaciones, pagos vencidos, tareas vencidas.  
  \* Media: eventos, comentarios, cambios importantes.  
  \* Baja: actividad general.  
\* Las alertas de bajo impacto se agrupan en resúmenes.  
\* El sistema nunca notifica dos veces lo mismo.  
\* Aplicable a Planner Frontend:

  \* Tareas vencidas pueden aparecer como prioridad alta.  
  \* Eventos pueden aparecer como prioridad media.  
  \* No conviene saturar la UI con banners repetidos.  
  \* El Planner debe evitar microestrés.

\#\#\# Estados emocionales aplicables a pantallas

\* Pantalla de tareas:

  \* Debe transmitir claridad, control saludable y calma.  
\* Pantalla de calendario:

  \* Debe ayudar a anticipar sin abrumar.  
\* Pantalla de tarea vencida:

  \* Debe orientar a recuperación, no castigo.  
\* Pantalla de carga reducida:

  \* Debe evitar que el coordinador sienta que está juzgando.  
  \* El documento indica que el diseño exacto de esta pantalla queda para otra sección.

\---

\#\# 5\. Información directa sobre Planner

\#\#\# Definición detectada

\* Planner es el núcleo operativo.  
\* Administra:

  \* Tasks.  
  \* Calendar.  
  \* Goals.  
  \* Responsabilidades.

\#\#\# Relaciones detectadas

\* Planner contiene Task.  
\* Planner contiene Calendar.  
\* Planner contiene Goal.  
\* Planner contiene Responsibility.  
\* Task pertenece a Responsibility.  
\* Calendar contiene Event.  
\* Goal rastrea progreso vía Task.  
\* Goal contiene Milestone.  
\* Geni puede crear tareas en Planner.  
\* Automation puede disparar Task.  
\* Home contiene widgets relacionados con Planner:

  \* UpcomingEvents.  
  \* TasksByResponsibility.  
  \* AttentionRequired.  
\* BottomNavigation contiene Planner.

\#\#\# Reglas aplicables

\* Los módulos no deben comportarse como aplicaciones separadas.  
\* Todos los dominios deben poder relacionarse.  
\* La complejidad interna no debe reflejarse en la interfaz.  
\* Home resume información, no administra.  
\* Vencida no es un estado de tarea; se calcula automáticamente.  
\* Solo existe un único nivel de subtareas; no hay subtareas anidadas.

\---

\#\# 6\. Información sobre Tasks

\#\#\# MVP actual

Información útil para el MVP visual/interactivo:

\* Las tareas deben tener responsable visible.  
\* Las tareas deben tener estado claro.  
\* Task representa trabajo pendiente o realizado.  
\* Estados encontrados:

  \* Pendiente.  
  \* En progreso.  
  \* Completada.  
  \* Cancelada.  
\* “Vencida” se calcula automáticamente, no es estado propio.  
\* Las tareas pueden estar agrupadas por Responsibility.  
\* Responsibility es un área operativa del hogar que agrupa tareas.  
\* Ejemplos de Responsibility detectados:

  \* Compras.  
  \* Mascotas.  
  \* Limpieza.  
\* Una Responsibility puede tener múltiples miembros.  
\* Home puede mostrar tareas agrupadas por responsabilidad.  
\* Home puede mostrar tareas vencidas dentro de Atención Requerida.  
\* El esfuerzo de tareas completadas puede ser visible como reconocimiento.  
\* Las tareas vencidas pertenecen a prioridad alta en notificaciones.  
\* El incumplimiento no debe exponerse públicamente con tono humillante.  
\* La recuperación debe estar diseñada como salida, no como castigo.

\#\#\# POST-MVP / futuro

\* Rachas individuales y familiares.  
\* Recuperación de racha.  
\* Memoria histórica de rendimiento.  
\* Escalada de Geni por incumplimientos.  
\* Modo carga reducida.  
\* Historial completo de activaciones de carga reducida.  
\* Subtasks.  
\* TaskTemplate como entidad.  
\* TaskComment.  
\* TaskAttachment.  
\* TaskDependency.  
\* TaskRecurrence.  
\* TaskVerification.  
\* Automatizaciones que disparan tareas.  
\* Geni creando tareas en Planner.  
\* ShoppingSuggestion derivada de Responsibility y Presence.  
\* AuditLog registrando acciones sobre Task.  
\* Evidencia adjunta por Empleado Familiar.  
\* Tarea compensatoria automática.

\#\#\# Dudas o decisiones abiertas

\* El documento no define campos concretos de Task.  
\* No define prioridad de task como campo.  
\* No define fecha límite como campo, aunque menciona tareas vencidas.  
\* No define formularios de creación/edición de tarea.  
\* No define contrato API.  
\* No define tabs, filtros ni layout de task list.  
\* No define si el estado “En progreso” entra al MVP actual.  
\* No define cómo se representa \`TaskVerification\` en UI.  
\* No define si TaskTemplate debe ser visible como template, categoría o atajo.  
\* No define las templates MVP “Medicación”, “Estudios” o “Pagos” como templates de Planner; “medicación” aparece asociada a experiencia de Adulto Mayor y a Inventory.  
\* No define prioridades visuales.  
\* No define comportamiento para eliminar tarea.

\---

\#\# 7\. Información sobre Calendar / Events

\#\#\# MVP actual

Información útil para el MVP visual/interactivo:

\* Calendar forma parte de Planner.  
\* Calendar administra eventos dentro de Planner.  
\* Calendar contiene Event.  
\* Event representa evento familiar o personal.  
\* Estados detectados de Event:

  \* Programado.  
  \* Completado.  
  \* Cancelado.  
\* Home puede mostrar próximos eventos.  
\* Los eventos pueden aparecer en notificaciones de prioridad media.  
\* El calendario del miembro puede usarse como contexto para reducir carga de tareas.  
\* Ejemplos de contexto de Calendar usados para carga:

  \* Semana de exámenes.  
  \* Día laboral cargado.  
  \* Evento familiar significativo.  
\* La experiencia del Adulto Mayor prioriza eventos, recordatorios, medicación y coordinación.  
\* Event puede ser celebrado como logro o actividad en otros espacios, pero eso no debe convertirse en Feed real para este MVP.

\#\#\# POST-MVP / futuro

\* Calibración automática de carga según calendario del miembro.  
\* CalendarAutoAlbum: evento finalizado puede disparar creación de recuerdo.  
\* Participación de Geni en contexto del calendario.  
\* Eventos vinculados a recuerdos o FamilyCloud.  
\* Eventos usados por automatizaciones.  
\* Memoria histórica asociada a rendimiento y calendario.

\#\#\# Dudas o decisiones abiertas

\* No se definen vistas día/semana/mes en este documento.  
\* No se definen campos de Event como título, fecha, hora, ubicación o participantes.  
\* No se define formulario de creación de evento.  
\* No se define edición o cancelación de evento en UI.  
\* No se define recurrencia.  
\* No se define cómo mostrar tareas con fecha dentro del calendario.  
\* No se define si eventos personales y familiares se diferencian visualmente.  
\* No se define contrato API.  
\* No se define empty state ni loading state para calendario.

\---

\#\# 8\. Información sobre Goals

\#\#\# Referencia visual o futura

\* Planner contiene Goal.  
\* Goal es objetivo personal o familiar.  
\* Goal tiene estructura:

  \* Goal → Milestone → Tasks.  
\* Estados detectados:

  \* Activa.  
  \* Completada.  
  \* Fallida.  
\* Goal rastrea progreso vía Task.

\#\#\# Fuera del MVP actual

\* Goals queda como referencia visual/futura.  
\* Milestone queda fuera del MVP actual.  
\* No usar Goals para bloquear implementación de Tasks o Calendar.  
\* No crear flujo completo de metas desde este documento.  
\* No convertir Goal → Milestone → Tasks en obligación actual del Planner MVP.

\#\#\# Dudas o decisiones abiertas

\* No se define UI de Goals.  
\* No se definen campos de Goal.  
\* No se define progreso visual.  
\* No se definen acciones.  
\* No se define relación concreta entre Goal y Home.  
\* No se define si Goal aparece como tab dentro de Planner.

\---

\#\# 9\. Responsabilidades, templates y categorías

\#\#\# Responsabilidades

\* Responsibility aparece como entidad de Planner.  
\* Responsibility es un área operativa del hogar que agrupa tareas.  
\* Ejemplos explícitos:

  \* Compras.  
  \* Mascotas.  
  \* Limpieza.  
\* Una Responsibility puede tener múltiples miembros.  
\* Task pertenece a Responsibility.  
\* Home puede mostrar tareas agrupadas por Responsibility.  
\* ShoppingSuggestion deriva de Responsibility.

\#\#\# Templates

\* TaskTemplate aparece como entidad de Planner.  
\* Se define como plantilla de tareas.  
\* Inicialmente solo para Tasks.  
\* No hay definición visual ni funcional de templates en el documento.  
\* No se indican templates predefinidas específicas salvo ejemplos de Responsibility.

\#\#\# Categorías

\* El documento no define una entidad “Categoría” para Planner.  
\* No define si categorías y responsabilidades son lo mismo.  
\* No define chips, colores ni iconografía para categorías.  
\* No define reglas para evitar duplicación entre template y categoría.

\#\#\# Creación rápida

\* QuickActions aparece como panel flotante desde el botón \`+\`.  
\* Geni aparece como slot fijo dentro de QuickActions.  
\* No se menciona explícitamente “crear tarea” ni “crear evento” como Quick Action en este documento.  
\* Geni puede crear tareas en Planner según el archivo de comprensión.  
\* Toda acción rápida relacionada con tareas/eventos queda como posible derivación, no como información explícita.

\---

\#\# 10\. Quick Actions aplicables a Planner

\#\#\# Información explícita

\* QuickActions es un panel flotante desde el botón \`+\` en BottomNavigation.  
\* Geni ocupa un slot fijo.  
\* Hay acciones dinámicas.  
\* BottomNavigation contiene QuickActions.  
\* Geni puede crear tareas en Planner según el archivo de comprensión.

\#\#\# Aplicación posible a Planner Frontend

\* Quick Actions puede ser una vía visual para acciones de Planner.  
\* Cualquier acción Planner dentro del \`+\` debe mantener simplicidad y no reflejar complejidad interna.  
\* Si se usa Geni como entrada de Planner, debe sugerir, no imponer.  
\* No se debe implementar IA real desde este documento.

\#\#\# No encontrado

\* No se menciona explícitamente:

  \* Crear tarea desde Quick Actions.  
  \* Crear evento desde Quick Actions.  
  \* Crear objetivo desde Quick Actions.  
  \* Ver pendientes desde Quick Actions.  
  \* Orden visual del menú.  
  \* Íconos.  
  \* Estados del panel.

\---

\#\# 11\. Home relacionado con Planner

\#\#\# Tareas en Home

\* Home contiene \`Widget\_TasksByResponsibility\`.  
\* Este widget agrupa tareas por Responsibility.  
\* Home contiene \`Widget\_AttentionRequired\`.  
\* Atención Requerida puede incluir tareas vencidas.  
\* Home resume información, no administra.  
\* La administración debe ocurrir en Planner.

\#\#\# Eventos en Home

\* Home contiene \`Widget\_UpcomingEvents\`.  
\* Próximos eventos se muestran como resumen.  
\* Los eventos pertenecen a Calendar dentro de Planner.  
\* Los eventos pueden tener prioridad media en notificaciones.

\#\#\# Briefing

\* Home contiene Briefing.  
\* Briefing es resumen del hogar generado por Geni.  
\* Para el MVP visual, puede servir como resumen contextual.  
\* No implementar Geni real desde este documento.  
\* El documento indica que la calma se entrega mediante Briefing.

\#\#\# Carga Familiar

\* Home contiene \`Widget\_FamilyLoad\`.  
\* La carga familiar se relaciona indirectamente con tareas, rachas, cumplimiento y carga reducida.  
\* No se define UI concreta ni cálculo.  
\* Para MVP actual, tratar como referencia visual/mock si se usa.

\#\#\# Actividad Familiar

\* Home contiene \`Widget\_FamilyActivity\`.  
\* Puede reflejar actividad vinculada a tareas/eventos.  
\* No se define implementación real.  
\* No desarrollar Feed real.

\#\#\# Links hacia Planner

\* No se define copy de “Ver todo”.  
\* No se define navegación exacta desde cards de Home a Planner.  
\* Regla aplicable:

  \* Home resume.  
  \* Planner administra.

\---

\#\# 12\. Patrones visuales reutilizables

\#\#\# Aplicable ahora a Planner

\* Interfaz no abrumadora.  
\* Responsable visible en task cards.  
\* Estado claro en task cards.  
\* Datos con contexto.  
\* Agrupación por Responsibility.  
\* Home con cards/widgets resumidos.  
\* Bottom Nav fijo con Planner.  
\* QuickActions central desde \`+\`.  
\* Mensajes no evaluativos.  
\* Señales visuales de tareas vencidas sin tono punitivo.  
\* Celebrar completado sin comparar miembros.  
\* Evitar que tareas incumplidas se presenten como exposición pública.  
\* Para Adulto Mayor: interfaz simplificada, foco en eventos, recordatorios, medicación y coordinación.

\#\#\# Referencia visual para más adelante

\* Rachas visibles para el hogar.  
\* Historial completo de rendimiento.  
\* Modo carga reducida.  
\* Escalada de Geni.  
\* Tarea compensatoria automática.  
\* Solicitud de carga reducida con aprobación del coordinador.  
\* Pantalla de aprobación de carga reducida sin sensación de juicio.  
\* Integración de Calendar con reducción automática de carga.

\#\#\# No aplicable

\* No hay capturas o diseño visual detallado en este documento.  
\* No se definen colores, sombras, bordes, spacing, iconos ni layout exacto.  
\* No se definen formularios visuales.  
\* No se definen tabs internos de Planner.

\---

\#\# 13\. Reglas funcionales extraídas

\* Planner es núcleo operativo y administra Tasks, Calendar, Goals y Responsabilidades.  
\* Las tareas deben tener responsable visible.  
\* Las tareas deben tener estado claro.  
\* Los datos deben presentarse con contexto.  
\* Home resume información, no administra.  
\* Planner administra el detalle.  
\* Home puede mostrar próximos eventos.  
\* Home puede mostrar tareas agrupadas por responsabilidad.  
\* Home puede mostrar tareas vencidas en Atención Requerida.  
\* “Vencida” no es estado de tarea; se calcula automáticamente.  
\* Task pertenece a Responsibility.  
\* Responsibility agrupa tareas.  
\* Una Responsibility puede tener múltiples miembros.  
\* Calendar contiene Event.  
\* Event puede ser familiar o personal.  
\* El calendario puede influir en la carga de tareas.  
\* El sistema debe reducir carga mental.  
\* El sistema debe sugerir, no imponer.  
\* El sistema debe evitar culpa acumulada.  
\* El sistema debe evitar presión social.  
\* El sistema debe evitar ansiedad por notificaciones.  
\* Las notificaciones de bajo impacto deben agruparse.  
\* El sistema nunca debe notificar dos veces lo mismo.  
\* Tareas vencidas son prioridad alta en notificaciones.  
\* Eventos son prioridad media en notificaciones.  
\* Los incumplimientos no deben publicarse como humillación.  
\* Los logros pueden celebrarse sin contrastar.  
\* Geni no debe usar etiquetas evaluativas.  
\* Los miembros deben tener agencia real.  
\* El modo carga reducida existe, pero su UI detallada queda fuera de esta sección.  
\* La complejidad interna no debe reflejarse en la interfaz.  
\* Los módulos deben relacionarse, no comportarse como apps separadas.

\---

\#\# 14\. Ideas derivadas útiles

\* Propuesta UX derivada / requiere validación del usuario: En Planner, usar cards de tarea con título, responsable, estado, vencimiento calculado y chip de responsabilidad.  
\* Propuesta UX derivada / requiere validación del usuario: Mostrar “Vencida” como badge calculado, no como estado seleccionable.  
\* Propuesta UX derivada / requiere validación del usuario: Agrupar la lista de tareas por responsabilidades como Limpieza, Compras y Mascotas cuando existan.  
\* Propuesta UX derivada / requiere validación del usuario: Usar copy de recuperación en tareas vencidas, por ejemplo orientar a “resolver” en vez de “fallaste”.  
\* Propuesta UX derivada / requiere validación del usuario: En Home, hacer que la card de tareas por responsabilidad navegue al Planner filtrado por esa responsabilidad.  
\* Propuesta UX derivada / requiere validación del usuario: En Home, hacer que la card de próximos eventos navegue a Calendar.  
\* Propuesta UX derivada / requiere validación del usuario: Usar QuickActions para crear tarea y crear evento, aunque el documento no lo diga explícitamente.  
\* Propuesta UX derivada / requiere validación del usuario: Usar un resumen tipo “Esta semana completaste X de Y tareas” como insight no evaluativo.  
\* Propuesta UX derivada / requiere validación del usuario: Para Adulto Mayor, ofrecer una vista simplificada de Planner centrada en eventos, recordatorios, medicación y coordinación.  
\* Propuesta UX derivada / requiere validación del usuario: Diferenciar tareas completadas con reconocimiento visual suave, sin ranking ni comparación.  
\* Propuesta UX derivada / requiere validación del usuario: Mostrar notificaciones/eventos pendientes agrupados en un resumen para evitar ansiedad.

\---

\#\# 15\. Decisiones que quedan abiertas

\* Campos finales de Task.  
\* Estados finales de Task para el MVP actual.  
\* Cómo mapear Pendiente / En progreso / Completada / Cancelada contra estados técnicos del MVP si difieren.  
\* Campos finales de Event.  
\* Vistas de Calendar: día, semana, mes o agenda.  
\* Diseño de creación rápida de tarea.  
\* Diseño de creación rápida de evento.  
\* Si QuickActions incluirá crear tarea y crear evento.  
\* Si Planner tendrá tabs internos.  
\* Si Responsibility será entidad real, categoría visual o agrupador mock.  
\* Si TaskTemplate será usado en MVP actual.  
\* Relación entre templates, categorías y responsabilidades.  
\* Cómo mostrar verificación de tareas.  
\* Cómo mostrar prioridad.  
\* Cómo mostrar fecha límite.  
\* Cómo manejar edición/eliminación de tareas.  
\* Cómo manejar cancelación de eventos.  
\* Cómo se implementa la relación Home → Planner.  
\* Qué partes del Briefing serán mock.  
\* Qué partes de Carga Familiar serán mock.  
\* Si se incluye modo carga reducida en MVP visual o queda fuera.  
\* Si se muestran rachas en Planner o solo en futuro.  
\* Cómo se expresa visualmente el tono emocional; el documento indica que esto se define en Sección 6: UX Philosophy.

\---

\#\# 16\. Qué NO debe entrar al MVP actual

\* Geni real.  
\* Automatizaciones reales.  
\* Notificaciones push reales.  
\* Auditoría completa.  
\* Rachas avanzadas.  
\* Recuperación de racha.  
\* Memoria histórica permanente de rendimiento.  
\* Escalada real de Geni por incumplimientos.  
\* Tarea compensatoria automática.  
\* Modo carga reducida completo.  
\* Aprobación real de carga reducida.  
\* Historial completo de activaciones de carga reducida.  
\* Subtareas complejas.  
\* Comentarios de tareas.  
\* Adjuntos de tareas.  
\* Evidencia adjunta.  
\* Dependencias de tareas.  
\* Recurrencia avanzada de tareas.  
\* Templates personalizadas.  
\* Goals completos.  
\* Milestones.  
\* FamilyCloud vinculado a eventos.  
\* CalendarAutoAlbum.  
\* ShoppingSuggestion con Presence real.  
\* Presence GPS real.  
\* Feed real.  
\* Publicación real de logros.  
\* Comparaciones públicas entre miembros.  
\* Pantallas que expongan incumplimientos como presión social.  
\* Pantallas que conviertan la carga familiar en juicio.  
\* IA evaluativa o etiquetas de rendimiento.

\---

\#\# 17\. Extractos o referencias internas importantes

\* \`HomePlus — PRODUCT BRAIN / Sección 4: Emotional Design\`: el diseño emocional es arquitectura del sistema, no capa de estilo.  
\* \`Principio central\`: HomePlus resuelve asimetría de coordinación mediante herramientas funcionales; si genera las mismas emociones que el problema, falla.  
\* \`Calma\`: la app recuerda, organiza y anticipa para reducir carga cognitiva.  
\* \`Claridad\`: cada miembro sabe qué le toca; las tareas tienen responsable visible y estado claro.  
\* \`Reconocimiento\`: la visibilidad del esfuerzo es central.  
\* \`Control saludable\`: el sistema da información, no órdenes; Geni sugiere, no impone.  
\* \`Culpa acumulada\`: debe existir salida y recuperación, no penalización sin camino.  
\* \`Presión social dentro del hogar\`: logros visibles; faltas no expuestas públicamente.  
\* \`Ansiedad por notificaciones\`: segmentar prioridades, agrupar bajo impacto, no duplicar notificaciones.  
\* \`Mecánica de racha, culpa y recuperación\`: rachas, recuperación, carga por contexto y modo carga reducida como futuro.  
\* \`Memoria histórica y visibilidad del rendimiento\`: datos concretos con contexto, sin etiquetas evaluativas.  
\* Archivo de comprensión:

  \* \`Planner\`: núcleo operativo.  
  \* \`Task\`: trabajo pendiente o realizado.  
  \* \`Responsibility\`: área operativa del hogar que agrupa tareas.  
  \* \`Calendar\`: administración de eventos dentro de Planner.  
  \* \`Event\`: evento familiar o personal.  
  \* \`Home\`: centro operativo, resume información, no administra.  
  \* \`BottomNavigation\`: Home, People, \+, Planner, More.  
  \* \`QuickActions\`: panel flotante desde botón \+.  
  \* \`Widget\_UpcomingEvents\`.  
  \* \`Widget\_TasksByResponsibility\`.  
  \* \`Widget\_AttentionRequired\`.

\---

\#\# 18\. Conclusión operativa

Este documento aporta una base emocional y de UX para diseñar el frontend ideal de Planner, más que una especificación visual o técnica cerrada.

Debe usarse en la spec final para:

\* Definir el tono del Planner.  
\* Evitar una experiencia punitiva.  
\* Priorizar claridad, calma, agencia y reconocimiento.  
\* Diseñar task cards con responsable visible y estado claro.  
\* Mantener Home como resumen y Planner como administración.  
\* Usar responsabilidades como agrupador visual de tareas.  
\* Tratar tareas vencidas como atención requerida sin humillación.  
\* Definir notificaciones y avisos sin ansiedad.  
\* Mantener Geni como sugeridor, no autoridad.  
\* Clasificar rachas, carga reducida, memoria histórica y escalada como futuro/Post-MVP salvo decisión explícita posterior.

Debe ignorarse por ahora para Planner MVP:

\* IA real.  
\* Automatizaciones reales.  
\* Feed real.  
\* Auditoría completa.  
\* Presence GPS.  
\* Goals completos.  
\* Milestones.  
\* Adjuntos.  
\* Comentarios.  
\* Dependencias.  
\* Rachas avanzadas.  
\* Carga reducida completa.  
\* Pantallas avanzadas que el documento menciona como pertenecientes a otras secciones.

\# planner\_frontend\_fragment\_HomePlus\_SECCION\_5\_RELATIONSHIP\_PHILOSOPHY

\#\# 1\. Fuente

\* Documento: \`HomePlus — SECCION 5 RELATIONSHIP PHILOSOPHY.md\`  
\* Archivo de comprensión asociado: \`Seccion 5 filsofia de las relaciones.txt\`  
\* Source map previo: \`source\_map\_HomePlus\_SECCION\_5\_RELATIONSHIP\_PHILOSOPHY.md\`  
\* Tipo de documento: filosofía de relaciones del ecosistema / arquitectura conceptual de conexiones entre dominios.  
\* Alcance del documento: define cómo se conectan módulos, entidades, personas, roles, permisos, privacidad, navegación contextual y Geni como capa transversal.  
\* Nivel de utilidad para Planner Frontend: Medio.  
\* Motivo: aporta relaciones, navegación, privacidad, dependencias con Home/People/Geni y reglas de visibilidad. No aporta pantallas completas, diseño visual detallado, formularios, endpoints, vistas día/semana/mes ni flujos CRUD específicos de Planner.

\#\# 2\. Resumen útil para Planner Frontend

Este documento aporta principalmente una visión de Planner como parte de un ecosistema conectado, no como módulo aislado. La información más útil para el frontend ideal de Planner es:

\* Planner debe relacionarse con People/Persona para asignaciones y participantes.  
\* Tasks pueden vincularse con Responsabilidad, Goal, Subtareas, Comentarios, Adjuntos y Event.  
\* Events pueden vincularse con Personas, Presence y HomeCloud.  
\* Las relaciones entre entidades deben ser navegables desde la vista de detalle.  
\* La navegación debe evitar que el usuario vuelva manualmente al menú principal para seguir una intención.  
\* Home puede actuar como punto de entrada hacia tareas y eventos, pero no debe administrar Planner.  
\* La visibilidad de tareas, eventos y relaciones depende del rol y del ámbito de privacidad.  
\* Si una relación existe pero el usuario no puede verla, no debe mostrarse ni revelarse.  
\* Geni puede consultar, analizar, relacionar, recomendar y automatizar sobre Planner, pero respetando permisos.  
\* Las sugerencias de Geni deben ser optativas y nunca imponer relaciones automáticas.  
\* Responsabilidad aparece como agrupador operativo útil para tareas.  
\* Goals, subtareas, comentarios, adjuntos, automatizaciones reales e integraciones avanzadas quedan como referencia futura o POST-MVP.

\#\# 3\. Principios de producto aplicables

\#\#\# Ecosistema conectado

\* HomePlus no está diseñado como conjunto de apps aisladas.  
\* Cada dominio opera sobre entidades que pueden vincularse naturalmente con otros dominios.  
\* Planner debe entenderse como parte del ecosistema junto a People, Finance, Presence, Inventory, Assets, HomeCloud y SOS.  
\* Una misma entidad puede aparecer referenciada desde múltiples módulos sin duplicarse ni desincronizarse.

Aplicación a Planner Frontend:

\* Una tarea no debería ser una card aislada sin contexto.  
\* Una tarea puede mostrar responsable, responsabilidad y evento relacionado si existen y son visibles.  
\* Un evento puede mostrar personas participantes y relaciones visibles si existen.  
\* El detalle de una tarea o evento debe priorizar conexiones útiles para completar la intención del usuario.

\#\#\# Coordinación sin acceso indiscriminado

\* La coordinación no autoriza acceso indiscriminado.  
\* Las relaciones existen, pero están gobernadas por reglas de privacidad.  
\* Planner debe mostrar relaciones solo si el rol del usuario tiene visibilidad sobre cada entidad relacionada.

Aplicación a Planner Frontend:

\* Si una tarea tiene relación con una entidad privada no visible, esa entidad no debe aparecer.  
\* No debe mostrarse un mensaje del tipo “hay información que no podés ver”.  
\* La UI debe omitir silenciosamente relaciones no autorizadas.

\#\#\# Navegación contextual

\* El usuario no debería necesitar recordar dónde estaba ni volver al menú principal para seguir relaciones entre entidades.  
\* Las entidades relacionadas deben exponerse como enlaces navegables en sus vistas de detalle.  
\* Si el usuario navega A → B → C y desde C existe enlace a A, el sistema debe reutilizar la instancia existente en el stack y no duplicarla.

Aplicación a Planner Frontend:

\* Task Detail puede enlazar a Event Detail si la tarea pertenece a un evento.  
\* Event Detail puede enlazar a personas participantes si son visibles.  
\* El botón back debe volver un nivel real.  
\* No duplicar pantallas iguales en el stack.

\#\#\# Geni como asistencia, no decisión automática

\* Geni puede sugerir conexiones o acciones.  
\* El usuario confirma o descarta.  
\* Geni nunca impone relaciones automáticas sin consentimiento.  
\* Geni nunca crea automatizaciones permanentes sin aprobación explícita.

Aplicación a Planner Frontend:

\* Una sugerencia tipo “¿Querés agrupar estas tareas con este evento?” debe ser optativa.  
\* Cualquier card inteligente debe tener acción humana explícita.  
\* Geni real queda fuera del MVP actual; puede inspirar copy o cards mock.

\#\#\# Privacidad por ámbito

\* Las entidades pueden ser familiares o privadas.  
\* Las entidades familiares son visibles para miembros del hogar según rol.  
\* Las privadas son visibles solo para el propietario.  
\* Una entidad privada puede estar referenciada desde una familiar, pero su contenido solo es visible para su propietario.

Aplicación a Planner Frontend:

\* Una tarea familiar puede verse según permisos.  
\* Una meta personal relacionada a una tarea no debe mostrarse a terceros si es privada.  
\* Una relación Task → Goal debe tratarse con cuidado y quedar POST-MVP para el MVP actual.

\#\# 4\. UX/UI aplicable

\#\#\# Navegación entre entidades

Información explícita o claramente presente:

\* Toda entidad relacionada debe exponer esa relación como enlace navegable en su vista de detalle.  
\* Si una Tarea pertenece a un Evento, el detalle de la Tarea muestra el Evento.  
\* Si un Documento está vinculado a un Asset, el detalle del Documento muestra el Asset.  
\* El principio aplica a Planner cuando una Task se vincula con Event.  
\* El stack de navegación debe evitar ciclos infinitos.  
\* El botón back del sistema operativo debe retroceder un nivel real.

Aplicación directa a Planner Frontend:

\* \`Task Detail\` puede incluir una sección “Relacionado con” si hay evento visible.  
\* \`Event Detail\` puede incluir personas relacionadas si hay visibilidad.  
\* Cards de Home que abren tareas/eventos deben llevar al módulo dueño.  
\* La navegación desde Home hacia Planner debe mantener el hilo de intención.

\#\#\# Home como resumen y entrada contextual

Información encontrada:

\* Home aparece como centro operativo del hogar en el archivo de comprensión.  
\* Home contiene o puede contener Briefing, Atención Requerida, Próximos Eventos, TareasHome, Carga Familiar, PresenceResumido y ActividadFamiliar.  
\* Home resume información y conduce al módulo que administra.  
\* Tarea completada en Planner actualiza widget de tareas en Home según archivo de comprensión/source map.  
\* PróximosEventos y TareasHome son widgets relacionados con Planner.

Aplicación directa:

\* Home puede mostrar tareas pendientes y eventos próximos.  
\* Al tocar tarea/evento en Home, el usuario debe ir a Planner.  
\* Home no debe reemplazar Task List, Calendar ni Event Detail.

\#\#\# Jerarquía visual indirecta

El documento no define colores, sombras, bordes, tipografías, chips ni layout visual exacto.

Patrones inferibles sin inventar diseño:

\* Las relaciones deben aparecer visibles como enlaces o secciones navegables.  
\* Las relaciones no visibles por permisos no deben aparecer.  
\* La UI debe privilegiar continuidad de intención sobre navegación por menú.  
\* Cards/list items de Planner deberían contener suficiente contexto para decidir sin abrir diez pantallas: tarea, responsable, responsabilidad, fecha/evento relacionado si aparece.

\#\#\# Estados UX

Estados explícitos o derivados de reglas de privacidad/navegación:

\* Relación visible: mostrar enlace navegable.  
\* Relación no visible por privacidad: omitir sin indicar que existe.  
\* Navegación circular: reutilizar instancia existente en stack.  
\* Cambio en Planner que afecta Home: Home debe reflejar resumen actualizado cuando corresponda.  
\* Sugerencia de Geni: usuario confirma o descarta.  
\* Automatización permanente sugerida por Geni: requiere aprobación explícita.

No se encontraron:

\* loading states;  
\* skeletons;  
\* toasts;  
\* success states;  
\* error states;  
\* empty states específicos de Planner;  
\* formularios;  
\* validaciones visuales;  
\* copy exacto para errores.

\#\# 5\. Información directa sobre Planner

\#\#\# Planner como dominio del ecosistema

El documento menciona Planner como dominio conectado con People, Finance, Presence, Inventory, Assets, HomeCloud, SOS y Geni.

\#\#\# Relaciones explícitas de Planner

Desde el documento principal:

\* Task ↔ Persona.  
\* Task ↔ Responsabilidad.  
\* Task ↔ Goal.  
\* Task ↔ Subtareas.  
\* Task ↔ Comentarios.  
\* Task ↔ Adjuntos.  
\* Task ↔ Event.  
\* Goal ↔ Hitos.  
\* Goal ↔ Tasks.  
\* Goal ↔ Fondos.  
\* Goal ↔ Finance.  
\* Event ↔ Personas.  
\* Event ↔ Presence.  
\* Event ↔ HomeCloud.

\#\#\# Planner en ejemplos concretos

Ejemplo de ecosistema conectado:

\* Persona “Mamá”, rol Adulto.  
\* Tarea: “Comprar alimento para perro”.  
\* Responsabilidad: Mascotas.  
\* Asset: Perro “Toby”.  
\* Documento: Carnet de vacunación.  
\* Gasto: alimento balanceado.  
\* Evento: “Visita al veterinario — sábado 11:00”.

Uso para Planner Frontend:

\* La tarea puede mostrar responsabilidad “Mascotas”.  
\* Un evento puede mostrar fecha/hora textual.  
\* Una relación Task ↔ Event puede mejorar navegación.  
\* Relaciones con Asset, Documento, Gasto quedan como dependencia externa / no desarrollar en este fragment.

\#\#\# Planner y Geni

Geni puede:

\* consultar tareas pendientes;  
\* analizar patrones de tareas;  
\* sugerir conexiones entre tareas y eventos;  
\* recomendar crear tareas desde otros dominios;  
\* sugerir automatizaciones que crean tareas.

Para MVP actual:

\* Geni real no debe implementarse.  
\* Sus ejemplos pueden inspirar cards mock o mensajes de ayuda si otro documento lo permite.  
\* Cualquier acción sugerida debe ser confirmada por el usuario.

\#\# 6\. Información sobre Tasks

\#\#\# MVP actual

Información aplicable al MVP visual/interactivo:

\* Task representa trabajo pendiente o realizado según archivo de comprensión.  
\* Task se relaciona con Persona.  
\* Task se relaciona con Responsabilidad.  
\* Task puede relacionarse con Event.  
\* Una tarea puede pertenecer a una responsabilidad.  
\* Responsabilidad agrupa áreas operativas del hogar.  
\* Ejemplos de Responsabilidad:

  \* Mascotas.  
\* Ejemplo de Task:

  \* “Comprar alimento para perro”.  
\* Ejemplo de pregunta de Geni:

  \* “¿Qué tareas pendientes tiene Mateo esta semana?”  
\* Geni puede analizar:

  \* “Mateo completó todas sus tareas escolares 5 días seguidos”.  
\* Geni puede sugerir:

  \* “Detecté 3 tareas relacionadas con el evento 'Cumpleaños de Gaby'. ¿Querés agruparlas?”  
\* Geni puede recomendar:

  \* “El stock de leche está bajo. ¿Creo una tarea de compras?”  
  \* “Hace 6 meses que no se hace el service del auto. ¿Agendo un recordatorio?”  
\* Inventory puede disparar una tarea de compra.  
\* Assets/Mantenimiento puede generar tareas de mantenimiento.  
\* Estas integraciones externas son dependencia externa / no desarrollar en este fragment.

Aplicación a frontend:

\* Task List puede agrupar por Responsabilidad.  
\* Task Card puede mostrar:

  \* título;  
  \* responsable/persona si aparece;  
  \* responsabilidad;  
  \* relación con evento si existe y es visible.  
\* Task Detail puede mostrar enlaces navegables a relaciones visibles.  
\* Completar o consultar tareas debe respetar visibilidad por rol/ámbito.  
\* Las tareas familiares son visibles según rol.  
\* Las tareas propias pueden tener reglas especiales por rol según tabla de visibilidad.

\#\#\# POST-MVP / futuro

Marcar como POST-MVP:

\* Task ↔ Goal.  
\* Task ↔ Subtareas.  
\* Task ↔ Comentarios.  
\* Task ↔ Adjuntos.  
\* Dependencias entre tasks.  
\* Streaks/análisis “5 días seguidos”.  
\* Geni real analizando tareas.  
\* Geni real creando automatizaciones.  
\* Inventory creando tareas automáticamente.  
\* Assets creando tareas automáticamente.  
\* Agrupación inteligente de tareas con eventos por Geni.  
\* Automatizaciones permanentes.  
\* Tareas vinculadas con documentos, gastos, assets o HomeCloud.  
\* Templates editables o como entidad avanzada si se interpreta \`PlantillaTarea\`.

\#\#\# Dudas o decisiones abiertas

El documento no define:

\* campos técnicos de Task;  
\* estado MVP de Task;  
\* prioridad;  
\* fecha límite;  
\* fecha de vencimiento;  
\* \`requires\_verification\`;  
\* flujo de verificación;  
\* templates predefinidas del MVP;  
\* vista de listado;  
\* tabs de tareas;  
\* filtros;  
\* empty states;  
\* toasts;  
\* formularios;  
\* permisos completos por acción;  
\* endpoints;  
\* request/response;  
\* comportamiento de edición/eliminación;  
\* si Task Card debe mostrar avatar, iniciales, chip o badge.

\#\# 7\. Información sobre Calendar / Events

\#\#\# MVP actual

Información encontrada aplicable:

\* Event se relaciona con Personas.  
\* Event se relaciona con Presence.  
\* Event se relaciona con HomeCloud.  
\* Task puede vincularse con Event.  
\* Ejemplo de Event:

  \* “Visita al veterinario — sábado 11:00”.  
\* Ejemplo de navegación cross-domain:

  \* Home → Tarea “Preparar comida para el asado” → Evento “Asado del sábado 13:00” → Documento “Lista de compras” → Gasto “$150 — Carnicería”.  
\* Si una Tarea pertenece a un Evento, el detalle de la Tarea muestra el Evento.  
\* Geni puede detectar tareas relacionadas con un evento y sugerir agruparlas.  
\* Event puede tener documentación relacionada, pero queda como dependencia externa.

Aplicación a frontend:

\* Calendar/Event List puede mostrar eventos próximos.  
\* Event Card puede mostrar título, fecha/hora textual y personas si son visibles.  
\* Task Detail debe poder enlazar al evento relacionado.  
\* Event Detail puede enlazar a personas relacionadas si el rol tiene visibilidad.  
\* Home puede mostrar próximos eventos y navegar al detalle/listado correspondiente.

\#\#\# POST-MVP / futuro

Marcar como POST-MVP:

\* Event ↔ Presence real.  
\* Event ↔ HomeCloud real.  
\* Documentos asociados a eventos.  
\* Álbum automático desde evento.  
\* Geni relacionando eventos con documentos.  
\* Geni agrupando tareas de un evento.  
\* Participantes avanzados de eventos.  
\* Estados RSVP como accepted/declined/maybe si aparecen en otros documentos, pero aquí no se definen.  
\* Recurrencia compleja.  
\* RRULE/EXDATE.  
\* Reglas avanzadas de calendario.

\#\#\# Dudas o decisiones abiertas

El documento no define:

\* vistas día/semana/mes;  
\* layout de calendario;  
\* agenda;  
\* campos técnicos del evento;  
\* estado del evento para MVP;  
\* recurrencia simple;  
\* editar/cancelar/eliminar evento;  
\* formulario de evento;  
\* filtros;  
\* empty state;  
\* loading/error states;  
\* permisos por acción;  
\* endpoints;  
\* request/response;  
\* cómo mostrar tareas con fecha en calendario.

\#\# 8\. Información sobre Goals

\#\#\# Referencia visual o futura

Información encontrada:

\* Goal se relaciona con Finance.  
\* Goal se relaciona con Tasks.  
\* Goal se relaciona con Fondos.  
\* Goal tiene Hitos.  
\* Una Meta puede relacionarse con tareas que avanzan hitos de la meta.  
\* Meta personal puede relacionarse con tareas.  
\* La visibilidad de Meta personal → Tareas es “solo el dueño” según la tabla de visibilidad.

Aplicación posible al frontend futuro:

\* Una tarea podría mostrar que contribuye a una meta solo si el usuario es dueño o tiene permiso.  
\* Una vista futura de Goals podría mostrar progreso por hitos y tareas.  
\* Planner podría incluir Goals como tab futura, pero este documento no define UI.

\#\#\# Fuera del MVP actual

Goals debe quedar fuera del MVP actual del Planner si el objetivo es Tasks/Events/Calendar.

Marcar como POST-MVP:

\* Goal.  
\* Hitos.  
\* Goal → Tasks.  
\* Goal → Fondos.  
\* Goal → Finance.  
\* Metas privadas y visibilidad avanzada.  
\* Streaks o análisis de progreso.

\#\# 9\. Responsabilidades, templates y categorías

\#\#\# Responsabilidades

Información encontrada:

\* Responsabilidad agrupa áreas operativas del hogar.  
\* Una Responsabilidad puede relacionarse con:

  \* Tareas;  
  \* Gastos;  
  \* Inventory;  
  \* Automatizaciones.  
\* Relación principal: una tarea pertenece a una única responsabilidad.  
\* Ejemplo: Responsabilidad “Mascotas” agrupa tareas como alimentar/pasear, gastos como alimento/veterinario y se vincula al Asset “Perro (Toby)”.

Aplicación a Planner Frontend:

\* Responsabilidad puede funcionar como agrupador visual de tareas.  
\* Task List puede agrupar por Responsabilidad.  
\* Task Card puede mostrar chip/label de Responsabilidad si existe.  
\* Responsabilidad ayuda a evitar listas planas sin contexto familiar.  
\* “Mascotas” es ejemplo explícito de responsabilidad/categoría operativa.

\#\#\# Templates

Información encontrada:

\* El archivo de comprensión menciona \`PlantillaTarea\`.  
\* El documento principal no define templates predefinidas.  
\* No se definen templates como:

  \* Limpieza;  
  \* Compras;  
  \* Mascotas;  
  \* Medicación;  
  \* Estudios;  
  \* Pagos.  
\* No se define si templates son constantes, editables, tabla o endpoints.

Clasificación:

\* \`PlantillaTarea\` como entidad queda referencia futura / POST-MVP si implica CRUD o tabla.  
\* Para el MVP actual, este documento no alcanza para especificar templates.

\#\#\# Categorías

Información encontrada:

\* No aparece un modelo separado de “Categoría” para Planner.  
\* Responsabilidad cumple parcialmente el rol de agrupador operativo.  
\* Inventory Item sí se relaciona con Categoría, pero eso pertenece a otro módulo y no debe desarrollarse aquí.

Aplicación:

\* No duplicar “categoría” desde este documento si ya se usa Responsabilidad como agrupador.  
\* La decisión final entre Responsabilidad, Template y Categoría queda abierta.

\#\# 10\. Quick Actions aplicables a Planner

Información directa encontrada:

\* El documento principal no define Quick Actions.  
\* El archivo de comprensión/source map registra QuickActions como feature de navegación.  
\* Geni aparece como capa transversal y puede proponer acciones relacionadas con Planner.  
\* Geni puede sugerir crear una tarea de compra.  
\* Geni puede sugerir agendar un recordatorio.  
\* Geni puede sugerir automatizaciones.

Aplicación a Planner Frontend:

\* Quick Actions puede ser una entrada futura para crear tarea/evento si otro documento lo confirma.  
\* Desde este documento, solo puede extraerse como idea relacionada con Geni y acciones sugeridas.  
\* No hay botón explícito “Crear tarea” o “Crear evento” definido en este documento.  
\* No inventar menú de Quick Actions desde esta fuente.

POST-MVP:

\* Geni real en Quick Actions.  
\* Automatizaciones desde Quick Actions.  
\* Creación automática por Inventory/Assets.  
\* Sugerencias inteligentes reales.

\#\# 11\. Home relacionado con Planner

\#\#\# Tareas en Home

Información encontrada:

\* Home puede contener \`TareasHome\`.  
\* \`TareasHome\` muestra tareas agrupadas por responsabilidad según archivo de comprensión/source map.  
\* Tarea completada en Planner actualiza Home.  
\* Home resume, no administra.  
\* Toda información mostrada debe conducir al módulo que administra.

Aplicación:

\* Home puede mostrar tareas pendientes.  
\* Al tocar una tarea, ir a Planner/Task Detail.  
\* Si una tarea se completa en Planner, Home debe reflejar el cambio.  
\* Home no debe contener flujo completo de edición de tareas.

\#\#\# Eventos en Home

Información encontrada:

\* Home puede contener \`ProximosEventos\`.  
\* Event aparece como entidad relacionada con Planner/Calendar.  
\* Home puede resumir próximos eventos y conducir al módulo correspondiente.

Aplicación:

\* Home puede mostrar eventos próximos.  
\* Al tocar evento, navegar a Planner/Calendar/Event Detail.  
\* Home no debe administrar eventos.

\#\#\# Atención requerida

Información encontrada:

\* \`AtencionRequerida\` puede centralizar tareas vencidas, pagos vencidos y SOS.  
\* Para Planner, solo aplicar a tareas/eventos si corresponde.  
\* SOS/Finance quedan fuera de este fragment.

Aplicación:

\* Atención Requerida puede mostrar tareas vencidas si otro documento define vencimiento.  
\* No desarrollar pagos vencidos, SOS o Finance desde este fragment.

\#\#\# Briefing

Información encontrada:

\* Geni genera Briefing diario hacia Home.  
\* Briefing puede incluir tareas, eventos, finanzas, presencia y alertas según comprensión.  
\* Geni real debe respetar permisos y ámbitos.

Aplicación MVP:

\* Briefing relacionado con Planner puede quedar como mock o texto simple si se implementa Home.  
\* No implementar IA real.  
\* No mostrar datos privados no autorizados.

\#\#\# Carga Familiar

Información encontrada:

\* CargaFamiliar aparece como widget de Home.  
\* Se relaciona con distribución de carga entre miembros.  
\* Visible solo para Coordinador según archivo de comprensión/source map.

Aplicación:

\* Para Planner, puede inspirar visualización futura de tareas por persona.  
\* Para MVP actual, tratar como mock si aparece.  
\* No implementar análisis real de carga.

\#\# 12\. Patrones visuales reutilizables

\#\#\# Aplicable ahora a Planner

No hay capturas ni diseño visual explícito en este documento.

Patrones funcionales visualizables:

\* Cards/list items con relaciones visibles.  
\* Detalle de entidad con enlaces a relaciones.  
\* Sección “Responsabilidad” en Task Card/Task Detail.  
\* Sección “Responsable” si la Persona es visible.  
\* Sección “Evento relacionado” si existe y es visible.  
\* Home cards de tareas/eventos que navegan al módulo dueño.  
\* Ocultar relaciones privadas sin mensaje.  
\* Evitar stack duplicado en navegación.

\#\#\# Referencia visual para más adelante

\* Una navegación tipo grafo de relaciones podría reflejar la filosofía del ecosistema.  
\* Geni podría mostrar sugerencias como cards optativas.  
\* Responsabilidades podrían funcionar como grupos o chips visuales.  
\* Carga Familiar podría representarse como resumen visual de distribución de tareas.

\#\#\# No aplicable

\* No hay colores.  
\* No hay tipografía.  
\* No hay iconografía.  
\* No hay spacing.  
\* No hay estilo de botones.  
\* No hay sombras.  
\* No hay componentes específicos de mobile.  
\* No hay formularios definidos.

\#\# 13\. Reglas funcionales extraídas

\* Ningún módulo funciona completamente aislado.  
\* Planner debe conectarse con People/Persona mediante tareas y eventos.  
\* Task puede vincularse con Persona.  
\* Task puede vincularse con Responsabilidad.  
\* Task puede vincularse con Event.  
\* Event puede vincularse con Personas.  
\* Si una Task pertenece a un Event, el detalle de la Task muestra el Event.  
\* Toda entidad relacionada debe exponer esa relación como enlace navegable en su vista de detalle.  
\* La navegación entre entidades no debe obligar al usuario a volver al menú principal.  
\* El stack de navegación debe evitar ciclos infinitos reutilizando instancias existentes.  
\* El botón back debe retroceder un nivel real.  
\* La visibilidad de relaciones depende del rol y del ámbito de cada entidad.  
\* Si una relación existe pero no puede mostrarse por privacidad, se omite sin mencionar su existencia.  
\* Las relaciones familiares son informativas y no modifican permisos.  
\* Home resume información y conduce al módulo dueño.  
\* Home no administra tareas ni eventos.  
\* Geni puede sugerir relaciones o acciones, pero el usuario confirma o descarta.  
\* Geni no impone relaciones automáticas.  
\* Geni no crea automatizaciones permanentes sin aprobación explícita.  
\* Una entidad privada puede estar referenciada desde una entidad familiar, pero su contenido solo es visible para el propietario.  
\* No deben existir relaciones entre hogares.  
\* Planner debe operar dentro del contexto del hogar activo.  
\* No mostrar datos de otro hogar.  
\* Responsabilidad agrupa áreas operativas del hogar.  
\* Una tarea pertenece a una única responsabilidad según el archivo de comprensión/source map.  
\* Goals, subtareas, comentarios, adjuntos y automatizaciones son relaciones futuras/avanzadas para este MVP.

\#\# 14\. Ideas derivadas útiles

\* Propuesta UX derivada / requiere validación del usuario: mostrar en cada Task Card un chip de Responsabilidad para reforzar organización familiar.  
\* Propuesta UX derivada / requiere validación del usuario: mostrar en Task Detail una sección “Relacionado” con evento/persona/responsabilidad visible.  
\* Propuesta UX derivada / requiere validación del usuario: si una relación está oculta por permisos, simplemente no renderizar la sección para evitar confusión.  
\* Propuesta UX derivada / requiere validación del usuario: desde Home, las cards de tareas y eventos deberían abrir directamente Planner en la subvista correcta.  
\* Propuesta UX derivada / requiere validación del usuario: usar Responsabilidades como agrupación principal en Tasks antes que categorías separadas.  
\* Propuesta UX derivada / requiere validación del usuario: usar ejemplos de “Mascotas” y “Comprar alimento para perro” como seed data si se permite mock posterior.  
\* Propuesta UX derivada / requiere validación del usuario: permitir navegación Task → Event → back sin duplicar pantallas.  
\* Propuesta UX derivada / requiere validación del usuario: Geni mock podría mostrar sugerencias pasivas, pero no ejecutar acciones automáticas.

\#\# 15\. Decisiones que quedan abiertas

\* Qué pantallas exactas tendrá Planner.  
\* Si Planner tendrá tabs internas Tasks / Calendar / Goals.  
\* Cómo se diseña Task List.  
\* Cómo se diseña Calendar.  
\* Cómo se crea una tarea.  
\* Cómo se crea un evento.  
\* Si el MVP usará modal, bottom sheet o pantalla completa.  
\* Qué campos tendrá Task.  
\* Qué campos tendrá Event.  
\* Qué estados de Task se usarán en frontend.  
\* Qué estados de Event se usarán en frontend.  
\* Cómo se representa prioridad.  
\* Cómo se representa vencimiento.  
\* Cómo se representa verificación.  
\* Cómo se muestran tareas con fecha dentro del calendario.  
\* Si se implementan vistas día/semana/mes.  
\* Qué templates predefinidas se usan.  
\* Si “Responsabilidad” reemplaza o convive con “Categoría”.  
\* Qué permisos exactos tiene cada rol sobre crear/editar/completar/verificar tareas.  
\* Qué acciones aparecen en Quick Actions.  
\* Qué parte de Home consume datos reales de Planner.  
\* Qué parte de Home queda mock.  
\* Qué feedback inmediato se usa al completar tareas o crear eventos.  
\* Qué errores se muestran.  
\* Qué empty states se muestran.

\#\# 16\. Qué NO debe entrar al MVP actual

Desde este documento, conviene dejar fuera por ahora:

\* Geni real.  
\* Automatizaciones reales.  
\* Automatizaciones permanentes.  
\* Inventory creando tareas automáticamente.  
\* Assets creando tareas automáticamente.  
\* Presence real asociado a eventos.  
\* HomeCloud real asociado a eventos.  
\* Documentos asociados a eventos.  
\* Finance asociado a responsabilidades/tareas.  
\* Goals.  
\* Hitos.  
\* Fondos.  
\* Goal ↔ Finance.  
\* Subtareas.  
\* Comentarios.  
\* Adjuntos.  
\* Dependencias entre tareas.  
\* Análisis de streaks como “5 días seguidos”.  
\* Agrupación automática de tareas con eventos por IA.  
\* Recomendaciones inteligentes reales.  
\* Search global.  
\* Navegación hacia Finance, Inventory, Assets, HomeCloud o SOS desde Planner en MVP.  
\* Multi-hogar avanzado.  
\* Relaciones entre hogares.  
\* Permisos finos avanzados no definidos.

\#\# 17\. Extractos o referencias internas importantes

Referencias internas del documento principal:

\* \`\# 5\. Filosofía de Relaciones del Ecosistema\`.  
\* \`\#\# 5.1 El ecosistema como red de entidades\`.  
\* \`\#\# 5.2 Entidades transversales\`.  
\* \`\#\#\# 5.2.1 Persona\`.  
\* \`\#\#\# 5.2.2 Responsabilidad\`.  
\* \`\#\#\# 5.2.3 Goal\`.  
\* \`\#\# 5.3 Geni como capa de conexión transversal\`.  
\* \`\#\#\# 5.3.1 Consultar\`.  
\* \`\#\#\# 5.3.2 Analizar\`.  
\* \`\#\#\# 5.3.3 Relacionar\`.  
\* \`\#\#\# 5.3.4 Recomendar\`.  
\* \`\#\#\# 5.3.5 Automatizar\`.  
\* \`\#\# 5.4 Reglas de navegación entre dominios\`.  
\* \`\#\#\# 5.4.1 Principio de no volver atrás\`.  
\* \`\#\#\# 5.4.2 Regla de implementación\`.  
\* \`\#\#\# 5.4.3 Evitar ciclos infinitos\`.  
\* \`\#\# 5.5 Límites de privacidad en las relaciones entre módulos\`.  
\* \`\#\#\# 5.5.1 Principio de privacidad individual\`.  
\* \`\#\#\# 5.5.2 Ámbitos de visibilidad\`.  
\* \`\#\#\# 5.5.3 Comportamiento de Geni ante entidades privadas\`.  
\* \`\#\#\# 5.5.4 Tabla de visibilidad por rol en relaciones cruzadas\`.  
\* \`\#\# 5.6 Patrones oficiales de integración entre dominios\`.  
\* \`\#\#\# 5.6.1 People ↔ ecosistema\`.  
\* \`\#\#\# 5.6.2 Planner ↔ ecosistema\`.  
\* \`\#\# 5.7 Relaciones familiares: informativas, no permisivas\`.  
\* \`\#\# 5.8 Multi-Hogar y aislamiento entre hogares\`.

Referencias del archivo de comprensión asociado:

\* \`OUTPUT 1 — ENTITIES\`: Planner, Task, Responsabilidad, Calendar, Event, Goal, Hito, Subtarea, Comentario, Adjunto, PlantillaTarea, Timeline, Verificacion, Home, Briefing, AtencionRequerida, CargaFamiliar, ProximosEventos, TareasHome.  
\* \`OUTPUT 2 — RELATIONSHIPS\`: Task assigned\_to Persona, Task belongs\_to Responsabilidad, Task links\_to Event, Event has\_participant Persona, Home contains Briefing, Home contains AtencionRequerida.  
\* \`OUTPUT 3 — CROSS DOMAIN RELATIONSHIPS\`: Task assigned\_to Persona, Task links\_to Event, Goal funded\_by Fondo, Event has\_location Lugar, Inventory triggers Task, Assets/Mantenimiento generates Task.  
\* \`OUTPUT 4 — DATA FLOWS\`: Planner → Home por tarea completada, Geni → Home por Briefing diario.  
\* Source map previo: secciones \`4.7 PLANNER\`, \`4.8 TASKS\`, \`4.9 EVENTS\`, \`4.10 CALENDAR\`, \`4.11 HOME\`.

Citas de referencia de los archivos usados:   

\#\# 18\. Conclusión operativa

Este documento aporta una base conceptual útil para que el frontend ideal de Planner no sea una lista aislada de tareas, sino una experiencia conectada con personas, responsabilidades, eventos y Home.

Partes que deben usarse en la spec final:

\* Planner como módulo conectado.  
\* Task ↔ Persona.  
\* Task ↔ Responsabilidad.  
\* Task ↔ Event.  
\* Event ↔ Personas.  
\* Responsabilidad como agrupador operativo.  
\* Home resume tareas/eventos y navega a Planner.  
\* Navegación contextual entre entidades relacionadas.  
\* Regla de no duplicar stack ni crear ciclos.  
\* Privacidad por rol y ámbito.  
\* Ocultar relaciones no visibles sin revelar su existencia.  
\* Geni como inspiración futura, no como IA real MVP.  
\* Relaciones externas como futuras/dependencias, no como alcance actual.

Partes que deben ignorarse por ahora:

\* Finance real.  
\* Inventory real.  
\* Assets real.  
\* HomeCloud real.  
\* Presence real.  
\* SOS real.  
\* Geni IA avanzada.  
\* Automatizaciones reales.  
\* Goals avanzados.  
\* Subtareas, comentarios, adjuntos y dependencias.  
\* Multi-hogar avanzado.

El documento no alcanza para definir el frontend final de Planner por sí solo. Debe combinarse después con documentos de diseño visual, UX/UI, FinalSpec de Planner, contratos API y fragmentos de Home para cerrar pantallas, componentes, estados UX, formularios, acciones y datos del MVP.

\# planner\_frontend\_fragment\_ux\_philosophy

\#\# 1\. Fuente

\* Documento: \`HomePlus — SECCION 6 UX PHILOSOPHY.md\`  
\* Archivo de comprensión asociado: \`Seccion 6 filosofia ux.txt\`  
\* Tipo de documento: Filosofía UX / interacción mobile-first \+ extracción estructurada tipo knowledge graph.  
\* Alcance del documento: Mobile-first absoluto. Filosofía de interacción, arquitectura de pantalla, navegación, adaptación por rol, accesibilidad, decisiones UX y entidades/relaciones del sistema.  
\* Nivel de utilidad para Planner Frontend: Alto.

\#\# 2\. Resumen útil para Planner Frontend

Este documento aporta reglas directas para construir un Planner rápido, claro y usable. Define que Planner vive en Bottom Nav, agrupa Tasks, Calendar y Goals, y que las responsabilidades no son un dominio independiente sino una propiedad/eje organizador dentro de Tasks. También define reglas de interacción críticas: completar una tarea debe ser 1-tap desde el list item; Calendar debe mostrar el evento del día como primer item expandido; crear/editar debe usar bottom sheet; las listas deben tener scroll vertical; los filtros se expresan con chips; y la acción principal debe vivir en zona de pulgar.

El documento también aporta entidades y relaciones útiles: Task, TaskRecurrence, Subtask, TaskComment, TaskAttachment, TaskTimeline, TaskVerification, TaskTemplate, Responsibility, Calendar, Event, Goal y Milestone. Varias de estas entidades son útiles para diseñar el frontend ideal, pero algunas deben marcarse como POST-MVP para el alcance actual.

\#\# 3\. Principios de producto aplicables

\* La complejidad del hogar debe resolverse mediante diseño y automatización, no trasladando configuraciones complejas al usuario.  
\* Cada interacción debe seguir cinco principios: 1-tap, feedback inmediato, previsibilidad, perdón y progressive disclosure.  
\* La acción principal de cada pantalla debe ejecutarse con un solo toque.  
\* Si el usuario necesita más de un toque para completar la acción más frecuente de una pantalla, el diseño debe rehacerse.  
\* Toda acción debe recibir respuesta en menos de 100ms. Si tarda más, la UI debe acusar recibo antes y resolver después.  
\* El mismo patrón de interacción debe producir el mismo resultado en toda la aplicación.  
\* Las acciones con consecuencia significativa deben ser reversibles o tener confirmación explícita.  
\* La complejidad debe revelarse solo cuando el usuario la necesita.  
\* Lo que no se usa en el 80% de los casos no debe ocupar espacio en la interfaz principal.  
\* Los defaults deben cubrir el caso de uso del 95%.  
\* La complejidad interna no debe reflejarse en la interfaz.  
\* El hogar no debe sentirse como una oficina: el diseño debe transmitir calma, arraigo y calidez.  
\* El diseño debe ser mobile-first. La accesibilidad del pulgar define la ubicación de acciones frecuentes.  
\* La aplicación debe aprenderse usándose; el onboarding no debe depender de tutoriales extensos.  
\* Los empty states pueden funcionar como guía de uso.  
\* La densidad de información se adapta por rol reduciendo elementos, no achicando fuentes.  
\* Nunca se debe bajar de 14px para body en ningún rol.  
\* El usuario que aprendió a usar Tasks debe poder usar Events sin reaprender patrones.

\#\# 4\. UX/UI aplicable

\#\#\# Arquitectura de pantalla

Toda pantalla sigue una jerarquía universal de cuatro capas:

1\. \*\*Capa 1 — Atención\*\*

   \* Responde qué necesita saber el usuario ya.  
   \* Puede contener briefing, alerta o reconocimiento.  
   \* Máximo 2 elementos.  
   \* Tiempo de lectura menor a 3 segundos.  
   \* Siempre visible sin scroll.

2\. \*\*Capa 2 — Acción\*\*

   \* Responde qué puede hacer el usuario ahora.  
   \* Acción principal \+ acciones rápidas.  
   \* Máximo 3 acciones visibles.  
   \* La acción principal va en zona de pulgar si es frecuente.

3\. \*\*Capa 3 — Contexto\*\*

   \* Lista de items, métricas o estado.  
   \* Scroll vertical si excede pantalla.  
   \* Agrupado por relevancia, no por cronología rígida.

4\. \*\*Capa 4 — Exploración\*\*

   \* Navegación a otros dominios, Bottom Nav y enlaces cruzados.  
   \* Nunca debe competir con Capa 1 o Capa 2\.

\#\#\# Aplicación directa a Planner

Para \*\*Tasks (Planner)\*\*:

\* Capa 1: chip de filtro activo \+ contador de pendientes.  
\* Capa 2: checkbox en primer item.  
\* Capa 3: lista de tareas agrupadas por Responsabilidad.  
\* Capa 4: Bottom Nav y enlace a Eventos/Goals relacionados.

Para \*\*Calendar (Planner)\*\*:

\* Capa 1: próximo evento en card expandida.  
\* Capa 2: ver detalle / confirmar asistencia.  
\* Capa 3: timeline del día/semana.  
\* Capa 4: Bottom Nav y enlace a Tasks vinculadas.

\#\#\# Zonas de pantalla

\* Zona superior: título, navegación básica, back, briefing diario, indicadores de estado. Nunca debe contener la acción principal.  
\* Zona media: contenido scrolleable principal, listas, cards, filtros/chips horizontales, métricas y resúmenes.  
\* Zona de pulgar: acción principal, botón \`+\` flotante, confirmaciones rápidas y Bottom Nav.  
\* Si una acción se usa más de 5 veces al día, va en zona de pulgar.  
\* Si una acción se usa 1–2 veces al día, puede ir en zona media.  
\* Si una acción se usa menos de una vez por semana, puede ir en zona superior o navegación secundaria.  
\* El botón \`+\` flotante siempre está en la esquina inferior derecha.

\#\#\# Scroll

\* Las listas de items, incluyendo Tasks y Events, usan scroll vertical infinito con paginación.  
\* El formulario de creación/edición puede tener scroll vertical, pero guardar/cancelar deben quedar fijos en zona inferior.  
\* El detalle de item puede tener scroll vertical, con acciones frecuentes fijas abajo.  
\* Si una pantalla requiere scroll para ver la acción principal, el diseño está mal.  
\* Nunca usar scroll horizontal para contenido de lectura.  
\* El scroll horizontal solo aplica a chips de filtro o galerías.  
\* El scroll infinito siempre tiene indicador de carga al final.

\#\#\# Transiciones

\* Home → dominio: stack push, slide right → left, 250ms ease-out.  
\* Dominio → detalle: stack push, slide right → left, 250ms ease-out.  
\* Detalle → configuración avanzada: stack push, slide right → left, 250ms ease-out.  
\* Cualquier nivel → crear/editar: bottom sheet, slide up \+ fade, 300ms ease-out.  
\* Cualquier nivel → confirmación: modal centrado, scale 0.95 → 1 \+ fade, 250ms ease-out.  
\* Back: stack pop, slide left → right, 200ms ease-in.  
\* Quick Actions: panel flotante \+ blur, fade in \+ slide up, 200ms ease-out.

\#\#\# Formularios y acciones

\* Crear/editar debe usar bottom sheet cuando la acción es contextual y no requiere pantalla completa.  
\* Pantalla completa solo cuando el contenido lo exige.  
\* Modal centrado solo para confirmaciones.  
\* Nunca usar modal para navegación entre niveles.  
\* X en esquina superior: cerrar sin guardar, con confirmación si hay cambios.  
\* Check en esquina superior: guardar y cerrar.  
\* Cerrar formulario con cambios requiere bottom sheet: “Tenés cambios sin guardar. ¿Salir?”  
\* Guardar formulario: botón muestra spinner y mantiene ancho.  
\* El resultado de guardar debe mostrar toast success o error.  
\* Los spinners solo aparecen si la operación excede 300ms.

\#\#\# Feedback visual/háptico

\* Tap en botón: escala 0.97 → 1.0 \+ háptico ligero.  
\* Completar tarea: checkbox se rellena \+ háptico \+ tachado.  
\* Completar tarea puede tener toast de confirmación opcional y no bloqueante.  
\* Crear tarea/evento: el item aparece en la lista con opacidad 0 → 1\.  
\* Sincronización: indicador sutil en status bar, desaparece al completar.  
\* Error de red: toast informativo inmediato.  
\* Ninguna acción queda sin respuesta visual o háptica.  
\* Botones siempre responden al press aunque la acción falle después.  
\* Feedback háptico sutil: \`light\` en iOS, \`clockTick\` en Android.  
\* No usar haptic \`heavy\` ni \`warning\` fuera de SOS.

\#\#\# Accesibilidad

\* Botón completar tarea:

  \* \`accessibilityLabel\`: “Completar \[nombre de tarea\]”  
  \* \`accessibilityHint\`: “Marca la tarea como completada”  
\* Botón \`+\` flotante:

  \* \`accessibilityLabel\`: “Crear \[tarea/evento/gasto\]”  
\* Badge de alerta:

  \* \`accessibilityLabel\`: “\[N\] tareas pendientes”  
\* Tab de bottom nav:

  \* \`accessibilityLabel\`: “\[Nombre del tab\], \[N\] pendientes” si aplica.  
\* Avatar de miembro:

  \* \`accessibilityLabel\`: “\[Nombre\], \[rol\]”  
  \* \`accessibilityHint\`: “Toca para ver perfil”  
\* Chip de filtro activo:

  \* \`accessibilityLabel\`: “\[Filtro\], seleccionado”  
\* Chip de filtro inactivo:

  \* \`accessibilityLabel\`: “\[Filtro\]”  
  \* \`accessibilityHint\`: “Toca para filtrar por \[filtro\]”  
\* Botón \`+\` central de Quick Actions:

  \* \`accessibilityLabel\`: “Acciones rápidas”  
  \* \`accessibilityHint\`: “Abre el panel de acciones rápidas”

\#\# 5\. Información directa sobre Planner

\* Planner es un tab de Bottom Nav.  
\* Bottom Nav oficial: \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\`.  
\* Planner usa ícono 📋.  
\* Planner agrupa Tasks, Calendar y Goals.  
\* Planner es visible para todos.  
\* Planner es un dominio de Nivel 2 dentro del modelo de navegación.  
\* Tasks, Calendar y Goals son subdominios dentro de Planner.  
\* Responsabilidades no son dominio independiente; son propiedad de la tarea y eje organizador dentro de Tasks.  
\* Planner se describe en el archivo de comprensión como “núcleo operativo” que administra Tasks, Calendar y Goals.  
\* El usuario puede entrar a Planner desde Bottom Nav.  
\* El botón \`+\` central abre Quick Actions; desde ahí hay acceso a crear tarea y evento.  
\* Más de 4 niveles de navegación es fallo.  
\* Objetivo: 95% de acciones en 3 niveles o menos.  
\* Los enlaces cruzados entre entidades no suman nivel, se consideran movimiento lateral.  
\* Toda entidad relacionada debe exponer su relación como enlace navegable en su vista de detalle.  
\* Una tarea puede enlazar a un evento asociado.  
\* Un evento puede enlazar a tareas vinculadas.  
\* Una tarea puede estar vinculada a una responsabilidad.  
\* Una tarea puede contribuir a un Goal.  
\* Calendar contiene eventos.  
\* Event puede tener participantes.  
\* Home puede mostrar tareas pendientes y próximos eventos.

\#\# 6\. Información sobre Tasks

\#\#\# MVP actual

\* Una Task representa trabajo pendiente o realizado.  
\* Campos mencionados:

  \* título;  
  \* descripción;  
  \* responsable;  
  \* fechas;  
  \* prioridad;  
  \* estado;  
  \* responsabilidad asociada;  
  \* goal asociada;  
  \* archivos;  
  \* comentarios.  
\* Estados encontrados en el archivo de comprensión:

  \* Pendiente;  
  \* En progreso;  
  \* Completada;  
  \* Cancelada.  
\* Acción principal de Tasks:

  \* completar tarea asignada.  
\* La tarea asignada debe completarse con checkbox táctil en el list item, sin abrir detalle.  
\* El checkbox debe estar disponible directamente en la lista.  
\* Al completar:

  \* checkbox se rellena;  
  \* hay háptico;  
  \* la tarea queda tachada;  
  \* puede aparecer toast de confirmación opcional y no bloqueante;  
  \* debe existir “Deshacer” durante 5 segundos.  
\* Eliminar tarea:

  \* requiere confirmación;  
  \* mecanismo: bottom sheet con texto “¿Eliminar esta tarea?”  
  \* ninguna eliminación debe ser silenciosa.  
\* Crear tarea/evento:

  \* el nuevo item aparece en la lista con opacidad 0 → 1\.  
\* Tap en list item:

  \* abre detalle del item.  
\* Botón \`+\` flotante:

  \* crea nuevo item del dominio actual.  
\* Pull down:

  \* refresca datos en listas, excepto modo Adulto Mayor.  
\* Tasks debe tener lista de tareas del día con checkboxes.  
\* Tasks debe agrupar tareas por Responsabilidad.  
\* Tasks debe mostrar chip de filtro activo \+ contador de pendientes.  
\* Tasks debe incluir enlace a eventos o goals relacionados.  
\* Home puede mostrar “Tenés 2 tareas para hoy”.  
\* Home puede mostrar widget de tareas agrupadas por Responsabilidad.  
\* Home puede mostrar tareas pendientes propias como acción 1-tap.  
\* En Home, tareas propias pueden completarse desde la Capa 2\.  
\* Tasks usa chips de filtro.  
\* Densidad de filtros por rol:

  \* Coordinador: Todo, Hoy, Mío, Por miembro, Tipo.  
  \* Adulto: Todo, Hoy, Mío.  
  \* Adolescente: Hoy, Mío.  
  \* Niño: Hoy.  
  \* Adulto Mayor: Hoy.  
\* Items visibles en lista sin scroll por rol:

  \* Coordinador: 5–6.  
  \* Adulto: 4–5.  
  \* Adolescente: 3–4.  
  \* Niño: 2–3.  
  \* Adulto Mayor: 2–3.  
\* Badges:

  \* Coordinador: todos.  
  \* Adulto: propios \+ urgentes del hogar.  
  \* Adolescente: solo propios.  
  \* Niño: solo propios positivos.  
  \* Adulto Mayor: solo alertas.  
\* La densidad se reduce reduciendo elementos, no achicando fuentes.  
\* Body nunca debe bajar de 14px.  
\* En el detalle de tarea pueden aparecer:

  \* descripción;  
  \* responsable;  
  \* fecha;  
  \* dependencias;  
  \* comentarios;  
  \* timeline;  
  \* adjuntos.  
\* La configuración avanzada puede incluir:

  \* reglas de recurrencia;  
  \* verificación requerida;  
  \* plantillas.  
\* Nivel 3/configuración avanzada nunca visible por defecto.  
\* La configuración avanzada se accede con toggle explícito.

\#\#\# POST-MVP / futuro

\* Dependencias entre tareas:

  \* si la previa no se completa, la dependiente queda bloqueada.  
\* Subtask:

  \* único nivel de anidamiento bajo Task.  
  \* No existen subtareas anidadas.  
  \* Progreso calculado automáticamente.  
\* TaskComment:

  \* comentarios en tareas.  
  \* Aparecen en timeline junto con actividad automática.  
\* TaskAttachment:

  \* adjuntos de tareas: imágenes, PDFs, archivos, audio.  
\* TaskTimeline:

  \* línea temporal de actividad automática \+ comentarios humanos.  
\* TaskRecurrence:

  \* genera nuevas instancias.  
  \* No reutiliza la misma tarea.  
  \* Preserva historial.  
\* TaskVerification:

  \* verificación opcional de tareas completadas.  
  \* El archivo de comprensión indica que el estado final es Completada, sin estado separado.  
\* TaskTemplate:

  \* plantillas de tareas.  
  \* Inicialmente solo para Tasks.  
\* Goal asociado a Task:

  \* útil como enlace visual/futuro.  
  \* No debe ocupar la UI principal del MVP si no se implementa Goals.  
\* Configuración avanzada:

  \* recurrencia;  
  \* verificación requerida;  
  \* plantillas.  
\* Archivos y comentarios son campos mencionados para Task, pero para MVP actual deben tratarse como futuros si no hay soporte real.

\#\#\# Dudas o decisiones abiertas

\* El documento menciona estados de Task: Pendiente, En progreso, Completada, Cancelada. No define estados técnicos en inglés.  
\* El documento de comprensión indica que TaskVerification no tiene estado separado y que el estado final es Completada. Esto puede chocar con un MVP que quiera estados separados para verificación.  
\* No hay definición detallada de prioridades.  
\* No hay tipos de fecha o vencimiento.  
\* No hay definición de request/response ni endpoints.  
\* No hay diseño visual detallado de card de tarea más allá de checkbox, chips, contador, agrupación y lista.  
\* No hay copy exacto para empty state de tareas.  
\* No hay estructura completa de formulario de creación/edición de tarea.  
\* No hay definición de qué roles pueden crear, editar, eliminar o verificar tareas.  
\* No hay detalle de templates predefinidas más allá de que existen plantillas de tareas.  
\* No hay lista completa de categorías de tasks; solo aparecen responsabilidades operativas concretas.

\#\# 7\. Información sobre Calendar / Events

\#\#\# MVP actual

\* Calendar es una sub-sección de Planner.  
\* Calendar administra eventos.  
\* Event representa eventos familiares o personales.  
\* Estados de Event encontrados:

  \* Programado;  
  \* Completado;  
  \* Cancelado.  
\* Event puede tener múltiples participantes.  
\* Acción principal de Calendar:

  \* ver evento del día.  
\* El evento del día debe mostrarse como primer item de la lista y expandido por defecto.  
\* Calendar debe mostrar próximo evento en card expandida.  
\* Calendar debe permitir ver detalle / confirmar asistencia.  
\* Calendar debe mostrar timeline del día/semana.  
\* Calendar debe incluir enlace a Tasks vinculadas.  
\* Tap en list item de Events:

  \* abre detalle del item.  
\* El usuario que aprendió a usar Tasks debe poder usar Events sin reaprender nada.  
\* Crear/editar evento debe usar bottom sheet si no requiere pantalla completa.  
\* Crear tarea/evento:

  \* item aparece en lista con opacidad 0 → 1\.  
\* Eliminar evento recurrente:

  \* requiere confirmación doble.  
  \* Texto/concepto: “¿Este evento o toda la serie?” → confirmar.  
\* Event puede estar vinculado a documentos, pero eso queda como relación externa/futura.  
\* Event puede tener tareas vinculadas.  
\* Home muestra Próximos Eventos.  
\* Adulto puede ver “eventos próximos” como métrica visible.  
\* Adulto Mayor prioriza “lo urgente hoy”: medicación, eventos, personas, recordatorios.  
\* Calendar puede ser destino desde Planner tab.  
\* Calendar puede enlazar lateralmente a Tasks vinculadas.

\#\#\# POST-MVP / futuro

\* Confirmar asistencia aparece como acción en Calendar. El documento no define estados de asistencia, por lo que participantes avanzados o accepted/declined/maybe deben quedar para futuro.  
\* Eventos recurrentes aparecen por la regla de eliminación recurrente, pero no se define contrato de recurrencia simple ni reglas técnicas.  
\* Event → Documentos/HomeCloud es relación futura/no desarrollar en Planner actual.  
\* Event puede generar Memory en FamilyCloud según archivo de comprensión, pero esto queda fuera del MVP de Planner.  
\* V1 hereda participantes del evento de Calendar para FamilyCloud/futuro, según decisiones del archivo de comprensión.  
\* Participantes múltiples existen, pero no se detallan permisos, estados ni UI avanzada.

\#\#\# Dudas o decisiones abiertas

\* No se define vista mes.  
\* No se define vista día/semana/mes como UI completa; solo se menciona timeline día/semana.  
\* No se definen campos de Event más allá de evento familiar/personal, participantes y estados.  
\* No se define fecha/hora/ubicación de Event en detalle.  
\* No se define formulario de creación/edición de evento.  
\* No se define recurrencia simple.  
\* No se define endpoint ni service.  
\* No se define cómo se visualizan tareas con fecha dentro del Calendar.  
\* No se define qué roles pueden crear, editar, cancelar o eliminar eventos.  
\* No se define empty state de Calendar.  
\* No se define criterio de ordenamiento de eventos salvo “evento del día” y “próximo evento”.

\#\# 8\. Información sobre Goals

\* Goals vive dentro de Planner junto con Tasks y Calendar.  
\* Goal representa objetivos personales o familiares.  
\* Estructura encontrada:

  \* Goal → Hitos → Tasks.  
\* Estados encontrados:

  \* Activa;  
  \* Completada;  
  \* Fallida.  
\* Milestone representa grandes avances dentro de una meta y pertenece a Goal.  
\* Task puede contribuir a Goal.  
\* En Tasks puede existir enlace a Goals relacionados.  
\* En detalle de tarea puede mostrarse “Contribuye a: Vacaciones 2027 →”.  
\* Goals aparece como subdominio de Planner, pero para el MVP actual debe tratarse solo como referencia visual/futura.  
\* Goals no debe desarrollarse como backend real desde este fragment.  
\* Goals puede servir como navegación futura o enlace desactivado/preview si se decide en la spec final.  
\* No hay UI completa de Goals en este documento.  
\* No hay campos completos, endpoints ni flujos de Goals.  
\* No hay reglas de creación/edición de Goals.  
\* No hay definición visual de milestones más allá de la relación Goal → Hitos → Tasks.

\#\# 9\. Responsabilidades, templates y categorías

\#\#\# Responsabilidades

\* Responsabilidad es una agrupación de áreas operativas del hogar.  
\* Responsabilidades encontradas:

  \* Compras;  
  \* Mascotas;  
  \* Limpieza;  
  \* Vehículos.  
\* Una tarea tiene una única responsabilidad principal.  
\* Responsibility posee miembros asignados.  
\* Responsabilidades no son dominio independiente.  
\* Responsabilidades son propiedad de la tarea y eje organizador dentro de Tasks.  
\* Tasks debe agrupar tareas por Responsabilidad.  
\* En detalle de tarea puede aparecer enlace a Responsabilidad.  
\* Ejemplo de navegación contextual:

  \* Task → Responsabilidad: Compras.  
\* Inventory puede enlazar a Tasks mediante “Tarea de reposición”, pero no se debe desarrollar Inventory en Planner.  
\* Finance puede relacionar Expense con Responsibility, pero no se debe desarrollar Finance en Planner.  
\* FamilyEmployee puede estar asignado a Responsibility, pero no se debe desarrollar ese rol en Planner actual.

\#\#\# Templates

\* TaskTemplate existe como feature.  
\* Las plantillas son inicialmente solo para Tasks.  
\* Plantillas aparecen como configuración avanzada de Tasks.  
\* Nivel 3/configuración avanzada nunca debe ser visible por defecto.  
\* No se listan templates específicas en el documento.  
\* No se define CRUD de templates.  
\* No se define UI concreta de selección de template.  
\* No se definen campos de template.  
\* Para el MVP actual, templates deberían tratarse con cuidado: el documento solo confirma existencia y ubicación avanzada, no contenido.

\#\#\# Categorías

\* El documento no define “categoría” como entidad separada para Planner.  
\* La lógica más cercana a categoría es Responsibility.  
\* El documento sí define que Responsabilidades son eje organizador dentro de Tasks.  
\* No hay regla explícita sobre evitar duplicación entre template y categoría.  
\* No hay lista de categorías de Planner más allá de responsabilidades encontradas.

\#\# 10\. Quick Actions aplicables a Planner

\* El botón \`+\` central de Bottom Nav abre Quick Actions.  
\* Quick Actions se muestra como panel flotante con blur de fondo.  
\* Geni es el único elemento fijo dentro de Quick Actions.  
\* Las demás acciones son dinámicas.  
\* El archivo de comprensión indica que QuickActions da acceso a crear tarea, evento, gasto, etc.  
\* Para Planner, las acciones explícitas útiles son:

  \* crear tarea;  
  \* crear evento.  
\* Botón \`+\` flotante del dominio actual crea nuevo item del dominio actual.  
\* Botón \`+\` central:

  \* \`accessibilityLabel\`: “Acciones rápidas”.  
  \* \`accessibilityHint\`: “Abre el panel de acciones rápidas”.  
\* Botón \`+\` flotante:

  \* \`accessibilityLabel\`: “Crear \[tarea/evento/gasto\]”.  
\* Quick Actions no debe convertirse en tab propio.  
\* Geni no tiene tab dedicado; acceso principal vía Quick Actions.  
\* SOS no está en Quick Actions.  
\* Quick Actions debe aparecer con transición fade in \+ slide up, 200ms ease-out.  
\* Quick Actions forma parte del Nivel 1 desde Home/Bottom Nav.

\#\# 11\. Home relacionado con Planner

\* Home es Nivel 0\.  
\* Home es siempre pantalla inicial.  
\* El usuario no puede cambiar Home como pantalla inicial.  
\* Home responde:

  \* qué está pasando en mi hogar ahora;  
  \* qué tengo que hacer yo.  
\* Home resume, no administra.  
\* Home conduce al módulo correspondiente.  
\* Home puede mostrar:

  \* Briefing diario;  
  \* Atención Requerida;  
  \* tareas pendientes propias;  
  \* Carga Familiar;  
  \* Próximos Eventos;  
  \* Presence Resumido;  
  \* Actividad Familiar.  
\* Para Planner, lo más aplicable en Home:

  \* tareas pendientes propias;  
  \* tareas para hoy;  
  \* tareas agrupadas por Responsabilidad;  
  \* próximos eventos;  
  \* tareas vencidas dentro de Atención Requerida;  
  \* eventos del día dentro de briefing/resumen.  
\* Ejemplo explícito:

  \* “Tenés 2 tareas para hoy”.  
\* Home puede mostrar tareas pendientes propias con acción 1-tap para completar.  
\* Home → widget Tareas agrupadas por Responsabilidad.  
\* Home muestra Próximos Eventos en la Capa 3\.  
\* AttentionRequired centraliza elementos urgentes:

  \* tareas vencidas;  
  \* pagos vencidos;  
  \* aprobaciones pendientes;  
  \* vencimientos.  
\* Briefing es primer widget de Home.  
\* Briefing puede agregar información desde Planner.  
\* Briefing incluye eventos, tareas y goals del día según el archivo de comprensión.  
\* Home debe permitir navegar hacia el módulo correspondiente, por ejemplo:

  \* desde tarea en Home → detalle de tarea;  
  \* desde tarea → evento asociado;  
  \* desde evento → tareas vinculadas.  
\* Ejemplo de flujo:

  1\. Usuario en Home ve “Tenés que preparar comida para el asado del sábado”.  
  2\. Tap → Detalle de la tarea.  
  3\. En detalle ve enlace “Parte del evento: Asado del sábado →”.  
  4\. Tap → Detalle del evento.  
  5\. Back vuelve evento → tarea → Home.  
\* El usuario no debería tener que volver al menú principal, buscar manualmente el dominio ni recordar nombres de entidades relacionadas.

\#\# 12\. Patrones visuales reutilizables

\#\#\# Aplicable ahora a Planner

\* Jerarquía de 4 capas:

  \* Atención;  
  \* Acción;  
  \* Contexto;  
  \* Exploración.  
\* Tasks:

  \* chip de filtro activo;  
  \* contador de pendientes;  
  \* checkbox en primer item;  
  \* lista agrupada por Responsabilidad;  
  \* enlace a Eventos/Goals relacionados.  
\* Calendar:

  \* próximo evento como card expandida;  
  \* acción de ver detalle / confirmar asistencia;  
  \* timeline día/semana;  
  \* enlace a Tasks vinculadas.  
\* Bottom Nav:

  \* \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\`.  
  \* Tab activo: ícono filled \+ texto peso 600\.  
  \* Tab inactivo: ícono outline \+ texto peso 400\.  
  \* Badge en tab solo puede usar success verde o alert ámbar.  
  \* Nunca usar error rojo en la barra de navegación.  
  \* Tap en tab activo: scroll to top \+ refresh.  
\* Filtros:

  \* chips horizontales.  
  \* chip activo con accessibility label de seleccionado.  
\* Listas:

  \* verticales;  
  \* scroll infinito;  
  \* indicador de carga al final;  
  \* tap abre detalle.  
\* Formularios:

  \* bottom sheet para crear/editar;  
  \* acciones guardar/cancelar fijas abajo;  
  \* X para cerrar;  
  \* check para guardar;  
  \* confirmación si hay cambios sin guardar.  
\* Acciones frecuentes:

  \* zona de pulgar.  
  \* botón \`+\` flotante en esquina inferior derecha.  
\* Feedback:

  \* escala 0.97 → 1.0;  
  \* háptico ligero;  
  \* checkbox relleno;  
  \* tachado;  
  \* toast con deshacer;  
  \* opacidad 0 → 1 al crear item.  
\* Diseño por rol:

  \* ajustar cantidad de cards, filtros, métricas y badges.  
  \* no achicar fuentes por debajo de 14px.

\#\#\# Referencia visual para más adelante

\* Enlaces cruzados hacia:

  \* Documents/HomeCloud;  
  \* Inventory;  
  \* Assets;  
  \* Finance;  
  \* Goals.  
\* Detail views con dependencias, comentarios, timeline y adjuntos.  
\* Configuración avanzada con recurrencia, verificación requerida y plantillas.  
\* Participantes avanzados de eventos.  
\* Automatizaciones que crean tareas/eventos.  
\* Geni como ayuda transversal.

\#\#\# No aplicable

\* Feed como tab independiente.  
\* More como dashboard.  
\* SOS dentro de Bottom Nav o Quick Actions.  
\* Finance, Inventory, HomeCloud como tabs principales.  
\* Gestos swipe izquierda/derecha o long press sobre list items sin enmienda.  
\* Sonidos propios de la app.  
\* Mapas, GPS real, geofencing real para Planner actual.

\#\# 13\. Reglas funcionales extraídas

\* Planner vive en Bottom Nav.  
\* Planner agrupa Tasks, Calendar y Goals.  
\* Responsabilidades no son un dominio independiente.  
\* Responsabilidades son propiedad de la tarea y eje organizador de Tasks.  
\* Completar tarea asignada debe ser 1-tap desde el list item.  
\* Completar tarea no debe requerir abrir detalle.  
\* Tasks debe mostrar checkbox táctil en la lista.  
\* Al completar tarea, debe haber checkbox relleno, háptico y tachado.  
\* Completar tarea debe poder revertirse durante 5 segundos con “Deshacer”.  
\* Eliminar tarea requiere confirmación.  
\* Eliminar tarea usa bottom sheet con “¿Eliminar esta tarea?”  
\* Calendar debe mostrar evento del día como primer item expandido.  
\* Calendar debe mostrar próximo evento en card expandida.  
\* Crear/editar tarea o evento debe usar bottom sheet salvo que el contenido exija pantalla completa.  
\* Crear tarea/evento debe insertar el item con animación de opacidad 0 → 1\.  
\* Tap en task/event list item abre detalle.  
\* Pull down refresca listas, excepto modo Adulto Mayor.  
\* X cierra sin guardar y confirma si hay cambios.  
\* Check guarda y cierra.  
\* Cerrar formulario con cambios requiere bottom sheet.  
\* La acción principal siempre debe estar visible sin scroll.  
\* Las acciones frecuentes van en zona de pulgar.  
\* La zona superior no debe contener la acción principal.  
\* Tasks debe agruparse por Responsabilidad.  
\* Tasks debe mostrar chip de filtro activo \+ contador de pendientes.  
\* Calendar debe tener timeline del día/semana.  
\* Home resume Planner, no administra Planner completo.  
\* Home puede permitir completar tareas propias 1-tap.  
\* Home puede mostrar próximos eventos.  
\* Home conduce al módulo correspondiente.  
\* Toda entidad relacionada debe exponer enlaces navegables en su detalle.  
\* Tarea puede enlazar a evento asociado.  
\* Evento puede enlazar a tasks vinculadas.  
\* Más de 4 niveles de navegación es fallo.  
\* El objetivo es que 95% de acciones ocurra en 3 niveles o menos.  
\* Bottom Nav no se modifica.  
\* Quick Actions abre panel flotante con blur.  
\* Geni no tiene tab dedicado.  
\* SOS no está en Bottom Nav ni Quick Actions.  
\* Los gestos swipe en list items y long press no están definidos y requieren enmienda.  
\* Body nunca debe bajar de 14px.  
\* El diseño se adapta por rol reduciendo elementos, no achicando fuentes.

\#\# 14\. Ideas derivadas útiles

\* Propuesta UX derivada / requiere validación del usuario: En Planner, usar dos tabs principales visibles para MVP: “Tasks” y “Calendar”, dejando “Goals” como entrada visual deshabilitada o futura si todavía no se implementa.  
\* Propuesta UX derivada / requiere validación del usuario: En Tasks, usar header con filtro activo, contador de pendientes y chips de rol según densidad permitida.  
\* Propuesta UX derivada / requiere validación del usuario: En Task list, agrupar por Responsabilidad con headers como “Compras”, “Limpieza”, “Mascotas” y “Vehículos”, porque son responsabilidades explícitas.  
\* Propuesta UX derivada / requiere validación del usuario: En Calendar, mostrar una card superior “Próximo evento” y debajo timeline del día.  
\* Propuesta UX derivada / requiere validación del usuario: En Home, mostrar una card resumida “Hoy” con cantidad de tareas y próximo evento, y llevar por tap a Planner.  
\* Propuesta UX derivada / requiere validación del usuario: En Quick Actions, incluir accesos “Crear tarea” y “Crear evento” como acciones dinámicas junto al slot fijo de Geni.  
\* Propuesta UX derivada / requiere validación del usuario: En la lista de tareas, evitar mostrar dependencias, comentarios y adjuntos en el Nivel 1; dejarlos solo para detalle o futuro.  
\* Propuesta UX derivada / requiere validación del usuario: En MVP, usar el patrón de “Configuración avanzada” para ocultar recurrencia/verificación/templates si todavía no están listas.  
\* Propuesta UX derivada / requiere validación del usuario: En adulto mayor, Calendar debería priorizar eventos, medicación y recordatorios en la parte superior, pero sin cambiar la estructura global de navegación.  
\* Propuesta UX derivada / requiere validación del usuario: Mostrar skeleton o indicador sutil de sincronización en Planner solo si la operación supera 300ms, manteniendo respuesta táctil inmediata.

\#\# 15\. Decisiones que quedan abiertas

\* Estados técnicos finales de Task para el MVP.  
\* Cómo compatibilizar TaskVerification del documento (“estado final Completada, sin estado separado”) con un posible flujo MVP que requiera estados separados.  
\* Prioridades exactas de tareas.  
\* Tipos y formato de fechas de Task.  
\* Formulario exacto de creación/edición de tarea.  
\* Formulario exacto de creación/edición de evento.  
\* Campos exactos de Event.  
\* Si Calendar MVP tendrá día/semana/mes o solo timeline día/semana.  
\* Cómo mostrar tareas con fecha dentro del Calendar.  
\* Qué rol puede crear, editar, eliminar o completar tareas.  
\* Qué rol puede crear, editar, cancelar o eliminar eventos.  
\* Qué rol puede verificar tareas si se implementa verificación.  
\* Cómo se representan avatares de responsables en tareas.  
\* Qué templates concretas existen.  
\* Si las templates serán visibles en creación rápida o solo en configuración avanzada.  
\* Cómo se define “categoría” si Responsibility ya organiza tareas.  
\* Empty states concretos de Tasks, Events y Calendar.  
\* Errores específicos de Planner.  
\* Contrato de service/API.  
\* Persistencia real, local o mock para interacciones visuales.  
\* Copy exacto del Planner.  
\* Visual design específico de cards más allá de la filosofía UX.  
\* Si Goals se oculta completamente o aparece como referencia visual futura.

\#\# 16\. Qué NO debe entrar al MVP actual

\* Goals backend real.  
\* Milestones backend real.  
\* Dependencias complejas entre tareas.  
\* Subtareas complejas.  
\* Subtareas anidadas.  
\* Comentarios reales en tareas.  
\* Adjuntos reales en tareas.  
\* Timeline completo de actividad de tarea.  
\* Recurrencia compleja.  
\* Configuración avanzada visible por defecto.  
\* Plantillas personalizadas.  
\* CRUD de templates.  
\* Participantes avanzados de eventos.  
\* Estados avanzados de asistencia si no están definidos.  
\* Event → documentos/HomeCloud real.  
\* Event → Memory/FamilyCloud real.  
\* Automatizaciones reales que crean tareas o eventos.  
\* Geni real coordinando Planner.  
\* Offline sync real.  
\* Auditoría completa.  
\* Notificaciones push reales.  
\* Feed real.  
\* SOS real.  
\* Finance real dentro de Planner.  
\* Inventory real dentro de Planner.  
\* Assets real dentro de Planner.  
\* Presence GPS real dentro de Planner.  
\* Multi-hogar avanzado.  
\* Gestos swipe/long press en list items sin enmienda.  
\* More como dashboard.  
\* Planner como conjunto de más de 4 niveles de navegación.

\#\# 17\. Extractos o referencias internas importantes

\* \`\#\# 1\. PRINCIPIOS DE INTERACCIÓN\`

  \* Regla del 1-tap.  
  \* Feedback inmediato.  
  \* Previsibilidad.  
  \* Perdón.  
  \* Progressive Disclosure.  
\* \`\#\#\# 1.1 Regla del 1-tap\`

  \* Tasks: completar tarea asignada con checkbox táctil en list item, sin abrir detalle.  
  \* Calendar: ver evento del día como primer item expandido.  
\* \`\#\#\# 1.2 Feedback inmediato\`

  \* Completar tarea: checkbox se rellena \+ háptico \+ tachado.  
  \* Crear tarea/evento: item aparece en lista con opacidad 0 → 1\.  
\* \`\#\#\# 1.3 Previsibilidad\`

  \* Tap en list item abre detalle.  
  \* Botón \`+\` flotante crea nuevo item del dominio actual.  
  \* Pull down refresca listas.  
  \* Usuario que aprendió Tasks debe poder usar Events sin reaprender.  
  \* Swipe y long press no están definidos.  
\* \`\#\#\# 1.4 Perdón\`

  \* Completar tarea reversible 5s con “Deshacer”.  
  \* Eliminar tarea requiere bottom sheet.  
  \* Eliminar evento recurrente requiere confirmación doble.  
\* \`\#\#\# 1.5 Progressive Disclosure\`

  \* Home muestra “Tenés 2 tareas para hoy”.  
  \* Planner \> Tasks muestra lista del día con checkboxes agrupadas por Responsabilidad.  
  \* Detalle de tarea incluye descripción, responsable, fecha, dependencias, comentarios, timeline y adjuntos.  
  \* Configuración avanzada incluye recurrencia, verificación requerida y plantillas.  
\* \`\#\# 2\. ARQUITECTURA DE PANTALLA\`

  \* Capa 1 Atención.  
  \* Capa 2 Acción.  
  \* Capa 3 Contexto.  
  \* Capa 4 Exploración.  
\* \`\#\#\# 2.1 Jerarquía visual universal\`

  \* Tasks: chip activo \+ contador, checkbox, lista agrupada por responsabilidad.  
  \* Calendar: próximo evento card expandida, ver detalle/confirmar asistencia, timeline día/semana.  
\* \`\#\#\# 2.2 Zonas de la pantalla\`

  \* Acción principal en zona de pulgar.  
  \* Botón \`+\` flotante en esquina inferior derecha.  
\* \`\#\#\# 2.3 Reglas de scroll\`

  \* Listas de items con scroll vertical infinito.  
  \* Formularios con acciones fijas abajo.  
\* \`\#\# 3\. NAVEGACIÓN\`

  \* Home como Nivel 0\.  
  \* Bottom Nav: Home, People, \+, Planner, More.  
  \* Tasks, Calendar, Goals dentro de Planner.  
\* \`\#\#\# 3.3 Navegación contextual entre entidades\`

  \* Task → Event asociado.  
  \* Task → Responsabilidad.  
  \* Task → Goal.  
  \* Event → Tasks vinculadas.  
\* \`\#\#\# 3.4 Regla de "no volver atrás"\`

  \* Flujo Home → detalle tarea → detalle evento → back normal.  
\* \`\#\#\# 3.5 Bottom Navigation — Congelado V1\`

  \* Planner agrupa Tasks, Calendar y Goals.  
  \* Responsabilidades no son dominio independiente.  
\* \`\#\#\# 7.5 Etiquetas para lectores de pantalla\`

  \* Labels accesibles para completar tarea, botón \+, badges, tabs, avatars y chips.  
\* Archivo de comprensión:

  \* Task como entidad.  
  \* Responsibility como agrupación operativa.  
  \* Calendar y Event.  
  \* Goal y Milestone.  
  \* QuickActions.  
  \* HomeScreen y AttentionRequired.  
  \* Reglas de navegación y decisiones UX.

\#\# 18\. Conclusión operativa

Este documento aporta principalmente filosofía UX, estructura de navegación y reglas de interacción para el frontend ideal de Planner. Es especialmente útil para definir cómo debe sentirse y comportarse Planner: rápido, mobile-first, 1-tap, con feedback inmediato, agrupado por responsabilidades, conectado con Home y navegable sin fricción entre tareas, eventos y entidades relacionadas.

Debe usarse en la spec final para:

\* definir arquitectura visual de Planner;  
\* definir comportamiento de Tasks;  
\* definir comportamiento inicial de Calendar;  
\* definir navegación entre Home, Planner, Task Detail y Event Detail;  
\* definir feedback inmediato;  
\* definir reglas de bottom sheet, modal, scroll y zona de pulgar;  
\* definir accesibilidad;  
\* definir adaptación por rol;  
\* separar MVP visible de complejidad avanzada.

Debe ignorarse o dejarse fuera por ahora:

\* Goals como implementación real;  
\* dependencias complejas;  
\* subtareas avanzadas;  
\* comentarios;  
\* adjuntos;  
\* timeline completo;  
\* automatizaciones;  
\* Geni real;  
\* offline sync;  
\* auditoría completa;  
\* integraciones reales con Finance, Inventory, Assets, HomeCloud o Presence GPS.

Este fragment no define contratos API ni modelo final de backend. Su valor principal está en guiar el frontend ideal e interactivo de Planner para que se vea profesional, claro, coherente con HomePlus y usable en una demo mobile-first.

\# planner\_frontend\_fragment\_ai\_philosophy\_geni

\#\# 1\. Fuente

\* Documento: \`HomePlus — SECCION 7 AI PHILOSOPHY \- GENI.md\`   
\* Archivo de comprensión asociado: \`Seccion 7 Filosofia de la ai \- geni.txt\`   
\* Tipo de documento: Filosofía de producto / AI Philosophy / Geni.  
\* Alcance del documento: Define a Geni como capa transversal de inteligencia, sus capacidades, restricciones, escalamiento, guardrails, relación con Home, Planner, navegación, permisos y eventos del sistema.  
\* Nivel de utilidad para Planner Frontend: Medio.  
\* Motivo: No define pantallas específicas completas de Planner, pero sí aporta reglas muy útiles para UX, copywriting, interacción asistida, Home, Quick Actions, navegación, carga de tareas, tareas atrasadas, permisos, tono, no automatización peligrosa y límites de lo que Geni puede hacer dentro de Planner.

\---

\#\# 2\. Resumen útil para Planner Frontend

Este documento aporta una visión clara de cómo Planner debe integrarse con la capa Geni sin convertirse en una experiencia invasiva ni automática. Geni puede ayudar a crear tareas, reprogramar fechas, sugerir responsables, analizar carga de trabajo por miembro y coordinar distribución de tareas, pero no puede completar tareas automáticamente ni reasignarlas sin aprobación humana. 

También aporta reglas de navegación: Home es la pantalla inicial, Home resume pero no administra, Bottom Nav V1 incluye \`Home\`, \`People\`, \`+\`, \`Planner\`, \`More\`, y Geni no tiene tab propio sino acceso vía Quick Actions como slot fijo. 

Para el frontend ideal de Planner, este documento sirve sobre todo para definir:

\* tono neutral y no acusatorio;  
\* sugerencias inline dentro de Planner;  
\* alertas por patrones, no por cada incidente;  
\* visibilidad progresiva de problemas;  
\* relación de Planner con Home y Briefing;  
\* límites de automatización;  
\* reglas de permisos;  
\* navegación mobile-first;  
\* acciones de Planner desde Quick Actions;  
\* diseño de estados de carga familiar, tareas atrasadas y conflictos de agenda.

\---

\#\# 3\. Principios de producto aplicables

\#\#\# Coordinación por encima de control

Geni no debe actuar como juez, árbitro ni vigilante acusatorio. En Planner, esto implica que las tareas atrasadas, la carga desigual o los conflictos de agenda deben mostrarse con datos objetivos y tono neutral, sin culpar a una persona. 

Aplicación al Planner Frontend:

\* Mostrar “3 tareas pendientes asignadas a Juan” en vez de “Juan está fallando”.  
\* Presentar desbalances como información operativa, no como reproche.  
\* Usar recomendaciones tipo “¿Quieren redistribuir?” en vez de órdenes.

\#\#\# Geni sugiere, la familia decide

Geni puede recomendar acciones, responsables y ajustes, pero nunca ordena. También puede coordinar eventos, carga de trabajo y presencia, pero toda acción operativa sensible necesita aprobación explícita. 

Aplicación al Planner Frontend:

\* Las sugerencias deben aparecer como cards o banners accionables.  
\* Cada sugerencia debe tener acción humana explícita: aceptar, editar, descartar.  
\* No ejecutar reasignaciones automáticas sin interacción del usuario.

\#\#\# No automatizar completitud

El documento establece que Geni nunca marca tareas como completadas automáticamente. La verificación de completitud es responsabilidad humana. 

Aplicación al Planner Frontend:

\* El botón de completar tarea debe ser acción humana visible.  
\* Geni puede recordar, sugerir o detectar atraso, pero no cambiar el estado de completitud solo.  
\* En UI, los estados completados deben derivar de acción del usuario, no de automatización.

\#\#\# Alertas por patrones, no por ruido

Geni no dispara alertas por cada evento aislado; opera sobre patrones y acumulación. Una tarea atrasada equivale a silencio; el umbral de intervención aparece en 3 tareas. 

Aplicación al Planner Frontend:

\* Evitar sobrecargar al usuario con alertas por cada tarea vencida.  
\* Priorizar secciones tipo “Atención requerida” cuando haya acumulación.  
\* Mostrar alertas relevantes cuando hay 3+ tareas atrasadas o asimetría significativa.

\#\#\# Home resume, Planner administra

El documento define que Home resume información, no administra. Toda información en Home conduce al módulo que la administra. Home siempre es pantalla inicial. 

Aplicación al Planner Frontend:

\* Home puede mostrar resumen de tareas/eventos.  
\* Planner debe ser el lugar donde se crean, editan, completan, reprograman y gestionan tareas/eventos.  
\* Las cards de Home deben navegar hacia Planner.

\#\#\# Mobile First

El documento confirma Mobile First, con tablet en 2 columnas y desktop con sidebar pendiente de confirmación. 

Aplicación al Planner Frontend:

\* Diseñar Planner primero para mobile.  
\* Priorizar acciones 1-tap.  
\* Evitar profundidad excesiva.  
\* Usar listas, cards, bottom sheets y acciones rápidas.

\#\#\# Navegación corta

El documento indica que más de 4 niveles de profundidad en navegación es fallo, y que el objetivo es que 95% de acciones estén a 3 niveles o menos. 

Aplicación al Planner Frontend:

\* Crear tarea debe estar accesible desde \`+\`.  
\* Crear evento debe estar accesible desde \`+\`.  
\* Completar tarea debe estar en la card/lista, no enterrado en detalle.  
\* Ver pendientes debe estar en Planner o desde Home sin pasos excesivos.

\---

\#\# 4\. UX/UI aplicable

\#\#\# Navegación principal

Bottom Navigation V1 está congelado con:

\* Home.  
\* People.  
\* \`+\`.  
\* Planner.  
\* More. 

Aplicación directa:

\* Planner debe tener tab propio en Bottom Nav.  
\* El botón central \`+\` debe servir para acciones rápidas relacionadas con Planner, como crear tarea o crear evento.  
\* More no es el lugar principal de Planner.

\#\#\# Quick Actions

Geni no tiene tab propio en Bottom Nav. Su acceso principal es vía Quick Actions como slot fijo. 

Aplicación directa:

\* Quick Actions puede contener acceso a Geni.  
\* Quick Actions también debería poder alojar acciones rápidas de Planner si aparecen en el sistema de navegación.  
\* Geni dentro de Quick Actions puede asistir a crear o ajustar tareas, pero no debe ejecutar decisiones sensibles sin confirmación.

\#\#\# Sugerencias inline

El documento indica que Geni aparece como sugerencias inline dentro de cada módulo, incluyendo Planner. 

Aplicación directa:

\* Planner puede mostrar una card pequeña tipo “Sugerencia de Geni”.  
\* Las sugerencias deben estar integradas dentro de la lista/calendario, no como chat separado.  
\* Ejemplos de sugerencia aplicables:

  \* redistribuir carga;  
  \* revisar tareas atrasadas;  
  \* resolver conflicto de agenda;  
  \* reprogramar una fecha;  
  \* sugerir responsable.

\#\#\# Briefing como card

Briefing es el primer widget de Home, una única card, con versión resumida permanente y versión ampliada cuando hay cambios relevantes. 

Aplicación al Planner:

\* Home puede mostrar una card de Briefing con tareas/eventos relevantes.  
\* Planner puede alimentar el Briefing con:

  \* tareas atrasadas;  
  \* eventos próximos;  
  \* conflictos de agenda;  
  \* carga desigual;  
  \* tareas sin dueño activo.

\#\#\# Tono de mensajes

El documento exige lenguaje neutro, objetivo y no acusatorio. Geni presenta datos para que la familia hable, no habla por la familia. 

Aplicación al copywriting de Planner:

\* “Tienes una tarea atrasada: ‘Pagar servicios’. ¿La revisas hoy?”  
\* “Hay 3 tareas sin dueño activo esta semana. ¿Quieren redistribuirlas?”  
\* “Juan tiene 3 tareas atrasadas esta semana. Te informo como Coordinador para que evalúes si corresponde intervenir.”  
\* “Tienes dos eventos el mismo día a la misma hora.”

\#\#\# Estados visuales sugeridos por el documento

El documento no define componentes visuales específicos como chips, tabs o badges, pero sí define estados operativos que el frontend puede representar:

\* tarea atrasada;  
\* tarea sin dueño activo;  
\* asimetría de carga;  
\* evento solapado;  
\* conflicto de agenda recurrente;  
\* informe privado;  
\* informe al Coordinador;  
\* visibilidad en Briefing familiar;  
\* sugerencia pendiente de aprobación;  
\* acción no permitida por permisos.

\---

\#\# 5\. Información directa sobre Planner

Geni puede operar sobre Planner. En Planner, Geni puede:

\* crear tareas;  
\* reprogramar fechas;  
\* sugerir responsables;  
\* analizar carga de trabajo por miembro;  
\* coordinar distribución de tareas. 

Geni no puede:

\* marcar tareas como completadas automáticamente;  
\* reasignar tareas sin aprobación del responsable o del Coordinador. 

El archivo de comprensión describe Task como una entidad de Planner que representa trabajo pendiente o realizado. También menciona estados, prioridades, subtareas, dependencias, recurrencia, verificación, plantillas y responsabilidades. 

El archivo de comprensión describe Event como evento familiar o personal, con estados Programado, Completado y Cancelado. También aclara que no existe estado Postergado: equivale a modificar fecha. 

\---

\#\# 6\. Información sobre Tasks

\#\#\# MVP actual

Información aplicable directamente al frontend MVP:

\* Task representa trabajo pendiente o realizado.   
\* Task pertenece a Planner.  
\* Task puede estar asignada a una Persona.   
\* Task pertenece a un Hogar.   
\* Task puede tener una responsabilidad asociada.   
\* Responsabilidad agrupa áreas operativas del hogar.  
\* Una tarea tiene una única responsabilidad principal.  
\* Una responsabilidad puede tener múltiples miembros.   
\* Prioridades encontradas: Baja, Media, Alta, Crítica.   
\* Estados encontrados en el documento de comprensión: Pendiente, En progreso, Completada, Cancelada.   
\* Vencida es calculada.   
\* Geni puede crear tareas.  
\* Geni puede reprogramar fechas.  
\* Geni puede sugerir responsables.  
\* Geni puede analizar carga de trabajo por miembro.  
\* Geni puede coordinar distribución de tareas.   
\* Geni no puede completar tareas automáticamente.   
\* Geni no puede reasignar tareas unilateralmente.   
\* Una tarea atrasada no debe generar intervención fuerte.  
\* El umbral relevante de intervención es 3 tareas atrasadas. 

\#\#\# Estados / señales UX útiles

\* Pendiente.  
\* En progreso.  
\* Completada.  
\* Cancelada.  
\* Vencida como estado calculado.  
\* Atrasada.  
\* Sin dueño activo.  
\* Requiere intervención.  
\* Requiere redistribución.  
\* Requiere aprobación humana para reasignación.  
\* Sugerencia de Geni pendiente de acción.

\#\#\# POST-MVP / futuro

El documento o archivo de comprensión menciona elementos que son valiosos pero deben tratarse como futuro o no prioritario para el MVP actual:

\* Subtarea: único nivel de subdivisión, sin anidamiento.   
\* DependenciaTarea: relación de bloqueo entre tareas.   
\* Recurrencia: genera nuevas instancias de tareas y preserva historial.   
\* Comentario en tareas, documentos y posts.   
\* Adjunto: imágenes, PDFs, archivos, audio.   
\* Timeline: línea temporal única por tarea con actividad automática y comentarios humanos.   
\* Offline sync / cola de sincronización para acciones offline.   
\* Auditoría completa permanente. 

\#\#\# Dudas o decisiones abiertas

\* El documento de comprensión define estados de Task como Pendiente, En progreso, Completada, Cancelada, pero el MVP actual del proyecto puede requerir otros estados. Este fragment no resuelve la diferencia.  
\* Verificación aparece como opcional y dice que cuando se verifica, la tarea pasa a estado final Completada; no existe estado separado en este documento.   
\* No se definen campos exactos de Task.  
\* No se define formulario de creación/edición de tarea.  
\* No se definen tabs, filtros ni layout específico de Planner.  
\* No se define si “En progreso” entra al MVP visual actual.  
\* No se define contrato API.  
\* No se define copy exacto para todos los estados.

\---

\#\# 7\. Información sobre Calendar / Events

\#\#\# MVP actual

Información aplicable directamente al frontend MVP:

\* Event pertenece a Planner.  
\* Event representa evento familiar o personal.   
\* Event puede tener participantes/personas.   
\* Event pertenece a un Hogar.   
\* Estados encontrados: Programado, Completado, Cancelado.   
\* No existe estado Postergado; postergar equivale a modificar fecha.   
\* Geni puede coordinar eventos entre miembros.   
\* Geni puede detectar retrasos, generar recordatorios de salida/llegada y proponer acciones basadas en ubicación. Para el MVP de Planner frontend esto debe considerarse referencia contextual, no GPS real.   
\* Geni no puede cancelar o modificar eventos del calendario sin aprobación.   
\* El documento menciona eventos solapados como patrón detectable: 2+ eventos en conflicto para un mismo miembro generan alerta privada.   
\* El documento menciona conflicto de agenda recurrente: 3+ semanas con eventos solapados entre los mismos dos miembros. 

\#\#\# Señales UX útiles para Calendar / Events

\* Evento programado.  
\* Evento completado.  
\* Evento cancelado.  
\* Evento en conflicto.  
\* Evento solapado.  
\* Evento reprogramado mediante modificación de fecha.  
\* Sugerencia de conversación si hay conflicto recurrente.  
\* Alerta privada si hay conflicto de agenda.  
\* Recordatorio contextual si hay retraso.

\#\#\# POST-MVP / futuro

\* Coordinación con Presence real.  
\* Detección real de retrasos por ubicación.  
\* Recordatorios de salida/llegada basados en ubicación.  
\* Conflictos recurrentes detectados automáticamente por Geni.  
\* Modificaciones sugeridas por IA.  
\* Cualquier cancelación/modificación automatizada sin aprobación queda prohibida.

\#\#\# Dudas o decisiones abiertas

\* No se define vista día/semana/mes en este documento.  
\* No se define layout de Calendar.  
\* No se define formulario de evento.  
\* No se definen campos exactos como título, hora, ubicación o descripción.  
\* No se define recurrencia simple para eventos.  
\* No se define contrato API.  
\* No se define cómo se muestran tareas con fecha dentro del calendario.  
\* No se define si eventos personales y familiares tienen tratamiento visual distinto.

\---

\#\# 8\. Información sobre Goals

El archivo de comprensión menciona Goal como entidad de Planner:

\* Goal puede ser personal o familiar.  
\* Estructura: Goal → Hitos → Tasks.  
\* Estados: Activa, Completada, Fallida. 

También menciona Hito como gran avance dentro de una meta. 

Uso para Planner Frontend ideal:

\* Sirve como referencia visual futura para conectar tareas con progreso.  
\* Puede inspirar una card futura de “Meta relacionada” dentro de una tarea.  
\* Puede inspirar agrupaciones visuales por objetivo, pero no debe entrar como módulo central del MVP actual desde este documento.

Clasificación:

\* Fuera del MVP actual / referencia futura.  
\* No desarrollar Goals completo desde este fragment.  
\* No implementar milestones/hitos como alcance actual.

\---

\#\# 9\. Responsabilidades, templates y categorías

\#\#\# Responsabilidades

El documento de comprensión define Responsabilidad como entidad de Planner:

\* Agrupa áreas operativas del hogar.  
\* Ejemplos encontrados: Compras, Mascotas, Limpieza, Vehículos.  
\* Una tarea tiene una única responsabilidad principal.  
\* Una responsabilidad puede tener múltiples miembros. 

Aplicación al frontend:

\* Usar responsabilidad como agrupador visual de tareas.  
\* Mostrar responsabilidad como chip, badge o sección.  
\* Permitir que una tarea se entienda por área operativa.  
\* Evitar múltiples responsabilidades principales por tarea.

\#\#\# Templates

El documento de comprensión menciona PlantillaTarea:

\* Plantillas de tareas predefinidas.  
\* Inicialmente solo para Tasks. 

Aplicación al frontend:

\* Templates pueden servir como atajos de creación.  
\* Se pueden mostrar como opciones rápidas para crear tarea.  
\* Este documento no define lista completa de templates.  
\* Este documento no define CRUD de templates.

\#\#\# Categorías

El documento no define explícitamente una entidad “Categoría” para Planner.

Duda abierta:

\* No queda definido si categoría y responsabilidad son conceptos separados o si responsabilidad cumple el rol visual de categoría.  
\* No se debe inventar una categoría adicional desde este documento.

\#\#\# Creación rápida

Geni puede crear tareas y sugerir responsables. 

Aplicación al frontend:

\* La creación rápida puede incluir asistencia o sugerencias.  
\* Las sugerencias deben requerir confirmación humana si afectan responsable, fecha o redistribución.

\---

\#\# 10\. Quick Actions aplicables a Planner

Información encontrada:

\* Bottom Nav incluye botón central \`+\`.   
\* Geni no tiene tab propio; acceso principal vía Quick Actions como slot fijo.   
\* Geni puede crear tareas, reprogramar fechas y sugerir responsables dentro de Planner.   
\* Geni aparece en sugerencias inline dentro de Planner. 

Acciones rápidas aplicables:

\* Crear tarea.  
\* Crear evento.  
\* Abrir Geni para ayuda contextual.  
\* Sugerir responsable.  
\* Reprogramar fecha.  
\* Revisar carga de tareas.  
\* Resolver tareas atrasadas.

Clasificación:

\* Crear tarea: aplicable al MVP visual/interactivo.  
\* Crear evento: aplicable al MVP visual/interactivo si el Planner incluye Calendar.  
\* Abrir Geni: demo/soporte visual, no IA real.  
\* Sugerir responsable: puede ser mock o sugerencia local.  
\* Reprogramar fecha: acción real si el MVP permite editar fecha; si viene desde Geni, requiere confirmación.  
\* Redistribuir carga: POST-MVP o demo sugerida, no reasignación automática.

\---

\#\# 11\. Home relacionado con Planner

\#\#\# Home como resumen

El documento define que Home resume información pero no administra, y que toda información en Home conduce al módulo que la administra. 

Aplicación:

\* Home muestra resumen de Planner.  
\* Planner administra tareas y eventos.  
\* Desde Home se debe poder entrar a Planner.

\#\#\# Briefing

Briefing:

\* Es el primer widget de Home.  
\* Es una única card.  
\* Tiene versión resumida permanente.  
\* Tiene versión ampliada cuando hay cambios relevantes. 

Aplicación Planner:

\* El Briefing puede incluir tareas atrasadas.  
\* Puede incluir tareas sin dueño activo.  
\* Puede incluir eventos solapados.  
\* Puede incluir conflictos de agenda.  
\* Puede incluir carga desigual de tareas.  
\* Puede incluir próximos eventos.

\#\#\# Atención requerida

Aunque este documento no desarrolla completamente la UI de Atención Requerida, el archivo de comprensión indica que Home contiene AtenciónRequerida y que Home resume Task y Event. 

Aplicación Planner:

\* Tareas vencidas pueden aparecer en Atención requerida.  
\* Eventos conflictivos pueden aparecer en Atención requerida.  
\* Pendientes relevantes de Planner pueden navegar hacia Planner.

\#\#\# Carga familiar

El documento permite a Geni analizar carga de trabajo por miembro y coordinar distribución de tareas. 

Aplicación Home/Planner:

\* Home puede mostrar un resumen de carga.  
\* Planner puede tener vista/lista filtrada por responsable.  
\* La carga desigual puede generar sugerencia o informe al Coordinador.

\#\#\# Reglas de escalamiento visibles en Home

\* Nivel 4 puede aparecer en Briefing familiar.  
\* Ejemplo encontrado: “Hay 3 tareas sin dueño activo esta semana. Como familia, ¿quieren redistribuirlas?” 

\---

\#\# 12\. Patrones visuales reutilizables

\#\#\# Aplicable ahora a Planner

No hay capturas visuales ni diseño detallado de pantalla en este documento. Aun así, se pueden extraer patrones UX:

\* Card única de Briefing.  
\* Sugerencias inline.  
\* Alertas progresivas.  
\* Lenguaje neutral.  
\* Navegación mobile-first.  
\* Acciones a máximo 3 niveles.  
\* Planner como tab principal.  
\* Quick Actions para crear/consultar rápido.  
\* Home como resumen, Planner como administración.  
\* Badges o estados para tareas atrasadas, eventos solapados y carga desigual.  
\* Separación clara entre dato visible y alerta activa.

\#\#\# Referencia visual para más adelante

\* Versión resumida y ampliada del Briefing.  
\* Visibilidad progresiva: privado → Coordinador → Briefing familiar.  
\* Cards de recomendación con CTA humano.  
\* Indicadores de carga de trabajo por miembro.  
\* Sugerencias de redistribución no automáticas.  
\* Alertas de agenda con tono neutro.

\#\#\# No aplicable

\* Pantalla completa de Geni como módulo propio.  
\* IA real.  
\* Presence GPS real.  
\* Automatizaciones reales.  
\* Auditoría completa visual.  
\* Feed.  
\* SOS.  
\* FamilyCloud.  
\* Finance completo.  
\* Inventory completo.  
\* Assets completo.

\---

\#\# 13\. Reglas funcionales extraídas

\* Geni puede crear tareas, reprogramar fechas, sugerir responsables, analizar carga de trabajo y coordinar distribución de tareas.   
\* Geni no puede marcar tareas como completadas automáticamente.   
\* Geni no puede reasignar tareas unilateralmente.   
\* Reasignar tareas requiere aprobación del responsable o del Coordinador.   
\* Geni no debe actuar como juez ni acusar personas.   
\* Geni debe presentar datos objetivos.  
\* Planner debe permitir acción humana explícita para cambios sensibles.  
\* Una tarea atrasada no debe generar alerta fuerte.  
\* Tres tareas atrasadas sí pueden activar intervención.   
\* Las alertas deben basarse en patrones/acumulación, no en cada incidente aislado.   
\* Home resume información, Planner administra.   
\* Toda información en Home debe conducir al módulo que la administra.   
\* Home siempre es la pantalla inicial.   
\* Bottom Nav V1: Home, People, \+, Planner, More.   
\* Geni no tiene tab propio en Bottom Nav; vive en Quick Actions y como capa transversal.   
\* Más de 4 niveles de navegación es fallo.  
\* Objetivo: 95% de acciones en 3 niveles o menos.   
\* Mobile First confirmado.   
\* Task representa trabajo pendiente o realizado.   
\* Task puede tener prioridad Baja, Media, Alta o Crítica.   
\* Vencida es calculada.   
\* Event no tiene estado Postergado; postergar equivale a modificar fecha.   
\* Responsabilidad agrupa áreas operativas del hogar.  
\* Una tarea tiene una única responsabilidad principal. 

\---

\#\# 14\. Ideas derivadas útiles

\* Propuesta UX derivada / requiere validación del usuario: En Planner, mostrar una card superior “Sugerencias” con recomendaciones de Geni mockeadas/locales, por ejemplo “Hay 3 tareas atrasadas. ¿Querés reorganizarlas?”.  
\* Propuesta UX derivada / requiere validación del usuario: En la lista de tareas, usar chips de responsabilidad como \`Compras\`, \`Mascotas\`, \`Limpieza\`, \`Vehículos\`, porque el documento define Responsabilidad como agrupador operativo.  
\* Propuesta UX derivada / requiere validación del usuario: Mostrar un pequeño indicador de carga por miembro en Planner, usando barras simples o contadores, porque Geni analiza carga de trabajo por miembro.  
\* Propuesta UX derivada / requiere validación del usuario: En Home, crear una card “Planner hoy” con próximas tareas, eventos y una CTA “Ver Planner”.  
\* Propuesta UX derivada / requiere validación del usuario: El botón \`+\` debería abrir acciones rápidas: “Nueva tarea”, “Nuevo evento”, “Preguntar a Geni”.  
\* Propuesta UX derivada / requiere validación del usuario: Si una tarea está vencida, mostrarla como vencida pero no disparar una alerta agresiva hasta que haya acumulación.  
\* Propuesta UX derivada / requiere validación del usuario: Si hay 3+ tareas atrasadas, mostrar banner neutral: “Hay 3 tareas atrasadas. ¿Querés revisar la carga?”.  
\* Propuesta UX derivada / requiere validación del usuario: Usar copy neutral y familiar, evitando términos punitivos como “culpa”, “falló”, “incumplió”.  
\* Propuesta UX derivada / requiere validación del usuario: Para conflictos de eventos, mostrar badge “Conflicto” y CTA “Revisar horario”, sin modificar automáticamente.  
\* Propuesta UX derivada / requiere validación del usuario: En detalle de tarea, incluir sección futura “Actividad” solo como placeholder visual si se desea anticipar Timeline, pero no implementar comentarios/adjuntos reales en MVP.

\---

\#\# 15\. Decisiones que quedan abiertas

\* Diseño exacto de pantalla principal de Planner.  
\* Si Planner tendrá tabs: Tasks / Calendar / Templates / Responsabilidades.  
\* Si la vista inicial de Planner será lista de tareas, calendario o resumen.  
\* Formulario exacto de crear tarea.  
\* Formulario exacto de crear evento.  
\* Campos exactos de Task.  
\* Campos exactos de Event.  
\* Estados definitivos de Task para MVP actual.  
\* Cómo mapear Pendiente / En progreso / Completada / Cancelada con estados MVP si son distintos.  
\* Si la verificación tendrá estado propio o solo finaliza en Completada.  
\* Cómo representar prioridades visualmente.  
\* Cómo representar responsables.  
\* Cómo representar responsabilidad/categoría/template sin duplicar conceptos.  
\* Qué templates predefinidas exactas usar.  
\* Si recurrencia entra en MVP visual actual.  
\* Si Calendar muestra día/semana/mes.  
\* Cómo mostrar tareas con fecha dentro del calendario.  
\* Qué acciones exactas aparecen en Quick Actions.  
\* Qué parte de Geni será mock, local o real.  
\* Cómo manejar permisos de Coordinator, Adult, Adolescent, Child, Senior y Guest en Planner.  
\* Qué errores o empty states mostrar.  
\* Contratos API.  
\* Estados de loading/skeleton/error.

\---

\#\# 16\. Qué NO debe entrar al MVP actual

\* IA real de Geni.  
\* Automatizaciones reales.  
\* Reasignación automática de tareas.  
\* Completar tareas automáticamente.  
\* Modificación/cancelación automática de eventos.  
\* Presence GPS real.  
\* Detección real de retrasos por ubicación.  
\* Push notifications reales.  
\* Auditoría completa.  
\* Offline sync real.  
\* Timeline completo de tarea.  
\* Comentarios reales en tareas.  
\* Adjuntos reales en tareas.  
\* Dependencias complejas de tareas.  
\* Subtareas complejas.  
\* Goals completo.  
\* Hitos/Milestones como módulo real.  
\* Reconocimiento de patrones avanzado.  
\* Escalamiento real automatizado de N1 a N4.  
\* Conflicto recurrente detectado automáticamente por IA.  
\* Memorias de Geni.  
\* Búsqueda global con contexto cruzado.  
\* Finance real.  
\* Inventory real.  
\* Assets real.  
\* FamilyCloud real.  
\* Feed real.  
\* SOS real.

\---

\#\# 17\. Extractos o referencias internas importantes

\* \`7.1 Definición de Geni\`: Geni es capa transversal, no chatbot aislado; aparece en Briefing, notificaciones, sugerencias inline, búsqueda global, tarjetas de memoria y pantalla completa vía Quick Actions.   
\* \`7.1.2 Qué NO es Geni\`: no es juez, no reemplaza conversación humana, no es ejecutor autónomo, no es vigilante acusatorio.   
\* \`7.2.1 Tabla de Capacidades por Dominio\`: Planner puede recibir creación de tareas, reprogramación, sugerencia de responsables, análisis de carga y coordinación; no permite completar ni reasignar automáticamente.   
\* \`7.2.2 Restricciones Absolutas\`: nunca ignora permisos, nunca marca tareas como completadas automáticamente, nunca reasigna unilateralmente.   
\* \`7.3 Sistema de Escalamiento\`: intervención progresiva, primero privada, luego Coordinador, luego Briefing familiar.  
\* \`7.4 Umbrales de Intervención\`: una tarea atrasada no dispara alerta fuerte; 3 tareas atrasadas sí activan intervención.   
\* \`7.6 Guardrails\`: conflicto de agenda recurrente y asimetría persistente de carga como patrones relevantes para Planner.   
\* Archivo de comprensión / Entities: Task, Event, Goal, Responsabilidad, PlantillaTarea, Verificación, Subtarea, DependenciaTarea, Comentario, Adjunto y Timeline.   
\* Archivo de comprensión / Architectural Decisions: Bottom Navigation, Home resume pero no administra, Quick Actions, Mobile First y límite de profundidad de navegación. 

\---

\#\# 18\. Conclusión operativa

Este documento aporta principalmente filosofía de interacción, restricciones y reglas de coordinación para el frontend ideal de Planner. No aporta una pantalla final de Planner ni contratos técnicos, pero sí define cómo debe sentirse el módulo: claro, no invasivo, humano, neutral, orientado a coordinación familiar y con acciones explícitas del usuario.

Partes que deben usarse en la spec final:

\* Geni como sugerencias inline, no como chatbot central.  
\* Planner en Bottom Nav.  
\* Acciones rápidas desde \`+\`.  
\* Home como resumen y Planner como administración.  
\* Briefing como card de Home que puede incluir información de Planner.  
\* Tono neutral para tareas atrasadas, carga desigual y conflictos.  
\* No completar tareas automáticamente.  
\* No reasignar tareas sin aprobación.  
\* Alertas por patrones y acumulación.  
\* Mobile First.  
\* Navegación corta.  
\* Responsabilidad como agrupador operativo de tareas.  
\* Prioridades y estados encontrados de Task como referencia.  
\* Estados de Event como referencia.

Partes que deben ignorarse o dejarse fuera por ahora:

\* IA real.  
\* Automatizaciones reales.  
\* Presence GPS.  
\* Auditoría completa.  
\* Offline sync.  
\* Comentarios, adjuntos, timeline y dependencias complejas.  
\* Goals completo.  
\* Búsqueda global.  
\* Memorias de Geni.  
\* Escalamiento real automático.  
\* Módulos no Planner como Finance, Inventory, Assets, FamilyCloud, SOS y Feed.

\# planner\_frontend\_fragment\_data\_philosophy

\#\# 1\. Fuente

\* Documento: \`HomePlus — SECCION 8 DATA PHILOSOPHY.md\`  
\* Archivo de comprensión asociado: \`Seccion 8 Filosofia de la Informacion.txt\`  
\* Source map previo usado como referencia interna: \`source\_map\_SECCION\_8\_DATA\_PHILOSOPHY.md\`  
\* Tipo de documento: Filosofía de datos / privacidad / retención / clasificación de información.  
\* Alcance del documento: Define principios de ownership, portabilidad, minimización, transparencia, trazabilidad, clasificación de datos, retención, privacidad por defecto, RLS, exportación y decisiones de datos.  
\* Nivel de utilidad para Planner Frontend: Medio.  
\* Motivo: No define pantallas específicas de Planner ni diseño visual detallado, pero aporta reglas muy importantes para cómo mostrar tareas, eventos, calendario, historial, privacidad, visibilidad, eliminación, Home, Quick Actions y confianza del usuario. 

\---

\#\# 2\. Resumen útil para Planner Frontend

Este documento aporta criterios de frontend para que Planner sea confiable, transparente y respetuoso de la privacidad familiar.

Lo más útil para Planner Frontend:

\* Las tareas y eventos son \*\*datos de coordinación\*\* cuando pertenecen al hogar.  
\* Las tareas personales y eventos personales son \*\*privados por defecto\*\*.  
\* Las tareas completadas y eventos pasados forman parte de la memoria histórica del hogar.  
\* Las tareas y eventos eliminados van a papelera durante 30 días antes del borrado definitivo.  
\* Cualquier acción importante sobre datos del hogar debe dejar huella conceptual de auditoría.  
\* Home resume y redirige; Planner administra.  
\* Planner aparece como tab principal en Bottom Nav.  
\* Quick Actions existe como botón \`+\` en Bottom Nav.  
\* Las responsabilidades agrupan áreas operativas como Compras, Mascotas, Limpieza y Vehículos.  
\* Rachas y Goals aparecen como información futura o derivada, no como foco del MVP actual.  
\* Exportación aparece como capacidad de datos futura/avanzada, no como prioridad visual del Planner MVP.

\---

\#\# 3\. Principios de producto aplicables

\#\#\# 3.1 Ownership / datos del hogar

\* La familia es dueña de sus datos.  
\* HomePlus administra los datos, no los posee.  
\* El usuario debe poder ver sus datos.  
\* El usuario debe saber qué datos existen.  
\* Aplicación a Planner Frontend:

  \* Las tareas y eventos no deben sentirse “propiedad de la app”.  
  \* La UI debería mostrar claramente si una tarea/evento pertenece al hogar o es personal.  
  \* La UI debería evitar ocultar acciones críticas como ver, completar, eliminar o entender el estado de una tarea.

\#\#\# 3.2 Minimización

\* HomePlus no aspira a saber todo del hogar.  
\* Solo guarda lo necesario para coordinar.  
\* El documento menciona tareas, eventos y gastos como datos que sí se guardan porque son núcleo de coordinación.  
\* Aplicación a Planner Frontend:

  \* Formularios de tarea/evento deberían pedir solo lo necesario.  
  \* Evitar campos innecesarios en creación rápida.  
  \* Evitar que una tarea simple requiera demasiadas decisiones.  
  \* La pantalla ideal de Planner debería priorizar título, responsable, fecha, estado y responsabilidad/categoría antes que metadata avanzada.

\#\#\# 3.3 Transparencia

\* El usuario debe saber qué se guarda y por qué.  
\* El documento menciona mecanismos como inventario de datos, indicador de contexto, log de accesos, notificación de nuevos usos y consulta directa a Geni.  
\* Aplicación a Planner Frontend:

  \* Si se muestran datos de Planner en Home o Briefing, debería ser claro de dónde vienen.  
  \* Si una tarea/evento es visible para todos, la UI debería indicarlo.  
  \* Si una tarea/evento es personal, la UI debería marcarlo como privado.  
  \* Las acciones destructivas deberían explicar qué pasa después: “va a papelera 30 días”, no “se borra” sin contexto.

\#\#\# 3.4 Trazabilidad

\* Las acciones importantes dejan huella.  
\* Toda acción sobre datos del hogar: crear, modificar, eliminar, compartir o exportar genera registro de auditoría.  
\* Aplicación a Planner Frontend:

  \* Crear, editar, completar, verificar, eliminar o compartir tareas/eventos debería tener feedback claro.  
  \* La UI puede mostrar mensajes de confirmación o estados de “actualizado”.  
  \* Auditoría completa queda fuera del MVP actual, pero el frontend debería no contradecir esa lógica.

\#\#\# 3.5 Privacidad por defecto

\* Cada dato nace con visibilidad predefinida según su clasificación.  
\* El usuario puede abrir un dato; el sistema no debería abrirlo automáticamente.  
\* Aplicación a Planner Frontend:

  \* Las tareas personales deben aparecer solo para el dueño, salvo que se compartan.  
  \* Los eventos personales deben aparecer solo para el dueño, salvo que se compartan.  
  \* Las tareas del hogar y eventos del hogar pueden ser visibles para miembros del hogar según permisos.  
  \* El frontend debe evitar mostrar datos personales en Home familiar si no corresponde.

\#\#\# 3.6 Home como resumen, no administración

\* El archivo de comprensión indica que Home no administra información; solo resume y redirige.  
\* Aplicación a Planner Frontend:

  \* Home puede mostrar tareas, eventos próximos y atención requerida.  
  \* Planner debe ser el lugar donde se crean, editan, completan, eliminan o gestionan tareas/eventos.  
  \* Desde Home debería existir navegación hacia Planner para ver detalle o administrar.

\---

\#\# 4\. UX/UI aplicable

\#\#\# Navegación

\* Bottom Nav aparece como estructura: \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\`.  
\* Planner aparece como tab principal.  
\* Quick Actions aparece como botón \`+\` en Bottom Nav.  
\* More contiene herramientas especializadas; Planner no vive en More según el archivo de comprensión.  
\* Home resume y redirige al módulo correspondiente.

Aplicación a Planner Frontend:

\* Planner debe estar en Bottom Nav como sección principal.  
\* El acceso desde Home a tareas/eventos debe llevar a Planner o a detalle dentro de Planner.  
\* El botón \`+\` puede abrir un panel flotante de creación, aunque este documento no define explícitamente “crear tarea” o “crear evento” como acción rápida.  
\* La navegación debería mantenerse corta; el archivo de comprensión marca como regla que más de 4 niveles es fallo y que el objetivo es que 95% de acciones estén a ≤3 niveles. 

\#\#\# Cards / widgets

El documento no define visualmente cards de Planner, pero sí menciona bloques de Home relevantes:

\* Briefing.  
\* Atención Requerida.  
\* Carga Familiar.  
\* Próximos Eventos.  
\* Tareas.  
\* Presence resumido.  
\* Actividad Familiar.

Aplicación a Planner Frontend:

\* Las tareas y eventos pueden representarse como cards/list items claros.  
\* Home puede tener widgets o cards que resuman tareas pendientes y próximos eventos.  
\* Atención Requerida puede centralizar tareas vencidas o vencimientos.  
\* Carga Familiar se relaciona con distribución de tareas, pero puede quedar como mock o futuro.

\#\#\# Estados UX

El documento aporta estados conceptuales más que visuales:

\* Tarea activa.  
\* Tarea completada.  
\* Tarea eliminada.  
\* Tarea en papelera.  
\* Evento futuro.  
\* Evento pasado.  
\* Evento eliminado.  
\* Evento recurrente eliminado.  
\* Evento cancelado.  
\* Dato privado.  
\* Dato visible por defecto.  
\* Dato compartido.  
\* Dato exportable.  
\* Dato eliminado definitivamente.

Aplicación a Planner Frontend:

\* Las tareas completadas no deberían desaparecer sin explicación; forman parte del historial.  
\* Las tareas eliminadas deberían mostrar feedback de papelera.  
\* Los eventos pasados deberían poder sentirse como historial.  
\* Los eventos eliminados deberían distinguirse de eventos pasados.  
\* Las tareas/eventos personales deberían tener indicador de privacidad o visibilidad.

\#\#\# Copywriting y feedback

El documento no define textos concretos de Planner, pero sugiere reglas de claridad:

\* Explicar qué se guarda.  
\* Explicar por qué se guarda.  
\* Explicar qué pasa con los datos eliminados.  
\* No usar letra chica.  
\* No generar incertidumbre sobre privacidad.

Aplicación a Planner Frontend:

\* Confirmación al eliminar tarea: debe aclarar que va a papelera 30 días.  
\* Confirmación al eliminar evento: debe aclarar papelera 30 días.  
\* En eventos recurrentes, si se implementa, la UI debe permitir elegir “este evento” o “toda la serie”.  
\* En datos personales, usar labels claros como “Personal”, “Solo vos”, “Compartido con el hogar” o equivalente, si la spec final lo valida.

\---

\#\# 5\. Información directa sobre Planner

\#\#\# Entidades directas detectadas en el archivo de comprensión

\* \`Task\`: trabajo pendiente o realizado.  
\* \`Subtarea\`: único nivel de anidamiento bajo Task.  
\* \`Dependencia\`: relación entre tareas; si la previa no se completa, la dependiente queda bloqueada.  
\* \`Recurrencia\`: genera nuevas instancias de tareas; no reutiliza la misma; preserva historial.  
\* \`Verificación\`: opcional; cuando se verifica, Completada pasa a estado final; no existe estado separado en este documento.  
\* \`PlantillaTarea\`: plantillas de tareas, inicialmente solo para Tasks.  
\* \`Responsabilidad\`: agrupa áreas operativas del hogar.  
\* \`Calendar\`: administra eventos familiares y personales.  
\* \`Event\`: entidad de calendario.  
\* \`Goal\`: objetivo personal o familiar.  
\* \`Hito\`: gran avance dentro de una meta. 

\#\#\# Relaciones directas detectadas

\* Hogar contiene Planner.  
\* Planner contiene Task.  
\* Planner contiene Calendar.  
\* Task referencia Persona.  
\* Task puede requerir Verificación.  
\* Task referencia Responsabilidad.  
\* Task puede referenciar Goal.  
\* Event pertenece a Calendar.  
\* Event referencia Persona.  
\* PlantillaTarea genera Task.  
\* Racha deriva de Task.  
\* Briefing referencia Task/Event.  
\* Auditoría registra Task/Event.  
\* Exportación exporta Task/Event.  
\* BottomNav navega a Planner.

\#\#\# Información directa aplicable al frontend

\* Planner debe poder representar tareas y calendario/eventos.  
\* Task es una entidad de Planner.  
\* Calendar es una feature dentro de Planner.  
\* Event pertenece a Calendar.  
\* Persona aparece como responsable o participante relacionado.  
\* Responsabilidad funciona como agrupador operativo.  
\* PlantillaTarea funciona como mecanismo de creación de tareas.  
\* Home y Briefing pueden consumir Task/Event como resumen, pero no administrarlos.

\---

\#\# 6\. Información sobre Tasks

\#\#\# MVP actual

Información explícita o aplicable al MVP actual:

\* Las tareas son datos de coordinación cuando son tareas del hogar.  
\* Las tareas personales son datos personales.  
\* Las tareas del hogar son visibles por defecto para todos los miembros.  
\* Las tareas personales son visibles solo para el dueño y pueden compartirse.  
\* Las tareas activas se guardan mientras el hogar existe; no expiran.  
\* Las tareas completadas se guardan como historial permanente.  
\* Las tareas eliminadas van a papelera 30 días y luego se eliminan definitivamente.  
\* Cualquier miembro puede eliminar sus propias tareas.  
\* El coordinador puede eliminar cualquier tarea.  
\* Las tareas eliminadas son recuperables por el dueño o el coordinador.  
\* Las tareas completadas no se archivan: completada \= histórico.  
\* Las tareas eliminadas no se archivan: eliminada \= papelera 30 días → borrado.  
\* Las tareas completadas son parte de la memoria emocional del hogar.  
\* Las tareas eliminadas se destruyen para no acumular ruido.  
\* Task representa trabajo pendiente o realizado.  
\* Estados encontrados en archivo de comprensión: Pendiente, En progreso, Completada, Cancelada.  
\* Vencida es calculada.  
\* Task referencia Persona.  
\* Task referencia Responsabilidad.  
\* Responsabilidad agrupa áreas operativas del hogar como Compras, Mascotas, Limpieza y Vehículos.  
\* PlantillaTarea genera Task.  
\* Las rachas derivan de tareas, pero no son foco del MVP actual.

\#\#\# POST-MVP / futuro

Marcar como POST-MVP o futuro:

\* Subtareas.  
\* Dependencias entre tareas.  
\* Recurrencia avanzada de tareas.  
\* Verificación si se implementa con lógica distinta a la del MVP actual.  
\* Rachas.  
\* Goals vinculados a tareas.  
\* Exportación de tareas.  
\* Auditoría completa visible o gestionable.  
\* Plantillas personalizadas o CRUD de plantillas, si aparecieran en otra fuente.  
\* Adjuntos o documentos vinculados a tareas.  
\* Automatizaciones que crean tareas.  
\* Métricas avanzadas de carga familiar.

\#\#\# Dudas o decisiones abiertas

\* El documento no define campos concretos de Task para frontend, salvo lo inferido por entidades del archivo de comprensión.  
\* No define prioridades.  
\* No define fecha límite en detalle.  
\* No define formularios de creación/edición.  
\* No define filtros/tabs dentro de Tasks.  
\* No define UI de verificación compatible con los estados MVP \`pending\`, \`completed\`, \`awaiting\_verification\`, \`verified\`.  
\* Hay diferencia entre los estados del archivo de comprensión y los estados MVP esperados:

  \* Documento/comprensión: Pendiente, En progreso, Completada, Cancelada.  
  \* MVP esperado por el usuario: pending, completed, awaiting\_verification, verified.  
\* No define cómo se visualiza una tarea vencida; solo indica que vencida es calculada.  
\* No define templates predefinidas exactas del MVP actual como Limpieza, Compras, Mascotas, Medicación, Estudios, Pagos; sí menciona responsabilidades como Compras, Mascotas, Limpieza y Vehículos.

\---

\#\# 7\. Información sobre Calendar / Events

\#\#\# MVP actual

Información explícita o aplicable al MVP actual:

\* Calendar administra eventos familiares y personales.  
\* Event pertenece a Calendar.  
\* Event referencia Persona.  
\* Eventos del hogar son datos de coordinación.  
\* Eventos personales son datos personales.  
\* Eventos del hogar son visibles por defecto para miembros del hogar.  
\* Eventos personales son visibles solo para el dueño y pueden compartirse.  
\* Eventos futuros se guardan indefinidamente mientras el hogar existe.  
\* Eventos pasados se guardan como historial permanente.  
\* Eventos eliminados van a papelera 30 días y luego se eliminan definitivamente.  
\* Los eventos son parte de la narrativa del hogar.  
\* El creador o el coordinador puede eliminar eventos.  
\* Los eventos eliminados no deberían contaminar el calendario.  
\* Estados encontrados para Event en el archivo de comprensión: Programado, Completado, Cancelado.  
\* No existe “Postergado” según el archivo de comprensión.  
\* Calendar alimenta Próximos Eventos en Home.  
\* Briefing puede referenciar eventos.

\#\#\# POST-MVP / futuro

Marcar como POST-MVP o futuro:

\* Participantes avanzados.  
\* Estados avanzados de asistencia.  
\* Integración con FamilyCloud/álbumes.  
\* Recurrencia compleja.  
\* Exportación iCalendar.  
\* Auditoría completa de eventos.  
\* Automatizaciones que crean eventos.  
\* Presence real o ubicación real vinculada a eventos.

\#\#\# Dudas o decisiones abiertas

\* El documento no define vistas día/semana/mes.  
\* No define layout de calendario.  
\* No define agenda.  
\* No define campos concretos de evento como título, fecha/hora, ubicación, descripción.  
\* No define si las tareas con fecha aparecen dentro del calendario, aunque esa regla puede venir de otros documentos.  
\* No define creación rápida de evento.  
\* No define edición/cancelación visual salvo políticas de eliminación/cancelación.  
\* Para eventos recurrentes eliminados, el documento sí menciona elección entre “este evento” o “toda la serie”, pero la recurrencia compleja queda fuera del MVP actual salvo que otra fuente la limite.

\---

\#\# 8\. Información sobre Goals

\#\#\# Información encontrada

\* Goal aparece como objetivo personal o familiar.  
\* Estructura: Goal → Hitos → Tasks.  
\* Estados de Goal: Activa, Completada, Fallida.  
\* Hito aparece como gran avance dentro de una meta.  
\* Logros están integrados en Goals y no son entidad de datos independiente.  
\* Rachas son personales y derivadas de tareas.  
\* Rachas son visibles solo para el dueño; si el dueño es niño, son visibles para padres.  
\* Las rachas son permanentes mientras el miembro está en el hogar.  
\* Si las tareas se eliminan, las rachas asociadas se recalculan.

\#\#\# Aplicación al frontend de Planner

\* Goals puede aparecer como referencia futura o visual, pero no como foco MVP actual.  
\* La relación Goal → Hitos → Tasks puede inspirar una futura vista de progreso.  
\* No debe bloquear el diseño MVP de Tasks/Calendar.  
\* No convertir Goals en módulo real actual desde este documento.

\#\#\# Fuera del MVP actual

\* Goals completo.  
\* Hitos.  
\* Logros.  
\* Rachas avanzadas.  
\* Progreso visual avanzado.  
\* Recalcular rachas.

\---

\#\# 9\. Responsabilidades, templates y categorías

\#\#\# Responsabilidades

Información encontrada:

\* Responsabilidad agrupa áreas operativas del hogar.  
\* Ejemplos explícitos: Compras, Mascotas, Limpieza, Vehículos.  
\* Responsabilidad es eje organizador dentro de Tasks.  
\* Task referencia Responsabilidad.

Aplicación a Planner Frontend:

\* Las tareas pueden agruparse visualmente por responsabilidad.  
\* Las cards de tareas pueden mostrar responsabilidad como chip o badge.  
\* Responsabilidad puede funcionar como categoría operativa visible.  
\* Compras, Mascotas, Limpieza y Vehículos son categorías/responsabilidades extraíbles de este documento.

\#\#\# Templates

Información encontrada:

\* PlantillaTarea existe como feature.  
\* Las plantillas son inicialmente solo para Tasks.  
\* PlantillaTarea genera Task.  
\* No se detallan templates concretas en el documento principal.  
\* No se define CRUD de templates.

Aplicación a Planner Frontend:

\* Las templates pueden tratarse como atajos de creación de tarea.  
\* Para este documento, no hay suficiente información para definir UI de templates.  
\* No inventar templates nuevas desde esta fuente.

\#\#\# Categorías

Información encontrada:

\* El documento no usa explícitamente “categoría” para Planner como modelo visual.  
\* La clasificación de datos sí distingue coordinación, personales, sensibles y auditoría.  
\* Responsabilidad puede cubrir parcialmente el rol de categoría operativa para tareas.

Aplicación a Planner Frontend:

\* No duplicar responsabilidad y categoría sin validación posterior.  
\* La UI puede usar “Responsabilidad” como agrupador operativo si la spec final lo confirma.  
\* La UI puede usar “Personal / Hogar” como clasificación de privacidad/visibilidad, no como categoría operativa.

\---

\#\# 10\. Quick Actions aplicables a Planner

\#\#\# Información encontrada

\* QuickActions aparece como botón \`+\` en Bottom Nav.  
\* QuickActions es un panel flotante.  
\* Geni aparece fijo siempre primero.  
\* Las acciones son dinámicas.  
\* QuickActions aprende por frecuencia.  
\* El archivo de comprensión menciona que QuickActions puede aprender de Task porque registra frecuencia de creación de tareas para reordenar.  
\* El archivo de comprensión menciona flujo: QuickActions \`+\` → formulario modal de creación.

\#\#\# Aplicación a Planner Frontend

\* QuickActions puede ser el lugar natural para creación rápida.  
\* El documento no dice explícitamente “Crear tarea” o “Crear evento” como acción rápida.  
\* No se debe inventar la lista definitiva de acciones desde esta fuente.  
\* Sí puede usarse como principio: el botón \`+\` debe facilitar acciones frecuentes del hogar.

\#\#\# POST-MVP / futuro

\* Aprendizaje real por frecuencia.  
\* Reordenamiento inteligente.  
\* Geni real como slot fijo con IA.  
\* Automatizaciones desde QuickActions.

\---

\#\# 11\. Home relacionado con Planner

\#\#\# Información encontrada

Home aparece como centro operativo que resume, no administra.

Estructura de Home según archivo de comprensión:

\* Briefing.  
\* Atención Requerida.  
\* Carga Familiar.  
\* Próximos Eventos.  
\* Tareas.  
\* Finanzas Relevantes.  
\* Presence Resumido.  
\* Actividad Familiar.

Aplicación directa a Planner:

\* Home puede mostrar tareas.  
\* Home puede mostrar próximos eventos.  
\* Atención Requerida puede mostrar tareas vencidas o vencimientos.  
\* Carga Familiar se relaciona con distribución de tareas entre miembros.  
\* Briefing puede resumir eventos y tareas.  
\* Home debe redirigir hacia Planner para administración.

\#\#\# Tareas en Home

\* Tareas del hogar pueden aparecer como datos de coordinación.  
\* Tareas pendientes/vencidas pueden alimentar Atención Requerida.  
\* Tareas completadas pueden afectar historial o memoria del hogar.  
\* Home no debe reemplazar la vista completa de Planner.

\#\#\# Eventos en Home

\* Próximos Eventos aparece como bloque de Home.  
\* Eventos futuros se conservan mientras el hogar existe.  
\* Eventos pasados son historial.  
\* Eventos eliminados no deberían contaminar calendario ni Home.

\#\#\# Briefing

\* Briefing puede referenciar Task/Event.  
\* Para MVP actual, Geni real no debe implementarse desde este documento.  
\* Briefing puede tratarse como resumen mock o texto generado con datos simples en una etapa posterior.

\#\#\# Carga Familiar

\* Carga Familiar representa métricas de distribución de tareas.  
\* El documento indica que las métricas de carga son datos de coordinación visibles solo para Coordinador.  
\* Para MVP actual, Carga Familiar puede quedar como mock o referencia futura si no hay backend real.

\---

\#\# 12\. Patrones visuales reutilizables

\#\#\# Aplicable ahora a Planner

\* Diferenciar visualmente:

  \* tarea del hogar;  
  \* tarea personal;  
  \* evento del hogar;  
  \* evento personal;  
  \* completado;  
  \* eliminado/en papelera;  
  \* histórico;  
  \* vencido calculado;  
  \* visible para todos;  
  \* privado.  
\* Usar chips/badges de visibilidad:

  \* Personal.  
  \* Hogar.  
  \* Compartido.  
\* Usar chips/badges de responsabilidad:

  \* Compras.  
  \* Mascotas.  
  \* Limpieza.  
  \* Vehículos.  
\* Mostrar feedback claro en eliminación:

  \* Papelera 30 días.  
  \* Recuperable por dueño/coordinador.  
\* Mostrar Home como resumen:

  \* Tareas.  
  \* Próximos eventos.  
  \* Atención requerida.

\#\#\# Referencia visual para más adelante

\* Inventario de datos en Configuración → Mis Datos.  
\* Log de accesos en Configuración → Privacidad.  
\* Exportación de datos.  
\* Auditoría.  
\* Rachas.  
\* Métricas de carga.  
\* Goals.

\#\#\# No aplicable

\* Cifrado visual avanzado.  
\* Log crudo de auditoría.  
\* Exportación completa desde Planner MVP.  
\* Presence GPS.  
\* Geni real.  
\* Automatizaciones reales.  
\* Finanzas reales.  
\* HomeCloud real.

\---

\#\# 13\. Reglas funcionales extraídas

\* Las tareas activas se guardan mientras el hogar existe.  
\* Las tareas activas no expiran.  
\* Las tareas completadas se guardan como historial permanente.  
\* Las tareas eliminadas van a papelera 30 días.  
\* Las tareas eliminadas luego se eliminan definitivamente.  
\* Cualquier miembro puede eliminar sus propias tareas.  
\* El coordinador puede eliminar cualquier tarea.  
\* Las tareas eliminadas son recuperables por el dueño o coordinador durante 30 días.  
\* Las tareas completadas no se archivan.  
\* Los eventos futuros se guardan indefinidamente mientras el hogar existe.  
\* Los eventos pasados se guardan como historial permanente.  
\* Los eventos eliminados van a papelera 30 días.  
\* Los eventos eliminados luego se eliminan definitivamente.  
\* El creador o coordinador puede eliminar eventos.  
\* Los eventos recurrentes, al eliminar, requieren elegir “este evento” o “toda la serie”.  
\* Al eliminar una serie completa, la papelera aplica a eventos futuros; los pasados se preservan como historial.  
\* Las tareas del hogar son datos de coordinación.  
\* Los eventos del hogar son datos de coordinación.  
\* Las tareas personales son datos personales.  
\* Los eventos personales son datos personales.  
\* Las tareas personales son privadas por defecto.  
\* Los eventos personales son privados por defecto.  
\* Las tareas personales pueden compartirse con miembros específicos o todo el hogar.  
\* Los eventos personales pueden compartirse con miembros específicos o todo el hogar.  
\* RLS filtra cada consulta por permisos del miembro.  
\* Geni hereda permisos del miembro que consulta.  
\* Home no administra información; solo resume y redirige.  
\* Más de 4 niveles de navegación es fallo.  
\* Objetivo: 95% de acciones en 3 niveles o menos.  
\* Planner vive en Bottom Nav.  
\* QuickActions vive en botón \`+\`.  
\* Settings vive en More.  
\* Las rachas derivan de tareas.  
\* Logros se rastrean dentro de Goals; no son entidad independiente.  
\* Los datos de niños deben ser mínimos: nombre, avatar, tareas asignadas y rachas.  
\* Empleado Familiar no puede crear tareas, según archivo de comprensión.

\---

\#\# 14\. Ideas derivadas útiles

\* Propuesta UX derivada / requiere validación del usuario: En las cards de tarea, mostrar un chip de visibilidad “Hogar” o “Personal” para respetar privacidad por defecto.  
\* Propuesta UX derivada / requiere validación del usuario: En las cards de evento, mostrar un chip “Familiar” o “Personal” para evitar confusión sobre quién puede verlo.  
\* Propuesta UX derivada / requiere validación del usuario: Al completar una tarea, no removerla inmediatamente de la pantalla; moverla a una sección “Completadas hoy” o aplicar estado visual completado, porque el documento enfatiza historial permanente.  
\* Propuesta UX derivada / requiere validación del usuario: Al eliminar tarea/evento, mostrar toast: “Movido a papelera por 30 días”.  
\* Propuesta UX derivada / requiere validación del usuario: Usar “Responsabilidad” como filtro principal de Tasks: Compras, Mascotas, Limpieza, Vehículos.  
\* Propuesta UX derivada / requiere validación del usuario: En Home, usar una card “Atención requerida” que liste tareas vencidas y eventos próximos críticos, pero que lleve al detalle de Planner.  
\* Propuesta UX derivada / requiere validación del usuario: En Calendar, diferenciar eventos personales y del hogar con un indicador discreto de privacidad.  
\* Propuesta UX derivada / requiere validación del usuario: En creación rápida, pedir lo mínimo: título, fecha, responsable y responsabilidad; el documento apoya minimización, aunque no define el formulario.  
\* Propuesta UX derivada / requiere validación del usuario: Mostrar una microcopy en Planner tipo “Las tareas del hogar son visibles para quienes coordinan contigo” si se necesita explicar visibilidad.  
\* Propuesta UX derivada / requiere validación del usuario: No mostrar auditoría completa en Planner, pero sí mensajes de feedback que anticipen trazabilidad: “Cambio guardado”.

\---

\#\# 15\. Decisiones que quedan abiertas

\* UI específica de Planner.  
\* Tabs internas: Tasks / Calendar / Goals.  
\* Vista día/semana/mes.  
\* Agenda.  
\* Filtros de Tasks.  
\* Filtros de Calendar.  
\* Estados definitivos de Task para MVP.  
\* Cómo reconciliar estados del documento con estados MVP esperados.  
\* Campos obligatorios de Task.  
\* Campos obligatorios de Event.  
\* Prioridades.  
\* Fecha límite.  
\* Hora límite.  
\* Responsable.  
\* Participantes.  
\* Ubicación de evento.  
\* Recurrencia simple del MVP.  
\* Verification Flow visual.  
\* Templates predefinidas exactas.  
\* Si Responsabilidad y Categoría son lo mismo o entidades distintas.  
\* Si QuickActions incluirá “Crear tarea” y “Crear evento”.  
\* Cómo mostrar papelera en MVP.  
\* Si papelera debe ser pantalla visible o solo feedback.  
\* Cómo mostrar historial de tareas completadas.  
\* Cómo mostrar eventos pasados.  
\* Cómo mostrar tareas personales en Home.  
\* Cómo ocultar datos personales en Home familiar.  
\* Qué roles pueden editar o completar tareas.  
\* Qué roles pueden crear, editar o cancelar eventos.  
\* Qué permisos aplican a Guest, Child, Senior y Adolescent en Planner.  
\* UI de exportación.  
\* UI de auditoría.  
\* UI de Carga Familiar.

\---

\#\# 16\. Qué NO debe entrar al MVP actual

\* Auditoría completa visible.  
\* Exportación de datos desde Planner.  
\* Inventario de datos completo.  
\* Log de accesos a datos.  
\* Geni real.  
\* Briefing con IA real.  
\* Automatizaciones reales.  
\* Aprendizaje real de QuickActions.  
\* Rachas avanzadas.  
\* Goals completos.  
\* Hitos.  
\* Subtareas complejas.  
\* Dependencias entre tareas.  
\* Recurrencia compleja.  
\* Participantes avanzados.  
\* Presence GPS.  
\* Ubicación real.  
\* Finance real.  
\* Inventory real.  
\* Assets real.  
\* FamilyCloud real.  
\* Storage/OCR.  
\* Multi-hogar avanzado.  
\* Offline Sync.  
\* Permisos finos completos.  
\* Notificaciones push reales.

\---

\#\# 17\. Extractos o referencias internas importantes

\* \`8.1 Principios de Datos\`

  \* Ownership.  
  \* Portabilidad.  
  \* Minimización.  
  \* Transparencia.  
  \* Trazabilidad.

\* \`8.1.3 Minimización — Solo se guarda lo necesario para coordinar\`

  \* Tareas y eventos se guardan porque son núcleo de coordinación.

\* \`8.1.5 Trazabilidad — Las acciones importantes dejan huella\`

  \* Crear, modificar, eliminar, compartir y exportar generan auditoría.

\* \`8.2 Clasificación de Datos\`

  \* Datos de Coordinación.  
  \* Datos Personales.  
  \* Datos Sensibles.  
  \* Datos de Auditoría.

\* \`8.2.2 Tabla Completa de Clasificación por Tipo de Dato\`

  \* Tareas del hogar.  
  \* Tareas personales.  
  \* Eventos del hogar.  
  \* Eventos personales.  
  \* Rachas.  
  \* Métricas de carga.  
  \* Notificaciones.

\* \`8.3.1 Tareas — Historial\`

  \* Tareas activas, completadas, eliminadas, papelera, permisos de eliminación.

\* \`8.3.2 Eventos — Historial\`

  \* Eventos futuros, pasados, eliminados, recurrentes, papelera, permisos de eliminación.

\* \`8.3.10 Rachas\`

  \* Rachas derivadas de tareas.

\* \`8.3.12 Tabla Resumen de Retención\`

  \* Tareas completadas permanentes.  
  \* Tareas eliminadas 30 días.  
  \* Eventos pasados permanentes.  
  \* Eventos eliminados 30 días.

\* \`8.4 Privacidad por Defecto\`

  \* La privacidad se hereda.  
  \* El usuario puede abrir visibilidad, no el sistema.

\* \`8.4.1 Qué es Privado por Defecto\`

  \* Tareas personales.  
  \* Eventos personales.

\* \`8.5.3 Row Level Security (RLS)\`

  \* Consultas filtradas por permisos del miembro.

\* \`8.6 Exportación y Portabilidad\`

  \* Exportación como futuro/avanzado para Planner.

\* \`8.8 Decisiones de Datos Tomadas\`

  \* D-01 Historial de tareas y eventos permanente.  
  \* D-08 Papelera de 30 días para eliminaciones.

\* Archivo de comprensión asociado:

  \* \`OUTPUT 1 — ENTITIES\`: Task, Recurrencia, Verificación, PlantillaTarea, Responsabilidad, Calendar, Event, Goal, Home, QuickActions, BottomNav.  
  \* \`OUTPUT 2 — RELATIONSHIPS\`: Planner contiene Task/Calendar; Task referencia Persona/Responsabilidad; Event pertenece a Calendar; Briefing referencia Task/Event.  
  \* \`OUTPUT 5 — BUSINESS RULES\`: RLS, Home resume y redirige, navegación ≤3 niveles, QuickActions y BottomNav.  
  \* \`OUTPUT 6 — ARCHITECTURAL DECISIONS\`: historial permanente y papelera 30 días.

\---

\#\# 18\. Conclusión operativa

Este documento no aporta una UI completa de Planner, pero sí define reglas de datos esenciales para el frontend ideal:

\* Planner debe sentirse seguro, claro y transparente.  
\* Tareas y eventos deben distinguir entre hogar/personal.  
\* La eliminación debe comunicar papelera de 30 días.  
\* Completado y pasado no significan borrado: son historial.  
\* Home debe resumir tareas/eventos y redirigir a Planner.  
\* QuickActions puede ser una entrada de creación rápida, pero este documento no define acciones concretas.  
\* Responsabilidades como Compras, Mascotas, Limpieza y Vehículos pueden usarse como agrupadores visuales si la spec final lo confirma.  
\* Goals, rachas, subtareas, dependencias, auditoría, exportación y automatizaciones deben quedar como POST-MVP o referencia futura.  
\* La spec final de Planner Frontend debería usar este fragment principalmente para privacidad, visibilidad, retención, estados de eliminación, Home summary y confianza UX.  
\# planner\_frontend\_fragment\_design\_system\_v1

\#\# 1\. Fuente

\* Documento: \`HomePlus — Desing system v1.md\`   
\* Archivo de comprensión asociado: \`Design system v1.txt\`   
\* Tipo de documento: Design System / UX visual / reglas de componentes mobile-first.  
\* Alcance del documento: sistema visual, componentes base, navegación, estados UX, accesibilidad, patrones de interacción y decisiones arquitectónicas visuales para HomePlus.  
\* Nivel de utilidad para Planner Frontend: Alto.  
\* Motivo: el documento no define contratos backend ni modelo completo de Planner, pero sí define navegación, estructura visual, componentes reutilizables, interacción 1-tap para tareas, Quick Actions, Tab Bar interna, estados de carga/vacío/toast, accesibilidad, modo Senior y reglas emocionales aplicables directamente al frontend ideal de Planner.

\---

\#\# 2\. Resumen útil para Planner Frontend

Este documento aporta principalmente reglas visuales y de interacción para construir un Planner profesional, coherente y mobile-first.

Aporta información útil para:

\* Ubicación de Planner en la navegación principal.  
\* Subestructura interna de Planner: \`Tasks | Calendar | Goals\`.  
\* Uso de \`Responsabilidades\` como eje organizador de tareas.  
\* Acción principal de tareas mediante checkbox 1-tap.  
\* Creación rápida de tareas y eventos desde FAB y Quick Actions.  
\* Uso de bottom sheets para crear/editar sin perder contexto.  
\* Uso de Tab Bar interna para navegar entre Tasks, Calendar y Goals.  
\* Empty states como guía de primera experiencia.  
\* Skeletons cuando la carga tarda más de 300ms.  
\* Toast superior con deshacer para completado de tareas.  
\* Cards, list items, chips, badges, progress bars y avatares.  
\* Reglas de accesibilidad, touch target, modo Senior y feedback háptico.  
\* Relación de Planner con Home: Home resume, Planner administra.  
\* Relación con Home mediante Briefing, Atención Requerida, tareas vencidas y Carga Familiar.  
\* Relación con Quick Actions mediante \`Crear tarea\`, \`Crear evento\` y \`Ver pendientes\`.

No aporta:

\* Endpoints.  
\* Requests/responses.  
\* Tipos de datos completos.  
\* Estados backend oficiales de tareas/eventos.  
\* Permisos detallados por rol para Planner.  
\* Pantallas completas específicas de Planner con todos sus campos.

\---

\#\# 3\. Principios de producto aplicables

\#\#\# Principios explícitos aplicables al Planner

\* HomePlus debe sentirse como una app de hogar, no como una app corporativa de productividad.  
\* La paleta visual debe transmitir calma, claridad, pertenencia y control saludable.  
\* El sistema no debe transmitir vigilancia, culpa acumulada, presión social ni ansiedad por notificaciones.  
\* La acción principal debe estar en la zona de pulgar.  
\* La acción principal de Tasks es completar con checkbox 1-tap, sin abrir detalle.  
\* La complejidad debe revelarse solo cuando el usuario la necesita.  
\* El nivel de configuración avanzada no debe estar visible por defecto.  
\* Home resume información, no la administra.  
\* Home conduce al módulo correspondiente.  
\* Planner agrupa \`Tasks\`, \`Calendar\` y \`Goals\`.  
\* Responsabilidades no es dominio independiente; es eje organizador de Tasks.  
\* Geni no tiene tab propio; es transversal y entra por Quick Actions.  
\* No se usan tooltips ni carruseles; los empty states funcionan como tutorial.  
\* Los cambios importantes o destructivos requieren confirmación.  
\* Las acciones cotidianas, como completar una tarea, tienen deshacer por 5 segundos.  
\* No debe haber sonidos propios de la app.  
\* Las animaciones no deben transmitir urgencia falsa.  
\* No debe haber parpadeos ni rebotes repetidos.  
\* Las animaciones deben durar máximo 500ms.  
\* En modo Adulto Mayor se respeta \`prefers-reduced-motion\`.  
\* No debe haber rankings, leaderboards ni gamificación comparativa entre miembros.  
\* La gamificación infantil, si existe, debe ser sin presión ni comparación.  
\* Ningún rol obtiene acceso automático a información privada como metas privadas, documentos privados, finanzas personales o memoria privada de Geni.

\---

\#\# 4\. UX/UI aplicable

\#\#\# Navegación principal

\* Bottom Nav oficial: \`\[ Home \] \[ People \] \[ \+ \] \[ Planner \] \[ More \]\`.  
\* Planner vive como tab principal en Bottom Nav.  
\* El tab Planner usa ícono \`📋\`.  
\* Planner contiene \`Tasks\`, \`Calendar\` y \`Goals\`.  
\* La Bottom Nav es congelada para V1.  
\* No debe agregarse un tab nuevo tipo \`Care\`, \`Gastos\` o \`Perfil\`.  
\* En Bottom Nav, el badge solo puede usar success o alert.  
\* En Bottom Nav, nunca se usa error rojo.  
\* Tap en tab activo: scroll to top \+ refresh de la pantalla actual.

\#\#\# Navegación interna del dominio

\* Planner debe usar Tab Bar interna.  
\* Tabs internos definidos para Planner: \`Tasks | Calendar | Goals\`.  
\* Tab Bar:

  \* altura 44px;  
  \* fondo transparente o \`bg-primary\`;  
  \* indicador de 3px \`prim-500\`;  
  \* indicador con \`radius-full\`;  
  \* indicador animado con slide;  
  \* tab activo: \`text prim-600\`, weight 600;  
  \* tab inactivo: \`text text-tertiary\`, weight 400;  
  \* máximo 5 tabs por dominio.

\#\#\# Mobile-first

\* Alcance mobile-first.  
\* Pantalla base 375×812px.  
\* Acción principal en zona inferior/pulgar.  
\* Touch target mínimo:

  \* normal: ≥44px;  
  \* senior: ≥56px.  
\* Los formularios de creación/edición deben usar bottom sheet, no pantalla completa, para mantener contexto.

\#\#\# Jerarquía visual

\* Home y Planner deben respetar una jerarquía de:

  \* atención;  
  \* acción;  
  \* contexto;  
  \* exploración.  
\* Las cards no deben tener más de una acción primaria.  
\* Acciones secundarias deben ir como ghost button o link text.  
\* Home debe mostrar pocas cards:

  \* máximo 3 para Coordinador;  
  \* máximo 2 para Adulto;  
  \* máximo 1 para Niño/Adulto Mayor.

\#\#\# Cards

Card estándar:

\* \`bg: surface-card\`.  
\* \`radius: radius-md (12px)\`.  
\* \`padding: 16px\`.  
\* sombra: \`0px 2px 8px rgba(0,0,0,0.06)\`.  
\* sin borde por defecto.  
\* borde opcional: \`1px divider-strong\`.

Card destacada:

\* para Briefing, Atención Requerida o reconocimiento;  
\* \`bg: surface-card\`;  
\* \`border-left: 4px prim-500\`;  
\* sombra \`0px 4px 16px rgba(193,127,89,0.12)\`.

Card alerta:

\* para contexto de atención;  
\* \`bg: alert-100\`;  
\* \`border-left: 4px alert-500\`;  
\* acción principal en \`prim-600\`.

\#\#\# List Item

List item base:

\* leading \+ título \+ trailing;  
\* subtítulo opcional;  
\* altura estándar: 56px;  
\* altura compacta: 48px;  
\* padding horizontal: 20px;  
\* gap leading/contenido: 12px;  
\* touch target mínimo: 44px.  
\* leading puede ser ícono, avatar, checkbox o switch.  
\* trailing puede ser badge, chip, chevron o monto.  
\* estado default: bg transparente.  
\* estado pressed: \`bg prim-50\`.  
\* estado selected: \`bg prim-50 \+ borde izquierdo 3px prim-500\`.  
\* estado disabled: opacity 0.5.  
\* separador: \`1px divider\`, indentado al contenido.  
\* en modo Senior:

  \* altura 64px;  
  \* touch target 56px.

\#\#\# Chips y badges

Chips:

\* sirven para filtros de dominio.  
\* variantes:

  \* default;  
  \* outline.  
\* estado selected:

  \* \`bg prim-500\`;  
  \* \`text white\`;  
  \* \`border prim-500\`.  
\* tamaños:

  \* sm: 28px;  
  \* md: 32px.

Badges:

\* indicadores de estado no interactivos.  
\* variantes:

  \* success;  
  \* warning;  
  \* error;  
  \* info;  
  \* neutral.  
\* badge nunca debe depender solo del color.  
\* siempre debe tener texto \+ color.  
\* \`accessibilityLabel\` obligatorio, por ejemplo: \`\[N\] tareas pendientes\`.  
\* En Bottom Nav:

  \* usar success o alert;  
  \* nunca error.

\#\#\# Botones

Variantes:

\* Primary.  
\* Secondary.  
\* Tertiary.  
\* Danger.  
\* Ghost.

Tamaños normales:

\* sm: altura 36px, touch target 44px.  
\* md: altura 44px.  
\* lg: altura 52px.

Modo Adulto Mayor:

\* sm: altura 44px, touch target 56px.  
\* md: altura 56px.  
\* lg: altura 64px.

Loading en botones:

\* el botón mantiene su ancho;  
\* el texto se reemplaza por spinner;  
\* el botón permanece visualmente en active;  
\* loading mínimo 400ms para evitar flicker;  
\* spinner aparece si la operación tarda más de 300ms.

Feedback táctil:

\* todo tap en botón recibe háptico light;  
\* en modo Adulto Mayor, háptico medium.

\#\#\# Bottom Sheet

Uso:

\* opción principal mobile para crear/editar;  
\* no usar modal ni pantalla completa para formularios;  
\* mantiene el contexto;  
\* adecuado para crear/editar tareas y eventos.

Estructura:

\* drag handle 32×4px;  
\* título H3;  
\* contenido;  
\* footer sticky con acción secundaria y acción primaria.

Estilos:

\* \`bg: surface-card\`;  
\* \`radius-top: radius-lg (16px)\`;  
\* padding 24px;  
\* overlay \`surface-overlay\`;  
\* backdrop blur(4px) si el SO lo soporta.

Alturas:

\* 25%: quick actions / confirmaciones simples.  
\* 50%: formularios simples / filtros.  
\* 75%: formularios complejos / listas.  
\* 90%: casi full screen / edición detallada.

Animación:

\* entrada: slide-up \+ fade-in, 300ms ease-out.  
\* salida: slide-down \+ fade-out, 200ms ease-in.  
\* overlay: fade-in 300ms / fade-out 200ms.

\#\#\# Modal centrado

Uso exclusivo:

\* confirmaciones con consecuencia;  
\* eliminación;  
\* expulsión;  
\* cambios de rol;  
\* cierre de formulario con cambios sin guardar.

No usar para:

\* formularios;  
\* navegación entre niveles.

\#\#\# Toast / Snackbar

\* Posición: Top.  
\* Nunca bottom porque compite con Bottom Nav y acciones.  
\* Máximo un toast visible a la vez.  
\* Si llega otro toast, el actual se descarta.  
\* No usar toast para tareas completadas por otros miembros.  
\* Toast con “Deshacer” dura 5 segundos.  
\* Duración default: 4 segundos.  
\* En modo Adulto Mayor: 8 segundos.  
\* Variantes:

  \* success;  
  \* alert;  
  \* error;  
  \* info.  
\* Error incluye háptico warning.  
\* Animación:

  \* entrada slide-down \+ fade-in 300ms;  
  \* salida fade-out 200ms.

\#\#\# Empty State

\* Empty State es la primera experiencia por dominio.  
\* Funciona como tutorial de la app.  
\* No se usan tooltips ni carruseles.  
\* Estructura:

  \* ilustración sutil 120px tint \`prim-100\`;  
  \* título H3;  
  \* descripción body text-secondary;  
  \* acción sugerida como botón secondary o ghost.

Ejemplo textual explícito para Tasks:

\* Título: “Acá van a aparecer tus tareas”.  
\* Descripción: “Cuando alguien te asigne una tarea, la vas a ver acá.”

\#\#\# Skeleton / Loading

\* Aparece si los datos tardan más de 300ms.  
\* Usa card skeleton.  
\* Fondo \`prim-50\`.  
\* Animación pulse:

  \* opacidad 0.3 → 0.6 → 0.3;  
  \* ciclo 1.5s ease-in-out.  
\* Transición al contenido: fade-in 300ms.

\#\#\# Progress Bar

\* Aplicable a Tareas y Goals.  
\* Track:

  \* \`bg-secondary\`;  
  \* height 6px;  
  \* \`radius-full\`.  
\* Fill:

  \* \`prim-500\`;  
  \* height 6px;  
  \* \`radius-full\`.  
\* Transición:

  \* width 600ms ease-out.  
\* Regla emocional:

  \* nunca mostrar “atraso” o “deuda” visual;  
  \* si alguien está atrasado en una tarea, mostrar como “pendiente” sin color de error;  
  \* el color de error solo se usa en bloqueos reales.

\#\#\# Accesibilidad

\* \`accessibilityLabel\` obligatorio en componentes interactivos.  
\* \`accessibilityRole\` en cards, botones y list items.  
\* Íconos decorativos con \`aria-hidden\`.  
\* Test con tamaño de fuente del sistema aumentado.  
\* Test con VoiceOver / TalkBack.  
\* Modo Senior:

  \* body mínimo 18px;  
  \* touch target mínimo 56px;  
  \* alto contraste;  
  \* íconos bold;  
  \* sin gestos complejos;  
  \* preferencia por tap.

\---

\#\# 5\. Información directa sobre Planner

\#\#\# Planner como módulo

\* Planner es el núcleo operativo.  
\* Planner agrupa:

  \* Tasks;  
  \* Calendar;  
  \* Goals.  
\* Planner vive en Bottom Nav.  
\* Planner usa ícono \`📋\`.  
\* Planner es visible para todos los roles.  
\* Planner debe tener Tab Bar interna con:

  \* Tasks;  
  \* Calendar;  
  \* Goals.  
\* Responsabilidades son eje organizador interno de Tasks.  
\* Responsabilidades no son dominio independiente.  
\* Goals vive dentro de Planner, no como dominio separado.

\#\#\# Decisión arquitectónica visual

\* Planner agrupa \`Tasks \+ Calendar \+ Goals\`.  
\* Responsabilidades son propiedad de la tarea.  
\* La complejidad se revela solo cuando el usuario la necesita.  
\* Bottom sheets se usan para crear/editar en Tasks y Calendar.  
\* Progressive Disclosure estructura Planner.

\#\#\# Relación con otros módulos

\* Home enlaza a Planner.  
\* Home enlaza a Calendar.  
\* Home enlaza a Goals.  
\* Geni se integra con Planner como capa transversal, pero no debe desarrollarse como IA real en este fragment.  
\* Automatizaciones pueden disparar Tasks, pero no deben desarrollarse para el MVP actual.  
\* Inventory puede generar Tasks, pero debe tratarse como relación futura/no implementar Inventory.  
\* Assets puede generar Tasks, pero debe tratarse como relación futura/no implementar Assets.  
\* Offline puede poner en cola acciones de Planner y Calendar, pero Offline Sync queda fuera del MVP actual.

\---

\#\# 6\. Información sobre Tasks

\#\#\# MVP actual

\* Tasks es submódulo de Planner.  
\* Tasks representa gestión de tareas.  
\* La acción principal de Tasks es completar tarea con checkbox 1-tap.  
\* La tarea se completa con un solo toque en el checkbox, sin abrir detalle.  
\* El checkbox tiene:

  \* tamaño visual 24×24px;  
  \* touch target 44×44px;  
  \* border \`divider-strong\` 1.5px;  
  \* radius-sm 6px.  
\* Estados visuales del checkbox:

  \* unchecked: border \`divider-strong\`, bg transparente;  
  \* pressed: bg \`prim-50\`, border \`prim-300\`;  
  \* checked: bg \`success-500\`, border \`success-500\`;  
  \* ícono check blanco 14px.  
\* Al completar:

  \* háptico light;  
  \* tachado en el título;  
  \* \`text-decoration: line-through\`;  
  \* color \`text-tertiary\`;  
  \* animación fill 300ms ease-out;  
  \* animación scale 0.9→1.0 200ms ease-out.  
\* En modo Adulto Mayor:

  \* checkbox 32×32px;  
  \* touch target 56×56px.  
\* Completar tarea debe tener feedback inmediato menor a 100ms.  
\* Completar tarea puede tener toast con “Deshacer” por 5 segundos.  
\* No usar toast para tareas completadas por otros miembros.  
\* El empty state de tareas debe poder decir:

  \* “Acá van a aparecer tus tareas”.  
  \* “Cuando alguien te asigne una tarea, la vas a ver acá.”  
\* Tasks puede usar list items con leading checkbox.  
\* Tasks puede usar badges/chips para estado o filtros, respetando que no dependan solo de color.  
\* Tasks puede usar progress bar en color \`prim-500\`.  
\* Si alguien está atrasado en una tarea, se muestra como pendiente, no con error visual.  
\* Error visual solo para bloqueos reales.  
\* FAB visible en Tasks para crear tarea.  
\* Quick Actions incluye \`Crear tarea\`.  
\* Quick Actions incluye \`Ver pendientes\`.  
\* Bottom sheets deben usarse para crear/editar tareas.  
\* Las acciones cotidianas como completar tarea tienen deshacer.  
\* Eliminar tarea, si aparece como acción destructiva, debería usar modal de confirmación por la regla general de confirmaciones con consecuencia.

\#\#\# POST-MVP / futuro

\* Tasks puede tener dependencias.  
\* Tasks puede tener recurrencias.  
\* Tasks puede tener subtareas.  
\* Tasks puede tener verificación.  
\* Tasks puede tener adjuntos.  
\* Tasks puede tener comentarios.  
\* Tasks genera timeline.  
\* Dependencias: tareas que bloquean otras tareas.  
\* Recurrencias: generan nuevas instancias de tareas y preservan historial.  
\* Subtareas: único nivel de anidamiento; progreso calculado automáticamente.  
\* Verificación: aprobación opcional post-completado; el documento dice que no crea estado separado.  
\* Adjuntos: imágenes, PDFs, audio.  
\* Comentarios: asociados a tareas.  
\* Timeline: línea temporal de actividad automática y comentarios en cada tarea.  
\* Automatizaciones pueden disparar tareas.  
\* Inventory puede generar tareas.  
\* Assets puede generar tareas.  
\* Offline puede poner en cola Planner.

\#\#\# Dudas o decisiones abiertas

\* El documento no define campos de tarea.  
\* No define tipos de tarea.  
\* No define estados backend de tarea.  
\* No define prioridades.  
\* No define fecha límite.  
\* No define responsable/asignado.  
\* No define permisos por rol para crear/completar/verificar tareas.  
\* No define endpoint de listar/crear/editar/eliminar/completar.  
\* No define cómo se ve una pantalla completa de lista de tareas.  
\* No define si Tasks se agrupa por fecha, responsable, responsabilidad o estado.  
\* No define si Verification Flow pertenece al MVP actual o queda como futuro; solo aparece como feature de Tasks.  
\* No define templates MVP.

\---

\#\# 7\. Información sobre Calendar / Events

\#\#\# MVP actual

\* Calendar es submódulo de Planner.  
\* Calendar representa gestión de eventos familiares y personales.  
\* Calendar vive dentro de Planner.  
\* Planner tiene Tab Bar interna con tab \`Calendar\`.  
\* FAB visible en Calendar para crear evento.  
\* Quick Actions incluye \`Crear evento\`.  
\* Bottom sheets deben usarse para crear/editar en Calendar.  
\* Calendar aparece como destino enlazable desde Home.  
\* Calendar puede generar Recuerdos, pero eso queda fuera del desarrollo de Planner actual.  
\* Offline puede poner en cola Calendar, pero Offline Sync queda fuera del MVP actual.  
\* Calendar se beneficia de navegación contextual con Tasks.

\#\#\# POST-MVP / futuro

\* Participantes avanzados no aparecen detallados.  
\* Recurrencia compleja no aparece en el documento como contrato de MVP.  
\* Offline Calendar queda fuera de MVP actual.  
\* Calendar → Recuerdos queda como integración futura/no implementar.  
\* Geni puede integrarse con Planner/Calendar, pero no se debe implementar IA real desde este fragment.

\#\#\# Dudas o decisiones abiertas

\* El documento no define campos de evento.  
\* No define fecha/hora de evento.  
\* No define ubicación.  
\* No define participantes.  
\* No define estados de evento.  
\* No define vistas día/semana/mes.  
\* No define vista agenda.  
\* No define recurrencia simple.  
\* No define endpoints de crear/editar/eliminar/listar eventos.  
\* No define cómo Calendar muestra tareas con fecha.  
\* No define cómo Home selecciona próximos eventos.  
\* No define permisos por rol sobre eventos.

\---

\#\# 8\. Información sobre Goals

\* Goals vive dentro de Planner.  
\* Goals no es dominio separado.  
\* Goals puede tener hitos.  
\* Relación indicada:

  \* Goals contiene Hitos.  
  \* Hitos contiene Tasks.  
\* Progress bar aplica a Goals con color \`prim-500\`.  
\* Goals aparece como destino enlazable desde Home.  
\* Goals debe considerarse referencia visual o futuro para Planner.  
\* No debe convertirse en MVP real desde este documento.  
\* No se deben implementar metas privadas ni exponerlas automáticamente, por la regla de privacidad.  
\* No se deben implementar milestones/hitos como backend real para el MVP actual desde este fragment.

\---

\#\# 9\. Responsabilidades, templates y categorías

\#\#\# Responsabilidades

Información explícita:

\* Responsabilidades son una feature de Planner.  
\* Responsabilidades son agrupación de áreas operativas.  
\* Ejemplos explícitos:

  \* Compras;  
  \* Mascotas;  
  \* Limpieza;  
  \* Vehículos.  
\* Responsabilidades son eje organizador de Tasks.  
\* Responsabilidades no son dominio independiente.  
\* Responsabilidades son propiedad de la tarea.  
\* Planner usa responsabilidades como organizador interno.

Uso aplicable al frontend:

\* Pueden funcionar como agrupador visible de tareas.  
\* Pueden funcionar como filtros/chips.  
\* Pueden funcionar como sección visual dentro de Tasks.  
\* No deben aparecer como tab independiente.  
\* No deben crear navegación principal adicional.

\#\#\# Templates

Información explícita:

\* Plantillas son feature de Planner.  
\* Plantillas son plantillas de tareas reutilizables.  
\* Inicialmente solo para Tasks.

Dudas:

\* No se definen templates concretas.  
\* No se define si son editables o fijas.  
\* No se define CRUD.  
\* No se definen campos.  
\* No se define UI de plantillas.

\#\#\# Categorías

Información explícita:

\* El documento no define categoría como entidad separada para Planner.  
\* Las responsabilidades cumplen el rol visual de agrupación operativa.  
\* No hay regla explícita de “no duplicar categoría si ya hay template”.

\#\#\# POST-MVP / futuro

\* Templates personalizadas no aparecen como contrato actual.  
\* CRUD de templates no aparece.  
\* Dependencias/subtareas/recurrencias/verificación avanzada aparecen como features de Tasks, pero no como MVP detallado.

\---

\#\# 10\. Quick Actions aplicables a Planner

\#\#\# Estructura general

\* Quick Actions es un panel flotante.  
\* Se abre tocando el botón \`\[+\]\` central en Bottom Nav.  
\* El fondo usa blur(4px) \+ \`surface-overlay\`.  
\* Contenedor:

  \* \`bg: surface-card\`;  
  \* \`radius: radius-lg (16px)\`;  
  \* padding 8px.  
\* Animación:

  \* fade in \+ slide up;  
  \* duración 200ms ease-out.  
\* Geni es fijo y siempre primero.  
\* Las acciones dinámicas aparecen debajo.  
\* Puede haber scroll horizontal.

\#\#\# Acciones relacionadas con Planner

Acciones explícitas aplicables:

\* Crear tarea.  
\* Crear evento.  
\* Ver pendientes.

\#\#\# Orden de acciones

\* Fijadas por el usuario.  
\* Más usadas por frecuencia \+ recencia.  
\* Menos usadas.

\#\#\# Clasificación

\* Crear tarea: aplicable ahora a Planner.  
\* Crear evento: aplicable ahora a Calendar.  
\* Ver pendientes: aplicable ahora a Tasks/Home.  
\* Geni: referencia visual/transversal; no implementar IA real.  
\* Registrar gasto, Check-in, Escanear documento, Subir archivo: no implementar en Planner; solo aparecen como acciones de otros dominios.

\---

\#\# 11\. Home relacionado con Planner

\#\#\# Home como centro operativo

\* Home es centro operativo.  
\* Home es punto de entrada inamovible.  
\* Home contiene:

  \* Briefing;  
  \* Atención Requerida;  
  \* widgets.  
\* Home no es dashboard puro.  
\* Home combina briefing \+ acciones personales.  
\* Home resume, no administra.  
\* Home conduce al módulo correspondiente.  
\* Home siempre es pantalla inicial.  
\* El usuario no puede cambiarlo.

\#\#\# Información de Planner que Home puede mostrar

Información explícita relacionada:

\* Home enlaza a Planner.  
\* Home enlaza a Calendar.  
\* Home enlaza a Goals.  
\* Atención Requerida centraliza tareas vencidas.  
\* Atención Requerida centraliza aprobaciones.  
\* Carga Familiar mide distribución de tareas.  
\* Carga Familiar visible solo para Coordinador.  
\* Briefing es primer widget de Home.  
\* Briefing es generado por Geni en el documento, pero para MVP Planner Frontend debe tratarse como referencia/mock, no IA real.

\#\#\# Reglas aplicables

\* Home debe resumir tareas y eventos, no administrar tareas/eventos.  
\* Cualquier card de Home relacionada con Planner debe conducir a Planner, Tasks o Calendar.  
\* Home no debe reemplazar la pantalla de Planner.  
\* Las acciones reales de administración deben vivir en Planner.

\#\#\# MOCK / referencia

\* Briefing: usar como resumen visual/mock, no IA real.  
\* Carga Familiar: puede ser mock si se usa en MVP visual; solo visible para Coordinador.  
\* Widgets de Home: referencia para mostrar resumen, no definir backend desde este documento.

\---

\#\# 12\. Patrones visuales reutilizables

\#\#\# Aplicable ahora a Planner

\#\#\#\# Paleta

\* Paleta tierra-cálida:

  \* Arcilla/Terracota;  
  \* Salvia/Musgo;  
  \* Miel/Ámbar.  
\* Fondos neutros-cálidos.  
\* Nunca blanco puro como fondo principal.  
\* No colores corporativos de productividad.  
\* Máximo 3 colores principales simultáneos en pantalla.  
\* Color primario aparece en 1 o 2 elementos máximo por pantalla.  
\* Colores semánticos solo cuando el estado está activo.

\#\#\#\# Colores primarios

\* Primario Arcilla/Terracota:

  \* base \`\#C17F59\`;  
  \* hover \`\#D49B78\`;  
  \* active \`\#A86B45\`;  
  \* disabled \`\#E3BAA0\`;  
  \* surface tint \`\#F2E0D4\`;  
  \* bg subtle \`\#FAF3ED\`.

\* Secundario Salvia/Musgo:

  \* base \`\#7A9B7E\`;  
  \* hover \`\#94B097\`;  
  \* active \`\#5F7F63\`;  
  \* disabled \`\#B0C8B3\`;  
  \* surface tint \`\#D8E5DA\`;  
  \* bg subtle \`\#EEF4EF\`.

\* Acento Miel/Ámbar:

  \* base \`\#D4A853\`;  
  \* hover \`\#DFBC72\`;  
  \* active \`\#BD8F38\`;  
  \* disabled \`\#E8D09A\`;  
  \* surface tint \`\#F2E6CC\`.

\#\#\#\# Colores semánticos

\* Éxito:

  \* base \`\#6B9E7A\`;  
  \* bg \`\#E1EFE5\`;  
  \* text on light \`\#558563\`.

\* Alerta:

  \* base \`\#D4944A\`;  
  \* bg \`\#F7EBDB\`;  
  \* text on light \`\#B57930\`.

\* Error:

  \* base \`\#C46B6B\`;  
  \* bg \`\#F5E2E2\`;  
  \* text on light \`\#A85050\`.

\* Info:

  \* base \`\#7A8B9B\`;  
  \* bg \`\#E4E9ED\`;  
  \* text on light \`\#5F707F\`.

\#\#\#\# Superficies

Modo claro:

\* \`bg-primary \#FBFAF8\`.  
\* \`bg-secondary \#F5F1EB\`.  
\* \`surface-card \#FFFFFF\`.  
\* \`surface-elevated \#FFFFFF con sombra\`.  
\* \`surface-overlay rgba(45,42,38,0.50)\`.  
\* \`divider \#E8E3DC\`.  
\* \`divider-strong \#D5CFC7\`.

Modo oscuro:

\* \`bg-primary \#1C1A17\`.  
\* \`bg-secondary \#24211E\`.  
\* \`surface-card \#2C2925\`.  
\* \`surface-elevated \#332F2B\`.  
\* \`surface-overlay rgba(0,0,0,0.65)\`.  
\* \`divider \#3D3933\`.  
\* \`divider-strong \#4F4A43\`.

\#\#\#\# Tipografía

\* Display / H1-H2: Fraunces.  
\* Body / UI / H3-H6: Inter.  
\* Mono / Datos: JetBrains Mono.  
\* Base normal: 16px.  
\* Modo Senior: body mínimo 18px.

Uso sugerido por el documento:

\* H1: pantalla principal.  
\* H2: sección.  
\* H3: subsección.  
\* H4: card title.  
\* Body: texto base.  
\* Caption: meta / etiquetas.  
\* Label: chips / badges.

\#\#\#\# Espaciado

\* Sistema base: 4px.  
\* Padding pantalla mobile: 20px.  
\* Gap estándar entre secciones: 24px.  
\* Gap stack: 16px.  
\* Card padding estándar: 16px.  
\* Card compacta: 12px.  
\* Adulto Mayor:

  \* screen padding 24px;  
  \* card padding 20px;  
  \* gap 16px.  
\* Radius:

  \* chips/badges/inputs: 6px;  
  \* cards/botones/avatares: 12px;  
  \* modales/bottom sheets: 16px;  
  \* pill/avatar circular: 9999px.

\#\#\#\# Avatares

\* Avatar puede usarse para responsable/asignado.  
\* Tap en avatar abre perfil de persona como patrón universal.  
\* \`accessibilityLabel\`: \`\[Nombre\], \[rol\]\`.  
\* \`accessibilityHint\`: “Toca para ver perfil”.  
\* Indicador de presencia:

  \* online success;  
  \* ausente hace \<30min alert;  
  \* offline divider.  
\* Para Planner, presencia es referencia visual si ayuda a asignaciones; no implementar GPS real.

\#\#\# Referencia visual para más adelante

\* Goals con progress bar.  
\* Timeline de tarea.  
\* Adjuntos en tareas.  
\* Comentarios en tareas.  
\* Geni integrado con Planner.  
\* Automatizaciones disparando Tasks.  
\* Inventory/Assets generando Tasks.  
\* Offline queue para Planner/Calendar.

\#\#\# No aplicable

\* Finance real.  
\* Inventory real.  
\* Assets real.  
\* FamilyCloud real.  
\* SOS real.  
\* Presence GPS real.  
\* Automatizaciones reales.  
\* Geni IA real.  
\* Feed real.  
\* Offline Sync real.

\---

\#\# 13\. Reglas funcionales extraídas

\* Planner vive en Bottom Nav.  
\* Planner agrupa Tasks, Calendar y Goals.  
\* Responsabilidades no es módulo independiente.  
\* Responsabilidades organizan Tasks.  
\* Goals vive dentro de Planner, no como dominio separado.  
\* La acción principal de Tasks es checkbox 1-tap.  
\* Completar tarea no debe exigir abrir detalle.  
\* Completar tarea debe tener feedback visual inmediato.  
\* Completar tarea puede mostrar deshacer durante 5 segundos.  
\* No mostrar toast para tareas completadas por otros miembros.  
\* Crear tarea puede estar en FAB.  
\* Crear evento puede estar en FAB.  
\* Crear tarea puede estar en Quick Actions.  
\* Crear evento puede estar en Quick Actions.  
\* Ver pendientes puede estar en Quick Actions.  
\* Crear/editar tareas y eventos debe hacerse en bottom sheet.  
\* No usar modales para formularios.  
\* Usar modal centrado solo para confirmaciones con consecuencia.  
\* Empty states reemplazan tutoriales.  
\* Skeleton aparece si carga tarda más de 300ms.  
\* Toast se muestra arriba, no abajo.  
\* Badge en Bottom Nav nunca usa rojo/error.  
\* La barra de progreso de tareas no debe mostrar atraso como deuda visual.  
\* Los errores visuales fuertes se reservan para bloqueos reales.  
\* Home resume; Planner administra.  
\* Home debe conducir a Planner, Calendar o Goals cuando el usuario quiera actuar.  
\* Carga Familiar solo visible para Coordinador.  
\* Bottom Nav no se modifica.  
\* No crear tab nuevo para Goals fuera de Planner.  
\* No crear tab separado para Responsabilidades.  
\* No crear tab de Geni.  
\* No usar rankings ni comparaciones entre miembros.

\---

\#\# 14\. Ideas derivadas útiles

\* Propuesta UX derivada / requiere validación del usuario: usar chips de Responsabilidades en Tasks con ejemplos explícitos del documento: Compras, Mascotas, Limpieza y Vehículos.  
\* Propuesta UX derivada / requiere validación del usuario: usar \`Crear tarea\` y \`Crear evento\` como primeras acciones dinámicas del Quick Actions Panel cuando el usuario está en Home o Planner.  
\* Propuesta UX derivada / requiere validación del usuario: en Tasks, usar list item con checkbox como leading, título de tarea, responsable/avatar como trailing o metadata secundaria.  
\* Propuesta UX derivada / requiere validación del usuario: usar card destacada para “Atención requerida” dentro de Planner si hay tareas vencidas o verificaciones pendientes.  
\* Propuesta UX derivada / requiere validación del usuario: usar progress bar solo para resumen de avance grupal o Goals visuales, evitando convertir tareas pendientes en presión emocional.  
\* Propuesta UX derivada / requiere validación del usuario: usar bottom sheet 50% para creación rápida de tarea y 75% para edición detallada.  
\* Propuesta UX derivada / requiere validación del usuario: mantener Calendar como tab dentro de Planner con FAB propio para crear evento.  
\* Propuesta UX derivada / requiere validación del usuario: usar Empty State específico de Tasks como primera pantalla si no hay tareas asignadas.  
\* Propuesta UX derivada / requiere validación del usuario: Home puede mostrar una card “Pendientes de hoy” que navegue a Planner \> Tasks.  
\* Propuesta UX derivada / requiere validación del usuario: Home puede mostrar “Próximo evento” que navegue a Planner \> Calendar.

\---

\#\# 15\. Decisiones que quedan abiertas

\* Qué campos exactos tendrá una tarea en frontend.  
\* Qué campos exactos tendrá un evento.  
\* Qué estados reales tendrá una tarea.  
\* Qué estados reales tendrá un evento.  
\* Cómo representar prioridad.  
\* Cómo representar fecha límite.  
\* Cómo representar responsable/asignado.  
\* Cómo representar verificación.  
\* Cómo representar recurrencia simple.  
\* Cómo representar templates MVP.  
\* Si las responsabilidades serán filtros, secciones, chips o campo del formulario.  
\* Si Calendar tendrá vista día/semana/mes en este MVP visual.  
\* Cómo se muestran tareas con fecha dentro del calendario.  
\* Qué datos reales de Planner aparecen en Home.  
\* Qué datos quedan mock en Home.  
\* Qué acciones exactas del FAB aparecen según tab.  
\* Qué Quick Actions se muestran por rol.  
\* Qué permisos aplican a niños, invitados y seniors dentro de Planner.  
\* Cómo se maneja eliminación de tareas/eventos.  
\* Cómo se maneja edición de tarea/evento ya completado.  
\* Cómo se maneja una tarea atrasada sin generar culpa visual.  
\* Cómo se implementa el servicio de Planner.  
\* Si Goals se oculta, se deja visible como demo o queda como tab futuro no funcional.

\---

\#\# 16\. Qué NO debe entrar al MVP actual

\* Goals backend real.  
\* Hitos/Milestones reales.  
\* Streaks avanzadas.  
\* Rankings o leaderboards.  
\* Comparación entre miembros.  
\* Templates personalizadas.  
\* CRUD de templates.  
\* Adjuntos en tareas.  
\* Comentarios en tareas.  
\* Timeline completo de tareas.  
\* Dependencias complejas de tareas.  
\* Subtareas complejas.  
\* Recurrencia compleja.  
\* RRULE.  
\* EXDATE.  
\* Participantes avanzados en eventos.  
\* Notificaciones push reales.  
\* Offline Sync.  
\* Auditoría completa.  
\* Geni real.  
\* Automatizaciones reales.  
\* Inventory real generando tareas.  
\* Assets real generando tareas.  
\* Presence GPS.  
\* HomeCloud/Recuerdos desde Calendar.  
\* Finance real.  
\* Feed real.  
\* SOS real.  
\* Multi-hogar avanzado.  
\* Gráficos de productividad individual.  
\* Sonidos custom de la app.  
\* Modales para formularios.  
\* Nuevos tabs fuera de la Bottom Nav oficial.

\---

\#\# 17\. Extractos o referencias internas importantes

\* \`\#\#\# 4.2 Botón Flotante (FAB)\`: FAB visible en Tasks para crear tarea y en Calendar para crear evento.  
\* \`\#\#\# 4.6 Checkbox de Tarea (1-tap)\`: define la acción principal de tareas, estados visuales, animación, haptics y accesibilidad.  
\* \`\#\#\# 4.8 Bottom Navigation Bar\`: define \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\` y ubica Planner como tab principal.  
\* \`\#\#\# 4.9 Quick Actions Panel\`: define acceso desde botón \`+\`, Geni fijo y acciones dinámicas como crear tarea, crear evento y ver pendientes.  
\* \`\#\#\# 4.11 Modal y Bottom Sheet\`: define bottom sheets como patrón principal para crear/editar.  
\* \`\#\#\# 4.13 Toast / Snackbar\`: define toast superior, máximo 1 visible, y deshacer por 5 segundos.  
\* \`\#\#\# 4.14 Indicador de Progreso\`: define barra de progreso para Tareas/Goals y regla emocional contra atraso/deuda visual.  
\* \`\#\#\# 4.15 Empty State\`: define empty state de tareas y su copy explícito.  
\* \`\#\#\# 4.16 Skeleton / Loading\`: define skeleton cuando la carga tarda más de 300ms.  
\* \`\#\#\# 4.17 Tab Bar\`: define tabs internos de Planner: \`Tasks | Calendar | Goals\`.  
\* \`8.4 Validaciones de UX\`: confirma Bottom Nav congelada, checkbox 1-tap, pull-to-refresh en listas y restricciones contra badges de culpa.  
\* \`8.5 No implementar\`: prohíbe tabs inventados, rankings, modales para formularios, gráficos de productividad individual, notificaciones tipo “Fulanito ya hizo X” y sonidos custom.  
\* Archivo de comprensión, entidades: define Planner como núcleo operativo con Tasks, Calendar, Goals y Responsabilidades como eje organizador.  
\* Archivo de comprensión, reglas: define que Home resume, Planner administra; Planner agrupa Tasks/Calendar/Goals; Carga Familiar solo visible para Coordinador.  
\* Archivo de comprensión, decisiones arquitectónicas: define acción principal en zona de pulgar y bottom sheets para crear/editar.

\---

\#\# 18\. Conclusión operativa

Este documento aporta una base muy fuerte para el frontend ideal de Planner desde el punto de vista visual, mobile-first e interactivo.

Debe usarse en la spec final para definir:

\* navegación principal hacia Planner;  
\* tabs internos \`Tasks | Calendar | Goals\`;  
\* ubicación del FAB;  
\* Quick Actions de \`Crear tarea\`, \`Crear evento\` y \`Ver pendientes\`;  
\* checkbox 1-tap como interacción principal de Tasks;  
\* bottom sheets para crear/editar tareas y eventos;  
\* empty states;  
\* skeletons;  
\* toast superior con deshacer;  
\* cards, list items, chips, badges, avatares y progress bar;  
\* reglas de accesibilidad;  
\* modo Senior;  
\* tono visual cálido/no corporativo;  
\* relación Home → Planner;  
\* regla “Home resume, Planner administra”;  
\* responsabilidades como agrupador operativo de Tasks.

Debe ignorarse por ahora para implementación MVP:

\* Goals real;  
\* dependencias;  
\* subtareas;  
\* adjuntos;  
\* comentarios;  
\* timeline;  
\* automatizaciones;  
\* Geni real;  
\* Inventory/Assets generando tareas;  
\* Offline Sync;  
\* Presence GPS;  
\* FamilyCloud;  
\* Finance;  
\* Feed;  
\* SOS.

El documento no alcanza para definir por sí solo:

\* modelo de datos;  
\* endpoints;  
\* permisos reales;  
\* estados backend;  
\* contratos de service;  
\* reglas exactas de tareas/eventos;  
\* templates MVP;  
\* vistas completas de Calendar.

Su valor principal es establecer cómo debe sentirse, verse y comportarse el Planner Frontend para que parezca profesional, rápido, claro, usable y alineado con HomePlus.

\# planner\_frontend\_fragment\_HomePlus\_FinalSpec

\#\# 1\. Fuente

\* Documento: \`HomePlus — FinalSpec(1).md\`   
\* Archivo de comprensión asociado: \`Final Spec(1).txt\`   
\* Source map consultado: \`source\_map\_HomePlus\_FinalSpec(1).md\`   
\* Tipo de documento: FinalSpec general / documento maestro canónico de producto.  
\* Alcance del documento: visión general del ecosistema HomePlus, dominios, roles, permisos, People, Planner, Home, navegación, relaciones, auditoría, estados y principios.  
\* Nivel de utilidad para Planner Frontend: Alto.  
\* Motivo: el documento define directamente Planner, Tasks, Calendar, Responsabilidades, Home como centro operativo, Quick Actions, navegación y principios visuales/UX aplicables. No define una UI final pixel-perfect ni contratos técnicos de frontend.

\---

\#\# 2\. Resumen útil para Planner Frontend

Este documento aporta una base fuerte para diseñar el frontend ideal de Planner porque define a Planner como el núcleo operativo de HomePlus.

La información más útil para Planner Frontend es:

\* Planner administra Tasks, Calendar, Goals y Responsabilidades.  
\* Tasks representa trabajo pendiente o realizado.  
\* Calendar administra eventos familiares y personales.  
\* Las Responsabilidades agrupan áreas operativas del hogar.  
\* Home resume información de Planner, pero no administra Planner.  
\* Planner debe ser simple visualmente aunque internamente tenga muchos conceptos.  
\* El usuario debe poder coordinar, reducir carga mental y evitar pérdida de información.  
\* Las acciones rápidas permiten crear tarea y crear evento desde el botón central \`+\`.  
\* Home debe mostrar tareas y próximos eventos como resumen.  
\* Tasks puede agruparse por Responsabilidad, Prioridad o Fecha.  
\* Planner aparece como tab principal dentro de la navegación V1.  
\* Existen relaciones con People/Members porque las tareas tienen responsable y los eventos tienen participantes.  
\* Existen funciones avanzadas como subtareas, comentarios, adjuntos, dependencias, Goals, Geni, automatizaciones y auditoría, pero deben tratarse como POST-MVP o referencia futura.

\---

\#\# 3\. Principios de producto aplicables

\#\#\# Reducción de carga mental

HomePlus busca reducir la carga mental mediante herramientas que permitan coordinar responsabilidades, administrar recursos, registrar información importante y automatizar tareas repetitivas.

Aplicación a Planner Frontend:

\* Planner debe mostrar claramente qué hay que hacer.  
\* Las tareas pendientes deben ser fáciles de encontrar.  
\* Las tareas vencidas o importantes deben destacarse.  
\* Crear una tarea o evento debe ser rápido.  
\* Completar una tarea debe requerir pocos pasos.  
\* La información no debe sentirse dispersa.

\#\#\# Coordinación familiar

HomePlus no busca controlar personas, sino facilitar coordinación entre personas que comparten responsabilidades.

Aplicación a Planner Frontend:

\* El responsable de una tarea debe verse claramente.  
\* Los eventos familiares deben mostrar a quién involucran.  
\* Las acciones sobre tareas y eventos deben sentirse colaborativas, no autoritarias.  
\* Planner debe ayudar a que todos entiendan qué pasa en el hogar.

\#\#\# Simplicidad visual

La complejidad interna del sistema no debe reflejarse en la interfaz.

Aplicación a Planner Frontend:

\* No mostrar demasiadas entidades técnicas a la vez.  
\* Priorizar cards, filtros simples, chips y agrupaciones claras.  
\* Evitar convertir Planner en una pantalla saturada.  
\* Ocultar opciones avanzadas si no son necesarias en MVP.

\#\#\# Configuración mínima

La complejidad debe resolverse mediante diseño y automatización, no trasladando configuraciones complejas al usuario.

Aplicación a Planner Frontend:

\* Templates y responsabilidades deben funcionar como atajos visuales, no como configuración pesada.  
\* La creación rápida debe sugerir opciones simples.  
\* Los filtros deben ser comprensibles: Todas, Mías, Familia, Recurrentes, Completadas.  
\* Evitar formularios largos en la creación inicial.

\#\#\# Home como centro operativo

Home debe resumir información, no administrarla. La administración ocurre dentro del módulo correspondiente.

Aplicación a Planner Frontend:

\* Home puede mostrar próximas tareas y eventos.  
\* Planner debe ser el lugar donde se administra, edita, completa, filtra y revisa.  
\* Desde Home debe poder navegarse a Planner o Calendar.  
\* Home no debería replicar toda la UI de Planner.

\#\#\# Privacidad y permisos

La privacidad individual tiene prioridad. Ningún rol obtiene acceso automático a información privada.

Aplicación a Planner Frontend:

\* Las tareas personales, eventos personales o metas privadas requieren tratamiento visual cuidadoso si aparecen.  
\* No asumir que Coordinador ve todo lo privado.  
\* Los roles condicionan acciones disponibles.

\#\#\# Transparencia operativa

Las acciones que afectan al hogar deben ser visibles y los cambios relevantes deben quedar registrados.

Aplicación a Planner Frontend:

\* Cambios de responsable, fecha o estado pueden aparecer en historial/timeline.  
\* Completar una tarea debe mostrar feedback claro.  
\* Cambiar una fecha o responsable debe sentirse trazable.

\#\#\# Automatización asistida

Las automatizaciones deben ayudar, no reemplazar decisiones humanas críticas.

Aplicación a Planner Frontend:

\* Sugerencias de Geni o automatizaciones deben verse como ayuda, no como imposición.  
\* Para MVP, cualquier sugerencia puede quedar como demo/mock, no IA real.

\---

\#\# 4\. UX/UI aplicable

\#\#\# Navegación principal

La navegación V1 congelada contiene:

\* Home.  
\* People.  
\* \`+\` central.  
\* Planner.  
\* More.

Planner debe estar disponible como tab principal.

\#\#\# Estructura interna de Planner

Planner contiene:

\* Tasks.  
\* Calendar.  
\* Goals.  
\* Responsabilidades como eje interno de organización.

Para MVP frontend, Goals queda solo como referencia visual/futura.

\#\#\# Bottom Nav

Planner se accede desde Bottom Nav.

El botón central \`+\` funciona como Quick Actions.

\#\#\# Quick Actions

El botón central \`+\` puede mostrar acciones frecuentes relacionadas con Planner:

\* Crear tarea.  
\* Crear evento.

También existen acciones contextuales o por rol.

\#\#\# Search

El documento menciona búsqueda global capaz de buscar o ejecutar acciones.

Aplicable a Planner:

\* Buscar tareas.  
\* Buscar eventos.  
\* Ejecutar acciones como crear tarea o crear evento si se implementa como demo.

\#\#\# Home como entrada

Home muestra información de Planner y redirige:

\* Mis tareas → Planner.  
\* Próximos eventos → Calendar.  
\* Tareas agrupadas por Responsabilidad.  
\* Card positiva cuando no hay tareas pendientes.

\#\#\# Cards y widgets

Home usa bloques/cards oficiales. Planner puede reutilizar ese patrón:

\* Cards para tareas.  
\* Cards para eventos.  
\* Cards agrupadas por responsabilidad.  
\* Cards de “Todo al día”.  
\* Cards de atención requerida.

\#\#\# Filtros

Para Tasks aparecen filtros:

\* Todas.  
\* Mías.  
\* Familia.  
\* Recurrentes.  
\* Completadas.

\#\#\# Agrupación

Para Tasks aparece agrupación por:

\* Responsabilidad.  
\* Prioridad.  
\* Fecha.

\#\#\# Stack de navegación

Se menciona stack:

\* Tasks.  
\* Task Detail.  
\* Edit Task.  
\* History.

También se menciona Calendar dentro de Planner.

\#\#\# Modales

Se menciona modal para crear tarea y modal para crear evento.

\#\#\# Estados visibles

Estados aplicables:

\* Pendiente.  
\* En progreso.  
\* Completada.  
\* Cancelada.  
\* Vencida como estado calculado, no manual.  
\* Programado.  
\* Completado.  
\* Cancelado.  
\* “Todo al día” como estado positivo en Home.

\#\#\# Experiencia por rol

Home y navegación se adaptan por rol.

Aplicable a Planner:

\* Coordinador: visión completa del hogar.  
\* Adulto: visión operativa.  
\* Adolescente: foco en tareas, eventos y coordinación.  
\* Niño: experiencia simplificada.  
\* Adulto Mayor: briefing, tareas, eventos, personas, medicación, recordatorios.  
\* Invitado: acceso mínimo.  
\* Empleado Familiar: trabajo asignado, fuera de MVP actual.

\---

\#\# 5\. Información directa sobre Planner

Planner es el núcleo operativo de HomePlus.

Administra:

\* Tasks.  
\* Calendar.  
\* Goals.  
\* Responsabilidades.

Planner se relaciona con:

\* People, porque tareas y eventos se asignan o vinculan a personas.  
\* Home, porque Home muestra tareas y eventos.  
\* Geni, porque puede organizar tareas/eventos/metas en un futuro.  
\* Notifications, porque puede haber recordatorios o notificaciones futuras.  
\* Audit, porque acciones importantes de Planner pueden quedar registradas.  
\* Inventory/Assets/Finance, porque pueden generar o relacionarse con tareas en el ecosistema futuro.

\#\#\# Aplicable al frontend MVP

\* Planner debe tener una entrada clara desde Bottom Nav.  
\* Planner debe separar Tasks y Calendar.  
\* Planner puede mostrar Goals como tab o sección futura, pero no desarrollarlo como MVP real.  
\* Tasks debe ser la parte más operativa.  
\* Calendar debe permitir ver eventos.  
\* Responsabilidades deben ayudar a ordenar tareas.

\#\#\# POST-MVP / futuro

\* Goals completos.  
\* Geni organizando Planner.  
\* Automatizaciones.  
\* Auditoría completa visible.  
\* Notificaciones reales.  
\* Integraciones reales con Inventory, Assets, Finance y Presence.  
\* Offline sync.

\---

\#\# 6\. Información sobre Tasks

\#\#\# MVP actual

Tasks representa trabajo pendiente o realizado.

Campos principales encontrados:

\* Título.  
\* Descripción.  
\* Responsable.  
\* Fecha de inicio.  
\* Fecha de vencimiento.  
\* Prioridad.  
\* Estado.  
\* Responsabilidad asociada.  
\* Goal asociada.  
\* Archivos.  
\* Comentarios.

Para MVP actual, los campos más útiles para frontend son:

\* Título.  
\* Descripción.  
\* Responsable.  
\* Fecha de vencimiento.  
\* Prioridad.  
\* Estado.  
\* Responsabilidad asociada.

Estados encontrados:

\* Pendiente.  
\* En progreso.  
\* Completada.  
\* Cancelada.

Regla especial:

\* Vencida es calculada automáticamente.

Prioridades encontradas:

\* Baja.  
\* Media.  
\* Alta.  
\* Crítica.

Acciones encontradas o aplicables desde el documento:

\* Crear tarea.  
\* Editar tarea.  
\* Completar tarea.  
\* Asignar responsable.  
\* Reasignar tarea.  
\* Ver detalle.  
\* Ver historial.  
\* Filtrar tareas.  
\* Agrupar tareas.

UI encontrada:

\* Planner → Tasks.  
\* Task Detail.  
\* Edit Task.  
\* History.  
\* Modal para crear tarea.  
\* Quick Action: Crear tarea.  
\* Home muestra tareas agrupadas por Responsabilidad.

Agrupaciones encontradas:

\* Por Responsabilidad.  
\* Por Prioridad.  
\* Por Fecha.

Filtros encontrados:

\* Todas.  
\* Mías.  
\* Familia.  
\* Recurrentes.  
\* Completadas.

Relación con Home:

\* Home muestra tareas agrupadas por Responsabilidad.  
\* Si se completan tareas, los widgets desaparecen y Home se reorganiza.  
\* Si no hay tareas, aparece una card positiva “Todo al día”.  
\* Home redirige hacia Planner.

Relación con roles:

\* Adulto puede crear tareas.  
\* Adulto puede reasignar tareas.  
\* Adolescente puede administrar tareas propias.  
\* Adulto Mayor mantiene acceso a tareas.  
\* Invitado tiene acceso mínimo.  
\* Empleado Familiar ve trabajo asignado, pero queda fuera del MVP actual.

\#\#\# POST-MVP / futuro

Marcar como POST-MVP:

\* Subtareas.  
\* Progreso de subtareas.  
\* Comentarios.  
\* Adjuntos.  
\* Archivos.  
\* Audio.  
\* Dependencias entre tareas.  
\* Timeline avanzado.  
\* Goal asociada.  
\* Streaks.  
\* Recurrencia avanzada.  
\* Auditoría completa visible.  
\* Automatizaciones que crean tareas.  
\* Geni organizando tareas.  
\* Integraciones reales desde Inventory, Assets o Finance.

\#\#\# Dudas o decisiones abiertas

\* El documento define estados Pendiente / En progreso / Completada / Cancelada, pero el MVP actual de verificación puede requerir estados distintos.  
\* El documento dice que la verificación no crea un estado separado; esto puede chocar con un flujo MVP que use \`awaiting\_verification\` o \`verified\`.  
\* No aparece un contrato visual exacto de task card.  
\* No aparece una pantalla final diseñada para crear tarea.  
\* No se define quién puede verificar tareas.  
\* No se define eliminación de tareas.  
\* No se define si toda tarea debe tener responsabilidad obligatoria en MVP.  
\* No se definen templates predefinidas con los nombres Limpieza, Compras, Mascotas, Medicación, Estudios y Pagos; el documento menciona plantillas en general y responsabilidades como Compras, Mascotas, Limpieza y Vehículos.

\---

\#\# 7\. Información sobre Calendar / Events

\#\#\# MVP actual

Calendar administra eventos.

Eventos pueden ser:

\* Familiares.  
\* Personales.

Estados de eventos encontrados:

\* Programado.  
\* Completado.  
\* Cancelado.

Regla especial:

\* No existe Postergado.  
\* Postergar equivale a modificar fecha.

Participantes:

\* Los eventos pueden tener múltiples participantes.

Acciones encontradas o aplicables desde el documento:

\* Crear evento.  
\* Modificar fecha de evento.  
\* Ver próximos eventos.  
\* Abrir Calendar desde Home.  
\* Crear evento desde Quick Actions.

UI encontrada:

\* Planner → Calendar.  
\* Home → Próximos Eventos.  
\* Quick Action: Crear evento.  
\* Modal para crear evento.

Relación con Home:

\* Home muestra Próximos Eventos.  
\* Próximos eventos redirige a Calendar.  
\* Home resume; Calendar administra.

Relación con roles:

\* Adulto puede crear eventos.  
\* Adolescente puede crear eventos familiares.  
\* Adulto Mayor prioriza eventos.  
\* Invitado tiene acceso mínimo.

\#\#\# POST-MVP / futuro

Marcar como POST-MVP:

\* Participantes avanzados.  
\* Estados de asistencia como accepted / declined / maybe si aparecen luego.  
\* Integración con HomeCloud/álbumes.  
\* Sugerencias de media desde eventos.  
\* Geni detectando retrasos o proponiendo acciones.  
\* Automatizaciones basadas en eventos.  
\* Notificaciones push reales.  
\* Offline sync.  
\* Recurrencia compleja.  
\* RRULE.  
\* EXDATE.  
\* Excepciones avanzadas.

\#\#\# Dudas o decisiones abiertas

\* No se definen vistas día / semana / mes.  
\* No se define agenda visual.  
\* No se listan campos formales del evento como título, fecha/hora inicio, fecha/hora fin o ubicación.  
\* No aparece eliminar evento.  
\* No aparece cancelar evento como acción UI, aunque existe estado Cancelado.  
\* No aparece contrato API.  
\* No se especifica si Calendar debe mostrar tareas con fecha, aunque el MVP ideal puede requerirlo.  
\* No se define recurrencia simple con valores none / daily / weekly / monthly.

\---

\#\# 8\. Información sobre Goals

Goals aparecen dentro de Planner, pero quedan fuera del MVP actual.

Información encontrada:

\* Goals representan objetivos personales o familiares.  
\* Modelo oficial:

  \* Goal.  
  \* Hitos.  
  \* Tasks.  
\* Estados:

  \* Activa.  
  \* Completada.  
  \* Fallida.  
\* Las tareas pueden avanzar metas.  
\* Las metas pueden vincularse con Finance/Fondos.  
\* Geni puede estimar progreso en metas complejas.

Uso visual o futuro:

\* Goals pueden inspirar una sección futura dentro de Planner.  
\* Puede existir como tab visual deshabilitado, placeholder o referencia futura si se necesita mostrar profundidad del producto.  
\* No debe convertirse en backend real para MVP actual.

Clasificación:

\* POST-MVP / futuro.  
\* No desarrollar Goals real en el Planner MVP actual.

\---

\#\# 9\. Responsabilidades, templates y categorías

\#\#\# Responsabilidades

Responsabilidades agrupan áreas operativas del hogar.

Ejemplos explícitos:

\* Compras.  
\* Mascotas.  
\* Limpieza.  
\* Vehículos.

Reglas encontradas:

\* Una tarea posee una única responsabilidad principal.  
\* No hay múltiples responsabilidades por tarea.  
\* Una responsabilidad puede tener múltiples personas.  
\* Las responsabilidades poseen miembros asignados.  
\* Responsabilidades no son dominio independiente; funcionan como eje organizador de Tasks.

Aplicación a Planner Frontend:

\* Las responsabilidades pueden mostrarse como chips, badges o secciones.  
\* Las tareas pueden agruparse por responsabilidad.  
\* La creación de tarea puede incluir selector de responsabilidad.  
\* Home puede mostrar tareas agrupadas por responsabilidad.

\#\#\# Templates

Información encontrada:

\* Existen plantillas de tareas.  
\* Inicialmente solo para Tasks.

No se especifica:

\* Lista de templates.  
\* CRUD de templates.  
\* Diseño de templates.  
\* Si template y responsabilidad son conceptos separados visualmente.  
\* Si las templates son editables.

Clasificación:

\* Templates como atajo visual pueden servir para MVP.  
\* CRUD de templates queda POST-MVP.  
\* TaskTemplate como entidad avanzada queda POST-MVP si implica backend.

\#\#\# Categorías

El documento usa Responsabilidad como agrupador operativo.

No aparece una entidad clara “Categoría” para tareas.

Aplicación:

\* No duplicar visualmente Categoría si Responsabilidad ya cumple ese rol.  
\* Si se usa categoría en UI, debería validarse después contra Responsabilidad.

\#\#\# Dudas abiertas

\* El MVP deseado puede necesitar Limpieza, Compras, Mascotas, Medicación, Estudios, Pagos, Vehículos, Finanzas y Otro, pero el documento solo menciona explícitamente Compras, Mascotas, Limpieza y Vehículos.  
\* Medicación aparece en otros contextos relacionados con Adulto Mayor/Inventory, no como responsabilidad oficial de Planner en esta fuente.  
\* Finanzas aparece como dominio externo, no como responsabilidad oficial de Tasks en esta fuente.  
\* Estudios no aparece como responsabilidad de Planner en esta fuente.

\---

\#\# 10\. Quick Actions aplicables a Planner

El botón central \`+\` abre Quick Actions.

Acciones relacionadas con Planner encontradas:

\* Crear tarea.  
\* Crear evento.

Características encontradas:

\* Quick Actions pueden ser contextuales.  
\* Quick Actions pueden personalizarse durante onboarding mediante sugerencias por rol.  
\* Quick Actions pueden reordenarse según uso/frecuencia.  
\* Quick Actions deben permitir acceso rápido a acciones frecuentes.

Aplicación a Planner Frontend:

\* \`+\` debe permitir crear tarea rápidamente.  
\* \`+\` debe permitir crear evento rápidamente.  
\* Crear tarea puede abrir modal.  
\* Crear evento puede abrir modal.  
\* Acciones más avanzadas quedan futuras.

POST-MVP:

\* Crear objetivo.  
\* Preguntar a Geni para organizar tareas.  
\* Automatizaciones.  
\* Acciones inteligentes por patrones.  
\* Reordenamiento avanzado por IA si requiere lógica real.

\---

\#\# 11\. Home relacionado con Planner

Regla central:

\* Home resume.  
\* Planner administra.

\#\#\# Tareas en Home

Home puede mostrar:

\* Tareas pendientes.  
\* Tareas agrupadas por Responsabilidad.  
\* Mis tareas.  
\* Estado positivo si no hay tareas: “Todo al día”.  
\* Reorganización de widgets cuando se completan tareas.

Navegación:

\* Tareas en Home → Planner.

\#\#\# Eventos en Home

Home puede mostrar:

\* Próximos eventos.

Navegación:

\* Próximos eventos → Calendar.

\#\#\# Atención requerida

Home incluye Atención Requerida.

Puede incluir elementos relacionados con Planner si hay:

\* Tareas vencidas.  
\* Tareas críticas.  
\* Eventos próximos importantes.  
\* Cambios importantes.

El documento menciona también alertas de otros módulos, pero no deben desarrollarse desde este fragment.

\#\#\# Briefing

Briefing es generado por Geni en el documento.

Para MVP actual, debe tratarse como:

\* MOCK o demo visual.  
\* Texto fijo o generado con datos simples.  
\* Puede resumir tareas y eventos.  
\* No implementar Geni real.

\#\#\# Home por rol

Home adapta foco según rol:

\* Coordinador: visión completa.  
\* Adulto: visión operativa.  
\* Adolescente: tareas, eventos y coordinación.  
\* Niño: simplificado.  
\* Adulto Mayor: briefing, tareas, eventos, recordatorios, medicación.  
\* Invitado: acceso mínimo.

Aplicación a Planner:

\* El Planner puede tener una experiencia visual más simple para roles limitados si el MVP lo permite.  
\* No desarrollar permisos finos sin otra fuente.

\---

\#\# 12\. Patrones visuales reutilizables

\#\#\# Aplicable ahora a Planner

\* Bottom Nav con Planner como tab principal.  
\* Botón central \`+\` para acciones rápidas.  
\* Cards para tareas/eventos.  
\* Chips o filtros para listas.  
\* Agrupación visual por Responsabilidad.  
\* Tabs o secciones internas para Tasks y Calendar.  
\* Estados visuales por prioridad.  
\* Estados visuales por estado de tarea/evento.  
\* Empty state positivo cuando todo está al día.  
\* Home cards que redirigen a Planner/Calendar.  
\* Modales para crear tarea/evento.  
\* Stack de detalle y edición.

\#\#\# Referencia visual para más adelante

\* Timeline de tareas.  
\* Historial de cambios.  
\* Goals visuales.  
\* Streaks.  
\* Geni suggestions.  
\* Atención requerida avanzada.  
\* Métricas de carga familiar reales.  
\* Widgets contextuales multi-dominio.

\#\#\# No aplicable

\* Finance completo.  
\* Inventory completo.  
\* Assets completo.  
\* HomeCloud completo.  
\* Presence GPS.  
\* SOS real.  
\* Feed real.  
\* Automatizaciones reales.  
\* Offline Sync real.  
\* OCR/storage real.

\---

\#\# 13\. Reglas funcionales extraídas

\* Planner es el núcleo operativo de HomePlus.  
\* Planner administra Tasks, Calendar, Goals y Responsabilidades.  
\* Para MVP, Goals debe quedar como referencia visual/futura.  
\* Tasks representa trabajo pendiente o realizado.  
\* Calendar administra eventos.  
\* Eventos pueden ser familiares o personales.  
\* Home solo resume; Planner administra.  
\* Home debe mostrar tareas y próximos eventos.  
\* Próximos eventos en Home deben navegar a Calendar.  
\* Mis tareas o tareas en Home deben navegar a Planner.  
\* Las tareas pueden agruparse por Responsabilidad.  
\* Una tarea posee una única responsabilidad principal.  
\* No múltiples responsabilidades por tarea.  
\* Una responsabilidad puede tener múltiples personas.  
\* Las tareas tienen responsable.  
\* Las tareas tienen prioridad.  
\* Las tareas tienen fecha de vencimiento.  
\* Vencida no es un estado manual; se calcula automáticamente.  
\* Las prioridades encontradas son Baja, Media, Alta y Crítica.  
\* Los estados de tarea encontrados son Pendiente, En progreso, Completada y Cancelada.  
\* Los estados de evento encontrados son Programado, Completado y Cancelado.  
\* No existe estado Postergado para eventos; postergar equivale a modificar fecha.  
\* Quick Actions debe permitir crear tarea.  
\* Quick Actions debe permitir crear evento.  
\* Crear tarea puede abrir modal.  
\* Crear evento puede abrir modal.  
\* Adulto puede crear tareas y eventos.  
\* Adulto puede reasignar tareas.  
\* Adolescente puede crear eventos familiares y administrar tareas propias.  
\* Adulto Mayor mantiene acceso a tareas y eventos.  
\* Invitado tiene acceso mínimo.  
\* La privacidad individual prevalece sobre roles.  
\* Las funciones avanzadas deben quedar ocultas o futuras si complejizan el MVP.

\---

\#\# 14\. Ideas derivadas útiles

\* Propuesta UX derivada / requiere validación del usuario: usar chips de Responsabilidad en la parte superior de Tasks para filtrar rápidamente por Limpieza, Compras, Mascotas y Vehículos.  
\* Propuesta UX derivada / requiere validación del usuario: mostrar una card “Hoy” con tareas vencidas, tareas de hoy y próximos eventos.  
\* Propuesta UX derivada / requiere validación del usuario: usar una card compacta de tarea con título, responsable, prioridad, vencimiento y checkbox de completar.  
\* Propuesta UX derivada / requiere validación del usuario: usar badges de prioridad con texto Baja / Media / Alta / Crítica.  
\* Propuesta UX derivada / requiere validación del usuario: usar un modal corto para crear tarea con solo título, responsable, fecha, prioridad y responsabilidad.  
\* Propuesta UX derivada / requiere validación del usuario: usar un modal corto para crear evento con título, fecha/hora y participantes.  
\* Propuesta UX derivada / requiere validación del usuario: mostrar Goals como pestaña “Próximamente” o card bloqueada si se quiere que Planner parezca más completo sin implementar Goals.  
\* Propuesta UX derivada / requiere validación del usuario: mostrar “Todo al día” como empty state positivo dentro de Planner, no solo en Home.  
\* Propuesta UX derivada / requiere validación del usuario: incluir desde Home un botón “Ver todo” en tareas y eventos para navegar a Planner/Calendar.  
\* Propuesta UX derivada / requiere validación del usuario: tratar templates como atajos visuales de creación, no como entidad editable.

\---

\#\# 15\. Decisiones que quedan abiertas

\* Definir si Planner MVP tendrá tabs internas: Tasks / Calendar / Goals.  
\* Definir si Goals aparece oculto, visible como futuro o no aparece.  
\* Definir si Calendar tendrá vista día, semana y mes, ya que este documento no lo especifica.  
\* Definir si Calendar mostrará tareas con fecha, ya que este documento no lo afirma explícitamente.  
\* Definir estados técnicos finales de Task.  
\* Resolver contradicción entre verificación sin estado separado y verification flow con estados específicos.  
\* Definir si se usará estado “En progreso” en MVP.  
\* Definir si se usará estado “Cancelada” para Tasks en MVP.  
\* Definir si completar tarea es checkbox directo, botón o acción en detalle.  
\* Definir quién puede verificar tareas.  
\* Definir si eliminar tarea entra al MVP visual.  
\* Definir si cancelar evento entra al MVP visual.  
\* Definir campos mínimos de Event, porque el documento no los lista.  
\* Definir campos mínimos de creación de tarea.  
\* Definir si Responsabilidad es obligatoria en MVP.  
\* Definir lista final de responsabilidades/templates.  
\* Definir si Medicación, Estudios, Pagos, Finanzas y Otro entran como categorías visuales aunque no aparezcan como responsabilidades explícitas en este documento.  
\* Definir si se muestra timeline/historial o se deja POST-MVP.  
\* Definir si se muestra auditoría real o solo feedback visual.  
\* Definir estrategia de datos: real, mock, local o mixto.  
\* Definir empty states, loading states, errors y toasts, porque el documento no los especifica en detalle.

\---

\#\# 16\. Qué NO debe entrar al MVP actual

No debería entrar como implementación real del Planner MVP actual:

\* Goals backend real.  
\* Milestones.  
\* Streaks.  
\* Subtareas complejas.  
\* Comentarios reales.  
\* Adjuntos reales.  
\* Archivos.  
\* Audio.  
\* Timeline avanzado.  
\* Dependencias entre tareas.  
\* Recurrencia compleja.  
\* RRULE.  
\* EXDATE.  
\* Participantes avanzados con estados de asistencia.  
\* Notificaciones push reales.  
\* Offline sync.  
\* Auditoría completa visible.  
\* Geni real.  
\* Automatizaciones reales.  
\* Finance backend real.  
\* Inventory backend real.  
\* Assets backend real.  
\* Presence GPS real.  
\* HomeCloud storage/OCR real.  
\* Multi-hogar avanzado.  
\* Exportación de datos.  
\* Feed real.  
\* SOS real.  
\* Mapas reales.  
\* Geofencing real.

\---

\#\# 17\. Extractos o referencias internas importantes

Referencias internas útiles:

\* \`01.01 Propósito\`: HomePlus como plataforma integral de coordinación familiar.  
\* \`01.02 Problema que resuelve\`: fragmentación entre calendarios, tareas, chats, notas y recordatorios.  
\* \`01.06 Principio fundamental\`: coordinar, reducir carga mental, evitar pérdida de información y mejorar organización.  
\* \`02.06 Configuración mínima\`: no trasladar complejidad al usuario.  
\* \`02.11 Simplicidad visual\`: la complejidad interna no debe reflejarse en la interfaz.  
\* \`02.12 Home como centro operativo\`: Home resume, no administra.  
\* \`03.02 Dominios oficiales — Planner\`: Planner administra Tasks, Calendar y Goals.  
\* \`04 Roles y permisos\`: permisos aplicables a creación de tareas/eventos y experiencia por rol.  
\* \`05 People\`: persona, membresía, roles y participación transversal en Tasks/Events.  
\* \`06 Planner\`: fuente principal para Tasks, Calendar, Goals y Responsabilidades.  
\* \`06.02–06.16 Tasks\`: objetivo, campos, estados, prioridades, dependencias, recurrencias, subtareas, comentarios, adjuntos, timeline, verificación, asignación, plantillas.  
\* \`06.17–06.20 Responsabilidades\`: agrupador operativo de tareas.  
\* \`06.21–06.24 Calendar\`: eventos, tipos, estados y participantes.  
\* \`18 Home\`: bloques oficiales y relación de Home con tareas/eventos.  
\* \`21 Estados\`: estados oficiales de entidades.  
\* \`22 Relaciones\`: relaciones Planner con personas, responsabilidades, goals, eventos y Home.  
\* \`23 Auditoría\`: acciones importantes sobre Planner.  
\* \`24 Navegación\`: Bottom Nav, Planner, Quick Actions, Search, stack y modales.  
\* \`25 Decisiones congeladas\`: Home informa y módulos administran.

\---

\#\# 18\. Conclusión operativa

Este documento aporta una base muy útil para el frontend ideal de Planner porque define el rol del módulo, sus áreas internas, sus relaciones con Home, People y Quick Actions, y varios patrones de navegación.

Partes que deben usarse en la spec final:

\* Planner como núcleo operativo.  
\* Separación Tasks / Calendar / Goals.  
\* Goals solo como futuro o referencia visual.  
\* Tasks con responsable, fecha de vencimiento, prioridad, estado y responsabilidad.  
\* Agrupación de tareas por Responsabilidad.  
\* Filtros de Tasks: Todas, Mías, Familia, Recurrentes, Completadas.  
\* Agrupación por Responsabilidad, Prioridad y Fecha.  
\* Quick Actions para crear tarea y crear evento.  
\* Home mostrando tareas y próximos eventos.  
\* Home solo resume; Planner administra.  
\* Empty state positivo “Todo al día”.  
\* Calendar con eventos familiares/personales.  
\* Eventos con estados Programado, Completado y Cancelado.  
\* Simplicidad visual y configuración mínima.  
\* Experiencia adaptada por rol como principio, sin permisos finos inventados.

Partes que deben ignorarse por ahora o quedar POST-MVP:

\* Goals completos.  
\* Milestones.  
\* Streaks.  
\* Subtareas.  
\* Comentarios.  
\* Adjuntos.  
\* Dependencias.  
\* Timeline avanzado.  
\* Geni real.  
\* Automatizaciones.  
\* Notificaciones reales.  
\* Offline sync.  
\* Auditoría completa.  
\* Integraciones reales con Finance, Inventory, Assets, Presence y HomeCloud.

Este fragment debe fusionarse después con otros fragments más específicos de diseño visual, UX, contratos técnicos o pantallas, porque este documento no define un diseño final completo ni contratos API/frontend detallados.

\# planner\_frontend\_fragment\_HomePlus\_Diseno\_de\_Pantallas\_de\_Home\_V1

\#\# 1\. Fuente

\* Documento: \`HomePlus — Diseño de Pantallas de Home V1.md\`  
\* Archivo de comprensión asociado: \`Diseño de pantallas home v1.txt\`  
\* Source map del mismo documento: \`source\_map\_HomePlus\_Diseno\_de\_Pantallas\_de\_Home\_V1.md\`  
\* Tipo de documento: Documento de diseño visual / UX de Home.  
\* Alcance del documento: Mobile-first 375×812px. Home por roles. Bottom Nav. Widgets del Home. Patrones visuales y estados UX.  
\* Nivel de utilidad para Planner Frontend: \*\*Medio\*\*  
\* Motivo: no define pantallas completas de Planner, pero aporta mucho sobre cómo Planner debe integrarse con Home, cómo deben verse tareas/eventos resumidos, cómo debe comportarse la navegación, qué feedback usar al completar tareas y qué patrones visuales reutilizar.

\---

\#\# 2\. Resumen útil para Planner Frontend

Este documento aporta información indirecta y accionable para el frontend ideal de Planner desde la perspectiva de Home:

\* Home es el centro operativo y resume información; Planner administra tareas y calendario.  
\* Planner aparece como destino directo en Bottom Nav.  
\* Home muestra tareas pendientes, tareas completadas, tareas vencidas y próximos eventos.  
\* Las tareas en Home se muestran como lista con checkbox, metadata, agrupación por Responsabilidad y acción 1-tap.  
\* Los eventos se muestran como lista con chip de fecha relativa, hora, título, ubicación y chevron hacia Planner \> Calendar.  
\* La navegación oficial queda congelada como \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\`.  
\* Quick Actions existe como botón \`+\` central; Geni es slot fijo. El documento no define acciones específicas de Planner en ese panel, pero sí establece el patrón.  
\* El diseño mobile prioriza claridad, lectura rápida, acción principal en zona de pulgar, scroll mínimo y feedback inmediato.  
\* El archivo de comprensión asociado sí menciona entidades de Planner: Task, Subtarea, Dependencia, Recurrencia, Comentario, Adjunto, TimelineEntry, Verificación, Plantilla, Responsabilidad, Evento, Participante, Goal e Hito.  
\* Varias entidades del archivo de comprensión son demasiado avanzadas para el MVP visual actual y deben quedar POST-MVP.

\---

\#\# 3\. Principios de producto aplicables

\* Home debe responder:

  \* ¿cómo está el hogar?  
  \* ¿qué requiere atención?  
  \* ¿qué debo hacer yo?  
  \* ¿hay riesgo?  
\* Home resume información y no administra información.  
\* Toda información mostrada en Home conduce al módulo que la administra.  
\* Aplicación al Planner:

  \* Home puede mostrar tareas/eventos.  
  \* Planner debe ser el lugar donde esas tareas/eventos se administran.  
  \* La card de Home debe ser una entrada contextual al módulo Planner, no un reemplazo del Planner.  
\* La jerarquía de Home tiene 4 capas:

  \* Capa 1: Atención.  
  \* Capa 2: Acción.  
  \* Capa 3: Contexto.  
  \* Capa 4: Exploración.  
\* Aplicación al Planner:

  \* Planner también debería priorizar primero lo urgente o accionable.  
  \* Las tareas de hoy, vencidas o propias deberían aparecer antes que información secundaria.  
  \* La información debería agruparse por relevancia, no solamente por cronología.  
\* Mobile-first absoluto:

  \* pantalla primaria 375×812px.  
  \* Capa 1 sin scroll.  
  \* Scroll solo si es inevitable.  
\* La acción principal debe estar accesible con el pulgar.  
\* Para acciones frecuentes, se prioriza experiencia 1-tap.  
\* Las interfaces deben ser claras, no invasivas y no alarmistas.  
\* El tono evita presión social:

  \* en Adulto, la sugerencia “¿Podés ayudar con algo más?” no menciona a quién.  
  \* no se comparan miembros públicamente salvo vistas permitidas para Coordinador.  
\* La adaptación por rol cambia el contenido, no la estructura de navegación.  
\* El contenido visible depende del rol y permisos, especialmente en tareas, eventos y carga familiar.  
\* El Home puede reorganizarse cuando se completan tareas.  
\* Aplicación al Planner:

  \* completar una tarea debe producir cambios visibles inmediatos.  
  \* la lista debe reflejar estado completado con tachado/opacidad.  
  \* las tareas completadas deben moverse o quedar visualmente subordinadas.

\---

\#\# 4\. UX/UI aplicable

\#\#\# Navegación

\* Bottom Nav congelada:

  \* \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\`  
\* Planner es un tab principal.  
\* People agrupa Feed, Presence y Personas.  
\* More contiene herramientas especializadas.  
\* Quick Actions (\`+\`) abre panel flotante con blur de fondo.  
\* Geni es el único elemento fijo en Quick Actions.  
\* SOS no está en Bottom Nav ni en Quick Actions.  
\* Tap en tab activo:

  \* scroll to top;  
  \* refresh de la pantalla actual.  
\* Home debe conducir al módulo correspondiente:

  \* tareas → Planner;  
  \* próximos eventos → Planner \> Calendar.

\#\#\# Estructura visual

\* Jerarquía por capas:

  \* atención;  
  \* acción;  
  \* contexto;  
  \* exploración.  
\* Home debe caber en una pantalla si es posible.  
\* Scroll vertical permitido si excede pantalla.  
\* Las listas se agrupan por relevancia.  
\* Los bloques que un rol no ve se omiten, pero se preserva el orden relativo de los bloques visibles.  
\* El orden canónico de Home incluye:

  \* Briefing;  
  \* Atención Requerida;  
  \* Carga Familiar;  
  \* Próximos Eventos;  
  \* Tareas;  
  \* Finanzas Relevantes;  
  \* Presence Resumido;  
  \* Actividad Familiar.

\#\#\# Componentes reutilizables para Planner

\* Card Destacada:

  \* borde izquierdo \`prim-500\`;  
  \* 4px.  
\* Card Alerta:

  \* \`bg alert-100\`;  
  \* borde \`alert-500\`.  
\* Card Estándar.  
\* ListItem compacto.  
\* ListItem con leading icon.  
\* Checkbox:

  \* táctil;  
  \* target 44–56px según rol;  
  \* háptico ligero;  
  \* animación de completado.  
\* Chip:

  \* fechas relativas: HOY, MAÑ, LUN;  
  \* tap, no swipe horizontal en Adulto Mayor.  
\* Badge:

  \* success;  
  \* alert;  
  \* no usar error rojo en nav.  
\* ProgressBar:

  \* \`prim-500\` normal;  
  \* \`alert-500\` si \>60%;  
  \* \`acent-500\` para XP/adolescente.  
\* BottomSheet:

  \* usado para detalle o expansión.  
  \* altura 50% para Briefing ampliado.  
\* Modal:

  \* solo para confirmaciones.  
  \* centrado, sin scroll.  
  \* scale 0.95 → 1 \+ fade 250ms.  
\* Skeleton:

  \* listas \>300ms.  
  \* fade-in al aparecer datos.  
\* Spinner:

  \* operaciones \>300ms.  
  \* en botones tras 400ms de espera.  
\* Toast:

  \* zona superior;  
  \* duración 4s default;  
  \* 8s Adulto Mayor;  
  \* puede incluir botón Deshacer para completar tareas.  
\* EmptyState:

  \* estado vacío con acción sugerida.  
  \* reemplaza tutoriales.  
  \* fade-in al aparecer datos.  
\* Banner:

  \* sin conexión;  
  \* full-width;  
  \* slide-down.

\#\#\# Copywriting útil

\* Briefing normal con tareas/eventos:

  \* “Hoy: 4 tareas, 2 eventos. La carga está 60/40. ¿Arrancamos por las tareas?”  
\* Todo al día:

  \* “Todo al día por acá. Nada pendiente.”  
\* Mucha carga:

  \* “Hoy viene cargado: 6 tareas, 3 eventos y 1 vencimiento. ¿Revisamos prioridades?”  
\* Carga desbalanceada:

  \* “La carga está 70/30 esta semana. ¿Querés revisar la distribución?”  
\* Sin conexión:

  \* “Sin conexión. Última información: hace 45 min.”  
\* Adulto con tareas:

  \* “Tenés 2 tareas para hoy. La tarjeta del auto vence el viernes.”  
\* Adulto todo al día:

  \* “Sin tareas pendientes. Nada que necesite tu atención ahora.”  
\* Adulto mucha carga:

  \* “Tenés 4 tareas esta semana. ¿Revisamos prioridades?”  
\* Invitado:

  \* “Rosa, hoy tiene 1 tarea asignada.”  
\* Invitado sin tareas:

  \* “No tiene tareas pendientes.”  
\* Primer uso:

  \* “Bienvenida a tu hogar. Estas son tus primeras acciones.”  
  \* “Creá tu primera tarea →”  
  \* “Invitá a alguien →”  
  \* “0 tareas · 0 eventos · Sin gastos”

\---

\#\# 5\. Información directa sobre Planner

\* Planner aparece como tab en Bottom Navigation.  
\* Planner es destino de navegación desde Home.  
\* Planner administra lo que Home resume.  
\* El documento indica que el destino del tab Planner es:

  \* Tasks;  
  \* Calendar;  
  \* Goals.  
\* Calendar está dentro de Planner.  
\* Home \> Próximos Eventos navega al detalle del evento en:

  \* \`Planner \> Calendar\`.  
\* El archivo de comprensión menciona:

  \* Task;  
  \* Subtarea;  
  \* Dependencia;  
  \* Recurrencia;  
  \* Comentario;  
  \* Adjunto;  
  \* TimelineEntry;  
  \* Verificación;  
  \* Plantilla;  
  \* Responsabilidad;  
  \* Evento;  
  \* Participante;  
  \* Goal;  
  \* Hito.  
\* El documento principal no define:

  \* pantalla principal de Planner;  
  \* tabs internos de Planner;  
  \* formulario de crear tarea;  
  \* formulario de crear evento;  
  \* vista día/semana/mes;  
  \* filtros internos de Planner;  
  \* endpoints;  
  \* request/response;  
  \* contrato de service.

\---

\#\# 6\. Información sobre Tasks

\#\#\# MVP actual

\* Home muestra tareas pendientes propias como Capa 2 / Acción.  
\* Tareas en Home:

  \* componente: lista de items con checkbox;  
  \* agrupación: por Responsabilidad;  
  \* máximo 4 tareas visibles;  
  \* si hay más: “Ver todas (8) →”;  
  \* cada item: checkbox \+ título \+ metadata;  
  \* metadata puede incluir:

    \* vencimiento;  
    \* monto;  
    \* responsable;  
  \* tap en checkbox completa la tarea;  
  \* feedback:

    \* háptico ligero;  
    \* animación;  
    \* toast “Deshacer” 5s;  
  \* tareas completadas:

    \* al final;  
    \* tachado sutil;  
    \* opacidad reducida;  
  \* cuando las tareas se completan:

    \* widgets desaparecen;  
    \* Home se reorganiza automáticamente.  
\* Atención Requerida puede incluir:

  \* tareas vencidas (\>24h).  
\* Orden de Atención Requerida:

  \* por proximidad de vencimiento después de prioridad máxima.  
\* Adulto:

  \* solo ve tareas propias;  
  \* nunca ve tareas de otros miembros;  
  \* máximo 4 tareas visibles;  
  \* sin agrupación por responsable porque todas son propias.  
\* Invitado:

  \* solo ve tareas donde es \`assigned\_to\`;  
  \* sin visibilidad de otras tareas del hogar;  
  \* checkbox para completar igual que otros roles;  
  \* sin XP, sin rachas, sin gamificación.  
\* Adulto Mayor:

  \* el documento no define Planner completo, pero sí establece targets más grandes para componentes y duración mayor de toast.  
\* Niño/Adolescente:

  \* el documento menciona experiencia visual/gamificada en Home, pero no define Planner completo.  
\* Ejemplos de tareas extraíbles:

  \* Pagar servicios.  
  \* Comprar fruta.  
  \* Preparar viandas.  
  \* Limpieza general.  
  \* Lavar cortinas.  
\* Ejemplos de metadata:

  \* “Vence hoy · $45.000”  
  \* “Para el finde”  
  \* “Para mañana”  
  \* “Miércoles · 9:00 a 13:00”  
  \* “Para el viernes”  
  \* “Casa principal”  
\* El archivo de comprensión define Task como:

  \* unidad de trabajo pendiente o realizado.  
\* Estados encontrados en archivo de comprensión:

  \* Pendiente;  
  \* En Progreso;  
  \* Completada;  
  \* Cancelada.  
\* Vencida aparece como condición calculada en Home/Atención Requerida, no necesariamente como estado persistido.  
\* Relaciones encontradas:

  \* Task assigned\_to Persona;  
  \* Task belongs\_to Responsabilidad;  
  \* Task has\_subtask Subtarea;  
  \* Task depends\_on Task;  
  \* Task has\_comment Comentario;  
  \* Task has\_attachment Adjunto;  
  \* Task has\_timeline TimelineEntry;  
  \* Task requires\_verification Verificación;  
  \* Task contributes\_to Goal;  
  \* Task links\_to Evento;  
  \* Plantilla creates Task;  
  \* Recurrencia generates Task.

\#\#\# POST-MVP / futuro

\* Subtareas:

  \* aparecen como entidad.  
  \* un único nivel de anidamiento.  
  \* sin subtareas anidadas.  
\* Dependencias:

  \* relación entre tareas donde una bloquea a la otra hasta completarse.  
\* Recurrencia:

  \* genera nuevas instancias de Task sin reutilizar la misma.  
  \* preserva historial.  
\* Comentario:

  \* comentario en Task u otras entidades.  
\* Adjunto:

  \* archivo adjunto a Task: imagen, PDF, audio.  
\* TimelineEntry:

  \* entrada en la línea temporal de una Task;  
  \* incluye creación, cambios, completado y comentarios humanos.  
\* Goal:

  \* Task puede contribuir a Goal.  
  \* queda fuera del MVP actual como lógica real.  
\* Rachas:

  \* el archivo de comprensión menciona Task → racha de días completados → HomeScreen Niño/Adolescente.  
  \* debe quedar POST-MVP o referencia visual, no lógica obligatoria de Planner actual.  
\* Automatización:

  \* stock bajo puede crear tarea automáticamente.  
  \* debe quedar POST-MVP / no implementar automatización real.

\#\#\# Dudas o decisiones abiertas

\* El documento no define los estados MVP esperados \`pending\`, \`completed\`, \`awaiting\_verification\`, \`verified\`.  
\* El archivo de comprensión dice que Verificación es opcional y “no existe estado separado”, lo cual no resuelve un verification flow de frontend con estado propio.  
\* No se define si \`En Progreso\` o \`Cancelada\` deben existir en el MVP actual del Planner.  
\* No se define formulario de creación de tarea.  
\* No se define edición de tarea.  
\* No se define eliminación de tarea.  
\* No se define prioridad de tarea.  
\* No se define campo de descripción.  
\* No se define tipo de fecha límite.  
\* No se define comportamiento de tareas vencidas dentro de Planner, solo en Home.  
\* No se define UI de templates.  
\* No se define catálogo de templates predefinidas.  
\* No se define si Responsabilidad y Categoría son entidades separadas o labels visuales.  
\* No se define service ni API.

\---

\#\# 7\. Información sobre Calendar / Events

\#\#\# MVP actual

\* Home muestra “Próximos Eventos”.  
\* Próximos Eventos:

  \* componente: lista de items con chip de fecha;  
  \* máximo 3 eventos visibles para Coordinador;  
  \* máximo 2 eventos visibles para Adulto;  
  \* cada item:

    \* chip con día relativo: HOY, MAÑ, LUN, etc.;  
    \* título;  
    \* ubicación si tiene;  
    \* chevron;  
  \* orden: por cercanía temporal;  
  \* al tap navega al detalle del evento en \`Planner \> Calendar\`.  
\* Adulto:

  \* ve eventos propios \+ eventos del hogar donde es participante.  
\* Invitado:

  \* solo ve eventos donde es participante;  
  \* sin visibilidad de otros eventos del hogar.  
\* Ejemplos de eventos extraíbles:

  \* Dentista de Luca.  
  \* Reunión de padres.  
  \* Cena familiar.  
  \* Limpieza profunda.  
\* Ejemplos de metadata:

  \* “HOY 14:30”  
  \* “MAÑ 10:00”  
  \* “HOY 16:00”  
  \* “VIE 19:00”  
  \* “VIE 9:00”  
  \* “Av. Santa Fe 1234”  
  \* “Colegio San Marcos”  
  \* “En casa”  
  \* “Casa principal”  
\* El archivo de comprensión define Evento como:

  \* evento del calendario;  
  \* familiar o personal.  
\* Estados encontrados:

  \* Programado;  
  \* Completado;  
  \* Cancelado.  
\* El archivo de comprensión indica:

  \* sin estado Postergado.  
\* Participante:

  \* Persona asociada a un Evento como participante.  
\* Evento has\_participant Persona.  
\* Evento puede generar Recuerdo en FamilyCloud, pero eso queda fuera de MVP Planner.

\#\#\# POST-MVP / futuro

\* Participantes avanzados:

  \* accepted;  
  \* declined;  
  \* maybe;  
  \* no aparecen en este documento y no deben agregarse desde acá.  
\* Calendar → FamilyCloud:

  \* evento finalizado puede sugerir creación de recuerdo automático.  
  \* no implementar en Planner MVP.  
\* Recurrencia compleja:

  \* el archivo de comprensión menciona Recurrencia como entidad para Task, no define recurrencia de evento en este documento.  
\* No se detectan RRULE ni EXDATE.

\#\#\# Dudas o decisiones abiertas

\* No se define pantalla Calendar.  
\* No se definen vistas día, semana o mes.  
\* No se define si Calendar muestra tareas con fecha.  
\* No se define crear evento.  
\* No se define editar evento.  
\* No se define cancelar evento desde UI.  
\* No se define recurrencia simple \`none/daily/weekly/monthly\`.  
\* No se define formulario de evento.  
\* No se define service ni API.  
\* No se define si eventos personales y familiares comparten UI.  
\* No se define permisos detallados para crear/editar eventos.

\---

\#\# 8\. Información sobre Goals

\* Planner contiene Goals como parte del destino principal según el archivo de comprensión.  
\* Goal se define como:

  \* meta personal o familiar;  
  \* estructura: Goal → Hitos → Tasks;  
  \* estados: Activa, Completada, Fallida.  
\* Hito se define como:

  \* gran avance dentro de una Goal.  
\* Relaciones:

  \* Goal has\_milestone Hito.  
  \* Hito contains Task.  
  \* Task contributes\_to Goal.  
\* Aplicación para Planner Frontend:

  \* puede servir como referencia visual futura.  
  \* no debe convertirse en MVP actual si el alcance actual está centrado en Tasks/Events/Calendar.  
\* Clasificación:

  \* \*\*POST-MVP / futuro\*\*.  
\* No se debe implementar Goals real desde este documento.

\---

\#\# 9\. Responsabilidades, templates y categorías

\#\#\# Responsabilidades

\* Responsabilidad se define como:

  \* área operativa del hogar que agrupa tareas.  
  \* ejemplos explícitos del archivo de comprensión:

    \* Compras;  
    \* Mascotas;  
    \* Limpieza.  
  \* tiene miembros asignados.  
\* Home agrupa tareas por Responsabilidad.  
\* En Home:

  \* la agrupación por Responsabilidad aparece como etiqueta sutil.  
\* Carga Familiar se puede derivar de la distribución de tareas por miembro o categoría.  
\* Responsabilidad has\_member Persona.  
\* Task belongs\_to Responsabilidad.  
\* Aplicación al Planner:

  \* la lista de Tasks debería poder usar Responsabilidad como agrupador visual.  
  \* Responsabilidad no aparece como módulo independiente en este documento.  
  \* debe tratarse como lógica visual/organizativa dentro de Tasks.

\#\#\# Templates

\* Plantilla se define como:

  \* plantilla base para crear Tasks.  
  \* inicialmente solo para Tasks.  
\* Plantilla creates Task.  
\* El documento no define:

  \* pantalla de templates;  
  \* CRUD de templates;  
  \* lista de templates predefinidas;  
  \* edición de templates;  
  \* templates personalizadas.  
\* Clasificación:

  \* útil como concepto de creación rápida;  
  \* falta definición para frontend;  
  \* templates personalizadas o CRUD quedan POST-MVP.

\#\#\# Categorías

\* El documento no define Categoría como entidad específica de Planner.  
\* Aparecen categorías de notificación, pero no son categorías de tareas.  
\* No se debe inventar una categoría si Responsabilidad ya cubre agrupación visual.  
\* Decisión abierta:

  \* si categoría y responsabilidad son lo mismo visualmente o conceptos separados.

\---

\#\# 10\. Quick Actions aplicables a Planner

\* Quick Actions aparece como botón \`+\` central en Bottom Nav.  
\* Quick Actions abre un panel flotante con blur del fondo.  
\* Geni es el único elemento fijo.  
\* Acciones dinámicas ordenadas por:

  \* frecuencia;  
  \* recencia;  
  \* contexto.  
\* El documento principal no lista explícitamente “crear tarea” o “crear evento” como acciones de Quick Actions.  
\* El archivo de comprensión define QuickActions como:

  \* panel flotante con blur;  
  \* Geni fijo \+ acciones dinámicas.  
\* Aplicación a Planner:

  \* Quick Actions puede ser una entrada visual coherente para acciones de Planner si otra fuente lo confirma.  
  \* Desde este documento, no debe afirmarse como contrato real que Quick Actions contiene Crear tarea / Crear evento.  
\* Clasificación:

  \* Dependencia externa / no desarrollar Quick Actions completo en este fragment.  
  \* Patrón visual reusable para futuras acciones rápidas de Planner.  
\* No se encontró:

  \* crear tarea;  
  \* crear evento;  
  \* ver pendientes;  
  \* crear objetivo;  
  \* como acciones explícitas de Planner dentro del documento principal.

\---

\#\# 11\. Home relacionado con Planner

\#\#\# Tareas

\* Home muestra Tareas como bloque.  
\* Tareas es bloque de Capa 2–3.  
\* Tareas pendientes propias son acción principal en Home.  
\* Tareas en Home:

  \* lista con checkbox;  
  \* agrupadas por Responsabilidad;  
  \* máximo 4 visibles;  
  \* “Ver todas (8) →” si hay más;  
  \* checkbox \+ título \+ metadata;  
  \* tap en checkbox completa;  
  \* feedback háptico \+ animación \+ toast “Deshacer” 5s;  
  \* completadas al final, tachado sutil y opacidad reducida.  
\* Tareas vencidas pueden entrar en Atención Requerida.  
\* Si se completan tareas:

  \* widgets desaparecen;  
  \* Home se reorganiza.  
\* Si no hay tareas:

  \* se puede fusionar con briefing.  
  \* ejemplos:

    \* “Sin tareas pendientes.”  
    \* “Nada que necesite tu atención ahora.”

\#\#\# Eventos

\* Home muestra Próximos Eventos.  
\* Próximos Eventos:

  \* lista con chip de fecha;  
  \* máximo 3 para Coordinador;  
  \* máximo 2 para Adulto;  
  \* orden por cercanía temporal;  
  \* tap navega a detalle del evento en Planner \> Calendar.  
\* Eventos pueden tener:

  \* título;  
  \* hora;  
  \* ubicación;  
  \* chip temporal;  
  \* chevron.

\#\#\# Atención requerida

\* Atención Requerida centraliza:

  \* tareas vencidas;  
  \* pagos vencidos;  
  \* aprobaciones pendientes;  
  \* vencimientos.  
\* Para Planner, lo aplicable son:

  \* tareas vencidas;  
  \* vencimientos si vienen de tareas/eventos;  
  \* verificaciones pendientes solo si otra fuente lo confirma.  
\* Máximo 3 items visibles.  
\* Si hay más:

  \* “Ver 2 más →”  
\* Orden interno:

  \* por prioridad y proximidad de vencimiento.

\#\#\# Briefing

\* Briefing puede mencionar:

  \* cantidad de tareas;  
  \* cantidad de eventos;  
  \* vencimientos;  
  \* carga.  
\* Para MVP actual:

  \* Briefing debe tratarse como MOCK si no hay Geni real.  
  \* puede usar texto fijo o datos simples.  
\* Ejemplos útiles:

  \* “Hoy: 4 tareas, 2 eventos. La carga está 60/40. ¿Arrancamos por las tareas?”  
  \* “Hoy viene cargado: 6 tareas, 3 eventos y 1 vencimiento. ¿Revisamos prioridades?”  
  \* “Todo al día por acá. Nada pendiente.”

\#\#\# Carga Familiar

\* Carga Familiar se vincula a tareas.  
\* Coordinador ve porcentajes por miembro.  
\* Adulto no ve porcentajes de otros.  
\* Para Planner Frontend:

  \* puede inspirar filtros o resúmenes por responsable.  
  \* como lógica real queda pendiente.  
  \* puede usarse como MOCK visual en Home, no como Planner core si no hay fuente adicional.  
\* Al tap:

  \* detalle de carga por categoría en bottom sheet 50%.

\#\#\# Navegación desde Home

\* Home no administra Planner.  
\* Home redirige al módulo correspondiente.  
\* Próximos Eventos → detalle del evento en \`Planner \> Calendar\`.  
\* Tareas → Planner o lista completa de tareas.  
\* “Ver todas (8) →” puede llevar a Tasks.  
\* Toda información mostrada en Home conduce al módulo que la administra.

\---

\#\# 12\. Patrones visuales reutilizables

\#\#\# Aplicable ahora a Planner

\* Layout mobile-first 375×812px.  
\* Header con saludo/título fuerte:

  \* Display Fraunces 700 32px.  
\* Listas en cards estándar.  
\* Tareas:

  \* ListItem \+ Checkbox.  
  \* checkbox target 44–56px.  
  \* completada: tachado sutil \+ opacidad reducida.  
\* Eventos:

  \* ListItem \+ Chip.  
  \* chip temporal HOY / MAÑ / LUN.  
  \* ubicación opcional.  
  \* chevron hacia detalle.  
\* Estados de alerta:

  \* Card Alerta \`bg alert-100\`, borde \`alert-500\`.  
\* Estados vacíos:

  \* copy informativo;  
  \* acción sugerida si corresponde.  
\* Skeleton:

  \* si listas tardan más de 300ms.  
\* Spinner:

  \* en botones luego de 400ms.  
\* Toast:

  \* superior;  
  \* “Deshacer” en completar tarea;  
  \* 5s en ejemplo de tareas;  
  \* 4s default según design system extraído;  
  \* 8s Adulto Mayor.  
\* BottomSheet:

  \* para detalle o información expandida.  
\* Modal:

  \* para confirmaciones, no para pantallas largas.  
\* Acción principal:

  \* zona de pulgar.  
\* Máximo de items visibles:

  \* Home Tasks: 4\.  
  \* Coordinador eventos: 3\.  
  \* Adulto eventos: 2\.  
  \* Atención Requerida: 3\.

\#\#\# Referencia visual para más adelante

\* Carga Familiar:

  \* progress bars por miembro.  
  \* \`prim-500\` normal.  
  \* \`alert-500\` si \>60%.  
\* XP/Nivel adolescente:

  \* ProgressBar \`acent-500\`.  
  \* útil solo si se diseña gamificación visual futura.  
\* Briefing expandido:

  \* bottom sheet 50%.  
\* Quick Actions:

  \* panel flotante con blur.  
  \* Geni fijo.  
  \* acciones dinámicas.

\#\#\# No aplicable

\* Finance Relevantes como lógica real de Planner.  
\* Presence GPS real.  
\* SOS real.  
\* Medicación desde Inventory como dominio real.  
\* Feed/Actividad Familiar real.  
\* Automatizaciones reales.  
\* FamilyCloud automático desde Calendar.  
\* Geni real.

\---

\#\# 13\. Reglas funcionales extraídas

\* Home resume, Planner administra.  
\* Toda información de Home debe conducir al módulo que la administra.  
\* Planner debe estar disponible desde Bottom Nav.  
\* Bottom Nav V1 es fija:

  \* \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\`.  
\* La adaptación por rol cambia contenido, no navegación.  
\* Tareas visibles en Home deben poder completarse con checkbox 1-tap.  
\* Completar tarea debe dar feedback inmediato:

  \* háptico;  
  \* animación;  
  \* toast con Deshacer.  
\* Tarea completada debe verse con:

  \* tachado sutil;  
  \* opacidad reducida;  
  \* posición subordinada.  
\* Tareas en Home se agrupan por Responsabilidad.  
\* Tareas en Home muestran máximo 4 items.  
\* Si hay más tareas, se muestra “Ver todas”.  
\* Eventos en Home se ordenan por cercanía temporal.  
\* Eventos en Home muestran máximo 3 para Coordinador y 2 para Adulto.  
\* Evento en Home debe navegar a \`Planner \> Calendar\`.  
\* Las tareas vencidas entran en Atención Requerida.  
\* Atención Requerida muestra máximo 3 items.  
\* Adulto solo ve sus tareas propias en Home.  
\* Invitado solo ve tareas asignadas y eventos donde participa.  
\* Adulto no ve carga porcentual de otros miembros.  
\* Coordinador puede ver Carga Familiar con porcentajes.  
\* La UI debe evitar presión social.  
\* La acción principal frecuente debe estar en zona de pulgar.  
\* Complejidad avanzada no debe ser visible por defecto.  
\* Si no hay tareas, se muestra estado vacío informativo.  
\* Si no hay eventos para Invitado, el bloque no es visible.  
\* En sin conexión:

  \* mostrar última información conocida;  
  \* indicar timestamps;  
  \* deshabilitar acciones que requieren conexión con opacidad 0.5.  
\* En primer uso:

  \* mostrar acción sugerida “Creá tu primera tarea →”.

\---

\#\# 14\. Ideas derivadas útiles

\* Propuesta UX derivada / requiere validación del usuario:

  \* La pantalla principal de Planner podría respetar la lógica de capas:

    \* arriba: tareas vencidas/hoy;  
    \* medio: acciones rápidas;  
    \* abajo: listas por responsabilidad o calendario.  
\* Propuesta UX derivada / requiere validación del usuario:

  \* La lista de Tasks podría reutilizar exactamente el patrón de Home:

    \* checkbox;  
    \* título;  
    \* metadata;  
    \* responsable;  
    \* vencimiento;  
    \* agrupación por Responsabilidad.  
\* Propuesta UX derivada / requiere validación del usuario:

  \* Calendar podría reutilizar los chips HOY / MAÑ / LUN para vista agenda.  
\* Propuesta UX derivada / requiere validación del usuario:

  \* Planner podría tener una sección “Hoy” con tareas y eventos combinados, porque Home ya mezcla ambas cosas en el resumen.  
\* Propuesta UX derivada / requiere validación del usuario:

  \* El botón \`+\` podría abrir acciones de Planner como crear tarea o evento, pero este documento no lo confirma explícitamente.  
\* Propuesta UX derivada / requiere validación del usuario:

  \* Responsabilidad debería ser el agrupador visual principal de tareas para evitar duplicar categoría/template.  
\* Propuesta UX derivada / requiere validación del usuario:

  \* Templates podrían aparecer como accesos rápidos de creación, pero no como CRUD.  
\* Propuesta UX derivada / requiere validación del usuario:

  \* Las tareas vencidas podrían tener badge o card alerta dentro de Planner, siguiendo Atención Requerida.  
\* Propuesta UX derivada / requiere validación del usuario:

  \* El Planner podría mostrar un “Ver todas” equivalente al Home para mantener continuidad visual.  
\* Propuesta UX derivada / requiere validación del usuario:

  \* La vista Calendar podría tener una agenda compacta como primer MVP si día/semana/mes no están definidos en este documento.

\---

\#\# 15\. Decisiones que quedan abiertas

\* Pantalla principal exacta de Planner.  
\* Si Planner usa tabs internos.  
\* Si los tabs son:

  \* Tasks;  
  \* Calendar;  
  \* Goals.  
\* Si Goals aparece visualmente o se oculta completamente en MVP.  
\* Vista de Calendar:

  \* día;  
  \* semana;  
  \* mes;  
  \* agenda.  
\* Cómo mostrar tareas con fecha dentro del calendario.  
\* Formulario de crear tarea.  
\* Formulario de editar tarea.  
\* Formulario de crear evento.  
\* Formulario de editar evento.  
\* Estados oficiales de Task para MVP.  
\* Cómo traducir los estados del archivo de comprensión:

  \* Pendiente;  
  \* En Progreso;  
  \* Completada;  
  \* Cancelada.  
\* Cómo resolver Verification Flow:

  \* el documento habla de Verificación opcional sin estado separado;  
  \* no define \`awaiting\_verification\`.  
\* Prioridades de tareas.  
\* Templates predefinidas.  
\* Si Plantilla es entidad real o solo constante visual.  
\* Si Responsabilidad y Categoría son conceptos separados.  
\* Permisos de Planner por rol.  
\* Qué puede hacer Coordinador dentro de Planner.  
\* Qué puede hacer Adulto dentro de Planner.  
\* Qué puede hacer Adolescente/Niño/Senior/Guest dentro de Planner.  
\* Service/API para Tasks.  
\* Service/API para Events.  
\* Comportamiento real en offline.  
\* Si el toast de completar tarea dura 4s o 5s:

  \* el documento menciona 5s en tareas;  
  \* el design system del archivo de comprensión menciona 4s default.  
\* Si completar tarea desde Home debe sincronizarse inmediatamente con Planner o solo actualizar localmente.

\---

\#\# 16\. Qué NO debe entrar al MVP actual

\* Goals reales.  
\* Hitos/Milestones reales.  
\* Subtareas complejas.  
\* Dependencias entre tareas.  
\* Comentarios en tareas.  
\* Adjuntos en tareas.  
\* Timeline completo de tarea.  
\* Recurrencia compleja.  
\* Automatizaciones reales.  
\* Stock bajo → crear tarea automático.  
\* Calendar → crear recuerdo automático en FamilyCloud.  
\* FamilyCloud real.  
\* Geni real.  
\* Briefing generado por IA real.  
\* MemoriaPersonal.  
\* MemoriaFamiliar.  
\* SearchGlobal real.  
\* Recomendaciones reales.  
\* Presence GPS real.  
\* Geocercas.  
\* Notificaciones push reales.  
\* Auditoría completa.  
\* Offline sync completo.  
\* Finance real.  
\* Inventory real.  
\* Assets real.  
\* Feed real.  
\* SOS real.  
\* Gamificación avanzada.  
\* XP real.  
\* Rachas reales.  
\* Empleado Familiar como rol MVP si el alcance actual no lo incluye.

\---

\#\# 17\. Extractos o referencias internas importantes

\* \`Encabezado / Alcance\`

  \* Mobile-first 375×812px.  
  \* 7 roles.  
\* \`0. Arquitectura Universal del Home\`

  \* Home como centro operativo.  
  \* Home resume, no administra.  
\* \`0.1 Las 4 Capas del Home\`

  \* Atención, Acción, Contexto, Exploración.  
  \* Capa 2: tareas pendientes propias 1-tap para completar.  
\* \`0.2 Orden Canónico de Bloques (§18.05)\`

  \* Próximos Eventos.  
  \* Tareas.  
\* \`0.3 Jerarquía de Prioridades (§18.24)\`

  \* Atención Requerida antes que tareas/eventos.  
\* \`0.4 Reglas Universales del Home\`

  \* Bottom Nav congelada.  
  \* Home muestra resumen primero, detalle después.  
\* \`0.5 Bottom Navigation — Congelada para todos los roles\`

  \* \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\`.  
  \* Planner contiene Tasks, Calendar, Goals.  
\* \`1.4 Contenido de Cada Bloque — Coordinador\`

  \* Próximos Eventos.  
  \* Tareas.  
  \* Carga Familiar.  
  \* Atención Requerida.  
\* \`2.4 Contenido de Cada Bloque — Adulto\`

  \* tareas propias.  
  \* eventos propios \+ del hogar donde participa.  
  \* sin porcentajes de otros miembros.  
\* \`6.5 Contenido de Cada Bloque — Invitado\`

  \* tareas assigned\_to.  
  \* eventos donde participa.  
\* \`9 / Reglas de transición\`

  \* patrones visuales y estados.  
\* \`Diseño de pantallas home v1.txt / OUTPUT 1 — ENTITIES\`

  \* Task.  
  \* Plantilla.  
  \* Responsabilidad.  
  \* Evento.  
  \* Participante.  
  \* Goal.  
  \* BottomNav.  
  \* QuickActions.  
  \* HomeScreen.  
  \* PróximosEventosWidget.  
  \* TareasHomeWidget.  
  \* AtenciónRequeridaWidget.  
\* \`Diseño de pantallas home v1.txt / OUTPUT 2 — RELATIONSHIPS\`

  \* Task assigned\_to Persona.  
  \* Task belongs\_to Responsabilidad.  
  \* Task requires\_verification Verificación.  
  \* Plantilla creates Task.  
  \* Evento has\_participant Persona.  
\* \`Diseño de pantallas home v1.txt / OUTPUT 5 — BUSINESS RULES\`

  \* Home resume información y no administra.  
  \* Bottom Nav congelada.  
  \* Niño sin presión / sin deuda acumulada.  
  \* Adulto sin comparación entre miembros.  
\* \`source\_map\_HomePlus\_Diseno\_de\_Pantallas\_de\_Home\_V1.md\`

  \* secciones relevantes:

    \* \`4.7 PLANNER\`;  
    \* \`4.8 TASKS\`;  
    \* \`4.9 EVENTS\`;  
    \* \`4.10 CALENDAR\`;  
    \* \`11. Mapa de UI\`;  
    \* \`18. Información faltante\`.

\---

\#\# 18\. Conclusión operativa

Este documento no sirve para definir el Planner completo, porque está enfocado en Home. Sin embargo, aporta piezas muy valiosas para el frontend ideal de Planner:

\* cómo debe verse una tarea compacta;  
\* cómo debe completarse una tarea;  
\* cómo debe mostrarse feedback inmediato;  
\* cómo deben aparecer eventos próximos;  
\* cómo navegar desde Home hacia Planner y Calendar;  
\* qué relación debe existir entre Home y Planner;  
\* cómo mantener coherencia visual con HomePlus;  
\* qué componentes reutilizar;  
\* qué estados UX respetar;  
\* qué información debe quedar fuera por ahora.

Partes que deben usarse en la spec final:

\* Bottom Nav congelada.  
\* Home resume, Planner administra.  
\* Tareas con checkbox 1-tap.  
\* Toast con Deshacer.  
\* Tareas agrupadas por Responsabilidad.  
\* Eventos con chip temporal.  
\* Próximos Eventos → Planner \> Calendar.  
\* Tareas vencidas → Atención Requerida.  
\* Estados vacíos.  
\* Mobile-first.  
\* Acción principal en zona de pulgar.  
\* Patrones de Card/ListItem/Chip/Checkbox/Skeleton/Toast/BottomSheet.  
\* Reglas por rol que afectan visibilidad de tareas/eventos.

Partes que deben ignorarse por ahora:

\* Finance real.  
\* Inventory real.  
\* Assets real.  
\* FamilyCloud real.  
\* Presence GPS real.  
\* SOS real.  
\* Geni real.  
\* Automations reales.  
\* Goals reales.  
\* Comentarios, adjuntos, subtareas, dependencias y timeline de tareas.  
\* Calendar avanzado no definido por este documento.

\# planner\_frontend\_fragment\_HomePlus\_Eventos\_del\_sistema\_v1

\#\# 1\. Fuente

\* Documento: \`HomePlus — Eventos del sistema v1.md\`  
\* Archivo de comprensión asociado usado en este chat: \`Esquema de base de datos v1.txt\`  
\* Tipo de documento: Catálogo de eventos del sistema \+ esquema/knowledge graph de entidades, relaciones y reglas.  
\* Alcance del documento: Define eventos reactivos, triggers, payloads, consumidores, prioridades, comportamiento offline y relaciones de datos entre módulos. No es un documento visual ni una especificación de pantallas.  
\* Nivel de utilidad para Planner Frontend: Alto para flujos, estados, payloads, acciones y relaciones; bajo para diseño visual concreto.

\#\# 2\. Resumen útil para Planner Frontend

Este documento aporta información fuerte para el frontend de Planner en tres áreas:

\* Qué acciones existen alrededor de tareas: crear, asignar, empezar, completar, verificar, cancelar, vencer, recordar, reasignar, comentar y actualizar progreso.  
\* Qué acciones existen alrededor de calendario/eventos: crear, editar, cancelar, completar, detectar conflicto, recordar, agregar/remover participantes.  
\* Cómo Planner se conecta con Home, Briefing, Notificaciones, Auditoría, Streaks, Geni y Automatizaciones.

El documento no define pantallas detalladas, componentes visuales, diseño de formularios, colores, spacing, estilos de cards ni contratos API HTTP. Para frontend ideal sirve principalmente como fuente de comportamiento, payloads, labels, estados visibles y jerarquía de información.

\#\# 3\. Principios de producto aplicables

\* El sistema es reactivo por diseño: acciones de usuarios, cambios de estado y triggers temporales generan eventos.  
\* Planner debe mostrar al usuario consecuencias claras de sus acciones: una tarea creada, completada, verificada o reasignada dispara efectos visibles.  
\* El frontend debería reducir carga mental mostrando solamente lo que requiere acción: tareas asignadas, tareas vencidas, recordatorios, verificaciones y eventos próximos.  
\* Home no administra información. Solo resume y redirige al módulo correspondiente.  
\* Planner es el lugar donde se administra la información operativa: tareas, calendario, eventos, responsabilidades y posiblemente metas.  
\* La navegación debe evitar profundidad excesiva: más de 4 niveles de navegación es considerado fallo de diseño; el objetivo indicado es que el 95% de acciones ocurran en ≤3 niveles.  
\* Las acciones importantes deben estar cerca del usuario: completar tarea, crear tarea, crear evento y revisar pendientes deberían estar accesibles sin navegar demasiado.  
\* El tono para alertas de carga o tareas atrasadas debe ser neutro, informativo y orientado a solución.  
\* Los datos del hogar se tratan como una bóveda aislada; Planner debe respetar separación por \`household\_id\`.  
\* Geni no puede marcar tareas como completadas automáticamente.  
\* Las automatizaciones creadas por Geni requieren aprobación explícita del usuario.  
\* El documento diferencia acciones locales/encolables de acciones server-side; para frontend esto sugiere estados visuales de sincronización, aunque el MVP no debe implementar offline sync real si queda fuera del alcance actual.

\#\# 4\. UX/UI aplicable

\#\#\# Navegación

\* Existe una Bottom Navigation congelada V1 con esta estructura: \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\`.  
\* Planner tiene una entrada directa desde Bottom Navigation.  
\* Existe un botón central \`+\` asociado a Quick Actions.  
\* Quick Actions es un panel flotante desde \`+\`.  
\* Geni tiene un slot fijo primero dentro de Quick Actions.  
\* Las acciones de Quick Actions son dinámicas por frecuencia.  
\* Home debe resumir y redirigir al módulo correspondiente.  
\* \`PlannerDashboard\` aparece como vista principal de Planner con Tasks, Calendar y Goals.  
\* \`CalendarView\` aparece como vista de calendario de eventos.  
\* \`GoalsView\` aparece como vista de metas con hitos y progreso, pero queda como referencia futura para Planner Frontend.

\#\#\# Patrones de pantalla detectados

\* HomeDashboard tiene orden: Briefing → Atención Requerida → Carga Familiar → Eventos → Tareas → Finanzas → Presence → Actividad.  
\* Para Planner Frontend, lo más aplicable es:

  \* sección Eventos;  
  \* sección Tareas;  
  \* Atención Requerida cuando haya vencimientos, conflictos o verificaciones;  
  \* Briefing como resumen mock o asistido;  
  \* navegación hacia Planner para administrar.

\#\#\# Estados UX extraíbles

\* Tarea nueva: mensaje visible posible para asignado: “Nueva tarea: \[title\]”.  
\* Tarea asignada: mensaje visible posible: “Te asignaron: \[title\]”.  
\* Tarea empezada: mensaje visible posible al creador: “\[Display\_name\] empezó \[title\]”.  
\* Tarea verificada: mensaje visible posible: “¡\[Verificador\] confirmó tu tarea\!”.  
\* Evento con conflicto: mensaje visible posible: “Tienes dos eventos solapados”.  
\* Participante agregado a evento: mensaje visible posible: “Te invitaron a \[event\_title\]”.  
\* Evento completado del hogar: mensaje visible posible: “\[title\] terminó”.  
\* Briefing por escalamiento de tareas: texto conceptual: “Hay 3 tareas sin dueño activo. Como familia, ¿quieren redistribuirlas?”.  
\* Goal failed: texto conceptual: “La meta \[title\] venció sin alcanzarse. ¿Quieres crear una nueva?”.

\#\#\# Feedback visual aplicable

\* Las prioridades del sistema pueden mapearse visualmente:

  \* 🔴 CR: crítica;  
  \* 🟠 AL: alta;  
  \* 🟡 ME: media;  
  \* 🟢 BA: baja.  
\* Las tareas vencidas por más de un día tienen prioridad alta.  
\* Las tareas vencidas el primer día tienen prioridad media.  
\* Cambios de evento con menos de 24h de anticipación tienen prioridad alta.  
\* Eventos cancelados con menos de 2h de anticipación tienen prioridad alta.  
\* Acciones encolables/locales sugieren feedback de “guardado local / pendiente de sincronización”, pero offline sync real debe tratarse fuera del MVP si no se implementa.

\#\#\# Copywriting / tono

\* Tono neutro y privado para escalamiento inicial de tareas atrasadas.  
\* Tono directo para segundo aviso privado.  
\* Tono informativo y sin juicio cuando se avisa a coordinadores.  
\* Tono familiar y orientado a solución cuando un problema aparece en briefing familiar.

\#\# 5\. Información directa sobre Planner

\* Planner aparece como dominio propio.  
\* Entidades directas:

  \* \`Task\`;  
  \* \`TaskComment\`;  
  \* \`TaskAttachment\`;  
  \* \`TaskTemplate\`;  
  \* \`TaskDependency\`;  
  \* \`Subtask\`;  
  \* \`TaskTimeline\`;  
  \* \`TaskVerification\`;  
  \* \`Event\`;  
  \* \`EventParticipant\`;  
  \* \`Goal\`;  
  \* \`Milestone\`;  
  \* \`Responsibility\`;  
  \* \`ResponsibilityMember\`;  
  \* \`Streak\`;  
  \* \`RecurrenceRule\`;  
  \* \`PlannerDashboard\`;  
  \* \`CalendarView\`;  
  \* \`GoalsView\`.  
\* PlannerDashboard se describe como vista principal de Planner con Tasks, Calendar y Goals.  
\* CalendarView se describe como vista de calendario de eventos.  
\* GoalsView se describe como vista de metas con hitos y progreso.  
\* Las tareas pueden ser del hogar o personales.  
\* Los eventos pueden ser del hogar o personales.  
\* Las tareas se relacionan con responsabilidades.  
\* Una tarea pertenece a una única responsabilidad.  
\* Las tareas pueden tener verificación opcional.  
\* Las tareas pueden tener responsable asignado.  
\* Las tareas pueden tener fecha y hora límite.  
\* Las tareas vencidas no son un estado; se calculan comparando \`due\_date\` con la fecha actual.  
\* Eventos tienen estados \`scheduled\`, \`completed\`, \`cancelled\`.  
\* El documento usa recurrencia mediante \`recurrence\_rule\` y RecurrenceRule/RFC 5545, lo cual debe tratarse con cuidado para MVP porque es más complejo que una recurrencia simple.  
\* Planner se conecta con Home a través de consumidores \`B\` para Briefing y secciones Home de Eventos y Tareas.  
\* Planner se conecta con People/Members porque tareas y eventos referencian \`member\_id\`.

\#\# 6\. Información sobre Tasks

\#\#\# MVP actual

\#\#\#\# Entidad

\* \`Task\`: tareas del hogar o personales. Tabla: \`tasks\`.  
\* Estados encontrados en el esquema:

  \* \`pending\`;  
  \* \`in\_progress\`;  
  \* \`completed\`;  
  \* \`cancelled\`.  
\* Regla: vencida no es un estado de tarea. Se calcula automáticamente comparando \`due\_date\` con \`current\_date\`.

\#\#\#\# Campos explícitos encontrados

\* \`task\_id\`  
\* \`household\_id\`  
\* \`title\`  
\* \`description\`  
\* \`visibility\`  
\* \`priority\`  
\* \`due\_date\`  
\* \`due\_time\`  
\* \`recurrence\_rule\`  
\* \`responsibility\_id\`  
\* \`created\_by\`  
\* \`assigned\_to\`  
\* \`old\_assignee\`  
\* \`new\_assignee\`  
\* \`assigned\_by\`  
\* \`started\_by\`  
\* \`started\_at\`  
\* \`completed\_by\`  
\* \`completed\_at\`  
\* \`was\_overdue\`  
\* \`requires\_verification\`  
\* \`verified\_by\`  
\* \`verified\_at\`  
\* \`cancelled\_by\`  
\* \`reason\`  
\* \`days\_overdue\`  
\* \`hours\_remaining\`  
\* \`deleted\_at\`  
\* \`reassigned\_by\`

\#\#\#\# Acciones y flujos

\#\#\#\#\# Crear tarea

\* Evento: \`task.created\`.  
\* Trigger: miembro autorizado crea una tarea con \`INSERT INTO tasks\`.  
\* Permisos explícitos:

  \* Adultos, Coordinador y Senior pueden crear tareas del hogar.  
  \* Adolescentes pueden crear tareas propias.  
\* Payload:

  \* \`task\_id\`;  
  \* \`household\_id\`;  
  \* \`title\`;  
  \* \`description\`;  
  \* \`visibility\`;  
  \* \`priority\`;  
  \* \`due\_date\`;  
  \* \`due\_time\`;  
  \* \`recurrence\_rule\`;  
  \* \`responsibility\_id\`;  
  \* \`created\_by\`;  
  \* \`assigned\_to\`.  
\* Feedback posible:

  \* al asignado: “Nueva tarea: \[title\]”.  
\* Prioridad del evento: media.  
\* Comportamiento offline del evento: encolable; se crea localmente con UUID pre-generado y sincroniza.

\#\#\#\#\# Asignar o reasignar tarea

\* Evento: \`task.assigned\`.  
\* Trigger: se asigna o reasigna \`assigned\_to\` en una tarea existente.  
\* Payload:

  \* \`task\_id\`;  
  \* \`household\_id\`;  
  \* \`title\`;  
  \* \`old\_assignee\`;  
  \* \`new\_assignee\`;  
  \* \`assigned\_by\`.  
\* Feedback posible:

  \* al nuevo asignado: “Te asignaron: \[title\]”.  
\* Relación con Geni: recalcula carga de tareas.  
\* Prioridad: media.

\#\#\#\#\# Empezar tarea

\* Evento: \`task.started\`.  
\* Trigger: asignado cambia \`status: 'pending' → 'in\_progress'\`.  
\* Payload:

  \* \`task\_id\`;  
  \* \`household\_id\`;  
  \* \`title\`;  
  \* \`started\_by\`;  
  \* \`started\_at\`.  
\* Feedback posible:

  \* al creador: “\[Display\_name\] empezó \[title\]”.  
\* Prioridad: baja.

\#\#\#\#\# Completar tarea

\* Evento: \`task.completed\`.  
\* Trigger: asignado, adulto o coordinador marca \`status → 'completed'\`.  
\* También establece:

  \* \`completed\_by\`;  
  \* \`completed\_at\`.  
\* Payload:

  \* \`task\_id\`;  
  \* \`household\_id\`;  
  \* \`title\`;  
  \* \`completed\_by\`;  
  \* \`assigned\_to\`;  
  \* \`was\_overdue\`;  
  \* \`completed\_at\`.  
\* Feedback:

  \* notificación a \`created\_by\` y \`assigned\_to\` si son diferentes.  
\* Si \`visibility='household'\`, puede producir post automático.  
\* Conecta con Briefing, Streaks y evaluación de carga por Geni.  
\* Prioridad: media.  
\* Comportamiento offline: se marca localmente y sincroniza al reconectar.

\#\#\#\#\# Verificar tarea

\* Evento: \`task.verified\`.  
\* Trigger: Coordinador o adulto verifica una tarea completada.  
\* Mecanismo: verificación parental.  
\* Campos relacionados:

  \* \`verified\_by\`;  
  \* \`verified\_at\`.  
\* Payload:

  \* \`task\_id\`;  
  \* \`household\_id\`;  
  \* \`title\`;  
  \* \`completed\_by\`;  
  \* \`verified\_by\`;  
  \* \`verified\_at\`.  
\* Feedback posible:

  \* al usuario que completó: “¡\[Verificador\] confirmó tu tarea\!”.  
\* Prioridad: baja.  
\* Comportamiento offline: encolable.

\#\#\#\#\# Cancelar tarea

\* Evento: \`task.cancelled\`.  
\* Trigger: creador o coordinador marca \`status → 'cancelled'\`.  
\* Payload:

  \* \`task\_id\`;  
  \* \`household\_id\`;  
  \* \`title\`;  
  \* \`cancelled\_by\`;  
  \* \`reason\`.  
\* Feedback:

  \* notificación al asignado si no es quien cancela.  
\* Prioridad: baja.

\#\#\#\#\# Tarea vencida

\* Evento: \`task.overdue\`.  
\* Trigger: CRON diario detecta \`due\_date \< today()\` con \`status IN ('pending','in\_progress')\` y \`deleted\_at IS NULL\`.  
\* Payload:

  \* \`task\_id\`;  
  \* \`household\_id\`;  
  \* \`title\`;  
  \* \`assigned\_to\`;  
  \* \`due\_date\`;  
  \* \`days\_overdue\`.  
\* Feedback:

  \* notificación al asignado.  
\* Conexiones:

  \* Geni acumula para patrón de escalamiento;  
  \* Briefing;  
  \* Automatizaciones.  
\* Prioridad:

  \* alta si \`days\_overdue \> 1\`;  
  \* media si es día 1\.  
\* Comportamiento offline: server-side.

\#\#\#\#\# Recordatorio de tarea

\* Evento: \`task.reminder\_due\`.  
\* Trigger: CRON evalúa \`due\_date\` contra preferencias de notificación del asignado.  
\* Payload:

  \* \`task\_id\`;  
  \* \`household\_id\`;  
  \* \`title\`;  
  \* \`assigned\_to\`;  
  \* \`due\_date\`;  
  \* \`due\_time\`;  
  \* \`hours\_remaining\`.  
\* Feedback:

  \* notificación al asignado;  
  \* email si está configurado.  
\* Prioridad: media.  
\* Comportamiento offline: server-side.

\#\#\#\#\# Reasignar tarea en progreso o atrasada

\* Evento: \`task.reassigned\`.  
\* Trigger: cambio de \`assigned\_to\` en tarea en progreso o atrasada.  
\* Payload:

  \* \`task\_id\`;  
  \* \`household\_id\`;  
  \* \`title\`;  
  \* \`old\_assignee\`;  
  \* \`new\_assignee\`;  
  \* \`reassigned\_by\`;  
  \* \`reason\`.  
\* Feedback:

  \* notificación a antiguo y nuevo asignado.  
\* Conexiones:

  \* Geni recalcula asimetría;  
  \* Briefing.  
\* Prioridad: media.

\#\#\#\# Relaciones útiles para frontend

\* \`HouseholdMember\` crea tareas.  
\* \`HouseholdMember\` puede estar asignado a tareas.  
\* \`HouseholdMember\` completa tareas.  
\* \`HouseholdMember\` verifica tareas.  
\* \`Task\` pertenece a \`Responsibility\`.  
\* \`TaskTemplate\` genera \`Task\`.  
\* \`Task\` puede vincularse a \`Event\`.  
\* \`Task\` puede avanzar \`Goal\`.

\#\#\#\# Responsabilidades aplicables a tareas

\* \`Responsibility\`: áreas operativas del hogar.  
\* Ejemplos explícitos:

  \* Compras;  
  \* Limpieza;  
  \* Mascotas.  
\* Regla explícita:

  \* una tarea siempre tiene una única responsabilidad asociada (\`responsibility\_id NOT NULL\`).  
\* \`ResponsibilityMember\`: asignación de miembros a responsabilidades.

\#\#\#\# Verificación

\* \`TaskVerification\` es una feature explícita.  
\* Descripción: verificación opcional de completitud de tareas.  
\* Campos:

  \* \`requires\_verification\`;  
  \* \`verified\_by\`;  
  \* \`verified\_at\`.  
\* La verificación la realiza Coordinador o Adulto.  
\* Sirve para tareas completadas.

\#\#\# POST-MVP / futuro

\* \`TaskComment\`: comentarios en tareas.  
\* \`TaskAttachment\`: adjuntos de tareas.  
\* \`TaskTemplate\`: plantillas de tareas recurrentes como tabla.  
\* \`TaskDependency\`: dependencias bloqueantes entre tareas.  
\* \`Subtask\`: un solo nivel de subtareas bajo Task.  
\* \`TaskTimeline\`: línea temporal automática por tarea.  
\* \`Streak\`: rachas derivadas de tareas.  
\* \`RecurrenceRule\`: reglas RFC 5545 RRULE para tareas recurrentes.  
\* Escalamiento Geni avanzado:

  \* \`task.escalation\_level\_1\`;  
  \* \`task.escalation\_level\_2\`;  
  \* \`task.escalation\_level\_3\`;  
  \* \`task.escalation\_level\_4\`.  
\* Automatizaciones reales disparadas por tareas.  
\* Feed automático por tareas completadas.  
\* Auditoría completa.  
\* Offline sync real.

\#\#\# Dudas o decisiones abiertas

\* El documento define estados de tarea \`pending\`, \`in\_progress\`, \`completed\`, \`cancelled\`; no define \`awaiting\_verification\` ni \`verified\` como estados de tarea.  
\* El documento define verificación mediante campos \`verified\_by\` y \`verified\_at\`, no como estado explícito.  
\* El documento menciona \`recurrence\_rule\`, pero no define una recurrencia simple \`none/daily/weekly/monthly\`.  
\* No se define UI de formulario para crear tarea.  
\* No se define pantalla de lista de tareas.  
\* No se define visual exacto de prioridad.  
\* No se definen templates predefinidas MVP como Limpieza, Compras, Mascotas, Medicación, Estudios, Pagos; solo aparecen ejemplos de responsabilidades como Compras, Limpieza y Mascotas.  
\* No aparecen ejemplos concretos de títulos de tareas.  
\* No aparecen endpoints HTTP.  
\* No aparece comportamiento de “listar tareas” como evento, aunque el dominio Task está claramente definido.

\#\# 7\. Información sobre Calendar / Events

\#\#\# MVP actual

\#\#\#\# Entidad

\* \`Event\`: eventos del hogar o personales.  
\* Estados encontrados:

  \* \`scheduled\`;  
  \* \`completed\`;  
  \* \`cancelled\`.

\#\#\#\# Campos explícitos encontrados

\* \`event\_id\`  
\* \`household\_id\`  
\* \`title\`  
\* \`description\`  
\* \`visibility\`  
\* \`all\_day\`  
\* \`starts\_at\`  
\* \`ends\_at\`  
\* \`location\_name\`  
\* \`recurrence\_rule\`  
\* \`created\_by\`  
\* \`participants\`  
\* \`updated\_by\`  
\* \`changed\_fields\`  
\* \`old\_starts\_at\`  
\* \`new\_starts\_at\`  
\* \`old\_ends\_at\`  
\* \`new\_ends\_at\`  
\* \`cancelled\_by\`  
\* \`reason\`  
\* \`was\_recurring\`  
\* \`completed\_at\`  
\* \`member\_id\`  
\* \`event\_a\`  
\* \`event\_b\`  
\* \`overlap\_minutes\`  
\* \`minutes\_until\`  
\* \`event\_title\`  
\* \`added\_by\`  
\* \`removed\_by\`

\#\#\#\# Crear evento

\* Evento: \`event.created\`.  
\* Trigger: miembro autorizado crea evento con \`INSERT INTO events\`.  
\* Permisos explícitos:

  \* Adultos;  
  \* Coordinador;  
  \* Senior;  
  \* Adolescente para eventos familiares.  
\* Payload:

  \* \`event\_id\`;  
  \* \`household\_id\`;  
  \* \`title\`;  
  \* \`description\`;  
  \* \`visibility\`;  
  \* \`all\_day\`;  
  \* \`starts\_at\`;  
  \* \`ends\_at\`;  
  \* \`location\_name\`;  
  \* \`recurrence\_rule\`;  
  \* \`created\_by\`;  
  \* \`participants\`.  
\* Feedback:

  \* notificación a participantes.  
\* Conexiones:

  \* auditoría;  
  \* automatizaciones;  
  \* briefing;  
  \* Geni evalúa conflictos.  
\* Prioridad: media.  
\* Comportamiento offline: encolable.

\#\#\#\# Editar evento

\* Evento: \`event.updated\`.  
\* Trigger: creador o coordinador modifica campos del evento.  
\* Payload:

  \* \`event\_id\`;  
  \* \`household\_id\`;  
  \* \`title\`;  
  \* \`updated\_by\`;  
  \* \`changed\_fields\`;  
  \* \`old\_starts\_at\`;  
  \* \`new\_starts\_at\`;  
  \* \`old\_ends\_at\`;  
  \* \`new\_ends\_at\`.  
\* Feedback:

  \* notificación a participantes si cambió fecha, hora o ubicación.  
\* Prioridad:

  \* media;  
  \* alta si cambió fecha con menos de 24h de anticipación.  
\* Comportamiento offline: encolable.

\#\#\#\# Cancelar evento

\* Evento: \`event.cancelled\`.  
\* Trigger: creador o coordinador marca \`status → 'cancelled'\`.  
\* Payload:

  \* \`event\_id\`;  
  \* \`household\_id\`;  
  \* \`title\`;  
  \* \`cancelled\_by\`;  
  \* \`reason\`;  
  \* \`was\_recurring\`.  
\* Feedback:

  \* notificación a todos los participantes.  
\* Prioridad:

  \* media;  
  \* alta si el evento era en ≤2h.  
\* Comportamiento offline: encolable.

\#\#\#\# Completar evento

\* Evento: \`event.completed\`.  
\* Trigger: evento pasa su \`ends\_at\` y se marca \`status → 'completed'\`.  
\* Puede ser automático o manual.  
\* Payload:

  \* \`event\_id\`;  
  \* \`household\_id\`;  
  \* \`title\`;  
  \* \`completed\_at\`.  
\* Feedback:

  \* si era evento del hogar: “\[title\] terminó”.  
\* Conexiones:

  \* Briefing;  
  \* Streaks.  
\* Prioridad: baja.

\#\#\#\# Detectar conflicto

\* Evento: \`event.conflict\_detected\`.  
\* Trigger: Geni detecta dos o más eventos solapados para el mismo miembro.  
\* Payload:

  \* \`member\_id\`;  
  \* \`household\_id\`;  
  \* \`event\_a\`;  
  \* \`event\_b\`;  
  \* \`overlap\_minutes\`.  
\* Feedback posible:

  \* “Tienes dos eventos solapados”.  
\* Prioridad: media.  
\* Comportamiento offline: server-side.  
\* Para MVP actual debe tratarse como POST-MVP si requiere Geni real.

\#\#\#\# Recordatorio de evento

\* Evento: \`event.reminder\_due\`.  
\* Trigger: CRON evalúa \`starts\_at \- recordatorio\_configurado\`.  
\* Recordatorios mencionados:

  \* 30 minutos;  
  \* 1 hora;  
  \* 1 día.  
\* Payload:

  \* \`event\_id\`;  
  \* \`household\_id\`;  
  \* \`title\`;  
  \* \`starts\_at\`;  
  \* \`location\_name\`;  
  \* \`minutes\_until\`.  
\* Feedback:

  \* notificación a participantes que aceptaron;  
  \* email si está configurado.  
\* Prioridad: media.  
\* Comportamiento offline: server-side.

\#\#\#\# Participantes

\* Evento: \`event.participant\_added\`.

\* Trigger: se agrega miembro a \`event\_participants\`.

\* Payload:

  \* \`event\_id\`;  
  \* \`event\_title\`;  
  \* \`household\_id\`;  
  \* \`member\_id\`;  
  \* \`added\_by\`;  
  \* \`starts\_at\`.

\* Feedback:

  \* “Te invitaron a \[event\_title\]”.

\* Prioridad: media.

\* Evento: \`event.participant\_removed\`.

\* Trigger: se remueve miembro de \`event\_participants\`.

\* Payload:

  \* \`event\_id\`;  
  \* \`event\_title\`;  
  \* \`household\_id\`;  
  \* \`member\_id\`;  
  \* \`removed\_by\`.

\* Feedback:

  \* notificación al miembro removido.

\* Prioridad: baja.

\#\#\#\# Relaciones útiles

\* \`HouseholdMember\` crea eventos.  
\* \`Event\` tiene participantes.  
\* \`EventParticipant\` referencia \`HouseholdMember\`.  
\* \`MediaItem\` puede vincularse a \`Event\`.  
\* \`Event\` puede generar \`MediaItem\`.  
\* \`Task\` puede vincularse a \`Event\`.

\#\#\# POST-MVP / futuro

\* Participantes avanzados y respuestas de participante.  
\* Conflictos detectados por Geni real.  
\* Recordatorios reales por CRON/push/email.  
\* Recurrencia compleja con \`recurrence\_rule\`/RRULE.  
\* Eventos conectados con FamilyCloud/MediaItem.  
\* Feed automático para eventos terminados.  
\* Auditoría completa.  
\* Automatizaciones reales.  
\* Offline sync real.

\#\#\# Dudas o decisiones abiertas

\* No se definen vistas día/semana/mes; solo se menciona \`CalendarView\`.  
\* No se define agenda visual.  
\* No se define si Calendar debe mostrar tareas con fecha.  
\* No se define contrato de listado de eventos.  
\* No se define formulario visual para crear/editar evento.  
\* No se define enum simple de recurrencia.  
\* No se define \`none/daily/weekly/monthly\`; solo aparece \`recurrence\_rule\`.  
\* No hay ejemplos concretos de eventos.  
\* No hay endpoints HTTP.

\#\# 8\. Información sobre Goals

\* \`Goal\` aparece como entidad de Planner.  
\* \`Goal\`: metas personales o familiares.  
\* Estados:

  \* \`active\`;  
  \* \`completed\`;  
  \* \`failed\`.  
\* \`Milestone\`: hitos de una meta.  
\* \`GoalsView\`: vista de metas con hitos y progreso.  
\* \`PlannerDashboard\` incluye Tasks, Calendar y Goals.  
\* \`Task\` puede avanzar \`Goal\`.  
\* \`Goal\` puede rastrear progreso vía \`Task\`.  
\* Eventos de Goals:

  \* \`goal.created\`;  
  \* \`goal.milestone\_completed\`;  
  \* \`goal.completed\`;  
  \* \`goal.failed\`;  
  \* \`goal.progress\_updated\`.  
\* Campos encontrados:

  \* \`goal\_id\`;  
  \* \`household\_id\`;  
  \* \`title\`;  
  \* \`description\`;  
  \* \`visibility\`;  
  \* \`category\`;  
  \* \`target\_type\`;  
  \* \`target\_value\`;  
  \* \`unit\`;  
  \* \`starts\_at\`;  
  \* \`ends\_at\`;  
  \* \`created\_by\`;  
  \* \`milestone\_id\`;  
  \* \`goal\_title\`;  
  \* \`milestone\_title\`;  
  \* \`achieved\_at\`;  
  \* \`current\_value\`;  
  \* \`final\_value\`;  
  \* \`completed\_at\`;  
  \* \`duration\_days\`;  
  \* \`progress\_pct\`;  
  \* \`updated\_by\`.

Para el MVP actual, Goals queda fuera del alcance operativo real de Planner Frontend. Puede servir como referencia visual futura o como tab/post-MVP dentro del PlannerDashboard, pero no debe bloquear Tasks y Calendar.

\#\# 9\. Responsabilidades, templates y categorías

\#\#\# Responsabilidades

\* \`Responsibility\` aparece como entidad de Planner.  
\* Descripción: áreas operativas del hogar.  
\* Ejemplos explícitos:

  \* Compras;  
  \* Limpieza;  
  \* Mascotas.  
\* \`ResponsibilityMember\`: asignación de miembros a responsabilidades.  
\* \`Task\` pertenece a \`Responsibility\`.  
\* Regla explícita:

  \* una tarea siempre tiene una única responsabilidad asociada (\`responsibility\_id NOT NULL\`).  
\* Para frontend:

  \* responsabilidad puede funcionar como agrupador visual;  
  \* responsabilidad puede funcionar como chip o badge en la tarea;  
  \* responsabilidad puede ayudar a filtrar tareas;  
  \* responsabilidad puede explicar carga operativa.

\#\#\# Templates

\* \`TaskTemplate\` aparece como entidad de Planner.  
\* Descripción: plantillas de tareas recurrentes.  
\* Relación: \`TaskTemplate\` genera \`Task\`.  
\* El documento no define lista de templates predefinidas.  
\* El documento no define UI de templates.  
\* El documento no define si templates son editables o no.  
\* Dado el alcance MVP actual, templates como tabla o CRUD quedan como POST-MVP si se toman desde este documento.

\#\#\# Categorías

\* El documento no define una entidad \`Category\` para Planner.  
\* En Goals aparece campo \`category\`.  
\* En Finance aparecen categorías, pero no son aplicables a Planner Frontend salvo como patrón general no implementable aquí.  
\* Para Tasks, el agrupador explícito es \`Responsibility\`, no \`Category\`.

\#\#\# Agrupación de tareas

\* Agrupación explícita posible por \`responsibility\_id\`.  
\* Agrupación derivada posible por:

  \* estado;  
  \* asignado;  
  \* vencimiento;  
  \* prioridad;  
  \* fecha límite.  
\* Solo \`responsibility\_id\`, \`assigned\_to\`, \`due\_date\`, \`priority\` y \`status\` están explícitamente presentes.

\#\# 10\. Quick Actions aplicables a Planner

\* Existe \`QuickActions\` como pantalla/panel flotante desde \`+\`.  
\* Quick Actions tiene Geni slot fijo primero.  
\* Quick Actions usa acciones dinámicas por frecuencia.  
\* Bottom Nav incluye \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\`.  
\* No se listan explícitamente acciones rápidas de Planner, pero por eventos existentes las acciones aplicables al Planner serían:

  \* crear tarea;  
  \* crear evento;  
  \* completar tarea;  
  \* asignar/reasignar tarea;  
  \* posiblemente verificar tarea.  
\* Las acciones anteriores están respaldadas como eventos del sistema, pero no aparecen explícitamente como items del panel Quick Actions.  
\* Cualquier acción de Geni dentro de Quick Actions debe tratarse como demo o POST-MVP si requiere IA real.  
\* No aparece “ver pendientes” como Quick Action explícita.  
\* No aparece “crear objetivo” como Quick Action explícita.

\#\# 11\. Home relacionado con Planner

\#\#\# Tareas en Home

\* HomeDashboard incluye sección \`Tareas\`.  
\* Eventos de tareas consumen \`B\` para Briefing:

  \* \`task.created\`;  
  \* \`task.started\`;  
  \* \`task.completed\`;  
  \* \`task.verified\`;  
  \* \`task.cancelled\`;  
  \* \`task.overdue\`;  
  \* \`task.escalation\_level\_3\`;  
  \* \`task.escalation\_level\_4\`;  
  \* \`task.reassigned\`;  
  \* \`subtask.completed\`;  
  \* \`task.progress\_updated\`.  
\* Home puede mostrar tareas pendientes, vencidas, completadas o verificadas como resumen.  
\* Home debe redirigir a Planner para administrar.

\#\#\# Eventos en Home

\* HomeDashboard incluye sección \`Eventos\`.  
\* Eventos de calendario consumen \`B\` para Briefing:

  \* \`event.created\`;  
  \* \`event.updated\`;  
  \* \`event.cancelled\`;  
  \* \`event.completed\`;  
  \* \`event.conflict\_detected\`.  
\* Home puede mostrar eventos próximos, cambios de evento y cancelaciones.  
\* Home debe redirigir a Calendar/Planner para administrar.

\#\#\# Atención requerida

Información aplicable a “Atención Requerida”:

\* tareas vencidas;  
\* tareas con varios días de atraso;  
\* tareas que requieren verificación;  
\* eventos con cambios de última hora;  
\* eventos cancelados cercanos;  
\* conflictos de eventos detectados.

\#\#\# Briefing

\* Briefing aparece como consumidor \`B\`.  
\* GeniBriefing se describe como briefing diario: primer widget de Home, card única con versión resumida/ampliada.  
\* Para MVP actual, Briefing puede tomar datos simples de Planner:

  \* tareas pendientes;  
  \* tareas vencidas;  
  \* eventos próximos;  
  \* verificaciones pendientes.  
\* Si requiere Geni real, debe quedar como MOCK/POST-MVP.

\#\#\# Regla central

\* Home no administra información. Solo resume y redirige al módulo correspondiente.  
\* Aplicación directa:

  \* Home muestra resumen de Planner.  
  \* Planner administra tareas/eventos/calendario.

\#\# 12\. Patrones visuales reutilizables

\#\#\# Aplicable ahora a Planner

\* Bottom Nav fija:

  \* Home;  
  \* People;  
  \* \+;  
  \* Planner;  
  \* More.  
\* Planner como tab principal.  
\* Botón central \`+\` para acciones rápidas.  
\* PlannerDashboard con secciones:

  \* Tasks;  
  \* Calendar;  
  \* Goals como referencia futura.  
\* CalendarView para eventos.  
\* HomeDashboard con orden de contenido donde Planner aporta:

  \* Eventos;  
  \* Tareas;  
  \* Atención Requerida;  
  \* Briefing.  
\* Prioridades visuales con niveles:

  \* crítica;  
  \* alta;  
  \* media;  
  \* baja.  
\* Tareas y eventos deberían mostrar:

  \* responsable/participantes;  
  \* fecha;  
  \* estado;  
  \* prioridad;  
  \* relación con responsabilidad;  
  \* feedback de acción.

\#\#\# Referencia visual para más adelante

\* GoalsView con hitos y progreso.  
\* TaskTimeline.  
\* Streaks.  
\* Comentarios.  
\* Adjuntos.  
\* Event participants avanzados.  
\* Conflictos inteligentes por Geni.  
\* Escalamiento Geni.  
\* Feed automático.  
\* Automatizaciones.

\#\#\# No aplicable

\* No hay colores, tipografías, sombras, bordes ni layout visual detallado en el documento.  
\* No hay capturas.  
\* No hay descripción de cards visuales específicas para Planner.  
\* No hay estructura de formularios.

\#\# 13\. Reglas funcionales extraídas

\* Planner debe tener una vista principal que integre Tasks, Calendar y Goals, aunque Goals puede quedar futuro.  
\* Calendar debe tener una vista de eventos.  
\* Una tarea puede ser del hogar o personal.  
\* Un evento puede ser del hogar o personal.  
\* Una tarea siempre tiene una única responsabilidad asociada.  
\* Vencida no es estado de tarea; se calcula por \`due\_date \< current\_date\`.  
\* Las tareas detectadas como vencidas usan \`status IN ('pending','in\_progress')\` y \`deleted\_at IS NULL\`.  
\* Adultos, Coordinador y Senior pueden crear tareas del hogar.  
\* Adolescentes pueden crear tareas propias.  
\* Asignado, adulto o coordinador pueden marcar tarea como completada.  
\* Coordinador o adulto pueden verificar una tarea completada.  
\* Creador o coordinador pueden cancelar tarea.  
\* Creador o coordinador pueden modificar evento.  
\* Creador o coordinador pueden cancelar evento.  
\* Adultos, Coordinador, Senior y Adolescente pueden crear eventos familiares.  
\* Eventos solo tienen estados \`scheduled\`, \`completed\`, \`cancelled\`.  
\* Home no administra información; solo resume y redirige.  
\* Más de 4 niveles de navegación es fallo de diseño.  
\* Objetivo de navegación: 95% de acciones en ≤3 niveles.  
\* Geni no puede marcar tareas como completadas automáticamente.  
\* Automatizaciones creadas por Geni requieren aprobación explícita.  
\* Los datos del hogar deben permanecer aislados por hogar.  
\* La privacidad del hogar es un límite estructural: no cruzar datos entre hogares.

\#\# 14\. Ideas derivadas útiles

\* Propuesta UX derivada / requiere validación del usuario: usar \`Responsibility\` como chip principal en cada task card para evitar duplicar categoría.  
\* Propuesta UX derivada / requiere validación del usuario: organizar Planner en tabs internas simples: \`Tasks\`, \`Calendar\`, \`Goals\`, dejando Goals como deshabilitado/futuro si no se implementa.  
\* Propuesta UX derivada / requiere validación del usuario: mostrar en Home solo 2–3 tareas urgentes y un link “Ver todo” hacia Planner.  
\* Propuesta UX derivada / requiere validación del usuario: usar colores o badges por prioridad del evento del sistema: alta/media/baja.  
\* Propuesta UX derivada / requiere validación del usuario: cuando una tarea se completa, cambiar visualmente su estado de inmediato y luego mostrar un estado secundario si requiere verificación.  
\* Propuesta UX derivada / requiere validación del usuario: crear una sección “Requiere atención” en Planner para tareas vencidas, tareas esperando verificación y eventos con cambios recientes.  
\* Propuesta UX derivada / requiere validación del usuario: el botón \`+\` debería ofrecer “Nueva tarea” y “Nuevo evento” como acciones frecuentes del Planner.  
\* Propuesta UX derivada / requiere validación del usuario: usar una frase neutra para tareas atrasadas, evitando lenguaje culpabilizante.  
\* Propuesta UX derivada / requiere validación del usuario: si no hay tareas, el empty state debería invitar a crear una tarea desde el \`+\`.  
\* Propuesta UX derivada / requiere validación del usuario: si no hay eventos, el empty state debería invitar a crear un evento familiar.

\#\# 15\. Decisiones que quedan abiertas

\* Cómo se ve la pantalla principal de Planner.  
\* Si Planner tendrá tabs internas o secciones verticales.  
\* Cómo se verá CalendarView.  
\* Si CalendarView tendrá día/semana/mes en MVP.  
\* Cómo se listan tareas.  
\* Cómo se listan eventos.  
\* Qué campos mínimos tendrá el formulario de crear tarea.  
\* Qué campos mínimos tendrá el formulario de crear evento.  
\* Cómo se representa visualmente \`priority\`.  
\* Cómo se representa visualmente \`visibility\`.  
\* Cómo se representa visualmente \`responsibility\_id\`.  
\* Cómo se representa una tarea que requiere verificación.  
\* Si \`verified\` será estado visual o derivado de \`verified\_at\`.  
\* Cómo adaptar los estados del documento (\`pending\`, \`in\_progress\`, \`completed\`, \`cancelled\`) al MVP si el MVP usa otros estados.  
\* Si \`cancelled\` se muestra o se oculta.  
\* Cómo se resuelve recurrencia simple si el documento solo menciona \`recurrence\_rule\`.  
\* Si templates predefinidas son visibles en UI.  
\* Si las responsabilidades son editables o constantes.  
\* Si se implementa solo creación/completado de tareas o también reasignación/cancelación.  
\* Si eventos tendrán participantes en MVP.  
\* Si el botón \`+\` abre Quick Actions reales o una versión local/demo.  
\* Si Briefing será mock, estático o basado en conteos simples.  
\* Qué datos demo concretos usar, porque el documento casi no trae ejemplos de tareas/eventos reales.

\#\# 16\. Qué NO debe entrar al MVP actual

\* Comentarios de tareas como backend real.  
\* Adjuntos de tareas como backend real.  
\* Dependencias bloqueantes entre tareas.  
\* Subtareas complejas.  
\* TaskTimeline.  
\* Streaks reales.  
\* Escalamiento Geni real.  
\* Automatizaciones reales.  
\* Auditoría completa visible.  
\* Feed automático real.  
\* Notificaciones push reales.  
\* Email transaccional real.  
\* Offline sync real.  
\* Recurrencia compleja con RRULE.  
\* EXDATE o excepciones avanzadas de calendario.  
\* Conflictos de calendario detectados por IA real.  
\* Participantes avanzados con respuestas complejas.  
\* Goals backend real.  
\* Milestones backend real.  
\* FamilyCloud conectado a eventos.  
\* MediaItem generado por eventos.  
\* Geni real dentro de Planner.  
\* Templates personalizadas con CRUD.  
\* Tabla \`task\_templates\` como obligación MVP si el MVP usa templates predefinidas constantes.

\#\# 17\. Extractos o referencias internas importantes

\* \`HomePlus — Eventos del sistema v1.md\`

  \* Parte 1: Catálogo completo de eventos.  
  \* Leyenda de consumidores: Notificaciones, Email, Geni, Automatizaciones, Auditoría, Feed, Briefing, Streaks, SOS.  
  \* Leyenda de prioridades: crítica, alta, media, baja.  
  \* \`\#\# 2\. TASKS\`

    \* \`2.1 task.created\`  
    \* \`2.2 task.assigned\`  
    \* \`2.3 task.started\`  
    \* \`2.4 task.completed\`  
    \* \`2.5 task.verified\`  
    \* \`2.6 task.cancelled\`  
    \* \`2.7 task.overdue\`  
    \* \`2.8 task.reminder\_due\`  
    \* \`2.13 task.reassigned\`  
    \* \`2.14 task.commented\`  
    \* \`2.15 subtask.completed\`  
    \* \`2.16 task.progress\_updated\`  
  \* \`\#\# 3\. CALENDAR\`

    \* \`3.1 event.created\`  
    \* \`3.2 event.updated\`  
    \* \`3.3 event.cancelled\`  
    \* \`3.4 event.completed\`  
    \* \`3.5 event.conflict\_detected\`  
    \* \`3.6 event.reminder\_due\`  
    \* \`3.7 event.participant\_added\`  
    \* \`3.8 event.participant\_removed\`  
  \* \`\#\# 4\. GOALS\`

    \* útil solo como referencia futura para Planner.  
\* \`Esquema de base de datos v1.txt\`

  \* OUTPUT 1 — Entities:

    \* \`Task\`;  
    \* \`TaskVerification\`;  
    \* \`Event\`;  
    \* \`Responsibility\`;  
    \* \`PlannerDashboard\`;  
    \* \`CalendarView\`;  
    \* \`GoalsView\`;  
    \* \`BottomNavigation\`;  
    \* \`QuickActions\`;  
    \* \`HomeDashboard\`.  
  \* OUTPUT 2 — Relationships:

    \* \`HouseholdMember creates Task\`;  
    \* \`HouseholdMember is\_assigned\_to Task\`;  
    \* \`HouseholdMember completes Task\`;  
    \* \`HouseholdMember verifies Task\`;  
    \* \`Task belongs\_to Responsibility\`;  
    \* \`TaskTemplate generates Task\`;  
    \* \`HouseholdMember creates Event\`;  
    \* \`Event has\_participant EventParticipant\`.  
  \* OUTPUT 5 — Business Rules:

    \* tarea con única responsabilidad;  
    \* vencida calculada;  
    \* estados de eventos;  
    \* Home resume y redirige;  
    \* navegación ≤3 niveles objetivo.

\#\# 18\. Conclusión operativa

Este documento aporta una base fuerte para diseñar el comportamiento del frontend ideal de Planner, especialmente para Tasks, Events, Calendar, estados visibles, feedback y conexiones con Home.

Debe usarse en la spec final para:

\* definir acciones principales del Planner;  
\* definir campos visibles de tareas y eventos;  
\* definir estados visibles y prioridades;  
\* definir qué aparece en Home como resumen;  
\* definir que Planner administra y Home resume;  
\* definir relación entre tareas, miembros y responsabilidades;  
\* definir verificación de tareas;  
\* definir cancelación/completado/recordatorios como estados o señales visuales;  
\* definir que Goals es referencia futura;  
\* definir límites de navegación simple.

Debe ignorarse o dejarse como POST-MVP para:

\* comentarios;  
\* adjuntos;  
\* subtareas avanzadas;  
\* dependencias;  
\* rachas;  
\* Geni real;  
\* automatizaciones reales;  
\* auditoría completa;  
\* push/email real;  
\* offline sync real;  
\* RRULE complejo;  
\* participantes avanzados;  
\* Goals/Milestones reales.

\# planner\_frontend\_fragment\_HomePlus\_Api\_TestCases\_Edgecases\_V1

\#\# 1\. Fuente

\* Documento: \`HomePlus — Api \+ TestCases \+ Edgecases V1.md\`   
\* Archivo de comprensión asociado: \`Api \+ Testcases \+ Edge cases v1.txt\`   
\* Source map usado: \`source\_map\_HomePlus\_Api\_TestCases\_Edgecases\_V1\_2.md\`   
\* Tipo de documento: contrato de API, eventos realtime, test cases, edge cases, matriz de riesgo y apéndice de consistencia.  
\* Alcance del documento: define endpoints, requests, responses, permisos, reglas, eventos realtime, test cases y edge cases para múltiples módulos de HomePlus.  
\* Nivel de utilidad para Planner Frontend: Alto.  
\* Motivo: contiene contratos explícitos de Tasks, Events, Responsibilities, Task Templates, eventos realtime, casos de prueba y edge cases relacionados con Planner. Aporta poca UI visual explícita, pero sí mucha información accionable para pantallas, estados, filtros, permisos, feedback y service frontend.

\---

\#\# 2\. Resumen útil para Planner Frontend

Este documento aporta principalmente estructura funcional y técnica para construir el frontend ideal de Planner:

\* Define Planner como módulo operativo relacionado con \`Tasks\`, \`Calendar\`, \`Goals\` y \`Responsabilidades\`.  
\* Define \`Tasks\` como trabajo pendiente o realizado con estado, prioridad, asignación, fechas, visibilidad, verificación opcional y relación obligatoria con \`responsibility\_id\`.  
\* Define \`Calendar\` como administración de eventos familiares y personales.  
\* Define \`Events\` con fecha/hora, visibilidad, estado, all-day, recurrencia, ubicación y creador.  
\* Define \`Responsibilities\` como agrupadores operativos del hogar.  
\* Define endpoints reales para listar, crear, editar, completar, eliminar y verificar tareas.  
\* Define endpoints reales para listar, crear, editar, cancelar/eliminar eventos.  
\* Define eventos realtime útiles para feedback visual y actualización entre usuarios: \`task.created\`, \`task.completed\`, \`task.verified\`, \`task.reassigned\`, \`event.created\`, \`event.cancelled\`, \`event.updated\`.  
\* Define filtros útiles para UI: \`status\`, \`assigned\_to\`, \`responsibility\_id\`, \`goal\_id\`, \`sort=due\_date\`, rango \`from/to\` para eventos.  
\* Define relaciones útiles: \`Tasks → Household\`, \`Tasks → HouseholdMembers\`, \`Tasks → Responsabilidades\`, \`Events → Household\`, \`EventParticipants → Events\`, \`Home → Tasks\`, \`Home → Events\`.  
\* Define edge cases que afectan UX: doble completado de tarea, evento recurrente con excepción, tarea recurrente en día inexistente, dependencia circular, responsabilidad sin miembros activos.  
\* No define pantallas visuales concretas de Planner, copy final, layout de cards ni diseño de calendario.

\---

\#\# 3\. Principios de producto aplicables

\* HomePlus se presenta como “Sistema Operativo del Hogar”.  
\* Principio general explícito: “Coordinación por encima de jerarquía”.  
\* La coordinación familiar se refleja en Planner porque:

  \* las tareas pertenecen al hogar;  
  \* pueden asignarse a miembros;  
  \* tienen fechas y estados;  
  \* pueden emitir eventos realtime;  
  \* pueden aparecer como pendientes o actualizadas para otros miembros.  
\* RLS por \`household\_id\` es una restricción central: el frontend debe operar siempre dentro de un hogar activo y no mezclar datos entre hogares.  
\* La visibilidad debe respetarse:

  \* \`visibility='household'\`: visible para miembros con acceso;  
  \* \`visibility='personal'\`: visible solo para \`assigned\_to\` y \`created\_by\` en tareas, o solo para \`created\_by\` en eventos.  
\* El documento establece soft-delete general para endpoints DELETE: el frontend no debe tratar la eliminación como borrado físico inmediato.  
\* El documento usa Supabase Realtime/Broadcast como base para coordinación en vivo.  
\* El formato de errores es uniforme: \`{ error, code, field?, details? }\`; esto sirve para diseñar mensajes de error consistentes.  
\* La paginación es cursor-based: el frontend debe considerar \`next\_cursor\` en listados largos.  
\* El documento declara que es derivado y que FinalSpec V1 gana en contradicciones; como FinalSpec no está disponible en este prompt, cualquier contradicción debe quedar abierta.

\---

\#\# 4\. UX/UI aplicable

\#\#\# Navegación

\* El archivo de comprensión identifica Bottom Navigation con estructura:

  \* \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\`.  
\* \`Planner\` aparece como tab principal en Bottom Nav.  
\* \`QuickActions\` existe como panel desde botón \`+\` en Bottom Nav.  
\* \`Home\` resume información y no administra.  
\* \`MoreScreen\` contiene herramientas especializadas como Finance, Inventory, FamilyCloud y Settings; Planner no aparece como módulo de More en el archivo de comprensión.  
\* \`HouseholdSelector\` aparece como selector global de hogar en header.

\#\#\# Patrones de pantalla inferidos desde endpoints

No hay UI visual explícita, pero los contratos permiten extraer estas pantallas o componentes potenciales:

\* Lista de tareas.  
\* Detalle de tarea.  
\* Crear/editar tarea.  
\* Lista/calendario de eventos.  
\* Detalle de evento.  
\* Crear/editar evento.  
\* Selector de responsabilidad.  
\* Selector de miembro responsable.  
\* Filtros por estado, responsable, responsabilidad y fecha.  
\* Vista de Home con resumen de tareas/eventos como dependencia directa.

\#\#\# Estados UX detectables

Desde contratos, eventos y edge cases se pueden representar:

\* Loading inicial de tareas/eventos.  
\* Error por permisos o conflicto.  
\* Empty state si no hay tareas/eventos.  
\* Success al crear tarea/evento.  
\* Success al completar tarea.  
\* Success al verificar tarea.  
\* Error si una tarea ya fue completada por otro usuario.  
\* Error si se intenta verificar una tarea no completada.  
\* Error si hay dependencia circular.  
\* Error si una responsabilidad no tiene miembros activos.  
\* Estado visible para evento cancelado.  
\* Estado visible para soft-delete.  
\* Actualización realtime cuando otro miembro crea/completa/verifica/reasigna tarea o crea/actualiza/cancela evento.

\#\#\# Feedback visual aplicable

\* \`task.created\` puede disparar inserción visual de una tarea nueva.  
\* \`task.completed\` puede marcar la tarea como completada.  
\* \`task.verified\` puede mostrar badge de verificación.  
\* \`task.reassigned\` puede actualizar responsable.  
\* \`event.created\` puede agregar evento al calendario.  
\* \`event.updated\` puede actualizar campos visibles.  
\* \`event.cancelled\` puede marcar evento como cancelado.  
\* \`notification\` en canal \`member:{mid}\` puede alimentar alertas individuales, pero notificaciones reales quedan fuera si no se implementan ahora.

\#\#\# Copywriting

No se encontraron textos de UI concretos para Planner.

Únicos textos/strings útiles del documento:

\* \`"task\_already\_completed"\`.  
\* \`"task\_not\_completed"\`.  
\* \`"circular\_dependency"\`.  
\* \`"token\_already\_used"\` no aplica a Planner, salvo patrón de error.  
\* \`"cannot\_remove\_last\_coordinator"\` no aplica a Planner.  
\* \`status='cancelled'\`.  
\* \`status='completed'\`.  
\* \`status='pending'\`.  
\* \`visibility='household'\`.  
\* \`visibility='personal'\`.  
\* \`priority='medium'\`.

\---

\#\# 5\. Información directa sobre Planner

\* Planner aparece como módulo Core.  
\* Planner es descrito en el archivo de comprensión como “núcleo operativo”.  
\* Planner administra:

  \* Tasks.  
  \* Calendar.  
  \* Goals.  
  \* Responsabilidades.  
\* El documento principal contiene contratos API para:

  \* \`2.1 Tasks\`.  
  \* \`2.2 Task Templates\`.  
  \* \`2.3 Events\`.  
  \* \`2.4 Goals\`.  
  \* \`2.5 Responsibilities\`.  
  \* \`2.6 Streaks\`.  
\* Para frontend MVP actual, lo directamente útil es:

  \* Tasks.  
  \* Events.  
  \* Calendar como vista/composición de eventos y tareas fechadas.  
  \* Responsibilities como agrupador requerido para crear tareas.  
  \* Templates solo como referencia futura o constantes/presets si la spec final decide usarlas sin backend.  
\* \`Goals\`, \`Milestones\` y \`Streaks\` aparecen en Planner, pero deben quedar fuera del MVP actual salvo referencia visual/futura.  
\* El documento no define una pantalla \`PlannerDashboard\` en el contrato principal, pero el archivo de comprensión sí identifica Planner como dominio con Tasks, Calendar, Goals y Responsabilidades.  
\* El documento no define jerarquía visual, tabs internos ni layout específico de Planner.

\---

\#\# 6\. Información sobre Tasks

\#\#\# MVP actual

\#\#\#\# Entidad / concepto

\* \`Tasks\` representan trabajo pendiente o realizado.  
\* Pertenecen a \`Households\`.  
\* Requieren \`Responsabilidades\`.  
\* Pueden asignarse a \`HouseholdMembers\`.  
\* Pueden referenciar opcionalmente \`Goals\` y \`Events\`.  
\* Pueden tener verificación opcional.

\#\#\#\# Campos extraídos para frontend

Campos de creación:

\* \`title\`.  
\* \`responsibility\_id\`.  
\* \`description?\`.  
\* \`visibility?\`.  
\* \`priority?\`.  
\* \`start\_date?\`.  
\* \`due\_date?\`.  
\* \`due\_time?\`.  
\* \`recurrence\_rule?\`.  
\* \`recurrence\_end?\`.  
\* \`goal\_id?\`.  
\* \`assigned\_to?\`.  
\* \`requires\_verification?\`.  
\* \`parent\_task\_id?\`.  
\* \`event\_id?\`.

Campos de detalle/listado:

\* \`id\`.  
\* \`title\`.  
\* \`description\`.  
\* \`visibility\`.  
\* \`status\`.  
\* \`priority\`.  
\* \`start\_date\`.  
\* \`due\_date\`.  
\* \`due\_time\`.  
\* \`recurrence\_rule\`.  
\* \`recurrence\_end\`.  
\* \`responsibility\_id\`.  
\* \`goal\_id\`.  
\* \`created\_by\`.  
\* \`assigned\_to\`.  
\* \`completed\_by\`.  
\* \`completed\_at\`.  
\* \`requires\_verification\`.  
\* \`verified\_by\`.  
\* \`verified\_at\`.  
\* \`parent\_task\_id\`.  
\* \`event\_id\`.  
\* \`created\_at\`.  
\* \`updated\_at\`.

Campos de respuesta al crear:

\* \`task\_id\`.  
\* \`created\_by\`.  
\* \`created\_at\`.

\#\#\#\# Valores por defecto

\* \`visibility\` default: \`'household'\`.  
\* \`priority\` default: \`'medium'\`.  
\* \`responsibility\_id\` es obligatorio.  
\* \`deleted\_at IS NULL\` filtra tareas activas en listado.

\#\#\#\# Estados detectados

\* \`pending\`.  
\* \`in\_progress\`.  
\* \`completed\`.  
\* \`cancelled\`.

\#\#\#\# Estados esperados por el prompt MVP actual

\* \`pending\`.  
\* \`completed\`.  
\* \`awaiting\_verification\`.  
\* \`verified\`.

\#\#\#\# Riesgo de estados

\* El documento permite completar tarea con \`status='completed'\`.  
\* La verificación se modela con \`requires\_verification\`, \`verified\_by\`, \`verified\_at\` y endpoint \`/verify\`.  
\* El documento no define \`awaiting\_verification\` ni \`verified\` como \`status\` de tarea.  
\* Para frontend ideal, \`awaiting\_verification\` y \`verified\` deberían tratarse como estados visuales derivados si se usa este documento como fuente:

  \* \`awaiting\_verification\`: tarea \`completed\` \+ \`requires\_verification=true\` \+ \`verified\_at\` vacío.  
  \* \`verified\`: tarea \`completed\` \+ \`requires\_verification=true\` \+ \`verified\_at\` presente.  
\* Esta derivación es una propuesta UX derivada y requiere validación del usuario.

\#\#\#\# Acciones reales detectadas

\* Listar tareas.  
\* Crear tarea.  
\* Ver detalle de tarea.  
\* Editar tarea.  
\* Completar tarea mediante \`PATCH\` con \`status='completed'\`.  
\* Cancelar tarea mediante \`PATCH\` con \`status='cancelled'\`.  
\* Reasignar tarea.  
\* Eliminar tarea mediante soft-delete.  
\* Verificar tarea con endpoint dedicado.  
\* Filtrar por:

  \* \`status\`.  
  \* \`assigned\_to\`.  
  \* \`responsibility\_id\`.  
  \* \`goal\_id\`.  
  \* \`sort=due\_date\`.  
  \* \`cursor\`.  
  \* \`limit\`.

\#\#\#\# Permisos detectados

Crear tarea:

\* Adultos.  
\* Coordinador.  
\* Senior.  
\* Adolescente solo si \`assigned\_to\` es él mismo.

Listar tareas:

\* Miembro del hogar.

Ver detalle:

\* Miembro con acceso a la tarea.

Editar/completar:

\* \`assigned\_to\` puede marcar completada.  
\* \`created\_by\` puede editar.  
\* \`coordinator\` puede todo.

Eliminar:

\* \`created\_by\` o \`coordinator\`.

Verificar:

\* Adulto o Coordinador.

Visibilidad:

\* Miembros ven tareas \`visibility='household'\`.  
\* \`visibility='personal'\` solo \`assigned\_to\` y \`created\_by\`.

\#\#\#\# Eventos realtime

\* \`task.created\` con payload \`{ task\_id, title, assigned\_to, due\_date }\`.  
\* \`task.completed\` con payload \`{ task\_id, title, completed\_by }\`.  
\* \`task.verified\` con payload \`{ task\_id, verified\_by, verified\_at }\`.  
\* \`task.reassigned\` con payload \`{ task\_id, old\_assignee, new\_assignee }\`.  
\* \`task.commented\` existe, pero comentarios quedan POST-MVP.

\#\#\#\# Test cases útiles

\* Crear tarea con responsabilidad:

  \* adulto autenticado;  
  \* responsabilidad existe;  
  \* POST con título, \`responsibility\_id\`, \`assigned\_to=child\`, \`due\_date\`;  
  \* respuesta 201;  
  \* notificación push al child;  
  \* tarea visible en lista.  
\* Completar tarea con verificación:

  \* child tiene tarea con \`requires\_verification=true\`;  
  \* marca completada;  
  \* status pasa a \`completed\`;  
  \* queda pendiente de verificación;  
  \* coordinator recibe notificación.  
\* Verificar tarea:

  \* coordinator ve tarea completada;  
  \* POST \`/verify\`;  
  \* tarea marcada como verificada;  
  \* \`task.verified\` emitido.  
\* Adolescente crea tarea para sí mismo:

  \* permitido.  
\* Niño intenta crear tarea:

  \* 403 \`permission\_denied\`.

\#\#\#\# Edge cases útiles para frontend

\* Tarea completada dos veces:

  \* mitigación backend con \`SELECT FOR UPDATE\`;  
  \* si ya fue completada, response 409 con \`"task\_already\_completed"\` y datos de \`completed\_by\`, \`completed\_at\`.  
  \* UX debe evitar duplicar success si otro usuario ya completó.  
\* Dependencia circular:

  \* POST dependency responde 409 \`"circular\_dependency"\`.  
  \* POST-MVP si dependencias no se implementan.  
\* Responsabilidad sin miembros activos:

  \* afecta asignación y selector de responsabilidad/miembros.  
\* Task recurrente en día inexistente:

  \* POST-MVP si recurrencia compleja no entra.

\#\#\# POST-MVP / futuro

\* \`Task Templates\` CRUD completo.  
\* \`TaskComments\`.  
\* \`TaskAttachments\`.  
\* \`TaskDependencies\`.  
\* \`parent\_task\_id\` como subtarea o jerarquía.  
\* \`goal\_id\` como relación a Goals.  
\* \`recurrence\_rule\` y \`recurrence\_end\` si implican recurrencia compleja.  
\* UUID pre-generado en cliente para soporte offline.  
\* Soporte offline/LWW.  
\* Notificaciones push reales.  
\* Escalamiento automático de tareas overdue.  
\* Streaks y LoadMetrics derivados de tareas.  
\* Geni optimizando tareas.  
\* Geni Search buscando tareas.  
\* Automatizaciones reaccionando a tareas.  
\* Feed generado desde tareas.

\#\#\# Dudas o decisiones abiertas

\* No se define UI de Task List.  
\* No se define card visual de tarea.  
\* No se define copy de empty state.  
\* No se define formulario exacto de crear tarea.  
\* No se define selector de responsabilidad.  
\* No se define qué responsabilidades vienen seed/predefinidas.  
\* No se define cómo mostrar \`priority\`.  
\* No se define enum cerrado de prioridades salvo default \`medium\`.  
\* No se define si \`in\_progress\` entra en MVP actual.  
\* No se define si \`cancelled\` se muestra al usuario final o solo se filtra.  
\* No se define cómo mapear \`completed\` \+ verification a \`awaiting\_verification\` / \`verified\`.  
\* No se define UI para conflictos realtime.  
\* No se define restore de soft-delete.  
\* No se define undo.

\---

\#\# 7\. Información sobre Calendar / Events

\#\#\# MVP actual

\#\#\#\# Entidad / concepto

\* \`Calendar\` administra eventos familiares y personales.  
\* \`Events\` pertenecen a \`Households\`.  
\* Events tienen fecha/hora y visibilidad.  
\* Events pueden mostrarse por rango de fechas.  
\* Calendar no tiene endpoint propio; se compone a partir de Events.  
\* El calendario puede mostrar eventos y, por requerimiento del prompt, tareas con fecha; el documento permite esto porque Tasks tienen \`due\_date\`, \`due\_time\`, \`start\_date\`.

\#\#\#\# Campos extraídos para frontend

Campos de creación:

\* \`title\`.  
\* \`starts\_at\`.  
\* \`description?\`.  
\* \`visibility?\`.  
\* \`all\_day?\`.  
\* \`ends\_at?\`.  
\* \`recurrence\_rule?\`.  
\* \`recurrence\_end?\`.  
\* \`location\_name?\`.  
\* \`location\_address?\`.  
\* \`location\_coordinates?\`.

Campos de listado:

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

Campos de detalle:

\* \`id\`.  
\* \`title\`.  
\* \`description\`.  
\* \`visibility\`.  
\* \`status\`.  
\* \`all\_day\`.  
\* \`starts\_at\`.  
\* \`ends\_at\`.  
\* \`recurrence\_rule\`.  
\* \`recurrence\_end\`.  
\* \`location\_name\`.  
\* \`location\_address\`.  
\* \`location\_coordinates\`.  
\* \`created\_by\`.  
\* \`created\_at\`.  
\* \`updated\_at\`.

Campos de respuesta al crear:

\* \`event\_id\`.  
\* \`created\_by\`.  
\* \`created\_at\`.

\#\#\#\# Valores por defecto

\* \`status\` default: \`'scheduled'\`.  
\* \`all\_day\` default: \`false\`.  
\* \`visibility\` default: \`'household'\`.

\#\#\#\# Estados detectados

\* \`scheduled\`.  
\* \`cancelled\`.

También aparece \`completed\` en otros fragments previos, pero en este documento principal la parte visible de Events destaca \`scheduled\` y \`cancelled\`.

\#\#\#\# Acciones reales detectadas

\* Crear evento.  
\* Listar eventos por rango.  
\* Ver detalle de evento.  
\* Editar evento.  
\* Cancelar evento con \`status='cancelled'\`.  
\* Eliminar evento con soft-delete.  
\* Agregar participantes.  
\* Listar participantes.  
\* Responder participación.  
\* Remover participante.

\#\#\#\# Permisos detectados

Crear evento:

\* Adulto.  
\* Coordinador.  
\* Senior.  
\* Adolescente.

Listar eventos:

\* Miembro del hogar.

Ver detalle:

\* Miembro con acceso al evento.

Editar evento:

\* \`created\_by\` o \`coordinator\`.

Eliminar evento:

\* \`created\_by\` o \`coordinator\`.

Participantes:

\* \`created\_by\` o \`coordinator\` pueden agregar/remover.  
\* Propio participante puede responder.

Visibilidad:

\* \`visibility='personal'\` solo visible para \`created\_by\`.

\#\#\#\# Filtros/listado

\* \`from=ISO\`.  
\* \`to=ISO\`.  
\* \`status=scheduled\`.  
\* \`visibility=household\`.  
\* Rango de fechas obligatorio para rendimiento.

\#\#\#\# Eventos realtime

\* \`event.created\` con payload \`{ event\_id, title, starts\_at, created\_by }\`.  
\* \`event.cancelled\` con payload \`{ event\_id, title, cancelled\_by, priority }\`.  
\* \`event.updated\` con payload \`{ event\_id, title, updated\_fields }\`.  
\* \`event.conflict\_detected\` con payload \`{ event\_id, conflicting\_event\_id, member\_affected }\`.

\#\#\#\# Test cases útiles

\* Crear evento familiar:

  \* Adulto crea evento \`Clase de piano\`;  
  \* \`starts\_at\` mañana;  
  \* 201;  
  \* visible en calendario de todos.  
\* Conflicto de evento:

  \* miembro tiene otro evento solapado;  
  \* POST evento nuevo;  
  \* 201 pero dispara \`event.conflict\_detected\`;  
  \* Geni sugiere alternativa.  
\* Cancelar evento próximo:

  \* evento en menos de 2 horas;  
  \* PATCH \`status=cancelled\`;  
  \* notificación prioridad alta a participantes.

\#\#\#\# Calendar simple

\* El documento no define vistas día/semana/mes.  
\* El documento sí exige rango \`from/to\` en listado de eventos por rendimiento.  
\* El documento menciona Calendar como feature y Events como fuente de eventos.  
\* Vista día/semana/mes queda como requerimiento del prompt actual, pero no está detallada visualmente en este documento.  
\* Para frontend ideal, Calendar puede tomar eventos con \`starts\_at\`, \`ends\_at\`, \`all\_day\` y tareas con \`due\_date\` / \`due\_time\`.  
\* Esta composición de tareas con fecha en Calendar no está definida como endpoint único; es una propuesta UX derivada / requiere validación del usuario.

\#\#\# POST-MVP / futuro

\* Participantes avanzados:

  \* \`accepted\`.  
  \* \`declined\`.  
  \* \`maybe\`.  
  \* \`responded\_at\`.  
\* \`EventParticipants\` CRUD.  
\* \`recurrence\_rule\`.  
\* \`recurrence\_end\`.  
\* Pregunta al borrar evento recurrente:

  \* “¿Solo esta instancia, esta y siguientes, o todas?”.  
\* Excepciones recurrentes.  
\* \`EXDATE\`.  
\* \`event.conflict\_detected\` con Geni sugiriendo alternativa.  
\* Ubicación avanzada con \`location\_coordinates\`.  
\* Notificaciones reales.  
\* Prioridad alta automática si evento empieza en ≤2h.  
\* Eventos que generan álbumes/media en FamilyCloud.

\#\#\# Dudas o decisiones abiertas

\* No se define layout de calendario.  
\* No se define si día/semana/mes son obligatorios en este documento.  
\* No se define agenda/lista como vista alternativa.  
\* No se define card visual de evento.  
\* No se define diseño de evento all-day.  
\* No se define color por tipo/categoría.  
\* No se define cómo mostrar conflictos.  
\* No se define cómo manejar timezone en frontend, aunque Household tiene \`timezone\`.  
\* No se define cómo mostrar eventos personales vs del hogar.  
\* No se define si eventos cancelados siguen visibles o se ocultan.  
\* No se define copy de confirmación al eliminar/cancelar.  
\* No se define endpoint de Calendar como agregador.

\---

\#\# 8\. Información sobre Goals

\* \`Goals\` aparece como parte de Planner.  
\* El archivo de comprensión describe Goals como objetivos personales o familiares con hitos y tareas vinculadas.  
\* El documento principal contiene contratos API para Goals y Milestones.  
\* Goals pueden relacionarse con Tasks.  
\* Goals pueden relacionarse con Funds.  
\* Realtime events detectados:

  \* \`goal.completed\`.  
  \* \`goal.failed\`.  
\* Para Planner Frontend MVP actual, Goals queda fuera.  
\* Uso útil futuro:

  \* referencia visual como sección posterior del Planner;  
  \* posible tab o card futura;  
  \* posible relación visual “tareas vinculadas a una meta”.  
\* No extraer Goals como backend real en MVP actual.  
\* No implementar Milestones en MVP actual.

\---

\#\# 9\. Responsabilidades, templates y categorías

\#\#\# Responsabilidades

\* \`Responsabilidades\` aparecen como feature de Planner.  
\* El archivo de comprensión las describe como áreas operativas del hogar y eje organizador de Tasks.  
\* \`Tasks\` requieren \`responsibility\_id\`.  
\* \`Tasks\` tienen relación explícita con \`Responsabilidades\`.  
\* Endpoints de Responsibilities detectados:

  \* crear responsabilidad;  
  \* listar responsabilidades;  
  \* editar responsabilidad;  
  \* eliminar responsabilidad;  
  \* agregar miembros a responsabilidad;  
  \* remover miembros de responsabilidad.  
\* Campos detectados en Responsibilities:

  \* \`title\`.  
  \* \`description?\`.  
  \* \`category?\`.  
  \* \`recurrence\_rule?\`.  
  \* \`is\_active\`.  
  \* \`members\`.  
  \* \`member\_id\`.  
  \* \`display\_name\`.  
  \* \`is\_primary\`.  
\* Permisos:

  \* Adulto o Coordinador para crear/editar/eliminar/asignar miembros.  
  \* Miembro del hogar puede listar.  
\* Restricción:

  \* no se eliminan responsabilidades con tareas activas asociadas; responde 409\.  
\* Riesgo:

  \* si \`responsibility\_id\` es obligatorio para crear task, el frontend necesita un selector o una responsabilidad default.  
  \* el documento no define seed/predefinidas para Responsibilities.

\#\#\# Templates

\* \`Task Templates\` aparece como feature de Planner.  
\* El documento principal define CRUD completo:

  \* crear template;  
  \* listar templates;  
  \* editar template;  
  \* eliminar template.  
\* Campos detectados:

  \* \`title\`.  
  \* \`description?\`.  
  \* \`default\_assignee\_id?\`.  
  \* \`default\_priority?\`.  
  \* \`default\_due\_time?\`.  
  \* \`default\_responsibility\_id?\`.  
  \* \`recurrence\_rule?\`.  
  \* \`category?\`.  
  \* \`is\_active\`.  
\* Clasificación para MVP actual:

  \* POST-MVP como backend real.  
  \* El prompt actual indica que templates MVP deben ser constantes del sistema, no editables, sin CRUD, sin tabla propia y sin endpoints.  
\* Contradicción:

  \* documento define CRUD completo de templates;  
  \* alcance MVP actual pide templates predefinidas constantes.  
\* Tratamiento recomendado:

  \* no usar endpoints de Task Templates en MVP actual;  
  \* si se usan visualmente, tratarlas como presets locales sin CRUD.  
  \* Esto es una propuesta UX derivada / requiere validación del usuario.

\#\#\# Categorías

\* El documento menciona \`category\` en Responsibilities y Task Templates.  
\* El documento no define un catálogo cerrado de categorías Planner.  
\* El prompt actual propone:

  \* Limpieza.  
  \* Compras.  
  \* Mascotas.  
  \* Medicación.  
  \* Estudios.  
  \* Pagos.  
  \* Vehículos.  
  \* Finanzas.  
  \* Otro.  
\* En el archivo de comprensión aparecen relaciones externas donde:

  \* Inventory puede crear Tasks.  
  \* Assets puede generar Tasks.  
  \* TaskTemplates instancia Tasks.  
\* No hay evidencia suficiente en este documento para afirmar que todas las categorías propuestas están definidas como Planner oficial.  
\* “Responsabilidades” parecen el modelo más fuerte para agrupar tareas.  
\* “Categoría” aparece como campo auxiliar en Responsibilities/Templates, no como entidad principal.  
\* Evitar duplicación entre responsabilidad/template/categoría queda como decisión abierta.

\---

\#\# 10\. Quick Actions aplicables a Planner

\* \`QuickActions\` aparece en el archivo de comprensión como panel de acción rápida desde botón \`+\` en Bottom Nav.  
\* El Bottom Nav identificado es \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\`.  
\* No se encontraron acciones concretas de Quick Actions para Planner en el documento principal.  
\* No se encontró contrato específico para “crear tarea desde Quick Actions”.  
\* No se encontró contrato específico para “crear evento desde Quick Actions”.  
\* No se encontró UI de Quick Actions en este documento.  
\* Relación útil:

  \* como Planner tiene endpoints \`POST /tasks\` y \`POST /events\`, Quick Actions podría abrir formularios de crear tarea/evento.  
  \* Esto es propuesta UX derivada / requiere validación del usuario.  
\* No implementar Geni real desde Quick Actions.  
\* No implementar automatizaciones reales desde Quick Actions.  
\* No implementar acciones de Finance/Inventory/Assets como parte de Planner.

\---

\#\# 11\. Home relacionado con Planner

\* El archivo de comprensión define Home como “Centro operativo del hogar. Resume información, no administra”.  
\* Home aparece relacionado con Tasks y Events.  
\* El source map marca Home como dependencia directa para Home summaries.  
\* Información aplicable:

  \* Home puede mostrar tareas.  
  \* Home puede mostrar eventos.  
  \* Home puede mostrar Briefing.  
  \* Home puede resumir Planner, pero Planner administra.  
\* El documento no define card concreta de Planner en Home.  
\* El documento no define layout de Home para tareas/eventos.  
\* El documento no define texto “Ver todo”.  
\* El documento no define endpoint específico de Home summary.  
\* El archivo de comprensión identifica Briefing como resumen diario generado por Geni y primer widget de Home.  
\* Para MVP actual:

  \* tareas pendientes y próximos eventos pueden ser reales si se consumen endpoints de Planner;  
  \* Briefing debe quedar mock si no se implementa Geni real;  
  \* Activity/Presence/Load puede quedar fuera o mock según spec final.  
\* Relaciones útiles:

  \* \`Home → Tasks\`.  
  \* \`Home → Events\`.  
  \* \`Geni personalizes Home\`.  
  \* \`Geni optimizes Tasks\`.  
  \* \`Geni coordinates Events\`.  
\* Geni real queda fuera del MVP actual.

\---

\#\# 12\. Patrones visuales reutilizables

\#\#\# Aplicable ahora a Planner

No hay capturas ni diseño visual explícito en este documento. Sin embargo, los datos del contrato permiten diseñar patrones:

\* Cards de tarea con:

  \* título;  
  \* responsable;  
  \* fecha límite;  
  \* prioridad;  
  \* responsabilidad;  
  \* badge de estado;  
  \* badge de verificación si aplica.  
\* Cards de evento con:

  \* título;  
  \* fecha/hora;  
  \* estado;  
  \* all-day;  
  \* ubicación textual si existe;  
  \* visibilidad.  
\* Chips/filtros posibles:

  \* estado;  
  \* responsable;  
  \* responsabilidad;  
  \* fecha;  
  \* prioridad.  
\* Badges posibles:

  \* \`pending\`;  
  \* \`in\_progress\`;  
  \* \`completed\`;  
  \* \`cancelled\`;  
  \* \`requires\_verification\`;  
  \* \`verified\`;  
  \* \`scheduled\`;  
  \* \`personal\`;  
  \* \`household\`.  
\* Secciones posibles:

  \* tareas pendientes;  
  \* tareas asignadas a mí;  
  \* tareas por responsabilidad;  
  \* próximos eventos;  
  \* calendario por rango.  
\* Feedback visual realtime:

  \* insertar/actualizar item cuando llega evento broadcast;  
  \* mostrar toast o microfeedback cuando otro miembro completa/verifica/reasigna.

\#\#\# Referencia visual para más adelante

\* Quick Actions desde botón \`+\`.  
\* HouseholdSelector en header.  
\* Geni Briefing como primer widget de Home.  
\* SearchGlobal/GeniSearch puede buscar Tasks, pero queda fuera del MVP actual.  
\* Notifications pueden alertar de tareas/eventos, pero push real queda fuera del MVP actual.

\#\#\# No aplicable

\* MoreScreen como lugar de Planner: este documento indica Planner en Bottom Nav, no en More.  
\* Finance, Inventory, Assets, HomeCloud, SOS, Feed, Automations y Presence GPS no deben convertirse en partes reales de Planner.  
\* Storage real para TaskAttachments queda POST-MVP.  
\* OCR, geofencing, mapas reales y automatizaciones quedan fuera.

\---

\#\# 13\. Reglas funcionales extraídas

\* Toda request protegida usa Bearer token JWT de Supabase.  
\* Todas las queries deben filtrarse por \`household\_id\` del miembro autenticado.  
\* El frontend debe operar sobre un \`:hid\` explícito.  
\* Endpoints DELETE hacen soft-delete con \`deleted\_at \= now()\`.  
\* La papelera conserva 30 días, pero restore no está definido.  
\* Formato de errores: \`{ error, code, field?, details? }\`.  
\* Listados usan paginación cursor-based con \`cursor\`, \`limit\` y \`next\_cursor\`.  
\* Crear tarea requiere \`responsibility\_id\`.  
\* Crear tarea tiene \`priority\` default \`'medium'\`.  
\* Crear tarea tiene \`visibility\` default \`'household'\`.  
\* Tareas personales solo son visibles para \`assigned\_to\` y \`created\_by\`.  
\* Una tarea completada dispara \`task.completed\`.  
\* Una tarea cancelada dispara \`task.cancelled\`.  
\* Reasignar tarea dispara \`task.reassigned\`.  
\* Tarea con \`requires\_verification=true\` se verifica con endpoint dedicado.  
\* \`POST /tasks/:tid/verify\` solo aplica a tareas con \`status='completed'\` y \`requires\_verification=true\`.  
\* Verificar tarea dispara \`task.verified\`.  
\* Si una tarea ya fue completada, la API puede devolver 409 \`"task\_already\_completed"\` con \`completed\_by\` y \`completed\_at\`.  
\* Crear evento tiene \`status\` default \`'scheduled'\`.  
\* Crear evento tiene \`all\_day\` default \`false\`.  
\* Crear evento tiene \`visibility\` default \`'household'\`.  
\* Events requieren rango \`from/to\` para listarse por rendimiento.  
\* Eventos personales solo son visibles para \`created\_by\`.  
\* Cancelar evento dispara \`event.cancelled\`.  
\* Actualizar fecha u otros campos de evento dispara \`event.updated\`.  
\* Eliminar evento recurrente requiere decisión de alcance, pero esto queda POST-MVP si no se implementa recurrencia compleja.  
\* Responsibilities no se eliminan si tienen tareas activas asociadas.  
\* Home resume; Planner administra.  
\* QuickActions existe como acceso global desde \`+\`, pero las acciones Planner concretas no están definidas.

\---

\#\# 14\. Ideas derivadas útiles

\* Propuesta UX derivada / requiere validación del usuario: usar una pantalla principal de Planner con tabs internos \`Tareas\` y \`Calendario\`, porque el documento separa Tasks y Events pero no define pantalla visual.  
\* Propuesta UX derivada / requiere validación del usuario: mostrar \`awaiting\_verification\` como estado visual derivado de \`completed \+ requires\_verification \+ \!verified\_at\`.  
\* Propuesta UX derivada / requiere validación del usuario: mostrar \`verified\` como estado visual derivado de \`completed \+ verified\_at\`.  
\* Propuesta UX derivada / requiere validación del usuario: usar presets locales de templates sin backend CRUD para Limpieza, Compras, Mascotas, Medicación, Estudios y Pagos, respetando el alcance MVP del prompt aunque el documento defina Task Templates CRUD.  
\* Propuesta UX derivada / requiere validación del usuario: si no existen responsabilidades creadas, mostrar estado bloqueante o crear una opción “General/Otro” solo si otra fuente lo permite; este documento no define esa opción.  
\* Propuesta UX derivada / requiere validación del usuario: usar cards compactas con prioridad, fecha, responsable y badge de responsabilidad para tareas.  
\* Propuesta UX derivada / requiere validación del usuario: componer Calendar desde \`GET /events?from\&to\` \+ \`GET /tasks?sort=due\_date\`, ya que no hay endpoint de Calendar.  
\* Propuesta UX derivada / requiere validación del usuario: mostrar eventos cancelados con estilo atenuado o filtrarlos, porque el documento define \`status='cancelled'\` pero no define UI.  
\* Propuesta UX derivada / requiere validación del usuario: usar Quick Action \`+ Crear tarea\` y \`+ Crear evento\` como accesos rápidos a los endpoints existentes, aunque el documento no lo explicite.  
\* Propuesta UX derivada / requiere validación del usuario: Home puede mostrar “Tareas pendientes” y “Próximos eventos” usando los endpoints de Planner, porque Home resume Tasks/Events pero no hay endpoint summary.

\---

\#\# 15\. Decisiones que quedan abiertas

| Decisión abierta                                 | Motivo                                                                            |  
| \------------------------------------------------ | \--------------------------------------------------------------------------------- |  
| Diseño visual de Planner                         | El documento no trae pantallas ni capturas.                                       |  
| Tabs internos de Planner                         | No se define si Planner usa tabs Tasks/Calendar/Goals.                            |  
| Vista día/semana/mes                             | Calendar se menciona, pero no se especifican vistas.                              |  
| Calendar como endpoint o composición frontend    | No hay endpoint propio de Calendar.                                               |  
| Tareas con fecha dentro del calendario           | Tasks tienen fechas, pero no se define visualmente su inclusión en Calendar.      |  
| Estados MVP \`awaiting\_verification\` y \`verified\` | El documento no los define como \`status\`; solo da campos de verificación.         |  
| Catálogo de prioridades                          | Solo se detecta default \`medium\`; no aparece enum completo.                       |  
| Categorías predefinidas                          | El documento tiene \`category?\`, pero no catálogo cerrado.                         |  
| Templates MVP                                    | El documento define CRUD, pero el prompt pide constantes sin CRUD.                |  
| Selector de responsabilidad                      | \`responsibility\_id\` es obligatorio, pero no se define UX.                         |  
| Responsabilidad default                          | No aparece.                                                                       |  
| Datos demo concretos                             | No hay títulos suficientes de tareas/eventos salvo “Clase de piano” en test case. |  
| Textos de empty/error/success                    | No aparecen.                                                                      |  
| Confirmación de delete/cancel                    | No aparece UI.                                                                    |  
| Tratamiento visual de soft-delete                | No aparece.                                                                       |  
| Realtime UX                                      | Hay eventos, pero no diseño de cómo se muestran.                                  |  
| Home card de Planner                             | Home resume, pero no se define card ni copy.                                      |  
| Quick Actions de Planner                         | Existe \`+\`, pero no acciones concretas.                                           |  
| Senior verificando tareas                        | Senior crea tasks/events, pero verify endpoint solo dice Adulto o Coordinador.    |  
| Guest en Planner                                 | No se detallan permisos Planner para Guest.                                       |  
| Timezone                                         | Household tiene timezone, pero Events no detallan conversión en frontend.         |

\---

\#\# 16\. Qué NO debe entrar al MVP actual

\* Task Templates CRUD.  
\* Templates personalizadas editables.  
\* Task Comments.  
\* Task Attachments.  
\* Task Dependencies.  
\* Subtareas complejas vía \`parent\_task\_id\`.  
\* Goals backend real.  
\* Milestones.  
\* Streaks.  
\* LoadMetrics.  
\* Recurrencia compleja.  
\* RRULE complejo.  
\* EXDATE.  
\* Excepciones avanzadas de calendario.  
\* Participantes avanzados de eventos.  
\* Respuestas \`accepted\`, \`declined\`, \`maybe\` como requisito MVP.  
\* Notificaciones push/email/SMS reales.  
\* Geni real.  
\* Geni Search real.  
\* Automatizaciones reales.  
\* Offline Sync.  
\* UUID client-side para offline como obligación MVP.  
\* Audit Logs visibles para usuario.  
\* Finance real.  
\* Inventory real.  
\* Assets real.  
\* HomeCloud real.  
\* Presence GPS real.  
\* Feed real.  
\* SOS real.  
\* OCR real.  
\* Storage real para adjuntos.  
\* Geofencing real.  
\* Mapas reales.  
\* Multi-hogar avanzado.  
\* Permisos finos configurables.

\---

\#\# 17\. Extractos o referencias internas importantes

\* Documento principal:

  \* \`\# PARTE 1: API Contracts\`.  
  \* \`\#\# Convenciones Generales\`.  
  \* \`\#\# 2\. Planner\`.  
  \* \`\#\#\# 2.1 Tasks\`.  
  \* \`\#\#\# 2.2 Task Templates\`.  
  \* \`\#\#\# 2.3 Events\`.  
  \* \`\#\#\# 2.4 Goals\`.  
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
  \* \`APÉNDICE \> Campos NOT NULL\`.  
  \* \`APÉNDICE \> Roles y permisos\`.

\* Archivo de comprensión:

  \* \`OUTPUT 1 — ENTITIES\`: Planner, Tasks, Calendar, Goals, Responsabilidades, TaskTemplates, TaskDependencies, TaskComments, TaskAttachments, EventParticipants, Streaks, LoadMetrics, Home, QuickActions, BottomNavigation.  
  \* \`OUTPUT 2 — RELATIONSHIPS\`: Tasks belongs\_to Households, Tasks requires Responsabilidades, Tasks assigned\_to HouseholdMembers, Events belongs\_to Households, EventParticipants belongs\_to Events, Home summarizes Tasks/Events.  
  \* \`OUTPUT 3 — CROSS DOMAIN RELATIONSHIPS\`: Inventory creates Tasks, Assets generates Tasks, Geni optimizes Tasks, Geni coordinates Events.  
  \* \`OUTPUT 5 — BUSINESS RULES\`.  
  \* \`OUTPUT 6 — ARCHITECTURAL DECISIONS\`.  
  \* \`OUTPUT 7 — MISSING OR IMPLIED CONNECTIONS\`.

\* Source map:

  \* \`4.7 PLANNER\`.  
  \* \`4.8 TASKS\`.  
  \* \`4.9 EVENTS\`.  
  \* \`4.10 CALENDAR\`.  
  \* \`4.11 HOME\`.  
  \* \`Mapa de entidades\`.  
  \* \`Mapa de relaciones\`.  
  \* \`Mapa de estados\`.  
  \* \`Mapa de permisos\`.  
  \* \`Mapa de APIs\`.  
  \* \`Mapa de UI\`.  
  \* \`Contradicciones detectadas\`.  
  \* \`Información faltante\`.

\---

\#\# 18\. Conclusión operativa

Este documento aporta una base fuerte para definir el frontend ideal de Planner desde el lado funcional:

\* qué datos debe mostrar;  
\* qué campos existen;  
\* qué filtros puede tener;  
\* qué acciones puede ejecutar;  
\* qué permisos debe respetar;  
\* qué eventos realtime puede escuchar;  
\* qué errores y edge cases debe representar;  
\* qué relación tiene Planner con Home, Members, Household y Quick Actions.

Partes que deben usarse en la spec final:

\* Tasks reales:

  \* listar;  
  \* crear;  
  \* editar;  
  \* completar;  
  \* verificar;  
  \* eliminar con soft-delete;  
  \* filtrar;  
  \* mostrar responsable, responsabilidad, fecha, prioridad, visibilidad y verificación.  
\* Events reales:

  \* listar por rango;  
  \* crear;  
  \* editar;  
  \* cancelar;  
  \* eliminar con soft-delete;  
  \* mostrar fecha/hora, all-day, estado, visibilidad y ubicación textual si existe.  
\* Calendar:

  \* usar como vista frontend de Events;  
  \* potencialmente sumar Tasks con \`due\_date\` / \`due\_time\`, marcado como decisión derivada.  
\* Responsibilities:

  \* necesarias para crear tareas;  
  \* deben aparecer como agrupador/select visible.  
\* Home:

  \* debe resumir tareas y eventos;  
  \* no debe administrar Planner.  
\* Quick Actions:

  \* puede servir como acceso rápido a crear tarea/evento, pero este documento no define esa acción explícitamente.  
\* Estados UX:

  \* loading, empty, error, success, realtime updates y conflictos deben diseñarse en la spec final porque el documento aporta errores/eventos, aunque no UI.

Partes que deben ignorarse por ahora:

\* Goals/Milestones.  
\* Streaks.  
\* Templates CRUD.  
\* Comentarios.  
\* Adjuntos.  
\* Dependencias.  
\* Participantes avanzados.  
\* Recurrencia compleja.  
\* Geni real.  
\* Automatizaciones.  
\* Offline Sync.  
\* Notificaciones reales.  
\* Finance/Inventory/Assets/Presence/SOS/Feed/HomeCloud reales.

Este fragment no define diseño visual final. Sirve como fuente técnica para que la futura \`planner\_frontend\_ideal\_spec.md\` convierta contratos, estados, permisos y relaciones en una experiencia mobile clara, rápida y profesional.

