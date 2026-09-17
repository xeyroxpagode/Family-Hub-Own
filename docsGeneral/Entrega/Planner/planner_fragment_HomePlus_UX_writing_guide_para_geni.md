# PLANNER fragment — HomePlus UX writing guide para geni

> Fragment crudo de implementación visual/interactiva extraído únicamente de:
>
> * Documento principal: `HomePlus — UX writing guide para geni(1).md`
> * Archivo de comprensión asociado: `UX writing guide para geni(1).txt`
> * Source map previo del mismo documento: `source_map_HomePlus_UX_writing_guide_para_geni.md`
>
> Módulo solicitado: **PLANNER**.
>
> No es spec final. No fusiona con otros documentos. No completa huecos.

---

## 1. Rol del módulo en la demo

### Información explícita encontrada

* `Planner` aparece como núcleo operativo que administra `Tasks`, `Calendar`, `Goals` y `Responsabilidades`.
* Para este fragment, `Goals` queda fuera de implementación MVP/demo del módulo solicitado y se clasifica como POST_MVP.
* `Task` representa trabajo pendiente o realizado.
* `Calendar` aparece como feature dentro de Planner y administra eventos.
* `Event` aparece como evento de calendario.
* Planner se conecta visualmente con Home mediante:
  * tareas pendientes;
  * tareas vencidas;
  * próximos eventos;
  * briefing/resumen de tareas y eventos;
  * widgets de tareas y próximos eventos;
  * atención requerida agregada desde tareas vencidas.
* El valor visible del módulo es coordinación familiar operativa: tareas, responsables, fechas, eventos, pendientes, vencimientos y conflictos de horario.
* El tono del módulo debe presentar hechos sin juicio, con acciones sugeridas y puerta de salida.

### Dependencias externas / no desarrollar en este fragment

* **Home:** muestra resúmenes de tareas/eventos y conduce al módulo que administra cada dato. No desarrollar Home completo.
* **People / Members:** aporta personas responsables y participantes. No desarrollar gestión de miembros.
* **Geni:** aporta microcopy, sugerencias y escalamiento. Para esta demo no implementar IA real.
* **Notifications:** aparecen recordatorios y avisos, pero no implementar push real.
* **Quick Actions:** aparece como acceso transversal, pero no hay acción explícita de crear tarea/evento en este documento.
* **Automatizaciones:** Planner puede disparar o ser leído por automatizaciones en archivo asociado, pero no implementar automatizaciones reales.

---

## 2. Información encontrada para las 7 condiciones MVP

### 2.1 Pantalla visualmente terminada

#### Pantallas / zonas detectadas o inferibles desde el documento

* **Planner** como destino en Bottom Nav.
* **Calendar** dentro de Planner.
* **Task list / lista de tareas**: no aparece como pantalla detallada, pero sí como entidad visible en Home y en notificaciones.
* **Event list / próximos eventos**: no aparece como pantalla detallada, pero sí como `WidgetPróximosEventos` y `Calendar`.
* **Home widgets conectados a Planner**:
  * `WidgetTareas`.
  * `WidgetPróximosEventos`.
  * `WidgetAtenciónRequerida` agregando tareas vencidas.
  * `WidgetCargaFamiliar` analizando tareas, solo visible al Coordinador según documento, pero para MVP visual debe tratarse como mock/dummy si se usa.

#### Componentes visuales extraíbles

* Cards/list rows de tareas con:
  * estado;
  * responsable;
  * fecha;
  * prioridad si se usa desde data flow, aunque el modelo formal no la define como campo tipado;
  * vencimiento calculado;
  * copy contextual.
* Cards/list rows de eventos con:
  * fecha;
  * hora;
  * participantes;
  * estado;
  * tipo `Familiar` o `Personal`.
* Empty states:
  * `Sin tareas asignadas`: “No tenés tareas pendientes. Cuando te asignen una, aparece acá.”
  * `Sin eventos próximos`: “Calendario libre por ahora. ¿Agregamos un evento?”
* Estados visibles para tareas:
  * pendiente;
  * completada;
  * vencida como condición calculada, no estado persistido;
  * bloqueada por dependencia, si se muestra como POST_MVP/demo no real;
  * requiere verificación, si se usa como estado visual derivado de `Verificación`.
* Estados visibles para eventos:
  * programado;
  * completado;
  * cancelado;
  * postergado no existe como estado; postergar equivale a modificar fecha.
