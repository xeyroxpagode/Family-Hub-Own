# PLANNER fragment — SECCION 8 DATA PHILOSOPHY

## 1. Rol del módulo en la demo

### Información encontrada

* Planner aparece como parte del sistema del hogar: el hogar contiene Planner y Planner contiene Task y Calendar, según el archivo de comprensión.
* El documento principal no define una pantalla funcional de Planner, pero sí clasifica tareas y eventos como datos centrales de coordinación del hogar.
* Las tareas, eventos y gastos se guardan porque son “el núcleo de coordinación”. Para este fragment, solo se extrae Tasks / Events / Calendar.
* Las tareas del hogar y los eventos del hogar pertenecen a datos de coordinación: son visibles para quienes necesitan coordinar.
* Las tareas personales y eventos personales pertenecen a datos personales: son privados por defecto y el miembro decide si los comparte.
* Las tareas completadas y los eventos pasados son memoria histórica / narrativa del hogar.
* El Planner se conecta con Home porque Home “resume, no administra” y contiene bloques de Próximos Eventos y Tareas.
* El Planner se conecta con Bottom Nav porque existe navegación congelada V1: `[Home] [People] [+] [Planner] [More]`.
* El Planner se conecta con Quick Actions porque el botón `+` permite seleccionar acciones que llevan a formularios modales de creación, incluyendo crear tarea y crear evento.

### Valor mostrado al usuario

* Coordinación familiar mediante tareas y eventos.
* Memoria del hogar mediante historial permanente de tareas completadas y eventos pasados.
* Privacidad por defecto para tareas/eventos personales.
* Visibilidad compartida para tareas/eventos del hogar.
* Eliminación segura mediante papelera de 30 días.

### Problema familiar que resuelve

* Coordinar responsabilidades y eventos del hogar sin mezclar datos personales con datos compartidos.
* Evitar pérdida accidental de tareas/eventos mediante papelera.
* Evitar que lo completado o lo vivido se pierda del historial familiar.

### Qué debe sentir el usuario

* No aparece una emoción de UI específica para Planner en este documento.
* Sí aparece una intención de confianza: los datos del hogar son tratados como propios de la familia, con control, privacidad, trazabilidad y portabilidad.

### Importancia dentro del ecosistema

* Planner es una fuente directa para Home.
* Planner participa en auditoría, exportación, RLS y privacidad por defecto.
* Planner se apoya en People/Members para responsables, permisos, roles y visibilidad.

---

## 2. Información encontrada para las 7 condiciones MVP

### 2.1 Pantalla visualmente terminada

#### Pantallas / secciones detectadas

* **Planner**: aparece como tab directo en Bottom Nav.
* **Calendar**: aparece como feature de Planner que administra eventos familiares y personales.
* **Home → Próximos Eventos**: bloque de Home relacionado con Events.
* **Home → Tareas**: bloque de Home relacionado con Tasks.
* **Home → Atención Requerida**: bloque que centraliza urgentes, incluyendo tareas vencidas.
* **Quick Actions (+)**: panel flotante / selector de acción que deriva a formulario modal de creación.

#### Cards / widgets / bloques detectados

* Home contiene:
  * Briefing.
  * Atención Requerida.
  * Carga Familiar.
  * Próximos Eventos.
  * Tareas.
  * Presence Resumido.
  * Actividad Familiar.
* Para este fragment, solo se extraen como dependencias visibles de Planner:
  * Próximos Eventos.
  * Tareas.
  * Atención Requerida cuando muestra tareas vencidas.
  * Carga Familiar cuando deriva de distribución de tareas.
  * Briefing cuando referencia tareas/eventos.

#### Headers / tabs / navegación visual

* Bottom Nav V1 congelado: `[Home] [People] [+] [Planner] [More]`.
* `+` representa Quick Actions.
* Home no administra información: resume y redirige al módulo correspondiente.
* Regla de navegación detectada: más de 4 niveles de navegación es fallo; objetivo 95% de acciones en ≤3 niveles.

#### Listas / filtros / badges / iconos / labels

* No se encontró UI explícita para lista de tareas.
* No se encontró UI explícita para lista de eventos.
* No se encontraron filtros/tabs internos de Planner.
* No se encontraron badges visuales específicos, salvo estados conceptuales.
* No se encontraron iconos de Planner.

#### Estados visibles detectados

* Task:
  * Pendiente.
  * En progreso.
  * Completada.
  * Cancelada.
  * Vencida calculada.
  * Activa.
  * Eliminada.
* Event:
  * Programado.
  * Completado.
  * Cancelado.
  * Futuro.
  * Pasado.
  * Eliminado.
  * Recurrente como caso especial.
* Papelera:
  * 30 días para tareas y eventos eliminados.

#### Textos o labels encontrados

* “este evento”.
* “toda la serie”.
* “Completada = histórico”.
* “Eliminada = papelera 30 días → borrado”.
* “Pasado = histórico”.
* “Eliminado = papelera 30 días → borrado”.
* “Tareas del hogar”.
* “Tareas personales”.
* “Eventos del hogar”.
* “Eventos personales”.
* “Próximos Eventos”.
* “Tareas”.
* “Atención Requerida”.
* “Carga Familiar”.

---

### 2.2 Datos creíbles

#### Datos / categorías encontradas para Tasks

* Tareas del hogar.
* Tareas personales.
* Tareas activas.
* Tareas completadas.
* Tareas eliminadas.
* Tareas vencidas, como estado calculado desde el archivo de comprensión.
* Responsabilidad como eje organizador de tareas.
* Responsabilidades / áreas operativas encontradas:
  * Compras.
  * Mascotas.
  * Limpieza.
  * Vehículos.

#### Datos / categorías encontradas para Events / Calendar

* Eventos del hogar.
* Eventos personales.
* Eventos futuros.
* Eventos pasados.
* Eventos eliminados.
* Eventos recurrentes.
* Evento individual.
* Serie completa.
* Calendar administra eventos familiares y personales.

