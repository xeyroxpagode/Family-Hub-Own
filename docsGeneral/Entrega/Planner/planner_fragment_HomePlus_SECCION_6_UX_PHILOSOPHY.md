# PLANNER fragment — HomePlus — SECCION 6 UX PHILOSOPHY

## 1. Rol del módulo en la demo

Información explícita encontrada:

* Planner es un tab principal dentro de la Bottom Navigation congelada V1: `[Home] [People] [+] [Planner] [More]`.
* Planner agrupa internamente `Tasks`, `Calendar` y `Goals`.
* `Goals` aparece dentro de Planner, pero para este fragment queda como **POST_MVP / no desarrollar**, salvo como relación visible si una tarea lo menciona.
* Tasks y Calendar son los subdominios de Planner más útiles para demo visual/interactiva.
* Tasks representa trabajo pendiente o realizado dentro del hogar.
* Calendar administra eventos familiares o personales.
* Planner es descrito en el archivo de comprensión como “Núcleo operativo”.
* El documento no define Planner como backend completo; lo define principalmente como experiencia visual, navegación, interacción y relaciones entre entidades.
* El usuario debe poder usar Tasks y Events con patrones equivalentes: “el usuario que aprendió a usar Tasks debe poder usar Events sin reaprender nada”.
* El módulo debe conectarse con Home: Home muestra tareas pendientes propias, próximos eventos y puede conducir al módulo correspondiente.
* Home resume información, no administra. Toda información mostrada en Home debe llevar al módulo que la administra.
* El valor inmediato del Planner aparece en onboarding y primer uso:
  * Adulto ve tareas y eventos del día.
  * Adolescente ve su lista personal y puede completar algo.
  * Niño ve su lista del día con íconos y completa su primera tarea.
  * Coordinador ve tareas pendientes del hogar y próximos eventos.

No encontrado explícitamente:

* No se encontró un objetivo funcional backend de Planner.
* No se encontró contrato de service.
* No se encontró endpoint API.
* No se encontró modelo técnico final para estado MVP de verificación.

---

## 2. Información encontrada para las 7 condiciones MVP

### 2.1 Pantalla visualmente terminada

#### Estructura general de pantalla aplicable a Planner

Toda pantalla en HomePlus sigue cuatro capas:

1. **Capa 1 — Atención**
   * Qué necesita saber el usuario ya.
   * Máximo 2 elementos.
   * Tiempo de lectura menor a 3 segundos.
   * Siempre visible sin scroll.

2. **Capa 2 — Acción**
   * Acción principal + acciones rápidas.
   * Máximo 3 acciones visibles.
   * La acción principal debe estar en zona de pulgar si es de frecuencia diaria.

3. **Capa 3 — Contexto**
   * Lista de items, métricas, estado.
   * Scroll vertical si excede pantalla.
   * Agrupado por relevancia, no por cronología.

4. **Capa 4 — Exploración**
   * Bottom nav + enlaces cruzados.
   * Navegación a otros dominios, configuración o histórico.
   * Nunca compite con Capa 1 o Capa 2.

#### Tasks dentro de Planner

Pantalla detectada: **Tasks (Planner)**.

Elementos visuales encontrados:

* Capa 1:
  * chip de filtro activo.
  * contador de pendientes.
* Capa 2:
  * checkbox en el primer item.
  * acción principal: completar tarea asignada.
* Capa 3:
  * lista de tareas agrupadas por Responsabilidad.
  * lista de tareas del día.
  * checkboxes en items.
* Capa 4:
  * Bottom Nav.
  * enlace a Eventos relacionados.
  * enlace a Goals relacionados, clasificado como **POST_MVP / no desarrollar**.

Reglas visuales específicas:

* La acción principal de Tasks debe ser completar una tarea asignada.
* Completar tarea debe ejecutarse desde un checkbox táctil en el list item.
* No debe requerir abrir el detalle.
* Tap en list item abre el detalle del item.
* El botón `+` flotante crea nuevo item del dominio actual.
* Crear/editar usa bottom sheet.
* Eliminar tarea usa bottom sheet de confirmación: “¿Eliminar esta tarea?”
* Cerrar formulario con cambios usa bottom sheet: “Tenés cambios sin guardar. ¿Salir?”
* La lista de items tiene scroll vertical infinito con paginación.
* La acción principal no debe quedar oculta por scroll.
* Si un formulario requiere scroll, guardar/cancelar deben quedar fijos en zona inferior.
* Detalle de item usa scroll vertical y acciones frecuentes fijas abajo.

#### Calendar / Events dentro de Planner

Pantalla detectada: **Calendar (Planner)**.

Elementos visuales encontrados:

* Capa 1:
  * próximo evento como card expandida.
* Capa 2:
  * ver detalle.
  * confirmar asistencia.
* Capa 3:
  * timeline del día/semana.
* Capa 4:
  * Bottom Nav.
  * enlace a Tasks vinculadas.

Reglas visuales específicas:

* La acción principal de Calendar es ver evento del día.
* El primer item de la lista aparece expandido por defecto.
* Tap en list item abre detalle.
* Crear/editar evento usa bottom sheet.
* Eliminar evento recurrente exige confirmación doble: “¿Este evento o toda la serie?” → confirmar.
* Calendar vive dentro de Planner, no como tab independiente.
* El documento menciona día y semana.
* No se encontró vista mes explícita.

#### Navegación visual

* Bottom Navigation congelada V1:
  * `Home`
  * `People`
  * `+`
  * `Planner`
  * `More`
* Planner tiene ícono 📋 en la tabla de navegación.
* El tab Planner lleva a Planner (§24.08).
* Planner contiene Tasks, Calendar y Goals.
* Responsabilidades no son un dominio independiente; son propiedad de la tarea y eje organizador dentro de Tasks.
* El tap en tab activo hace scroll to top + refresh en la pantalla actual.
* El badge en un tab solo usa colores success o alert; nunca error en la barra de navegación.
* Estado activo del tab: ícono filled + texto peso 600.
* Estado inactivo: ícono outline + texto peso 400.

#### Filtros / chips por rol

Chips encontrados para listas:

* Coordinador:
  * Todo.
  * Hoy.
  * Mío.
  * Por miembro.
  * Tipo.
* Adulto:
  * Todo.
  * Hoy.
  * Mío.
* Adolescente:
  * Hoy.
  * Mío.
* Niño:
  * Hoy.
* Adulto Mayor:
  * Hoy.

Reglas:

* La densidad se reduce quitando elementos, no achicando fuentes.
* Nunca bajar de 14px para body.
* Adulto Mayor no usa chips múltiples: un solo botón “Hoy” fijo.

#### Densidad visual por rol aplicable a Planner

Items visibles en lista sin scroll:

* Coordinador: 5–6.
* Adulto: 4–5.
* Adolescente: 3–4.
* Niño: 2–3.
* Adulto Mayor: 2–3.

Métricas visibles:

* Coordinador: carga del hogar, tendencias, presupuesto.
* Adulto: mis tareas, eventos próximos.
* Adolescente: mis tareas.
* Niño: mi lista.
* Adulto Mayor: sin métricas.

Badges de estado:

* Coordinador: todos.
* Adulto: propios + urgentes del hogar.
* Adolescente: solo propios.
* Niño: solo propios positivos.
* Adulto Mayor: solo alertas.

#### Accesibilidad visual aplicable

* Target táctil mínimo: 44×44px.
* Niño: target 48px.
* Adulto Mayor: target 56px.
* Tamaños mínimos:
  * Body Coordinador/Adulto/Adolescente: 16px.
  * Body Niño: 18px.
  * Body Adulto Mayor: 18px.
  * H1 Coordinador/Adulto/Adolescente: 28px.
  * H1 Niño: 32px.
  * H1 Adulto Mayor: 36px.
