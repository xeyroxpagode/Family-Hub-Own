# HomePlus Planner — Design Spec Final previo a implementación

Versión: 1.0  
Estado: Decisión de producto + UX + UI + lógica previa a implementación  
Módulo: Planner  
Alcance: Tasks, Events, Calendar, Forms, estados visuales, microinteracciones y QA  

---

## 1. Objetivo del documento

Este documento cierra las decisiones de diseño, lógica y comportamiento del módulo Planner antes de implementar.

La intención no es rediseñar toda la app ni hacer un polish global todavía. La intención es dejar Planner con una base consistente para que:

- tareas, eventos y calendario se sientan como un módulo principal;
- las pantallas de creación y edición sigan una misma lógica;
- las acciones tengan feedback claro;
- las animaciones refuercen la acción sin generar pantallas o apariciones innecesarias;
- el futuro polish global sea más rápido porque las reglas ya quedan definidas;
- Qwen implemente por pasos chicos sin tocar de más.

---

## 2. Principio general de Planner

Planner debe sentirse como una agenda familiar accionable.

No es solo una lista de tareas.  
No es solo un calendario.  
No es un clon completo de Google Calendar o Todoist.  

Planner combina tres ideas:

1. **Acción rápida:** crear, completar, verificar o cancelar tareas sin fricción.
2. **Organización familiar:** entender qué pasa hoy, esta semana y este mes.
3. **Contexto compartido:** mostrar tareas y eventos como parte del mismo flujo familiar.

### Frase guía

> “Planner tiene que responder rápido qué hay que hacer, qué está pasando y qué viene después.”

---

## 3. Referencias de producto usadas como guía

### Cozi

Cozi refuerza la idea de organizador familiar con calendario compartido, actividades de todos, códigos de color, listas de compras y tareas familiares. Para HomePlus tomamos la idea de que la organización familiar debe sentirse unificada y fácil de revisar.

### FamilyWall

FamilyWall combina dashboard familiar, calendario, listas, to-dos, comidas, comunicación y ubicación. Para HomePlus tomamos la idea de que el Planner debe vivir como parte de un hub del hogar, no como herramienta aislada.

### TimeTree

TimeTree trabaja calendarios compartidos por grupo, filtros y distintas formas de ver los planes. Para HomePlus tomamos la idea de vistas simples que cambian el contexto sin volver la interfaz pesada.

### Google Calendar

Google Calendar diferencia vistas como schedule, day, week y month. Para HomePlus tomamos la separación conceptual: Month para panorama, Day para agenda concreta y Week como puente entre ambos.

### Todoist

Todoist prioriza captura rápida, prioridades, fechas, Today, Upcoming y filtros. Para HomePlus tomamos la idea de baja fricción para tareas: completar debe ser rápido, no lleno de confirmaciones.

---

## 4. Alcance final aprobado

### Sí implementar en esta etapa

- Calendar Day view real.
- Calendar Week view liviano.
- AgendaList reutilizable.
- Tareas y eventos visibles dentro de la agenda.
- Feedback visual con toast.
- Confirmaciones solo en acciones destructivas.
- Validaciones mínimas de EventForm.
- Revisión de doble submit en TaskForm y EventForm.
- Estados loading, empty y error claros en Calendar.
- QA manual y TypeScript.

### No implementar en esta etapa

- Rediseño global de toda la app.
- Nueva pantalla separada de eventos.
- Date picker/time picker nativo.
- Week view horaria compleja.
- Drag and drop.
- Undo completo.
- Recurrencias avanzadas.
- Invitados a eventos.
- Recordatorios.
- Cambios en backend.
- Cambios en DB.
- Cambios en Auth.
- Cambios en Household.
- Refactor grande de servicios.
- Cambios visuales globales que afecten otras screens.

---

## 5. Arquitectura visual de Planner

Planner mantiene tres tabs principales:

1. **Tareas**
2. **Calendario**
3. **Metas**

### Tareas

Función: seguimiento y acción rápida.  
Estado esperado: listo para demo con pulidos menores.  

Debe permitir:

- ver tareas filtradas;
- crear tarea;
- editar tarea;
- completar tarea;
- enviar a revisión si corresponde;
- verificar tarea;
- cancelar tarea;
- entender prioridad, estado, fecha y responsable.

### Calendario

Función: planificación familiar.  
Estado esperado: requiere completar day/week visual.  

