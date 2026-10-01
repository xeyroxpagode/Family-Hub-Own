# PLANNER fragment — HomePlus — SECCION 5 RELATIONSHIP PHILOSOPHY

> Fragment crudo de implementación visual/interactiva para extracción posterior.  
> Fuente cerrada: `HomePlus — SECCION 5 RELATIONSHIP PHILOSOPHY(1).md`, `Seccion 5 filsofia de las relaciones(1).txt` y `source_map_HomePlus_SECCION_5_RELATIONSHIP_PHILOSOPHY.md`.  
> No es spec final. No fusiona con otros documentos. No completa huecos.

---

## 1. Rol del módulo en la demo

### Información explícita encontrada

* Planner aparece como parte del ecosistema de dominios conectados de HomePlus.
* El archivo de comprensión describe **Planner** como “núcleo operativo” que administra **Tasks**, **Calendar**, **Goals** y **Responsabilidades**.
* El documento principal muestra que Planner no funciona aislado: una **Persona** puede ser responsable de tareas, participante de eventos y dueña de metas.
* Una **Tarea** puede relacionarse con una **Responsabilidad**, un **Evento** y una **Persona**.
* Un **Evento** puede relacionarse con **Personas** y con Calendar.
* Las relaciones del ecosistema deben ser navegables y visibles solo si el rol del usuario tiene permiso para ver cada entidad relacionada.
* Planner aporta información a Home a través de tareas, eventos y briefing/resúmenes, según el archivo de comprensión.

### Valor para demo extraíble

* Mostrar Planner como módulo operativo donde se ven tareas y eventos relacionados con personas/responsabilidades.
* Mostrar que una tarea puede abrir detalle y navegar hacia un evento relacionado.
* Mostrar que Home puede entrar a Planner desde una tarea o evento.
* Mostrar que el módulo respeta visibilidad por rol de manera visual, aunque este documento no define CRUD completo ni contratos API.

### Problema familiar que resuelve según fuente

* Coordinar trabajo pendiente, eventos y responsabilidades familiares dentro de un hogar.
* Evitar que el usuario tenga que volver al menú principal para seguir una relación entre entidades.
* Mantener el hilo de intención cuando el usuario navega entre Home, tareas y eventos.

### Qué debe sentir el usuario

* El documento no define emociones explícitas para Planner.
* Sí establece que la navegación entre entidades debe evitar fricción y permitir continuar la intención sin perder contexto.

---

## 2. Información encontrada para las 7 condiciones MVP

### 2.1 Pantalla visualmente terminada

#### Pantallas o componentes detectados

* **Planner** como tab principal dentro de Bottom Nav.
* **Calendar** como feature dentro de Planner.
* **Task Detail** o vista de detalle de tarea, porque toda entidad relacionada debe exponer sus relaciones como enlaces navegables.
* **Event Detail** o vista de detalle de evento, implícita por navegación desde una tarea hacia un evento.
* **TareasHome** como widget/card de Home relacionado con Planner.
* **PróximosEventos** como widget/card de Home relacionado con Calendar/Event.
* **Briefing** como card de Home que puede agregar datos de Planner, pero para este fragment queda como dependencia externa / no desarrollar.

#### Secciones visuales extraíbles

* Lista o agrupación de tareas por **Responsabilidad**.
* Vista de detalle de una tarea con enlaces hacia entidades relacionadas.
* Enlace desde detalle de tarea hacia evento relacionado.
* Calendar como lugar donde se administran o visualizan eventos familiares/personales.
* Home como punto de entrada hacia tarea/evento.
* Bottom Nav con estructura: `[Home] [People] [+] [Planner] [More]`.

#### Labels, badges o estados visibles encontrados

* Task states encontrados en archivo de comprensión: `Pendiente`, `En progreso`, `Completada`, `Cancelada`.
* Event states encontrados en archivo de comprensión: `Programado`, `Completado`, `Cancelado`.
* No se encontraron tabs concretos de Planner.
* No se encontraron filtros concretos.
* No se encontraron iconos concretos.
* No se encontraron headers concretos.
* No se encontraron textos de botones concretos para crear/editar/eliminar.

#### Jerarquía visual implícita útil

* Home puede mostrar tarjetas/resúmenes y conducir al módulo dueño.
* Planner debe permitir detalle y enlaces contextuales.
* Calendar vive dentro de Planner.
* Las relaciones entre entidades se muestran si el usuario puede verlas.

---

### 2.2 Datos creíbles

#### Ejemplos explícitos de tareas/eventos/personas/responsabilidades

