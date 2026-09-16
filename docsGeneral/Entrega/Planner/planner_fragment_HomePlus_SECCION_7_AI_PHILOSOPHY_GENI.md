# PLANNER fragment — HomePlus — SECCION 7 AI PHILOSOPHY - GENI

## 1. Rol del módulo en la demo

Información explícita o presente en el documento actual:

* Planner aparece como uno de los dominios autorizados sobre los que opera Geni.
* Planner se relaciona con tareas, eventos, carga de trabajo por miembro y coordinación de distribución de tareas.
* Geni puede leer, analizar y recomendar sobre Planner, pero no debe convertirse en ejecutor autónomo.
* El valor familiar asociado a Planner en este documento es reducir omisiones operativas, detectar acumulación de tareas atrasadas, detectar asimetría de carga y coordinar eventos entre miembros.
* El documento enfatiza que Geni no acusa, no culpa y no reemplaza la conversación humana; presenta datos objetivos para que la familia hable.
* En este documento, Planner no aparece como una pantalla detallada de CRUD. Aparece principalmente como dominio operativo usado por Geni, Home, Briefing, notificaciones conceptuales y reglas de permisos.

Dependencia externa / no desarrollar en este fragment:

* Home puede resumir Tasks y Events.
* Briefing puede mostrar información de Planner como card/resumen.
* People/Members aporta Persona, responsables, participantes, roles y permisos.
* Household aporta pertenencia de Task/Event al hogar y separación por hogar.
* Geni aporta recomendaciones y análisis, pero IA real queda fuera de este fragment.

---

## 2. Información encontrada para las 7 condiciones MVP

### 2.1 Pantalla visualmente terminada

Información encontrada:

* No se encontró una pantalla explícita de Planner.
* No se encontró UI explícita de lista de tareas.
* No se encontró UI explícita de crear/editar tarea.
* No se encontró UI explícita de calendario con vistas Día/Semana/Mes.
* No se encontró UI explícita de crear/editar evento.
* Planner aparece como item fijo en Bottom Navigation V1: `Home`, `People`, `+`, `Planner`, `More`.
* Home es pantalla inicial y resume información, no administra.
* Toda información en Home conduce al módulo que la administra.
* Briefing aparece como primer widget/card de Home.
* Briefing puede resumir información de Planner.
* Carga Familiar aparece como bloque de Home que muestra distribución de tareas entre miembros.
* Atención Requerida aparece como bloque de Home que centraliza elementos urgentes, incluyendo tareas vencidas.
* Las notificaciones contextuales pueden aparecer relacionadas con Planner.
* Las sugerencias inline pueden aparecer dentro de Planner.

Dependencia externa / no desarrollar en este fragment:

* Home, Briefing, Atención Requerida y Carga Familiar son conexiones visuales desde Home; no desarrollar Home completo aquí.
* Bottom Navigation es navegación global; no desarrollar la navegación global completa aquí.
* Geni como pantalla completa vía Quick Actions no es Planner; no desarrollar Geni aquí.

### 2.2 Datos creíbles

Datos encontrados que pueden servir como mock/demo data sin inventar nuevos ejemplos:

* Ejemplo de tarea atrasada: `Pagar servicios`.
* Ejemplo de tareas atrasadas asignadas: `Hay 3 tareas pendientes asignadas a Juan`.
* Ejemplo de alerta privada por tareas atrasadas: `Tienes una tarea atrasada: 'Pagar servicios'. ¿La revisas hoy?`
* Ejemplo de patrón de tareas atrasadas: `Ya van 3 tareas atrasadas. Esto está generando desbalance. ¿Quieres que te ayude a reorganizar? Si no se resuelve, mañana debo informar al Coordinador.`
* Ejemplo de informe al Coordinador: `Juan tiene 3 tareas atrasadas esta semana. Te informo como Coordinador para que evalúes si corresponde intervenir.`
* Ejemplo de visibilidad familiar en Briefing: `Hay 3 tareas sin dueño activo esta semana. Como familia, ¿quieren redistribuirlas?`
* Ejemplo de conflicto de agenda: `Tienes dos eventos el mismo día a la misma hora.`
* Ejemplo de conflicto recurrente de agenda: `Juan y María han tenido conflictos de horario 3 semanas seguidas. ¿Quieren revisar su rutina juntos?`
* Ejemplo de fechas importantes sin registro: `¿El 15 es el cumpleaños de Sofía? ¿Quieres planear algo?`
* Ejemplo de Coordinador inactivo visible en Briefing: `El Coordinador lleva 14 días inactivo. ¿Quieren designar un Coordinador temporal?`
* Prioridades encontradas para Task: `Baja`, `Media`, `Alta`, `Crítica`.
* Estados encontrados para Task: `Pendiente`, `En progreso`, `Completada`, `Cancelada`.
* Estado calculado: `Vencida` no es estado; se calcula.
* Estados encontrados para Event: `Programado`, `Completado`, `Cancelado`.
* `Postergado` no existe como estado de Event; equivale a modificar fecha.
* Responsabilidades/áreas operativas encontradas: `Compras`, `Mascotas`, `Limpieza`, `Vehículos`.