Debe permitir:

- ver panorama mensual;
- ver agenda diaria;
- ver semana liviana;
- crear evento;
- editar evento;
- cancelar evento;
- ver tareas y eventos del día seleccionado.

### Metas

Función: futura expansión.  
Estado actual: placeholder aceptado para MVP.  

Debe mantenerse como “Próximamente” si ya está así. No invertir tiempo en esta etapa.

---

## 6. Reglas visuales generales

### Jerarquía

Cada pantalla debe seguir esta jerarquía:

1. Título o contexto principal.
2. Acciones principales visibles.
3. Filtros o selector de vista.
4. Contenido principal.
5. Estado vacío/error/loading si corresponde.

### Cards

Las cards deben comunicar unidad de información clara.

Reglas:

- borde suave;
- sombra leve o separación clara;
- padding consistente;
- título fuerte;
- metadata secundaria más pequeña;
- badges para estado/prioridad;
- acciones al final o alineadas claramente;
- nunca mezclar demasiados botones primarios dentro de la misma card.

### Colores semánticos

Usar colores ya existentes del design system cuando existan.

Semántica sugerida:

- Primary: acción principal, crear, guardar.
- Success: completado, verificado.
- Warning: pendiente de revisión, prioridad alta.
- Danger: cancelar/eliminar.
- Muted: metadata, estado vacío, elementos secundarios.
- Surface: cards y contenedores.

No inventar una paleta nueva para Planner.

### Iconografía

Usar iconos solo cuando aclaren:

- tarea;
- evento;
- calendario;
- hora;
- ubicación;
- responsable;
- prioridad;
- revisión;
- vacío/error.

Evitar iconos decorativos sin función.

---

## 7. Reglas de animación y microinteracción

### Principio

La animación debe confirmar una acción, no crear otra pantalla ni distraer.

Preferimos microinteracciones dentro del elemento tocado antes que apariciones nuevas grandes.

### Dónde sí usar animación

#### Botón de guardar

Estados:

- normal: texto “Guardar” o “Crear”.
- presionado: scale leve o opacity.
- loading: spinner pequeño dentro del botón + texto “Guardando...”.
- éxito: opcional, check corto dentro del botón antes de cerrar si es fácil de implementar.

No crear una pantalla nueva de éxito.

#### Checkbox de tarea

Estados:

- pendiente: círculo vacío.
- presionado: scale leve.
- completado: check animado o cambio suave de color.
- awaiting_verification: icono o badge distinto, no igual a completado final.

#### Chips y tabs

Estados:

- selected: fondo marcado, texto fuerte.
- unselected: fondo suave, texto secundario.
- transición: cambio suave de color/scale si ya hay patrón existente.

#### Cards

Al presionar:

- opacity o scale muy leve.
- no rebote exagerado.

#### Toast

Aparición:

- slide/fade leve desde abajo o arriba, según ya exista.
- duración corta.
- no bloquear interacción.

### Dónde no usar animación

- No mostrar modales de éxito después de cada acción normal.
- No abrir pantallas nuevas para validar una acción.
- No animar todo el layout del calendario si genera flicker.
- No hacer transiciones pesadas entre Day/Week/Month.

---

## 8. Regla de feedback: Alert vs Toast vs Inline

### Alert

Usar solo para:

- confirmar cancelar tarea;
- confirmar cancelar evento;
- confirmar eliminar si existiera delete real;
- errores bloqueantes que impiden continuar.

Ejemplo:

- “¿Cancelar evento?”
- “Esta acción quitará el evento del calendario.”

### Toast

Usar para:

- tarea completada;
- tarea enviada a revisión;
- tarea verificada;
- tarea cancelada;
- evento creado;
- evento editado;
- evento cancelado;
- cambios guardados;
- error no bloqueante.

Mensajes sugeridos:

- “Tarea completada”
- “Tarea enviada a revisión”
- “Tarea verificada”
- “Tarea cancelada”
- “Evento creado”
- “Evento actualizado”
- “Evento cancelado”
- “No se pudo guardar”

### Inline error

Usar dentro de formularios para:

- título vacío;
- fecha inválida;
- hora inválida;
- falta de token/sesión;
- error de carga de datos.

### Regla central

- Alert = decisión o bloqueo.
- Toast = confirmación liviana.
- Inline = corrección dentro del formulario.

---

## 9. PlannerScreen