#### Ejemplos familiares concretos encontrados

* “el asado del sábado”.
* “el cumpleaños de la abuela”.

#### Datos de miembros / roles útiles para Planner

**Dependencia externa / no desarrollar en este fragment.**

* Persona participa en uno o más hogares.
* Persona tiene rol.
* Task referencia Persona.
* Event referencia Persona.
* Adulto puede crear/reasignar tareas y crear eventos.
* Adolescente administra tareas propias y puede crear eventos familiares.
* Coordinador puede eliminar cualquier tarea.
* Creador o Coordinador puede eliminar eventos.
* Empleado Familiar puede completar tareas y no puede crear tareas.

#### Datos de Home útiles para Planner

**Dependencia externa / no desarrollar en este fragment.**

* Home muestra Próximos Eventos.
* Home muestra Tareas.
* Home puede mostrar tareas vencidas dentro de Atención Requerida.
* Carga Familiar deriva de Task.
* Briefing referencia Task y Event.

#### Datos no encontrados

* No se encontraron nombres concretos de tareas de demo.
* No se encontraron nombres concretos de eventos de demo, salvo ejemplos narrativos de eventos familiares.
* No se encontraron prioridades.
* No se encontraron fechas límite de tareas.
* No se encontró lista completa de templates MVP requerida por el prompt.
* No se encontró “Medicación”, “Estudios” ni “Pagos” como templates de Task.
* “Compras”, “Mascotas” y “Limpieza” aparecen como responsabilidades/áreas, no como templates MVP.

---

### 2.3 Acción interactiva

#### Acciones detectadas para Tasks

| Acción | Qué se encontró | Clasificación |
| ------ | --------------- | ------------- |
| Crear tarea | Toda acción de crear datos del hogar genera auditoría; Quick Actions puede abrir formulario modal de creación de tarea; Geni puede crear Task en comprensión. | REAL parcial / DEMO para Quick Actions / POST_MVP para Geni real |
| Modificar tarea | Toda acción de modificar datos del hogar genera auditoría. | REAL parcial |
| Eliminar tarea propia | Cualquier miembro puede eliminar sus propias tareas. | REAL MÍNIMO |
| Eliminar cualquier tarea | Coordinador puede eliminar cualquier tarea. | REAL MÍNIMO |
| Recuperar tarea eliminada | Tarea eliminada va a papelera 30 días y es recuperable por dueño o Coordinador. | REAL MÍNIMO |
| Completar tarea | Existe estado/retención de tareas completadas; no se describe flujo de completar. | REAL parcial / faltante de flujo |
| Compartir tarea personal | Tareas personales pueden compartirse con miembros específicos o todo el hogar. | POST_MVP / permisos finos |
| Cambiar tarea del hogar a personal | Tareas del hogar visibles por todos; el creador puede cambiar a “personal”. | POST_MVP / permisos finos |
| Exportar tareas | Tareas propias y tareas del hogar pueden exportarse según permisos. | POST_MVP |
| Asignar/reasignar tarea | Adulto puede crear/reasignar tareas según archivo de comprensión. | REAL parcial / falta UI y contrato |

#### Acciones detectadas para Events / Calendar

| Acción | Qué se encontró | Clasificación |
| ------ | --------------- | ------------- |
| Crear evento | Toda acción de crear datos del hogar genera auditoría; Quick Actions puede abrir formulario modal de creación de evento. | REAL parcial / DEMO para Quick Actions |
| Modificar evento | Toda acción de modificar datos del hogar genera auditoría. | REAL parcial |
| Eliminar evento | Creador o Coordinador puede eliminar evento. | REAL MÍNIMO |
| Eliminar evento recurrente individual | Al eliminar evento recurrente, el usuario elige “este evento”. | REAL parcial |
| Eliminar serie recurrente | Al eliminar evento recurrente, el usuario elige “toda la serie”. | POST_MVP si excede recurrencia simple |
| Exportar eventos | Eventos propios y eventos del hogar pueden exportarse; eventos soportan iCalendar. | POST_MVP |
| Compartir evento personal | Eventos personales pueden compartirse con miembros específicos o todo el hogar. | POST_MVP / permisos finos |
| Cambiar evento del hogar a personal | Eventos del hogar visibles por todos; el creador puede cambiar a “personal”. | POST_MVP / permisos finos |

#### Acciones de navegación detectadas

| Acción | Resultado visible | Clasificación |
| ------ | ----------------- | ------------- |
| Tocar Planner en Bottom Nav | Navega a Planner. | REAL MÍNIMO |
| Tocar `+` en Bottom Nav | Abre Quick Actions. | DEMO PREMIUM / LOCAL |
| Seleccionar crear tarea en Quick Actions | Abre formulario modal de creación. | DEMO PREMIUM / LOCAL |
| Seleccionar crear evento en Quick Actions | Abre formulario modal de creación. | DEMO PREMIUM / LOCAL |
| Tocar bloque de Home relacionado con tareas/eventos | Home redirige al módulo correspondiente. | DEMO PREMIUM / REAL parcial |

---

### 2.4 Feedback inmediato

#### Feedback / estados encontrados

* Papelera 30 días para tarea eliminada.
* Papelera 30 días para evento eliminado.
* Tarea eliminada recuperable por dueño o Coordinador.
* Evento eliminado va a papelera 30 días.
* En evento recurrente, al eliminar se muestra una decisión: “este evento” o “toda la serie”.
* Tarea completada queda como histórico.
* Evento pasado queda como histórico.
* Tarea vencida es calculada, según archivo de comprensión.
* Evento postergado no existe, según archivo de comprensión.

#### Feedback no encontrado

* No se encontraron toasts.
* No se encontraron mensajes de success.
* No se encontraron mensajes de error.
* No se encontraron skeletons.
* No se encontraron spinners.
* No se encontraron loading states.
* No se encontraron disabled states.
* No se encontraron empty states.
* No se encontró retry.
* No se encontraron estados de red.

---

### 2.5 Service aislado

