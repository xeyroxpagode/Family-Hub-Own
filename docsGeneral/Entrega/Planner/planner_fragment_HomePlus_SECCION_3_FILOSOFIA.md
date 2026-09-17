# PLANNER fragment — HomePlus — SECCION 3 FILOSOFIA

## 1. Rol del módulo en la demo

Información explícita o claramente presente en este documento:

* Planner aparece como parte del núcleo operativo de HomePlus.
* El archivo de comprensión describe `Planner` como el módulo que administra `Tasks`, `Calendar` y `Goals`, con responsabilidades como eje organizador.
* Para este fragment, `Goals` queda como POST_MVP y no se desarrolla.
* Las tareas del hogar y el calendario familiar forman parte del núcleo obligatorio de coordinación.
* El documento establece que HomePlus no permite usar “solo el calendario” ni desactivar tareas si se forma parte del hogar.
* Las tareas y el calendario son áreas de transparencia forzada:
  * todos ven quién hizo qué;
  * todos ven quién no cumplió;
  * todos ven cómo se distribuye la carga;
  * todos ven los compromisos del calendario compartido.
* Planner ayuda a hacer visible el esfuerzo familiar y la coordinación diaria.
* HomePlus no presenta Planner como una app de productividad neutra; tiene postura sobre asimetría, evasión e incumplimiento.
* Geni puede alertar, insistir y escalar problemas de tareas, pero no reemplaza la conversación humana.
* Geni no reasigna tareas automáticamente.
* Geni no completa tareas automáticamente.
* Geni no cambia eventos del calendario sin confirmación humana.
* Las responsabilidades no son un dominio independiente; el archivo de comprensión las ubica como propiedad/eje organizador dentro de Tasks.
* Calendar vive dentro de Planner según el archivo de comprensión.
* Bottom Navigation incluye `Planner` como tab principal: `Home`, `People`, `+`, `Planner`, `More`.
* Home resume información de Planner, pero no administra Planner.

---

## 2. Información encontrada para las 7 condiciones MVP

### 2.1 Pantalla visualmente terminada

#### Pantallas / secciones / componentes detectados

* `Planner` como tab principal en Bottom Navigation.
* `Tasks` como parte del núcleo operativo de Planner.
* `Calendar` como parte del núcleo operativo de Planner.
* `Task` como entidad visualizable por estado, responsable, cumplimiento e incumplimiento.
* `Calendar` como espacio de eventos familiares y compromisos compartidos.
* Dashboard o visualización de distribución de tareas semanal/mensual.
* Datos siempre visibles en dashboards de coordinación:
  * distribución de tareas semanal/mensual;
  * próximos vencimientos.
* Home puede mostrar datos provenientes de Planner:
  * estado de tareas completadas/pendientes;
  * tareas vencidas en Atención Requerida;
  * próximos eventos del calendario.
* `CargaFamiliar` aparece como widget de Home para mostrar distribución de carga de tareas.
* `ProximosEventos` aparece como widget de Home con próximos eventos del calendario.
* `AtencionRequerida` aparece como bloque de Home para elementos urgentes, incluyendo tareas vencidas.
* Quick Actions aparece como botón `+` central en Bottom Nav; el documento no detalla acciones específicas de Planner, pero el archivo de comprensión lo define como panel flotante con Geni como slot fijo.
* SearchGlobal indexa Planner según archivo de comprensión.

#### Jerarquía visual / navegación detectada

* Bottom Nav V1 congelada:
  * Home;
  * People;
  * `+`;
  * Planner;
  * More.
* Los módulos Tier 1 tienen acceso directo; Tasks y Calendar aparecen como núcleo diario.
* Home es pantalla inicial inmutable.
* Home resume, no administra: cada dato debe conducir al módulo que lo administra.
* Máximo de navegación detectado: no más de 4 niveles; objetivo de 95% de acciones en 3 niveles o menos.
* Mobile First.
* Tablet: 2 columnas.
* Desktop sidebar: pendiente de confirmación.

#### Estados visibles detectados

* Task:
  * Pendiente;
  * En progreso;
  * Completada;
  * Cancelada.
* Event:
  * Programado;
  * Completado;
  * Cancelado.
* Vencida no es un estado de Task; se calcula automáticamente.
* Para eventos, no existe estado `Postergado`; postergar equivale a modificar fecha.
* Estados visuales por incumplimiento de tarea:
  * por vencer;
  * vencida;
  * primera falta;
  * segunda falta o patrón emergente;
  * tercera falta o patrón confirmado.
* Estados visuales de escalamiento de tarea:
  * recordatorio privado al responsable;
  * alerta privada al responsable;
  * alerta al coordinador;
  * exposición del patrón a toda la familia.

#### Textos / labels encontrados que pueden servir para demo visual

* “Tu tarea ‘lavar los platos’ vence en 2 horas.”
* “Tu tarea ‘lavar los platos’ venció hace 3 horas y sigue sin completarse.”
* “Tomás no completó ‘lavar los platos’ por segunda vez esta semana. ¿Querés reasignar la tarea o hablar con él?”
* “Tomás no completó 8 de las últimas 10 tareas asignadas.”
* “La distribución de carga esta semana fue: Valeria 15 tareas, Tomás 2, Roberto 1.”
* “Valeria, completaste 15 de 18 tareas esta semana — el 83% del esfuerzo total del hogar. Tomás completó 2, Roberto 1.”
* “La familia completó las 18 tareas asignadas esta semana. Es la primera vez en 3 semanas que todas las tareas se cumplen. 💜”
* “La distribución de tareas esta semana fue: Valeria 83%, Tomás 11%, Roberto 6%.”
* “La distribución de tareas viene cambiando en las últimas 3 semanas. Semana 1: 60-40. Semana 2: 65-35. Semana 3: 70-30. La carga sobre Valeria está aumentando.”
* “Tomás está en época de exámenes hasta el 15 de junio. Su carga de tareas se redujo temporalmente. Roberto y Valeria están cubriendo las tareas redistribuidas.”
* “Tomás declaró disponibilidad de 1-2hs pero no completó ninguna de las 3 tareas asignadas en las últimas 2 semanas.”

