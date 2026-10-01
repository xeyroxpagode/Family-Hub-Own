# HomePlus — UIX-006 Planner Premium Audit

**Fecha:** 28 de junio de 2026  
**Issue:** UIX-006 — Planner premium  
**Fase:** 1 — Core UI/UX Final Premium  
**Rama:** rediseno-auth-post-entrega-profesional  
**Predecesor:** UIX-004 — Auth premium cálido (cerrada)  

---

## 1. Objetivo

Planner debe sentirse como el **centro operativo familiar** de HomePlus. No como un dashboard corporativo ni una app de productividad fría.

Debe transmitir:
- tareas domésticas con claridad y sin culpa,
- eventos familiares con jerarquía,
- calendario compartido legible,
- coordinación visible entre miembros,
- prioridad del día al primer vistazo,
- claridad rápida sin sobrecarga,
- tono cálido y familiar.

No debe transmitir:
- Jira / Trello corporativo,
- app bancaria,
- app infantil,
- formulario administrativo,
- calendario seco,
- productividad laboral.

---

## 2. Reglas de seguridad

Durante UIX-006:

- NO cambiar backend.
- NO cambiar endpoints.
- NO cambiar servicios salvo adaptación visual mínima (estilos, wrappers).
- NO tocar lógica de negocio.
- NO tocar Supabase.
- NO instalar dependencias.
- NO modificar package.json ni package-lock.json.
- NO romper tareas/eventos reales.
- NO reescribir pantallas completas.
- NO modificar navegación ni rutas.
- NO resetear ni revertir cambios previos.

---

## 3. Archivos auditados

| Archivo | Propósito |
|---|---|
| `screens/planner/PlannerScreen.tsx` | Shell principal del Planner. Tabs (Tareas/Calendario/Metas), stats, modal sheet para TaskForm/EventForm, resumen, toast. |
| `screens/planner/PlannerTasksScreen.tsx` | Lista de tareas con filtros, completar/verificar/cancelar, editar, optimistic updates. |
| `screens/planner/PlannerCalendarScreen.tsx` | Vista de calendario (día/semana/mes), grid mensual, eventos y tareas del día, completar/editar/cancelar. |
| `screens/planner/TaskForm.tsx` | Formulario crear/editar tarea. Templates, quick dates, asignación, prioridad, verificación, descripción, embedded mode. |
| `screens/planner/EventForm.tsx` | Formulario crear/editar evento. Recurrencia, all-day, ubicación, edición de ocurrencia vs serie, cancelar. |
| `screens/planner/plannerShared.ts` | Estilos compartidos, labels (prioridad, estado, recurrencia), helpers de fecha (dateToYMD, addDays, addMonths, buildLocalIso, formatDate, formatTime). |
| `screens/home/HomePlannerSections.tsx` | Sección del Home que muestra datos del Planner (BriefingCard, tareas, eventos). CTA a Planner. |
| `services/plannerSummary.ts` | Tipado `PlannerSummary` y endpoint `GET /api/planner/summary`. |
| `services/plannerTasks.ts` | Tipado `PlannerTask`, CRUD, filtros, acciones (complete, verify, cancel). Endpoints `/api/planner/tasks`. |
| `services/plannerEvents.ts` | Tipado `PlannerEvent`, CRUD, filtros. Endpoints `/api/planner/events`. |
| `services/plannerCalendar.ts` | Tipado `PlannerCalendarItem` (unión event+task), endpoint `GET /api/planner/calendar`. |
| `services/plannerTemplates.ts` | 6 templates fijos (Limpieza, Compras, Mascotas, Medicación, Estudios, Pagos) más "Otro". |
| `components/ui/` (AppCard, AppText, AppButton, ErrorState, EmptyState, Skeleton, ActionPill, AppInput, AppScreen, GlassSurface) | Componentes UI compartidos usados por Planner (AppCard en stats y HomePlannerSections, AppText en varias pantallas, ErrorState en PlannerScreen, Skeleton en PlannerScreen y HomePlannerSections, AppButton en PlannerScreen, ActionPill sin uso directo en Planner). |
| `constants/theme.ts` (colors, radius, shadows, spacing) | Sistema de diseño base. Planner usa `colors.terracotta`, `colors.sand`, `colors.sage`, `colors.warning`, `colors.success`, `colors.danger`, `colors.background`, `colors.surface`, `colors.border`, `colors.text`. |
| `constants/icons.ts` (APP_ICONS, HomePlusIcon) | Iconografía. Planner usa `APP_ICONS.planner.todo`, `planner.calendar`, `planner.goals`, `checkmark-circle`, `sparkles`, `alert-circle`. |
| `context/AuthContext.ts` | Planner consume `session`, `authMe`, `loading`. |
| `context/HouseholdContext.ts` | Planner consume `members`. |
| `context/AppRefreshContext.ts` | Planner consume `plannerChangedAt`, `markPlannerChanged`, `homeChangedAt`. |

---

## 4. Estado actual real del Planner

### 4.1 PlannerScreen (shell)

**Qué muestra:**
- Título "Planner" + subtítulo descriptivo.
- Topbar tabs: Tareas / Calendario / Metas con iconos y terracotta pill active.
- Botón "Actualizar" (secondary) para refresh manual.
- Toast de éxito (inline) tras crear/editar desde el modal sheet.
- Stats horizontales: Pendientes, Hoy, Vencidas (warning), Por verificar (success).
- Loading state: `Skeleton variant="screenSection"`.
- Error state: `ErrorState` con retry.
- Modal sheet (bottom panel) para TaskForm/EventForm con backdrop + handle + botón Cerrar.
- Tab "Goals": 100% mock/demo (4 cards con datos fake, progreso 60%, badges "Próximamente" y "En seguimiento").