Datos pedidos por el MVP visual/interactivo pero no encontrados en este documento:

* No aparecen las templates predefinidas exactas del prompt: `Limpieza`, `Compras`, `Mascotas`, `Medicación`, `Estudios`, `Pagos` como set cerrado MVP.
* No aparecen ejemplos concretos de tareas de medicación, estudios o pagos salvo `Pagar servicios`.
* No aparecen datos de eventos con fecha/hora concreta salvo ejemplos narrativos de conflictos.
* No aparecen nombres de calendario, tabs, filtros ni labels visuales de Planner.

### 2.3 Acción interactiva

Acciones encontradas:

* Crear tareas.
  * Clasificación: POST_MVP si la acción la ejecuta Geni; REAL si se toma solo como acción humana/base mencionada en el archivo de comprensión.
* Reprogramar fechas de tareas.
  * Clasificación: POST_MVP si lo hace Geni; REAL/LOCAL solo como edición humana si otra fuente lo valida.
* Sugerir responsables.
  * Clasificación: DEMO PREMIUM / POST_MVP, porque es recomendación de Geni.
* Analizar carga de trabajo por miembro.
  * Clasificación: DEMO PREMIUM / POST_MVP, útil como visual de Carga Familiar mock.
* Coordinar distribución de tareas.
  * Clasificación: DEMO PREMIUM / POST_MVP, porque aparece asociado a Geni.
* Completar tarea.
  * Clasificación: REAL como acción humana; prohibido que Geni la ejecute automáticamente.
* Reasignar tarea.
  * Clasificación: REAL solo si la ejecuta un Adulto, Coordinador o responsable actual según permisos; prohibido que Geni reasigne unilateralmente.
* Verificar tarea.
  * Clasificación: REAL con contradicción documental; el archivo de comprensión dice que la verificación confirma completitud y pasa a Completada, pero no tiene estado separado.
* Crear evento.
  * Clasificación: REAL parcial; aparece como acción permitida para Adulto y Adolescente.
* Modificar fecha de evento.
  * Clasificación: REAL parcial; `postergar` equivale a modificar fecha.
* Cancelar evento.
  * Clasificación: REAL parcial; Geni no puede cancelar sin aprobación.
* Detectar eventos solapados.
  * Clasificación: DEMO PREMIUM / POST_MVP si lo hace Geni.
* Detectar retraso de evento con otros miembros.
  * Clasificación: DEMO PREMIUM / POST_MVP, ligado a Presence/ubicación.
* Mostrar información de Planner en Home/Briefing.
  * Clasificación: DEMO PREMIUM / MOCK para Home.
* Tocar información en Home para ir al módulo dueño.
  * Clasificación: REAL navegación, según regla de Home.

### 2.4 Feedback inmediato

Señales UX encontradas:

* Notificación sutil y privada para tarea atrasada.
* Alerta privada reforzada para patrón de tareas atrasadas.
* Informe informativo al Coordinador.
* Visibilidad en Briefing familiar.
* Alertas solo cuando se superan umbrales.
* Datos siempre visibles para quien tiene permiso de verlos.
* Geni no emite juicio de valor; feedback debe usar lenguaje neutral y objetivo.
* Ejemplos de mensajes de feedback:
  * `Tienes una tarea atrasada: 'Pagar servicios'. ¿La revisas hoy?`
  * `Ya van 3 tareas atrasadas. Esto está generando desbalance. ¿Quieres que te ayude a reorganizar? Si no se resuelve, mañana debo informar al Coordinador.`
  * `Juan tiene 3 tareas atrasadas esta semana. Te informo como Coordinador para que evalúes si corresponde intervenir.`
  * `Hay 3 tareas sin dueño activo esta semana. Como familia, ¿quieren redistribuirlas?`
  * `Tienes dos eventos el mismo día a la misma hora.`

No encontrado:

* No se encontró loading.
* No se encontró toast.
* No se encontró success state para crear/completar tarea.
* No se encontró error state de Planner.
* No se encontró skeleton/spinner/retry.
* No se encontró empty state de Planner.
* No se encontró estado disabled.

### 2.5 Service aislado

Pistas encontradas para un service, sin inventar nombres de funciones:

* El service de Planner podría listar o exponer Tasks como trabajo pendiente o realizado.
* El service de Planner podría listar o exponer Events como eventos familiares o personales.
* El service de Planner podría permitir acciones humanas/base: crear tarea, completar tarea, reasignar tarea, verificar tarea, crear evento, modificar fecha, cancelar evento.
* El service de Planner debe exponer datos que Home pueda resumir: tareas, eventos, tareas vencidas, distribución/carga por miembro.
* El service de Planner debe respetar Household, Persona, Membership, Role y permisos.
* El service de Planner no debe permitir que Geni complete tareas automáticamente.
* El service de Planner no debe permitir que Geni reasigne tareas unilateralmente.
* El service de Planner no debe permitir que Geni cancele o modifique eventos sin aprobación.
* El documento no menciona endpoints ni contratos API.
* El documento no menciona request/response.
* El documento no menciona nombres de funciones de service.
* Para demo visual/interactiva, la información encontrada alcanza mejor para un service local/mock que para backend real.

### 2.6 Navegación coherente

Información encontrada:

* Bottom Navigation V1 está congelado con: `Home`, `People`, `+`, `Planner`, `More`.
* Planner vive como item directo del Bottom Navigation.
* Home siempre es pantalla inicial.
* Home resume información y no administra.
* Toda información en Home conduce al módulo que la administra.
* Geni no tiene tab dedicado en Bottom Navigation.
* Geni se accede principalmente vía Quick Actions como slot fijo.
* Más de 4 niveles de profundidad en navegación es fallo de navegación.
* Objetivo de navegación: 95% de acciones en 3 niveles o menos.

Dependencia externa / no desarrollar en este fragment:

* Bottom Navigation global.
* Home global.
* Quick Actions/Geni.
* More/Settings.

### 2.7 Conexión con Home o More

Home:

* Home resume Tasks.
* Home resume Events.
* Briefing puede resumir Tasks y Events.
* Briefing es primer widget de Home.
* Carga Familiar muestra distribución de tareas entre miembros.
* Atención Requerida centraliza tareas vencidas.
* Escalamiento Nivel 4 puede hacer visible un asunto en Briefing familiar.
* Tareas atrasadas sin dueño activo pueden aparecer en Briefing familiar.
* Home conduce al módulo que administra la información.

More:

* Planner no aparece como módulo dentro de More en este documento.
* More aparece como parte de Bottom Navigation, pero no es el acceso principal a Planner.

Quick Actions:

* Geni es slot fijo en Quick Actions.
* El documento no especifica una Quick Action explícita de crear tarea o crear evento.
* Sugerencias de Geni pueden relacionarse con Planner, pero Geni real queda fuera de este fragment.

---

## 3. Clasificación para implementación

### REAL MÍNIMO

Información directamente útil para implementar o simular una experiencia base de Planner sin IA real:

* Planner como item directo de Bottom Navigation.
* Task como entidad de trabajo pendiente o realizado.
* Event como entidad de evento familiar o personal.
* Task pertenece a Hogar.
* Event pertenece a Hogar.
* Task se asigna a Persona.
* Event tiene participantes Persona.
* Task puede tener responsable.
* Task puede tener prioridad.
* Task puede tener fecha de vencimiento; `vencida` se calcula, no es estado.
* Crear tarea aparece como acción conceptual/base.
* Completar tarea aparece como acción conceptual/base.
* Reasignar tarea aparece como acción conceptual/base con restricciones de permisos.
* Verificar tarea aparece como acción conceptual/base con contradicción en estados.
* Crear evento aparece como acción conceptual/base.
* Modificar fecha de evento aparece como acción conceptual/base.
* Cancelar evento aparece como acción conceptual/base.
* Estados encontrados para Task: `Pendiente`, `En progreso`, `Completada`, `Cancelada`.
* Estados encontrados para Event: `Programado`, `Completado`, `Cancelado`.
* `Postergado` no existe como estado de Event; equivale a modificar fecha.
* Home puede resumir Tasks y Events y navegar al módulo dueño.
* Planner debe respetar roles/permisos.

### DEMO PREMIUM

Información útil para que Planner parezca más vivo, sin backend ni IA real:

* Card/mock de tareas atrasadas.
* Card/mock de conflicto de agenda.
* Card/mock de carga familiar por miembro.
* Mensajes neutrales de feedback ante tareas atrasadas.
* Visualización de asimetría de carga de tareas.
* Resumen de Planner en Briefing mock.
* Detección simulada de 3+ tareas atrasadas.
* Detección simulada de 2+ eventos solapados.
* Detección simulada de tareas sin dueño activo.
* Sugerencia simulada de reorganización.
* Sugerencia simulada de revisar rutina ante conflicto recurrente.