* Persona: `Mamá`, rol `Adulto`.
* Tarea: `Comprar alimento para perro`.
* Responsabilidad: `Mascotas`.
* Asset relacionado en ejemplo: `Perro (Toby)` — **Dependencia externa / no desarrollar en este fragment.**
* Documento relacionado en ejemplo: `Carnet de vacunación` — **Dependencia externa / no desarrollar en este fragment.**
* Evento: `Visita al veterinario — sábado 11:00`.
* Lugar: `Veterinaria San Roque` — **Dependencia externa / no desarrollar en este fragment.**
* Responsabilidad `Mascotas` agrupa tareas como `alimentar` y `pasear`.
* Ejemplo de navegación desde Home: tarea `Preparar comida para el asado`.
* Evento relacionado: `Asado del sábado 13:00`.
* Documento relacionado: `Lista de compras` — **Dependencia externa / no desarrollar en este fragment.**
* Gasto relacionado: `$150 — Carnicería` — **Dependencia externa / no desarrollar en este fragment.**
* Sugerencia Geni: `Detecté 3 tareas relacionadas con el evento 'Cumpleaños de Gaby'. ¿Querés agruparlas?` — **POST_MVP / Geni real no desarrollar.**
* Pregunta Geni: `¿Qué tareas pendientes tiene Mateo esta semana?` — **POST_MVP / Geni real no desarrollar.**
* Análisis Geni: `Mateo completó todas sus tareas escolares 5 días seguidos` — **POST_MVP / Geni real / streaks no desarrollar.**
* Sugerencia externa: `El stock de leche está bajo. ¿Creo una tarea de compras?` — **Dependencia externa / no desarrollar Inventory.**
* Sugerencia externa: `Hace 6 meses que no se hace el service del auto. ¿Agendo un recordatorio?` — **Dependencia externa / no desarrollar Assets.**

#### Categorías/responsabilidades encontradas

* `Mascotas`.
* `Compras`.
* `Limpieza`.

#### Datos esperados por el prompt pero no encontrados en esta fuente

* No aparecen datos explícitos para `Medicación`, `Estudios` ni `Pagos` como templates MVP.
* No aparecen prioridades de tarea.
* No aparecen fechas límite de tareas como campo explícito.
* No aparecen vistas día/semana/mes con ejemplos concretos.
* No aparecen datos demo de tareas vencidas, hoy, mañana o sin asignar.

---

### 2.3 Acción interactiva

#### Acciones visibles o conceptuales encontradas

* Abrir detalle de tarea.
* Navegar desde tarea hacia evento relacionado.
* Navegar desde Home hacia tarea.
* Navegar desde evento hacia entidades relacionadas si el usuario tiene visibilidad.
* Reutilizar una instancia existente del stack si una navegación vuelve a una entidad ya abierta.
* Confirmar o descartar sugerencias de Geni para relacionar entidades — **POST_MVP / Geni real no desarrollar.**
* Geni puede sugerir crear tarea de compra desde stock bajo — **Dependencia externa / no desarrollar Inventory.**
* Geni puede sugerir agendar recordatorio desde mantenimiento de asset — **Dependencia externa / no desarrollar Assets.**

#### Acciones MVP esperadas pero no encontradas en esta fuente

* Crear tarea.
* Editar tarea.
* Eliminar tarea.
* Completar tarea como flujo de usuario.
* Verificar tarea con `awaiting_verification` / `verified`.
* Crear evento.
* Editar evento con formulario.
* Eliminar/cancelar evento con flujo UI.
* Listar tareas con filtros/tabs.
* Listar eventos con vista día/semana/mes.

#### Clasificación de acciones encontradas

* Abrir detalle: **REAL mínimo**.
* Navegar entre entidades relacionadas: **REAL mínimo**.
* Confirmar/descartar sugerencia Geni: **POST_MVP**.
* Sugerencias desde Inventory/Assets hacia Planner: **POST_MVP / dependencia externa**.

---

### 2.4 Feedback inmediato

#### Feedback explícito encontrado

* No se encontraron toasts, success messages, errores, skeletons, spinners, retries ni mensajes de loading.
* La única regla de feedback/navegación concreta es que el botón back del sistema operativo siempre debe retroceder un nivel real.
* Si una relación no puede mostrarse por privacidad, el sistema/Geni la omite sin revelar que existe.

#### Estados UX derivados de la fuente, sin inventar comportamiento

* Relación visible si el rol puede ver todos los eslabones.
* Relación omitida si el usuario no tiene visibilidad.
* Back real al navegar A → B → C.
* Reutilización de instancia existente para evitar ciclos infinitos.

---

### 2.5 Service aislado

#### Datos que el service podría listar según fuente

* Tasks relacionadas con Persona.
* Tasks agrupadas por Responsabilidad.
* Tasks vinculadas a Event.
* Events vinculados a Personas.
* Calendar como feature que administra eventos familiares y personales.
* Widgets de Home que consumen datos de Planner: `TareasHome`, `ProximosEventos`, `Briefing`.

#### Acciones que el service podría ejecutar según fuente

