<!-- DOCUMENTO CONSOLIDADO, no código ni prompt de implementación -->

> **Tipo:** TARGET de producto/UX de Planner/Tareas, consolidado a partir del histórico aportado.  
> **Fecha de recopilación:** 12 de octubre de 2026.  
> **Estado documental:** **CLOSED — recopilación**, sin reapertura de decisiones ya acordadas.  
> **Estado técnico:** no implementado; CURRENT, integración HomeCloud y QA físico sujetos a comprobación posterior.  
> **Alcance:** Tareas, Responsabilidades, Presets, Evidencia/Revisión y polish compartido estrictamente usado por estas superficies; **no Calendario/Planes como rediseño**.

## 0. Regla de lectura y procedencia

Este documento **recopila, no diseña ni cambia**. El cuerpo principal procede de la **Propuesta V0.3** del export `Planner en App.md`, que ya desarrollaba los mismos **96 IDs** reconciliados en la **Master List V0.2**. Se incorporan, en sus puntos correspondientes, los ajustes de la última revisión sobre listas largas, filtros, Dirty Guard, tamaño/adaptabilidad y límites multimedia.

**Prioridad documental:** decisiones explícitas del usuario y Product Truth aplicable; preservación del Planner Figma Total Freeze V1.1; Master List V0.2 para trazabilidad de gaps; V0.3 para descripción de experiencia; revisión posterior para los puntos rectificados. El prototipo del chat **fue únicamente visual/exploratorio**: no es un artefacto de implementación, no se presume accesible a Codex ni es autoridad técnica.

Se mantiene el **encabezado global**, el selector superior **Tareas | Calendario | Planes**, el desplegable **Pendientes/Hechas**, la entrada a **Responsabilidades** y la **navbar inferior existente**. Nunca cambiar el shell global para conseguir el polish local de Tareas.

**Nota de integridad:** la aceptación general del usuario a la experiencia planteada no convierte automáticamente cada límite numérico provisional o cada matiz catalogado como «propuesto» en una decisión individual explícitamente aprobada. La distinción se conserva, sin exigir un nuevo proceso de aprobación para esta recopilación.

---

# HOMePLUS · PLANNER TASKS
# PREMIUM POLISH & FUNCTIONAL CLOSURE — TARGET V0.4

**Estado:** consolidación documental de la dirección final de producto y UX. Este archivo está cerrado como **recopilación**; no afirma implementación, QA o validación técnica. Los límites expresamente provisionales permanecen provisionales.

**Alcance:** pestaña Tareas, creación y detalle, checklist, selección múltiple, evidencia y revisión, Responsabilidades, Presets y componentes compartidos utilizados en estas superficies.

**Autoridades:** Product Truth y decisiones aprobadas → Figma V1.1 → CURRENT auditado por Codex → refinamientos de esta propuesta.

**Referencias externas:** Apple Human Interface Guidelines, Samsung One UI, Things 3, Todoist. Sus patrones informan las decisiones, pero no reemplazan el diseño de HomePlus.

**Restricción:** esta recopilación no autoriza cambios de código; ejecución y QA siguen pendientes de autorización separada.

---

# 01. Tasks Root — Organización y navegación

**Intención de diseño:** abrir Tareas debe permitir comprender el día de la casa de un vistazo. La información y las acciones importan más que la cantidad de controles.

| ID | Decisión consolidada | Detalle de cierre |
|---|---|---|
| T-01 | **MODIFICAR — Selector compacto** | Sólo Pendientes y Hechas, mediante desplegable/popover (no segmented control). No mostrar Archivadas mientras no exista una capacidad legítima de archivo. Mantener la geometría del selector de Figma, el encabezado global y los tabs Tareas/Calendario/Planes. |
| T-02 | **MODIFICAR — Grupo Revisión** | Primero aparecen los envíos que ese usuario puede revisar y las correcciones que debe reenviar. Los envíos ajenos pendientes de revisión permanecen informativos en su grupo temporal. Una Task, una fila. |
| T-03 | **MODIFICAR — Agrupación temporal** | Revisión → Vencidas → Hoy → Mañana → Próximas → Sin fecha. Omitir grupos vacíos. Encabezados 12 pt/600, tinta secundaria y espaciado de 16–20 pt entre grupos. |
| T-04 | **KEEP — Entrada Responsabilidades** | Preservar fila navegable existente y retorno a Tareas. Ajustar sólo alineación y espaciado si la comparación visual lo requiere. |
| T-05 | **MODIFICAR — Filtros** | Sheet compacta y filtros reales preservados. Indicador discreto cuando haya filtros activos; chips o banda removibles sólo si aclaran un filtro específico, nunca una segunda barra permanente. Permitir «Limpiar» sin reabrir la sheet cuando corresponda. |
| T-06 | **RECUPERAR FIGMA — Listas largas** | Hasta 20 tareas inicialmente por grupo; cuando se supera el límite, mostrar «y N más» / «Plegar», con scroll y virtualización estables. No convertirlo en paginación global ni perder posición, filtros o agrupación. Conservar revelados del checklist. |
| T-07 | **MODIFICAR — Estados de Root** | Loading con skeleton fiel a las filas; vacío general distinto de vacío filtrado; error con Reintentar; offline sin afirmar sincronización inexistente. |
| T-08 | **KEEP + PULIR — Retorno** | Regresar desde Task Detail conserva vista, filtros, scroll y selección de grupo. Sin parpadeo o vuelta automática al inicio. |
| T-09 | **CORREGIR — Archivo histórico** | Los registros antiguos archivados no deben reaparecer como tareas pendientes en Home, Search o Attention. Sin exponer acciones de archivo denegadas. |