* Copy de notificaciones/tarjetas:
  * tarea simple: “Luca, mañana te toca sacar el reciclaje antes de las 8.”
  * tarea con dependencia: “Mati, la reunión del cole es mañana a las 17. ¿Tenés los papeles listos?”
  * tarea recurrente: “Martes de compras. ¿Mantienen la lista de siempre?”
  * tarea vencida día 1: “Luca, tenés una tarea pendiente desde ayer. ¿La revisás hoy?”
  * tarea vencida día 3: “Luca, tu tarea sigue pendiente desde el lunes. ¿Necesitás ayuda para completarla?”
  * tarea vencida día 4: “Luca, ya van 3 días con esta tarea sin completar. Si no se resuelve hoy, mañana debo informar al Coordinador. ¿La revisamos juntos?”
  * tarea vencida día 5 al Coordinador: “Te informo como Coordinador: Luca tiene 1 tarea pendiente desde el lunes. ¿Querés intervenir o esperamos?”
  * tarea completada standard: “Listo el reciclaje. 💜”
  * tarea completada para niño: “Luca completó su lista de hoy. 🎯”
  * conflicto leve: “El martes coinciden el dentista de Luca y la reunión de Mariana a las 16. ¿Revisan?”
  * conflicto con recurso compartido: “El viernes dos personas necesitan el auto a las 15. ¿Coordinan quién lo usa?”
* Home/Briefing relacionado:
  * “Hoy: 4 tareas, 2 eventos y 1 documento por vencer. ¿Empezamos por las tareas?”
  * “Hoy tranquilo: 1 evento a las 16 y sin vencimientos. ☀️”
  * “Sábado. 1 tarea pendiente y la lista de compras por armar.”
  * “Todo al día por acá. Nada pendiente.”
  * “Sin tareas, sin vencimientos. Buen momento para lo que quieras.”
  * “Tenés 2 tareas para hoy y 1 del lunes.”
  * “Pendientes: 3 tareas, 1 documento. ¿Empezamos por lo urgente?”

#### Jerarquía visual sugerida por fuentes

* Bottom Nav congelada: `[Home] [People] [+] [Planner] [More]`.
* Home es pantalla inicial y resume, no administra.
* Toda información de Home debe conducir al módulo que la administra.
* Planner no aparece en More; aparece como tab principal en Bottom Nav.
* Máximo 5 tabs por dominio.
* Más de 4 niveles de navegación es fallo; objetivo de acciones en ≤ 3 niveles.
* Modales solo para acciones cortas.
* Drawers solo para filtros y opciones contextuales.

---

### 2.2 Datos creíbles

#### Tareas / ejemplos explícitos

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
| Tareas atrasadas ≥3 | Umbral para mostrar alerta o badge de atención | POST_MVP si automatizado; DEMO si solo visual |
| 3 tareas pendientes asignadas a Juan | Ejemplo de dato objetivo sin juicio | DEMO PREMIUM |
| 4 tareas | Conteo en briefing/home | MOCK / DEMO |
| 2 tareas para hoy y 1 del lunes | Resumen de tareas pendientes | MOCK / DEMO |
| 3 tareas, 1 documento | Resumen de pendientes; documento es dependencia externa | MOCK / DEMO |
| 3 tareas sin dueño activo | Escalamiento/briefing familiar | POST_MVP / DEMO visual |
| Lista de compras por armar | Task/compras como dato demo | DEMO PREMIUM |
| Recordatorio de medicación a las 9 | Task de medicación / reminder | DEMO PREMIUM |
| Medicación de la tarde para Luca | Task de medicación con supervisión | DEMO PREMIUM |

#### Eventos / ejemplos explícitos

| Dato encontrado | Uso posible en demo | Clasificación |
|---|---|---|
| 2 eventos | Conteo en briefing/home | MOCK / DEMO |
| 1 evento a las 16 | Próximo evento en Home o Calendar | DEMO PREMIUM |
| Dentista de Luca el martes a las 16 | Event card / conflicto | DEMO PREMIUM |
| Reunión de Mariana el martes a las 16 | Event card / conflicto | DEMO PREMIUM |
| Dos personas necesitan el auto el viernes a las 15 | Conflicto de evento/recurso compartido | DEMO PREMIUM / POST_MVP si recurso real |
| Reunión del cole mañana a las 17 | Event o task asociada | DEMO PREMIUM |

#### Categorías / responsabilidades explícitas

| Dato encontrado | Uso posible | Clasificación |
|---|---|---|
| Compras | Categoría/template visual de tarea | DEMO PREMIUM / REAL mínimo si se usa como constante visual |
| Mascotas | Responsabilidad/categoría extraída del archivo asociado | DEMO PREMIUM |
| Limpieza | No aparece explícita como ejemplo en el documento leído; falta para template MVP | Información faltante |
| Medicación | Recordatorio explícito; puede servir como categoría de tarea | DEMO PREMIUM |
| Estudios | No aparece explícita como template; “reunión del cole” puede servir de contexto, no template formal | Información faltante |
| Pagos | No aparece como template Planner; pagos aparecen vinculados a Home/Finance fuera de Planner | Información faltante / dependencia externa |
| Vehículos | Responsabilidad mencionada en archivo asociado; recurso auto aparece en conflicto | DEMO / POST_MVP si se desarrolla recurso |

#### Personas / nombres explícitos

* Luca.
* Mati.
* Jose.
* Mariana.
* Tomás.
* Juan.
* Don Carlos.

Usos posibles: responsables, participantes, destinatarios de notificación, ejemplos de carga familiar mock.