* Adulto Mayor respeta reducción de movimiento.
* Adulto Mayor usa modo de alto contraste.
* Todos los gestos deben tener alternativa por tap.
* En modo Adulto Mayor: solo tap; swipe, long press y pull-to-refresh desactivados.

---

### 2.2 Datos creíbles

Datos y ejemplos encontrados explícitamente:

#### Ejemplos de Tasks

* “Tenés 2 tareas para hoy”.
* “Preparar comida”.
* “Tu primera tarea. Cuando alguien la complete, te avisamos.”
* “Primer día completo.”
* “Jose, estas son tus tareas para mañana.”
* “Luca, tu lista de hoy”.
* La tarea puede estar agrupada por Responsabilidad.
* Una tarea puede pertenecer a la responsabilidad “Compras”.
* Responsabilidades encontradas:
  * Compras.
  * Mascotas.
  * Limpieza.
  * Vehículos.

#### Ejemplos de Events / Calendar

* “Asado del sábado”.
* “Hoy tenés 2 tareas y 1 evento.”
* Próximo evento.
* Evento del día.
* Timeline del día/semana.

#### Ejemplos de relación Task ↔ Event

* “Esta tarea es parte del Asado del sábado →”.
* Event muestra “2 tareas dependen de este evento →”.
* Flujo ejemplo:
  * Home muestra “Tenés que preparar comida para el asado del sábado”.
  * Tap abre detalle de tarea.
  * En detalle aparece enlace al evento.
  * Tap abre detalle del evento.

#### Datos de miembros/personas útiles para Planner

* Task tiene responsable.
* Event tiene múltiples participantes.
* Person se relaciona con Task.
* Person se relaciona con Event.
* Tap en avatar abre perfil de la persona.
* Avatar de miembro tiene accessibility label: “[Nombre], [rol]”.

#### Datos temporales / estados visuales

* Tareas para hoy.
* Tareas para mañana.
* Próximos eventos.
* Eventos del día.
* Tarea vencida aparece como dato calculado, no como estado persistido.
* Task overdue puede mostrarse en Attention Required de Home.

Datos no encontrados:

* No se encontraron nombres concretos de miembros salvo Jose y Luca.
* No se encontraron listas completas de tareas demo.
* No se encontraron fechas reales.
* No se encontraron horas reales de eventos.
* No se encontraron prioridades concretas como Alta/Media/Baja.
* No se encontraron templates MVP completas como Estudios, Pagos o Medicación dentro de este documento.

---

### 2.3 Acción interactiva

Acciones detectadas:

#### Tasks

* Completar tarea asignada.
  * Tipo: REAL MÍNIMO para demo.
  * Interacción: checkbox táctil en el list item.
  * No requiere abrir detalle.
* Crear tarea.
  * Tipo: REAL/LOCAL según implementación posterior; el documento no define backend.
  * Interacción: botón `+` flotante del dominio actual o Quick Actions.
  * UI: bottom sheet.
* Editar tarea.
  * Tipo: REAL/LOCAL según implementación posterior; el documento no define backend.
  * UI: bottom sheet.
* Eliminar tarea.
  * Tipo: REAL/LOCAL según implementación posterior; el documento no define backend.
  * Protección: confirmación en bottom sheet.
* Abrir detalle de tarea.
  * Tipo: REAL visual.
  * Interacción: tap en list item.
* Cambiar responsable.
  * Tipo: acción puntual mencionada en navegación Nivel 4.
  * Detalle no encontrado.
* Refresh de lista.
  * Tipo: interacción UI.
  * Interacción: pull down en scroll superior, excepto Adulto Mayor.
* Deshacer completado.
  * Tipo: interacción de perdón.
  * Interacción: botón “Deshacer” en toast durante 5 segundos.
* Filtrar tareas.
  * Tipo: interacción UI.
  * Interacción: chips de filtro.

#### Calendar / Events

* Ver evento del día.
  * Tipo: REAL visual.
  * Interacción: primer item de lista expandido por defecto.
* Ver detalle de evento.
  * Tipo: REAL visual.
  * Interacción: tap en list item / card.
* Crear evento.
  * Tipo: REAL/LOCAL según implementación posterior; el documento no define backend.
  * UI: bottom sheet.
* Editar evento.
  * Tipo: REAL/LOCAL según implementación posterior; el documento no define backend.
  * UI: bottom sheet.
* Eliminar evento recurrente.
  * Tipo: POST_MVP si implica recurrencia compleja; como patrón UX aparece con confirmación doble.
  * UI: “¿Este evento o toda la serie?” → confirmar.
* Confirmar asistencia.
  * Tipo: POST_MVP / acción visual no desarrollada, porque no hay contrato ni estados de asistencia.
* Ver timeline día/semana.
  * Tipo: REAL visual.

#### Navegación

* Entrar a Planner desde Bottom Nav.
* Entrar a Tasks dentro de Planner.
* Entrar a Calendar dentro de Planner.
* Task → Event asociado.
* Event → Tasks vinculadas.
* Home → Detalle de tarea.
* Home → Detalle de evento o Planner.
* Botón `+` central → Quick Actions.
* Botón `+` flotante del dominio actual → crear nuevo item.

---

### 2.4 Feedback inmediato

Reglas generales encontradas:

* Toda acción del usuario debe recibir respuesta en menos de 100ms.
* Si la operación tarda más, el sistema acusa recibo en menos de 100ms y luego resuelve.
* Ninguna acción queda sin respuesta visual o háptica.
* Los botones siempre responden al press, incluso si la acción falla después.
* Spinners solo aparecen si la operación excede 300ms.
* Antes de 300ms, la UI ya respondió.
* Háptico sutil:
  * iOS: `light`.
  * Android: `clockTick`.
* Nunca usar háptico heavy fuera de emergencia.
* HomePlus no usa sonidos propios.

#### Feedback para Tasks

* Tap en botón:
  * escala 0.97 → 1.0.
  * háptico ligero.
* Completar tarea:
  * checkbox se rellena.
  * háptico.
  * tachado.
  * toast de confirmación opcional, no bloqueante.
* Completar tarea accidental:
  * toast con “Deshacer” durante 5 segundos.
* Crear tarea:
  * item aparece en la lista con opacidad 0 → 1.
* Guardar formulario:
  * botón muestra spinner.
  * mantiene ancho.
  * toast success o error.
* Error de red:
  * toast informativo inmediato.
* Error al guardar:
  * háptico warning solo en errores bloqueantes.
* Pull-to-refresh completo:
  * háptico light al terminar sincronización.

#### Feedback para Events / Calendar

* Crear evento:
  * item aparece en la lista con opacidad 0 → 1.
* Guardar formulario:
  * spinner si excede 300ms.
  * toast success o error.
* Ver evento del día:
  * primer item expandido por defecto.
* Error:
  * toast zona superior con slide-down + fade-in.
  * sin shake.
  * sin parpadeo rojo.

#### Estados UI de componentes

Estados detectados:

* NORMAL.
* LOADING.
* EMPTY.
* ERROR.
* SUCCESS.

Transiciones detectadas:

* NORMAL → LOADING:
  * skeleton screen si es carga inicial.
  * si es refresh, indicador sutil en zona superior sin bloquear UI actual.
* LOADING → NORMAL:
  * fade-in de contenido de 300ms.
  * skeletons se disuelven.
* LOADING → ERROR:
  * skeleton se reemplaza por mensaje de error + botón de reintento.
* LOADING → EMPTY:
  * si query devuelve 0 resultados, se muestra empty state con acción sugerida.
* NORMAL → ERROR:
  * toast en zona superior.
  * UI actual permanece visible y funcional.