#### Iconos / emojis mencionados

* 💜 para reconocimiento.
* ⚠️ para alertas urgentes.
* 🎯 para logros cumplidos.
* El documento indica no usar 3+ emojis ni emojis genéricos de celebración como 🎉🎊🥳.

---

### 2.2 Datos creíbles

#### Personas / miembros usados en ejemplos

* Valeria.
* Tomás.
* Roberto.
* Familia García.

#### Tareas / responsabilidades usadas como ejemplos

* “lavar los platos”.
* “sacar la basura”.
* Tareas del hogar.
* Responsabilidades asignadas.
* Tarea crítica.
* Tareas mínimas asignadas.
* Próximos vencimientos.

#### Distribución y métricas de tareas encontradas

* Valeria 15 tareas.
* Tomás 2 tareas.
* Roberto 1 tarea.
* 15 de 18 tareas completadas.
* 83% del esfuerzo total del hogar.
* Tomás no completó 8 de las últimas 10 tareas asignadas.
* Familia completó 18 tareas asignadas en una semana.
* Primera vez en 3 semanas que todas las tareas se cumplen.
* Valeria 88% / Tomás 12%.
* Valeria 57% / Tomás 43%.
* Tendencia semanal:
  * semana 1: 60-40;
  * semana 2: 65-35;
  * semana 3: 70-30.
* Umbral de alerta por asimetría: diferencia mayor al 40%.
* Patrón confirmado: 3+ semanas consecutivas.

#### Disponibilidad / carga contextual encontrada

* Disponibilidad 1-2hs por día.
* Disponibilidad 3-4hs por día.
* Disponibilidad 5+hs por día.
* Valeria: trabaja 10hs + estudia → disponibilidad 1-2hs por día.
* Tomás: trabajo híbrido 6hs → disponibilidad 3-4hs por día.
* Roberto: jubilado en casa → disponibilidad 5+hs por día.
* Época de exámenes.
* Proyecto laboral intenso.
* Enfermedad / gripe.
* Cuidado de alguien.
* Capacidad física/mental.
* Contexto familiar.

#### Asignación semanal de ejemplo

* 18 tareas semanales.
* Valeria: 3 tareas livianas/rápidas.
* Tomás: 6 tareas medianas.
* Roberto: 9 tareas, incluyendo tareas que requieren más tiempo.
* Distribución numérica: 17% / 33% / 50%.
* Interpretación del documento: desigual en cantidad, equitativa en esfuerzo real.

#### Eventos / Calendar

* Calendario familiar.
* Compromisos del calendario compartido.
* Horarios de todos.
* No se encontraron ejemplos concretos de eventos con título, fecha u hora.
* No se encontraron datos demo específicos para vista día/semana/mes.

#### Templates

* El archivo de comprensión menciona `Plantilla` como feature de Planner, inicialmente solo para Tasks.
* No se encontraron en este documento las templates exactas: Limpieza, Compras, Mascotas, Medicación, Estudios, Pagos.
* No se encontraron ejemplos concretos de templates predefinidas dentro del documento principal.

---

### 2.3 Acción interactiva

Acciones visibles o conceptuales detectadas:

* Ver tareas del hogar.
* Ver quién hizo qué.
* Ver quién no cumplió.
* Ver distribución de carga.
* Completar tarea.
* Consultar calendario familiar.
* Ver compromisos del calendario compartido.
* Modificar fecha de evento para postergar.
* Confirmar cambios de evento cuando Geni propone o intenta modificar.
* Ver próximos vencimientos.
* Actualizar disponibilidad personal.
* Silenciar notificaciones después de las 22hs.
* Configurar tipos de alertas recibidas: urgentes, diarias, semanales.
* El coordinador puede decidir si reasigna una tarea o habla con el responsable cuando Geni alerta.
* Adulto puede crear/reasignar tareas según archivo de comprensión.
* Adolescente puede crear eventos familiares según archivo de comprensión.
* Empleado Familiar puede completar tareas asignadas, comentar tareas y adjuntar evidencia; esto queda POST_MVP / dependencia externa, no desarrollar.
* Geni puede sugerir responsable, pero no reasignar automáticamente.
* Geni puede alertar, recordar, insistir y escalar.
* SearchGlobal indexa Planner y ejecuta acciones según archivo de comprensión, pero no se detallan acciones específicas de búsqueda para Planner.

Clasificación de acciones:

* Ver/listar tareas: REAL MÍNIMO, aunque no hay UI detallada.
* Completar tarea: REAL MÍNIMO.
* Cambiar estado visible de tarea: REAL MÍNIMO si deriva de completar/cancelar, pero no se define contrato.
* Ver calendario/eventos: REAL MÍNIMO.
* Editar fecha de evento/postergar: REAL MÍNIMO como concepto, sin contrato.
* Crear/reasignar tarea por Adulto: REAL MÍNIMO si se usa el permiso encontrado, sin matriz completa.
* Crear evento por Adolescente: REAL MÍNIMO si se usa el permiso encontrado, sin matriz completa.
* Escalamiento de Geni: DEMO PREMIUM / POST_MVP; puede simularse visualmente, no como IA real ni notificaciones reales.
* Actualizar disponibilidad y ajuste dinámico de carga: POST_MVP / DEMO PREMIUM si se simula localmente.
* Comentarios, adjuntos y evidencia: POST_MVP.
* SearchGlobal sobre Planner: POST_MVP o demo visual si ya existe buscador.