### Rol

Pantalla contenedora del módulo Planner.

Responsabilidades:

- mostrar tabs principales;
- manejar sheet/modal de creación y edición;
- centralizar toast si ya existe;
- coordinar refetch/changed después de mutaciones;
- no duplicar lógica de tasks/events internamente si ya vive en subpantallas.

### Elementos esperados

- Header del módulo.
- Resumen breve si ya existe.
- Tabs: Tareas / Calendario / Metas.
- FAB o CTA principal contextual.
- Sheet para TaskForm/EventForm.
- Toast global del módulo.

### Comportamiento

- Si el usuario está en Tareas, el CTA principal crea tarea.
- Si está en Calendario, el CTA principal crea evento.
- Si está en Metas, CTA deshabilitado o copy de próximamente.

### Animaciones

- Tab active con transición suave.
- Sheet ya existente se mantiene.
- Toast aparece sin bloquear.

---

## 10. PlannerTasksScreen

### Rol

Pantalla de operación rápida de tareas.

### Contenido

- Filtros horizontales.
- Lista de tareas.
- Counts por filtro si ya existen.
- Empty state con CTA.
- Error state con retry.
- Loading state.

### Filtros esperados

Mantener filtros existentes si ya están:

- abiertas;
- mías;
- familia;
- hoy;
- vencidas;
- en revisión;
- hechas;
- canceladas.

### TaskCard

Cada card debe mostrar:

- título;
- descripción corta si existe;
- estado;
- prioridad;
- fecha/hora;
- responsable;
- requiere revisión si aplica;
- acción principal según estado.

### Estados de tarea

- pending: pendiente.
- completed: completada.
- awaiting_verification: enviada a revisión.
- verified: verificada.
- cancelled: cancelada.

### Acciones

#### Completar tarea

No requiere Alert.

Flujo:

1. Usuario toca completar.
2. Botón/checkbox cambia con microanimación.
3. Se ejecuta optimistic update si ya existe.
4. Se llama API.
5. Toast según resultado.
6. Refetch para asegurar consistencia.

Toast:

- sin verificación: “Tarea completada”.
- con verificación: “Tarea enviada a revisión”.

#### Verificar tarea

No requiere Alert.

Toast:

- “Tarea verificada”.

#### Cancelar tarea

Sí requiere Alert.

Toast posterior:

- “Tarea cancelada”.

#### Editar tarea

Debe abrir TaskForm en modo edit.

### Microinteracciones

- Checkbox animado.
- Botón de acción con loading interno si la mutación está en curso.
- Card press leve si se puede editar tocando la card.
- Evitar doble tap durante mutación.

---

## 11. TaskForm

### Rol

Crear y editar tareas.

### Campos esperados

- Título: requerido.
- Descripción: opcional.
- Template/categoría: si ya existe, mantener.
- Responsable: opcional o selector existente.
- Fecha: opcional.
- Hora: opcional.
- Prioridad: baja / normal / alta / crítica si ya existe.
- Requiere revisión: switch.
- Detalles avanzados: mantener colapsable si ya existe.

### Crear vs editar

Crear:

- campos vacíos o precargados por template;
- botón “Crear tarea”.

Editar:

- carga datos existentes;
- botón “Guardar cambios”.

### Validaciones

- título requerido;
- no permitir doble submit;
- si saving=true, botón disabled;
- si falta token, mostrar error claro;
- si falla guardado, mostrar error inline o Alert según patrón existente.

### Botón principal

Estados:

- normal: “Crear tarea” / “Guardar cambios”.
- disabled: opacity menor.
- loading: spinner dentro del botón + “Guardando...”.
- éxito opcional: check interno corto si no complica.

### No hacer ahora

- No rediseñar form completo.
- No meter picker nativo.
- No agregar campos nuevos que backend no soporte.

---

## 12. PlannerCalendarScreen

### Rol

Vista de calendario y agenda familiar.

### Estructura general

- Selector Month / Week / Day.
- Navegación temporal: Anterior / Hoy / Siguiente.
- Contenido según vista.
- AgendaList del día seleccionado o rango.
- Empty/loading/error states.

---

## 13. Month View

### Rol

Panorama mensual.

### Mantener

- grid mensual;
- día seleccionado;
- dots/indicadores de eventos y tareas;
- agenda del día seleccionado debajo;
- navegación anterior/hoy/siguiente por mes.