### Composición visual

El root conserva márgenes horizontales de 20 pt y una estructura plana. El fondo no se llena de tarjetas ni contenedores elevados.

El selector de vista, filtros y botón `+` forman una sola línea de controles. Debajo queda la entrada a Responsabilidades, seguida de las tareas.

Los encabezados de grupo no tendrán píldoras ni badges de colores. Se distinguen mediante peso tipográfico, espacios y contador sólo cuando aporta contexto.

**Qué descarto:** dashboard de porcentajes, resumen de productividad, secciones promocionales, cards individuales por Tarea y paginación artificial en listas normales.

---

# 02. TaskRow — Fila final

**Intención de diseño:** una fila debe responder qué se hace, a quién le toca, cuándo y cuál es la próxima acción.

| ID | Decisión consolidada | Detalle de cierre |
|---|---|---|
| F-01 | **MODIFICAR — Anatomía** | Título 15/500, metadata 12/400, hasta dos líneas de título en reposo con altura adaptativa; slot contextual de referencia 88 pt y `···` de 44 × 44 pt. Separador hairline. No reducir el área táctil para comprimir la fila. |
| F-02 | **MODIFICAR — Acción contextual** | Pendiente: círculo. Tomable: «Me encargo». En revisión autorizada: «Revisar». Corrección: «Volver a enviar». Resuelta: estado informativo. |
| F-03 | **AÑADIR — Círculo de completar** | Diámetro visual cercano a 22 pt, objetivo táctil de 44 pt. Sin animación de check si la operación todavía no está confirmada. |
| F-04 | **CORREGIR — `···`** | Popover medido desde el disparador, fuera de los límites de recorte de la lista; se cierra en scroll, navegación, pérdida de ancla y toque exterior. |
| F-05 | **MODIFICAR — Menú** | Acciones autorizadas, 44 pt por fila, etiqueta clara, destructivos separados al final. No mostrar acciones deshabilitadas como si fueran alcanzables. |
| F-06 | **AÑADIR — Swipe derecho** | Revelar «Completar» o «Enviar evidencia»; nunca ejecutar por distancia o velocidad del gesto. Requiere tocar la acción revelada. |
| F-07 | **AÑADIR — Swipe izquierdo** | Revelar «Editar» y «Cancelar», cuando corresponda. Editar abre el detalle editable; Cancelar confirma la consecuencia. |
| F-08 | **AÑADIR — Feedback de completion** | Check → wash muy suave → reflow de filas. Propuesta: reconocimiento 160–220 ms y reflow 180–220 ms, sin espera decorativa adicional. |
| F-09 | **MODIFICAR — Estado inline** | Un solo indicador contextual por fila. El estado de corrección y revisión se deriva de la autoridad real, no de una proyección incompleta. |
| F-10 | **MODIFICAR — Responsables** | Avatar pequeño + nombre. Para varios asignados, rostros agrupados y resumen legible; detalles completos en Task Detail. Prioridad de truncamiento para datos secundarios. |
| F-11 | **MODIFICAR — Mutaciones** | Respuesta inmediata al toque, protección contra doble ejecución, estado de guardado y rollback visual completo si falla. |

### Gramática de las acciones

- El círculo es neutro en reposo.
- «Me encargo» utiliza tinta secundaria.
- «Revisar» y «Volver a enviar» pueden usar el tono presionado de marca, sin botón lleno dentro de cada fila.
- Un estado informativo no parece un botón.
- `···` nunca sustituye la acción más frecuente.

### Swipe y selección

Sólo puede haber un swipe abierto.

Abrir un popover cierra el swipe anterior. Entrar en selección múltiple cierra todos los swipes.

Los gestos no deben competir con el scroll vertical. El movimiento debe seguir el dedo y asentarse suavemente al terminar.

### Feedback premium

No conservaría obligatoriamente los 460 ms de permanencia del prototipo original. En una aplicación doméstica, marcar diez tareas consecutivas debería sentirse ágil.

La confirmación verde sólo representa cumplimiento confirmado. Un envío que necesita revisión no debe parecer una aprobación definitiva.

---

# 03. Selección múltiple

**Intención de diseño:** gestionar varias tareas con rapidez, sin convertir cada fila en una pequeña pantalla administrativa.

| ID | Decisión consolidada | Detalle de cierre |
|---|---|---|
| S-01 | **AÑADIR — Long press** | Activa modo selección y selecciona esa fila. Haptic ligero y cambio visual inmediato. |
| S-02 | **AÑADIR — Indicadores** | Sustituir temporalmente el círculo de completar por un check de selección claramente diferente. |
| S-03 | **AÑADIR — Barra contextual** | Cabecera «N seleccionadas» con Cancelar; barra inferior sobre la navegación, con acciones frecuentes y «Más». |
| S-04 | **AÑADIR — Operaciones** | Fecha, hora, responsables, prioridad, Plan, completar, cancelar, reactivar y Papelera, respetando estados y permisos. |
| S-05 | **AÑADIR — Selección mixta** | Antes de una operación parcial: «Se pueden modificar 5 de 7 tareas». Explicar exclusiones y pedir confirmación. |
| S-06 | **AÑADIR — Verificación protegida** | Aprobar y Pedir un cambio nunca funcionan en lote. La evidencia requiere revisión individual. |
| S-07 | **AÑADIR — Gestos coordinados** | Mientras hay selección, se deshabilitan swipes y botones de completar. Salir restaura las filas sin saltos. |