#### Datos que el service podría listar, según información encontrada

* Tareas del hogar.
* Tareas personales.
* Tareas activas.
* Tareas completadas.
* Tareas eliminadas en papelera.
* Tareas vencidas calculadas.
* Eventos del hogar.
* Eventos personales.
* Eventos futuros.
* Eventos pasados.
* Eventos eliminados en papelera.
* Eventos recurrentes.
* Calendar con eventos familiares y personales.

#### Acciones que el service podría ejecutar, según información encontrada

* Crear tarea, como acción auditable, pero sin contrato API.
* Modificar tarea, como acción auditable, pero sin contrato API.
* Eliminar tarea propia.
* Eliminar cualquier tarea si el usuario es Coordinador.
* Recuperar tarea de papelera si el usuario es dueño o Coordinador.
* Crear evento, como acción auditable, pero sin contrato API.
* Modificar evento, como acción auditable, pero sin contrato API.
* Eliminar evento si el usuario es creador o Coordinador.
* Eliminar evento recurrente como “este evento” o “toda la serie”.
* Exportar tareas/eventos, clasificado como POST_MVP.

#### Resumen que entrega a Home

**Dependencia externa / no desarrollar en este fragment.**

* Próximos eventos.
* Tareas.
* Tareas vencidas para Atención Requerida.
* Datos de tareas para Carga Familiar.
* Tareas/eventos para Briefing.

#### Integraciones detectadas

* Home resume y redirige a Planner.
* Quick Actions abre formularios modales para crear tarea/evento.
* Bottom Nav incluye Planner.
* RLS filtra por permisos del miembro.
* Auditoría registra acciones importantes.
* Exportación puede exportar Tasks y Events.

#### Endpoints

* No se encontró contrato API explícito.
* No se encontraron rutas.
* No se encontraron request/response.
* No se encontraron nombres de funciones service.

#### Tipo de service recomendado desde este documento

* El documento no menciona services.
* Por ausencia de API y UI detallada, el fragment solo soporta un service local/mock para demo visual, más restricciones reales para permisos, visibilidad, retención y papelera.

---

### 2.6 Navegación coherente

#### Entrada al módulo

* Planner se accede desde Bottom Nav.
* Bottom Nav V1: `[Home] [People] [+] [Planner] [More]`.

#### Entrada rápida

* Quick Actions se abre desde el botón `+`.
* Quick Actions deriva a formulario modal de creación.
* La selección de acción puede llevar a crear tarea o crear evento.

#### Relación con Home

* Home no administra información: resume y redirige al módulo correspondiente.
* Home contiene bloques que pueden mostrar datos de Planner:
  * Próximos Eventos.
  * Tareas.
  * Atención Requerida, si hay tareas vencidas.
  * Carga Familiar, derivada de Task.
  * Briefing, si referencia Task/Event.

#### Relación con More

* More aparece como pantalla con herramientas especializadas y Settings.
* No se encontró que Planner viva dentro de More.
* No se encontró card de Planner dentro de More.

#### Reglas de navegación detectadas

* Más de 4 niveles de navegación es fallo.
* Objetivo: 95% de acciones ≤3 niveles.

---

### 2.7 Conexión con Home o More

#### Home

* Home puede mostrar Próximos Eventos.
* Home puede mostrar Tareas.
* Home puede mostrar tareas vencidas dentro de Atención Requerida.
* Home puede mostrar Carga Familiar derivada de Task.
* Home puede mostrar Briefing que referencia Task/Event.
* Home resume y redirige; no administra Planner.

#### More

* No se encontró Planner como módulo de More.
* More contiene Settings, que puede incluir privacidad, permisos y auditoría, pero eso es dependencia externa.

#### Quick Actions

* `+` en Bottom Nav abre Quick Actions.
* Quick Actions permite selección de acción.
* Quick Actions lleva a formulario modal de creación.
* Crear tarea y crear evento aparecen como acciones rápidas.

---

## 3. Clasificación para implementación

### REAL MÍNIMO

#### Tasks

* Tareas del hogar visibles para todos los miembros.
* Tareas personales visibles solo para el dueño.
* Tareas personales pueden compartirse, aunque el mecanismo fino no está definido.
* Tareas del hogar pueden cambiarse a personales por el creador, aunque el mecanismo fino no está definido.
* Tareas activas se guardan mientras el hogar existe y no expiran.
* Tareas completadas se guardan como historial permanente.
* Tareas eliminadas van a papelera durante 30 días y luego se eliminan definitivamente.
* Cualquier miembro puede eliminar sus propias tareas.
* Coordinador puede eliminar cualquier tarea.
* Tarea eliminada es recuperable por dueño o Coordinador durante los 30 días.
* Tarea vencida es calculada, no estado persistido, según archivo de comprensión.

#### Events / Calendar

* Eventos del hogar visibles para todos los miembros.
* Eventos personales visibles solo para el dueño.
* Eventos personales pueden compartirse, aunque el mecanismo fino no está definido.
* Eventos del hogar pueden cambiarse a personales por el creador, aunque el mecanismo fino no está definido.
* Eventos futuros se guardan indefinidamente mientras el hogar existe.
* Eventos pasados se guardan como historial permanente.
* Eventos eliminados van a papelera 30 días y luego se eliminan definitivamente.
* Creador o Coordinador puede eliminar un evento.
* Eventos recurrentes tienen decisión de eliminación: “este evento” o “toda la serie”.
* Si se elimina toda la serie, los eventos futuros van a papelera 30 días y los pasados se preservan como historial.
* Calendar administra eventos familiares y personales.

#### Navegación

* Planner vive en Bottom Nav.
* Home redirige al módulo correspondiente.
* Quick Actions puede abrir formulario modal para crear tarea o evento.

#### Restricciones reales transversales

* RLS filtra consultas por permisos del miembro a nivel de datos.
* Cada acción sobre datos del hogar —crear, modificar, eliminar, compartir, exportar— genera auditoría.
* Datos de un hogar no se cruzan con otros hogares.
* Datos personales y datos del hogar deben separarse.

