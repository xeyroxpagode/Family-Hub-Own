# PLANNER fragment — HomePlus — SECCION 2 PRINCIPIOS DEL PRODUCTO

## 1. Rol del módulo en la demo

Información explícita o claramente presente en este documento:

* Planner aparece como parte propia de cada Hogar: cada hogar tiene su propio Planner.
* Planner contiene al menos `Task`, `Calendar`, `Goal` y `Responsabilidad`, según el archivo de comprensión.
* Para este fragment se extrae solo lo relacionado con Planner visual/interactivo: tareas, eventos, calendario, responsabilidades, señales de vencimiento, navegación y conexión con Home.
* Tasks y Calendar están ubicados en funciones de uso diario. En la jerarquía de frecuencia del documento, `Home`, `Tasks` y `Calendar` aparecen en Tier 1 / Diario, ubicados en Bottom Nav o Home.
* El valor del módulo es hacer visible la realidad operativa del hogar: tareas pendientes, tareas vencidas, carga/asimetría de tareas, eventos familiares y conflictos de horarios.
* El documento marca que los compromisos compartidos son visibles: tareas asignadas, estado de tareas, calendario y eventos familiares.
* La experiencia debe priorizar datos concretos por encima de mensajes suaves. Ejemplos explícitos: “Tres tareas pendientes desde el lunes”, “Tres tareas completadas de ocho”, “2 de 8”, “87%”.
* El usuario no debe sentir que Planner oculta problemas para mantener la paz. El módulo debe mostrar tareas vencidas, tareas pendientes y métricas incómodas si existen.
* Geni puede sugerir acciones o presentar datos, pero no completa tareas automáticamente y no ejecuta acciones unilateralmente. Para este fragment, cualquier uso de Geni debe tratarse como dependencia externa / no desarrollar en este fragment.

Dependencias externas / no desarrollar en este fragment:

* Home: muestra resúmenes de Planner, pero Home no administra.
* People / Members: las personas pueden ser responsables de tareas o participantes de eventos.
* Household: Planner pertenece a un hogar.
* Notificaciones: aparecen como consecuencia de tareas próximas/vencidas o conflictos, pero no hay que implementar push real desde este fragment.
* Geni: aparece como capa de sugerencias, briefing y guardrails, pero no como IA real para este fragment.

---

## 2. Información encontrada para las 7 condiciones MVP

### 2.1 Pantalla visualmente terminada

Información visual extraíble:

* `Planner` como destino de navegación en Bottom Navigation: `[Home] [People] [+] [Planner] [More]`.
* `Tasks` y `Calendar` son funciones diarias: deben estar accesibles en navegación primaria o desde Home.
* Home muestra información de Planner en este orden relativo:
  * Atención Requerida: incluye tareas vencidas.
  * Próximos Eventos: agenda inmediata.
  * Tareas: agrupadas por Responsabilidad.
* Widget `WidgetPróximosEventos`: agenda inmediata.
* Widget `WidgetTareas`: tareas agrupadas por Responsabilidad; el archivo de comprensión indica que es dinámico y desaparece al completar.
* Home resume. Los módulos administran. Por lo tanto, desde Home se debe poder conducir al módulo Planner que administra tareas/eventos.
* El documento no define una pantalla propia de Task List, Create Task, Edit Task, Event Form ni Calendar View.
* El documento no define tabs internos concretos para Planner.
* El documento no define iconos concretos.
* El documento no define estados visuales detallados como skeleton, spinner, toast o snackbar.

Secciones/elementos visuales que sí se pueden extraer para demo:

* Header o entrada de Planner desde Bottom Nav.
* Bloque/lista de tareas.
* Agrupación visual por Responsabilidad.
* Indicador de tarea vencida.
* Indicador de tarea próxima a vencer.
* Indicador de tarea asignada/responsable.
* Lista o bloque de próximos eventos.
* Vista simple de calendario como parte de Planner, aunque el documento no define día/semana/mes.
* Acceso de Home hacia Planner desde tareas o próximos eventos.

### 2.2 Datos creíbles

Datos, frases o categorías presentes en documento/comprensión que pueden alimentar mock/demo data sin inventar:

* “Tres tareas pendientes desde el lunes”.
* “Tres tareas atrasadas en una semana”.
* “Tres tareas completadas de ocho”.
* “2 de 8”.
* “87%” de tareas sostenidas por un miembro.
* Tarea vencida.
* Tarea próxima a vencer.
* Tarea asignada.
* Tareas asignadas y estado visibles para todo el hogar.
* Calendario y eventos familiares visibles para todo el hogar.
* Próximos Eventos / agenda inmediata.
* Tareas agrupadas por Responsabilidad.
* Responsabilidades mencionadas en el archivo de comprensión: Compras, Mascotas, Limpieza, Vehículos.
* Documento o vencimiento próximo produce recordatorio.
* Conflicto de horarios por solapamiento detectado.
* Evento familiar o personal.
* Estados de Task en archivo de comprensión: Pendiente, En progreso, Completada, Cancelada.
* Vencida es calculado; no es estado de tarea.
* Estados de Evento en archivo de comprensión: Programado, Completado, Cancelado.
* No existe Postergado para eventos; postergar equivale a modificar fecha.

No se encontraron ejemplos concretos de tareas con título tipo “comprar leche” o “pagar luz”.

### 2.3 Acción interactiva

Acciones visibles o inferibles desde documento/comprensión, clasificadas sin inventar contratos:

* Completar tarea: REAL/LOCAL posible para demo. El documento afirma que Geni nunca completa tareas automáticamente y que la responsabilidad de completar es humana.
* Ver tareas asignadas y estado: REAL/LOCAL posible para demo.
* Ver tareas vencidas: REAL/LOCAL posible para demo, porque el documento exige mostrar tareas vencidas y métricas operativas.
* Ver tareas agrupadas por Responsabilidad: REAL/LOCAL posible para demo desde Home/Planner.
* Ver próximos eventos: REAL/LOCAL posible para demo.
* Ver calendario/eventos familiares: REAL/LOCAL posible para demo.
* Modificar fecha de evento: acción mencionada indirectamente, porque “postergar equivale a modificar fecha”. No hay UI ni API.
* Crear tareas: aparece como permiso de Adulto en archivo de comprensión. REAL/LOCAL posible para demo, sin contrato API.
* Reasignar tareas: aparece como permiso de Adulto en archivo de comprensión. REAL/LOCAL posible para demo, sin contrato API.
* Crear eventos: aparece como permiso de Adulto y Adolescente en archivo de comprensión. REAL/LOCAL posible para demo, sin contrato API.
* Geni sugiere recordatorio sobre tareas: DEMO/POST_MVP para este fragment, no IA real.
* Geni sugiere reorganización/redistribución ante patrón de tareas vencidas: DEMO/POST_MVP para este fragment, no IA real.
* Stock bajo puede sugerir crear tarea de compra: dependencia externa / no desarrollar en este fragment.
* Asset/Mantenimiento puede generar Task: dependencia externa / no desarrollar en este fragment.

### 2.4 Feedback inmediato

Señales de UX encontradas:

* Tarea asignada → notificación inmediata al responsable.
* Tarea próxima a vencer → recordatorio al responsable.
* Tarea vencida → notificación al responsable.
* Tarea vencida persistente → alerta al Coordinador.
* Patrón de tareas vencidas → sugerencia de reorganización o redistribución.
* Conflicto de horarios → alerta proactiva con sugerencia.
* Documento o vencimiento próximo → recordatorio.
* Regla de oro de notificaciones: si Geni interrumpe, el contenido debe justificar la interrupción.
* No notificar sobre cosas que el usuario no puede actuar inmediatamente.
* No notificar sobre insights interesantes pero no urgentes de forma repetitiva.
* No notificar sobre el mismo problema múltiples veces sin nueva información.
* El WidgetTareas del Home es dinámico y desaparece al completar, según el archivo de comprensión.

No encontrado:

* Toast de éxito.
* Toast de error.
* Skeleton.
* Spinner.
* Loading state.
* Retry.
* Empty state formal.
* Disabled state.
* Mensajes exactos de success/error para acciones de Planner.

### 2.5 Service aislado

Pistas encontradas para un service de Planner:

* Debe listar tareas, estados y vencimientos para mostrarlos en Planner/Home.
* Debe exponer tareas agrupadas por Responsabilidad.
* Debe exponer próximos eventos para Home.
* Debe exponer eventos familiares/personales para Calendar.
* Debe poder actualizar el estado de una Task cuando una persona la completa.
* Debe poder calcular `vencida` a partir del vencimiento, porque el documento indica que vencida no es estado, sino cálculo automático.
* Debe poder detectar, aunque sea de forma local/mock para demo, tareas próximas a vencer y tareas vencidas.
* Debe poder detectar, aunque sea de forma local/mock para demo, conflicto de horarios por solapamiento.
* Debe enviar datos a Home: Task completada → Home reorganiza widgets dinámicamente, según el archivo de comprensión.
* Debe entregar agenda inmediata / próximos eventos.
* No se encontró ningún `service` explícito de Planner.
* No se encontraron nombres de funciones.
* No se encontraron endpoints.
* No se encontró contrato request/response.