* NORMAL → SUCCESS:
  * toast o microinteracción local.
  * no se reemplaza toda la pantalla.
* EMPTY → NORMAL:
  * fade-in del primer item.
  * acción sugerida del empty state desaparece.
* ERROR → NORMAL:
  * al reintentar vuelve a LOADING, luego NORMAL.

#### Animaciones aplicables

* Microinteracción de completado:
  * checkbox → relleno + tachado.
  * máximo 400ms.
  * no usar en listas con más de 3 items completándose simultáneamente.
* Skeleton:
  * listas que tardan más de 300ms.
  * no en pantallas con datos cacheados.
* Cambio empty → normal:
  * fade-in 300ms.
* Error:
  * toast con slide-down + fade-in.
  * máximo 300ms.
* Quick Actions:
  * fade in + slide up con blur de fondo.
  * máximo 200ms.
* Duración máxima de cualquier animación: 500ms.
* Nada parpadea.
* Nada rebota repetidamente.

---

### 2.5 Service aislado

No se encontró un service explícito nombrado para Planner.

No se encontraron nombres de funciones, endpoints ni contratos.

Información útil encontrada para definir posteriormente un service demo o local:

#### Datos que Planner debe listar o exponer visualmente

* Lista de tareas del día.
* Tareas pendientes propias.
* Tareas agrupadas por Responsabilidad.
* Tareas asignadas a una persona.
* Tareas vencidas como dato calculado.
* Próximo evento.
* Evento del día.
* Timeline día/semana.
* Eventos próximos.
* Tasks vinculadas a un Event.
* Event asociado a una Task.

#### Acciones que Planner ejecuta visualmente

* Crear tarea.
* Editar tarea.
* Eliminar tarea.
* Completar tarea.
* Deshacer completar tarea.
* Abrir detalle de tarea.
* Crear evento.
* Editar evento.
* Eliminar evento.
* Abrir detalle de evento.
* Refrescar listas.

#### Datos que Planner entrega a Home

* Tareas pendientes propias.
* Tareas para hoy.
* Tareas vencidas para Attention Required.
* Próximos eventos.
* Eventos del día.
* Resumen para Briefing si se usa como mock/simple.

#### Data flows detectados desde archivo de comprensión

* PlannerModule → Notification:
  * dato: Task assigned.
  * propósito: notificar a la persona asignada.
  * Clasificación: POST_MVP si implica push/notificación real.
* PlannerModule → HomeScreen:
  * dato: Task overdue.
  * propósito: mostrar en Attention Required.
  * Clasificación: REAL visual / puede ser demo local.
* HomeScreen → PlannerModule:
  * Home resume Planner.
  * Clasificación: conexión visible con Home.
* Briefing → PlannerModule:
  * Briefing agrega información desde Planner.
  * Clasificación: para MVP visual, Briefing debe tratarse como MOCK si se usa.

No encontrado:

* No se encontró storage real.
* No se encontró AsyncStorage.
* No se encontró mock service explícito.
* No se encontró API externa.
* No se encontró source of truth técnico.

---

### 2.6 Navegación coherente

#### Entrada principal

* Planner se accede desde Bottom Navigation.
* Bottom Nav oficial:
  * Home.
  * People.
  * `+`.
  * Planner.
  * More.
* Planner es un destino de Nivel 2 / Dominio.
* Tasks y Calendar viven dentro de Planner.

#### Niveles de navegación relevantes

* Nivel 0:
  * Home.
  * Punto de entrada principal.
  * Siempre pantalla inicial.
* Nivel 1:
  * Bottom Nav.
* Nivel 2:
  * Dominio Planner.
  * Subdominios: Tasks, Calendar, Goals.
* Nivel 3:
  * Task Detail.
  * Event Detail.
* Nivel 4:
  * Acción puntual.
  * Editar tarea.
  * Cambiar responsable.
  * Configuración avanzada.

Restricciones:

* Más de 4 niveles es fallo de navegación.
* 95% de acciones deben resolverse en 3 niveles o menos.
* Navegación entre dominios no suma nivel; es movimiento lateral.
* Enlaces cruzados abren stack push.
* Back vuelve normalmente.
* Si A → B → C, el stack es A > B > C.
* Si B enlaza a A, se reutiliza la instancia existente de A y no se duplica.

#### Transiciones

* Home → Dominio:
  * Stack push.
  * Slide right → left.
  * 250ms ease-out.
* Dominio → Detalle:
  * Stack push.
  * Slide right → left.
  * 250ms ease-out.
* Detalle → Configuración avanzada:
  * Stack push.
  * Slide right → left.
  * 250ms ease-out.
* Cualquier nivel → Crear/Editar:
  * Bottom sheet.
  * Slide up + fade.
  * 300ms ease-out.
* Cualquier nivel → Confirmación:
  * Modal centrado.
  * Scale 0.95 → 1 + fade.
  * 250ms ease-out.
* Dominio A → Dominio B:
  * Stack push.
  * Slide right → left.
  * 250ms ease-out.
* Botón `+` → Quick Actions:
  * Panel flotante + blur.
  * Fade in + slide up.
  * 200ms ease-out.
* Cualquier nivel → Home:
  * Pop to root.
* Back:
  * Stack pop.
  * Slide left → right.
  * 200ms ease-in.

#### Navegación cruzada detectada

* Task → Event asociado.
* Task → Responsabilidad.
* Task → Goal.
  * Clasificación: POST_MVP / no desarrollar, salvo label visual si ya existe en mock.
* Event → Tasks vinculadas.
* Event → Documentos.
  * Dependencia externa / no desarrollar en este fragment.
* Inventory Item → Task.
  * Dependencia externa / no desarrollar en este fragment.
* Asset → Tasks.
  * Dependencia externa / no desarrollar en este fragment.

#### Ejemplo explícito de flujo

* Usuario en Home ve “Tenés que preparar comida para el asado del sábado”.
* Tap → Detalle de la tarea.
* En detalle ve enlace “Parte del evento: Asado del sábado →”.
* Tap → Detalle del evento.
* En evento ve “1 documento pendiente: Lista de compras →”.
* Tap → Detalle del documento.
* Back → evento → back → tarea → back → Home.

Para este fragment:

* El tramo Home → Task → Event es útil para Planner.
* El tramo Event → Documento queda como **Dependencia externa / no desarrollar en este fragment**.

---

### 2.7 Conexión con Home o More

#### Home

Conexiones encontradas:

* Home muestra tareas pendientes propias con 1-tap para completar.
* Home muestra próximos eventos.
* Home muestra “Tenés 2 tareas para hoy”.
* Home muestra “Hoy tenés 2 tareas y 1 evento.”
* Home puede mostrar tareas agrupadas por Responsabilidad.
* Home conduce al módulo correspondiente.
* Home no administra Planner.
* Attention Required puede mostrar tareas vencidas.
* Briefing puede agregar eventos y tareas del día.
* Para MVP visual, Briefing debe tratarse como MOCK si se usa en este fragment.

Orden o prioridad de Home desde comprensión:

* HomeScreen contiene Briefing.
* HomeScreen contiene AttentionRequired.
* HomeScreen usa PriorityEngine.
* HomeScreen resume PlannerModule.
* PriorityEngine tiene orden oficial donde Tasks y Events aparecen después de Attention Required y Briefing.

Clasificación:

* Tareas pendientes en Home: REAL visual / conexión real mínima.
* Próximos eventos en Home: REAL visual / conexión real mínima.
* Briefing con tareas/eventos: MOCK si se implementa como texto fijo/simple.
* Attention Required con tareas vencidas: REAL visual si la app calcula vencidas localmente; no hay backend en documento.

#### More