---

### DEMO PREMIUM

* Planner visual puede usar Bottom Nav y Quick Actions como integración visible.
* Home puede mostrar cards/resúmenes de Planner:
  * Próximos Eventos.
  * Tareas.
  * Tareas vencidas en Atención Requerida.
* Quick Actions puede mostrar crear tarea y crear evento como acciones visuales.
* Carga Familiar puede mostrar distribución de tareas, pero para este MVP visual debe tratarse como demo/mock salvo que otra fuente la haga real.
* Briefing puede referenciar tareas/eventos, pero no implementar Geni real desde este fragment.
* Eventos familiares creíbles pueden inspirarse en los ejemplos textuales “asado del sábado” y “cumpleaños de la abuela”.

---

### LOCAL / ASYNCSTORAGE / MOCK SERVICE

* Por ausencia de endpoints, rutas y contratos API, el módulo puede sostenerse para demo con service local/mock.
* El service local puede simular:
  * listado de tareas;
  * listado de eventos;
  * completar tarea como cambio local;
  * eliminar tarea enviándola a papelera local;
  * recuperar tarea local desde papelera;
  * eliminar evento enviándolo a papelera local;
  * crear tarea desde Quick Actions;
  * crear evento desde Quick Actions;
  * calcular “vencida” visualmente;
  * alimentar cards de Home con próximos eventos y tareas.
* Esta clasificación no convierte la simulación en backend real.

---

### POST_MVP

* Exportación de tareas y eventos.
* iCalendar como exportación real.
* Auditoría completa e inmutable.
* Plantillas personalizadas / CRUD de templates.
* Subtareas.
* Dependencias entre tareas.
* Recurrencia avanzada.
* Serie recurrente compleja si excede una interacción demo.
* Participantes avanzados de eventos.
* Adjuntos o documentos vinculados a tareas/eventos.
* Comentarios.
* Rachas.
* Métricas reales de Carga Familiar.
* Briefing real de Geni.
* Notificaciones reales.
* Permisos finos de compartir/cambiar visibilidad.

---

### IGNORAR

* No se extrae implementación de módulos fuera de Planner.
* No se desarrolla IA real, auditoría completa, exportación completa, permisos finos, storage, sincronización offline ni módulos externos.

---

## 4. UI extraíble

| Pantalla/Componente | Qué muestra | Acciones | Estados UX | Navegación | Clasificación |
| ------------------- | ----------- | -------- | ---------- | ---------- | ------------- |
| Planner tab | Entrada principal al módulo Planner. No se define contenido interno. | Abrir Planner desde Bottom Nav. | No encontrados. | Bottom Nav `[Home] [People] [+] [Planner] [More]`. | REAL MÍNIMO |
| Calendar | Administra eventos familiares y personales. No se definen vistas. | No se define acción directa. | Eventos programados/completados/cancelados desde comprensión. | Dentro de Planner. | REAL parcial |
| Task list | No se encontró UI explícita. | No se encontró UI explícita. | Estados de Task encontrados: pendiente, en progreso, completada, cancelada, vencida calculada, activa, eliminada. | Planner / Home como resumen. | Faltante / posible demo local |
| Event list | No se encontró UI explícita. | No se encontró UI explícita. | Estados de Event encontrados: programado, completado, cancelado, futuro, pasado, eliminado. | Planner / Calendar / Home como resumen. | Faltante / posible demo local |
| Quick Actions (+) | Panel flotante de selección de acción. | Seleccionar crear tarea o crear evento. | No encontrados. | Botón `+` en Bottom Nav; deriva a formulario modal. | DEMO PREMIUM / LOCAL |
| Formulario modal de creación | Formulario modal luego de elegir acción desde Quick Actions. | Crear tarea / crear evento. | No encontrados. | Desde Quick Actions. | DEMO PREMIUM / LOCAL |
| Home — Próximos Eventos | Eventos próximos. | Redirigir al módulo correspondiente. | No encontrados. | Desde Home hacia Planner/Calendar. | DEMO PREMIUM / REAL parcial |
| Home — Tareas | Tareas del hogar o pendientes, sin detalle de UI. | Redirigir al módulo correspondiente. | No encontrados. | Desde Home hacia Planner. | DEMO PREMIUM / REAL parcial |
| Home — Atención Requerida | Urgentes, incluyendo tareas vencidas. | Redirigir al módulo correspondiente. | Tarea vencida calculada. | Desde Home hacia Planner. | DEMO PREMIUM |
| Home — Carga Familiar | Métricas de distribución de tareas. | No encontradas. | No encontrados. | Desde Home; dependencia de Task. | MOCK / POST_MVP real |
| Papelera de tareas/eventos | Elementos eliminados durante 30 días. No se define pantalla. | Recuperar tarea por dueño o Coordinador; eliminación definitiva luego de 30 días. | Estado eliminado/en papelera. | No encontrada. | REAL parcial |
| Selector eliminación evento recurrente | Opción “este evento” o “toda la serie”. | Elegir alcance de eliminación. | Confirmación implícita por decisión. | Desde eliminación de evento recurrente. | REAL parcial / POST_MVP si serie compleja |

---

## 5. Datos demo extraíbles