* No se encontró contrato de service.
* No se encontraron nombres de funciones.
* No se encontraron endpoints.
* No se encontraron request/response.

#### Integración con Home detectada

* Home contiene `TareasHome`.
* Home contiene `ProximosEventos`.
* Briefing puede agregar datos desde Planner.
* Planner actualiza Home cuando una tarea se completa, según el archivo de comprensión; no hay contrato técnico.

#### Fuente de datos

* No se define si es mock, local, AsyncStorage, API o backend real.
* Para demo, este documento solo permite extraer relaciones y datos de ejemplo, no un service contract.

---

### 2.6 Navegación coherente

#### Entrada al módulo

* Planner aparece como tab de Bottom Nav.
* Bottom Nav V1: `[Home] [People] [+] [Planner] [More]`.
* Home puede llevar a una tarea.
* Una tarea puede llevar a un evento relacionado.

#### Flujo explícito de navegación

```text
Home → Tarea "Preparar comida para el asado"
→ Evento "Asado del sábado 13:00"
→ Documento "Lista de compras"
→ Gasto "$150 — Carnicería"
```

Para este fragment Planner:

```text
Home → Tarea
Tarea → Evento
Evento → volver por stack real
```

Los pasos hacia Documento/Gasto son **Dependencia externa / no desarrollar en este fragment.**

#### Reglas de navegación

* El usuario no debería tener que volver al menú principal para seguir una relación entre entidades.
* Toda entidad que tenga relación con otra debe exponer esa relación como enlace navegable en su vista de detalle.
* Si una Tarea pertenece a un Evento, el detalle de la Tarea muestra el Evento.
* Si el usuario navega A → B → C y desde C existe enlace a A, se reutiliza la instancia existente de A en el stack.
* El botón back del sistema operativo retrocede un nivel real.
* Las relaciones se exponen solo si el usuario puede ver cada entidad vinculada.

---

### 2.7 Conexión con Home o More

#### Home

* `Home` aparece como centro operativo que resume información.
* `TareasHome` aparece como widget/card de Home con tareas agrupadas por responsabilidad.
* `ProximosEventos` aparece como widget/card de Home con próximos eventos.
* `Briefing` aparece como primer widget/card de Home y puede agregar datos de Planner, pero para este fragment se trata como **Dependencia externa / no desarrollar Geni real**.
* Data flow: `Planner → Home` cuando una tarea completada actualiza widget de tareas y reorganiza Home, según archivo de comprensión.

#### More

* Planner no vive en More.
* Planner aparece en Bottom Nav como tab principal.
* More contiene otros módulos, no Planner.

#### Quick Actions

* QuickActions existe como panel accesible desde botón `+` en Bottom Nav.
* El archivo de comprensión indica que QuickActions contiene Geni como slot fijo.
* No se encontró acción rápida explícita “crear tarea” o “crear evento” en esta fuente.

---

## 3. Clasificación para implementación

### REAL MÍNIMO

* Planner como módulo/tab principal del Bottom Nav.
* Calendar como feature dentro de Planner.
* Task como entidad de Planner.
* Event como entidad de Planner/Calendar.
* Persona como responsable de tareas y participante de eventos.
* Task pertenece a una única Responsabilidad.
* Task puede vincularse a Event.
* Event puede vincularse a Personas.
* Vista de detalle de Task debe mostrar Event relacionado si existe y si el usuario tiene permiso para verlo.
* Navegación contextual entre entidades relacionadas.
* Back stack sin ciclos infinitos.
* Filtrado visual por rol/ámbito: no mostrar relaciones que el usuario no puede ver.
* Home puede mostrar tareas y próximos eventos como resumen del Planner.

### DEMO PREMIUM

* Usar ejemplos textuales encontrados como datos demo:
  * `Comprar alimento para perro`.
  * `Mascotas`.
  * `Mamá`.
  * `Visita al veterinario — sábado 11:00`.
  * `Preparar comida para el asado`.
  * `Asado del sábado 13:00`.
* Mostrar cards de tarea con responsable y responsabilidad.
* Mostrar enlace visual “evento relacionado” dentro de detalle de tarea.
* Mostrar desde Home un resumen de tareas y próximos eventos.
* Mostrar Calendar como sección simple de eventos, sin afirmar día/semana/mes si no viene de otra fuente.

### LOCAL / ASYNCSTORAGE / MOCK SERVICE

* Este documento no menciona AsyncStorage, local state ni service mock.
* Para una demo posterior, los datos encontrados podrían cargarse como mock/local, pero esta decisión no está definida por la fuente.
* No se deben inventar nombres de métodos ni endpoints desde esta fuente.

### POST_MVP