### LOCAL / ASYNCSTORAGE / MOCK SERVICE

Información compatible con estado local o service demo:

* Lista local de Tasks con estados encontrados.
* Lista local de Events con estados encontrados.
* Marcar Task como completada localmente.
* Cambiar responsable localmente, si se muestra como acción humana autorizada.
* Cambiar fecha de Event localmente para representar `postergar`.
* Cancelar Event localmente.
* Calcular `vencida` localmente a partir de fecha de vencimiento y estado distinto de Completada.
* Calcular badges locales para:
  * `3+ tareas atrasadas`.
  * `5+ tareas atrasadas`.
  * `3+ tareas sin dueño activo`.
  * `>40% de diferencia de carga`.
  * `2+ eventos en conflicto`.
* Exponer resumen local a Home:
  * tareas pendientes.
  * tareas vencidas.
  * próximos eventos.
  * distribución de tareas por miembro.

### POST_MVP

No convertir en MVP real desde este documento:

* Geni real creando tareas.
* Geni real reprogramando fechas.
* Geni real sugiriendo responsables con IA.
* Geni real analizando carga familiar.
* Geni real coordinando distribución de tareas.
* Escalamiento completo N1-N4.
* Umbrales configurables por hogar.
* Notificaciones reales.
* Push real.
* Auditoría completa.
* Recurrencia de Tasks.
* Subtareas.
* Dependencias de tareas.
* Comentarios.
* Adjuntos.
* Timeline.
* Participantes avanzados de eventos.
* Detección real de conflictos con IA.
* Detección real de retrasos por ubicación.
* Integración real de ubicación/presencia.
* Automatización real de creación de tareas o eventos.
* Búsqueda global contextual real.

### IGNORAR

* Se omite el contenido de dominios no solicitados por este fragment.
* Se omite cualquier desarrollo de IA real, automatización real, ubicación real, storage real o módulos externos completos.

---

## 4. UI extraíble

| Pantalla/Componente | Qué muestra | Acciones | Estados UX | Navegación | Clasificación |
| ------------------- | ----------- | -------- | ---------- | ---------- | ------------- |
| Planner en Bottom Navigation | Acceso directo al módulo Planner como tab fijo | Abrir Planner | No encontrado | Bottom Nav: Home / People / + / Planner / More | REAL MÍNIMO |
| Home Briefing relacionado con Planner | Resumen de información importante del hogar, puede incluir Tasks y Events | Abrir módulo dueño desde Home | Versión resumida permanente y versión ampliada cuando hay cambios relevantes | Home → Planner | DEMO PREMIUM / MOCK |
| Carga Familiar en Home | Distribución de tareas entre miembros | No encontrado | Puede representar asimetría de carga | Home → Planner | DEMO PREMIUM / MOCK |
| Atención Requerida en Home | Elementos urgentes; incluye tareas vencidas | Abrir detalle/módulo dueño no especificado | Urgencia visual no detallada | Home → Planner | DEMO PREMIUM / MOCK |
| Notificación privada de tarea atrasada | Mensaje neutral sobre tarea atrasada | Revisar tarea, no especificado como botón | Notificación sutil | Desde notificación hacia Planner no especificado | DEMO PREMIUM |
| Alerta privada reforzada por patrón | Mensaje de 3 tareas atrasadas y posible reorganización | Ayuda/reorganización no especificada | Alerta más directa | No especificado | DEMO PREMIUM / POST_MVP |
| Informe al Coordinador | Datos objetivos de tareas atrasadas | Coordinador decide si interviene | Informativo, sin juicio | No especificado | DEMO PREMIUM / POST_MVP |
| Briefing familiar por tareas sin dueño activo | Mensaje familiar neutral para redistribuir | Redistribuir no especificado como acción UI | Visibilidad familiar | Home / Briefing | DEMO PREMIUM / POST_MVP |
| Alerta de evento solapado | Informa dos eventos en conflicto | Revisar agenda no especificado | Alerta privada | No especificado | DEMO PREMIUM / POST_MVP |
| Task List | No se encontró UI explícita | No encontrado | No encontrado | No encontrado | FALTANTE |
| Create/Edit Task | No se encontró UI explícita | No encontrado | No encontrado | No encontrado | FALTANTE |
| Calendar | No se encontró UI explícita | No encontrado | No se encontraron vistas Día/Semana/Mes | Planner implícito | FALTANTE |
| Create/Edit Event | No se encontró UI explícita | No encontrado | No encontrado | No encontrado | FALTANTE |

---

## 5. Datos demo extraíbles