### Comportamiento

- Al tocar un día, se actualiza selectedDate.
- La agenda inferior muestra los items de selectedDate.
- Si no hay items en el día: “Día tranquilo”.
- Si no hay items en el mes: “No hay nada programado este mes”.

### No modificar mucho

Month no es el problema principal. Solo ajustar si hace falta para conectar AgendaList común.

---

## 14. Day View

### Rol

Agenda concreta de un día.

### Comportamiento final

Al seleccionar Day:

- no se muestra el grid mensual;
- se muestra fecha clara arriba;
- se muestra AgendaList vertical;
- anterior/siguiente cambia de día;
- Hoy vuelve al día actual;
- si no hay items, empty “Día tranquilo”.

### Header sugerido

- Si selectedDate es hoy: “Hoy”.
- Si es mañana: “Mañana”.
- Si no: día de semana + fecha.

Ejemplo:

- “Hoy, lunes 6 de julio”
- “Martes 7 de julio”

### Items

Debe mostrar:

- eventos con hora;
- eventos todo el día;
- tareas con hora;
- tareas sin hora;
- estado y prioridad de tareas.

### Visual

Formato simple:

- columna/label de hora o estado;
- card con contenido;
- badge de tipo: Evento/Tarea;
- metadata secundaria.

### Empty

Texto:

- “Día tranquilo”
- “No hay tareas ni eventos para esta fecha.”

CTA opcional:

- “Crear evento”
- “Crear tarea”

---

## 15. Week View

### Rol

Puente entre Month y Day.

No es una vista semanal horaria completa. Es una vista liviana y suficiente para demo.

### Comportamiento final

Al seleccionar Week:

- se muestra tira horizontal de 7 días;
- cada día muestra nombre corto y número;
- cada día muestra indicador si tiene items;
- selectedDate queda marcado;
- al tocar un día, se actualiza la agenda inferior;
- anterior/siguiente cambia de semana;
- Hoy vuelve a la semana actual y selecciona hoy.

### Week strip

Ejemplo:

- Lun 6
- Mar 7
- Mié 8
- Jue 9
- Vie 10
- Sáb 11
- Dom 12

Indicadores:

- punto para evento;
- punto distinto para tarea;
- número pequeño si hay varios, solo si ya es simple de implementar.

### Agenda inferior

Usa la misma AgendaList de Day View.

### Empty

Si la semana no tiene nada:

- “Semana tranquila”
- “No hay tareas ni eventos para estos días.”

Si la semana tiene items pero el día seleccionado no:

- “Día tranquilo”
- “No hay tareas ni eventos para esta fecha.”

---

## 16. AgendaList

### Rol

Componente reutilizable para mostrar tareas y eventos ordenados.

Se puede implementar inline primero si Qwen considera menor riesgo, pero la decisión de diseño es que exista una lógica común para no duplicar UI.

### Usos

- Day View.
- Week View.
- Agenda debajo de Month View.

### Item de evento

Mostrar:

- badge “Evento”;
- hora o “Todo el día”;
- título;
- lugar si existe;
- descripción corta si existe;
- recurrencia si ya existe visualmente y no complica.

Acciones:

- editar;
- cancelar con confirmación.

### Item de tarea

Mostrar:

- badge “Tarea”;
- título;
- estado;
- prioridad;
- responsable si existe;
- fecha/hora si existe;
- requiere revisión si aplica.

Acciones:

- completar;
- verificar si aplica;
- editar;
- cancelar con confirmación.

### Orden sugerido

1. Eventos con hora.
2. Eventos todo el día.
3. Tareas con hora.
4. Tareas sin hora.
5. Completadas/verificadas al final si se muestran.

### Visual

Cada item debe ser card liviana.

Estructura:

- izquierda: hora/estado;
- derecha: contenido;
- arriba: badge tipo + título;
- abajo: metadata.

---

## 17. EventForm

### Rol

Crear y editar eventos.

### Campos esperados

- Título: requerido.
- Descripción: opcional.
- Fecha: requerida.
- Todo el día: switch.
- Hora inicio: requerida si no es todo el día.
- Hora fin: requerida si no es todo el día.
- Lugar: opcional.
- Repetición: none/daily/weekly/monthly si ya existe.

### Crear vs editar

Crear:

- botón “Crear evento”.

Editar:

- botón “Guardar cambios”.
- si es recurrente y ya existe selector occurrence/series, mantener sin ampliar.

### Validaciones mínimas

- título requerido;
- fecha formato YYYY-MM-DD;
- hora formato HH:mm si no es all-day;
- endTime >= startTime;
- no doble submit;
- botón disabled si saving=true.

### Error copy

- “Escribí un título para el evento.”
- “La fecha debe tener formato AAAA-MM-DD.”
- “La hora debe tener formato HH:mm.”
- “La hora de fin no puede ser anterior al inicio.”
- “No pudimos guardar el evento.”

### Botón principal

Estados:

- normal: “Crear evento” / “Guardar cambios”.
- loading: spinner dentro del botón + “Guardando...”.
- disabled: opacity menor.

### No hacer ahora

- No date picker nativo.
- No time picker nativo.
- No invitados.
- No recordatorios.
- No editar recurrencia avanzada.

---

## 18. Empty states

### Principio

Un empty state no debe parecer error. Debe comunicar calma o siguiente acción.

### Tareas sin datos

Título:

- “No hay tareas pendientes”

Texto:

- “Cuando creen tareas para el hogar, van a aparecer acá.”

CTA:

- “Crear tarea”

### Calendar Month sin datos

Título:

- “No hay nada programado este mes”

Texto:

- “Los eventos y tareas con fecha van a aparecer en el calendario.”

CTA:

- “Crear evento”

### Day sin datos

Título:

- “Día tranquilo”

Texto:

- “No hay tareas ni eventos para esta fecha.”

CTA opcional:

- “Crear evento”

### Week sin datos

Título:

- “Semana tranquila”

Texto:

- “No hay tareas ni eventos para estos días.”

CTA opcional:

- “Crear evento”

---

## 19. Loading states

### Principio

Loading debe mostrar que el sistema está trabajando, no que la pantalla está vacía.

### Mínimo aceptado

- ActivityIndicator.
- Texto contextual.

Ejemplos:

- “Cargando tareas...”
- “Cargando calendario...”
- “Preparando agenda...”

### Mejor si existe Skeleton reusable

- Skeleton de cards para tareas.
- Skeleton de grid para Month.
- Skeleton de agenda para Day/Week.

No bloquear implementación si Skeleton no está listo.

---

## 20. Error states

### Principio

Error claro + acción para recuperarse.

### Calendar error

Título:

- “No pudimos cargar el calendario”

Texto:

- “Revisá la conexión e intentá de nuevo.”

CTA:

- “Reintentar”

### Tasks error

Título:

- “No pudimos cargar las tareas”

CTA:

- “Reintentar”

### Forms error

Inline o alert según gravedad.

---

## 21. Estados y lógica de tareas

### Estados visibles

- pending: Pendiente.
- completed: Completada.
- awaiting_verification: En revisión.
- verified: Verificada.
- cancelled: Cancelada.

### Lógica de completar

Si task.requires_verification=true:

- completar pasa a awaiting_verification;
- toast: “Tarea enviada a revisión”.

Si task.requires_verification=false:

- completar pasa a completed;
- toast: “Tarea completada”.

### Lógica de verificar

- awaiting_verification pasa a verified;
- toast: “Tarea verificada”.

### Lógica de cancelar

- requiere Alert;
- tras éxito, refetch;
- toast: “Tarea cancelada”.

---

## 22. Estados y lógica de eventos

### Estados visibles

- scheduled: Programado.
- cancelled: Cancelado.

### Crear evento

- guarda;
- cierra form;
- refetch;
- toast: “Evento creado”.

### Editar evento

- guarda;
- cierra form;
- refetch;
- toast: “Evento actualizado”.

### Cancelar evento

- requiere Alert;
- tras confirmar, API;
- refetch;
- toast: “Evento cancelado”.

### Evento cancelado

Idealmente no aparece en agenda normal.

Si aparece por lógica existente, debe verse claramente como cancelado y no mezclado con eventos activos.

---

## 23. Reglas de navegación temporal

### Month

- Anterior: mes anterior.
- Hoy: mes actual + selectedDate hoy.
- Siguiente: mes siguiente.

### Week

- Anterior: semana anterior.
- Hoy: semana actual + selectedDate hoy.
- Siguiente: semana siguiente.

### Day

- Anterior: día anterior.
- Hoy: selectedDate hoy.
- Siguiente: día siguiente.