* Goals, Hitos y tareas que avanzan metas.
* Subtareas.
* Comentarios.
* Adjuntos.
* Dependencias entre tareas.
* PlantillaTarea como entidad editable o tabla propia.
* Verificación avanzada si implica estados distintos a los encontrados.
* Geni Planner real.
* Geni relacionando, recomendando o automatizando tareas/eventos.
* Automatizaciones reales.
* Inventory/Assets creando tareas automáticamente.
* Participantes avanzados de eventos.
* Event → HomeCloud / álbum automático.
* Event → Presence real.
* Streaks o análisis como “5 días seguidos”.
* Recurrencia compleja.

### IGNORAR

* No se detallan módulos externos por regla del prompt.
* Cuando aparecen como relación futura con Planner, se conservan solo como **Dependencia externa / no desarrollar en este fragment.**

---

## 4. UI extraíble

| Pantalla/Componente | Qué muestra | Acciones | Estados UX | Navegación | Clasificación |
| --- | --- | --- | --- | --- | --- |
| Planner tab | Entrada principal al módulo Planner | Abrir Planner | No encontrado | Bottom Nav `[Home] [People] [+] [Planner] [More]` | REAL MÍNIMO |
| Task List / sección de tareas | Tareas, potencialmente agrupadas por Responsabilidad | Abrir detalle de tarea | No encontrado | Desde Planner o Home | DEMO PREMIUM / REAL parcial |
| Task Card | Tarea, Persona responsable, Responsabilidad, posible Evento relacionado | Abrir detalle | No encontrado | Task Card → Task Detail | DEMO PREMIUM |
| Task Detail | Tarea y enlaces a entidades relacionadas visibles | Abrir evento relacionado | Relación omitida si no hay permiso; back real | Task Detail → Event Detail | REAL MÍNIMO |
| Calendar | Eventos familiares y personales | Abrir evento | No encontrado | Planner → Calendar | REAL parcial |
| Event Card | Evento relacionado con Personas | Abrir detalle | No encontrado | Calendar/Home/Task → Event Detail | DEMO PREMIUM / REAL parcial |
| Event Detail | Evento y posibles participantes/personas | Volver por stack; abrir relaciones si visibles | Back real; evitar ciclos | Event Detail → entidad relacionada visible | REAL MÍNIMO |
| TareasHome | Tareas agrupadas por responsabilidad | Abrir tarea | Desaparece al completarse según archivo de comprensión; no hay detalle técnico | Home → Task Detail | REAL parcial / DEMO PREMIUM |
| ProximosEventos | Próximos eventos | Abrir evento | No encontrado | Home → Event Detail | REAL parcial / DEMO PREMIUM |
| Briefing con datos Planner | Resumen de tareas/eventos | No encontrado | Resumen diario; Geni real no desarrollar | Home → módulos relevantes si se define después | MOCK / Dependencia externa |
| QuickActions `+` | Panel de acción rápida; Geni fijo | No se encontró crear tarea/evento | No encontrado | Bottom Nav `+` | CONTEXTO / no implementar acción desde esta fuente |

---

## 5. Datos demo extraíbles