**Qué datos consume:**
- `getPlannerSummary(accessToken)` → `PlannerSummary` (counts de tasks pendientes, hoy, vencidas, awaiting verification, upcoming events).
- `useFocusEffect` dispara refresh silencioso al volver a la tab.
- Navegación recibe params: `initialTab`, `initialSheet`, `sheetKey`, `refreshKey`.

**Qué navegación maneja:**
- Recibe params desde HomePlannerSections (openPlanner) y desde TaskForm/EventForm standalone.
- Pasa props a `PlannerTasksScreen` (refreshKey, onCreateTask, onEditTask, onChanged) y `PlannerCalendarScreen` (refreshKey, onCreateEvent, onEditEvent con context de recurrencia, onEditTask, onChanged).
- Modal sheet gestiona apertura/cierre de TaskForm y EventForm en modo embedded.

**Deudas visuales:**
- Topbar tabs usan estilos en `plannerShared` (topbarTab/topbarTabActive) con look funcional pero plano. El active state con terracotta sólido y texto blanco carece de profundidad premium.
- Stats cards son `AppCard variant="quiet"` con borde sutil — funcionales pero sin jerarquía visual de prioridad.
- El botón "Actualizar" visible todo el tiempo en la shell es redundante (pull-to-refresh ya existe).
- Toast inline usa `success.soft` background — correcto pero sin animación de entrada/salida.
- Modal sheet abre con `animationType="slide"` nativo — sin animación custom.
- Tab "Goals" ocupa ~100 líneas de mock con cards demo, etiquetas "Próximamente" y "Vista demo" explícitas. Bloqueado por PLAN-002.

**Riesgos:**
- `useFocusEffect` dispara `setRefreshKey` + `loadSummary(true)` cada vez que se enfoca, lo que fuerza re-render de PlannerTasksScreen y PlannerCalendarScreen. Esto causa skeleton/loading flash si no hay caché.
- El `refreshKey` se incrementa en 3 lugares distintos (useFocusEffect, refresh(), changed()) con riesgo de doble refresh innecesario.
- El state `sheet` maneja task y event forms — la lógica de cierre limpia el sheet pero no resetea Keyboard si se usó dentro.

### 4.2 PlannerTasksScreen

**Lista de tareas:**
- Carga todas las tareas (`limit: 500`, `include_cancelled: true`) en un solo request.
- Renderiza lista filtrada cliente-side con `useMemo`.
- Cada tarea: checkbox + título + fecha/hora + badge estado + descripción + metadata (prioridad, categoría, persona) + botones (Completar, Verificar, Editar, Cancelar).
- Prioridad visual: vencidas usan `badgeDanger` style.

**Filtros:**
- 8 chips horizontales: Pendientes, Mías, Familia, Hoy, Vencidas, Por verificar, Hechas, Canceladas.
- Filtrado cliente-side con lógica de prioridad (`getPriorityScore`) y sort por prioridad + due_date.
- Scroll horizontal de chips — riesgo de pérdida de posición.

**Estados:**
- Loading: `ActivityIndicator` centrado con color terracotta (sin usar Skeleton del sistema).
- Error: caja inline con `S.errorBox` + mensaje + botón "Reintentar" con estilo `S.secondaryBtn`.
- Empty: estado humano con título "Acá van a aparecer tus tareas", descripción y CTA "Crear tarea".
- Saving: `savingId` rastrea la tarea en mutación, con `opacity: 0.6` en botones y `disabled` en checkbox.

**Completar/Verificar/Cancelar:**
- Completar: optimistic update local + API call → reemplaza con respuesta del servidor. Si requiere verificación → `awaiting_verification`, sino → `completed`.
- Verificar: API call directa con actualización al vuelta.
- Cancelar: `Alert.alert` de confirmación destructiva → API call.
- Error de mutación: revierte al estado anterior (`previousTasks`) y muestra `Alert.alert`.

**Deudas visuales:**
- La card de tarea usa `S.card` definido en `plannerShared` — bordes sutiles, shadow leve, padding consistente. Funcional pero plano.
- El checkbox es un círculo con borde terracotta — simple pero efectivo. Faltaría animación de toggle.
- El badge usa `S.badge` (sand[50] background) — neutro y poco expresivo para estados tan distintos (pendiente vs completada vs cancelada).
- Los botones de acción (Completar, Verificar, Editar, Cancelar) se agrupan en un row horizontal con 3-4 botones. Puede saturarse en pantallas pequeñas.
- `secondaryBtn` y `dangerBtn` son visualmente similares con bordes — poca diferenciación.
- Metadata usa `S.muted` (texto terciario) — legible pero puede confundirse entre "prioridad · categoría · persona" en una sola línea.
- "Requiere verificacion" / "No requiere verificacion" como texto secundario es redundante cuando el badge ya dice "Por verificar".
- El título de tarea usa `fontWeight: '800'` hardcodeado (no tokenizado) — inconsistente con el sistema.

**Riesgos:**
- Optimistic update de completar tarea: se cambia el status local antes de la respuesta del servidor. Si el servidor responde con un estado diferente, se reemplaza con `resultTask`. Pero si falla el request posterior de `loadTasks()`, se queda con el estado optimista + respuesta anterior.
- `loadTasks` se llama después de cada mutación exitosa, recargando 500 tareas — ineficiente para cambios puntuales.
- El filtro se resetea al cambiar de tab (PlannerScreen re-monta PlannerTasksScreen con nuevo `refreshKey`), perdiendo la selección del usuario.
- `memberNameById` se construye con `members` del contexto — si `members` no está cargado, muestra "Sin asignar" para todas las tareas.

### 4.3 PlannerCalendarScreen

**Vista calendario/eventos:**
- Tres vistas: Día, Semana, Mes (chips horizontales).
- Grid mensual: semanas completas (padding al inicio y final), días con dots para eventos, día seleccionado con terracotta.
- Navegación: botones Anterior/Hoy/Siguiente con cálculo de fecha por vista.
- Lista de items del día seleccionado: eventos y tareas mezclados, agrupados por fecha.

