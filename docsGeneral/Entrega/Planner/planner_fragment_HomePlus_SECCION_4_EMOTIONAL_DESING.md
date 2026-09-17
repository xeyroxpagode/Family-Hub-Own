# PLANNER fragment — HomePlus — SECCIÓN 4 EMOTIONAL DESING

> Fragment crudo de implementación visual/interactiva.  
> Alcance estricto: módulo **PLANNER** únicamente.  
> Fuente única: `HomePlus — SECCION 4 EMOTIONAL DESING.md`, `Seccion 4 Emotional Design.txt` y `source_map_HomePlus_SECCION_4_EMOTIONAL_DESING.md` generado para este mismo documento.  
> No es spec final. No contiene implementación. No fusiona con otros documentos.

---

## 1. Rol del módulo en la demo

### Información explícita encontrada

* Planner aparece en el archivo de comprensión como módulo del dominio `planner`.
* Planner se describe como **núcleo operativo**.
* Planner administra:
  * Tasks.
  * Calendar.
  * Goals.
  * Responsabilidades.
* Para este fragment, `Goals` queda fuera de desarrollo por alcance del prompt.
* El documento principal no define Planner como pantalla, pero sí define cómo deben sentirse y comportarse emocionalmente las tareas, el calendario y la carga de coordinación.
* El sistema debe reducir la carga cognitiva del coordinador: las cosas pasan sin que nadie tenga que sostenerlas en la cabeza.
* El sistema recuerda, organiza y anticipa.
* Cada miembro debe saber:
  * qué le toca;
  * qué hizo el resto;
  * cuál es el estado del hogar.
* Las tareas deben tener:
  * responsable visible;
  * estado claro.
* El sistema debe mostrar datos con contexto.
* El sistema debe dar información, no órdenes.
* El sistema debe evitar generar:
  * culpa acumulada;
  * presión social;
  * ansiedad por notificaciones;
  * sensación de juicio;
  * sensación de denuncia.

### Valor visible para demo

* El Planner puede mostrar coordinación operativa del hogar a través de tareas, responsables, estados, eventos y calendario.
* El valor visible más claro extraído de este documento es: **claridad operativa sin sobrecarga emocional**.
* El usuario debe poder ver tareas asignadas, estados y eventos sin sentir que la app lo acusa o lo presiona.

### Dependencias externas / no desarrollar en este fragment

* Home resume información de Planner mediante widgets o cards.
* People/Members aporta personas responsables o participantes.
* Geni puede intervenir sobre incumplimientos, pero Geni real queda fuera del fragment.
* Notificaciones afectan tareas/eventos, pero push real queda fuera del fragment.
* Se menciona información social de logros, pero no debe desarrollarse en este fragment.
* Inventory/Assets/Automations pueden generar tareas según el archivo de comprensión, pero no deben desarrollarse desde este fragment.

---

## 2. Información encontrada para las 7 condiciones MVP

### 2.1 Pantalla visualmente terminada

#### Elementos visuales explícitos o claramente presentes

* Planner está en Bottom Navigation.
* Bottom Navigation contiene:
  * Home;
  * People;
  * QuickActions;
  * Planner;
  * More.
* Calendar existe como feature dentro de Planner.
* Task existe como entidad dentro de Planner.
* Event existe como entidad dentro de Calendar.
* Responsibility existe como área operativa del hogar que agrupa tareas.
* Home contiene widgets relacionados con Planner:
  * `Widget_UpcomingEvents`.
  * `Widget_TasksByResponsibility`.
* Las tareas tienen responsable visible.
* Las tareas tienen estado claro.
* La información debe presentarse con contexto.
* La interfaz no debe reflejar complejidad interna.
* El Home nunca debe sentirse abrumador.
* Más de 4 niveles de navegación es considerado fallo; objetivo: 95% de acciones en 3 niveles o menos.

#### Elementos visuales mencionados sin estructura completa

* No se describe pantalla concreta de Planner.
* No se describen tabs de Planner.
* No se describen headers.
* No se describen cards de Task.
* No se describen formularios de creación/edición.
* No se describen filtros.
* No se describen vista día/semana/mes del calendario.
* No se describen estados visuales de loading, error o skeleton.

#### Señales útiles para UI demo sin inventar arquitectura

* La demo puede priorizar claridad visual:
  * tarea;
  * responsable;
  * estado;
  * agrupación por responsabilidad;
  * eventos próximos;
  * calendario simple;
  * acceso desde Bottom Navigation.
* El documento no da layout final, por lo que cualquier layout debe quedar para etapa posterior.

---

### 2.2 Datos creíbles

#### Datos explícitos encontrados

* Áreas/responsabilidades de ejemplo:
  * Compras.
  * Mascotas.
  * Limpieza.
* Contextos de carga elevada mencionados:
  * semana de exámenes;
  * día laboral cargado;
  * evento familiar significativo.
* Ejemplo textual de rendimiento presentado por Geni:
  * “Esta semana completaste 6 de 10 tareas. Tu mejor semana del mes fue la segunda, con 9 de 10.”