### Ajuste nuevo recomendado

Además del long press, **«Seleccionar tareas» aparecerá en el menú de la vista**, para permitir descubrir la función sin conocer el gesto.

### Barra de operaciones

En vez de ocho botones permanentes:

- Fecha
- Responsables
- Más

Dentro de Más: prioridad, hora, Plan y transiciones permitidas.

Si todas las tareas seleccionadas son completables sin evidencia, también puede aparecer «Completar».

### Una tarea seleccionada

«Editar» abre el detalle. No aparece un editor por lote con una sola tarea.

### Todas las tareas

«Seleccionar todas» opera sobre el conjunto del filtro o grupo elegido, con cantidad explícita. Nunca incluye otras vistas, otros filtros ni tareas ocultas de manera inesperada.

### QA

Long press, scroll, swipe, salida, selección de más de 50 tareas, cambios parciales, pérdida de conexión y operaciones concurrentes.

---

# 04. Nueva Tarea

**Intención de diseño:** poder crear una tarea en segundos, pero sin ocultar funciones necesarias.

| ID | Decisión consolidada | Detalle de cierre |
|---|---|---|
| C-01 | **KEEP + PULIR — Entrada directa** | El `+` del root abre Nueva Tarea. Conservar SheetHost de Fase 1; eliminar cabeceras duplicadas. No modificar el comportamiento del botón global de Quick Actions. |
| C-02 | **MODIFICAR — Composición** | Título prominente, propiedades en filas ligeras, hairlines y menos cajas. CTA de 52 pt en footer estable. |
| C-03 | **MODIFICAR — PresetStrip** | Tarjetas de 96 × 72 pt, gap de 8 pt, propios primero y «Nuevo preset» al final. |
| C-04 | **KEEP — Teclado** | Sin autofocus inicial. Focus al tocar campo, scroll coordinado y footer visible. |
| C-05 | **KEEP — Fecha y hora** | Calendario mensual y selector vertical 24 h ya implementados. No crear otro selector. |
| C-06 | **MODIFICAR — Asignación múltiple** | Varios integrantes elegibles, con un único cumplimiento compartido `shared_once`. Sin modo `each_person`. |
| C-07 | **MODIFICAR — Más detalles** | Nota, Checklist, Plan, Prioridad, Requiere revisión y Repetir; cerrado inicialmente, salvo campos rellenados que necesiten mostrarse. |
| C-08 | **MODIFICAR — Editor de pasos** | Texto, añadir, quitar, Enter para siguiente paso, reordenar mediante grip; conservar foco y scroll. |
| C-09 | **KEEP — Revisión** | Toggle que configura el requisito; no adjuntar archivos durante la creación. |
| C-10 | **AÑADIR — Repetir** | Convertir borrador en Responsabilidad, transfiriendo campos compatibles y avisando qué información puntual no se conserva. |
| C-11 | **CORREGIR — Dirty Guard** | Proteger exclusivamente la pérdida real del borrador, incluso si los datos proceden de un preset. Aplicar y deseleccionar hasta volver al estado inicial no debe producir falso aviso; cerrar perdiendo campos sí debe advertir; reemplazar edición manual requiere confirmación. |
| C-12 | **RETIRAR — Duración** | No mostrar ni copiar duración estimada. Mantener los datos históricos sin borrados destructivos. |

### Orden exacto del formulario

1. Título.
2. Desde un preset.
3. Fecha.
4. Responsables.
5. Hora.
6. Más detalles.
7. Crear tarea.

La nota, checklist, prioridad y revisión sólo aparecen expandidos cuando se abre Más detalles o cuando un preset ya rellenó esos datos.

### Asignación

Si se eligen varias personas, una sola tarea puede ser completada por cualquiera de las asignadas.

No se crean varias tareas, ni varias evidencias obligatorias por persona, ni una obligación individual por asignado.

### Preset aplicado

La tira no sustituye al título: lo rellena.

Si la persona modifica después el título, puede continuar normalmente. Elegir otro preset debe explicar qué datos manuales se van a reemplazar.

No inventar fecha ni responsable.

---

# 05. Task Detail y edición integrada

**Intención de diseño:** la mejor versión de una Tarea debe verse como un documento sencillo que se puede editar, no como una colección de cards y formularios separados.