**Estados:**
- Loading: `ActivityIndicator` centrado.
- Error: caja inline con mensaje + retry.
- Empty global (sin eventos en el rango): "Todavía no hay eventos" + CTA "Crear evento".
- Empty por día (día sin items): "No hay eventos para este día."

**Deudas visuales:**
- Grid mensual funcional pero denso. Los dots de eventos son puntos de 5px verde sage — difícil de distinguir si hay varios eventos el mismo día. No hay indicador de cantidad de eventos.
- Las cards de evento/tarea dentro del calendario reutilizan `S.card` pero con `padding: spacing[3]` inconsistente (otras cards usan `spacing[4]`).
- El badge "Evento" / "Tarea" usa el mismo estilo `S.badge` neutro para ambos — sin diferenciación visual.
- Navegación Anterior/Hoy/Siguiente como tres `secondaryBtn` en row ocupan espacio y lucen muy técnicos.
- El label de agenda ("Agenda mensual · 28 jun") es un `subtitle` sutil que pasa desapercibido.
- Días de la semana como iniciales (D, L, M, M, J, V, S) con `fontWeight: '800'` — algo agresivo para un calendario.
- El grid mensual completo se renderiza siempre, incluso en vista Día. No hay optimización de renderizado.

**Riesgos:**
- `loadCalendar` se llama en cada cambio de `selectedDate` o `view`, haciendo un request nuevo. No hay caché local de meses ya cargados.
- `plannerChangedAt` dispara recarga completa, perdiendo el día seleccionado si los datos cambiaron.
- La navegación de meses con `addMonths` puede tener edge cases con meses de 28/29/30/31 días.
- `getItemDateKey` para eventos usa `new Date(item.starts_at)` — si starts_at es inválido, se rompe.

### 4.4 TaskForm

**Crear/editar tarea:**
- Modo embedded (dentro del modal sheet del Planner) o standalone (navegación).
- Templates de responsabilidad: Limpieza, Compras, Mascotas, Medicación, Estudios, Pagos, Otro.
- Asignación de responsable: chips con "Sin asignar", "Yo", y miembros del hogar.
- Quick dates: Hoy, Mañana, Esta semana, Sin fecha, Elegir fecha.
- Prioridad: Baja, Normal, Alta (critical no se expone en el form, se degrada a "Alta").
- Toggle "Requiere verificación" con helper text condicional.
- "Más opciones" colapsable: descripción, fecha exacta, hora, categoría libre.
- Submit con validación: título obligatorio, sesión activa, authLoading/loading/saving checks.

**Validaciones:**
- Título vacío → Alert "El titulo es obligatorio."
- Sin accessToken → Alert con mensaje humano.
- authLoading/loading true → Alert informativo de espera.
- `isFormReadyForSubmit` controla el disabled del botón submit.

**UX actual:**
- `extraScrollHeight={24}` en `KeyboardAwareScrollView` — puede ser insuficiente en dispositivos pequeños.
- Submit cierra el modal vía `onSaved` con mensaje toast y trigger de `changed()`.
- Error de submit: muestra `Alert.alert` + setError inline.
- "Cerrar" (secondaryBtn) descarta el form sin confirmación.
- Labels usan `textTransform: 'uppercase'` con `fontSize: 12, fontWeight: '700'` — tono muy técnico.

**Deudas visuales:**
- Chips de templates/responsables/quick dates/prioridad son funcionales pero genéricos — todos usan el mismo `S.chip`/`S.chipActive` sin diferenciación semántica.
- Inputs usan `S.input` genérico — sin focus state animado, sin iconos, sin helper text inline.
- El toggle "Requiere verificación" está dentro de una `S.card` con texto explicativo — ocupa demasiado espacio vertical.
- El botón "Más opciones" / "Ocultar opciones" es un `secondaryBtn` que rompe el flujo del form.
- "Guardar cambios" / "Crear tarea" usa `S.primaryBtn` sin loading indicator integrado — solo cambia texto a "Guardando..." y `opacity: 0.6`.
- Sin success feedback visual antes de cerrar — solo el toast en el PlannerScreen padre.

**Riesgos:**
- `listPlannerTasks` se usa para cargar una tarea en modo edit (500 tasks) en lugar de un endpoint GET by ID. Ineficiente.
- `templateKey === 'other'` maneja "Otro" como caso especial con `OTHER_PLANNER_TEMPLATE` importado — frágil si cambian los templates.
- Navegación post-submit standalone: `navigation.navigate('PlannerHome', { refreshKey: Date.now() })` — asume que la ruta se llama 'PlannerHome'.

### 4.5 EventForm

**Crear/editar evento:**
- Modo embedded o standalone (igual que TaskForm).
- Edición de ocurrencia recurrente: toggle "Solo este evento" vs "Toda la serie".
- Campos: título, descripción, fecha, todo el día (toggle), hora inicio/fin, ubicación, recurrencia (No repetir/Diaria/Semanal/Mensual).
- Submit + cancelar evento en modo edit.

**Validaciones:**
- Título obligatorio.
- Hora fin no puede ser anterior al inicio.
- Edición de recurrencia requiere `baseEventId` y `occurrenceStartsAt`.
- `isFormReadyForSubmit` con lógica compleja para casos de recurrencia.

**UX actual:**
- `extraScrollHeight={24}` — misma limitación que TaskForm.
- El toggle "Todo el día" está dentro de una card — ocupa espacio vertical fijo.
- Campos de inicio/fin condicionales (si no es all-day) causan re-layout.
- "Cancelar evento" usa `dangerBtn` — correcto, con `Alert.alert` de confirmación.
- Submit standalone navega a PlannerHome con `initialTab: 'calendar'`.