* Ejemplo de mensaje ante tareas sin resolver:
  * “Hay tareas sin resolver desde hace una semana. Puede ser un buen momento para hablar.”
* Ejemplo de consulta operativa de trabajo asignado:
  * “¿Qué tareas tengo hoy?”
* Entidades de datos extraídas del archivo de comprensión:
  * Task.
  * TaskTemplate.
  * TaskComment.
  * TaskAttachment.
  * TaskDependency.
  * TaskRecurrence.
  * TaskVerification.
  * Responsibility.
  * Calendar.
  * Event.
  * Streak.
  * ReducedLoadMode.
  * GeniEscalation.
* Estados de Task detectados en archivo de comprensión:
  * Pendiente.
  * En progreso.
  * Completada.
  * Cancelada.
* Regla detectada:
  * Vencida no es un estado de tarea; se calcula automáticamente.
* Estados de Event detectados en archivo de comprensión:
  * Programado.
  * Completado.
  * Cancelado.

#### Datos faltantes para demo

* No hay nombres de tareas concretas.
* No hay nombres de eventos concretos.
* No hay fechas concretas.
* No hay prioridades concretas.
* No hay nombres de miembros.
* No hay avatares.
* No hay labels de filtros.
* No hay textos de empty state.
* No hay microcopy de botones.

---

### 2.3 Acción interactiva

#### Acciones encontradas

| Acción | Evidencia encontrada | Clasificación |
| ------ | -------------------- | ------------- |
| Ver tareas asignadas | El documento menciona tareas asignadas y responsable visible. | REAL MÍNIMO / DEMO PREMIUM |
| Ver estado de tareas | El documento dice que las tareas tienen estado claro. | REAL MÍNIMO / DEMO PREMIUM |
| Ver tareas completadas | Memoria histórica registra tareas completadas. | POST_MVP si es historial; DEMO PREMIUM si es estado visible simple |
| Ver tareas de hoy | Aparece como consulta operativa: “¿Qué tareas tengo hoy?”. | DEMO PREMIUM |
| Completar tarea | Aparece como tarea completada y rendimiento por tareas completadas. | REAL MÍNIMO si la acción existe en MVP; este documento solo la menciona indirectamente |
| Asignar tarea compensatoria | Día 2 de escalada de Geni asigna tarea de compensación menor. | POST_MVP |
| Declarar modo carga reducida | Cualquier miembro puede declarar período más liviano. | POST_MVP |
| Aprobar carga reducida | Coordinador responde aprobar o proponer conversación. | POST_MVP |
| Proponer conversación | Opción del coordinador ante carga reducida. | POST_MVP |
| Ver historial de rendimiento | Miembro ve propio historial; coordinador puede ver historial de todos. | POST_MVP |
| Ver calendario como contexto de carga | Carga reducida se detecta por calendario. | POST_MVP / DEMO PREMIUM si solo se visualiza calendario |
| Ver eventos | Calendar contiene Event; Home contiene Upcoming Events. | REAL MÍNIMO / DEMO PREMIUM |

#### Acciones no encontradas explícitamente

* Crear tarea.
* Editar tarea.
* Eliminar tarea.
* Crear evento.
* Editar evento.
* Cancelar evento.
* Crear plantilla.
* Elegir prioridad.
* Filtrar tareas.
* Buscar tareas.
* Cambiar vista día/semana/mes.
* Arrastrar eventos.
* Ver detalle de evento.
* Ver detalle de tarea.

---

### 2.4 Feedback inmediato

#### Feedback / UX explícito o derivado directamente del documento

* Las tareas deben tener estado claro.
* Los datos deben presentarse con contexto.
* Geni no debe usar etiquetas evaluativas.
* El sistema debe evitar juicio, denuncia o humillación pública.
* Las faltas no deben exponerse públicamente.
* El sistema no debe notificar dos veces lo mismo.
* Las alertas de bajo impacto se agrupan en resúmenes.
* Ante incumplimientos, la secuencia de Geni da tiempo al miembro antes de involucrar al coordinador.
* Modo carga reducida:
  * si se aprueba: carga reducida o pausada sin penalización en racha;
  * si el coordinador propone conversación: el flujo normal continúa hasta que haya acuerdo.

#### Feedback útil para demo, sin asumir implementación final

* Estado visible de tarea.
* Cambio visible al completar una tarea.
* Mensaje de contexto no evaluativo.
* Resumen de progreso con números concretos.
* Evitar mensajes tipo “fallaste” o “rendimiento bajo”.

#### Feedback no encontrado

* Toast de success.
* Toast de error.
* Loading.
* Skeleton.
* Retry.
* Spinner.
* Error de red.
* Estado disabled.
* Empty state textual.
* Confirmación modal para completar tarea.
* Confirmación para cancelar evento.

---

### 2.5 Service aislado

#### Datos/acciones que el service podría exponer según información encontrada

* Listado de tareas asignadas.
* Estado de tareas.
* Responsable visible de tareas.
* Tareas completadas para datos de rendimiento.
* Responsabilidades que agrupan tareas.
* Eventos del calendario.
* Eventos próximos para Home.
* Tareas agrupadas por responsabilidad para Home.
* Detección de vencida como cálculo, no como estado persistente.