---

### 2.4 Feedback inmediato

Feedback UX encontrado o inferible directamente desde el documento:

* Recordatorio privado al responsable antes de vencer una tarea.
* Alerta privada al responsable cuando una tarea venció.
* Alerta al coordinador por segunda falta o patrón emergente.
* Notificación de que el coordinador fue alertado.
* Exposición del patrón a toda la familia.
* Datos siempre visibles en dashboard sin push constante.
* Alertas activas solo cuando cruzan umbrales.
* Feedback factual de logro:
  * “La familia completó las 18 tareas asignadas esta semana. Es la primera vez en 3 semanas que todas las tareas se cumplen. 💜”
* Feedback de reconocimiento individual:
  * “Valeria, completaste 15 de 18 tareas esta semana — el 83% del esfuerzo total del hogar.”
* Feedback de asimetría:
  * “La distribución de tareas esta semana fue: Valeria 83%, Tomás 11%, Roberto 6%.”
* Feedback de tendencia:
  * “La distribución de tareas viene cambiando en las últimas 3 semanas...”
* Tono requerido:
  * neutral;
  * útil;
  * sin juicio;
  * factual;
  * cálido pero no efusivo;
  * sin adjetivos valorativos.

No encontrado:

* loading.
* skeleton.
* spinner.
* toast explícito.
* retry.
* error técnico.
* estado de red.
* confirmación visual de guardado.
* disabled state.
* empty state específico para Planner.

---

### 2.5 Service aislado

No se encontró un service explícito ni nombres de funciones.

Pistas útiles para un service aislado de demo/local:

* Debe listar tareas por estado visible:
  * pendiente;
  * en progreso;
  * completada;
  * cancelada;
  * vencida calculada.
* Debe exponer estado de tareas completadas/pendientes a Home.
* Debe exponer tareas vencidas a Atención Requerida.
* Debe exponer distribución de carga a CargaFamiliar si se simula.
* Debe listar eventos del Calendar.
* Debe exponer próximos eventos a Home.
* Debe poder completar una tarea.
* Debe poder modificar fecha de evento si se usa “postergar = modificar fecha”.
* Debe respetar que Geni no completa tareas automáticamente.
* Debe respetar que Geni no reasigna tareas automáticamente.
* Debe respetar que Geni no cambia eventos sin confirmación humana.
* Debe tratar “vencida” como cálculo, no como estado persistido.
* Debe tratar Tasks y Calendar dentro del contexto del hogar activo, aunque el documento no define API.
* Puede simular escalamiento como datos locales/visuales, no notificaciones reales.

No encontrado:

* Endpoints.
* Request/response.
* Nombre de service.
* Storage local.
* AsyncStorage.
* Tabla real.
* Contrato de sincronización.

---

### 2.6 Navegación coherente

Información encontrada:

* Bottom Navigation V1:
  * Home;
  * People;
  * `+`;
  * Planner;
  * More.
* Planner tiene acceso directo desde Bottom Nav.
* Home puede navegar a Planner.
* Home puede navegar a Calendar.
* Calendar vive dentro de Planner.
* Goals vive dentro de Planner, pero queda POST_MVP/no desarrollar.
* Responsabilidades no son dominio independiente; se tratan dentro de Tasks.
* Quick Actions es el botón `+` central en Bottom Nav.
* Geni tiene acceso principal vía Quick Actions, slot fijo siempre primero.
* SearchGlobal indexa Planner.
* Home es siempre la pantalla inicial; el usuario no puede cambiarlo.
* El modelo de navegación debe evitar más de 4 niveles.
* Objetivo: 95% de acciones en 3 niveles o menos.
* More no contiene dashboards; Planner no vive en More.

Dependencia externa / no desarrollar en este fragment:

* People/Members aporta Persona para asignar tareas o participar en eventos.
* Household/Membership aporta hogar activo y separación por hogar.
* Home muestra resumen de Planner pero no administra.
* Quick Actions puede abrir acciones relacionadas con Planner, pero el documento no lista “crear tarea” o “crear evento” explícitamente.

---

### 2.7 Conexión con Home o More

#### Home

Información encontrada:

* Task aparece en Home.
* El estado de tarea completada/pendiente actualiza widgets de tareas en Home.
* Tarea vencida va a Atención Requerida.
* Calendar alimenta ProximosEventos.
* Home navega a Planner.
* Home navega a Calendar.
* CargaFamiliar muestra distribución de carga de tareas.
* GeniPlanner analiza carga familiar para mostrarla en Home, pero esto queda DEMO PREMIUM/POST_MVP, no IA real.
* Home resume, no administra.

Clasificación:

* Próximos eventos: REAL MÍNIMO como salida de Calendar hacia Home.
* Tareas pendientes/vencidas: REAL MÍNIMO como salida de Tasks hacia Home.
* CargaFamiliar: DEMO PREMIUM / MOCK.
* Briefing con datos de Planner: DEMO PREMIUM / MOCK.
* ActividadFamiliar: no desarrollar en Planner.

#### More

Información encontrada:

* Planner no vive en More.
* More contiene herramientas especializadas y no dashboards.
* Planner está en Bottom Nav como tab directo.

#### Quick Actions

Información encontrada:

* QuickActions es botón `+` central en Bottom Nav.
* QuickActions tiene panel flotante.
* Geni es slot fijo.
* No se encontraron acciones explícitas de Planner dentro de Quick Actions en este documento.

---

## 3. Clasificación para implementación