#### Labels temporales explícitos

* mañana;
* antes de las 8;
* martes;
* lunes;
* jueves;
* finde;
* viernes a las 15;
* 16;
* 17;
* las 9;
* tarde;
* desde ayer;
* desde el lunes;
* 30 minutos después.

---

### 2.3 Acción interactiva

#### Acciones encontradas o mencionadas

| Acción | Evidencia | Resultado visible posible | Clasificación |
|---|---|---|---|
| Completar tarea | “Listo el reciclaje. 💜”; “Luca completó su lista de hoy. 🎯” | Cambia visualmente a completada + mensaje factual | REAL MÍNIMO / LOCAL |
| Revisar tarea pendiente | “¿La revisás hoy?” | Abrir detalle o enfocar tarea pendiente | DEMO PREMIUM / LOCAL |
| Pedir ayuda para completar/reorganizar | “¿Necesitás ayuda para completarla?” / “¿Querés que te ayude a reorganizarlas?” | Acción sugerida, no automática | DEMO PREMIUM |
| Pasar tarea a otro día | “¿La pasamos al finde o la revisás hoy?” | Reprogramar fecha si se implementa local | DEMO PREMIUM / LOCAL |
| Revisar distribución | “¿Revisan la distribución?” | Abrir vista de carga/responsables | DEMO PREMIUM / MOCK |
| Ajustar distribución | “¿Ajustan algo entre todos?” | Abrir selector/reasignación; no automática | DEMO PREMIUM / LOCAL |
| Revisar conflicto | “¿Revisan?” | Abrir eventos conflictivos | DEMO PREMIUM |
| Coordinar uso de recurso | “¿Coordinan quién lo usa?” | Acción visual de resolver conflicto | POST_MVP / DEMO visual |
| Agregar evento | Empty state: “¿Agregamos un evento?” | Abrir crear evento | REAL MÍNIMO / LOCAL |
| Recordar de nuevo en 30 minutos | Medicación: reconfirmación | Feedback de recordatorio local/mock | DEMO PREMIUM / MOCK |
| Verificar completitud | Archivo asociado: verificación humana de tareas | Estado visual verificado | REAL parcial / LOCAL si no hay backend |
| Reasignar tarea | Archivo asociado: requiere acción de Adulto, Coordinador o responsable | Cambia responsable localmente | DEMO PREMIUM / LOCAL |
| Crear tarea desde plantilla | `PlantillaTarea generates Task` | Crear task prellenada | DEMO PREMIUM / LOCAL |

#### Acciones explícitamente restringidas

* Geni nunca marca tareas como completadas automáticamente.
* Geni nunca reasigna tareas unilateralmente.
* Reasignación requiere acción de Adulto, Coordinador o responsable.
* Verificación de completitud es responsabilidad humana.
* Automatizaciones requieren aprobación explícita antes de activarse; no desarrollar automatizaciones reales.

---

### 2.4 Feedback inmediato

#### Success / confirmación

* Al completar tarea standard: “Listo el reciclaje. 💜”
* Al completar lista de niño: “Luca completó su lista de hoy. 🎯”
* Reconocimiento debe ser factual, sin adjetivos valorativos ni comparaciones.

#### Empty states

| Caso | Copy extraíble | Clasificación |
|---|---|---|
| Sin tareas asignadas | “No tenés tareas pendientes. Cuando te asignen una, aparece acá.” | REAL MÍNIMO / DEMO |
| Sin eventos próximos | “Calendario libre por ahora. ¿Agregamos un evento?” | REAL MÍNIMO / DEMO |

#### Error / edge states reutilizables para Planner

| Caso | Copy extraíble | Uso en Planner |
|---|---|---|
| Error de conexión | “Sin conexión. Tus datos están seguros, se sincronizan cuando vuelvas.” | Error banner/toast en lista o formulario |
| Sincronización pendiente | “Falta sincronizar. Los cambios de hoy se guardaron en el teléfono.” | Estado local pendiente si se usa AsyncStorage/mock |
| Permiso denegado general | “No tenés acceso a esta sección. Solo visible para el Coordinador del hogar.” | Acciones restringidas por rol |
| Permiso denegado Niño | “Esta sección es solo para adultos del hogar.” | Crear/reasignar/editar si se bloquea para niño |
| Error al guardar | “No se pudo guardar. ¿Probás de nuevo? Si persiste, revisamos la conexión.” | Crear/editar task/event |
| Datos inconsistentes | “Hay un dato que no coincide. ¿Lo revisamos juntos?” | Conflict/invalid state |
| Funcionalidad no disponible | “Esta función todavía no está lista. Te avisamos cuando se active.” | Post-MVP o acción demo no implementada |

#### Loading / skeleton / spinner

* No se encontró mención explícita a loading, skeleton, spinner ni estados de espera.

#### Disabled state

* No se encontró patrón explícito de disabled state.
* Se puede derivar visualmente de permisos denegados, pero el documento no define diseño ni comportamiento.