#### Integraciones detectadas

* Planner contiene Task.
* Planner contiene Calendar.
* Planner contiene Responsibility.
* Calendar contiene Event.
* Event tiene Person.
* Task asignada a Person.
* Task pertenece a Responsibility.
* Home contiene `Widget_UpcomingEvents`.
* Home contiene `Widget_TasksByResponsibility`.
* Bottom Navigation contiene Planner.

#### Service real / mock / local

* El documento no menciona services.
* No se encontraron nombres de funciones.
* No se encontraron endpoints.
* Para demo, lo extraído permite un service local/mock que alimente:
  * tareas;
  * estados;
  * responsables;
  * responsabilidades;
  * eventos próximos;
  * resumen de Home.
* Cualquier service concreto debe definirse en etapa posterior.

---

### 2.6 Navegación coherente

#### Navegación encontrada

* Bottom Navigation contiene Planner.
* Home es pantalla inicial y no puede cambiarse como punto de entrada.
* Home resume información; la administración ocurre en el módulo correspondiente.
* Bottom Navigation contiene Home, People, QuickActions, Planner y More.
* QuickActions contiene Geni.
* Geni no tiene tab dedicado en Bottom Nav.
* Más de 4 niveles de navegación es fallo; objetivo: 95% de acciones en 3 niveles o menos.

#### Navegación aplicable a Planner

* Entrada principal: Bottom Navigation → Planner.
* Relación con Home: Home resume tareas/eventos, pero no administra.
* Administración de tareas/eventos debe ocurrir en Planner.
* Dependencia externa / no desarrollar en este fragment: People/Members para responsables.
* Dependencia externa / no desarrollar en este fragment: Quick Actions/Geni como acceso contextual, no tab propio.

#### Navegación no encontrada

* No hay rutas específicas.
* No hay nombres de pantallas.
* No hay deep links.
* No hay navegación interna Planner → Task Detail.
* No hay navegación interna Planner → Event Detail.
* No hay modal de creación.

---

### 2.7 Conexión con Home o More

#### Home

* Home contiene `Widget_UpcomingEvents`.
* Home contiene `Widget_TasksByResponsibility`.
* Home resume información, no administra.
* La administración ocurre en el módulo correspondiente.
* Home nunca debe sentirse abrumador.
* La complejidad interna no debe reflejarse en la interfaz.
* Home es pantalla inicial.

#### More

* No se detectó que Planner viva en More.
* Planner vive en Bottom Navigation.
* More contiene Finance, Inventory, FamilyCloud y Settings.
* Settings vive exclusivamente en More.

#### Quick Actions

* QuickActions contiene Geni.
* Geni no tiene tab dedicado en Bottom Nav.
* No se encontró acción rápida explícita “crear tarea” o “crear evento” en este documento.
* Dependencia externa / no desarrollar en este fragment: Geni puede crear tareas en Planner según el archivo de comprensión, pero Geni real y automatizaciones reales quedan fuera.

---

## 3. Clasificación para implementación

### REAL MÍNIMO

Información aplicable como base mínima del Planner visual/interactivo:

* Planner existe como módulo de navegación principal.
* Planner está en Bottom Navigation.
* Planner contiene Tasks.
* Planner contiene Calendar.
* Planner contiene Responsabilidades.
* Calendar contiene Events.
* Task debe mostrar responsable visible.
* Task debe mostrar estado claro.
* Task puede estar asignada a Person.
* Task pertenece a Responsibility.
* Responsibility agrupa tareas.
* Responsibility puede tener múltiples miembros.
* Responsibility tiene ejemplos explícitos:
  * Compras;
  * Mascotas;
  * Limpieza.
* Event puede tener Person.
* Home puede mostrar próximos eventos.
* Home puede mostrar tareas agrupadas por responsabilidad.
* Home resume; Planner administra.
* Vencida no es un estado de tarea; se calcula automáticamente.
* La UI debe evitar complejidad interna.
* La navegación debe evitar profundidad excesiva.

### DEMO PREMIUM

Información útil para que Planner parezca completo sin backend perfecto:

* Mostrar resumen de rendimiento con datos concretos y sin juicio.
* Mostrar “tareas de hoy” como vista o sección si se usa la consulta textual encontrada.
* Mostrar estado visual simple de tareas.
* Mostrar responsables en tareas.
* Mostrar eventos próximos.
* Mostrar calendario simple como parte de Planner.
* Mostrar agrupación por responsabilidad.
* Mostrar contexto de carga elevada como dato visual:
  * semana de exámenes;
  * día laboral cargado;
  * evento familiar significativo.
* Mostrar mensaje no evaluativo cuando hay tareas sin resolver.
* Mostrar cambio visual inmediato al completar tarea.
* Mostrar Home con preview de eventos/tareas y navegación a Planner.

### LOCAL / ASYNCSTORAGE / MOCK SERVICE

Información que podría mantenerse en estado local o service mock para demo:

* Listado de tareas.
* Estados de tareas.
* Responsables visibles.
* Agrupación por responsabilidad.
* Eventos próximos.
* Eventos del calendario.
* Resumen numérico de tareas completadas.
* Cálculo local de “vencida”.
* Mensajes no evaluativos.
* Preview de Home basado en datos locales del Planner.

No se encontraron services ni endpoints explícitos.

### POST_MVP

Información encontrada pero no debe convertirse en obligación real para este MVP visual/interactivo:

* Streaks / rachas individuales y familiares.
* Recuperación de racha con resta de 5 días.
* current streak o historial avanzado de racha.
* Memoria histórica permanente de rendimiento.
* Modo carga reducida.
* Aprobación de modo carga reducida.
* Historial de activaciones de carga reducida.
* Escalada de Geni Día 1 a Día 4.
* Asignación automática de tarea compensatoria.
* Notificación automática al coordinador por incumplimientos.
* Geni real presentando rendimiento.
* Privacidad avanzada por módulo.
* Subtareas.
* Comentarios en tarea.
* Adjuntos en tarea.
* Dependencias entre tareas.
* Recurrencia avanzada de tareas.
* Automatizaciones reales que disparan tareas.
* Tareas generadas desde otros dominios.
* CalendarAutoAlbum generado desde evento.
* Participantes avanzados de eventos.
* Auditoría completa de cambios.

### IGNORAR

No desarrollar en este fragment:

* Módulos externos completos.
* IA real.
* Automatización real.
* Emergencia real.
* Ubicación/GPS real.
* Storage/OCR real.
* Finanzas reales.
* Inventario real.
* Activos reales.
* Nube documental real.
* Metas reales.
* Milestones reales.
* Offline sync.

---

## 4. UI extraíble

| Pantalla/Componente | Qué muestra | Acciones | Estados UX | Navegación | Clasificación |
| ------------------- | ----------- | -------- | ---------- | ---------- | ------------- |
| Planner en Bottom Navigation | Acceso principal al módulo Planner. | Abrir Planner. | No especificado. | Bottom Nav → Planner. | REAL MÍNIMO |
| Lista de tareas | Tareas asignadas, responsable visible, estado claro. | Ver tarea; completar si se toma como acción mínima por MVP posterior. | Estado claro; vencida calculada, no persistida como estado. | Planner. | REAL MÍNIMO / DEMO PREMIUM |
| Tareas por responsabilidad | Tareas agrupadas por áreas operativas del hogar. | Abrir grupo o tarea, no especificado. | No especificado. | Home preview → Planner; Planner. | REAL MÍNIMO / DEMO PREMIUM |
| Responsibility group/card | Área operativa: Compras, Mascotas, Limpieza. | No especificado. | No especificado. | Planner. | DEMO PREMIUM |
| Calendar dentro de Planner | Administración de eventos dentro de Planner. | Ver eventos; crear/editar no aparece explícito. | No especificado. | Planner → Calendar. | REAL MÍNIMO / DEMO PREMIUM |
| Eventos próximos | Eventos próximos expuestos en Home. | Abrir Planner/Calendar, no especificado. | No especificado. | Home → Planner/Calendar. | REAL MÍNIMO / DEMO PREMIUM |
| Home widget: UpcomingEvents | Resumen de próximos eventos. | Navegar al módulo correspondiente, no especificado. | Home no debe abrumar. | Home → Planner. | REAL MÍNIMO |
| Home widget: TasksByResponsibility | Resumen de tareas agrupadas por responsabilidad. | Navegar al módulo correspondiente, no especificado. | Home no administra. | Home → Planner. | REAL MÍNIMO |
| Rendimiento contextual | Datos concretos: “Esta semana completaste 6 de 10 tareas...” | Ver información; no se especifica acción. | Sin etiquetas evaluativas; con contexto. | Planner o Geni contextual. | POST_MVP / DEMO PREMIUM si es card mock |
| Carga reducida | Solicitud de período más liviano y respuesta del coordinador. | Declarar; aprobar; proponer conversación. | Sin juicio; no tribunal. | No especificado. | POST_MVP |
| Escalada por incumplimiento | Día 1–4 con recordatorio/compensación/aviso/notificación. | No especificado para UI directa. | Privado, progresivo, no acusatorio. | No especificado. | POST_MVP |
| Streak/racha | Racha individual/familiar. | Retomar cumplimiento. | Recuperación; evitar culpa acumulada. | No especificado. | POST_MVP |

---

## 5. Datos demo extraíbles