Clasificación sugerida por lo encontrado:

* Service aislado mock/local para demo: compatible con el documento.
* Backend real: no definido en esta fuente.

### 2.6 Navegación coherente

Navegación encontrada:

* BottomNavigation congelado V1: `[Home] [People] [+] [Planner] [More]`.
* Tasks y Calendar son Tier 1 / Diario, ubicados en Bottom Nav o Home.
* Home muestra tareas y próximos eventos, pero no administra; debe conducir al módulo que administra.
* Planner administra tareas, eventos y calendario.
* QuickActions existe como panel flotante desde `+`, con Geni fijo primero y acciones dinámicas por frecuencia.
* No se encontró una acción rápida explícita “crear tarea” o “crear evento” en este documento.
* No se encontró flujo pantalla a pantalla de Planner.
* No se encontraron deep links.
* No se encontró navegación desde More hacia Planner.

Dependencias externas / no desarrollar:

* Home puede abrir Planner desde widgets de tareas o próximos eventos.
* People puede proveer miembros/responsables para asignación.
* QuickActions existe, pero el documento no define acciones concretas de Planner dentro del panel.

### 2.7 Conexión con Home o More

### Home

Información encontrada:

* Home es centro operativo, resume información y no administra.
* Home debe conducir al módulo que administra cada información.
* Home tiene `Próximos Eventos` como agenda inmediata.
* Home tiene `Tareas` agrupadas por Responsabilidad.
* Home tiene `Atención Requerida`, donde aparecen tareas vencidas.
* Home puede reorganizar widgets dinámicamente cuando una tarea se completa, según archivo de comprensión.
* Home adaptado por rol:
  * Coordinador: visión completa del hogar.
  * Adulto: visión operativa.
  * Adolescente: más foco en tareas, eventos y coordinación.
  * Niño: experiencia simplificada.
  * Adulto Mayor: prioridad en personas, eventos, recordatorios y medicación.
  * Invitado: acceso mínimo.
  * Empleado Familiar: visión centrada en trabajo asignado. Dependencia externa / no desarrollar en este fragment.

### More

* No se encontró que Planner viva en More.
* No se encontró card/list item de More para Planner.

### Quick Actions

* QuickActions existe como panel flotante desde `+`.
* Geni aparece fijo siempre primero.
* Las acciones son dinámicas por frecuencia.
* No se encontró una acción rápida explícita para crear tarea o crear evento.

---

## 3. Clasificación para implementación

### REAL MÍNIMO

Extraíble como interacción real/local mínima del módulo:

* Ver lista de tareas.
* Ver estado de tareas.
* Ver tareas vencidas.
* Ver tareas próximas a vencer.
* Completar tarea manualmente.
* Ver tareas agrupadas por Responsabilidad.
* Ver próximos eventos.
* Ver calendario/eventos familiares.
* Ver conflicto de horarios como alerta conceptual/local si hay solapamiento.
* Ver Planner desde Bottom Nav.
* Abrir Planner desde Home a partir de `Tareas` o `Próximos Eventos`.
* Mostrar que tareas asignadas y estado son visibles para todo el hogar.
* Mostrar que calendario y eventos familiares son visibles para todo el hogar.
* Mantener `vencida` como cálculo, no como estado guardado, si se implementa lógica local.

### DEMO PREMIUM

Información útil para que Planner parezca completo sin backend real:

* Datos duros en cards: “3 tareas pendientes”, “3 completadas de 8”, “2 de 8”, “87%”.
* Card de tareas vencidas en Atención Requerida.
* Card de Próximos Eventos.
* Agrupación por Responsabilidad: Compras, Mascotas, Limpieza, Vehículos.
* Sugerencia visible tipo Geni para patrón de tareas vencidas, sin IA real.
* Alerta visual de conflicto de horarios, sin motor real complejo.
* Feedback local al completar una tarea: el widget/lista se reorganiza o desaparece si no quedan tareas.
* Recordatorio local/mock de tarea próxima a vencer.
* Alerta local/mock de tarea vencida persistente al Coordinador.

### LOCAL / ASYNCSTORAGE / MOCK SERVICE