---

### 2.5 Service aislado

#### Datos que un service de Planner podría listar según fuentes

* Tasks:
  * estado;
  * responsable;
  * fecha;
  * prioridad;
  * progreso de subtareas, POST_MVP;
  * responsabilidad/categoría;
  * si está vencida como cálculo;
  * si requiere verificación;
  * si está bloqueada por dependencia, POST_MVP.
* Events:
  * fecha;
  * participantes;
  * estado;
  * tipo `Familiar` / `Personal`.
* Calendar:
  * eventos próximos;
  * conflictos de horario.
* Home integration:
  * `Task` → `WidgetTareas`.
  * `Event` → `WidgetPróximosEventos`.
  * `WidgetAtenciónRequerida` agrega tareas vencidas.
  * `WidgetCargaFamiliar` analiza Task, pero para MVP visual tratar como mock.

#### Acciones que el service podría ejecutar según documento

* Completar tarea.
* Reprogramar/pasar tarea a otro día, si se usa el copy “¿La pasamos al finde...?”.
* Reasignar tarea por acción humana autorizada.
* Verificar tarea por acción humana.
* Crear task desde plantilla, por relación `PlantillaTarea generates Task`.
* Agregar evento, por empty state de calendario.
* Modificar fecha de evento para postergar, porque no existe estado `Postergado`.

#### Contrato service/API

* No se encontró contrato API explícito.
* No se encontraron endpoints.
* Para demo visual, la fuente permite un service **local/mock** que devuelva datos y mutaciones inmediatas.
* Si se usa persistencia local, el documento menciona estados de “sincronización pendiente” y que cambios de hoy se guardaron en el teléfono; sin embargo, Offline Sync real queda POST_MVP/IGNORAR como implementación real.

---

### 2.6 Navegación coherente

#### Navegación encontrada

* Bottom Navigation congelada: `[Home] [People] [+] [Planner] [More]`.
* `BottomNav` navega a `Planner`.
* `BottomNav` abre `QuickActions` con el botón `+`.
* `Home` es pantalla inicial y el usuario no puede cambiarlo.
* `Home` resume información, no administra.
* Toda información en Home conduce al módulo que la administra.
* `Calendar` vive dentro de `Planner`; no aparece como tab separado.
* `More` contiene herramientas especializadas, pero Planner no vive en More.

#### Navegación recomendada desde fuentes para el fragment

* Entrar a Planner desde Bottom Nav.
* Desde Home:
  * tocar `WidgetTareas` → abrir Planner / Tasks.
  * tocar tarea vencida en `Atención Requerida` → abrir detalle/lista de Tasks.
  * tocar `WidgetPróximosEventos` → abrir Planner / Calendar o Events.
* Desde empty state de Calendar:
  * “¿Agregamos un evento?” → crear evento, si se implementa localmente.
* Desde Quick Actions:
  * no hay acción explícita de crear tarea/evento en el documento actual; no inventar.

---

### 2.7 Conexión con Home o More

#### Home

* `Home` contiene widgets conectados a Planner:
  * `WidgetTareas`.
  * `WidgetPróximosEventos`.
  * `WidgetAtenciónRequerida` con tareas vencidas.
  * `WidgetCargaFamiliar` que analiza tareas, pero para esta demo tratar como MOCK si aparece.
* Briefing puede mostrar:
  * conteo de tareas;
  * conteo de eventos;
  * tareas pendientes;
  * día cargado/tranquilo;
  * estado “todo al día”.
* Home no administra tareas/eventos; conduce a Planner.

#### More

* Planner no vive en More.
* `More` se reserva para herramientas especializadas como Finance, Inventory, FamilyCloud y Settings.
* No crear card de Planner en More desde este documento.

#### Quick Actions

* El botón `+` abre Quick Actions.
* El documento dice que Geni es accesible vía Quick Actions.
* No se encontró acción explícita “crear tarea” o “crear evento” dentro de Quick Actions en este documento.

---

## 3. Clasificación para implementación

### REAL MÍNIMO

* Planner como tab principal de Bottom Nav.
* Calendar como feature dentro de Planner.
* Task como entidad visual/interactiva.
* Event como entidad visual/interactiva.
* Completar tarea por acción humana.
* Reasignar tarea solo por acción humana autorizada si se implementa.
* Verificación humana de tarea si se implementa; no automática.
* Vencida como cálculo visual, no estado persistido.
* Eventos con estados `Programado`, `Completado`, `Cancelado` según archivo asociado.
* Postergar evento = modificar fecha, no crear estado `Postergado`.
* Home resume tareas/eventos y navega a Planner.
* Empty states de tareas y eventos.
* Error al guardar y error de conexión como feedback visual.

### DEMO PREMIUM

* Cards de tareas con copy contextual:
  * reciclaje;
  * reunión del cole;
  * martes de compras;
  * medicación;
  * tareas del finde;
  * tareas pendientes desde lunes/jueves/ayer.