| Dato/ejemplo | Módulo | Uso posible | Fuente | Clasificación |
| ------------ | ------ | ----------- | ------ | ------------- |
| Compras | Planner / Responsibility | Categoría o grupo visual de tareas. | Archivo de comprensión, entidad Responsibility. | REAL MÍNIMO / DEMO PREMIUM |
| Mascotas | Planner / Responsibility | Categoría o grupo visual de tareas. | Archivo de comprensión, entidad Responsibility. | REAL MÍNIMO / DEMO PREMIUM |
| Limpieza | Planner / Responsibility | Categoría o grupo visual de tareas. | Archivo de comprensión, entidad Responsibility. | REAL MÍNIMO / DEMO PREMIUM |
| Pendiente | Task | Estado visible de tarea. | Archivo de comprensión, entidad Task. | REAL MÍNIMO |
| En progreso | Task | Estado visible de tarea. | Archivo de comprensión, entidad Task. | DEMO PREMIUM / posible POST_MVP si el merge define otros estados |
| Completada | Task | Estado visible de tarea completada. | Archivo de comprensión, entidad Task. | REAL MÍNIMO |
| Cancelada | Task | Estado visible si se soporta cancelar. | Archivo de comprensión, entidad Task. | DEMO PREMIUM / POST_MVP según recorte posterior |
| Vencida calculada | Task | Badge/calculado visual, no estado persistido. | Archivo de comprensión, business rule. | REAL MÍNIMO |
| Programado | Event | Estado visible de evento. | Archivo de comprensión, entidad Event. | REAL MÍNIMO / DEMO PREMIUM |
| Completado | Event | Estado visible de evento finalizado. | Archivo de comprensión, entidad Event. | DEMO PREMIUM |
| Cancelado | Event | Estado visible de evento cancelado. | Archivo de comprensión, entidad Event. | DEMO PREMIUM |
| “¿Qué tareas tengo hoy?” | Planner / Task | Texto de consulta o acceso contextual. | Documento principal, Empleado Familiar. | DEMO PREMIUM; dependencia externa de rol laboral no desarrollar |
| “Esta semana completaste 6 de 10 tareas. Tu mejor semana del mes fue la segunda, con 9 de 10.” | Planner / rendimiento | Card de rendimiento mock o mensaje contextual sin juicio. | Documento principal, Memoria histórica. | POST_MVP / DEMO PREMIUM mock |
| “Hay tareas sin resolver desde hace una semana. Puede ser un buen momento para hablar.” | Planner / incumplimiento | Mensaje contextual no acusatorio. | Documento principal, Escalada de Geni. | POST_MVP / DEMO PREMIUM mock |
| Semana de exámenes | Calendar / carga | Contexto visual de calendario o carga. | Documento principal, Calibración de carga por contexto. | POST_MVP / DEMO PREMIUM mock |
| Día laboral cargado | Calendar / carga | Contexto visual de calendario o carga. | Documento principal, Calibración de carga por contexto. | POST_MVP / DEMO PREMIUM mock |
| Evento familiar significativo | Calendar / carga | Contexto visual de calendario o carga. | Documento principal, Calibración de carga por contexto. | POST_MVP / DEMO PREMIUM mock |

### Datos que faltan para demo

* Títulos concretos de tareas.
* Títulos concretos de eventos.
* Fechas y horas concretas.
* Prioridades concretas.
* Responsables concretos.
* Avatares.
* Colores.
* Iconos.
* Labels de botones.
* Texto de estados vacíos.

---

## 6. Acciones extraíbles

| Acción | Usuario/Rol | Resultado visible | Real/Mock/Post-MVP | Fuente |
| ------ | ----------- | ----------------- | ------------------ | ------ |
| Abrir Planner | Usuario general | Entra al módulo desde Bottom Nav. | REAL MÍNIMO | Archivo de comprensión: BottomNavigation contiene Planner. |
| Ver tareas asignadas | Miembro | Sabe qué le toca. | REAL MÍNIMO / DEMO PREMIUM | Documento principal: claridad; tareas con responsable visible y estado claro. |
| Ver responsable de tarea | Miembro / hogar | Responsable visible en la tarea. | REAL MÍNIMO | Documento principal: Claridad. |
| Ver estado de tarea | Miembro / hogar | Estado claro de la tarea. | REAL MÍNIMO | Documento principal: Claridad. |
| Completar tarea | Miembro | Tarea aparece como completada; impacta rendimiento si se muestra. | DEMO PREMIUM; indirecto en documento | Documento principal: tareas completadas / memoria histórica. |
| Ver tareas completadas | Miembro | Rendimiento o historial. | POST_MVP / DEMO PREMIUM mock | Documento principal: memoria histórica. |
| Ver eventos próximos | Miembro / hogar | Próximos eventos visibles. | REAL MÍNIMO / DEMO PREMIUM | Archivo de comprensión: Home contiene UpcomingEvents; Calendar contiene Event. |
| Ver calendario | Miembro | Eventos en Calendar. | REAL MÍNIMO / DEMO PREMIUM | Archivo de comprensión: Calendar dentro de Planner. |
| Declarar período más liviano | Cualquier miembro | Solicitud al coordinador. | POST_MVP | Documento principal: Modo carga reducida. |
| Aprobar carga reducida | Coordinator | Carga reducida o pausada. | POST_MVP | Documento principal: Modo carga reducida. |
| Proponer conversación | Coordinator | Flujo continúa hasta acuerdo. | POST_MVP | Documento principal: Modo carga reducida. |
| Asignar tarea compensatoria | Geni | Tarea compensatoria menor. | POST_MVP | Documento principal: Escalada de Geni Día 2. |
| Notificar al coordinador por incumplimiento | Geni | Mensaje no acusatorio al coordinador. | POST_MVP | Documento principal: Escalada de Geni Día 4. |
| Ver datos de rendimiento | Miembro / Coordinator | Datos concretos con contexto. | POST_MVP / DEMO PREMIUM mock | Documento principal: Memoria histórica y visibilidad. |