| Dato/ejemplo | Módulo | Uso posible | Fuente | Clasificación |
| --- | --- | --- | --- | --- |
| `Mamá` | Planner / People | Responsable visible en tarea o participante de evento | Documento principal §5.1 | DEMO PREMIUM |
| `Adulto` | Planner / Roles | Rol de ejemplo para visibilidad | Documento principal §5.1 | REAL parcial |
| `Comprar alimento para perro` | Tasks | Tarea demo | Documento principal §5.1 | DEMO PREMIUM |
| `Mascotas` | Tasks / Responsabilidad | Agrupación/categoría de tarea | Documento principal §5.1 / §5.2.2 | REAL parcial / DEMO PREMIUM |
| `Perro (Toby)` | Dependencia externa | Relación visual futura desde tarea | Documento principal §5.1 | Dependencia externa / no desarrollar |
| `Carnet de vacunación` | Dependencia externa | Relación visual futura desde tarea/evento | Documento principal §5.1 | Dependencia externa / no desarrollar |
| `Visita al veterinario — sábado 11:00` | Events / Calendar | Evento demo | Documento principal §5.1 | DEMO PREMIUM |
| `Veterinaria San Roque` | Dependencia externa / Event location | Dato visual de evento si se usa como texto simple | Documento principal §5.1 | DEMO PREMIUM como texto; no Presence real |
| `alimentar` | Tasks | Tarea demo dentro de Responsabilidad Mascotas | Documento principal §5.2.2 | DEMO PREMIUM |
| `pasear` | Tasks | Tarea demo dentro de Responsabilidad Mascotas | Documento principal §5.2.2 | DEMO PREMIUM |
| `Compras` | Tasks / Responsabilidad | Categoría/responsabilidad demo | Documento principal §5.3.4 / archivo comprensión | DEMO PREMIUM |
| `Limpieza` | Tasks / Responsabilidad | Categoría/responsabilidad demo | Archivo comprensión | DEMO PREMIUM |
| `Preparar comida para el asado` | Tasks / Home | Tarea demo para navegación Home → Task | Documento principal §5.4.1 | DEMO PREMIUM |
| `Asado del sábado 13:00` | Events / Calendar | Evento relacionado con tarea | Documento principal §5.4.1 | DEMO PREMIUM |
| `Cumpleaños de Gaby` | Events / Tasks | Ejemplo de evento con tareas relacionadas | Documento principal §5.3.3 | POST_MVP / Geni real |
| `3 tareas relacionadas` | Tasks / Events | Badge/contador de relación sugerida | Documento principal §5.3.3 | POST_MVP / Geni real |
| `Mateo` | Tasks / People | Persona en pregunta sobre tareas pendientes | Documento principal §5.3.1 / §5.3.2 | POST_MVP si usado por Geni real; DEMO si solo texto |
| `tareas escolares` | Tasks | Tipo de tarea ejemplo | Documento principal §5.3.2 | POST_MVP por análisis/streaks |
| `Pendiente` | Tasks | Estado visual de tarea | Archivo comprensión OUTPUT 1 | REAL parcial / requiere mapeo posterior |
| `En progreso` | Tasks | Estado visual de tarea | Archivo comprensión OUTPUT 1 | REAL parcial / contradicción con MVP solicitado |
| `Completada` | Tasks | Estado visual de tarea | Archivo comprensión OUTPUT 1 | REAL parcial / requiere mapeo posterior |
| `Cancelada` | Tasks | Estado visual de tarea | Archivo comprensión OUTPUT 1 | REAL parcial / contradicción con MVP solicitado |
| `Programado` | Events | Estado visual de evento | Archivo comprensión OUTPUT 1 | REAL parcial |
| `Completado` | Events | Estado visual de evento | Archivo comprensión OUTPUT 1 | REAL parcial |
| `Cancelado` | Events | Estado visual de evento | Archivo comprensión OUTPUT 1 | REAL parcial |

---

## 6. Acciones extraíbles

| Acción | Usuario/Rol | Resultado visible | Real/Mock/Post-MVP | Fuente |
| --- | --- | --- | --- | --- |
| Abrir Planner desde Bottom Nav | Usuario autenticado con acceso al hogar | Entra al módulo Planner | REAL MÍNIMO | Archivo comprensión OUTPUT 1 / OUTPUT 6 |
| Abrir tarea desde Home | Usuario con visibilidad sobre la tarea | Abre detalle de tarea | REAL MÍNIMO | Documento principal §5.4.1 |
| Abrir evento desde detalle de tarea | Usuario con visibilidad sobre el evento | Abre evento relacionado | REAL MÍNIMO | Documento principal §5.4.2 |
| Volver usando back del sistema | Usuario | Retrocede un nivel real | REAL MÍNIMO | Documento principal §5.4.3 |
| Ver relación Tarea → Responsable | Coordinador, Adulto, Adolescente según caso, Niño solo propias; Invitado no; Empleado Familiar solo asignadas | Muestra u oculta responsable según rol | REAL parcial | Documento principal §5.5.4 |
| Ver eventos familiares/personales en Calendar | Usuario con permisos | Muestra eventos permitidos | REAL parcial | Archivo comprensión OUTPUT 1 |
| Modificar fecha de evento para postergar | No especificado | Cambia fecha; no crea estado `Postergado` | REAL parcial / sin UI/API | Source map desde archivo comprensión |
| Completar tarea | No especificado | Tarea completada / actualiza Home según comprensión | Mencionado indirecto / falta flujo | Archivo comprensión OUTPUT 1 / OUTPUT 4 |
| Verificar tarea | No especificado | Verificación opcional; “Completada → Estado final” | POST_MVP o contradicción con MVP del prompt | Archivo comprensión OUTPUT 1 |
| Geni sugiere agrupar tareas con evento | Usuario confirma o descarta | Sugerencia optativa | POST_MVP | Documento principal §5.3.3 |
| Geni sugiere crear tarea de compra | Usuario confirma o descarta | Crea/sugiere tarea desde stock bajo | POST_MVP / dependencia externa | Documento principal §5.3.4 |
| Geni sugiere agendar recordatorio de service | Usuario confirma o descarta | Crea/sugiere recordatorio | POST_MVP / dependencia externa | Documento principal §5.3.4 |
| Crear automatización relacionada con tareas/eventos | Usuario aprueba explícitamente | Automatización permanente solo con aprobación | POST_MVP / no desarrollar | Documento principal §5.3.5 |

---

## 7. Home / More / Quick Actions

### Home