### REAL MÍNIMO

* Planner como tab principal en Bottom Nav.
* Planner contiene Tasks y Calendar.
* Calendar contiene Events.
* Task como entidad visible del núcleo operativo.
* Event como entidad visible del calendario familiar.
* Las tareas del hogar son visibles para todos los miembros del hogar.
* El calendario familiar es visible para los miembros del hogar.
* No se puede ocultar una tarea pendiente/completada asignada dentro de la coordinación del hogar.
* No se puede ocultar un evento del calendario compartido si afecta coordinación familiar.
* Ver/listar tareas.
* Completar tarea.
* Ver tareas pendientes/completadas/canceladas/en progreso si se usan estados encontrados.
* Calcular tarea vencida, sin guardarla como estado.
* Ver calendario familiar.
* Ver próximos eventos.
* Editar fecha de evento para postergar, si se incluye edición mínima.
* Geni no completa tareas automáticamente.
* Geni no reasigna tareas automáticamente.
* Geni no cambia eventos sin confirmación humana.
* Home recibe estado de tareas completadas/pendientes.
* Home recibe tareas vencidas para Atención Requerida.
* Home recibe próximos eventos desde Calendar.
* Responsabilidad puede usarse como agrupador de Task si ya existe en otro fragment, pero no como módulo independiente.
* Persona/Membership como dependencia para asignación o participación, sin desarrollar People/Auth/Household.

### DEMO PREMIUM

* Visualización de distribución de carga familiar.
* Card de CargaFamiliar en Home con porcentajes/datos dummy.
* Escalamiento visual de tareas en 4 niveles.
* Mensajes de Geni sobre tareas como mock/local.
* Reconocimiento factual con tono cálido.
* Asimetría por porcentajes:
  * 83% / 11% / 6%;
  * 88% / 12%;
  * 57% / 43%.
* Tendencia de carga por semanas.
* Simular recordatorios privados y alertas como estados visuales, no push real.
* Simular sugerencia de responsable sin ejecutar reasignación automática.
* Simular ajuste de carga por disponibilidad, sin IA real.
* Simular tarjetas de próximas tareas/vencimientos para que Planner parezca vivo.
* Simular SearchGlobal indexando Planner si ya hay UI de búsqueda.

### LOCAL / ASYNCSTORAGE / MOCK SERVICE

Información que puede resolverse localmente o con service demo, sin backend real, porque el documento no trae contrato API:

* Lista de tareas.
* Estados locales de tarea.
* Completar tarea.
* Vencimiento calculado.
* Métricas de distribución de tareas.
* Mensajes de feedback de tarea.
* Lista de eventos.
* Próximos eventos.
* Modificar fecha de evento localmente.
* Simular escalamiento por conteo local de incumplimientos.
* Simular carga familiar con datos de ejemplo del documento.
* Exponer resumen local a Home.

### POST_MVP

* Escalamiento real de Geni en 4 niveles.
* Push/notificaciones reales.
* Detección real de patrones por IA.
* Equidad contextual dinámica automática.
* Sugerencia real de responsable por GeniPlanner.
* Reprogramación inteligente.
* Subtareas.
* Dependencias entre tareas.
* Comentarios en tareas.
* Adjuntos/evidencia en tareas.
* Timeline de tareas.
* Auditoría completa.
* Recurrencia avanzada.
* Goals/Hitos dentro de Planner.
* Participantes avanzados de Event.
* Álbum automático desde evento finalizado.
* Integraciones donde otros dominios generan tareas.
* Multi-hogar avanzado como selector/contexto visible si no está resuelto por Auth/Household.

### IGNORAR

* No desarrollar otros dominios desde este fragment.
* No desarrollar IA real.
* No desarrollar automatizaciones reales.
* No desarrollar notificaciones reales.
* No desarrollar auditoría completa.
* No desarrollar módulos externos que puedan generar tareas.
* No desarrollar storage/OCR/archivos desde Planner.

---

## 4. UI extraíble

| Pantalla/Componente | Qué muestra | Acciones | Estados UX | Navegación | Clasificación |
| ------------------- | ----------- | -------- | ---------- | ---------- | ------------- |
| Planner tab | Entrada principal al núcleo Planner | Abrir Planner | No especificado | Bottom Nav: Home / People / + / Planner / More | REAL MÍNIMO |
| Tasks dentro de Planner | Tareas del hogar, responsable, cumplimiento/incumplimiento, distribución | Ver/listar, completar, posiblemente crear/reasignar si rol lo permite | Pendiente, En progreso, Completada, Cancelada, vencida calculada | Desde Planner; Home puede conducir a tareas | REAL MÍNIMO |
| Calendar dentro de Planner | Calendario familiar, compromisos compartidos, eventos | Ver eventos; modificar fecha si se posterga | Programado, Completado, Cancelado | Desde Planner; Home puede conducir a Calendar | REAL MÍNIMO |
| Dashboard de distribución de tareas | Distribución semanal/mensual de carga | Consultar datos | Datos siempre visibles; alertas solo por umbral | Planner o Home/CargaFamiliar | DEMO PREMIUM |
| Card de tarea vencida / Atención Requerida | Tarea crítica o vencida | Abrir detalle de tarea; completar si se permite | Vencida calculada; urgente | Home → Planner/Task | REAL MÍNIMO / DEMO PREMIUM |
| CargaFamiliar | Porcentajes y conteo de tareas por persona | Ver distribución | Asimetría visible; alerta si supera umbral | Home → Planner | DEMO PREMIUM / MOCK |
| ProximosEventos | Eventos próximos del calendario | Abrir calendario/evento | Próximo / programado | Home → Calendar/Planner | REAL MÍNIMO |
| Quick Actions panel | Panel flotante desde `+`; Geni slot fijo | No se encontraron acciones específicas de Planner | No especificado | Bottom Nav centro | DEMO PREMIUM si se usa para Planner |
| SearchGlobal | Búsqueda universal indexando Planner | Buscar/ejecutar acciones | No especificado | Acceso global no detallado | POST_MVP / DEMO PREMIUM |
| Vista día/semana/mes | No encontrada en este documento | No encontrado | No encontrado | No encontrado | Información faltante |
| Crear/Edit Task UI | No encontrada en este documento | No encontrado | No encontrado | No encontrado | Información faltante |
| Crear/Edit Event UI | No encontrada en este documento | No encontrado | No encontrado | No encontrado | Información faltante |
| Empty state Planner | No encontrado | No encontrado | No encontrado | No encontrado | Información faltante |