---

## 7. Home / More / Quick Actions

### Home

* Home puede mostrar información proveniente de Planner mediante:
  * `Widget_UpcomingEvents`.
  * `Widget_TasksByResponsibility`.
* Home resume información, no administra.
* La administración debe ocurrir en Planner.
* Home es pantalla inicial.
* Home no debe sentirse abrumador.
* La complejidad interna no debe reflejarse en Home.
* Para demo, Planner puede exponer a Home:
  * próximos eventos;
  * tareas agrupadas por responsabilidad;
  * posiblemente tareas pendientes o vencidas calculadas, si el merge posterior lo permite.

### More

* Planner no vive en More según el archivo de comprensión.
* Planner vive en Bottom Navigation.
* More contiene otros módulos y Settings.
* No extraer More para Planner salvo esta aclaración.

### Quick Actions

* QuickActions contiene Geni.
* Geni no tiene tab dedicado en Bottom Nav.
* No se encontró acción rápida explícita de Planner.
* Dependencia externa / no desarrollar en este fragment:
  * Geni puede crear tareas en Planner según el archivo de comprensión.
  * Geni real queda fuera de este fragment.
  * Automatizaciones reales quedan fuera de este fragment.

---

## 8. Backend/API detectado

No se encontró contrato API explícito en este documento.

| Endpoint/Acción | Método | Ruta | Request | Response | Estado | Clasificación |
| --------------- | ------ | ---- | ------- | -------- | ------ | ------------- |
| Listar tareas | No especificado | No especificado | No especificado | No especificado | Acción/entidad mencionada sin contrato API | REAL MÍNIMO / DEMO PREMIUM |
| Completar tarea | No especificado | No especificado | No especificado | No especificado | Acción inferida indirectamente desde tareas completadas | DEMO PREMIUM / requiere validación |
| Listar eventos | No especificado | No especificado | No especificado | No especificado | Entidad mencionada sin contrato API | REAL MÍNIMO / DEMO PREMIUM |
| Exponer próximos eventos a Home | No especificado | No especificado | No especificado | No especificado | Relación mencionada sin contrato API | DEMO PREMIUM |
| Exponer tareas por responsabilidad a Home | No especificado | No especificado | No especificado | No especificado | Relación mencionada sin contrato API | DEMO PREMIUM |
| Declarar carga reducida | No especificado | No especificado | No especificado | No especificado | Flujo mencionado sin contrato API | POST_MVP |
| Aprobar carga reducida | No especificado | No especificado | No especificado | No especificado | Flujo mencionado sin contrato API | POST_MVP |
| Escalada de Geni por incumplimiento | No especificado | No especificado | No especificado | No especificado | Workflow mencionado sin contrato API | POST_MVP |

---

## 9. Modelo de datos detectado

| Entidad | Campo | Tipo si aparece | Estado/valores | Uso visual o interacción | Clasificación |
| ------- | ----- | --------------- | -------------- | ------------------------ | ------------- |
| Planner | contiene | no especificado | Task, Calendar, Responsibility, Goals | Estructura del módulo. | REAL MÍNIMO, excepto Goals fuera de este fragment |
| Task | estado | no especificado | Pendiente, En progreso, Completada, Cancelada | Badge/estado visual de tarea. | REAL MÍNIMO / DEMO PREMIUM; requiere merge con estados oficiales posteriores |
| Task | responsable | Person, tipo no especificado | Responsable visible | Mostrar asignado en card/lista. | REAL MÍNIMO |
| Task | vencida | calculado, tipo no especificado | No es estado persistente | Badge calculado por fecha o criterio posterior. | REAL MÍNIMO |
| Task | completed count / completadas | no especificado | cantidad de tareas completadas | Mensaje de rendimiento. | POST_MVP / DEMO PREMIUM mock |
| Task | template | TaskTemplate, tipo no especificado | Plantilla de tareas | No hay campos ni CRUD. | POST_MVP / requiere validación para templates MVP de otros documentos |
| Task | comment | TaskComment, tipo no especificado | Comentario | No desarrollar ahora. | POST_MVP |
| Task | attachment | TaskAttachment, tipo no especificado | imágenes, PDFs, archivos, audio | No desarrollar ahora. | POST_MVP |
| Task | dependency | TaskDependency, tipo no especificado | tarea previa bloquea dependiente | No desarrollar ahora. | POST_MVP |
| Task | recurrence | TaskRecurrence, tipo no especificado | genera nuevas instancias | No desarrollar ahora salvo merge posterior. | POST_MVP |
| Task | verification | TaskVerification, tipo no especificado | verificación opcional | No hay flujo ni estados en este documento. | POST_MVP / requiere validación |
| Responsibility | nombre/categoría | no especificado | Compras, Mascotas, Limpieza | Agrupar tareas. | REAL MÍNIMO / DEMO PREMIUM |
| Responsibility | miembros | Person, tipo no especificado | múltiples miembros | Mostrar responsables o grupo. | DEMO PREMIUM |
| Calendar | contiene | no especificado | Event | Estructura de calendario. | REAL MÍNIMO / DEMO PREMIUM |
| Event | estado | no especificado | Programado, Completado, Cancelado | Estado visible de evento. | DEMO PREMIUM |
| Event | participante/persona | Person, tipo no especificado | Person | Mostrar participante/responsable si aplica. | DEMO PREMIUM |
| Streak | días consecutivos | no especificado | individual / familiar | No desarrollar ahora. | POST_MVP |
| StreakRecovery | resta | número | resta de 5 días si retoma al día siguiente | No desarrollar ahora. | POST_MVP |
| ReducedLoadMode | solicitud | no especificado | período más liviano | No desarrollar ahora. | POST_MVP |
| ReducedLoadMode | aprobación | no especificado | aprobar / proponer conversación | No desarrollar ahora. | POST_MVP |
| GeniEscalation | día | no especificado | Día 1, Día 2, Día 3, Día 4 | No desarrollar ahora. | POST_MVP |