Información que podría vivir como estado local o mock service en demo:

* Tasks mock/locales.
* Eventos mock/locales.
* Responsabilidades mock/locales usando categorías encontradas.
* Estado de completado de tarea.
* Cálculo local de tarea vencida.
* Cálculo local de tarea próxima a vencer.
* Próximos eventos para Home.
* Reorganización local de Home cuando se completa una tarea.
* Detección simple de solapamiento de eventos como demo local.
* Mensajes/sugerencias de Geni como texto fijo/mock.

### POST_MVP

Información valiosa, pero no implementable ahora como backend real desde este fragment:

* Geni real que detecta patrones.
* Geni real que sugiere reorganización o redistribución.
* Automatizaciones permanentes.
* Notificaciones push/email/in-app reales.
* Auditoría completa.
* Timeline de tareas.
* Comentarios de tareas.
* Adjuntos de tareas.
* Subtareas.
* Dependencias de tareas.
* Recurrencia avanzada.
* Goals / Hitos / progreso de metas.
* Evento que genera Recuerdo automáticamente.
* Participantes heredados para recuerdos.
* Presence/Lugar/geocerca relacionado con eventos.
* Offline sync completo.

### IGNORAR

No desarrollar como parte de este fragment:

* Implementación real de módulos externos que solo generan o consumen tareas/eventos.
* Backend real de IA, automatizaciones, notificaciones, auditoría, storage, offline o ubicación.

---

## 4. UI extraíble

| Pantalla/Componente | Qué muestra | Acciones | Estados UX | Navegación | Clasificación |
| ------------------- | ----------- | -------- | ---------- | ---------- | ------------- |
| Planner en Bottom Nav | Entrada principal a Planner | Abrir Planner | No especificado | `[Home] [People] [+] [Planner] [More]` | REAL MÍNIMO |
| Tasks / Lista de tareas | Tareas asignadas, estados, vencimientos | Ver / completar / posiblemente crear o reasignar si se toma permiso de Adulto | Vencida, próxima a vencer, completada | Desde Planner; desde Home por widget Tareas | REAL MÍNIMO |
| Tareas agrupadas por Responsabilidad | Agrupación de tareas por área operativa | Ver grupo / completar tarea | Widget dinámico; desaparece al completar según comprensión | Home conduce a Planner | REAL MÍNIMO / DEMO PREMIUM |
| Atención Requerida — tareas vencidas | Tareas vencidas como elemento urgente | Abrir detalle o Planner | Alerta/urgente conceptual | Desde Home hacia Planner | DEMO PREMIUM |
| Próximos Eventos | Agenda inmediata | Ver evento / abrir Calendar | No especificado | Desde Home hacia Calendar/Planner | REAL MÍNIMO |
| Calendar | Eventos familiares/personales | Ver eventos; crear evento según permisos encontrados | Conflicto de horarios conceptual | Planner / Bottom Nav | REAL MÍNIMO |
| Alerta de conflicto de horarios | Solapamiento detectado | Ver sugerencia | Alerta proactiva con sugerencia | Dentro de Calendar/Planner o Home | DEMO PREMIUM |
| QuickActions panel | Panel desde `+`; Geni fijo primero; acciones dinámicas | No se encontró acción Planner explícita | No especificado | Desde botón `+` | Dependencia externa / no desarrollar |
| Home widgets de Planner | Tareas, tareas vencidas y próximos eventos | Abrir módulo administrador | Reorganización al completar tarea según comprensión | Home → Planner | DEMO PREMIUM |

---

## 5. Datos demo extraíbles