---

## 5. Datos demo extraíbles

| Dato/ejemplo | Módulo | Uso posible | Fuente | Clasificación |
| ------------ | ------ | ----------- | ------ | ------------- |
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
| Umbral de asimetría > 40% | Tasks / Alerts | Activar alerta demo | Documento principal, Polaridad 4 | DEMO PREMIUM / POST_MVP |
| Deuda interna > 30 días | No Planner | No usar para Planner salvo patrón de umbrales visuales | Documento principal, Polaridad 4 | Dependencia externa / no desarrollar |
| Tarea crítica vencida | Tasks / Atención Requerida | Card urgente | Documento principal, Polaridad 4 | REAL MÍNIMO / DEMO PREMIUM |
| 3+ semanas consecutivas | Tasks / Escalamiento | Patrón confirmado | Documento principal, Polaridad 4/7 | DEMO PREMIUM / POST_MVP |
| 1-2hs / 3-4hs / 5+hs | Tasks / Disponibilidad | Filtros o chips demo de disponibilidad | Documento principal, Polaridad 5 | DEMO PREMIUM / POST_MVP |
| Valeria trabaja 10hs + estudia | Tasks | Contexto de carga | Documento principal, Polaridad 5 | DEMO PREMIUM / POST_MVP |
| Tomás trabajo híbrido 6hs | Tasks | Contexto de carga | Documento principal, Polaridad 5 | DEMO PREMIUM / POST_MVP |
| Roberto jubilado en casa | Tasks | Contexto de carga | Documento principal, Polaridad 5 | DEMO PREMIUM / POST_MVP |
| Época de exámenes hasta el 15 de junio | Tasks | Ajuste de carga visual | Documento principal, Polaridad 5 | DEMO PREMIUM / POST_MVP |
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

* No se encontraron títulos de eventos.
* No se encontraron fechas/horas concretas de eventos.
* No se encontraron templates predefinidas exactas: Limpieza, Compras, Mascotas, Medicación, Estudios, Pagos.
* No se encontraron prioridades concretas de tarea.
* No se encontraron categorías concretas de tareas salvo ejemplos de tareas domésticas.
* No se encontraron datos para vista día/semana/mes.
* No se encontraron estados vacíos de Planner.

---

## 6. Acciones extraíbles

| Acción | Usuario/Rol | Resultado visible | Real/Mock/Post-MVP | Fuente |
| ------ | ----------- | ----------------- | ------------------ | ------ |
| Ver tareas del hogar | Miembros del hogar | Todos ven quién hizo qué, quién no cumplió y carga distribuida | REAL MÍNIMO | Documento principal, Polaridad 1 |
| Completar tarea | Responsable / miembro asignado | Tarea pasa a completada; Home puede actualizar widgets | REAL MÍNIMO | Documento principal, Polaridad 2; comprensión OUTPUT 4 |
| Ver tarea vencida | Miembros / responsable / Home | Tarea vencida visible; puede aparecer en Atención Requerida | REAL MÍNIMO | Documento principal, Polaridad 4; comprensión OUTPUT 4 |
| Recordar tarea antes de vencer | Geni mock / sistema visual | Mensaje privado al responsable | DEMO PREMIUM / POST_MVP | Documento principal, Polaridad 2 |
| Alertar tarea vencida | Geni mock / sistema visual | Mensaje privado al responsable | DEMO PREMIUM / POST_MVP | Documento principal, Polaridad 2 |
| Escalar al coordinador | Geni mock / sistema visual | Coordinador ve incumplimiento y opciones | DEMO PREMIUM / POST_MVP | Documento principal, Polaridad 2 |
| Exponer patrón a familia | Geni mock / sistema visual | Toda la familia ve patrón de incumplimiento | DEMO PREMIUM / POST_MVP | Documento principal, Polaridad 2 |
| Crear/reasignar tareas | Adulto | Adulto puede crear/reasignar tareas | REAL MÍNIMO parcial, permisos incompletos | Archivo de comprensión, OUTPUT 1/roles |
| Sugerir responsable | GeniPlanner | Sugerencia de asignación óptima sin ejecución automática | DEMO PREMIUM / POST_MVP | Archivo de comprensión, OUTPUT 4 |
| Reasignar automáticamente tarea | Geni | Prohibido; no debe ocurrir | Restricción REAL | Documento principal, Polaridad 2 |
| Completar automáticamente tarea | Geni | Prohibido; no debe ocurrir | Restricción REAL | Documento principal, Polaridad 2 |
| Ver calendario familiar | Miembros del hogar | Compromisos compartidos visibles | REAL MÍNIMO | Documento principal, Polaridad 1/6 |
| Crear evento familiar | Adolescente | Evento familiar creado | REAL MÍNIMO parcial, permisos incompletos | Archivo de comprensión, OUTPUT 1/roles |
| Cambiar evento sin confirmación humana | Geni | Prohibido; no debe ocurrir | Restricción REAL | Documento principal, Polaridad 2 |
| Postergar evento | Usuario autorizado no especificado | Se modifica la fecha; no existe estado Postergado | REAL MÍNIMO parcial | Archivo de comprensión, OUTPUT 5/source map |
| Ver próximos eventos | Miembro / Home | Home muestra ProximosEventos | REAL MÍNIMO | Archivo de comprensión, OUTPUT 1/2/4 |
| Actualizar disponibilidad | Miembro | Geni ajusta carga esperada según disponibilidad | POST_MVP / DEMO PREMIUM | Documento principal, Polaridad 5 |
| Completar tareas asignadas | Empleado Familiar | Marca tarea asignada como completada | POST_MVP / dependencia externa | Documento principal, Ejemplo B |
| Comentar tarea | Empleado Familiar | Agrega comentario | POST_MVP | Documento principal, Ejemplo B |
| Adjuntar evidencia | Empleado Familiar | Agrega evidencia | POST_MVP | Documento principal, Ejemplo B |