---

## 10. Edge cases / errores / estados vacíos

| Caso | Comportamiento esperado | Fuente | Clasificación |
| ---- | ----------------------- | ------ | ------------- |
| Tarea vencida | No tratar “vencida” como estado persistente; se calcula automáticamente. | Archivo de comprensión, business rule. | REAL MÍNIMO |
| Tareas sin resolver | Geni escala con tono de conversación, no denuncia. | Documento principal, Arquitectura de escalada de Geni. | POST_MVP |
| Incumplimiento Día 1 | Recordatorio privado y neutro al miembro. | Documento principal, Arquitectura de escalada de Geni. | POST_MVP |
| Incumplimiento Día 2 | Asignación automática de tarea compensatoria menor, sin aviso al coordinador. | Documento principal, Arquitectura de escalada de Geni. | POST_MVP |
| Incumplimiento Día 3 | Aviso al miembro: en 24 horas se notifica al coordinador si no hay acción. | Documento principal, Arquitectura de escalada de Geni. | POST_MVP |
| Incumplimiento Día 4 | Notificación al coordinador con mensaje de conversación. | Documento principal, Arquitectura de escalada de Geni. | POST_MVP |
| Racha rota | Si retoma al día siguiente, resta 5 días; si no, reinicio completo. | Documento principal, Mecánica de racha. | POST_MVP |
| Carga personal alta | La carga de tareas se reduce automáticamente según calendario. | Documento principal, Calibración de carga. | POST_MVP |
| Solicitud de carga reducida | Cualquier miembro puede declarar período más liviano; requiere respuesta del coordinador. | Documento principal, Modo carga reducida. | POST_MVP |
| Coordinador aprueba carga reducida | Carga se reduce o pausa sin penalización en racha. | Documento principal, Modo carga reducida. | POST_MVP |
| Coordinador propone conversación | El flujo normal continúa hasta acuerdo. | Documento principal, Modo carga reducida. | POST_MVP |
| Miembro fantasma | No exponer públicamente la ausencia; trabajo privado y conversación real. | Documento principal, edge case miembro fantasma. | POST_MVP |
| Conflicto activo entre miembros | El sistema no interfiere, no fuerza interacción, no expone un miembro frente al otro. | Documento principal, edge case conflicto. | CONTEXTO / restricción emocional |
| Nuevo miembro | Integración gradual con primera tarea visible. | Documento principal, edge case incorporación de miembro nuevo. | POST_MVP / dependencia externa de onboarding |
| Ansiedad por notificaciones | No notificar constantemente; bajo impacto agrupado; no repetir lo mismo. | Documento principal, ansiedad por notificaciones; archivo de comprensión. | POST_MVP / restricción UX |
| Estado vacío de tareas | No encontrado. | No aplica. | Información faltante |
| Error de completar tarea | No encontrado. | No aplica. | Información faltante |
| Error de evento | No encontrado. | No aplica. | Información faltante |
| Sin permisos para editar tarea/evento | No encontrado. | No aplica. | Información faltante |

---

## 11. Restricciones y prohibiciones detectadas

### Restricciones aplicables al Planner visual/interactivo

* Las tareas deben tener responsable visible.
* Las tareas deben tener estado claro.
* Los datos deben presentarse con contexto.
* El sistema da información, no órdenes.
* La complejidad interna no debe reflejarse en la interfaz.
* Home resume información; no administra.
* La administración ocurre en el módulo correspondiente.
* Planner vive en Bottom Navigation.
* Home es pantalla inicial.
* Más de 4 niveles de navegación es fallo.
* Objetivo: 95% de acciones en 3 niveles o menos.
* Vencida no es estado de tarea; se calcula automáticamente.
* Los módulos no deben comportarse como aplicaciones separadas.
* Todos los dominios deben poder relacionarse, pero no se deben desarrollar dominios externos en este fragment.
* Las acciones que afectan al hogar deben ser visibles y los cambios relevantes quedan registrados; auditoría completa no desarrollar ahora.
* Coordinación por encima de jerarquía: coordinadores administran el hogar, no la vida privada.
* Ningún rol obtiene acceso automático a memoria privada, metas privadas, documentos privados o finanzas personales.