| Dato/ejemplo | Módulo | Uso posible | Fuente | Clasificación |
| ------------ | ------ | ----------- | ------ | ------------- |
| `Pagar servicios` | Tasks | Ejemplo de tarea atrasada | Documento principal, 7.3.1 | DEMO PREMIUM |
| `Hay 3 tareas pendientes asignadas a Juan` | Tasks | Copy neutral de estado de tareas | Documento principal, 7.2.2 | DEMO PREMIUM |
| `Tienes una tarea atrasada: 'Pagar servicios'. ¿La revisas hoy?` | Tasks | Notificación privada | Documento principal, 7.3.1 | DEMO PREMIUM |
| `Ya van 3 tareas atrasadas...` | Tasks | Alerta reforzada | Documento principal, 7.3.1 | DEMO PREMIUM / POST_MVP |
| `Juan tiene 3 tareas atrasadas esta semana...` | Tasks | Informe al Coordinador | Documento principal, 7.3.1 | DEMO PREMIUM / POST_MVP |
| `Hay 3 tareas sin dueño activo esta semana...` | Tasks/Home | Briefing familiar | Documento principal, 7.3.1 y 7.4.1 | DEMO PREMIUM / POST_MVP |
| `Tienes dos eventos el mismo día a la misma hora.` | Events/Calendar | Alerta de conflicto simple | Documento principal, 7.4.1 | DEMO PREMIUM / POST_MVP |
| `Juan y María han tenido conflictos de horario 3 semanas seguidas...` | Events/Calendar | Conflicto recurrente de agenda | Documento principal, 7.6.1 | DEMO PREMIUM / POST_MVP |
| `¿El 15 es el cumpleaños de Sofía? ¿Quieres planear algo?` | Events/Calendar | Sugerencia de posible evento | Documento principal, 7.4.1 | DEMO PREMIUM / POST_MVP |
| `El Coordinador lleva 14 días inactivo...` | Home/Planner indirecto | Briefing familiar contextual | Documento principal, 7.4.1 | DEMO PREMIUM / POST_MVP |
| `Baja` | Tasks | Prioridad | Archivo de comprensión, OUTPUT 1 | REAL MÍNIMO |
| `Media` | Tasks | Prioridad | Archivo de comprensión, OUTPUT 1 | REAL MÍNIMO |
| `Alta` | Tasks | Prioridad | Archivo de comprensión, OUTPUT 1 | REAL MÍNIMO |
| `Crítica` | Tasks | Prioridad | Archivo de comprensión, OUTPUT 1 | REAL MÍNIMO con riesgo |
| `Pendiente` | Tasks | Estado | Archivo de comprensión, OUTPUT 1 | REAL MÍNIMO con riesgo |
| `En progreso` | Tasks | Estado | Archivo de comprensión, OUTPUT 1 | REAL MÍNIMO con riesgo |
| `Completada` | Tasks | Estado | Archivo de comprensión, OUTPUT 1 | REAL MÍNIMO con riesgo |
| `Cancelada` | Tasks | Estado | Archivo de comprensión, OUTPUT 1 | REAL MÍNIMO con riesgo |
| `Vencida` calculada | Tasks | Badge/derivado visual | Archivo de comprensión, OUTPUT 5 / source_map | REAL MÍNIMO con riesgo |
| `Programado` | Events | Estado de evento | Archivo de comprensión, OUTPUT 1 | REAL MÍNIMO |
| `Completado` | Events | Estado de evento | Archivo de comprensión, OUTPUT 1 | REAL MÍNIMO |
| `Cancelado` | Events | Estado de evento | Archivo de comprensión, OUTPUT 1 | REAL MÍNIMO |
| `Compras` | Tasks/Responsabilidad | Categoría/responsabilidad visual | Archivo de comprensión, OUTPUT 1 | DEMO PREMIUM |
| `Mascotas` | Tasks/Responsabilidad | Categoría/responsabilidad visual | Archivo de comprensión, OUTPUT 1 | DEMO PREMIUM |
| `Limpieza` | Tasks/Responsabilidad | Categoría/responsabilidad visual | Archivo de comprensión, OUTPUT 1 | DEMO PREMIUM |
| `Vehículos` | Tasks/Responsabilidad | Categoría/responsabilidad visual | Archivo de comprensión, OUTPUT 1 | POST_MVP / dependencia externa |

---

## 6. Acciones extraíbles