### Cambio de vista

Al cambiar de Month a Day:

- mantener selectedDate.
- mostrar agenda de ese día.

Al cambiar de Month a Week:

- mantener selectedDate.
- mostrar la semana donde cae ese selectedDate.

Al cambiar de Week a Day:

- mantener selectedDate.

Al cambiar de Day a Month:

- mostrar el mes donde cae selectedDate.

---

## 24. Reglas de datos y refresh

### Después de crear/editar/cancelar evento

- cerrar form;
- marcar Planner como cambiado si existe función;
- refetch calendar;
- refetch summary si PlannerScreen lo hace;
- mostrar toast.

### Después de crear/editar/completar/verificar/cancelar tarea

- actualizar UI;
- refetch tasks;
- refetch calendar si esa tarea tiene fecha y puede aparecer en calendario;
- refetch summary;
- mostrar toast.

### Duplicados

Evitar:

- agregar manualmente un item al estado local y además hacer refetch si eso duplica;
- re-renderizar lista con datos viejos + nuevos;
- llamar dos veces a create/update por doble submit.

Regla:

- optimistic update solo para estado visual rápido;
- refetch final como fuente de verdad.

---

## 25. Consistencia entre crear y editar

### Ambos forms deben compartir

- mismo layout base;
- mismo header visual;
- mismo patrón de error;
- mismo patrón de botón principal;
- mismo comportamiento de saving;
- misma lógica de cierre/cancelación;
- misma distancia entre secciones;
- mismos estilos de inputs/chips/switches.

### Diferencias permitidas

Crear:

- título de pantalla “Crear tarea/evento”.
- botón “Crear”.

Editar:

- título “Editar tarea/evento”.
- botón “Guardar cambios”.
- datos precargados.

---

## 26. Botones: diseño y animación

### Botón primario

Uso:

- Crear tarea.
- Crear evento.
- Guardar cambios.

Estados:

- default;
- pressed;
- loading;
- disabled;
- success opcional.

Animación recomendada:

- pressed: scale 0.98 o opacity.
- loading: spinner interno.
- success: check interno breve si es simple.

No hacer:

- overlay nuevo de éxito;
- modal nuevo de éxito;
- animación larga.

### Botón secundario

Uso:

- cancelar edición;
- volver;
- seleccionar opción no destructiva.

### Botón danger

Uso:

- cancelar tarea;
- cancelar evento;
- eliminar si existe.

Requiere Alert.

### Botón icon-only

Debe tener:

- hit area suficiente;
- feedback pressed;
- icono claro;
- accesibilidad si aplica.

---

## 27. Microcopy final

### Acciones

- Crear tarea
- Crear evento
- Guardar cambios
- Completar
- Verificar
- Cancelar tarea
- Cancelar evento
- Reintentar

### Toasts

- Tarea creada
- Tarea actualizada
- Tarea completada
- Tarea enviada a revisión
- Tarea verificada
- Tarea cancelada
- Evento creado
- Evento actualizado
- Evento cancelado
- Cambios guardados
- No se pudo guardar

### Empty

- Día tranquilo
- Semana tranquila
- No hay nada programado este mes
- No hay tareas pendientes

### Errores

- No pudimos cargar el calendario
- No pudimos cargar las tareas
- No pudimos guardar los cambios
- Revisá la fecha antes de continuar

---

## 28. Accesibilidad mínima

Aunque no se haga auditoría completa, respetar:

- contraste suficiente;
- labels claros;
- botones con área táctil cómoda;
- texto no demasiado chico;
- no depender solo del color para estado;
- ícono + texto cuando el estado sea importante;
- loading con texto si tarda.

---

## 29. Performance y flicker

### Evitar flicker

- No limpiar toda la lista antes de refetch si ya hay datos.
- Mostrar loading inicial solo cuando no hay datos previos.
- Durante refresh, mantener contenido y mostrar indicador liviano.
- No cambiar entre grid/lista de forma brusca con datos undefined.

### Evitar duplicados

- Deshabilitar botón mientras saving.
- Bloquear acción mientras mutation está corriendo.
- No mezclar append local + refetch sin dedupe.

### Re-render

- Reutilizar componentes para agenda.
- Memoizar cálculos si ya existe patrón.
- No crear lógica pesada por item si no hace falta.

---

## 30. Orden de implementación

### Implementación 1 — Calendar Day + Week + AgendaList