---

## 7. Home / More / Quick Actions

### Home

* Home puede mostrar estado de tareas completadas/pendientes.
* Home puede mostrar tareas vencidas en Atención Requerida.
* Home puede mostrar próximos eventos del calendario.
* Home puede mostrar CargaFamiliar como distribución de carga de tareas.
* Home navega a Planner.
* Home navega a Calendar.
* Home resume Planner; no administra Planner.
* La card/widget CargaFamiliar debe tratarse como DEMO PREMIUM / MOCK si se usa sin IA real.
* Briefing puede incluir frases basadas en tareas/eventos como DEMO PREMIUM / MOCK, sin IA real.

### More

* Planner no vive en More.
* More no contiene dashboards.
* Planner tiene acceso directo desde Bottom Nav.

### Quick Actions

* Quick Actions existe como botón `+` central.
* Quick Actions abre panel flotante.
* Geni es slot fijo en Quick Actions.
* No se encontraron acciones explícitas de Planner dentro de Quick Actions.
* Si se usa Quick Actions para Planner en demo, debe marcarse como DEMO PREMIUM o venir de otro documento.

---

## 8. Backend/API detectado

No se encontró contrato API explícito en este documento.

| Endpoint/Acción | Método | Ruta | Request | Response | Estado | Clasificación |
| --------------- | ------ | ---- | ------- | -------- | ------ | ------------- |
| Listar tareas | No especificado | No especificado | No especificado | No especificado | Acción/módulo mencionado sin contrato API | REAL MÍNIMO parcial |
| Completar tarea | No especificado | No especificado | No especificado | No especificado | Acción mencionada sin contrato API | REAL MÍNIMO parcial |
| Crear tarea | No especificado | No especificado | No especificado | No especificado | Permiso mencionado para Adulto, sin contrato API | REAL MÍNIMO parcial |
| Reasignar tarea | No especificado | No especificado | No especificado | No especificado | Permiso mencionado para Adulto; Geni no puede hacerlo automáticamente | REAL MÍNIMO parcial |
| Listar eventos | No especificado | No especificado | No especificado | No especificado | Calendar/Event mencionados sin contrato API | REAL MÍNIMO parcial |
| Crear evento | No especificado | No especificado | No especificado | No especificado | Permiso mencionado para Adolescente, sin contrato API | REAL MÍNIMO parcial |
| Editar evento / modificar fecha | No especificado | No especificado | No especificado | No especificado | Postergar = modificar fecha; sin contrato API | REAL MÍNIMO parcial |
| Eliminar/cancelar evento | No especificado | No especificado | No especificado | No especificado | Estado Cancelado encontrado; sin contrato API | REAL MÍNIMO parcial |
| Exponer tareas a Home | No especificado | No especificado | No especificado | No especificado | Data flow encontrado | REAL MÍNIMO parcial |
| Exponer próximos eventos a Home | No especificado | No especificado | No especificado | No especificado | Data flow encontrado | REAL MÍNIMO parcial |

---

## 9. Modelo de datos detectado