* Cards de eventos con conflictos:
  * dentista de Luca;
  * reunión de Mariana;
  * evento a las 16;
  * reunión del cole a las 17;
  * conflicto de auto como recurso compartido, sin desarrollar Assets.
* Filtros/tabs visuales posibles si se quiere demostrar:
  * pendientes;
  * hoy;
  * vencidas;
  * completadas;
  * calendario.
  Estos tabs no aparecen explícitamente como UI, pero las categorías de datos sí aparecen como estados/copies. Si se usan, marcarlos como decisión posterior de UI, no extracción literal.
* Carga familiar visual desde tareas, solo como mock/dummy si se muestra.
* Briefing simple con tareas/eventos, mock/simple.
* Estado “todo al día”.
* Estado “pendientes”.
* Conflictos de horario como badge/card.

### LOCAL / ASYNCSTORAGE / MOCK SERVICE

* Listar tareas mock/locales.
* Completar tarea con estado local y feedback inmediato.
* Crear tarea desde plantilla visual si se usa `PlantillaTarea generates Task`.
* Reasignar responsable localmente si se usa acción humana autorizada.
* Marcar/verificar tarea localmente si se usa verification flow visual.
* Listar eventos mock/locales.
* Agregar evento local desde empty state.
* Editar fecha de evento local para simular postergación.
* Mostrar mensajes de “sincronización pendiente” como estado visual local si se decide simular.

### POST_MVP

* Goals.
* Hitos/Milestones.
* Rachita/Streaks.
* Subtareas.
* Dependencias reales entre tareas.
* Bloqueo real por dependencia.
* Comentarios.
* Adjuntos.
* Timeline.
* Recurrencia compleja o generación real de instancias.
* Automatizaciones reales.
* Notificaciones push reales.
* Auditoría completa.
* Offline sync real.
* Geni real detectando patrones, escalando y personalizando.
* Search global ejecutando acciones.
* Participantes avanzados con estados de asistencia.
* Recursos compartidos reales.

### IGNORAR

* Implementación real de módulos externos.
* IA real.
* Automatizaciones reales.
* Auditoría completa.
* Offline sync real.
* GPS, geocercas o presencia real.
* Finance real.
* Inventory real.
* Assets real.
* FamilyCloud real.
* SOS real.
* Feed real.

---

## 4. UI extraíble

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

---

## 5. Datos demo extraíbles

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
| Papeles listos | Task | Subtarea visual o checklist, POST_MVP si subtarea real | Documento principal §3.1 | DEMO / POST_MVP |
| Martes de compras | Task | Tarea recurrente visual / categoría compras | Documento principal §3.1 | DEMO PREMIUM |
| Lista de siempre | Task | Template visual de compras | Documento principal §3.1 | DEMO PREMIUM |
| Tarea pendiente desde ayer | Task | Vencida calculada | Documento principal §3.1 | LOCAL |
| Tarea pendiente desde lunes/jueves | Task | Vencida con fecha relativa | Documento principal §3.1 | LOCAL |
| 2 tareas del finde | Task | Grupo/filtro visual | Documento principal §3.1 | DEMO PREMIUM |
| Dentista de Luca martes a las 16 | Event/Calendar | Evento y conflicto | Documento principal §3.1 | DEMO PREMIUM |
| Reunión de Mariana martes a las 16 | Event/Calendar | Evento y conflicto | Documento principal §3.1 | DEMO PREMIUM |
| Dos personas necesitan el auto viernes a las 15 | Event/Calendar | Conflicto de recurso | Documento principal §3.1 | DEMO / POST_MVP |
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
| Vehículos | Responsabilidad/Event conflict | Categoría/recurso visual | Comprensión OUTPUT 1 / Documento principal §3.1 | POST_MVP / DEMO |
| Familiar / Personal | Event | Tipo de evento | Comprensión OUTPUT 1 | REAL parcial |
| Programado / Completado / Cancelado | Event | Estados visuales | Comprensión OUTPUT 1 | REAL parcial |
| Pendiente / En progreso / Completada / Cancelada | Task | Estados encontrados, no coinciden con estados MVP oficiales | Comprensión OUTPUT 1 | Riesgo / REAL parcial |

---

## 6. Acciones extraíbles

| Acción | Usuario/Rol | Resultado visible | Real/Mock/Post-MVP | Fuente |
|---|---|---|---|---|
| Abrir Planner | Usuario autenticado | Pantalla Planner | REAL MÍNIMO | Archivo asociado: BottomNav navigates_to Planner |
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
| Coordinar recurso compartido | Usuario | Resolver conflicto visual | POST_MVP / DEMO | Documento principal §3.1 |
| Ver tareas desde Home | Usuario | Navega de WidgetTareas a Planner | REAL relación | Archivo asociado OUTPUT 2/4/5 |
| Ver próximos eventos desde Home | Usuario | Navega de WidgetPróximosEventos a Planner/Calendar | REAL relación | Archivo asociado OUTPUT 2/4/5 |
| Reintentar guardado | Usuario | Retry tras error | DEMO PREMIUM / LOCAL | Documento principal §3.4 |