* Planner no vive en More.
* More contiene Finance, Inventory, HomeCloud y Settings.
* More no contiene dashboards.
* More solo tiene accesos a dominios + indicadores rápidos opcionales.
* Conexiones de More hacia Planner detectadas:
  * Inventory puede generar Task.
  * Asset/Maintenance puede generar Task.
  * Documentos pueden relacionarse con Event.
* Estas conexiones quedan como **Dependencia externa / no desarrollar en este fragment**.

#### Quick Actions

* Botón `+` central de Bottom Nav abre Quick Actions.
* Quick Actions es panel flotante con blur.
* Geni es slot fijo.
* Acciones dinámicas están ordenadas por uso.
* Quick Actions permite acceso a crear tarea y crear evento según archivo de comprensión.
* Quick Actions se adapta por rol y permisos según archivo de comprensión.
* Para este fragment:
  * crear tarea desde Quick Actions: DEMO PREMIUM / navegación visible.
  * crear evento desde Quick Actions: DEMO PREMIUM / navegación visible.
  * Geni no desarrollar como IA real.

---

## 3. Clasificación para implementación

### REAL MÍNIMO

Información que sí sirve para MVP visual/interactivo de Planner:

* Planner como tab principal en Bottom Nav.
* Planner agrupa Tasks y Calendar.
* Tasks muestra lista de tareas del día.
* Tasks usa checkboxes.
* Completar tarea desde list item en 1 tap.
* Completar tarea no requiere abrir detalle.
* Completar tarea muestra checkbox relleno, háptico y tachado.
* Completar tarea tiene “Deshacer” 5 segundos.
* Crear tarea/evento muestra item en lista con opacidad 0 → 1.
* Tap en tarea abre detalle.
* Tap en evento abre detalle.
* Crear/editar tarea o evento usa bottom sheet.
* Eliminar tarea pide confirmación.
* Calendar muestra evento del día.
* Calendar muestra primer item expandido por defecto.
* Calendar muestra timeline día/semana.
* Home muestra tareas pendientes propias.
* Home muestra próximos eventos.
* Home puede navegar a detalle de tarea/evento.
* Tarea puede tener responsable.
* Tarea puede tener fecha.
* Tarea puede tener prioridad.
* Tarea puede tener estado.
* Event tiene participantes múltiples, sin desarrollar participantes avanzados.
* Event tiene estados Programado, Completado, Cancelado según archivo de comprensión.
* Vencida no es estado de Task; se calcula automáticamente.
* Postergado no existe como estado de Event; postergar equivale a modificar fecha.
* Responsabilidad es eje organizador interno de Tasks, no dominio separado.

### DEMO PREMIUM

Información útil para que el módulo parezca completo sin backend perfecto:

* Lista agrupada por Responsabilidad.
* Chips por rol.
* Contador de pendientes.
* Próximo evento como card expandida.
* Timeline día/semana.
* Navegación cruzada Task → Event.
* Navegación cruzada Event → Tasks vinculadas.
* Empty state con acción sugerida.
* Skeleton si carga supera 300ms.
* Toasts de success/error.
* Item creado con fade/opacidad 0 → 1.
* Quick Actions abre crear tarea/evento.
* Home muestra “Tenés 2 tareas para hoy”.
* Home muestra “Hoy tenés 2 tareas y 1 evento.”
* Primer valor por rol:
  * Adulto ve tareas y eventos del día.
  * Adolescente ve lista personal y completa algo.
  * Niño ve lista del día con íconos y completa primera tarea.
* Modo Niño con lista simple, íconos grandes y confirmación positiva.
* Modo Adulto Mayor con botón explícito, sin gestos, menos items y alto contraste.

### LOCAL / ASYNCSTORAGE / MOCK SERVICE

No se encontró mención explícita a AsyncStorage, storage local o mock service.

Información que podría quedar aislada en un service demo en una etapa posterior, sin que el documento lo nombre:

* listado de tareas.
* listado de eventos.
* completar tarea.
* crear tarea.
* editar tarea.
* eliminar tarea.
* deshacer completar.
* crear evento.
* editar evento.
* eliminar evento.
* resumen para Home.
* cálculo de tareas vencidas.
* filtrado por Hoy/Mío/Por miembro/Tipo.

Estado de esta clasificación:

* Requiere decisión posterior.
* No está definido por el documento.
* No hay contrato de persistencia.

### POST_MVP

Información valiosa pero no implementable ahora como backend real:

* Goals dentro de Planner.
* Relación Task → Goal.
* Goal progress.
* Milestones.
* TaskDependency.
* Subtask.
* TaskComment.
* TaskAttachment.
* TaskTimeline.
* TaskRecurrence avanzada.
* Recurrencia compleja.
* Verificación como configuración avanzada, porque contradice los estados MVP esperados y no define `awaiting_verification`/`verified`.
* TaskTemplate si implica CRUD o personalización.
* Confirmar asistencia si implica estados `accepted/declined/maybe`.
* Event → Memory.
* Event → Document.
* Auto-create Memory cuando termina un evento.
* Geni task suggestions/rescheduling.
* Geni real.
* Notificaciones reales/push reales.
* Automatizaciones reales.
* Auditoría completa.
* Offline sync real.

### IGNORAR

No desarrollar en este fragment:

* Feed real.
* SOS real.
* Finance real.
* Inventory real.
* Assets real.
* HomeCloud/FamilyCloud real.
* Presence GPS real.
* Automations reales.
* Offline sync.
* OCR/storage real.
* Multi-hogar avanzado.

Dependencias externas que pueden aparecer solo como enlace o mención visual:

* Inventory → Task.
* Assets/Maintenance → Task.
* Event → Documento.
* Event → Memory.
* Geni → Planner.

---

## 4. UI extraíble