| Dato/ejemplo | Módulo | Uso posible | Fuente | Clasificación |
| ------------ | ------ | ----------- | ------ | ------------- |
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
| Vehículos | Tasks / Responsabilidad | Categoría/área visual. | Archivo de comprensión, OUTPUT 1 | DEMO PREMIUM / POST_MVP si depende de módulo externo |
| Eventos del hogar | Events | Lista/calendario compartido. | Documento principal, 8.2.2 / 8.4.2 | REAL MÍNIMO |
| Eventos personales | Events | Lista/calendario privado. | Documento principal, 8.2.2 / 8.4.1 | REAL MÍNIMO |
| Eventos futuros | Events | Próximos eventos. | Documento principal, 8.3.2 | REAL MÍNIMO |
| Eventos pasados | Events | Historial. | Documento principal, 8.3.2 | REAL MÍNIMO |
| Eventos eliminados | Events | Papelera. | Documento principal, 8.3.2 | REAL MÍNIMO |
| Eventos recurrentes | Events | Caso especial de eliminación. | Documento principal, 8.3.2 | REAL parcial / POST_MVP si excede simple |
| Programado | Events | Estado visual. | Archivo de comprensión, OUTPUT 1 | REAL parcial |
| Completado | Events | Estado visual. | Archivo de comprensión, OUTPUT 1 | REAL parcial |
| Cancelado | Events | Estado visual. | Archivo de comprensión, OUTPUT 1 | REAL parcial |
| “este evento” | Events | Opción de eliminación recurrente. | Documento principal, 8.3.2 | REAL parcial |
| “toda la serie” | Events | Opción de eliminación recurrente. | Documento principal, 8.3.2 | REAL parcial / POST_MVP si serie compleja |
| “el asado del sábado” | Events | Ejemplo narrativo para evento familiar. | Documento principal, 8.3.2 | DEMO PREMIUM |
| “el cumpleaños de la abuela” | Events | Ejemplo narrativo para evento familiar. | Documento principal, 8.3.2 | DEMO PREMIUM |
| Próximos Eventos | Home / Events | Card de Home conectada con Planner. | Archivo de comprensión, OUTPUT 1 | DEMO PREMIUM / REAL parcial |
| Tareas | Home / Tasks | Card de Home conectada con Planner. | Archivo de comprensión, OUTPUT 1 | DEMO PREMIUM / REAL parcial |
| Tareas vencidas | Home / Tasks | Atención Requerida. | Archivo de comprensión, OUTPUT 1 | DEMO PREMIUM |
| Carga Familiar | Home / Tasks | Widget mock derivado de tareas. | Archivo de comprensión, OUTPUT 1 / OUTPUT relaciones | MOCK / POST_MVP real |

---

## 6. Acciones extraíbles

| Acción | Usuario/Rol | Resultado visible | Real/Mock/Post-MVP | Fuente |
| ------ | ----------- | ----------------- | ------------------ | ------ |
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
| Compartir tarea personal | Dueño | Tarea visible para miembros específicos o todo el hogar. | POST_MVP / permisos finos | Documento principal, 8.4.1 |
| Cambiar tarea del hogar a personal | Creador | Tarea deja de ser visible para todos. | POST_MVP / permisos finos | Documento principal, 8.4.2 |
| Exportar tareas propias | Usuario | Archivo CSV/JSON. | POST_MVP | Documento principal, 8.6.1 / 8.6.2 |
| Exportar tareas del hogar | Coordinador | Archivo CSV/JSON. | POST_MVP | Documento principal, 8.6.1 / 8.6.2 |
| Crear evento | Adulto puede crear eventos; Adolescente puede crear eventos familiares según comprensión | Evento nuevo; acción auditable. | REAL parcial / falta contrato | Documento principal, 8.1.5; comprensión roles |
| Modificar evento | No se especifica rol exacto | Evento modificado; acción auditable. | REAL parcial / falta contrato | Documento principal, 8.1.5 |
| Eliminar evento | Creador o Coordinador | Evento pasa a papelera 30 días. | REAL MÍNIMO | Documento principal, 8.3.2 |
| Eliminar este evento recurrente | Creador o Coordinador | Evento individual va a papelera. | REAL parcial | Documento principal, 8.3.2 |
| Eliminar toda la serie | Creador o Coordinador | Futuros van a papelera; pasados se preservan. | POST_MVP si excede simple | Documento principal, 8.3.2 |
| Compartir evento personal | Dueño | Evento visible para miembros específicos o todo el hogar. | POST_MVP / permisos finos | Documento principal, 8.4.1 |
| Cambiar evento del hogar a personal | Creador | Evento deja de ser visible para todos. | POST_MVP / permisos finos | Documento principal, 8.4.2 |
| Exportar eventos propios | Usuario | CSV/JSON/iCalendar. | POST_MVP | Documento principal, 8.6.1 / 8.6.2 |
| Exportar eventos del hogar | Coordinador | CSV/JSON/iCalendar. | POST_MVP | Documento principal, 8.6.1 / 8.6.2 |
| Redirigir desde Home hacia Planner | Usuario que toca bloque relacionado | Abre módulo correspondiente. | DEMO PREMIUM / REAL parcial | Archivo de comprensión, Home rule |

---

## 7. Home / More / Quick Actions

### Home

**Dependencia externa / no desarrollar en este fragment.**

#### Qué puede mostrarse en Home

* Próximos Eventos.
* Tareas.
* Tareas vencidas dentro de Atención Requerida.
* Carga Familiar derivada de tareas.
* Briefing que referencia Task y Event.

#### Real o mock

* Próximos Eventos: REAL parcial si se alimenta desde Events.
* Tareas: REAL parcial si se alimenta desde Tasks.
* Atención Requerida con tareas vencidas: DEMO PREMIUM / calculado.
* Carga Familiar: MOCK para demo visual; cálculo real queda POST_MVP.
* Briefing con tareas/eventos: MOCK; no implementar Geni real.

#### Card / widget / resumen mencionado

* Home es centro operativo.
* Home resume, no administra.
* Home contiene Próximos Eventos y Tareas.
* Atención Requerida centraliza urgentes, incluyendo tareas vencidas.
* Carga Familiar muestra métricas de distribución de tareas entre miembros.
* Briefing es primer widget de Home y puede resumir eventos y tareas.

---

### More

**Dependencia externa / no desarrollar en este fragment.**

* More aparece como pantalla separada para herramientas especializadas y Settings.
* Planner no aparece como módulo dentro de More.
* Settings vive exclusivamente en More.
* Configuración/privacidad/exportación/auditoría pueden afectar datos de Planner, pero no son parte del fragment Planner visual.

---

### Quick Actions