---

## 7. Home / More / Quick Actions

### Home

* Puede mostrar tareas pendientes.
* Puede mostrar eventos próximos.
* Puede mostrar estado “todo al día”.
* Puede mostrar estado con pendientes.
* Puede mostrar briefing mock con conteos simples de tareas/eventos.
* Puede mostrar `WidgetTareas`.
* Puede mostrar `WidgetPróximosEventos`.
* Puede mostrar `WidgetAtenciónRequerida` si hay tareas vencidas.
* Puede mostrar `WidgetCargaFamiliar` como mock/dummy si se quiere demo premium.
* Home resume, no administra.
* Toda información en Home conduce al módulo que la administra.
* `Task` alimenta `WidgetTareas`.
* `Event` alimenta `WidgetPróximosEventos`.

### More

* Planner no vive en More.
* No crear acceso de Planner en More desde este documento.
* More contiene módulos especializados externos y Settings, no desarrollar en este fragment.

### Quick Actions

* El botón `+` abre Quick Actions.
* Quick Actions accede a PantallaGeni como slot fijo.
* No se encontró acción explícita de Planner desde Quick Actions en el documento actual.
* No inventar `crear tarea` o `crear evento` en Quick Actions desde este documento.

---

## 8. Backend/API detectado

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

---

## 9. Modelo de datos detectado

| Entidad | Campo | Tipo si aparece | Estado/valores | Uso visual o interacción | Clasificación |
|---|---|---|---|---|---|
| Planner | contains | no especificado | Task, Calendar, Goal, Responsabilidad | Estructura del módulo | REAL parcial / POST_MVP para Goal |
| Task | estado | no especificado | Pendiente, En progreso, Completada, Cancelada | Badges/filters/cards | REAL parcial / riesgo |
| Task | vencida | calculada según regla, tipo no especificado | No es estado persistido | Badge visual/Atención requerida | REAL MÍNIMO |
| Task | responsable | no especificado | Persona | Avatar/nombre/asignación | REAL MÍNIMO |
| Task | fecha | no especificado | Fecha/deadline implícito | Agrupar hoy/vencidas/calendar | REAL MÍNIMO parcial |
| Task | prioridad | no especificado | No aparecen valores | Orden visual si se decide; falta definición | Información faltante |
| Task | responsabilidad | no especificado | Compras, Mascotas, Limpieza, Vehículos como ejemplos del asociado | Agrupación/categoría | DEMO PREMIUM |
| Task | dependencia | no especificado | Task depends_on Task | Mostrar bloqueada, pero no implementar real | POST_MVP |
| Task | recurrencia | no especificado | Genera nuevas instancias, no reutiliza | Mostrar “Martes de compras” visual | POST_MVP / DEMO |
| Task | verificación | no especificado | Opcional; al verificarse pasa a estado final | Badge “requiere verificación” / acción verificar | REAL parcial |
| Task | subtarea | no especificado | Único nivel, sin anidamiento | Checklist visual | POST_MVP |
| Task | comentario | no especificado | Comentario en tareas | No implementar MVP | POST_MVP |
| Task | adjunto | no especificado | Imágenes, PDFs, archivos, audio | No implementar MVP | POST_MVP |
| Task | timeline | no especificado | Actividad automática y comentarios humanos | No implementar MVP | POST_MVP |
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
| WidgetCargaFamiliar | data | no especificado | Análisis de carga de tareas | Mock/dummy si se muestra | MOCK / POST_MVP real |

---

## 10. Edge cases / errores / estados vacíos