| Pantalla/Componente | Qué muestra | Acciones | Estados UX | Navegación | Clasificación |
| ------------------- | ----------- | -------- | ---------- | ---------- | ------------- |
| Planner tab | Entrada al módulo Planner desde Bottom Nav | Tap en Planner | Activo: ícono filled + texto 600; inactivo: outline + texto 400; badge success/alert | Bottom Nav `[Home] [People] [+] [Planner] [More]` | REAL MÍNIMO |
| Tasks (Planner) | Chip de filtro activo, contador de pendientes, lista de tareas agrupadas por Responsabilidad | Completar con checkbox, abrir detalle, crear con `+`, filtrar, refresh | NORMAL, LOADING, EMPTY, ERROR, SUCCESS; skeleton >300ms; toast | Planner → Tasks; Home → Task Detail; Task → Event | REAL MÍNIMO |
| Task list item | Tarea, checkbox, posible responsable/fecha/prioridad/estado según comprensión | Checkbox completa; tap abre detalle | Checkbox relleno, háptico, tachado, toast opcional, undo 5s | Tasks list → Task Detail | REAL MÍNIMO |
| Task Detail | Descripción, responsable, fecha, dependencias, comentarios, timeline, adjuntos según documento; varios elementos son POST_MVP | Ver enlaces relacionados; editar; cambiar responsable | Scroll vertical; acciones frecuentes fijas abajo | Task Detail → Event asociado; Task Detail → Responsabilidad; Task Detail → Goal POST_MVP | MIXTO |
| Create/Edit Task bottom sheet | Formulario de creación/edición; campos concretos no tipados | Guardar, cerrar, cancelar | Spinner si >300ms; toast success/error; sticky footer; confirmar salida con cambios | Cualquier nivel → bottom sheet | REAL VISUAL / datos faltantes |
| Delete Task confirmation | Pregunta “¿Eliminar esta tarea?” | Confirmar / cancelar | Bottom sheet; lectura <2s | Desde Task Detail o acción de tarea | REAL MÍNIMO |
| Calendar (Planner) | Próximo evento como card expandida; timeline día/semana | Ver detalle, confirmar asistencia, refresh | NORMAL, LOADING, EMPTY, ERROR, SUCCESS; primer item expandido | Planner → Calendar; Calendar → Event Detail | REAL MÍNIMO para día/semana; mes faltante |
| Event list item / Event card | Evento del día / próximo evento | Tap abre detalle | Expandido por defecto para primer item | Calendar → Event Detail; Home → Event Detail | REAL MÍNIMO |
| Event Detail | Evento, participantes, enlaces a tasks vinculadas/documentos | Ver tasks vinculadas; editar; cancelar/eliminar | Scroll vertical; acciones frecuentes fijas abajo | Event Detail → Tasks vinculadas; Event → Document externo | MIXTO |
| Create/Edit Event bottom sheet | Formulario de evento; campos no definidos | Guardar, cerrar, cancelar | Spinner >300ms; toast success/error; confirmar salida con cambios | Cualquier nivel → bottom sheet | REAL VISUAL / datos faltantes |
| Delete recurring event confirmation | “¿Este evento o toda la serie?” → confirmar | Elegir instancia/serie, confirmar | Confirmación doble | Event Detail → confirmación | POST_MVP si implica recurrencia compleja |
| Home Planner widgets | Tareas pendientes propias, próximos eventos, “Tenés 2 tareas para hoy”, “Hoy tenés 2 tareas y 1 evento” | Tap navega al módulo/detalle; completar tarea 1-tap desde Home | Briefing/no scroll; widgets con scroll en Capa 3; Attention Required | Home → Planner / Task Detail / Event Detail | Dependencia externa / REAL visual |
| Quick Actions panel | Panel flotante con blur; Geni fijo; acciones dinámicas | Crear tarea; crear evento | Fade in + slide up; 200ms; blur | Botón `+` central → Quick Actions → bottom sheet | Dependencia externa / DEMO PREMIUM |
| Empty state de dominio | Explica qué aparecerá y sugiere primera acción | Crear primer item | EMPTY → NORMAL con fade-in primer item | Dentro de Tasks/Calendar | DEMO PREMIUM |
| Error state | Mensaje de error + reintento | Retry | LOADING → ERROR; ERROR → LOADING → NORMAL | Dentro de listas/formularios | DEMO PREMIUM |
| Adulto Mayor variant | Menos items, botón Hoy fijo, botones visibles, alto contraste | Solo tap; sin pull-to-refresh | Animaciones reducidas, target 56px | Misma navegación; contenido adaptado | DEMO PREMIUM |
| Niño variant | Lista del día, íconos, completar primera tarea | Completar tarea | Confirmación visual/háptica; sin sonidos | Misma navegación; contenido adaptado | DEMO PREMIUM |

---

## 5. Datos demo extraíbles

| Dato/ejemplo | Módulo | Uso posible | Fuente | Clasificación |
| ------------ | ------ | ----------- | ------ | ------------- |
| “Tenés 2 tareas para hoy” | Planner / Tasks / Home | Card Home o header de Tasks | Documento principal §1.5 | DEMO PREMIUM |
| “Hoy tenés 2 tareas y 1 evento.” | Planner / Home | Briefing mock o resumen del día | Documento principal §6.1 | DEMO PREMIUM |
| “Preparar comida” | Tasks | Tarea demo vinculada a evento | Documento principal §3.3/3.4 | DEMO PREMIUM |
| “Asado del sábado” | Events | Evento demo | Documento principal §3.3/3.4 | DEMO PREMIUM |
| “Esta tarea es parte del Asado del sábado →” | Task Detail | Enlace Task → Event | Documento principal §3.3 | DEMO PREMIUM |
| “2 tareas dependen de este evento →” | Event Detail | Enlace Event → Tasks | Documento principal §3.3 | DEMO PREMIUM |
| “Tu primera tarea. Cuando alguien la complete, te avisamos.” | Tasks / Onboarding | Toast tras crear primera tarea | Documento principal §6.2 | DEMO PREMIUM |
| “Primer día completo.” | Tasks / Home | Reconocimiento por completar 3 tareas | Documento principal §6.2 | POST_MVP si depende de Geni real; DEMO si texto fijo |
| “Jose, estas son tus tareas para mañana.” | Tasks / Onboarding por rol | Lista personal adolescente | Documento principal §6.1 | DEMO PREMIUM |
| “Luca, tu lista de hoy” | Tasks / Onboarding niño | Lista infantil con íconos | Documento principal §6.1 | DEMO PREMIUM |
| Compras | Responsibility / Tasks | Grupo o categoría de tareas | Documento principal §3.3; comprensión OUTPUT 1 | REAL VISUAL |
| Mascotas | Responsibility / Tasks | Grupo o categoría de tareas | Comprensión OUTPUT 1 | REAL VISUAL |
| Limpieza | Responsibility / Tasks | Grupo o categoría de tareas | Comprensión OUTPUT 1 | REAL VISUAL |
| Vehículos | Responsibility / Tasks | Grupo o categoría de tareas | Comprensión OUTPUT 1 | REAL VISUAL |
| Pendiente | Task status | Estado de tarea encontrado | Comprensión OUTPUT 1 | REAL VISUAL / requiere mapeo posterior |
| En progreso | Task status | Estado de tarea encontrado | Comprensión OUTPUT 1 | REAL VISUAL / contradice prompt MVP si se usa como estado técnico |
| Completada | Task status | Estado de tarea encontrado | Comprensión OUTPUT 1 | REAL VISUAL / requiere mapeo posterior |
| Cancelada | Task status | Estado de tarea encontrado | Comprensión OUTPUT 1 | REAL VISUAL / requiere mapeo posterior |
| Programado | Event status | Estado de evento | Comprensión OUTPUT 1 | REAL VISUAL |
| Completado | Event status | Estado de evento | Comprensión OUTPUT 1 | REAL VISUAL |
| Cancelado | Event status | Estado de evento | Comprensión OUTPUT 1 | REAL VISUAL |
| “¿Eliminar esta tarea?” | Tasks | Confirmación de eliminación | Documento principal §1.4 | REAL MÍNIMO |
| “¿Este evento o toda la serie?” | Events | Confirmación recurrente | Documento principal §1.4 | POST_MVP / UX disponible |
| “Tenés cambios sin guardar. ¿Salir?” | Tasks/Events forms | Confirmación al cerrar formulario | Documento principal §1.4 | REAL MÍNIMO |
| “Completar [nombre de tarea]” | Tasks accessibility | accessibilityLabel | Documento principal §7.5 | REAL MÍNIMO |
| “Marca la tarea como completada” | Tasks accessibility | accessibilityHint | Documento principal §7.5 | REAL MÍNIMO |
| “Crear [tarea/evento/gasto]” | Planner / Quick Actions | accessibilityLabel del botón `+` flotante | Documento principal §7.5 | REAL MÍNIMO para tarea/evento |

---

## 6. Acciones extraíbles