* Home puede mostrar `TareasHome`.
* `TareasHome` se describe como widget de Home con tareas agrupadas por responsabilidad.
* Home puede mostrar `ProximosEventos`.
* `ProximosEventos` se describe como widget de Home con próximos eventos.
* Briefing puede agregar datos desde Planner, pero **Geni real no se desarrolla en este fragment.**
* El archivo de comprensión indica un data flow: una tarea completada en Planner actualiza widget de tareas y reorganiza Home.
* El documento principal muestra navegación `Home → Tarea → Evento`.

### More

* Planner no vive en More.
* Planner vive como tab principal en Bottom Nav.
* More contiene otros módulos y Settings, sin acción directa de Planner encontrada en esta fuente.

### Quick Actions

* QuickActions existe como botón `+` en Bottom Nav.
* Geni es slot fijo dentro de QuickActions, según archivo de comprensión.
* No se encontró en esta fuente una acción rápida explícita `crear tarea` o `crear evento`.
* Cualquier acción de QuickActions hacia Planner queda pendiente de otras fuentes.

---

## 8. Backend/API detectado

No se encontró contrato API explícito en este documento.

| Endpoint/Acción | Método | Ruta | Request | Response | Estado | Clasificación |
| --- | --- | --- | --- | --- | --- | --- |
| Crear tarea | No definido | No definido | No encontrado | No encontrado | Acción conceptual / sin contrato | Faltante |
| Editar tarea | No definido | No definido | No encontrado | No encontrado | No encontrado | Faltante |
| Eliminar tarea | No definido | No definido | No encontrado | No encontrado | No encontrado | Faltante |
| Completar tarea | No definido | No definido | No encontrado | No encontrado | Mencionado indirecto | Faltante |
| Verificar tarea | No definido | No definido | No encontrado | No encontrado | Mencionado contradictorio | Faltante / POST_MVP |
| Listar tareas | No definido | No definido | No encontrado | No encontrado | No encontrado como API | Faltante |
| Crear evento | No definido | No definido | No encontrado | No encontrado | Acción conceptual / sin contrato | Faltante |
| Editar evento | No definido | No definido | No encontrado | No encontrado | Postergar = modificar fecha | Faltante |
| Eliminar/cancelar evento | No definido | No definido | No encontrado | No encontrado | No encontrado como API | Faltante |
| Listar eventos | No definido | No definido | No encontrado | No encontrado | No encontrado como API | Faltante |
| Ver calendario | No definido | No definido | No encontrado | No encontrado | Feature conceptual | Faltante |
| Obtener datos para Home | No definido | No definido | No encontrado | No encontrado | Data flow conceptual | Faltante |

---

## 9. Modelo de datos detectado

| Entidad | Campo | Tipo si aparece | Estado/valores | Uso visual o interacción | Clasificación |
| --- | --- | --- | --- | --- | --- |
| Task | responsable / assigned_to / Persona | no especificado | Persona visible según rol | Mostrar responsable de tarea | REAL parcial |
| Task | responsabilidad | no especificado | Una única Responsabilidad | Agrupar tareas / mostrar categoría | REAL parcial |
| Task | event / relación con Event | no especificado | Event relacionado si existe | Enlace en Task Detail | REAL parcial |
| Task | estado | no especificado | `Pendiente`, `En progreso`, `Completada`, `Cancelada` | Badge de estado, con contradicción MVP | REAL parcial / riesgo |
| Task | subtareas | no especificado | no especificado | No desarrollar | POST_MVP |
| Task | comentarios | no especificado | no especificado | No desarrollar | POST_MVP |
| Task | adjuntos | no especificado | no especificado | No desarrollar | POST_MVP |
| Task | dependencias | no especificado | Si previa no se completa, dependiente bloqueada | No desarrollar | POST_MVP |
| Responsabilidad | nombre | no especificado | `Mascotas`, `Compras`, `Limpieza` encontrados | Agrupar tareas | REAL parcial / DEMO PREMIUM |
| Persona | relación con Task | no especificado | Responsable/asignado | Mostrar responsable | REAL parcial |
| Persona | relación con Event | no especificado | Participante | Mostrar participantes si se define UI | REAL parcial |
| Event | participantes / Personas | no especificado | no especificado | Mostrar personas asociadas | REAL parcial |
| Event | estado | no especificado | `Programado`, `Completado`, `Cancelado` | Badge de evento | REAL parcial |
| Event | presencia | no especificado | relación externa | No desarrollar Presence real | POST_MVP / dependencia externa |
| Event | HomeCloud | no especificado | relación externa | No desarrollar storage/documentos | POST_MVP / dependencia externa |
| Calendar | eventos familiares/personales | no especificado | no especificado | Listar eventos | REAL parcial |
| PlantillaTarea | entidad | no especificado | no especificado | No usar como CRUD MVP desde esta fuente | POST_MVP / riesgo |
| Verificacion | opcional | no especificado | `Completada → Estado final` | Contradice flow MVP del prompt | Riesgo / no implementar desde esta fuente |
| TareasHome | tasks agrupadas | no especificado | por Responsabilidad | Widget Home | REAL parcial |
| ProximosEventos | eventos | no especificado | próximos eventos | Widget Home | REAL parcial |