| ID | Decisión consolidada | Detalle de cierre |
|---|---|---|
| D-01 | **MODIFICAR — Cabecera** | Título 22/700, hasta tres líneas, acciones de gestión alineadas y estados redundantes eliminados. |
| D-02 | **MODIFICAR — Propiedades** | Filas planas de al menos 44 pt, labels secundarios y valores 15/500. Cards sólo para evidencia o solicitud de cambios. |
| D-03 | **AÑADIR — Edición integrada** | «Editar» transforma el mismo Detail en controles, preservando estructura, foco y scroll. |
| D-04 | **MODIFICAR — Footer** | CTA de 52 pt, radio 16, safe area correcta y padding de contenido proporcional. No hay footer si no existe acción válida. |
| D-05 | **MODIFICAR — Selectores** | Reutilizar DatePicker, TimePicker, selección de integrantes y Plan; diferentes controles con affordances coherentes. |
| D-06 | **MODIFICAR — Checklist** | N/M pasos, expandir desde diez, toggles, edición y reordenamiento. Confirmación al completar con pasos pendientes. |
| D-07 | **AÑADIR — Corrección** | Bloque suave «QUÉ HAY QUE CAMBIAR», motivo principal, quién lo pidió y cuándo. |
| D-08 | **MODIFICAR — Evidencia** | Medios vigentes en grilla, versión, autor y estado; historial accesible sin competir con la tarea. |
| D-09 | **CORREGIR — Relaciones** | Mostrar título real de la Responsabilidad y nombre/navegación del Plan. |
| D-10 | **KEEP — Actividad** | Conservar cronología actual, sólo ajustando separación y jerarquía si hace falta. |
| D-11 | **MODIFICAR — Conflictos** | Guardar únicamente después de validar versión; si hay conflicto, conservar borrador y ofrecer actualización. |
| D-12 | **AÑADIR — Protección en revisión** | Mientras hay un envío pendiente de aprobación, impedir cambios que alteren su significado; permitir consultas y cambios informativos autorizados. |

### Transición lectura → edición

No se desmonta Task Detail.

El título se convierte en TextInput en el mismo lugar.

Las propiedades muestran su affordance de edición.

El checklist puede editarse donde antes se consultaba.

El CTA pasa a «Guardar cambios».

**Motion propuesto:** crossfade y microdesplazamiento de 160–220 ms como máximo, manteniendo la posición del contenido. Sin girar toda la pantalla ni abrir otra ruta.

### Guardado

- Sin cambios: «Guardar» no envía una mutación inútil.
- Con cambios: progreso visible y una sola operación lógica.
- Éxito: vuelve a lectura donde estaba.
- Error: conserva los campos editados.
- Conflicto: no sobrescribe a otra persona.
- Volver con cambios: Dirty Guard.

### Checklist

Si `done < total`, incluso **0 de 5**, completar solicita confirmación.

Texto contextual: «Quedan 5 pasos sin marcar».

Acciones «Seguir marcando» y «Completar igual».

Si la Tarea requiere evidencia, «Completar igual» abre el compositor multimedia, sin registrar todavía un cumplimiento confirmado.

---

# 06. Evidencia y revisión — Reutilización de HomeCloud

**Esta es la modificación funcional más importante, pero no requiere construir una cámara nueva.**

## 06.1 Frontera técnica

### Reutilizar de `homecloud-current`

- Captura real de fotos.
- Captura real de videos.
- Permisos de cámara y biblioteca.
- Selección múltiple y mixta.
- Review de medios.
- Contrato neutral `UploadLocalArtifact`.
- Staging local cuando corresponde.
- Upload queue y coordinación.
- Reintentos y recuperación.
- Idempotencia del transporte.
- Estados de progreso.
- Cancelación real cuando está soportada.

### Mantener propio de Planner

- Identidad de la Tarea.
- Identidad del cumplimiento.
- Personas asignadas.
- Permisos para enviar/verificar.
- Versión de evidencia.
- Estado pendiente/revisión/corrección/aprobado.
- Historial de verificadores.
- Política de acceso privado a los archivos.

**HomeCloud transporta los medios; Planner determina qué significan.**

No se ejecuta el flujo de creación de Memory ni se vincula automáticamente evidencia a un álbum.

## 06.2 Lista de modificaciones

| ID | Decisión consolidada | Detalle de cierre |
|---|---|---|
| E-01 | **CORREGIR — Inicio del envío** | Toda entrada para completar una Tarea verificable abre el compositor de evidencia. Jamás muta directamente a esperando revisión sin medios. |
| E-02 | **REUTILIZAR — Captura** | Usar componentes de cámara, galería y review de HomeCloud; ocultar campos exclusivos de Memories. |
| E-03 | **AÑADIR — Múltiples medios** | Fotos y videos múltiples/mixtos en un envío; grilla de tres columnas, miniaturas cuadradas y gap de 8 pt. El máximo de cinco archivos permanecía como propuesta provisional, no como límite técnico o de producto cerrado. |
| E-04 | **MODIFICAR — Validaciones** | Formato, duración, tamaño y cantidad efectivos según infraestructura y seguridad verificadas. El video de hasta 60 segundos fue una propuesta provisional, no un límite aprobado o verificado. |
| E-05 | **CORREGIR — Confirmación** | Upload y persistencia de todos los medios válidos antes de presentar el cumplimiento para revisión. Nada de éxito parcial silencioso. |
| E-06 | **AÑADIR — Viewer** | Fotos con zoom y paginación; videos con controles, estado de carga y error recuperable. |
| E-07 | **MODIFICAR — Revisar** | Desde root o detalle, «Revisar» abre el envío, nunca aprueba directamente. |
| E-08 | **AÑADIR — Decisión** | «Aprobar» y «Pedir un cambio», ambas visibles en el contexto de evidencia. |
| E-09 | **MODIFICAR — Corrección** | Compositor nuevo vacío, motivo de cambio visible y versiones anteriores conservadas. |
| E-10 | **MODIFICAR — Autoría/versiones** | Cualquier integrante asignado puede reenviar; nadie puede aprobar su propio trabajo vigente. Concurrencia controlada. |
| E-11 | **CORREGIR — Privacidad** | Evitar URLs públicas permanentes; acceso autenticado/autorizado y alcance del hogar. |
| E-12 | **CORREGIR — Home** | El completado desde Home debe respetar exactamente el mismo requisito de evidencia que Tasks. |