**Dependencia externa / no desarrollar en este fragment.**

* Quick Actions vive en el botón `+` del Bottom Nav.
* Quick Actions abre un panel flotante.
* Quick Actions deriva a formulario modal de creación.
* Acciones relacionadas con Planner:
  * crear tarea;
  * crear evento.
* Quick Actions dinámicas y aprendizaje por frecuencia quedan POST_MVP.

---

## 8. Backend/API detectado

No se encontró contrato API explícito en este documento.

| Endpoint/Acción | Método | Ruta | Request | Response | Estado | Clasificación |
| --------------- | ------ | ---- | ------- | -------- | ------ | ------------- |
| Crear tarea | No encontrado | No encontrado | No encontrado | No encontrado | Acción mencionada sin contrato API | REAL parcial / LOCAL para demo |
| Modificar tarea | No encontrado | No encontrado | No encontrado | No encontrado | Acción mencionada sin contrato API | REAL parcial / LOCAL para demo |
| Completar tarea | No encontrado | No encontrado | No encontrado | No encontrado | Estado mencionado; flujo no definido | REAL parcial / LOCAL para demo |
| Eliminar tarea | No encontrado | No encontrado | No encontrado | No encontrado | Acción con regla de negocio, sin contrato API | REAL MÍNIMO / LOCAL para demo |
| Recuperar tarea de papelera | No encontrado | No encontrado | No encontrado | No encontrado | Acción con regla de negocio, sin contrato API | REAL parcial / LOCAL para demo |
| Crear evento | No encontrado | No encontrado | No encontrado | No encontrado | Acción mencionada sin contrato API | REAL parcial / LOCAL para demo |
| Modificar evento | No encontrado | No encontrado | No encontrado | No encontrado | Acción mencionada sin contrato API | REAL parcial / LOCAL para demo |
| Eliminar evento | No encontrado | No encontrado | No encontrado | No encontrado | Acción con regla de negocio, sin contrato API | REAL MÍNIMO / LOCAL para demo |
| Eliminar evento recurrente | No encontrado | No encontrado | No encontrado | No encontrado | Acción con regla de negocio, sin contrato API | REAL parcial / POST_MVP si serie compleja |
| Exportar tareas | No encontrado | No encontrado | Dominio/rango/formato según exportación general | Archivo CSV/JSON | Mecanismo de exportación general, no endpoint | POST_MVP |
| Exportar eventos | No encontrado | No encontrado | Dominio/rango/formato según exportación general | Archivo CSV/JSON/iCalendar | Mecanismo de exportación general, no endpoint | POST_MVP |

---

## 9. Modelo de datos detectado

| Entidad | Campo | Tipo si aparece | Estado/valores | Uso visual o interacción | Clasificación |
| ------- | ----- | --------------- | -------------- | ------------------------ | ------------- |
| Planner | contains | no especificado | Task, Calendar, Responsabilidad | Estructura interna del módulo. | REAL parcial |
| Task | estado | no especificado | Pendiente, En progreso, Completada, Cancelada | Badge/estado de task. | REAL parcial / conflicto con prompt MVP |
| Task | vencida | calculada según comprensión; tipo no especificado | Vencida calculada | Badge o filtro visual. | DEMO PREMIUM / REAL parcial |
| Task | tipo/visibilidad | no especificado | Tarea del hogar, tarea personal | Separar compartidas vs privadas. | REAL MÍNIMO |
| Task | retención | no especificado | Activa, completada, eliminada | Filtros/estados/papelera. | REAL MÍNIMO |
| Task | papelera | no especificado | 30 días | Feedback de eliminación/recuperación. | REAL MÍNIMO |
| Task | dueño | no especificado | dueño puede ver/recuperar/eliminar propias | Permisos visuales. | REAL MÍNIMO |
| Task | creador | no especificado | creador puede cambiar tarea del hogar a personal | Permiso fino. | POST_MVP |
| Task | responsable/persona | no especificado | Task referencia Persona | Asignación o responsable visual. | REAL parcial / falta contrato |
| Task | responsabilidad principal | no especificado | Compras, Mascotas, Limpieza, Vehículos | Categoría visual. | DEMO PREMIUM / POST_MVP si se complejiza |
| Task | subtarea | no especificado | único nivel de anidamiento | No usar en MVP visual salvo decisión posterior. | POST_MVP |
| Task | dependencia | no especificado | bloquea dependiente hasta completar previa | Estado bloqueado. | POST_MVP |
| Task | verificación | no especificado | Opcional; “Completada → Estado final”; no existe estado separado | Conflicto con verification flow MVP del prompt. | REAL conflictivo / faltante |
| Task | plantilla | no especificado | PlantillaTarea; inicialmente solo para Tasks | Instanciar tarea desde plantilla. | POST_MVP / faltan templates MVP |
| Event | estado | no especificado | Programado, Completado, Cancelado | Badge/estado de evento. | REAL parcial |
| Event | tipo/visibilidad | no especificado | Evento del hogar, evento personal | Separar compartidos vs privados. | REAL MÍNIMO |
| Event | temporalidad | no especificado | futuro, pasado, eliminado | Próximos eventos/historial/papelera. | REAL MÍNIMO |
| Event | recurrente | no especificado | este evento, toda la serie | Confirmación de eliminación. | REAL parcial / POST_MVP si complejo |
| Event | papelera | no especificado | 30 días | Feedback de eliminación. | REAL MÍNIMO |
| Event | creador | no especificado | creador puede eliminar; puede cambiar evento del hogar a personal | Permisos visuales. | REAL parcial / POST_MVP en cambio de visibilidad |
| Event | persona/participantes | no especificado | Event referencia Persona | Mostrar personas vinculadas. | REAL parcial / participantes avanzados POST_MVP |
| Event | calendar | no especificado | Event belongs_to Calendar | Ubicación de evento en Calendar. | REAL MÍNIMO |
| Calendar | administra | no especificado | eventos familiares y personales | Vista de calendario/listado. | REAL parcial |
| Calendar | formato exportación | no especificado | iCalendar (.ics) | Exportación. | POST_MVP |
| Home | bloque | no especificado | Próximos Eventos, Tareas, Atención Requerida, Carga Familiar, Briefing | Cards/resúmenes conectados. | DEMO PREMIUM / REAL parcial |
| QuickActions | acción seleccionada | no especificado | crear tarea, crear evento | Abre modal. | DEMO PREMIUM / LOCAL |
| Auditoría | campos | no especificado | autor, fecha, hora, acción, entidad afectada, valor anterior, valor nuevo, origen | No UI Planner directa; restricción. | POST_MVP / restricción real |
| Exportación | formato | no especificado | CSV, JSON, iCalendar | Exportar Task/Event. | POST_MVP |