---

## 10. Edge cases / errores / estados vacíos

| Caso | Comportamiento esperado | Fuente | Clasificación |
| --- | --- | --- | --- |
| Relación no visible por permisos | No mostrar la relación | Documento principal §5.5.1 / §5.5.2 | REAL MÍNIMO |
| Entidad privada relacionada con entidad familiar | Mostrar contenido privado solo al propietario | Documento principal §5.5.2 | REAL MÍNIMO |
| Geni cruza dominios con información privada | Omitir información privada de terceros sin mencionar su existencia | Documento principal §5.5.3 | POST_MVP para Geni; regla de privacidad útil |
| Tarea familiar → Responsable | Coordinador y Adulto ven; Adolescente ve si propia o familiar; Niño solo propias; Invitado no; Empleado Familiar solo asignadas | Documento principal §5.5.4 | REAL parcial |
| Evento → Documentos asociados | Coordinador/Adulto ven; Adolescente si participa; Niño no; Invitado según permisos; Empleado Familiar no | Documento principal §5.5.4 | Dependencia externa / no desarrollar documentos |
| Navegación A → B → C → A | Reutilizar instancia existente de A; no duplicar stack | Documento principal §5.4.3 | REAL MÍNIMO |
| Back del sistema operativo | Retrocede un nivel real | Documento principal §5.4.3 | REAL MÍNIMO |
| Task vencida | Vencida no es estado; se calcula por fecha de vencimiento | Source map desde archivo comprensión | REAL parcial / faltan campos |
| Postergar evento | Equivale a modificar fecha; no existe estado `Postergado` | Source map desde archivo comprensión | REAL parcial |
| Geni intenta completar tarea automáticamente | No puede completar tareas automáticamente | Source map desde archivo comprensión | POST_MVP / restricción útil |
| Tarea bloqueada por dependencia | Dependencia puede bloquear si previa no se completa | Archivo comprensión OUTPUT 1 | POST_MVP |
| Estado vacío de tareas | No encontrado | — | Faltante |
| Error al crear/editar/eliminar | No encontrado | — | Faltante |
| Tarea sin responsable | No encontrado | — | Faltante |
| Evento sin participantes | No encontrado | — | Faltante |
| Sin conexión / retry | No encontrado para Planner en esta extracción | — | Faltante |

---

## 11. Restricciones y prohibiciones detectadas

* Ningún módulo funciona aislado; Planner debe integrarse mediante relaciones navegables.
* La coordinación no autoriza acceso indiscriminado.
* Toda relación visible debe respetar rol y ámbito.
* Si una Tarea pertenece a un Evento, el detalle de la Tarea muestra el Evento.
* Toda entidad con relación debe exponer la relación como enlace navegable en su vista de detalle.
* Evitar ciclos infinitos en navegación; no duplicar instancias en stack.
* El botón back debe retroceder un nivel real.
* Las relaciones familiares son informativas y no modifican permisos automáticamente.
* No existen relaciones entre hogares; una tarea de un Hogar A no puede relacionarse con un evento del Hogar B.
* Un usuario puede pertenecer a múltiples hogares, pero Planner debe operar en contexto del hogar activo.
* Geni no debe imponer relaciones automáticas sin consentimiento.
* Geni nunca crea automatizaciones permanentes sin aprobación explícita.
* Geni no puede completar tareas automáticamente, según source_map/archivo de comprensión.
* Goals, subtareas, comentarios, adjuntos, dependencias, Geni real y automatizaciones reales quedan fuera de este fragment como implementación MVP.
* PlantillaTarea aparece como entidad en el conocimiento asociado, pero este documento no confirma las templates MVP como constantes sin CRUD.
* Recurrencia simple `none/daily/weekly/monthly` no aparece en esta fuente.
* Vistas día/semana/mes no aparecen en esta fuente.
* No inventar campos, endpoints, pantallas, tabs ni datos demo no presentes.

---

## 12. Información faltante