| Acción | Usuario/Rol | Resultado visible | Real/Mock/Post-MVP | Fuente |
| ------ | ----------- | ----------------- | ------------------ | ------ |
| Crear tarea | Geni según documento; Persona según comprensión | Nueva Task | POST_MVP si la hace Geni; REAL parcial si la hace usuario | Documento principal 7.2.1; comprensión OUTPUT 4 |
| Completar tarea | Humano / miembro responsable no detallado | Task pasa a completada | REAL parcial | Documento principal 7.2.2; comprensión OUTPUT 4 |
| Marcar tarea completada automáticamente | Geni | Prohibido | PROHIBICIÓN | Documento principal 7.2.2 |
| Reasignar tarea | Adulto, Coordinador o responsable actual según permisos citados | Responsable cambia | REAL parcial con permisos; Geni prohibido unilateralmente | Documento principal 7.2.2 |
| Sugerir responsable | Geni | Sugerencia visual | DEMO PREMIUM / POST_MVP | Documento principal 7.2.1 |
| Reprogramar fecha de tarea | Geni según documento | Fecha modificada | POST_MVP si la hace Geni; REAL parcial si usuario edita | Documento principal 7.2.1 |
| Analizar carga de trabajo | Geni | Carga/asimetría visible | DEMO PREMIUM / POST_MVP | Documento principal 7.2.1, 7.4.1 |
| Coordinar distribución de tareas | Geni | Recomendación de redistribución | DEMO PREMIUM / POST_MVP | Documento principal 7.2.1 |
| Verificar tarea | No especificado | Tarea finalizada/completada | REAL con contradicción | Comprensión OUTPUT 1/4/5; source_map 4.8 |
| Crear evento | Adulto / Adolescente | Nuevo Event | REAL parcial | Comprensión OUTPUT 5; source_map 4.9 |
| Modificar fecha de evento | No especificado; Geni no sin aprobación | Event actualizado | REAL parcial / POST_MVP si Geni | Documento principal 7.2.1; source_map 4.9 |
| Cancelar evento | No especificado; Geni no sin aprobación | Event cancelado | REAL parcial / POST_MVP si Geni | Documento principal 7.2.1; source_map 4.9 |
| Detectar eventos solapados | Geni | Alerta privada | DEMO PREMIUM / POST_MVP | Documento principal 7.4.1 |
| Detectar conflicto recurrente de agenda | Geni | Sugerencia de conversación | DEMO PREMIUM / POST_MVP | Documento principal 7.6.1 |
| Mostrar tareas atrasadas en Briefing | Geni/Home | Card/resumen familiar | MOCK / POST_MVP | Documento principal 7.3.1, 7.4.1 |
| Abrir Planner desde Home | Usuario | Navega al módulo dueño | REAL navegación | Archivo de comprensión OUTPUT 5 |

---

## 7. Home / More / Quick Actions

### Home

* Home puede mostrar información de Planner como resumen, no como administración.
* Home resume Tasks.
* Home resume Events.
* Toda información en Home conduce al módulo que la administra.
* Briefing es el primer widget de Home.
* Briefing puede resumir información de Tasks y Events.
* Briefing puede mostrar tareas sin dueño activo cuando el caso escala a visibilidad familiar.
* Carga Familiar puede mostrar distribución de tareas entre miembros.
* Atención Requerida puede centralizar tareas vencidas.
* Para MVP visual/interactivo de Planner, estas conexiones sirven como DEMO PREMIUM/MOCK de entrada y resumen.
* IA real de Briefing no debe implementarse desde este fragment.

### More

* Planner no vive en More según este documento.
* Planner aparece como tab propio en Bottom Navigation.
* More es parte de navegación global, pero no es acceso principal de Planner.

### Quick Actions

* Geni tiene slot fijo en Quick Actions.
* El documento no define Quick Actions concretas de Planner como `crear tarea` o `crear evento`.
* Cualquier acción de Geni sobre Planner debe tratarse como DEMO PREMIUM/POST_MVP, no como IA real.

---

## 8. Backend/API detectado

No se encontró contrato API explícito en este documento.

| Endpoint/Acción | Método | Ruta | Request | Response | Estado | Clasificación |
| --------------- | ------ | ---- | ------- | -------- | ------ | ------------- |
| Crear tarea | No encontrado | No encontrado | No encontrado | No encontrado | Acción mencionada sin contrato API | REAL parcial / POST_MVP si Geni |
| Completar tarea | No encontrado | No encontrado | No encontrado | No encontrado | Acción mencionada sin contrato API | REAL parcial |
| Reasignar tarea | No encontrado | No encontrado | No encontrado | No encontrado | Acción mencionada sin contrato API | REAL parcial con permisos |
| Verificar tarea | No encontrado | No encontrado | No encontrado | No encontrado | Acción mencionada sin contrato API | REAL con contradicción |
| Crear evento | No encontrado | No encontrado | No encontrado | No encontrado | Acción mencionada sin contrato API | REAL parcial |
| Modificar fecha de evento | No encontrado | No encontrado | No encontrado | No encontrado | Acción mencionada sin contrato API | REAL parcial |
| Cancelar evento | No encontrado | No encontrado | No encontrado | No encontrado | Acción mencionada sin contrato API | REAL parcial |
| Resumen Planner para Home | No encontrado | No encontrado | No encontrado | No encontrado | Acción conceptual sin contrato API | MOCK / DEMO PREMIUM |