---

## 10. Edge cases / errores / estados vacíos

| Caso | Comportamiento esperado | Fuente | Clasificación |
| ---- | ----------------------- | ------ | ------------- |
| Tarea completada | Se guarda como historial permanente. | Documento principal, 8.3.1 | REAL MÍNIMO |
| Tarea eliminada | Va a papelera 30 días y luego se elimina definitivamente. | Documento principal, 8.3.1 | REAL MÍNIMO |
| Recuperar tarea eliminada | Recuperable por dueño o Coordinador durante papelera. | Documento principal, 8.3.1 | REAL MÍNIMO |
| Tarea activa | Se guarda mientras el hogar existe; no expira. | Documento principal, 8.3.1 | REAL MÍNIMO |
| Tarea vencida | Es calculada, no estado persistido. | Archivo de comprensión, OUTPUT 1 | REAL parcial / DEMO PREMIUM |
| Tareas completadas no archivables | Completada = histórico; no se archiva. | Documento principal, 8.3.1 | REAL MÍNIMO |
| Contradicción sobre eliminación de completadas | Documento dice cualquier miembro puede eliminar sus propias tareas, pero tabla resumen dice completadas permanentes/no eliminables. | Documento principal, 8.3.1 / 8.3.12; source_map | FALTANTE / riesgo |
| Evento futuro | Se guarda indefinidamente mientras el hogar existe. | Documento principal, 8.3.2 | REAL MÍNIMO |
| Evento pasado | Se guarda como historial permanente. | Documento principal, 8.3.2 | REAL MÍNIMO |
| Evento eliminado | Va a papelera 30 días y luego se elimina definitivamente. | Documento principal, 8.3.2 | REAL MÍNIMO |
| Evento recurrente eliminado como “este evento” | El evento individual va a papelera 30 días. | Documento principal, 8.3.2 | REAL parcial |
| Evento recurrente eliminado como “toda la serie” | Eventos futuros de la serie van a papelera 30 días; pasados se preservan como historial. | Documento principal, 8.3.2 | POST_MVP si excede simple |
| Evento pasado no archivable | Pasado = histórico; no se archiva. | Documento principal, 8.3.2 | REAL MÍNIMO |
| Evento “Postergado” | No existe Postergado. | Archivo de comprensión, OUTPUT 1 | REAL parcial |
| Datos personales de Planner | Solo dueño puede ver por defecto. | Documento principal, 8.2.2 / 8.4.1 | REAL MÍNIMO |
| Datos del hogar de Planner | Todos los miembros pueden ver por defecto. | Documento principal, 8.2.2 / 8.4.2 | REAL MÍNIMO |
| RLS | Si la capa de app falla, la base de datos no entrega datos que el miembro no debería ver. | Documento principal, 8.5.3 | REAL MÍNIMO / restricción |
| Sin datos / empty state | No encontrado. | No aplica | FALTANTE |
| Error de permisos | No encontrado como UX; solo existe restricción RLS. | Documento principal, 8.5.3 | FALTANTE |
| Loading / red / retry | No encontrado. | No aplica | FALTANTE |

---

## 11. Restricciones y prohibiciones detectadas

### Restricciones de privacidad

* Tareas personales: visibles solo para el dueño por defecto.
* Eventos personales: visibles solo para el dueño por defecto.
* Tareas del hogar: visibles para todos los miembros por defecto.
* Eventos del hogar: visibles para todos los miembros por defecto.
* El usuario puede abrir datos personales; el sistema no debe abrirlos automáticamente.
* RLS filtra a nivel de base de datos por permisos del miembro.
* Geni hereda permisos del miembro que consulta.

### Restricciones de retención

* Tareas activas no expiran.
* Tareas completadas son historial permanente.
* Tareas eliminadas van a papelera 30 días y luego borrado definitivo.
* Eventos futuros se guardan indefinidamente mientras el hogar existe.
* Eventos pasados son historial permanente.
* Eventos eliminados van a papelera 30 días y luego borrado definitivo.
* No se archivan tareas ni eventos: completado/pasado = histórico; eliminado = papelera.

### Restricciones de permisos

* Cualquier miembro puede eliminar sus propias tareas.
* Coordinador puede eliminar cualquier tarea.
* Dueño o Coordinador puede recuperar tarea eliminada.
* Creador o Coordinador puede eliminar eventos.
* Adulto puede crear/reasignar tareas y crear eventos, según archivo de comprensión.
* Adolescente puede crear eventos familiares y administrar tareas propias, según archivo de comprensión.
* Empleado Familiar puede completar tareas y no puede crear tareas, según archivo de comprensión.

### Restricciones de navegación

* Planner está en Bottom Nav.
* Home resume y redirige; no administra.
* Más de 4 niveles de navegación es fallo.
* Objetivo: 95% de acciones ≤3 niveles.

### Restricciones arquitectónicas

* Toda acción sobre datos del hogar —crear, modificar, eliminar, compartir, exportar— genera auditoría.
* Auditoría cruda no es visible para miembros.
* Datos del hogar no se venden, no se usan para publicidad, no se cruzan entre hogares y no entrenan modelos externos.
* Cada hogar es una bóveda aislada.
* Exportación de tareas/eventos existe como portabilidad, pero debe quedar POST_MVP para este fragment demo.