| Acción | Usuario/Rol | Resultado visible | Real/Mock/Post-MVP | Fuente |
| ------ | ----------- | ----------------- | ------------------ | ------ |
| Completar tarea asignada | Todos según visibilidad; Niño/Adolescente/Adulto explícitos en primer valor | Checkbox se rellena, háptico, tachado, toast opcional | REAL MÍNIMO | Documento §1.1, §1.2, §5.1 |
| Deshacer completar tarea | Usuario que completó | Toast con “Deshacer” durante 5s | REAL MÍNIMO | Documento §1.4, UX-08 |
| Crear tarea | Usuario con acceso al dominio; rol no detallado | Item aparece en lista con opacidad 0→1 | REAL/LOCAL; contrato faltante | Documento §1.2, §1.3 |
| Editar tarea | Usuario con permiso; rol no detallado | Bottom sheet de edición | REAL/LOCAL; contrato faltante | Documento §3.1, §3.2, UX-03 |
| Eliminar tarea | Usuario con permiso; rol no detallado | Bottom sheet “¿Eliminar esta tarea?” | REAL/LOCAL; contrato faltante | Documento §1.4 |
| Abrir detalle de tarea | Todos según visibilidad | Navega a Task Detail | REAL VISUAL | Documento §1.3, §3.1 |
| Cambiar responsable | No especificado | Acción puntual Nivel 4 | REAL VISUAL parcial; falta detalle | Documento §3.1 |
| Filtrar tareas | Varía por rol | Chip activo cambia lista y accessibilityLabel seleccionado | REAL VISUAL | Documento §2.4, §7.5 |
| Pull-to-refresh | Todos excepto Adulto Mayor | Indicador sutil; al terminar háptico light | REAL VISUAL | Documento §1.3, §5.1, UX-20 |
| Ver evento del día | Todos según visibilidad | Primer evento expandido por defecto | REAL MÍNIMO | Documento §1.1 |
| Crear evento | Usuario con acceso; rol no detallado | Item aparece en lista con opacidad 0→1 | REAL/LOCAL; contrato faltante | Documento §1.2, §1.3 |
| Editar evento | Usuario con permiso; rol no detallado | Bottom sheet | REAL/LOCAL; contrato faltante | Documento §3.2, UX-03 |
| Eliminar evento recurrente | Usuario con permiso; rol no detallado | Confirmación doble | POST_MVP si implica recurrencia compleja | Documento §1.4 |
| Abrir detalle de evento | Todos según visibilidad | Navega a Event Detail | REAL VISUAL | Documento §1.3, §3.1 |
| Confirmar asistencia | Usuario participante; no detallado | Acción en Calendar | POST_MVP / no contrato | Documento §2.1 |
| Navegar Task → Event | Usuario desde detalle de tarea | Stack push al detalle de evento | DEMO PREMIUM | Documento §3.3/3.4 |
| Navegar Event → Tasks | Usuario desde detalle de evento | Stack push o enlace a tareas vinculadas | DEMO PREMIUM | Documento §3.3 |
| Abrir Quick Actions | Todos | Panel flotante con blur | Dependencia externa / DEMO PREMIUM | Documento §3.5, §5.2 |
| Crear tarea/evento desde Quick Actions | Todos según rol/permisos; no detallado | Abre flujo de creación | Dependencia externa / DEMO PREMIUM | Comprensión OUTPUT 1/7 |

---

## 7. Home / More / Quick Actions

### Home

Qué puede mostrarse en Home desde Planner:

* Tareas pendientes propias.
* Tareas para hoy.
* Próximos eventos.
* Evento del día.
* Attention Required con tareas vencidas.
* Briefing simple con tareas/eventos del día.
* Widget “Tareas agrupadas por Responsabilidad”.
* Texto “Tenés 2 tareas para hoy”.
* Texto “Hoy tenés 2 tareas y 1 evento.”

Clasificación:

* Tareas pendientes propias: REAL visual.
* Próximos eventos: REAL visual.
* Atención requerida por tareas vencidas: REAL visual si se calcula localmente; no hay backend.
* Briefing: MOCK si se usa texto fijo/simple.
* Carga Familiar: no desarrollar desde Planner.
* Presence: no desarrollar desde Planner.
* Actividad Familiar: no desarrollar desde Planner.

Regla clave:

* Home resume, no administra.
* Toda información de Planner mostrada en Home debe conducir a Planner, Task Detail o Event Detail.

### More

* Planner no vive en More.
* Planner vive en Bottom Nav.
* More no debe usarse como entrada principal de Planner.
* Integraciones desde More hacia Planner quedan como dependencia externa:
  * Inventory puede generar tareas.
  * Assets/mantenimiento puede generar tareas.
  * HomeCloud/documentos puede relacionarse con eventos.

Clasificación:

* More: Dependencia externa / no desarrollar en este fragment.

### Quick Actions

Acciones relacionadas encontradas:

* Botón `+` central abre Quick Actions.
* Quick Actions es panel flotante con blur.
* Geni es slot fijo.
* Acciones dinámicas ordenadas por uso.
* Acceso a crear tarea.
* Acceso a crear evento.
* Quick Actions se adapta por rol y permisos.

Clasificación:

* Crear tarea desde Quick Actions: DEMO PREMIUM / dependencia externa.
* Crear evento desde Quick Actions: DEMO PREMIUM / dependencia externa.
* Geni real: POST_MVP / no desarrollar.

---

## 8. Backend/API detectado

No se encontró contrato API explícito en este documento.

No se encontraron rutas, métodos, request ni response.

Acciones mencionadas sin contrato API:

| Endpoint/Acción | Método | Ruta | Request | Response | Estado | Clasificación |
| --------------- | ------ | ---- | ------- | -------- | ------ | ------------- |
| Crear tarea | No especificado | No especificada | No especificado | No especificado | Acción mencionada sin contrato API | REAL/LOCAL pendiente |
| Editar tarea | No especificado | No especificada | No especificado | No especificado | Acción mencionada sin contrato API | REAL/LOCAL pendiente |
| Eliminar tarea | No especificado | No especificada | No especificado | No especificado | Acción mencionada sin contrato API | REAL/LOCAL pendiente |
| Completar tarea | No especificado | No especificada | No especificado | No especificado | Acción mencionada sin contrato API | REAL MÍNIMO visual |
| Listar tareas | No especificado | No especificada | No especificado | No especificado | Acción deducida por lista visible; sin contrato | REAL VISUAL |
| Crear evento | No especificado | No especificada | No especificado | No especificado | Acción mencionada sin contrato API | REAL/LOCAL pendiente |
| Editar evento | No especificado | No especificada | No especificado | No especificado | Acción mencionada sin contrato API | REAL/LOCAL pendiente |
| Eliminar evento | No especificado | No especificada | No especificado | No especificado | Acción mencionada sin contrato API | REAL/LOCAL pendiente |
| Listar eventos | No especificado | No especificada | No especificado | No especificado | Acción deducida por lista/timeline visible; sin contrato | REAL VISUAL |
| Ver calendario | No especificado | No especificada | No especificado | No especificado | Acción mencionada como UI, sin contrato | REAL VISUAL |

---

## 9. Modelo de datos detectado