| Entidad | Campo | Tipo si aparece | Estado/valores | Uso visual o interacción | Clasificación |
| ------- | ----- | --------------- | -------------- | ------------------------ | ------------- |
| Planner | contiene | no especificado | Task, Calendar, Goal | Agrupar Tasks y Calendar dentro de Planner | REAL MÍNIMO |
| Task | estado | no especificado | Pendiente, En progreso, Completada, Cancelada | Badges/listas/filtros de tarea | REAL MÍNIMO con riesgo |
| Task | responsable | no especificado | Persona/miembro asignado | Mostrar asignación y recordatorios | REAL MÍNIMO |
| Task | vencimiento | no especificado | Por vencer / vencida calculada | Próximos vencimientos, Atención Requerida | REAL MÍNIMO |
| Task | completada/pendiente | no especificado | completada, pendiente | Actualizar Home y widgets | REAL MÍNIMO |
| Task | crítica | no especificado | tarea crítica | Alertas/Atención Requerida | DEMO PREMIUM / REAL parcial |
| Task | responsabilidad principal | no especificado | única Responsabilidad principal | Agrupación interna de tareas | REAL parcial / POST_MVP según alcance |
| Task | subtareas | no especificado | un único nivel; no anidadas | Progreso automático si se implementara | POST_MVP |
| Task | dependencias | no especificado | bloqueada si previa no se completa | Estado bloqueado | POST_MVP |
| Task | recurrencia | no especificado | genera nuevas instancias, preserva historial | Tareas recurrentes | POST_MVP en este documento |
| Task | verificación | no especificado | opcional; “Completada = estado final” según comprensión | Verification flow, contradictorio con MVP esperado | REAL parcial / riesgo |
| Task | comentarios | no especificado | comentario en tareas | Comentarios visuales | POST_MVP |
| Task | adjuntos/evidencia | no especificado | imágenes, PDFs, audio | Adjuntar evidencia | POST_MVP |
| Task | timeline | no especificado | línea temporal de actividad | Historial visual | POST_MVP |
| Plantilla | aplica a | no especificado | Task | Templates de tareas | REAL parcial, faltan templates exactas |
| Responsabilidad | miembros asignados | no especificado | no especificado | Agrupar tareas / responsables | POST_MVP o REAL parcial si se usa como atributo |
| Calendar | contiene | no especificado | Event | Vista de calendario | REAL MÍNIMO |
| Event | estado | no especificado | Programado, Completado, Cancelado | Badges/estado de evento | REAL MÍNIMO |
| Event | fecha | no especificado | modificar fecha equivale a postergar | Editar/postergar evento | REAL MÍNIMO parcial |
| Event | participantes | no especificado | Persona | Participación en evento | POST_MVP si es avanzado |
| ProximosEventos | origen | no especificado | Calendar/Event | Widget Home | REAL MÍNIMO |
| CargaFamiliar | distribución | no especificado | porcentajes / conteo de tareas | Widget Home / dashboard demo | DEMO PREMIUM / MOCK |
| Persona | disponibilidad | no especificado | 1-2hs, 3-4hs, 5+hs | Ajuste de carga demo | POST_MVP / DEMO PREMIUM |
| Persona | carga externa | no especificado | exámenes, proyecto laboral, cuidado de alguien | Ajuste contextual demo | POST_MVP / DEMO PREMIUM |
| Persona | capacidad física/mental | no especificado | limitaciones físicas/salud | Ajuste contextual demo | POST_MVP / DEMO PREMIUM |

Notas de conflicto:

* Los estados encontrados para Task no coinciden con los estados MVP esperados en otros prompts: `pending`, `completed`, `awaiting_verification`, `verified`.
* Este documento no provee traducción técnica entre estados en español y enum final.
* Este documento dice que `vencida` no es estado; debe calcularse.
* Este documento indica `Completada = estado final` para Verificacion, lo cual contradice un flujo con `awaiting_verification` y `verified`.

---

## 10. Edge cases / errores / estados vacíos

| Caso | Comportamiento esperado | Fuente | Clasificación |
| ---- | ----------------------- | ------ | ------------- |
| Tarea vencida | No es estado persistido; se calcula automáticamente | Archivo de comprensión, OUTPUT 5 / source_map | REAL MÍNIMO |
| Evento postergado | No existe estado Postergado; postergar equivale a modificar fecha | Archivo de comprensión / source_map | REAL MÍNIMO parcial |
| Geni quiere reasignar tarea | No puede reasignar automáticamente | Documento principal, Polaridad 2 | Restricción REAL |
| Geni quiere completar tarea | No puede completar automáticamente | Documento principal, Polaridad 2 | Restricción REAL |
| Geni quiere cambiar evento | No puede cambiar eventos del calendario sin confirmación humana | Documento principal, Polaridad 2 | Restricción REAL |
| Primer olvido de tarea menor | Recordatorio privado al responsable | Documento principal, Polaridad 2/7 | DEMO PREMIUM / POST_MVP |
| Tarea vencida por primera falta | Alerta privada al responsable | Documento principal, Polaridad 2 | DEMO PREMIUM / POST_MVP |
| Segunda falta o patrón emergente | Alerta al coordinador; responsable sabe que fue alertado | Documento principal, Polaridad 2 | DEMO PREMIUM / POST_MVP |
| Tercera falta o patrón confirmado | Exposición del patrón a toda la familia | Documento principal, Polaridad 2/7 | DEMO PREMIUM / POST_MVP |
| Asimetría menor 57/43 | Datos visibles, sin alerta push | Documento principal, Polaridad 4 | DEMO PREMIUM |
| Asimetría grave 88/12 | Datos visibles y alerta activa | Documento principal, Polaridad 4 | DEMO PREMIUM |
| Patrón de 3 semanas | Alerta por tendencia creciente | Documento principal, Polaridad 4/7 | DEMO PREMIUM / POST_MVP |
| Usuario declara baja disponibilidad pero no cumple mínimos | Geni detecta patrón y alerta al coordinador | Documento principal, Polaridad 5 | POST_MVP / DEMO PREMIUM |
| Familia intenta usar solo calendario | No permitido; Tasks + Calendar son núcleo obligatorio | Documento principal, Polaridad 6 | Restricción REAL |
| Usuario intenta ocultar tarea asignada | No permitido en coordinación del hogar | Documento principal, Polaridad 1 | Restricción REAL |
| Usuario intenta ocultar evento compartido | No permitido si pertenece al calendario familiar | Documento principal, Polaridad 1 | Restricción REAL |
| Sin tareas | No se encontró empty state específico | No encontrado | Información faltante |
| Sin eventos | No se encontró empty state específico | No encontrado | Información faltante |
| Error de permisos | No se encontró error específico | No encontrado | Información faltante |
| Error de red | No se encontró | No encontrado | Información faltante |

---

## 11. Restricciones y prohibiciones detectadas