### Layout del compositor

**Header:** «Enviar a revisión».

**Subtítulo:** nombre de la Tarea.

**Contenido:** grilla de miniaturas seleccionadas y una celda «Agregar» al final.

**Pie:** «N archivos seleccionados» y CTA «Enviar a revisión».

El compositor no necesita fecha de captura editable, álbum, destino de Memories ni descripción obligatoria del archivo.

Puede admitir comentario opcional del cumplimiento, pero no lo haría protagonista ni requisito.

### Estados de archivo

- Seleccionado.
- Preparando.
- Subiendo.
- Verificando.
- Confirmado.
- Fallido.
- Cancelado.

El usuario no necesita conocer estos nombres técnicos, pero sí recibir feedback comprensible.

### Envío parcial

Por ejemplo, si de cinco archivos tres suben y dos fallan, la Tarea **todavía no está enviada a revisión**. Los cinco son un ejemplo, no el máximo definido.

Los tres confirmados se conservan vinculados al borrador del envío; sólo se reintentan los dos fallidos.

El conjunto se presenta como una versión válida cuando todos sus archivos obligatorios están confirmados.

Si no hay confirmación total, el estado previo de la Tarea permanece intacto.

### Viewer de evidencia

La grilla muestra imágenes reales con poster de video cuando exista.

Al tocar una miniatura, se abre el visor.

**Motion:** preferir expansión visual desde la miniatura cuando podamos conservar geometría y origen. Si la miniatura no está montada o el medio todavía no cargó, usar crossfade corto. Nunca abrir un rectángulo negro como transición.

### Revisar

La pantalla presenta:

1. Qué tarea se completó.
2. Quién envió.
3. Cuándo.
4. Fotos/videos.
5. Pregunta «¿Está todo bien?».
6. Aprobar / Pedir un cambio.

El revisor puede desplazarse por la evidencia y abrirla en fullscreen.

### Pedir un cambio

Sheet compacta:

Título: «Pedir un cambio».

Campo: «¿Qué habría que cambiar?».

CTA: «Enviar pedido».

El motivo es obligatorio; no se envía vacío.

### Reenvío

Nuevo compositor vacío, misma infraestructura de HomeCloud, versión nueva en Planner.

El historial conserva quién presentó, quién revisó y cuál fue el motivo.

---

# 07. Responsabilidades

**Intención de diseño:** la regla de una actividad habitual debe ser fácil de leer y configurar, sin exponer el mecanismo técnico de generación.

| ID | Decisión consolidada | Detalle de cierre |
|---|---|---|
| R-01 | **MODIFICAR — Lista** | Grupos Activas e Inactivas. Sin vista Archivadas. Papelera global. |
| R-02 | **MODIFICAR — Fila** | Altura de referencia 63 pt, título 15/500, frecuencia/reparto 12/400, separador y `···` contextual. |
| R-03 | **MODIFICAR — Estrategia** | «Siempre la misma persona», «Por turnos» y «Cualquiera puede encargarse». Sin opción adicional redundante. |
| R-04 | **KEEP + SIMPLIFICAR — Rotación** | Mantener algoritmo automático equitativo y eliminar editor manual de posiciones de la UI. |
| R-05 | **MODIFICAR — Frecuencia** | Cinco modalidades existentes, formulario progresivo y vista previa textual de la regla. |
| R-06 | **COMPLETAR — Generación** | Scheduler autónomo que reutiliza el materializador y sus garantías de idempotencia; una única ejecución abierta. |
| R-07 | **MODIFICAR — Detail** | Conservar próxima tarea, historial y configuración. Editar en la misma pantalla, sin crear otro detalle. |
| R-08 | **MODIFICAR — Pausa** | Preguntar sólo si hay Tarea abierta: conservarla o enviarla a Papelera. |
| R-09 | **MODIFICAR — Lifecycle** | Activa/Inactiva/Papelera, restauración inicialmente Inactiva como recomendación de seguridad. |
| R-10 | **KEEP — Cambios futuros** | Editar regla no modifica tareas anteriores. La Tarea vigente se modifica desde Task Detail. |
| R-11 | **COMPLETAR — Elegibilidad** | Detectar salida/cambio de integrantes sin esperar a que alguien abra Planner. |
| R-12 | **CORREGIR — Ejecución cancelada** | Registrar resolución sin marcarla completada; liberar la generación con reglas coherentes de recurrencia/restauración. |
| R-13 | **COMPLETAR — Responsable fijo** | Si deja de estar disponible, reasignar a integrante elegible e informar. Sin elegibles, mostrar configuración pendiente. |

### Lista

Activas primero, Inactivas debajo.

No agregaría filtros adicionales inicialmente.

El título es lo más importante; frecuencia y distribución aparecen en una sola línea secundaria cuando entran.

No tiene checkbox ni botón Completar, porque la ejecución vive dentro de Tasks.

### Detalle

Secciones:

1. Título y estado.
2. Cómo se reparte.
3. Cada cuándo.
4. Próxima tarea.
5. Tarea actual.
6. Historial.
7. Pausar / Volver a activar.
8. Gestión secundaria.

No mostraría una tarjeta separada para cada propiedad.

### Selector de reparto

- Siempre la misma persona → selector de integrante.
- Por turnos → varios integrantes.
- Cualquiera puede encargarse → conjunto elegible cuando corresponde.

La rotación distribuye de forma automática, sin botones de subir/bajar personas.

### Selector de frecuencia

Opciones visibles:

- Todos los días.
- Días de la semana.
- Cada cierto tiempo.
- Una vez al mes.
- Después de completar.

Un selector progresivo muestra sólo los campos necesarios.

Debajo: «Se repetirá los lunes y jueves» o «Volverá a tocar 3 días después de completar la anterior».

### Editar una Responsabilidad

Modo edición en el propio Detail.

Guardar cambia la regla futura.

Si se está modificando una ejecución particular, se navega a su Task Detail.

### Pausar

Si no hay ejecución vigente: pausa directa y feedback con Deshacer autorizado.

Si existe:

**«¿Qué hacemos con la tarea actual?»**

Acción recomendada: «Conservar tarea y pausar».

Alternativa: «Mover tarea a Papelera y pausar».

No hay estado «suspendida».

### Restaurar

Propongo restaurar una Responsabilidad en estado Inactiva, para que no genere tareas inesperadamente.

Después la persona puede volver a activarla explícitamente.

### Recurrencia después de completar

Las ejecuciones esperando aprobación siguen abiertas.

Las fechas no se acumulan mientras haya una Tarea vigente.

Si la ejecución se cancela, mi propuesta es usar la cancelación como referencia excepcional de la siguiente planificación, pero conservar explícitamente el resultado «No realizada». Esto evita bloquear indefinidamente la regla y no equivale a marcarla completada.

Ese comportamiento excepcional debe quedar visible en el contrato, no oculto en el scheduler.

---

# 08. Presets

**Intención de diseño:** un portapapeles de configuración reutilizable para crear una sola entidad, sin copiar sus fechas, responsables ni progreso.

| ID | Decisión consolidada | Detalle de cierre |
|---|---|---|
| P-01 | **MODIFICAR — Tira** | Tarjetas 96 × 72, propio primero, oficial después, «Nuevo preset» al final. |
| P-02 | **CORREGIR — Campos** | Copiar todos los campos compatibles de la entidad, excepto fecha y responsables. No copiar identidad, estado ni historial. |
| P-03 | **CORREGIR — Aplicación reversible** | Si se cambia o deselecciona un preset, preservar cambios manuales y restaurar correctamente el borrador. |
| P-04 | **MODIFICAR — Biblioteca** | Búsqueda y filtros sólo para tipos realmente admitidos, secciones «De HomePlus» y «De tu hogar». |
| P-05 | **MODIFICAR — Editor** | Reutilizar formulario y controles existentes; eliminar duración, incluir hora reutilizable. |
| P-06 | **KEEP + PULIR — Desde entidad** | «Guardar como preset» precarga configuración compatible para revisar antes de guardar. |
| P-07 | **MODIFICAR — Retorno** | Crear desde tira vuelve al borrador con el preset aplicado; crear desde biblioteca vuelve a biblioteca. |
| P-08 | **KEEP — Oficiales** | Originales protegidos, copia editable al hogar y gestión de propios. |
| P-09 | **AÑADIR — Hora** | Conservar la hora definida en el preset, sin inventar una fecha puntual. |
| P-10 | **COMPLETAR — Responsabilidades** | Guardar frecuencia y estrategia de reparto sin miembros concretos ni calendario puntual. |

### Regla de aplicación

El preset rellena los campos que contiene.

No crea la entidad.

No deja una relación permanente con la entidad creada.

Si ya había valores escritos que serían reemplazados, pregunta antes.

### Checklist

Copia texto y orden.

Todos los pasos comienzan sin marcar.

### Hora

La hora puede quedar precargada aunque todavía no se eligió fecha.

No se inventa el día de hoy. Si el contrato de creación requiere fecha para utilizar esa hora, la UI lo explica al guardar.

### Biblioteca

Filas planas, buscador superior y separación entre oficiales y propios.

No agregaría estadísticas de uso, contadores de popularidad ni badges de colores por tipo.

---

# 09. Polish transversal e integraciones