| Entidad | Campo | Tipo si aparece | Estado/valores | Uso visual o interacción | Clasificación |
| ------- | ----- | --------------- | -------------- | ------------------------ | ------------- |
| PlannerModule | contiene | no especificado | Tasks, Calendar, Goals, Responsibility | Organización del módulo | REAL para Tasks/Calendar; Goals POST_MVP |
| Task | título | no especificado | no especificado | Mostrar item/list/detail | REAL MÍNIMO |
| Task | descripción | no especificado | no especificado | Detalle de tarea | REAL VISUAL / opcional no definido |
| Task | responsable | no especificado | Person / miembro | Asignación, agrupación, avatar | REAL MÍNIMO |
| Task | fechas | no especificado | hoy, mañana, vencida calculada | Lista de hoy, Home, Calendar si se usa | REAL MÍNIMO |
| Task | prioridad | no especificado | no especificado | Badge/filtro posible | REAL VISUAL, enum faltante |
| Task | estado | no especificado | Pendiente, En progreso, Completada, Cancelada | Badge/checkbox/filtrado | REAL VISUAL; contradicción con MVP esperado |
| Task | responsabilidad asociada | no especificado | Compras, Mascotas, Limpieza, Vehículos | Agrupación de lista | REAL VISUAL |
| Task | goal asociada | no especificado | Goal | Enlace en detalle | POST_MVP |
| Task | archivos | no especificado | imágenes, PDFs, archivos, audio según TaskAttachment | Detalle/timeline | POST_MVP |
| Task | comentarios | no especificado | comentarios humanos | Detalle/timeline | POST_MVP |
| TaskDependency | previa/dependiente | no especificado | bloqueada si previa no se completa | Dependencia entre tareas | POST_MVP |
| TaskRecurrence | regla | no especificado | genera nuevas instancias | Configuración avanzada | POST_MVP salvo recurrencia simple definida en otra fuente |
| Subtask | progreso | no especificado | calculado automáticamente | Detalle/progreso | POST_MVP |
| TaskComment | comentario | no especificado | no especificado | Timeline de tarea | POST_MVP |
| TaskAttachment | adjunto | no especificado | imágenes, PDFs, archivos, audio | Detalle de tarea | POST_MVP |
| TaskTimeline | actividad | no especificado | automática + comentarios humanos | Detalle de tarea | POST_MVP |
| TaskVerification | verificación | no especificado | estado final Completada, sin estado separado | Configuración avanzada | POST_MVP / contradicción MVP |
| TaskTemplate | plantilla | no especificado | inicialmente solo para Tasks | Nivel 3 / configuración | POST_MVP si no son constantes MVP definidas |
| Responsibility | nombre | no especificado | Compras, Mascotas, Limpieza, Vehículos | Agrupar tareas | REAL VISUAL |
| Responsibility | miembros asignados | no especificado | Person/Membership | Asignación visual | REAL VISUAL parcial; permisos faltan |
| Calendar | contiene | no especificado | Event | Sub-sección Planner | REAL MÍNIMO |
| Event | tipo/contexto | no especificado | familiar o personal | List/detail | REAL VISUAL |
| Event | estado | no especificado | Programado, Completado, Cancelado | Badge/filtrado | REAL VISUAL |
| Event | participantes | no especificado | múltiples participantes | Avatares/lista | REAL VISUAL; estados de asistencia POST_MVP |
| Event | fecha modificable | no especificado | Postergar = modificar fecha | Editar evento | REAL VISUAL |
| Person | relación con Task | no especificado | responsable/asignado | Avatar, asignación | Dependencia externa necesaria |
| Person | relación con Event | no especificado | participante | Avatar/lista participantes | Dependencia externa necesaria |
| HomeScreen | resume | no especificado | PlannerModule | Home widgets/cards | Dependencia externa necesaria |
| AttentionRequired | agrega desde Planner | no especificado | tareas vencidas | Home alerta | Dependencia externa necesaria |
| QuickActions | acciones | no especificado | crear tarea/evento | Panel `+` | Dependencia externa / demo |

---

## 10. Edge cases / errores / estados vacíos

| Caso | Comportamiento esperado | Fuente | Clasificación |
| ---- | ----------------------- | ------ | ------------- |
| Completar tarea accidentalmente | Toast con “Deshacer” durante 5 segundos | Documento §1.4 | REAL MÍNIMO |
| Eliminar tarea | Bottom sheet de confirmación “¿Eliminar esta tarea?” | Documento §1.4 | REAL MÍNIMO |
| Eliminar evento recurrente | Confirmación doble: “¿Este evento o toda la serie?” → confirmar | Documento §1.4 | POST_MVP si implica recurrencia compleja |
| Cerrar formulario con cambios | Bottom sheet “Tenés cambios sin guardar. ¿Salir?” | Documento §1.4 | REAL MÍNIMO |
| Guardar formulario tarda >300ms | Botón con spinner, mantiene ancho | Documento §1.2 | REAL VISUAL |
| Carga inicial tarda >300ms | Skeleton screen | Documento §5.2/5.3 | DEMO PREMIUM |
| Refresh | Indicador sutil en zona superior sin bloquear UI | Documento §1.2/5.3 | DEMO PREMIUM |
| Error de red | Toast informativo inmediato | Documento §1.2 | DEMO PREMIUM |
| Loading falla | Mensaje de error + botón de reintento | Documento §5.3 | DEMO PREMIUM |
| Query sin resultados | Empty state con acción sugerida | Documento §5.3/6.2 | DEMO PREMIUM |
| Empty → primer item | Fade-in del primer item; acción sugerida desaparece | Documento §5.3 | DEMO PREMIUM |
| Tap en botón | Escala 0.97 → 1.0 + háptico ligero | Documento §1.2 | REAL VISUAL |
| Completar tarea | Checkbox relleno + háptico + tachado | Documento §1.2/5.1 | REAL MÍNIMO |
| Tarea vencida | No es estado; se calcula automáticamente | Comprensión OUTPUT 5 | REAL VISUAL / regla importante |
| Event postergado | No existe estado Postergado; postergar equivale a modificar fecha | Comprensión OUTPUT 5 | REAL VISUAL / regla importante |
| Adulto Mayor usando gestos | Swipe, long press y pull-to-refresh desactivados; cada acción con botón visible | Documento §7.3 | DEMO PREMIUM |
| List item con swipe/long press | No definido; requiere enmienda a especificación canónica | Documento §1.3 | IGNORAR / no implementar |
| Listas largas | Scroll vertical infinito con paginación; indicador de carga al final | Documento §2.3 | DEMO PREMIUM |
| Modal centrado demasiado largo | No debe scrollear; si no cabe, usar bottom sheet | Documento §2.3 | REAL VISUAL |
| Más de 4 niveles de navegación | Fallo de navegación | Documento §3.1 | Restricción real |

---

## 11. Restricciones y prohibiciones detectadas

### Restricciones de interacción

* La acción principal de cada pantalla debe ejecutarse con un solo toque.
* En Tasks, completar tarea asignada debe hacerse con checkbox táctil en el list item.
* En Calendar, ver evento del día debe estar como primer item expandido por defecto.
* Si el usuario necesita más de un toque para completar la acción más frecuente, el diseño debe rehacerse.
* Las acciones secundarias pueden requerir navegación adicional.
* Toda acción debe responder en menos de 100ms.
* Spinners solo si la operación excede 300ms.
* Ninguna acción queda sin respuesta visual o háptica.
* No usar sonidos propios.
* No usar heavy haptic fuera de emergencia.

### Restricciones de navegación

* Bottom Nav congelada V1: `[Home] [People] [+] [Planner] [More]`.
* Planner no debe moverse a More.
* Calendar no es tab independiente; vive dentro de Planner.
* Más de 4 niveles es fallo de navegación.
* 95% de acciones deben resolverse en 3 niveles o menos.
* Bottom sheet para crear/editar; pantalla completa solo si el contenido lo exige.
* Modal centrado solo para confirmaciones; nunca para formularios.
* No usar modal para navegación entre niveles.
* Navegación cruzada siempre se abre como stack push.
* Back debe funcionar normalmente.

### Restricciones de UI

* La acción principal no debe requerir scroll.
* Si un formulario requiere scroll, acciones guardar/cancelar fijas en zona inferior.
* Nunca scroll horizontal para contenido de lectura.
* Scroll horizontal solo para chips de filtro o galería de fotos.
* Scroll infinito siempre tiene indicador de carga al final.
* La zona superior solo contiene lectura o navegación; nunca la acción principal.
* Botón `+` flotante siempre en esquina inferior derecha.
* Toast en zona superior, no inferior.
* Badge de tab nunca usa color error/rojo.

### Restricciones por rol

* Diseño por rol, no por feature.
* La adaptación es estructural, no solo filtros.
* Niño no administra información familiar crítica.
* Adulto Mayor mantiene estructura de navegación, pero cambia contenido y presentación.
* Adulto Mayor: solo tap, sin gestos.
* Adulto Mayor: máximo 3 items visibles en lista sin scroll.
* Niño: target táctil 48px.
* Adulto Mayor: target táctil 56px.