**Deudas visuales:**
- Mismas deudas que TaskForm en chips, inputs, labels, botones.
- La sección "Alcance de la edición" (ocurrencia vs serie) usa chips dentro de una card — visualmente densa.
- Campos de hora sin picker nativo o validación de formato (texto libre "HH:mm").
- Sin indicador visual de si los cambios afectan solo una ocurrencia o toda la serie después del toggle.

**Riesgos:**
- `listPlannerEvents` con rango fijo (2020-2100) para cargar un evento en modo edit — extremadamente ineficiente.
- `createEventOccurrenceOverride` en modo ocurrencia podría fallar si el backend no devuelve el evento con el formato esperado.
- `splitIso` usa `toLocaleTimeString` con locale hardcodeado `es-AR` — frágil si cambia el locale del dispositivo.

### 4.6 plannerShared

**Helpers:**
- `priorityLabels`, `statusLabels`, `recurrenceLabels` — records de string para UI.
- `dateToYMD`, `addDays`, `addMonths` — utilidades de fecha puras, sin dependencias externas.
- `buildLocalIso` — construye ISO desde YMD + HH:mm.
- `formatDate`, `formatTime` — formateo con `es-AR` hardcodeado.

**Estilos compartidos:**
- `plannerStyles` como `StyleSheet.create` con ~330 líneas de estilos.
- Cubre: safe area, scroll, content, headers, titles, chips, cards, inputs, buttons (primary/secondary/danger), badges, checkbox, error box, empty box, toast, sheet (backdrop/panel/handle), month grid, month days, event dots.
- Usa tokens del theme (`colors`, `radius`, `shadows`, `spacing`) consistentemente.
- Algunos estilos tienen valores hardcodeados (ej. `fontWeight: '800'` en lugar de usar la escala tipográfica del sistema).
- `tabPill` y `tabPillActive` definidos pero no usados en ningún componente actual del Planner (posiblemente legacy).

**Posibles mejoras:**
- Extraer estilos de texto a tokens del theme en lugar de valores hardcodeados.
- Separar estilos por dominio (tasks, calendar, forms) si el archivo crece más.
- Agregar `DatePicker` helper para inputs de fecha/hora (actualmente son texto libre).
- `tabPill` no se usa — se puede limpiar.

### 4.7 HomePlannerSections

**Qué muestra:**
- BriefingCard: resumen en lenguaje natural del estado del hogar (tareas por verificar, vencidas, hoy, eventos próximos, o "tranquilo"). Con CTA "Chatear con Geni".
- AlertCard: si hay tareas vencidas o por verificar, card warning con "Atención requerida".
- Tareas del hogar: card con título + "Ver tareas" → navega a Planner tab tasks. Lista inline de hasta 3 tareas priorizadas (awaiting_verification → overdue → today → mine → future).
- Próximos eventos: card con título + "Ver calendario" → navega a Planner tab calendar. Lista inline de hasta 3 eventos.

**Qué consume real:**
- `getPlannerSummary`, `listPlannerTasks`, `listPlannerEvents` — datos reales del backend.
- `useHomePlannerData()` hook que maneja loading/error/refresh.
- `useFocusEffect` para refresh al volver al Home.
- `plannerChangedAt` para refresh reactivo.

**Si tiene label demo/confuso:**
- **SÍ.** `BriefingCard` línea 96: `<AppText variant="caption" tone="tertiary" style={styles.demoLabel}>Resumen automático · demo</AppText>`. Los datos del briefing son reales (vienen de `getPlannerSummary`). La etiqueta "demo" es incorrecta y confunde al usuario.
- El título del briefing dice "Geni · resumen del hogar" — "Geni" no está explicado en este contexto. Podría ser confuso para nuevos usuarios.

**Si debe tocarse en UIX-006 o dejarse para Home:**
- **Tocarse en UIX-006**: La etiqueta "demo" debe removerse porque los datos son reales y viene de Planner. Es una deuda visual de Planner que afecta al Home.
- **Dejarse para Home (UIX-005)**: El polish profundo del BriefingCard (CTA "Chatear con Geni" sin funcionalidad, diseño visual, animaciones) corresponde a UIX-005.

---

## 5. Problemas visuales detectados

### Cards demasiado planas
- `S.card` tiene `borderWidth: 1`, `borderColor: colors.border.subtle`, `shadows.card` — correcto pero insuficiente para transmitir jerarquía premium. Las cards de tarea, evento y stats lucen todas iguales.

### Jerarquía débil
- Los stats (Pendientes, Hoy, Vencidas, Por verificar) tienen el mismo peso visual que las cards de tareas. No hay diferenciación clara entre "resumen" y "detalle".
- El título "Planner" y el título "Tareas" tienen pesos visuales distintos sin relación clara.

### Colores inconsistentes
- El badge de estado usa `sand[50]` para todos los estados. "Vencida" usa `badgeDanger` (warning.soft) como excepción, pero "Completada", "Verificada", "Cancelada" comparten el mismo badge neutro.
- El verde de éxito (`sage[500]`) se usa en la barra de progreso de Goals (demo) pero no en badges de tareas completadas.

### Botones repetidos
- PlannerScreen tiene botón "Actualizar" + pull-to-refresh — redundante.
- PlannerTasksScreen y PlannerCalendarScreen cada uno tiene su propio botón "Nueva tarea" / "Nuevo evento" en el header de sección, además del acceso desde HomePlannerSections.

### Inputs no premium
- `S.input` es genérico: borde gris, sin focus state, sin iconos, sin validación inline visual. Labels en uppercase `fontSize: 12` lucen técnicos, no cálidos.
- Campos de fecha/hora como texto libre en lugar de pickers nativos.

### Spacing irregular
- Cards de evento en calendario usan `padding: spacing[3]` mientras que cards de tarea usan `spacing[4]`.
- `marginBottom` varía entre `spacing[2]` y `spacing[4]` sin patrón consistente.