### Restricciones emocionales relevantes

* No generar resentimiento, desgaste ni explosión.
* No generar culpa acumulada.
* No generar presión social.
* No generar ansiedad por notificaciones.
* No generar acusación, juicio, humillación pública ni sensación de denuncia.
* Los datos de rendimiento deben ser concretos, con contexto y sin etiquetas evaluativas.
* Los incumplimientos no deben exponerse públicamente.
* El sistema no debe notificar dos veces lo mismo.

### Fuera de scope explícito de esta sección

* Cómo el tono emocional se expresa visualmente en cada pantalla queda derivado a otra sección.
* Cómo Geni procesa contexto familiar queda derivado a otra sección.
* Cómo se diseña la pantalla de aprobación de carga reducida queda derivado a otra sección.
* Qué datos específicos se almacenan del historial y por cuánto tiempo queda derivado a otra sección.

---

## 12. Información faltante

| Falta | Por qué importa para Codex | Impacto |
| ----- | -------------------------- | ------- |
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
| Verification Flow MVP | Se menciona TaskVerification opcional, pero no se describen estados `pending`, `completed`, `awaiting_verification`, `verified`. | Alto |
| Estados oficiales del prompt | El archivo de comprensión trae estados distintos para Task. Requiere merge posterior. | Alto |
| Recurrencia simple de eventos | No aparecen `none`, `daily`, `weekly`, `monthly`. | Medio |
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

---

## 13. Fuente

### Archivo principal

* Archivo: `HomePlus — SECCION 4 EMOTIONAL DESING.md`
* Secciones utilizadas:
  * `Sobre esta sección`
  * `Principio central`
  * `Emociones objetivo / Calma`
  * `Emociones objetivo / Claridad`
  * `Emociones objetivo / Reconocimiento`
  * `Emociones objetivo / Control saludable`
  * `Emociones a evitar / Culpa acumulada`
  * `Emociones a evitar / Presión social dentro del hogar`
  * `Emociones a evitar / Ansiedad por notificaciones`
  * `Arquitectura de escalada de Geni`
  * `Mecánica de racha, culpa y recuperación`
  * `Rachas`
  * `Recuperación de racha`
  * `Calibración de carga por contexto`
  * `Modo carga reducida`
  * `Memoria histórica y visibilidad del rendimiento`
  * `Qué registra el sistema`
  * `Cómo presenta Geni el rendimiento`
  * `Visibilidad por rol`
  * `Edge cases emocionales / Miembro fantasma`
  * `Edge cases emocionales / Conflicto entre miembros`
  * `Edge cases emocionales / Incorporación de miembro nuevo`
  * `Tabla de decisiones — Emotional Design`
  * `Fuera del scope de esta sección`

### Archivo de comprensión asociado

* Archivo: `Seccion 4 Emotional Design.txt`
* Bloques utilizados:
  * `OUTPUT 1 — ENTITIES`
  * `OUTPUT 2 — RELATIONSHIPS`
  * `OUTPUT 3 — CROSS-DOMAIN RELATIONSHIPS`
  * `OUTPUT 4 — DATA FLOWS`
  * `OUTPUT 5 — BUSINESS RULES`
  * `OUTPUT 6 — ARCHITECTURAL DECISIONS`
  * `OUTPUT 8 — GRAPH EDGES`
* Entidades y relaciones usadas:
  * `Planner`
  * `Task`
  * `TaskTemplate`
  * `TaskComment`
  * `TaskAttachment`
  * `TaskDependency`
  * `TaskRecurrence`
  * `TaskVerification`
  * `Responsibility`
  * `Calendar`
  * `Event`
  * `Streak`
  * `ReducedLoadMode`
  * `GeniEscalation`
  * `Widget_UpcomingEvents`
  * `Widget_TasksByResponsibility`
  * `BottomNavigation → Planner`

### Source map usado

* Archivo: `source_map_HomePlus_SECCION_4_EMOTIONAL_DESING.md`
* Secciones consultadas:
  * `2. Resumen técnico del contenido`
  * `3. Índice de secciones relevantes`
  * `4.7 PLANNER`
  * `4.8 TASKS`
  * `4.9 EVENTS`
  * `4.10 CALENDAR`
  * `4.11 HOME`
  * `5. Mapa de entidades`
  * `6. Mapa de relaciones`
  * `7. Mapa de estados`
  * `11. Mapa de UI`
  * `13. Restricciones arquitectónicas detectadas`
  * `15. Información POST_MVP detectada`
  * `18. Información faltante`

---

## Nota de fidelidad

Este fragment contiene solamente información encontrada en este documento, su archivo de comprensión asociado y el source map generado para este mismo documento. No completa huecos, no inventa endpoints, no inventa campos, no define UI final y no convierte Post-MVP en MVP real.