---

## 9. Modelo de datos detectado

| Entidad | Campo | Tipo si aparece | Estado/valores | Uso visual o interacción | Clasificación |
| ------- | ----- | --------------- | -------------- | ------------------------ | ------------- |
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
| Event | postergado | no aplica | No existe; equivale a modificar fecha | Evitar badge `postergado` | REAL MÍNIMO |
| Calendar | vista | no encontrado | No se encontraron Día/Semana/Mes | Faltante para UI | FALTANTE |
| Calendar | recurrence | no encontrado | No se encontró none/daily/weekly/monthly | Faltante para Events MVP | FALTANTE |
| Home/Briefing | resumen de Planner | no especificado | Una card; versión resumida/ampliada | Resumen de tareas/eventos | MOCK / DEMO PREMIUM |
| Notificación | categoría | no especificado | Planner, Calendar entre categorías | Feedback contextual | POST_MVP / conceptual |
| Notificación | prioridad | no especificado | Crítica, Alta, Media, Baja | Severidad visual | POST_MVP / conceptual |

---

## 10. Edge cases / errores / estados vacíos

| Caso | Comportamiento esperado | Fuente | Clasificación |
| ---- | ----------------------- | ------ | ------------- |
| Una tarea atrasada | Geni no actúa; silencio | Documento principal 7.4 | DEMO PREMIUM / POST_MVP |
| 3+ tareas atrasadas del mismo miembro | Alerta privada / reorganización sugerida | Documento principal 7.4.1 | DEMO PREMIUM / POST_MVP |
| 5+ tareas atrasadas del mismo miembro | Informe al Coordinador | Documento principal 7.4.1 | DEMO PREMIUM / POST_MVP |
| 3+ tareas atrasadas sin dueño activo | Visible en Briefing familiar | Documento principal 7.4.1 | MOCK / POST_MVP |
| >40% diferencia de carga entre miembros | Informe al Coordinador con datos objetivos | Documento principal 7.4.1 y 7.6.1 | DEMO PREMIUM / POST_MVP |
| Tarea vencida | No es estado; se calcula | Archivo de comprensión OUTPUT 1/5; source_map | REAL MÍNIMO con riesgo |
| Geni intenta completar tarea | Prohibido; completitud es responsabilidad humana | Documento principal 7.2.2 | PROHIBICIÓN |
| Geni intenta reasignar unilateralmente | Prohibido; solo sugiere | Documento principal 7.2.2 | PROHIBICIÓN |
| Reasignación efectiva | Requiere acción de Adulto, Coordinador o responsable actual según permisos | Documento principal 7.2.2 | REAL parcial |
| Verificación de tarea | Comprensión dice que pasa a Completada y no existe estado separado | Archivo de comprensión OUTPUT 1/5; source_map | REAL con contradicción |
| 2+ eventos en conflicto para un miembro | Alerta privada | Documento principal 7.4.1 | DEMO PREMIUM / POST_MVP |
| 3+ semanas con eventos solapados entre los mismos dos miembros | Sugerencia de conversación | Documento principal 7.6.1 | DEMO PREMIUM / POST_MVP |
| 15+ minutos de retraso en evento con otros miembros | Notificación a asistentes | Documento principal 7.4.1 | POST_MVP |
| Postergar evento | No existe como estado; equivale a modificar fecha | Archivo de comprensión OUTPUT 1/5; source_map | REAL parcial |
| Geni cancela/modifica evento sin aprobación | Prohibido | Documento principal 7.2.1 | PROHIBICIÓN |
| Calendar Día/Semana/Mes | No encontrado | Source_map 4.10 | FALTANTE |
| Tareas con fecha dentro del calendario | No definido explícitamente en este documento | Source_map 4.10 | FALTANTE |
| Empty state de Planner | No encontrado | Documento/source_map | FALTANTE |
| Error state de Planner | No encontrado | Documento/source_map | FALTANTE |

---

## 11. Restricciones y prohibiciones detectadas