### Etiquetas técnicas
- "Requiere verificacion" / "No requiere verificacion" como texto en cada card de tarea.
- Labels en forms con `textTransform: 'uppercase'` y tono terciario — parecen labels de formulario administrativo.
- "YYYY-MM-DD", "HH:mm" como placeholders — exponen formato técnico al usuario.

### Estados vacíos pobres
- PlannerCalendarScreen día vacío: solo texto "No hay eventos para este día." — sin icono, sin CTA, sin sugerencia.

### Errores técnicos
- Mensajes de error pueden incluir texto del backend si `ApiError.message` no fue traducido. Aunque hay fallback "No pudimos cargar...", el `err.message` directo puede exponer texto técnico.

### Skeleton/refresh agresivo
- PlannerScreen usa `Skeleton variant="screenSection"` para el loading inicial, pero no preserva datos previos (no hay caché).
- `useFocusEffect` dispara refresh al volver a la tab, causando re-montaje de hijos con nuevo `refreshKey`.

### Scroll raro
- Filtros de tareas y vistas de calendario en `ScrollView horizontal` — si hay 8 filtros, puede cortarse en pantallas pequeñas.
- El scroll horizontal de stats en PlannerScreen tiene `minWidth: 84` por card — con 4 stats puede no caber en pantalla.

### Badges confusos
- Badge "Evento" y "Tarea" en calendario usan el mismo estilo neutro.
- Badge "En seguimiento" en Goals (demo) sin contexto de qué significa.

### Calendario difícil de leer
- Dots de eventos de 5px son muy pequeños para distinguir si hay múltiples eventos.
- Grid mensual con `aspectRatio: 1` en cada día — en pantallas pequeñas los números son muy chicos.
- Iniciales de días (D, L, M, M, J, V, S) — la M repetida (martes/miércoles) es confusa.

### Tareas sin prioridad visual
- `priorityLabels` se muestra como texto en metadata, pero no afecta el color de la card, borde, o badge.
- Tareas "critical" no se exponen en el form pero existen en el tipo — se degradan a "high" sin advertencia.

### CTA principal poco claro
- En PlannerScreen, la acción principal es... ¿crear tarea? ¿crear evento? ¿cambiar de tab? No hay un FAB o CTA único claro. La creación está delegada a cada subpantalla.

---

## 6. Problemas funcionales/UX detectados

### Refresh que resetea estado
- `useFocusEffect` en PlannerScreen incrementa `refreshKey`, forzando re-mount de hijos. Esto resetea el filtro seleccionado en PlannerTasksScreen (vuelve a 'open') y el día seleccionado en PlannerCalendarScreen (vuelve a hoy).

### Skeleton al volver a tab con datos
- PlannerScreen no mantiene el summary previo durante refresh. Si `loadSummary(true)` tarda, el usuario ve el estado anterior + indicador sutil, pero si el componente se re-monta, vuelve a mostrar skeleton.

### Filtros que se pierden
- Cambiar de tab (tasks → calendar → tasks) resetea el filtro a 'open'. El usuario pierde su selección.

### Errores 304/respuesta vacía
- No se detectó manejo explícito de 304 o respuestas vacías en el código actual. Si el backend devuelve 304, `requestJson` podría fallar o devolver null.

### Completar tarea sin feedback
- Completar tarea en PlannerTasksScreen hace optimistic update pero no muestra feedback visual (sin animación de check, sin haptic, sin toast). Solo cambia el badge y el checkbox.

### Formularios sin success claro
- TaskForm y EventForm: al hacer submit exitoso, llaman `onSaved(message)` que muestra un toast en PlannerScreen. Pero durante el submit solo se ve "Guardando..." en el botón con `opacity: 0.6`. Sin animación de confirmación antes de cerrar.

### Eventos sin jerarquía
- En el calendario, eventos y tareas se mezclan sin diferenciación visual fuerte (solo el badge "Evento" / "Tarea"). Un evento familiar importante (ej. cumpleaños) tiene el mismo peso que una tarea de limpieza.

### Botones destructivos sin confirmación
- "Cancelar" tarea en PlannerTasksScreen: **sí tiene confirmación** (Alert con "Volver" / "Cancelar tarea").
- "Cancelar evento" en PlannerCalendarScreen: **sí tiene confirmación**.
- "Cancelar evento" en EventForm: **sí tiene confirmación**.
- "Cerrar" en TaskForm/EventForm: **no tiene confirmación** — descarta el formulario sin preguntar si hay cambios.

### Estados disabled confusos
- Checkbox disabled en tareas no pendientes: sin explicación de por qué no se puede clickear.
- Botón submit disabled en forms: por `!isFormReadyForSubmit` pero el usuario puede no entender qué falta (el botón solo muestra `opacity: 0.6`).
- "Completar" disabled durante saving: correcto, con `opacity: 0.6`, pero sin texto "Guardando..." en el botón secundario (solo en el primario).

---

## 7. Dirección visual Planner Premium

### Cómo debe sentirse
- **Familiar:** tono cálido, lenguaje doméstico ("conviene hacerlo", "queda pendiente", "lista").
- **Claro:** una acción principal por pantalla, jerarquía visual inmediata.
- **Activo:** las tareas del día deben destacar, lo vencido debe alertar sin alarmar.
- **Liviano:** densidad media, más aire que Todoist, menos vacío que apps de wellness.
- **Cálido:** paleta terracotta/sand/sage con acentos suaves, no rojos agresivos ni verdes corporativos.
- **Organizado:** secciones claras (tareas pendientes → hoy → futuro, eventos → próximos → calendario).
- **Con ritmo diario:** "Hoy" como concepto central, no como un filtro más.