| Dato/ejemplo | Módulo | Uso posible | Fuente | Clasificación |
| ------------ | ------ | ----------- | ------ | ------------- |
| “Tres tareas pendientes desde el lunes” | Planner / Tasks | Texto de card, briefing mock o resumen de tareas | Documento principal > Principio 2 | DEMO PREMIUM |
| “Tres tareas atrasadas en una semana” | Planner / Tasks | Patrón de tareas vencidas | Documento principal > Principio 2 | DEMO PREMIUM |
| “Tres tareas completadas de ocho” | Planner / Tasks | Métrica de progreso dura | Documento principal > Prioridades arquitectónicas | DEMO PREMIUM |
| “2 de 8” | Planner / Tasks | Métrica visual de completado | Documento principal > Qué nunca hacemos | DEMO PREMIUM |
| “87%” | Planner / Tasks / Carga | Métrica de asimetría/carga | Documento principal > Principio 1 | DEMO PREMIUM |
| Tarea asignada | Planner / Tasks | Estado/trigger visual | Documento principal > Principio 5 | REAL MÍNIMO |
| Tarea próxima a vencer | Planner / Tasks | Badge/alerta local | Documento principal > Principio 5 | REAL MÍNIMO |
| Tarea vencida | Planner / Tasks | Badge/alerta/card urgente | Documento principal > Principio 1 y 5 | REAL MÍNIMO |
| Tareas agrupadas por Responsabilidad | Planner / Tasks | Secciones de lista | Documento principal > Principio 6 / comprensión | REAL MÍNIMO |
| Compras | Planner / Responsabilidad | Categoría/grupo visual | Archivo de comprensión > Responsabilidad | DEMO PREMIUM |
| Mascotas | Planner / Responsabilidad | Categoría/grupo visual | Archivo de comprensión > Responsabilidad | DEMO PREMIUM |
| Limpieza | Planner / Responsabilidad | Categoría/grupo visual | Archivo de comprensión > Responsabilidad | DEMO PREMIUM |
| Vehículos | Planner / Responsabilidad | Categoría/grupo visual | Archivo de comprensión > Responsabilidad | DEMO PREMIUM |
| Próximos Eventos | Planner / Calendar | Card Home / lista Planner | Documento principal > Principio 6 | REAL MÍNIMO |
| Agenda inmediata | Planner / Calendar | Label de widget | Documento principal > Principio 6 | REAL MÍNIMO |
| Conflicto de horarios | Planner / Calendar | Alerta por solapamiento | Documento principal > Principio 5 | DEMO PREMIUM |
| Programado | Planner / Evento | Estado de evento | Archivo de comprensión > Evento | REAL MÍNIMO |
| Completado | Planner / Evento | Estado de evento | Archivo de comprensión > Evento | REAL MÍNIMO |
| Cancelado | Planner / Evento | Estado de evento | Archivo de comprensión > Evento | REAL MÍNIMO |
| Pendiente | Planner / Task | Estado de tarea encontrado | Archivo de comprensión > Task | REAL MÍNIMO |
| En progreso | Planner / Task | Estado de tarea encontrado | Archivo de comprensión > Task | REAL MÍNIMO |
| Completada | Planner / Task | Estado de tarea encontrado | Archivo de comprensión > Task | REAL MÍNIMO |
| Cancelada | Planner / Task | Estado de tarea encontrado | Archivo de comprensión > Task | REAL MÍNIMO |

---

## 6. Acciones extraíbles

| Acción | Usuario/Rol | Resultado visible | Real/Mock/Post-MVP | Fuente |
| ------ | ----------- | ----------------- | ------------------ | ------ |
| Ver tareas asignadas y estado | Todo el hogar según visibilidad compartida | Lista/cards de tareas visibles | REAL MÍNIMO | Documento principal > Principio 4 |
| Completar tarea | Humano / responsable no especificado | Tarea pasa a completada; Home puede reorganizar widgets | REAL MÍNIMO / LOCAL | Documento principal > Principio 2; comprensión > data flow Task completada → Home |
| Crear tarea | Adulto | Nueva tarea visible | REAL MÍNIMO / LOCAL, sin API | Archivo de comprensión > reglas de rol Adulto |
| Reasignar tarea | Adulto | Responsable cambiado | REAL MÍNIMO / LOCAL, sin API | Archivo de comprensión > reglas de rol Adulto |
| Ver tarea próxima a vencer | Responsable | Recordatorio/badge | DEMO PREMIUM / MOCK | Documento principal > Principio 5 |
| Ver tarea vencida | Responsable / Coordinador si persiste | Notificación/alerta/card urgente | DEMO PREMIUM / MOCK | Documento principal > Principio 5 |
| Ver patrón de tareas vencidas | No especificado | Sugerencia de reorganización/redistribución | POST_MVP / DEMO MOCK | Documento principal > Principio 5 |
| Crear evento | Adulto / Adolescente según comprensión | Nuevo evento visible | REAL MÍNIMO / LOCAL, sin API | Archivo de comprensión > roles Adulto y Adolescente |
| Ver calendario/eventos familiares | Todo el hogar según visibilidad compartida | Lista/calendario de eventos | REAL MÍNIMO | Documento principal > Principio 4 |
| Modificar fecha de evento | Usuario no especificado | Evento cambia fecha; no existe “postergado” | REAL MÍNIMO / LOCAL, sin API | Archivo de comprensión > regla Evento |
| Ver conflicto de horarios | Usuario no especificado | Alerta proactiva con sugerencia | DEMO PREMIUM / MOCK | Documento principal > Principio 5 |
| Geni sugiere recordar tarea | Usuario con patrón de revisión o tarea ajena | Mensaje de sugerencia, sin acción automática | DEMO PREMIUM / POST_MVP | Documento principal > Principio 2 y 7 |