| Caso | Comportamiento esperado | Fuente | Clasificación |
|---|---|---|---|
| Sin tareas asignadas | Mostrar “No tenés tareas pendientes. Cuando te asignen una, aparece acá.” | Documento principal §3.3 | REAL MÍNIMO |
| Sin eventos próximos | Mostrar “Calendario libre por ahora. ¿Agregamos un evento?” | Documento principal §3.3 | REAL MÍNIMO |
| Tarea vencida día 1 | Mostrar aviso privado sutil | Documento principal §3.1 | DEMO PREMIUM |
| Tarea vencida día 3 | Mostrar aviso con pregunta de ayuda | Documento principal §3.1 | DEMO PREMIUM |
| Tarea vencida día 4 | Mostrar alerta privada reforzada con preaviso de escalar | Documento principal §3.1 | POST_MVP si automatizado / DEMO visual |
| Tarea vencida día 5 | Informar al Coordinador | Documento principal §3.1 | POST_MVP si automatizado / DEMO visual |
| ≥3 tareas atrasadas | Umbral de intervención | Archivo asociado OUTPUT 5/6 | POST_MVP si automatizado / DEMO badge |
| Tarea con dependencia | Pregunta abierta, puerta de salida; dependencia real queda POST_MVP | Documento principal §3.1 / asociado OUTPUT 1 | POST_MVP / DEMO |
| Tarea bloqueada por dependencia | Si la previa no se completa, dependiente queda bloqueada | Archivo asociado OUTPUT 7 | POST_MVP |
| Tarea recurrente | Reconoce patrón; recurrencias generan nuevas instancias | Documento principal §3.1 / asociado OUTPUT 5 | POST_MVP / DEMO |
| Tarea completada | Feedback factual; no comparar ni elogiar excesivamente | Documento principal §3.1 | REAL MÍNIMO |
| Conflicto de horario leve | Mostrar conflicto y preguntar “¿Revisan?” | Documento principal §3.1 | DEMO PREMIUM |
| Conflicto con recurso compartido | Mostrar conflicto de uso de auto; no desarrollar Assets | Documento principal §3.1 | POST_MVP / DEMO |
| Evento postergado | No existe estado Postergado; cambiar fecha | Archivo asociado OUTPUT 5 | REAL MÍNIMO |
| Error de conexión | Mostrar “Sin conexión...” | Documento principal §3.4 | DEMO PREMIUM / LOCAL |
| Sincronización pendiente | Mostrar “Falta sincronizar...” si se usa estado local | Documento principal §3.4 | LOCAL / POST_MVP si sync real |
| Permiso denegado general | Mostrar acceso restringido | Documento principal §3.4 | DEMO PREMIUM |
| Permiso denegado Niño | Mostrar “Esta sección es solo para adultos del hogar.” | Documento principal §3.4 | DEMO PREMIUM |
| Error al guardar | Mostrar retry copy | Documento principal §3.4 | DEMO PREMIUM |
| Datos inconsistentes | Mostrar revisión conjunta | Documento principal §3.4 | DEMO PREMIUM |
| Funcionalidad no disponible | Mostrar no disponible todavía | Documento principal §3.4 | DEMO PREMIUM / POST_MVP |
| Carga desbalanceada | Solo visible para Coordinador; no-coordinadores no ven comparaciones | Documento principal §3.2 / asociado OUTPUT 5 | MOCK / POST_MVP real |

---

## 11. Restricciones y prohibiciones detectadas

### Restricciones funcionales para Planner

* Vencida no es un estado de tarea; se calcula automáticamente.
* Geni nunca completa tareas automáticamente.
* Verificación de completitud es responsabilidad humana.
* Geni nunca reasigna tareas unilateralmente.
* Reasignación requiere acción de Adulto, Coordinador o responsable.
* No existe estado `Postergado` para eventos; postergar equivale a modificar fecha.
* Las recurrencias generan nuevas instancias de tarea, no reutilizan la misma.
* Empleado Familiar no puede crear tareas; solo completar, comentar y adjuntar evidencia. Para MVP del prompt, Empleado Familiar queda fuera salvo dependencia visual.
* No-coordinadores no deben ver comparaciones de carga entre miembros.
* Invitado no recibe contexto del hogar, no ve nombres de otros miembros, tareas ajenas ni métricas familiares.

### Restricciones de copy/UX aplicables a Planner

* Objetivo, nunca juzga.
* Sugiere, no ordena.
* Pregunta antes de actuar.
* Reconocimiento factual, no elogio valorativo.
* No usar adjetivos valorativos sobre personas.
* No usar copy acusatorio: “No hiciste”, “Estás fallando”, “Otra vez”, “Siempre lo mismo”.
* No usar imperativos paternalistas: “Tenés que”, “Debés”, “Es tu obligación”.
* No usar comparativas entre miembros salvo vista del Coordinador y con cuidado.
* Máximo un emoji por mensaje.
* Emojis autorizados en el documento: 💜 reconocimiento, ⚠️ urgencia/SOS, 🎯 logro.
* En Planner evitar SOS/urgencia real salvo que otra fuente lo pida; SOS queda fuera.

### Restricciones de navegación

* Planner debe estar en Bottom Nav.
* Calendar no aparece como tab global separado; vive dentro de Planner.
* Home es inicial y no se cambia.
* Home resume, no administra.
* Toda información en Home conduce al módulo que la administra.
* Máximo 5 tabs por dominio.
* Más de 4 niveles de navegación es fallo.
* Modales solo para acciones cortas.
* Drawers solo para filtros/opciones contextuales.

### Restricciones de implementación para este fragment

* No implementar Geni real.
* No implementar notificaciones push reales.
* No implementar automatizaciones reales.
* No implementar auditoría completa.
* No implementar offline sync real.
* No implementar recursos compartidos reales desde Assets.
* No implementar Goals, Hitos ni Streaks.
* No implementar comentarios, adjuntos, timeline ni dependencias reales.

---

## 12. Información faltante