| ID | Decisión consolidada | Detalle de cierre |
|---|---|---|
| X-01 | **CORREGIR — Popovers** | Medición en ventana, clamp vertical/horizontal, margen seguro 8–12 pt, ítems de 44 pt, cierre fiable en scroll/navegación. |
| X-02 | **MODIFICAR — Toast** | Conservar ToastHost de Fase 1. Entrada 200 ms, salida 150 ms, visibilidad sobre navegación y entrega diferida cuando una sheet lo oculta. |
| X-03 | **CORREGIR — Undo** | Reversión verdadera y error visible si el Undo falla. Nunca un botón que no puede revertir. |
| X-04 | **KEEP + QA — Sheets** | Preservar host, teclado, detents, safe areas y Dirty Guard. Corregir sólo diferencias reales de geometría/comportamiento. |
| X-05 | **MODIFICAR — Motion** | Unificar press, expansión, reflow, selección, apertura y cierre; Reduced Motion para todas las superficies. |
| X-06 | **MODIFICAR — Haptics** | Reutilizar categorías existentes: selección, acción, éxito y advertencia. Evitar dobles vibraciones. |
| X-07 | **CONECTAR — Estados** | Usar catálogo existente de loading, queued, offline, error, conflicto y readonly en Tasks. |
| X-08 | **MODIFICAR — Accesibilidad** | Objetivos táctiles ≥44 pt, VoiceOver, Dynamic Type, contraste, Reduce Motion y controles alternativos a gestos. |
| X-09 | **CORREGIR — Integraciones** | Misma Task y mismas reglas desde Home, Plans, Search, deep links y Papelera. Calendario continúa con su contrato propio. |
| X-10 | **CORREGIR — Autoridad** | Una misma política y semántica de completar/verificar independientemente de la pantalla que inicia la acción. |

### Popovers

Ancho de referencia 192–224 pt, adaptado al contenido.

Radio 14 pt, sombra única, fondo de superficie.

Se abren cerca del botón, respetan safe areas y no cambian inesperadamente de posición.

**Un menú abierto jamás puede sobrevivir a la destrucción de su fila o a un cambio de ruta.**

### Toasts

Uno visible a la vez, sin perder silenciosamente una acción Deshacer vigente.

La implementación puede serializar acciones reversibles importantes y reemplazar mensajes puramente informativos; no necesita convertir toda la app en una cola de notificaciones.

### Motion

Tiempos propuestos:

| Interacción | Rango |
|---|---|
| Press/feedback inicial | 60–110 ms |
| Menú anclado | 120–170 ms |
| Cambio lectura/edición | 160–220 ms |
| Expansión de checklist | 160–220 ms |
| Reflow de tarea | 180–220 ms |
| Toast | Entrada 200 ms, salida 150 ms |
| Sheets existentes | Mantener 300/200 ms de Fase 1 salvo falla observada |
| Viewer multimedia | 220–320 ms si hay continuidad desde miniatura |

No usar rebotes, blur costoso o animaciones encadenadas para acciones cotidianas.

### Haptics

Una sola respuesta táctil por intención.

El éxito no se anuncia con vibración antes de la confirmación.

Los eventos informativos no necesitan haptic.

### Estados visuales

Ninguna pantalla puede finalizar con:

- blanco vacío por error;
- imagen negra persistente sin recuperación;
- toast de éxito sobre una mutación fallida;
- botón activo con permiso denegado;
- spinner infinito sin estado;
- fila que desaparece antes de confirmar;
- menú que reaparece después de navegar;
- contenido tapado por teclado o footer.

---

# 10. Comprobaciones obligatorias de los flujos principales

Estas son pruebas de cierre de producto, no nuevas etapas de implementación.

## Crear Tarea

Crear sin preset, crear desde preset, crear desde Plan, varias personas asignadas, checklist, prioridad, fecha/hora, revisión, borrador descartado y conflicto de versión.

## Completar

Desde fila, swipe, Task Detail y Home; sin checklist, con 0/N pasos, con N/N, con y sin revisión; red lenta, error de mutación, reintento y cambio de permisos.

## Evidencia

Una foto, varias fotos, un video, mezcla, permiso denegado, archivo inválido, subida interrumpida, fallo parcial, reintento selectivo, envío confirmado, revisión, aprobación, corrección, reenvío y concurrencia.

## Selección múltiple

Una seleccionada, varias del mismo estado, mezcla de estados, más de 50 seleccionadas, scroll, cambio de filtro, operación parcial, permisos y salida del modo.

## Responsabilidades

Cinco frecuencias, tres estrategias, generación sin abrir la app, una sola ejecución vigente, rotación equitativa, pausa, reactivación, cancelación, Papelera, restauración y salida de integrante.

## Presets

Crear, guardar desde entidad, aplicar, deseleccionar, reemplazar, editar propio, duplicar oficial, eliminar y comprobar que nunca arrastra responsables, fechas concretas o progreso.

## iPhone y accesibilidad

Pantalla pequeña, Dynamic Type grande, VoiceOver, Reduce Motion, teclado abierto, navegación rápida, scroll mientras hay popover, tap fuera, volver durante una operación y reconexión.

---

# 11. Registro de matices específicos conservados de V0.3

Esta tabla conserva literalmente el origen de los matices **DEC** de V0.3. No son ideas agregadas en V0.4: cuando V0.3 los declaró expresamente propuestos y no aprobados individualmente, esa condición histórica se respeta. La dirección general recibió conformidad posterior, pero no hay aprobación individual documentada de cada umbral o excepción. La corrección de DEC-07 se identifica expresamente por su revisión posterior.