---

## 7. Home / More / Quick Actions

### Home

* Puede mostrar tareas vencidas en `Atención Requerida`.
* Puede mostrar `Próximos Eventos` como agenda inmediata.
* Puede mostrar `Tareas` agrupadas por Responsabilidad.
* Puede conducir desde cada bloque al módulo Planner, porque Home resume y los módulos administran.
* Puede reorganizarse dinámicamente cuando una Task se completa, según archivo de comprensión.
* Puede adaptar foco por rol:
  * Adolescente: más foco en tareas, eventos y coordinación.
  * Adulto Mayor: prioridad en eventos, recordatorios y medicación.
  * Empleado Familiar: trabajo asignado; dependencia externa / no desarrollar en este fragment.

### More

* No se encontró relación de Planner con More.
* Planner no aparece como módulo de More en esta fuente.

### Quick Actions

* Existe `+` como panel flotante de QuickActions.
* Geni fijo siempre primero.
* Acciones dinámicas por frecuencia.
* No se encontró acción rápida explícita para Planner.
* Cualquier Quick Action de crear tarea/evento sería una decisión posterior, no extraída de este documento.

---

## 8. Backend/API detectado

No se encontró contrato API explícito en este documento.

| Endpoint/Acción | Método | Ruta | Request | Response | Estado | Clasificación |
| --------------- | ------ | ---- | ------- | -------- | ------ | ------------- |
| Crear tarea | No especificado | No especificado | No especificado | No especificado | Acción mencionada sin contrato API | REAL MÍNIMO / LOCAL |
| Reasignar tarea | No especificado | No especificado | No especificado | No especificado | Acción mencionada sin contrato API | REAL MÍNIMO / LOCAL |
| Completar tarea | No especificado | No especificado | No especificado | No especificado | Acción conceptual; responsabilidad humana | REAL MÍNIMO / LOCAL |
| Listar/ver tareas | No especificado | No especificado | No especificado | No especificado | Acción visual inferida por visibilidad de tareas | REAL MÍNIMO / LOCAL |
| Crear evento | No especificado | No especificado | No especificado | No especificado | Acción mencionada sin contrato API | REAL MÍNIMO / LOCAL |
| Modificar fecha de evento | No especificado | No especificado | No especificado | No especificado | Acción mencionada sin contrato API | REAL MÍNIMO / LOCAL |
| Ver calendario/eventos | No especificado | No especificado | No especificado | No especificado | Acción visual inferida por visibilidad de calendario | REAL MÍNIMO / LOCAL |

---

## 9. Modelo de datos detectado