| Falta | Por qué importa para Codex | Impacto |
|---|---|---|
| Pantalla Planner detallada | No hay layout específico de tabs/listas/cards | Codex deberá usar fragment como materia prima, no spec final |
| Create Task UI | No se encontró formulario ni campos exactos | Acción crear tarea requiere diseño posterior |
| Edit Task UI | No hay flujo ni permisos completos | Editar puede quedar fuera o local mínimo |
| Delete Task UI | No aparece eliminación de tareas | No implementar salvo otra fuente lo diga |
| List Task API/service contract | No hay endpoint, request ni response | Service deberá ser mock/local si se usa |
| Estados MVP oficiales `pending`, `completed`, `awaiting_verification`, `verified` | Documento usa Pendiente, En progreso, Completada, Cancelada y Verificación | Riesgo de merge; no mapear automáticamente sin fuente de merge |
| Prioridades | Data flow menciona prioridad, pero no aparecen valores ni UI | No crear prioridad real sin otra fuente |
| Templates MVP completas | No aparecen todas: Limpieza, Compras, Mascotas, Medicación, Estudios, Pagos | Usar solo datos encontrados o marcar faltante |
| Verification Flow completo | Existe Verificación, pero sin estados ni pasos completos | Implementación real requiere otra fuente |
| Calendar día/semana/mes | No aparecen vistas explícitas | No inventar UI final |
| Recurrencia simple de eventos | No aparecen `none/daily/weekly/monthly` | No implementar recurrencia real desde este documento |
| Create/Edit/Delete Event contracts | No hay endpoints ni formularios | Mantener local/demo si se necesita |
| Participantes de evento con permisos | Solo aparece relación Event → Persona | No implementar participantes avanzados |
| Home integration payload | No hay shape de datos | Home cards deben usar datos mock/locales si se integran |
| Loading/skeleton/spinner | No aparecen | Feedback visual debe basarse en errores/success encontrados |
| Permisos por rol completos para Planner | Solo hay restricciones parciales y algunas reglas | No cerrar matriz de permisos desde este documento |
| Búsqueda/filtros | SearchGlobal indexa Task/Event, pero es avanzado; no hay filtros Planner | No desarrollar search real |
| Criterio de cierre demo | No hay definición de “done” | Se resolverá en merge/prompt Codex |

---

## 13. Fuente

### Documento principal

Archivo: `HomePlus — UX writing guide para geni(1).md`

Secciones usadas:

* Metadata: líneas 1–6.
* `## 1. PERSONALIDAD DE GENI`.
* `### 1.1 Qué es Geni`: líneas 10–29.
* `### 1.2 Principios de comunicación`: líneas 30–48.
* `### 1.3 Dónde aparece Geni`: líneas 49–57.
* `## 2. TABLA DE TONO POR ROL`: líneas 58–68.
* `### 2.1 Reglas de tratamiento`: líneas 69–74.
* `### 2.2 Sistema de escalamiento y tono`: líneas 75–82.
* `### 3.1 NOTIFICACIONES`: líneas 84–149.
* `### 3.2 HOME / BRIEFING`: líneas 150–173.
* `### 3.3 EMPTY STATES`: líneas 174–183.
* `### 3.4 ERRORES Y EDGE CASES`: líneas 184–195.
* `## 4. REGLAS DE VOZ`: líneas 221–258.

### Archivo de comprensión asociado

Archivo: `UX writing guide para geni(1).txt`

Secciones usadas:

* `OUTPUT 1 — ENTITIES`: Planner, Task, Responsabilidad, Event, Goal, Dependencia, Recurrencia, PlantillaTarea, Verificación, Comentario, Adjunto, Timeline, Calendar, Home widgets, roles y navegación.
* `OUTPUT 2 — RELATIONSHIPS`: relaciones Planner/Task/Calendar/Event/Persona/Home/BottomNav.
* `OUTPUT 3 — CROSS-DOMAIN RELATIONSHIPS`: relación People → Task/Event, Home widgets → Planner/Event, Notificación → Task/Event.
* `OUTPUT 4 — DATA FLOWS`: Task → WidgetTareas, Event → WidgetPróximosEventos, Geni → WidgetCargaFamiliar.
* `OUTPUT 5 — BUSINESS RULES`: reglas de tareas, eventos, Home, navegación, copy y restricciones.
* `OUTPUT 6 — ARCHITECTURAL DECISIONS`: Home como centro operativo, Bottom Nav congelada, Quick Actions, More, navegación mobile-first.
* `OUTPUT 7 — DERIVED_RELATIONSHIPS`: Task blocks Task, WidgetCargaFamiliar visible_only_to Coordinador, WidgetAtenciónRequerida aggregates_from Task.
* `OUTPUT 8 — GRAPH EDGES`: relaciones grafo para Planner, Task, Calendar, Event, Home, BottomNav y QuickActions.

### Source map previo

Archivo: `source_map_HomePlus_UX_writing_guide_para_geni.md`

Secciones usadas:

* `# 4.7 PLANNER`.
* `# 4.8 TASKS`.
* `# 4.9 EVENTS`.
* `# 4.10 CALENDAR`.
* `# 4.11 HOME`, solo como dependencia externa de Planner.
* `## 5. Mapa de entidades`, solo entidades relacionadas con Planner.