### Prohibiciones / límites del MVP visual

* No convertir exportación en obligación del Planner demo.
* No implementar auditoría completa desde este fragment.
* No implementar permisos finos de compartir/cambiar visibilidad salvo como restricción documentada.
* No implementar Geni real para crear/reprogramar tareas.
* No implementar notificaciones reales.
* No implementar subtareas, dependencias, rachas, métricas reales de carga ni plantillas personalizadas.
* No implementar recurrencia compleja, RRULE, EXDATE ni excepciones avanzadas.
* No implementar módulos externos desde relaciones con Planner.

---

## 12. Información faltante

| Falta | Por qué importa para Codex | Impacto |
| ----- | -------------------------- | ------- |
| UI explícita de Planner | Codex necesita saber layout, secciones, botones, tabs y jerarquía visual. | Alto: habrá que usar otra fuente o hacer demo local muy básica. |
| UI explícita de Task List | Faltan cards, filtros, tabs, empty states, acciones por item. | Alto. |
| UI explícita de Create/Edit Task | Faltan inputs, validaciones, labels y botones. | Alto. |
| UI explícita de Event List / Calendar | Faltan vista día/semana/mes, layout de calendario y navegación. | Alto. |
| UI explícita de Create/Edit Event | Faltan inputs de fecha/hora, lugar, título, participantes. | Alto. |
| Datos demo concretos | No hay nombres suficientes de tareas/eventos de demo. | Alto para demo visual convincente. |
| Prioridades | El prompt pide prioridad si aparece, pero este documento no la define. | Medio. |
| Fecha límite de tareas | El prompt pide fecha límite si aparece, pero este documento no la define. | Alto para calendario/tareas de hoy. |
| Asignación de responsable | Task referencia Persona, pero no define campo, UI ni reglas. | Alto. |
| Estados MVP oficiales de Task | Documento/comprensión usa Pendiente/En progreso/Completada/Cancelada; prompt exige pending/completed/awaiting_verification/verified. | Alto: contradicción a resolver en merge. |
| Verification Flow MVP | Comprensión dice que no existe estado separado; prompt exige awaiting_verification y verified. | Alto: no se puede extraer sin contradicción. |
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

---

## 13. Fuente

### Archivo principal

* `HomePlus — SECCION 8 DATA PHILOSOPHY.md`

#### Secciones usadas

* `8.1 Principios de Datos`
* `8.1.3 Minimización — Solo se guarda lo necesario para coordinar`
* `8.1.5 Trazabilidad — Las acciones importantes dejan huella`
* `8.2 Clasificación de Datos`
* `8.2.1 Las Cuatro Categorías`
* `8.2.2 Tabla Completa de Clasificación por Tipo de Dato`
* `8.3 Políticas de Retención`
* `8.3.1 Tareas — Historial`
* `8.3.2 Eventos — Historial`
* `8.3.10 Rachas`
* `8.3.12 Tabla Resumen de Retención`
* `8.4 Privacidad por Defecto`
* `8.4.1 Qué es Privado por Defecto`
* `8.4.2 Qué es Visible por Defecto`
* `8.5.3 Row Level Security (RLS)`
* `8.6 Exportación y Portabilidad`
* `8.6.1 Qué Puede Exportar el Usuario`
* `8.6.2 Formatos de Exportación`
* `8.6.3 Mecanismo de Exportación`
* `8.6.4 Qué Pasa al Cerrar la Cuenta`
* `8.8 Decisiones de Datos Tomadas`

### Archivo de comprensión asociado

* `Seccion 8 Filosofia de la Informacion.txt`

#### Bloques usados

* `OUTPUT 1 — ENTITIES`
  * Task.
  * Recurrencia.
  * Verificación.
  * PlantillaTarea.
  * Responsabilidad.
  * Calendar.
  * Event.
  * Home.
  * Atención Requerida.
  * CargaFamiliar.
  * QuickActions.
  * BottomNav.
  * Auditoria.
  * Exportacion.
  * RLS.
* `OUTPUT 2 — RELATIONSHIPS`
  * Planner contains Task.
  * Planner contains Calendar.
  * Task references Persona.
  * Event belongs_to Calendar.
  * Event references Persona.
  * Briefing references Task/Event.
  * Auditoria tracks Task/Event.
  * Exportacion exports_to Task/Event.
  * BottomNav navigates_to Planner.
* `OUTPUT 4 — DATA FLOWS`
  * QuickActions (+) → Formulario modal de creación.
  * Usuario solicita exportación → archivo CSV/JSON/iCalendar.
* `OUTPUT 5 — BUSINESS RULES`
  * Papelera universal de 30 días.
  * Tareas completadas y eventos pasados como historial permanente.
  * Recurrencias generan nuevas instancias de tareas.
  * Una tarea posee una única responsabilidad principal.
  * Dependencias bloquean tareas dependientes.
  * RLS filtra por permisos.
  * Home resume y redirige.
  * Navegación ≤3 niveles como objetivo.
  * QuickActions y BottomNav.
* `OUTPUT 6 — ARCHITECTURAL DECISIONS`
  * D-01 Historial de tareas y eventos permanente.
  * D-08 Papelera de 30 días para eliminaciones.

### Source map generado previamente

* `source_map_SECCION_8_DATA_PHILOSOPHY.md`

#### Secciones usadas

* `4.7 PLANNER`
* `4.8 TASKS`
* `4.9 EVENTS`
* `4.10 CALENDAR`
* `4.11 HOME`, solo como dependencia directa de Planner.
* `5. Mapa de entidades`
* `6. Mapa de relaciones`
* `7. Mapa de estados`
* `8. Mapa de permisos`
* `9. Mapa de flujos`
* `10. Mapa de APIs`
* `11. Mapa de UI`
* `13. Restricciones arquitectónicas detectadas`
* `15. Información POST_MVP detectada`
* `17. Contradicciones detectadas`
* `18. Información faltante`