| Falta | Por qué importa para Codex | Impacto |
| --- | --- | --- |
| Pantalla principal de Planner | Codex necesita layout, secciones, tabs y jerarquía visual | Alto |
| Lista de tareas completa | No hay estructura de filas/cards, filtros ni orden | Alto |
| Create/Edit Task UI | Falta acción principal para demo interactiva | Alto |
| Complete Task flow | El prompt lo pide, pero esta fuente no define interacción ni feedback | Alto |
| Verification Flow MVP | Fuente contradice estados esperados; no aparecen `awaiting_verification` ni `verified` | Alto |
| Estados oficiales en inglés | Fuente trae estados en español y distintos al MVP esperado | Alto |
| Prioridades | No hay valores ni uso visual | Medio |
| Fecha límite de tareas | Se menciona vencida como calculada, pero falta campo explícito | Alto |
| Templates MVP completas | Solo aparecen Compras/Mascotas/Limpieza; faltan Medicación/Estudios/Pagos | Medio |
| Regla de templates como constantes sin CRUD | No aparece en esta fuente | Medio |
| Vista día/semana/mes | Calendar aparece, pero no sus vistas | Alto |
| Crear/Edit/Delete/List Event | No hay contratos ni UI | Alto |
| Recurrencia simple | No aparece `none/daily/weekly/monthly` | Medio |
| Acciones rápidas desde `+` | QuickActions existe, pero no se define crear tarea/evento | Medio |
| Feedback inmediato | No hay toast, loading, empty state, success/error | Alto |
| Service contract | No hay nombres de funciones, endpoints ni formato de datos | Alto |
| API backend | No hay rutas, métodos, request/response ni errores | Alto |
| Permisos CRUD | Solo hay visibilidad de relaciones, no permisos para crear/editar/completar/eliminar | Alto |
| UI de Calendar | No hay estructura visual | Alto |
| Estado vacío | No hay diseño para sin tareas/sin eventos | Medio |
| Datos demo suficientes | Hay ejemplos sueltos, no dataset completo | Medio |
| Household activo | Se menciona aislamiento por hogar, pero no cómo Planner recibe household activo | Alto |
| Error por relación no visible | Se sabe que se omite, pero no hay UI/error state | Medio |

---

## 13. Fuente

### Archivo principal

* `HomePlus — SECCION 5 RELATIONSHIP PHILOSOPHY(1).md`

Secciones usadas:

* Metadata del documento.
* `# 5. Filosofía de Relaciones del Ecosistema`.
* `## 5.1 El ecosistema como red de entidades`.
* `## 5.2 Entidades transversales`.
* `### 5.2.1 Persona`.
* `### 5.2.2 Responsabilidad`.
* `### 5.2.3 Goal`.
* `### 5.2.4 Documento`.
* `## 5.3 Geni como capa de conexión transversal`.
* `### 5.3.1 Consultar`.
* `### 5.3.2 Analizar`.
* `### 5.3.3 Relacionar`.
* `### 5.3.4 Recomendar`.
* `### 5.3.5 Automatizar`.
* `## 5.4 Reglas de navegación entre dominios`.
* `### 5.4.1 Principio de «no volver atrás»`.
* `### 5.4.2 Regla de implementación`.
* `### 5.4.3 Evitar ciclos infinitos`.
* `## 5.5 Límites de privacidad en las relaciones entre módulos`.
* `### 5.5.1 Principio de privacidad individual`.
* `### 5.5.2 Ámbitos de visibilidad`.
* `### 5.5.3 Comportamiento de Geni ante entidades privadas`.
* `### 5.5.4 Tabla de visibilidad por rol en relaciones cruzadas`.
* `## 5.6 Patrones oficiales de integración entre dominios`.
* `### 5.6.2 Planner ↔ ecosistema`.
* `## 5.7 Relaciones familiares: informativas, no permisivas`.
* `## 5.8 Multi-Hogar y aislamiento entre hogares`.
* `## 5.9 Principios de diseño para nuevas relaciones`.

### Archivo de comprensión asociado

* `Seccion 5 filsofia de las relaciones(1).txt`

Secciones/outputs usados:

* `HOMEPLUS KNOWLEDGE GRAPH — EXTRACCIÓN COMPLETA`.
* `OUTPUT 1 — ENTITIES`.
* `OUTPUT 2 — RELATIONSHIPS`.
* `OUTPUT 3 — CROSS DOMAIN RELATIONSHIPS`.
* `OUTPUT 4 — DATA FLOWS`.
* `OUTPUT 5 — BUSINESS RULES`.
* `OUTPUT 6 — ARCHITECTURAL DECISIONS`.
* `OUTPUT 7 — MISSING/IMPLIED`.
* `OUTPUT 8 — GRAPH EDGES`.

### Source map previo

* `source_map_HomePlus_SECCION_5_RELATIONSHIP_PHILOSOPHY.md`

Secciones usadas:

* `4.7 PLANNER`.
* `4.8 TASKS`.
* `4.9 EVENTS`.
* `4.10 CALENDAR`.
* `4.11 HOME`, solo como dependencia directa de Planner.
* `5. Mapa de entidades`.
* `6. Mapa de relaciones`.
* `7. Mapa de estados`.
* `8. Mapa de permisos`.
* `9. Mapa de flujos`.
* `10. Mapa de APIs`.
* `11. Mapa de UI`.
* `12. Mapa de eventos del sistema`.
* `13. Restricciones arquitectónicas detectadas`.
* `17. Contradicciones detectadas`.
* `18. Información faltante`.