Objetivo:

- Month queda estable.
- Day se vuelve agenda real.
- Week se vuelve semana liviana.
- AgendaList muestra tareas y eventos.

Archivos probables:

- screens/planner/PlannerCalendarScreen.tsx
- screens/planner/PlannerCalendarComponents.tsx
- screens/planner/plannerShared.ts

No tocar:

- services salvo bug real.
- Home.
- Auth.
- Household.
- DB.

### Implementación 2 — Feedback de acciones

Objetivo:

- toast para completar/verificar/cancelar;
- confirmación solo en acciones destructivas;
- loading interno en acciones si existe patrón.

Archivos probables:

- PlannerScreen.tsx
- PlannerTasksScreen.tsx
- PlannerCalendarScreen.tsx

### Implementación 3 — Formularios seguros

Objetivo:

- validar EventForm;
- revisar doble submit;
- asegurar disabled durante saving.

Archivos probables:

- EventForm.tsx
- TaskForm.tsx

### Implementación 4 — Loading/empty/error

Objetivo:

- estados claros para Month/Week/Day;
- loading contextual;
- error con retry.

Archivos probables:

- PlannerCalendarScreen.tsx
- PlannerCalendarComponents.tsx
- plannerShared.ts

### Implementación 5 — QA final

Objetivo:

- TypeScript pasa;
- no hay cambios ajenos;
- tareas, eventos y calendario funcionan;
- Home no se rompe.

---

## 31. Checklist de QA final

### Repo

- Ejecutar git status --short.
- Ejecutar git branch --show-current.
- Confirmar rama correcta.
- Confirmar que no hay cambios ajenos salvo .idea/.

### TypeScript

- cd front/mi-front-limpio
- npx.cmd tsc --noEmit

### Tareas

- Crear tarea.
- Editar tarea.
- Completar tarea sin revisión.
- Completar tarea con revisión.
- Verificar tarea.
- Cancelar tarea.
- Cambiar filtros.
- Confirmar que no duplica.

### Eventos

- Crear evento.
- Editar evento.
- Cancelar evento.
- Crear evento all-day.
- Crear evento con hora.
- Ver evento en Month.
- Ver evento en Day.
- Ver evento en Week.

### Calendar

- Cambiar a Month.
- Cambiar a Day.
- Cambiar a Week.
- Usar anterior/hoy/siguiente en Month.
- Usar anterior/hoy/siguiente en Day.
- Usar anterior/hoy/siguiente en Week.
- Seleccionar día en Month.
- Seleccionar día en Week.
- Ver agenda vacía.
- Ver agenda con datos.
- Probar error/retry si es posible.

### Home

- Abrir Home.
- Confirmar que carga tasks/events.
- Navegar desde Home a Planner.
- Confirmar que no rompe params o sheet.

---

## 32. Definición de DONE

Planner queda demo-ready cuando:

- Month funciona como panorama mensual.
- Day funciona como agenda diaria real.
- Week funciona como semana liviana con 7 días.
- Eventos y tareas aparecen en agenda.
- Crear/editar/cancelar evento refresca Calendar.
- Crear/editar/completar/verificar/cancelar tarea refresca lista.
- Acciones importantes tienen toast.
- Acciones destructivas tienen confirmación.
- EventForm valida fecha/hora básica.
- Loading/empty/error son claros.
- Home sigue funcionando.
- TypeScript pasa.
- Git status queda sin cambios inesperados.

---

## 33. Primer prompt recomendado después de este documento

La primera implementación debe ser:

**Calendar Day + Week liviano + AgendaList.**

Motivo:

Es el gap más visible. Si el usuario toca Day o Week y ve el mismo grid mensual, el módulo parece incompleto. Convertir esas vistas en agenda diaria y semana liviana mejora la percepción de calidad sin tocar backend ni rediseñar todo.

---

## 34. Nota final de diseño

Planner no necesita parecer una app nueva dentro de HomePlus. Necesita parecer un módulo completo del mismo producto.

La prioridad no es agregar más features. La prioridad es que cada cosa que ya está visible en pantalla cumpla lo que promete:

- si hay botón Día, debe haber vista Día;
- si hay botón Semana, debe haber vista Semana;
- si una acción se completa, debe sentirse completada;
- si algo falla, debe decir qué pasó;
- si no hay nada, debe sentirse tranquilo, no roto.