### No debe sentirse
- **Jira/Trello corporativo:** sin columnas Kanban, sin sprints, sin "backlog", sin "in progress" frío.
- **App bancaria:** sin tablas, sin grises fríos, sin densidad extrema.
- **App infantil:** sin colores saturados, sin iconos cartoon, sin gamificación forzada.
- **Formulario administrativo:** labels cálidos, no uppercase genérico.
- **Calendario seco:** eventos con contexto familiar, no solo fecha y hora.

---

## 8. Componentes y patrones sugeridos

### Componentes nuevos propuestos (no implementar todavía)

| Componente | Propósito |
|---|---|
| `PlannerHeader` | Header unificado con título, subtítulo, y CTA principal (FAB o botón prominente). |
| `TaskCard` premium | Card de tarea con jerarquía visual por prioridad, animación de completado, badge semántico. |
| `EventCard` premium | Card de evento con diferenciación clara de tareas, chip de "Hoy"/"Mañana", ubicación con icono. |
| `DaySummaryCard` | Resumen del día: "3 tareas pendientes, 1 evento hoy". |
| `QuickFilterChips` | Chips de filtro con animación de toggle, indicador de cantidad por filtro. |
| `EmptyState` humano | Ya existe en `components/ui`. PlannerTasksScreen tiene uno inline — migrar a usar el componente compartido. |
| `ErrorState` recuperable | Ya existe en `components/ui`. PlannerScreen lo usa, PlannerTasksScreen y PlannerCalendarScreen no. |
| `FormSection` | Agrupa campos relacionados con título humano (no uppercase). |
| `FormField` | Input con label, icono opcional, error inline, focus state animado. |
| `PrimaryCTA` sticky/claro | Botón flotante o sticky para "Nueva tarea" / "Nuevo evento" accesible desde cualquier scroll. |
| `Badge` de prioridad/estado | Badges semánticos: pendiente (sand), vencida (coral suave), completada (sage), cancelada (neutral). |
| `FeedbackInline` | Mensaje de éxito/error que aparece y desaparece con animación. |

### Patrones a adoptar
- **Card press feedback:** scale 0.985 (según UIX-003).
- **FadeIn + translateY 8px** para cards en lista.
- **Success pulse** al completar/crear tarea (1 → 1.03 → 1).
- **Haptic wrapper** seguro que degrade sin `expo-haptics`.
- **Mantener datos previos** al volver a tabs (regla §14 de UIX-003).

---

## 9. Motion y feedback aplicables desde UIX-003

Referencia completa: `ui_motion_feedback_system.md`.

### Aplicable a Planner

| Elemento | Motion | Duración | Notas |
|---|---|---|---|
| Task card checkbox toggle | scale 1 → 0.92 → 1 + color | 140ms | Completar/descompletar |
| Task card enter en lista | fadeIn + translateY 8→0 | 180ms | Primeras 5 visibles |
| Event card enter en lista | fadeIn + translateY 8→0 | 180ms | Primeras 5 visibles |
| Chip/filtro toggle | backgroundColor + borderColor interpolation | 140ms | No animar scroll |
| Form error inline | fadeIn | 140ms | Sin translateY |
| Success feedback (crear tarea/evento) | success pulse + toast fadeIn | 240ms | Antes de cerrar modal |
| Modal sheet open | translateY 16→0 (nativo) | 180ms | animationType slide ya lo hace |
| Calendar day press | scale 0.96→1 | 140ms | Sutil |
| Calendar month transition | fadeIn opcional | 240ms | Si es muy pesado, sin animación |
| Botón "Actualizar" | — | — | No animar (se recomienda eliminar) |

### Haptics (solo si wrapper seguro degradable)

| Acción | Tipo |
|---|---|
| Completar tarea | `light` |
| Verificar tarea | `notificationSuccess` |
| Crear tarea/evento | `medium` |
| Error de formulario | `notificationError` |
| Cancelar tarea/evento | `warning` |

### No aplicar
- No animar durante escritura en formularios.
- No animar scroll horizontal de filtros.
- No skeleton si ya hay datos previos.
- No animar errores con translateY (solo fadeIn).
- No loops ni animaciones largas (>320ms).

---

## 10. Plan de implementación propuesto

### Fase A — Planner shell y navegación visual
**Archivos:** `PlannerScreen.tsx`, `plannerShared.ts`

- Remover botón "Actualizar" redundante (pull-to-refresh ya existe).
- Rediseñar topbar tabs con estilo premium (pill suave, transición de color animada).
- Mejorar stats cards: jerarquía por tipo (pendientes=neutral, hoy=acento, vencidas=warning, por verificar=info).
- Separar Goals en su propio componente condicional con badge "Próximamente" claro.
- Implementar `motionFadeIn` en transiciones entre tabs.
- Agregar `Animated.Value` para fade del contenido al cambiar de tab.
- Implementar regla §14: mantener summary previo durante refresh silencioso.

### Fase B — Task list premium
**Archivos:** `PlannerTasksScreen.tsx`, `plannerShared.ts`, `components/ui/` (nuevo TaskCard si aplica)

- Crear `TaskCard` premium con:
  - Badge semántico por estado (pending=sand, completed=sage, cancelled=neutral, overdue=coral).
  - Prioridad visual: borde izquierdo de color según prioridad.
  - Checkbox con animación de toggle (scale 0.92→1).
  - Metadata en jerarquía clara (persona asignada + fecha, no mezclado con prioridad).
- Mejorar filtros: chips con conteo de tareas por filtro, mantener estado al cambiar de tab.
- Reemplazar `ActivityIndicator` de loading por `Skeleton variant="listItem"`.
- Usar `ErrorState` component en lugar de error inline genérico.
- Usar `EmptyState` component compartido en lugar de empty inline.
- Reducir botones de acción: "Editar" y "Cancelar" en menú secundario (long press o swipe), dejar solo la acción principal visible (Completar/Verificar).
- Agregar animation de completado: success pulse en la card.