| Entidad | Campo | Tipo si aparece | Estado/valores | Uso visual o interacción | Clasificación |
| ------- | ----- | --------------- | -------------- | ------------------------ | ------------- |
| Planner | contiene | no especificado | Task, Calendar, Goal, Responsabilidad | Estructura del módulo | REAL MÍNIMO con Goal fuera de este fragment |
| Task | estado | no especificado | Pendiente, En progreso, Completada, Cancelada | Badge, filtro o estado visual | REAL MÍNIMO |
| Task | vencida | calculado / no especificado | Vencida no es estado | Badge/alerta visual | REAL MÍNIMO |
| Task | vencimiento | no especificado | próxima a vencer, vencida | Recordatorios/alertas | REAL MÍNIMO |
| Task | responsable | no especificado | responsable no tipado | Asignación/notificación | REAL MÍNIMO |
| Task | responsabilidad principal | no especificado | única responsabilidad principal | Agrupación visual | REAL MÍNIMO |
| Task | requiere verificación | no especificado | opcional | Flujo de verificación; contradicción con estados MVP de otros prompts | POST_MVP / requiere definición |
| Task | recurrencia | no especificado | genera nuevas instancias | No reutiliza misma tarea | POST_MVP |
| Task | dependencia | no especificado | depende de otra Task | Bloqueo si previa no completa | POST_MVP |
| Task | subtareas | no especificado | único nivel | Progreso automático | POST_MVP |
| Task | comentarios | no especificado | ComentarioTask | Comentarios | POST_MVP |
| Task | adjuntos | no especificado | imágenes, PDFs, archivos, audio | Evidencia/archivos | POST_MVP |
| Task | timeline | no especificado | creación, cambios de responsable, fechas, completado, comentarios | Historial visual | POST_MVP |
| Responsabilidad | nombre/categoría | no especificado | Compras, Mascotas, Limpieza, Vehículos | Agrupar tareas | REAL MÍNIMO / DEMO PREMIUM |
| Plantilla de Tarea | no especificado | no especificado | Plantillas predefinidas | Base de tareas prearmadas; fuente no da campos | DEMO PREMIUM / requiere definición |
| Calendar | administración | módulo | eventos familiares/personales | Pantalla calendario/lista eventos | REAL MÍNIMO |
| Evento | estado | no especificado | Programado, Completado, Cancelado | Badge/estado visual | REAL MÍNIMO |
| Evento | fecha | no especificado | modificar fecha = postergar | Orden/calendario | REAL MÍNIMO |
| Evento | participantes | no especificado | Persona participa en Evento | Avatares/lista de participantes | REAL MÍNIMO / parcial |
| Evento | lugar | no especificado | relación con Lugar | Integración externa | POST_MVP |
| Home | WidgetPróximosEventos | Screen | agenda inmediata | Card/resumen | DEMO PREMIUM |
| Home | WidgetTareas | Screen | tareas agrupadas por Responsabilidad | Card/lista dinámica | DEMO PREMIUM |
| Notificación | categoría | no especificado | Planner, Calendar | Alertas de tareas/eventos | MOCK / POST_MVP |

---

## 10. Edge cases / errores / estados vacíos

| Caso | Comportamiento esperado | Fuente | Clasificación |
| ---- | ----------------------- | ------ | ------------- |
| Tarea vencida | Mostrarla; no suavizarla; notificar al responsable | Documento principal > Principio 1 y 5 | REAL MÍNIMO / DEMO |
| Tarea vencida persistente | Alertar al Coordinador si la situación persiste | Documento principal > Principio 5 | DEMO PREMIUM |
| Patrón de tareas vencidas | Geni sugiere reorganización o redistribución | Documento principal > Principio 5 | POST_MVP / DEMO MOCK |
| Tarea próxima a vencer | Recordatorio al responsable | Documento principal > Principio 5 | DEMO PREMIUM |
| Tarea asignada | Notificación inmediata al responsable | Documento principal > Principio 5 | DEMO PREMIUM |
| Geni intenta completar tarea | No permitido; Geni nunca completa tareas automáticamente | Documento principal > Principio 2 | Restricción REAL |
| Tarea completada | Home puede reorganizar widgets dinámicamente | Archivo de comprensión > data flow | DEMO PREMIUM |
| Vencida como estado persistido | No corresponde; vencida es calculado | Archivo de comprensión > reglas de negocio | Restricción REAL |
| Evento postergado | No existe estado Postergado; postergar equivale a modificar fecha | Archivo de comprensión > regla de Evento | Restricción REAL |
| Conflicto de horarios | Alerta proactiva con sugerencia | Documento principal > Principio 5 | DEMO PREMIUM |
| Notificación no accionable | No debe notificarse | Documento principal > Principio 5 | Restricción REAL |
| Notificación repetida sin nueva información | No debe notificarse | Documento principal > Principio 5 | Restricción REAL |
| Miembro completamente invisible para coordinación | No permitido para compromisos compartidos como tareas/eventos | Documento principal > Principio 4 / líneas rojas | Restricción REAL |
| Sin conexión | Lectura de tareas/eventos y completar tareas aparece como capacidad offline limitada, pero offline sync real queda fuera | Documento principal > tradeoff offline | POST_MVP / fuera del fragment |

Estados vacíos:

* No se encontró empty state formal para Planner, Tasks, Events o Calendar.
* No se encontró pantalla “sin tareas”.
* No se encontró pantalla “sin eventos”.

Errores:

* No se encontraron mensajes de error específicos.
* No se encontraron errores de permisos para Planner.
* No se encontraron errores de API.

---

## 11. Restricciones y prohibiciones detectadas