| ID | Mi propuesta |
|---|---|
| DEC-01 | Restaurar Responsabilidad de Papelera → Inactiva. |
| DEC-02 | En recurrencia «Después de completar», una ejecución cancelada libera la regla y utiliza excepcionalmente su fecha de resolución para calcular la siguiente, sin computarla como completada. |
| DEC-03 | Durante revisión, bloquear cambios estructurales al cumplimiento; permitir ediciones informativas autorizadas. |
| DEC-04 | Impedir aprobación por quien completó o presentó la evidencia vigente; explicar falta de revisor elegible. |
| DEC-05 | Motivo obligatorio al pedir cambios; comentario opcional al enviar evidencia. |
| DEC-06 | Propuesta provisional de hasta 5 archivos por versión y videos de hasta 60 segundos. No congelar límites sin verificar infraestructura y requisitos de seguridad reales. |
| DEC-07 | **Sustituido por la revisión posterior:** recuperar la regla original de Figma, mostrar hasta 20 tareas por grupo y ofrecer «y N más»/«Plegar»; conservar scroll estable. |
| DEC-08 | Permitir entrar en selección múltiple mediante long press y acción visible «Seleccionar tareas». |
| DEC-09 | Reducir la permanencia del reconocimiento visual de completar respecto del prototipo cuando la prueba en iPhone confirme mayor fluidez. |

---

# 12. Exclusiones expresas

No desarrollar:

- Un nuevo módulo de cámara.
- Un segundo uploader de Planner.
- Un motor paralelo de almacenamiento de evidencia.
- Una galería multimedia general dentro de Tasks.
- Tareas personales.
- Archivo de Tasks sin capability.
- Archivo de Responsabilidades.
- Duración estimada.
- Cumplimientos separados por cada integrante asignado.
- Gamificación de responsabilidades.
- Reparto con ponderaciones competitivas.
- Dashboard de productividad familiar.
- Nuevos flujos de Calendario.
- Rediseño general de HomeCloud.

---

# 13. Definición de DONE

Una modificación está terminada sólo cuando coinciden estas cuatro cosas:

**Producto:** la operación significa lo que el usuario espera.

**Experiencia:** geometría, jerarquía, interacción, feedback y estados corresponden al target.

**Persistencia:** el backend confirma el estado correcto y resiste errores, duplicaciones, permisos y concurrencia.

**Dispositivo:** los flujos táctiles, visuales y multimedia pasan en iPhone real.

Una prueba automatizada verde no reemplaza el cierre de experiencia física.

**Estado final: TARGET V0.4 · CONSOLIDACIÓN DOCUMENTAL CLOSED. Cero implementación autorizada.**

---

## Anexo A. Reconciliación de la última revisión (sin nuevos requisitos)

| Punto | Criterio vigente recopilado | Proveniencia |
|---|---|---|
| **T-06 / DEC-07** | Se recupera «hasta 20 por grupo» + «y N más» / «Plegar», conservando scroll estable. | Regla ya medida en Figma V1.1 y revisión posterior a V0.3. |
| **T-05** | Indicador útil cuando hay filtros; no banda permanente ni chips redundantes. | Ajuste de la revisión posterior a V0.3. |
| **C-11** | Dirty Guard basado en pérdida real del borrador, incluso si procede de un preset. | Aclaración posterior a V0.3. |
| **F-01 / densidad** | Fila adaptable (dos líneas de título); área táctil ≥44 pt; no comprimir para «hacer entrar» más. Referencia de Figma de fila de dos líneas ~85 pt y de ancho de texto ~208 pt a 360 pt. | Figma V1.1 y último comentario del usuario sobre acomodamiento. |
| **E-03/E-04 / DEC-06** | Selección mixta y múltiples archivos sí; límites 5 archivos / 60 segundos siguen **provisionales** hasta verificar el donor multimedia. | V0.3 y revisión posterior que explícitamente evitó congelar límites. |

**Regla visual reiterada por el usuario:** la preocupación final es que la composición no abrume. El tamaño reducido del teléfono usado en el prototipo no sirve como medida física. La comprobación debe realizarse contra el código y pantallas reales, sin reemplazar espacios útiles por densidad indiscriminada.

## Anexo B. Autoridades técnicas aún por comprobar (no decisiones nuevas)

- **CURRENT:** `C:\Users\thega\Desktop\HomePlus-worktrees\planner-current`.
- **Donor multimedia:** `C:\Users\thega\Desktop\HomePlus-worktrees\homecloud-current`.
- **Frontera:** infraestructura de captura/galería/review/upload/recuperación reutilizada desde HomeCloud; identidad, fulfilment, permisos, versiones y revisión propias de Planner. **No crear Memories** ni un uploader paralelo.
- **Geometría real:** pruebas con ancho 360/390 pt, texto aumentado, teclado, listas densas, sheets y safe areas; QA físico en iPhone.
- **Funcionalidad a comprobar:** autoridad única de completar desde Home/Root/Detail, asignación `shared_once`, evidencia y permisos, scheduler de Responsabilidades, cancelación/restauración, presets, Undo y mutaciones asincrónicas.

Estas comprobaciones son parte de la **auditoría preimplementación posterior**, no pasos nuevos de producto ni autorización para programar. Las descripciones de CURRENT registradas en la Master List V0.2 reflejan la auditoría histórica del 12/10 y deberán contrastarse con el HEAD real.

## Anexo C. Control de integridad de la recopilación

- Total: **96/96 IDs** conservados, sin renumeraciones ni altas/bajas.
- Distribución: **T 9 · F 11 · S 7 · C 12 · D 12 · E 12 · R 13 · P 10 · X 10**.
- La sección 11 conserva DEC-01…DEC-09 con su procedencia y condición cuando corresponda.
- Ningún archivo de repositorios, base de datos, tests, Figma ni prototipo fue modificado.
- **CLOSED documental ≠ funcionalidades implementadas ≠ QA aprobado.**