### Fase C — TaskForm premium
**Archivos:** `TaskForm.tsx`, `plannerShared.ts`

- Rediseñar labels: sin uppercase, tono más cálido ("Responsabilidad" → "¿Qué hay que hacer?").
- Mejorar inputs: focus state animado, icono a la izquierda, placeholder más natural.
- Reemplazar "Más opciones" colapsable por diseño expandido con mejor jerarquía.
- `extraScrollHeight` de 24 a 48.
- Success feedback visual antes de cerrar: pulse en botón submit + mensaje inline.
- Toggle "Requiere verificación" más compacto, con helper text debajo.
- Agregar chip de prioridad con color semántico (baja=verde, normal=sand, alta=coral).
- Placeholder de fecha: "ej. 2025-04-15" → calendario nativo o texto más amigable.

### Fase D — Calendar/Event list premium
**Archivos:** `PlannerCalendarScreen.tsx`, `plannerShared.ts`

- Crear `EventCard` premium con diferenciación visual clara de `TaskCard`.
- Mejorar grid mensual: dots de eventos como barras de colores (más visibles), número de eventos por día.
- Navegación de fechas con header más prominente (mes actual grande, flechas laterales).
- Badges semánticos para tipo de item en calendario (evento=terracotta, tarea=sage).
- Vista "Hoy" como prioridad: si hay eventos/tareas hoy, destacar en la lista.
- Agregar day press animation (scale 0.96→1).
- Usar `Skeleton variant="screenSection"` para loading en lugar de `ActivityIndicator`.
- Empty state con ilustración o icono, no solo texto.

### Fase E — EventForm premium
**Archivos:** `EventForm.tsx`, `plannerShared.ts`

- Rediseñar labels igual que TaskForm.
- Mejorar inputs igual que TaskForm.
- Toggle "Todo el día" más compacto.
- Campos de hora con picker visual (sugerencia: wheel o inline).
- Sección "Alcance de la edición" más clara visualmente (card con borde resaltado para el scope activo).
- `extraScrollHeight` de 24 a 48.
- Success feedback visual antes de cerrar.

### Fase F — Feedback/motion/haptics
**Archivos:** Nuevos o modificados en `utils/`, `components/`, pantallas Planner

- Crear `utils/animation.ts` con helpers: `fadeIn`, `slideUp`, `scalePress`, `pulseSuccess`.
- Crear `utils/haptics.ts` con `safeHaptic()` wrapper que degrade sin `expo-haptics`.
- Aplicar card press 0.985 en todas las cards interactivas.
- Aplicar fadeIn + translateY 8→0 en listas de tareas/eventos (primeras 5 cards).
- Aplicar success pulse al crear/completar/verificar tareas.
- Aplicar haptics ligeros en acciones significativas.

### Fase G — QA y typecheck
- Ejecutar `npx.cmd tsc --noEmit` desde `front/mi-front-limpio`.
- Revisar que los 8 filtros de PlannerTasksScreen funcionan correctamente.
- Revisar que completar/verificar/cancelar tarea siguen funcionando.
- Revisar que crear/editar evento con recurrencia sigue funcionando.
- Revisar que el modal sheet de PlannerScreen abre y cierra correctamente.
- Revisar que HomePlannerSections sigue mostrando datos reales sin etiqueta "demo".
- Revisar que no hay regresiones en navegación Planner → Home → Planner.
- `git status --short` para verificar solo archivos esperados modificados.

---

## 11. Archivos que probablemente se tocarán después

### Seguros de tocar
- `screens/planner/PlannerScreen.tsx` — shell, topbar, stats, toast, modal sheet.
- `screens/planner/PlannerTasksScreen.tsx` — lista de tareas, filtros, estados.
- `screens/planner/PlannerCalendarScreen.tsx` — calendario, eventos, grid.
- `screens/planner/TaskForm.tsx` — formulario de tarea.
- `screens/planner/EventForm.tsx` — formulario de evento.
- `screens/planner/plannerShared.ts` — estilos compartidos.

### Tocar con cuidado
- `screens/home/HomePlannerSections.tsx` — solo para remover etiqueta "demo". No hacer polish profundo (eso es UIX-005).
- `components/ui/` — solo si se crea un nuevo `TaskCard` o `EventCard` como componente compartido. No modificar componentes existentes salvo adiciones compatibles.
- `utils/animation.ts` — archivo nuevo, no afecta código existente.
- `utils/haptics.ts` — archivo nuevo, no afecta código existente.
- `constants/theme.ts` — solo lectura, no modificar.

### No tocar
- `services/plannerSummary.ts` — solo lectura de tipos.
- `services/plannerTasks.ts` — solo lectura de tipos.
- `services/plannerEvents.ts` — solo lectura de tipos.
- `services/plannerCalendar.ts` — solo lectura de tipos.
- `services/plannerTemplates.ts` — solo lectura.
- `services/api.ts` — no tocar.
- `context/AuthContext.ts` — no tocar.
- `context/HouseholdContext.ts` — no tocar.
- `context/AppRefreshContext.ts` — no tocar.
- `navigation/` — no tocar rutas.
- `backend/` — no tocar.
- `package.json` / `package-lock.json` — no tocar.
- Supabase / RLS / endpoints — no tocar.

---

## 12. Riesgos