* No ocultar asimetrías de carga.
* No suavizar patrones problemáticos.
* No eufemizar métricas incómodas.
* No permitir que el Coordinador desactive la visibilidad de datos de coordinación compartida.
* Tareas asignadas y estado son visibles para todo el hogar.
* Calendario y eventos familiares son visibles para todo el hogar.
* Compromisos compartidos son visibles por defecto.
* Geni presenta datos, no juicios.
* Geni sugiere acciones, no las ejecuta unilateralmente.
* Geni nunca completa tareas automáticamente.
* Geni no resuelve tareas por nadie.
* Geni no manda mensajes en nombre de un miembro a otro sin permiso explícito.
* Geni no crea automatizaciones permanentes sin aprobación humana.
* Si Geni interrumpe, el contenido debe justificar la interrupción.
* No notificar sobre cosas que el usuario no puede actuar inmediatamente.
* No notificar repetidamente sobre el mismo problema sin información nueva.
* Home no administra; Home resume y conduce al módulo administrador.
* Tasks y Calendar deben estar priorizados por frecuencia de uso diaria.
* Cada hogar tiene su propio Planner; datos de un hogar no filtran hacia otro.
* Vencida no es estado de Task; se calcula automáticamente.
* Una tarea posee una única responsabilidad principal.
* No existe Postergado para eventos; postergar equivale a modificar fecha.
* Las tareas con verificación tienen información contradictoria: la fuente dice que no existe un estado separado, pero otros prompts de MVP pueden exigir estados separados. No resolver en este fragment.

---

## 12. Información faltante

| Falta | Por qué importa para Codex | Impacto |
| ----- | -------------------------- | ------- |
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
| Recurrencia simple | No aparece `none/daily/weekly/monthly` en esta fuente | No extraer como dato encontrado |
| Feedback de éxito/error | No hay toast, loading, error o success copy | Codex deberá usar defaults en etapa posterior si se decide |
| Empty states | No hay estados vacíos explícitos | Falta para demo pulida |
| Criterio de “completado” de evento | Estados existen, pero no flujo | No cerrar comportamiento |
| Integración real con Home | Hay regla conceptual, pero no contrato de props/service | Requiere definición posterior |

---

## 13. Fuente

Archivo principal:

* `HomePlus — SECCION 2 PRINCIPIOS DEL PRODUCTO.md`

Secciones usadas:

* `DECISIONES FUNDACIONALES`
* `PRINCIPIOS RECTORES`
* `1. La verdad primero, el confort después`
* `2. Geni no reemplaza conversaciones. Las hace inevitables.`
* `4. Privacidad no es opacidad`
* `5. Proactividad calibrada. No notificación constante.`
* `6. Priorización por frecuencia de uso. No por complejidad técnica.`
* `7. Datos accesibles. Geni interviene cuando detecta patrones problemáticos.`
* `PRIORIDADES ARQUITECTÓNICAS`
* `TRADEOFFS ACEPTADOS`
* `Qué nunca hacemos`, cuando aparece como líneas rojas sobre tareas, Home, visibilidad y Geni.

Archivo de comprensión asociado:

* `Seccion 2 Principios de producto.txt`

Secciones usadas:

* `OUTPUT 1 — ENTITIES`
* `OUTPUT 2 — RELATIONSHIPS`
* `OUTPUT 3 — CROSS DOMAIN RELATIONSHIPS`
* `OUTPUT 4 — DATA FLOWS`
* `OUTPUT 5 — BUSINESS RULES`
* `OUTPUT 6 — ARCHITECTURAL DECISIONS`
* `OUTPUT 7 — MISSING OR IMPLIED CONNECTIONS`, solo cuando afecta directamente Planner y marcada como dependencia externa o POST_MVP.
* `OUTPUT 8 — GRAPH EDGES`, solo como confirmación de relaciones.

Source map usado:

* `source_map_HomePlus_SECCION_2_PRINCIPIOS_DEL_PRODUCTO.md`

Secciones usadas:

* `4.7 PLANNER`
* `4.8 TASKS`
* `4.9 EVENTS`
* `4.10 CALENDAR`
* `4.11 HOME`, solo para conexión directa con Planner.
* `5. Mapa de entidades`, solo entidades de Planner y dependencias directas.
* `6. Mapa de relaciones`, solo relaciones de Planner y dependencias directas.
* `7. Mapa de estados`, solo estados de Task/Event/Verification.
* `8. Mapa de permisos`, solo permisos que afectan tareas/eventos.
* `9. Mapa de flujos`, solo flujos de Planner.
* `10. Mapa de APIs`, para confirmar ausencia de contratos explícitos.
* `11. Mapa de UI`, solo UI de Planner/Home relacionada.
* `13. Restricciones arquitectónicas detectadas`, solo restricciones que afectan Planner.