* Geni nunca ignora permisos.
* El output de Geni se filtra por los permisos del miembro que consulta.
* Geni nunca accede a información privada sin autorización.
* Información privada no se comparte automáticamente.
* Geni nunca marca tareas como completadas automáticamente.
* La verificación de completitud es responsabilidad humana.
* Geni nunca reasigna tareas unilateralmente.
* Geni solo puede sugerir responsables o redistribución de carga.
* La reasignación efectiva requiere acción de Adulto, Coordinador o responsable actual según permisos citados.
* Geni no toma decisiones operativas sin aprobación humana.
* Geni no cancela ni modifica eventos de calendario sin aprobación.
* Geni no debe exponer a un miembro frente a todos sin escalamiento previo.
* El lenguaje debe ser neutral, objetivo, sin acusaciones ni juicios de valor.
* Datos siempre visibles para quien tiene permiso de verlos; las alertas activas solo aparecen al superar umbrales.
* Home resume información; no administra.
* Toda información en Home conduce al módulo que la administra.
* Planner debe respetar pertenencia a Hogar y permisos de Membership/Role.
* `Vencida` no es estado de Task; es cálculo.
* `Postergado` no es estado de Event; equivale a modificar fecha.
* IA real, automatizaciones reales, notificaciones reales, auditoría completa, ubicación real y detección inteligente real no deben implementarse desde este fragment.

---

## 12. Información faltante

| Falta | Por qué importa para Codex | Impacto |
| ----- | -------------------------- | ------- |
| Pantalla explícita de Planner | Codex necesita layout base | Hay que tomar UI de otra fuente o generar fragment parcial |
| Task List UI | Necesaria para demo de listar/completar tareas | Falta estructura visual |
| Create Task UI | Necesaria para acción interactiva principal | Falta formulario/campos/buttons |
| Edit Task UI | Necesaria para editar/reprogramar | Falta contrato visual |
| Calendar UI | Necesaria para eventos y calendario | No hay vista implementable en este documento |
| Vistas Día/Semana/Mes | MVP Planner las pide | No aparecen en esta fuente |
| Mostrar tareas con fecha en calendario | MVP Planner lo pide | No aparece explícitamente |
| Recurrencia simple de eventos | MVP pide none/daily/weekly/monthly | No aparece en esta fuente |
| Templates MVP exactas | MVP pide Limpieza/Compras/Mascotas/Medicación/Estudios/Pagos | Documento solo menciona PlantillaTarea y algunas responsabilidades/categorías |
| Estados oficiales MVP de Task | Prompt pide pending/completed/awaiting_verification/verified | Documento trae otros estados y contradice verificación separada |
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

---

## 13. Fuente

Archivo principal:

* `HomePlus — SECCION 7 AI PHILOSOPHY - GENI(1).md`

Secciones usadas del archivo principal:

* `7.1 Definición de Geni`
* `7.1.1 Qué es Geni`
* `7.1.2 Qué NO es Geni`
* `7.2 Capacidades y Restricciones`
* `7.2.1 Tabla de Capacidades por Dominio`
* `7.2.2 Restricciones Absolutas`
* `7.3 Sistema de Escalamiento`
* `7.3.1 Los Cuatro Niveles`
* `7.3.3 Tiempos de Referencia para Problemas Leves`
* `7.3.4 Prevención vs. Exposición`
* `7.4 Umbrales de Intervención`
* `7.4.1 Tabla de Triggers, Umbrales y Acciones`
* `7.4.2 Umbrales Configurables`
* `7.5.4 Cómo Contextualiza Geni`
* `7.6 Guardrails`
* `7.6.1 Detección de Conflictos Operativos`

Archivo de comprensión asociado:

* `Seccion 7 Filosofia de la ai - geni(1).txt`

Secciones usadas del archivo de comprensión:

* `OUTPUT 1 — ENTITIES`
* `OUTPUT 2 — RELATIONSHIPS`
* `OUTPUT 3 — CROSS DOMAIN RELATIONSHIPS`
* `OUTPUT 4 — DATA FLOWS`
* `OUTPUT 5 — BUSINESS RULES`
* `OUTPUT 6 — ARCHITECTURAL DECISIONS`
* `OUTPUT 7 — IMPLEMENTATION NOTES`

Source map usado:

* `source_map_HomePlus_SECCION_7_AI_PHILOSOPHY_GENI.md`

Secciones usadas del source map:

* `4.7 PLANNER`
* `4.8 TASKS`
* `4.9 EVENTS`
* `4.10 CALENDAR`
* `4.11 HOME`
* `6. Mapa de relaciones`
* `7. Mapa de estados`
* `12. Mapa de eventos del sistema`
* `13. Restricciones arquitectónicas detectadas`
* `17. Contradicciones detectadas`
* `18. Información faltante`
* `19. Recomendación de fragments a generar`