### Riesgos técnicos
1. **Planner maneja datos reales de producción.** Cualquier error visual que afecte la mutación de tareas/eventos impacta directamente a los usuarios.
2. **Sincronización entre usuarios.** Completar/verificar tareas modifica el estado visible para todos los miembros. Una UI que muestre información desactualizada por cache local puede generar confusión.
3. **Endpoints del backend.** No modificar servicios ni lógica de negocio. Si un cambio visual requiere un campo que no existe en la respuesta actual, no se puede agregar sin tocar backend.
4. **Formularios con validaciones conectadas.** TaskForm y EventForm tienen lógica compleja (recurrencia, overrides, optimistic updates). Cualquier refactor visual debe preservar toda la lógica de submit/error/success.
5. **HomePlannerSections depende de Planner real.** Si se cambian tipos o firmas en Planner, HomePlannerSections puede romperse.
6. **Extra scroll height.** `extraScrollHeight={24}` bajo en ambos forms. Aumentarlo a 48 mitiga pero no elimina el riesgo de que el teclado tape inputs en dispositivos pequeños.
7. **Navegación anidada.** PlannerScreen recibe params de navegación complejos (`initialTab`, `initialSheet`, `sheetKey`, `refreshKey`) desde HomePlannerSections. Cambios en la firma pueden romper la navegación bidireccional.

### Riesgos de UX
8. **Goals bloqueado por PLAN-002.** No se puede hacer premium de una sección 100% mock. Cualquier cambio visual en Goals es decorativo sin valor real.
9. **Filtros que se pierden al cambiar de tab.** Es un problema funcional existente que empeora con más polish visual (el usuario invierte más atención en la UI y nota más la pérdida de estado).
10. **Sobrecarga de animaciones.** Si se animan todas las cards, filtros, badges y transiciones, puede sentirse pesado. Seguir regla UIX-003: no animar más de 5 cards simultáneas.

---

## 13. Criterios de aceptación UIX-006

Al finalizar UIX-006, Planner debe cumplir:

- [ ] Tareas se ven premium (TaskCard con jerarquía por prioridad y estado, badge semántico, animación de completado).
- [ ] Eventos se ven premium (EventCard con diferenciación visual de tareas, chip de fecha relativa).
- [ ] Crear tarea sigue funcionando (form → submit → toast → lista actualizada).
- [ ] Editar tarea sigue funcionando (form pre-llenado → submit → toast → lista actualizada).
- [ ] Crear evento sigue funcionando (form → submit → toast → calendario actualizado).
- [ ] Editar evento sigue funcionando, incluyendo ocurrencias recurrentes (scope toggle → submit → calendario actualizado).
- [ ] Completar tarea sigue funcionando (checkbox toggle → optimistic update → badge actualizado).
- [ ] Verificar tarea sigue funcionando (botón Verificar → API call → badge actualizado).
- [ ] Cancelar tarea/evento sigue funcionando (confirmación → API call → removido de lista).
- [ ] Loading state usa Skeleton (no ActivityIndicator suelto).
- [ ] Error state usa ErrorState component compartido, con retry.
- [ ] Empty state usa EmptyState component compartido, con CTA clara.
- [ ] No se pierden datos al volver de tab (contenido previo visible, refresh silencioso).
- [ ] No se muestra skeleton grande si ya había datos (regla §14 de UIX-003).
- [ ] No hay labels "demo" incorrectos en datos reales (BriefingCard en HomePlannerSections).
- [ ] Topbar tabs premium con animación de transición.
- [ ] Stats cards con jerarquía visual por tipo.
- [ ] Cards con press feedback (scale 0.985).
- [ ] Cards en lista con fadeIn + translateY 8→0 (primeras 5).
- [ ] Checkbox con animación de toggle (scale 0.92→1).
- [ ] Form inputs con focus state animado.
- [ ] Form labels cálidos (sin uppercase genérico, sin tono administrativo).
- [ ] Success feedback visual al crear/editar/completar/verificar.
- [ ] Sin regresiones en navegación Planner ↔ Home.
- [ ] `npx.cmd tsc --noEmit` pasa sin errores nuevos.

---

## 14. Verificación final de esta etapa

```powershell
git status --short docs/professionalization/uix_006_planner_premium_audit.md
```

**Esperado:**
```
?? docs/professionalization/uix_006_planner_premium_audit.md
```

---

## Reporte final

### 1. Documento creado
`docs/professionalization/uix_006_planner_premium_audit.md`

### 2. Hallazgos principales
- Planner Tasks y Calendar usan **100% datos reales** con loading/empty/error states completos y funcionales.
- Planner **Goals es 100% mock/demo** (bloqueado por PLAN-002). No debe recibir polish.
- **Deudas visuales transversales:** cards planas, badges sin semántica de color, inputs sin focus state, labels en uppercase técnico, botones redundantes ("Actualizar" + pull-to-refresh), filtros que se pierden al cambiar de tab.
- **HomePlannerSections** tiene etiqueta "demo" incorrecta en BriefingCard (datos reales). Debe corregirse en UIX-006.
- **extraScrollHeight={24}** bajo en ambos formularios — riesgo de teclado sobre input en pantallas pequeñas.
- PlannerTasksScreen y PlannerCalendarScreen **no usan los componentes UI compartidos** (ErrorState, EmptyState, Skeleton) — usan estilos inline de `plannerShared`.
- Falta **feedback visual** en completar tarea, verificar tarea, crear tarea/evento, y transiciones entre tabs.

### 3. Riesgos principales
- Planner maneja datos reales — no romper mutaciones.
- Formularios con lógica compleja de recurrencia/overrides — no romper flujo de submit.
- HomePlannerSections acoplado a Planner real — cambios de tipos/firmas pueden romper Home.
- Goals bloqueado por PLAN-002 — solo se puede decorar, no implementar.

### 4. Fases propuestas
A (Shell y navegación) → B (Task list) → C (TaskForm) → D (Calendar/Events) → E (EventForm) → F (Motion/Haptics) → G (QA/Typecheck)

### 5. Confirmación de no tocar código funcional
No se modificó ningún archivo de código. Solo se creó este documento de auditoría.

### 6. Resultado de git status
Ver salida del comando ejecutado abajo.

---

*Documento generado como parte de UIX-006 Etapa 1 — Auditoría del estado real del Planner.*  
*HomePlus — Fase 1: Core UI/UX Final Premium*