* HomePlus no es una app de productividad neutra.
* Planner no debe ocultar asimetrías de tareas.
* Las tareas del hogar son transparencia forzada.
* El calendario familiar es transparencia forzada.
* Nadie puede ocultar sus tareas completadas o pendientes dentro del hogar.
* Nadie puede ocultar un evento del calendario compartido.
* El núcleo inicial incluye Calendario familiar y Tareas del hogar.
* No se puede adoptar solo el calendario y desactivar tareas.
* Geni no reasigna tareas automáticamente.
* Geni no completa tareas automáticamente.
* Geni no cambia eventos sin confirmación humana.
* Geni no toma decisiones operativas del hogar en nombre de la familia.
* Geni debe presentar datos con números, contexto y tono, sin acusar.
* Geni no usa adjetivos valorativos como “increíble”, “extraordinario”, “terrible”, “mal”.
* Geni no debe usar 3+ emojis ni emojis genéricos de celebración.
* Datos de coordinación siempre visibles; alertas activas solo al cruzar umbrales.
* Vencida no es un estado de tarea; se calcula automáticamente.
* Una tarea tiene una única Responsabilidad principal.
* Responsabilidades no son dominio independiente.
* No existen subtareas anidadas; si se implementaran, solo un nivel, pero queda POST_MVP para esta entrega.
* Recurrencias generan nuevas instancias y preservan historial; en este documento queda POST_MVP porque no se define recurrencia simple MVP.
* Calendar vive dentro de Planner.
* Goals vive dentro de Planner, pero no desarrollar para este fragment.
* Home resume Planner, no administra Planner.
* Planner tiene acceso directo desde Bottom Nav; no vive en More.
* No más de 4 niveles de navegación.
* Objetivo: 95% de acciones en 3 niveles o menos.
* Mobile First.
* Cada hogar tiene su propio Planner; los datos no se cruzan entre hogares. Esto es dependencia de Household/Auth, no desarrollar acá.
* Empleado Familiar tiene permisos operativos sobre tareas asignadas, pero queda fuera de MVP de este fragment salvo como dependencia externa/no desarrollar.

---

## 12. Información faltante

| Falta | Por qué importa para Codex | Impacto |
| ----- | -------------------------- | ------- |
| No hay pantalla explícita de Planner | Codex no tiene layout final para construir pantalla completa | Necesita merge con diseño/UX de otro documento |
| No hay Task List UI explícita | Falta estructura de lista, filtros, tabs, empty state | Puede hacerse demo solo con patrones generales, pero no desde este documento |
| No hay Create Task UI | Crear tarea es acción MVP, pero no hay formulario/campos | No se deben inventar campos en este fragment |
| No hay Edit Task UI | Editar tarea aparece en objetivo MVP, pero no en documento | Queda pendiente de otros documentos |
| No hay Delete Task UI | Eliminar tarea aparece en objetivo MVP, pero no en documento | Queda pendiente de otros documentos |
| No hay prioridades de tarea | MVP pide prioridad, pero el documento no define valores | No inventar prioridades |
| No hay templates predefinidas exactas | MVP pide Limpieza, Compras, Mascotas, Medicación, Estudios, Pagos | Este documento solo menciona Plantilla de Tasks sin detalle |
| Verification Flow contradictorio | MVP espera awaiting_verification/verified; comprensión dice Completada = estado final | Requiere resolución en merge posterior |
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

---

## 13. Fuente

### Documento principal

* Archivo: `HomePlus — SECCION 3 FILOSOFIA.md`
* Secciones usadas:
  * `DEFINICIÓN DE SISTEMA`
  * `POSTURA FUNDACIONAL`
  * `POLARIDADES RESUELTAS`
  * `1. AUTONOMÍA INDIVIDUAL vs COHESIÓN GRUPAL`
  * `2. EFICIENCIA vs PROCESO HUMANO`
  * `3. RECONOCIMIENTO EMPÁTICO vs NEUTRALIDAD DE DATOS`
  * `4. PREVENCIÓN DE CONFLICTOS vs EXPOSICIÓN DE CONFLICTOS`
  * `5. OPTIMIZACIÓN DE TAREAS vs RESPETO AL CONTEXTO HUMANO`
  * `6. ADOPCIÓN GRADUAL vs COMPROMISO TOTAL`
  * `7. INTERVENCIÓN TEMPRANA vs RESPETO AL RITMO FAMILIAR`
  * `A. Multi-hogar real`
  * `B. Empleado Familiar: la coordinación no requiere parentesco`
  * `CONSECUENCIAS SISTÉMICAS`
  * `LO QUE HomePlus NO ES`
  * `DECISIONES FILOSÓFICAS TOMADAS`

### Archivo de comprensión asociado

* Archivo: `Seccion 3 Filosofia.txt`
* Secciones usadas:
  * `OUTPUT 1 — ENTITIES`
  * `OUTPUT 2 — RELATIONSHIPS`
  * `OUTPUT 3 — CROSS DOMAIN RELATIONSHIPS`
  * `OUTPUT 4 — DATA FLOWS`
  * `OUTPUT 5 — BUSINESS RULES`
  * `OUTPUT 6 — ARCHITECTURAL DECISIONS`
  * `OUTPUT 7 — MISSING OR IMPLIED CONNECTIONS`
  * `OUTPUT 8 — GRAPH EDGES`

### Source map usado

* Archivo: `source_map_HomePlus_SECCION_3_FILOSOFIA.md`
* Secciones usadas:
  * `4.7 PLANNER`
  * `4.8 TASKS`
  * `4.9 EVENTS`
  * `4.10 CALENDAR`
  * `4.11 HOME`
  * `5. Mapa de entidades`
  * `6. Mapa de relaciones`
  * `7. Mapa de estados`
  * `8. Mapa de permisos`
  * `9. Mapa de flujos`
  * `10. Mapa de APIs`
  * `11. Mapa de UI`
  * `13. Restricciones arquitectónicas detectadas`
  * `17. Contradicciones detectadas`
  * `18. Información faltante`