### Restricciones de dominio

* Responsabilidades no son dominio independiente; son propiedad de Task y eje organizador dentro de Tasks.
* Home resume, no administra.
* Toda información mostrada en Home debe conducir al módulo correspondiente.
* Vencida no es estado de Task; se calcula automáticamente.
* Postergado no existe como estado de Event; postergar equivale a modificar fecha.
* Geni no puede marcar tareas completadas automáticamente.
* Subtareas no tienen anidamiento múltiple, pero subtareas quedan POST_MVP.
* Recurrencias generan nuevas instancias y preservan historial, pero recurrencia avanzada queda POST_MVP.

### Prohibiciones para este fragment

* No desarrollar Goals real.
* No desarrollar comentarios/adjuntos/timeline/subtareas/dependencias como MVP real.
* No desarrollar Geni real.
* No desarrollar notificaciones reales.
* No desarrollar Inventory/Assets/HomeCloud/Finance.
* No desarrollar Feed/SOS/Presence GPS.
* No inventar API ni modelos no presentes.
* No implementar estados técnicos no resueltos de verification flow.

---

## 12. Información faltante

| Falta | Por qué importa para Codex | Impacto |
| ----- | -------------------------- | ------- |
| Campos técnicos finales de Task | Codex necesita nombres concretos para forms, mocks y state | Debe usar nombres provisionales solo si etapa posterior lo decide; este fragment no los inventa |
| Tipos de campos de Task | No hay string/date/enum definidos | Forms y validaciones quedan incompletas |
| Enum de prioridad | Prioridad aparece, pero no sus valores | No se puede diseñar badge real de prioridad sin decisión posterior |
| Estados MVP de Tasks | Documento dice Pendiente/En progreso/Completada/Cancelada; prompt MVP espera pending/completed/awaiting_verification/verified | Contradicción crítica para merge posterior |
| Verification Flow | Documento dice verificación opcional y estado final Completada sin estado separado | No se puede implementar `awaiting_verification`/`verified` desde este documento sin otra fuente |
| Quién puede verificar tareas | MVP pide verificar desde otro usuario autorizado, pero este documento no define rol/permiso | Permisos faltantes |
| Templates MVP completas | Documento menciona plantillas, pero no define Limpieza/Compras/Mascotas/Medicación/Estudios/Pagos como constantes | Templates quedan incompletas |
| CRUD de templates | No se debe implementar si es Post-MVP; documento no aclara MVP constants | Riesgo de sobredesarrollar |
| Campos técnicos de Event | No hay title/start/end/location/description definidos | Crear/editar evento queda visual, no contractual |
| Recurrencia simple de eventos | Documento menciona evento recurrente, pero no define `none/daily/weekly/monthly` | Calendar/Event recurrence no implementable desde este documento |
| Vista mes | Documento menciona día/semana, pero no mes | MVP Calendar queda incompleto si mes es obligatorio |
| Tareas con fecha dentro de Calendar | Documento relaciona Tasks y Calendar, pero no define calendario unificado | Requiere decisión posterior |
| Endpoints/API | No hay rutas, métodos, request ni response | Backend real no se puede derivar |
| Service contract | No hay service nombrado ni fuente de datos | Para demo debe decidirse local/mock en etapa posterior |
| Permisos por rol para crear/editar/eliminar | Hay UX por rol, pero no permisos de dominio | No se puede bloquear acciones por rol sin otra fuente |
| Empty state copy específico de Planner | Se define regla general, pero no texto exacto para Tasks/Calendar | Codex necesitará copy provisional o fuente externa |
| Error messages específicos | Se define patrón, pero no mensajes concretos | Estados de error quedan genéricos |
| Datos demo suficientes | Hay frases y ejemplos sueltos, no dataset completo | Hay que completar en merge/prompt posterior sin atribuirlo a este documento |
| Integración Home exacta | Se define que Home muestra tareas/eventos, pero no contrato de datos | Resumen Home-Planner queda visual/local |
| Participantes avanzados de eventos | Event tiene múltiples participantes, pero no accepted/declined/maybe | Mantener fuera del MVP real |
| Confirmar asistencia | Aparece como acción UI, pero sin contrato | Clasificar como POST_MVP o demo visual no persistente |

---

## 13. Fuente

### Archivo principal

* Archivo: `HomePlus — SECCION 6 UX PHILOSOPHY(1).md`
* Secciones usadas:
  * Encabezado del documento: producto, versión, alcance mobile-first.
  * `## 1. PRINCIPIOS DE INTERACCIÓN`
  * `### 1.1 Regla del 1-tap`
  * `### 1.2 Feedback inmediato`
  * `### 1.3 Previsibilidad`
  * `### 1.4 Perdón`
  * `### 1.5 Progressive Disclosure`
  * `## 2. ARQUITECTURA DE PANTALLA`
  * `### 2.1 Jerarquía visual universal`
  * `### 2.2 Zonas de la pantalla`
  * `### 2.3 Reglas de scroll`
  * `### 2.4 Densidad de información por rol`
  * `## 3. NAVEGACIÓN`
  * `### 3.1 El modelo de niveles según Final Spec V1`
  * `### 3.2 Transiciones entre niveles`
  * `### 3.3 Navegación contextual entre entidades`
  * `### 3.4 Regla de "no volver atrás"`
  * `### 3.5 Bottom Navigation — Congelado V1`
  * `## 4. ADAPTACIÓN POR ROL`
  * `### 4.1 Tabla comparativa de adaptación UX por rol`
  * `### 4.3 Adulto Mayor: diseño asistivo, no solo "fuente grande"`
  * `## 5. MICROINTERACCIONES`
  * `### 5.1 Feedback háptico`
  * `### 5.2 Animaciones`
  * `### 5.3 Transiciones entre estados`
  * `### 5.4 Sonidos`
  * `## 6. ONBOARDING Y PRIMER VALOR`
  * `### 6.1 Principio: 60 segundos hasta valor visible`
  * `### 6.2 No tutoriales largos`
  * `### 6.3 Flujo de onboarding por rol`
  * `## 7. ACCESIBILIDAD`
  * `### 7.1 WCAG objetivo`
  * `### 7.2 Tamaños de fuente mínimos por rol`
  * `### 7.3 Alternativas a gestos`
  * `### 7.5 Etiquetas para lectores de pantalla`
  * `## 8. TABLA DE DECISIONES UX TOMADAS`
  * `## 9. PRINCIPIOS DE IMPLEMENTACIÓN UX`

### Archivo de comprensión asociado

* Archivo: `Seccion 6 filosofia ux(1).txt`
* Secciones usadas:
  * `OUTPUT 1 — ENTITIES`
  * `OUTPUT 2 — RELATIONSHIPS`
  * `OUTPUT 3 — CROSS_DOMAIN_RELATIONSHIPS`
  * `OUTPUT 4 — DATA FLOWS`
  * `OUTPUT 5 — BUSINESS RULES`
  * `OUTPUT 6 — DECISIONS`
  * `OUTPUT 7 — MISSING OR IMPLIED CONNECTIONS`
  * CSV final de relaciones.

### Source map generado previamente

* Archivo: `source_map_HomePlus_SECCION_6_UX_PHILOSOPHY.md`
* Secciones consultadas:
  * `# 4.7 PLANNER`
  * `# 4.8 TASKS`
  * `# 4.9 EVENTS`
  * `# 4.10 CALENDAR`
  * `## 15. Información POST_MVP detectada`
  * `## 18. Información faltante`
  * `## 19. Recomendación de fragments a generar`

