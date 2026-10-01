# HomePlus — UIX-003 Motion & Feedback System

## 1. Objetivo

Este documento define el **sistema transversal de motion, haptics, feedback y estados** para HomePlus, como parte de **UIX-003 — Motion, haptics, feedback y estados** dentro de la **Fase 1: Core UI/UX Final Premium**.

Basado en la auditoría de Etapa 1 (`ui_motion_feedback_audit.md`) y las referencias de UIX-002 (`ui_research_references.md`), este sistema establece reglas obligatorias para todo el polish visual de HomePlus. Sirve como especificación técnica única para:
- **UIX-004** — Auth premium cálido
- **UIX-006** — Planner premium
- **UIX-007** — Household/Members/Profile premium
- **UIX-005** — Home Premium (más adelante)

## 2. Principios generales

1. **Movimiento cálido, suave y funcional.** Toda animación debe tener un propósito claro: guiar, confirmar o contextualizar.
2. **Feedback inmediato pero no invasivo.** El usuario debe saber qué pasó sin interrupciones.
3. **Haptics como apoyo, no como ruido.** Solo en acciones significativas, nunca repetitivo.
4. **No animar por decorar.** Si una animación no mejora la comprensión o la sensación de calidad, no va.
5. **No tapar datos reales con skeletons innecesarios.** Si ya hay datos, mostrarlos. No reemplazarlos con skeletons.
6. **Accesibilidad y reducción de movimiento.** Todas las animaciones deben ser cortas y potencialmente desactivables.
7. **Consistencia entre módulos.** El mismo gesto debe sentirse igual en Auth, Planner, Household y Home.

## 3. Dependencias y alcance técnico

### Base actual
- **Animated nativo:** ✅ Disponible y en uso (HomeTabNavigator). Es la base para todo el sistema.
- **LayoutAnimation:** ⚠️ Disponible pero no usado. Se puede usar para animaciones de layout simples.

### No disponible (y no se instala sin aprobación)
- **react-native-reanimated:** ❌ No instalado. No usar en Phase 1.
- **moti:** ❌ No instalado. No usar en Phase 1.
- **lottie:** ❌ No instalado. No usar en Phase 1.
- **expo-haptics:** ❌ No instalado. Solo agregar con aprobación explícita.
- **expo-av:** ❌ No instalado. No usar sonidos.

### Reglas de alcance
- Todas las animaciones deben implementarse con `Animated` nativo de react-native.
- No agregar dependencias sin aprobación explícita.
- No usar sonidos por default.
- No agregar toast library por ahora.
- Si se necesita feedback, usar componentes existentes (`EmptyState`, `ErrorState`, `AppButton`) o patrones locales.

## 4. Motion tokens

### Duración
| Token | Valor | Uso |
|-------|-------|-----|
| instant | 80ms | Press feedback mínimo, toggle |
| fast | 140ms | Botón, chip, checkbox |
| standard | 180ms | Card enter, tab change, modal |
| soft | 240ms | Section enter, success pulse |
| slow | 320ms | Máximo permitido. Transiciones de pantalla completas |

### Escala
| Token | Valor | Uso |
|-------|-------|-----|
| press-subtle | 0.98 | Botones |
| press-card | 0.985 | Cards completas |
| modal-enter | 0.96 → 1 | Modal / bottom sheet |
| success-pulse | 1 → 1.03 → 1 | Confirmación de acción exitosa |

### Desplazamiento (`translateY`)
| Token | Valor | Uso |
|-------|-------|-----|
| card-enter | 8px | Cards que aparecen en lista |
| modal-enter | 16px | Modal / bottom sheet |
| section-enter | 12px | Secciones nuevas en pantalla |
| error-shake | 4px | Solo si se aprueba explícitamente |

### Easing
| Contexto | Easing |
|----------|--------|
| Entrada (fadeIn, translateY 0) | `easeOut` |
| Salida (fadeOut, translateY up) | `easeIn` |
| Cambio de estado (scale, color) | `easeInOut` |
| Rebotes | ❌ Evitar. Si es inevitable, damping > 0.85 |

## 5. Reglas de motion por componente

### Buttons
- **Cuándo animar:** Press (scale a 0.98). Loading state (transición a ActivityIndicator).
- **Duración:** 80ms (press), 140ms (loading transition).
- **Tipo:** Scale down en press, fade a ActivityIndicator en loading.
- **Cuándo NO animar:** Si ya está disabled, si es un botón inline pequeño sin acción principal.

### Cards
- **Cuándo animar:** Primer render en lista (fadeIn + translateY 8px → 0).
- **Duración:** 180ms.
- **Tipo:** Opacity 0 → 1, translateY 8 → 0.
- **Cuándo NO animar:** Si la lista ya tiene datos y solo se actualiza un valor interno. Si son más de 10 cards (animar solo las primeras 5 visibles, el resto estático).

### Chips / Filtros
- **Cuándo animar:** Cambio de estado activo/inactivo.
- **Duración:** 140ms.
- **Tipo:** Background color + border color con interpolación.
- **Cuándo NO animar:** Scroll horizontal de chips. El propio scroll ya es feedback suficiente.

### Tabs (Bottom Tab Navigator)
- **Cuándo animar:** Cambio de foco en icono de tab.
- **Duración:** 140ms.
- **Tipo:** Scale 1 → 1.06 en icono activo (ya implementado en HomeTabNavigator).
- **Cuándo NO animar:** Tab press que no cambia de pantalla.

### Modals / Bottom Sheets
- **Cuándo animar:** Apertura y cierre.
- **Duración:** 180ms (apertura), 160ms (cierre).
- **Tipo:** Fade in overlay + translateY 16 → 0 sheet (ya implementado en QuickAdd).
- **Cuándo NO animar:** Si el modal ya está abierto y solo cambia contenido interno.

### Forms
- **Cuándo animar:** Focus en input (border color). Error inline aparece con fadeIn.
- **Duración:** 140ms.
- **Tipo:** Border color interpolation, fadeIn para error.
- **Cuándo NO animar:** Mientras el usuario escribe. El teclado ya tiene su propia animación.

### Task Checkbox / Complete
- **Cuándo animar:** Toggle de checkbox (pendiente → completada).
- **Duración:** 140ms.
- **Tipo:** Scale 1 → 0.92 → 1 con cambio de color.
- **Cuándo NO animar:** Si la tarea ya está completada y solo se muestra.

### Event Cards
- **Cuándo animar:** Aparición en lista.
- **Duración:** 180ms.
- **Tipo:** FadeIn + translateY 8 → 0.
- **Cuándo NO animar:** Actualización de hora o detalle menor.

### Member Cards
- **Cuándo animar:** Aparición en lista de miembros.
- **Duración:** 180ms.
- **Tipo:** FadeIn + translateY 8 → 0.
- **Cuándo NO animar:** Cambio de rol o estado que no modifica la posición visual.

### Invite Link Copy
- **Cuándo animar:** Feedback de copiado exitoso.
- **Duración:** 240ms success pulse.
- **Tipo:** Scale 1 → 1.03 → 1 en el icono de copiado.
- **Cuándo NO animar:** Si falla la copia.

### Skeletons
- **Cuándo animar:** Solo en primer load sin datos previos. Aparecen con fadeIn suave.
- **Duración:** 240ms fadeIn, shimmer continuo mientras carga.
- **Tipo:** FadeIn estático (sin shimmer aún, futuro con shimmer animado).
- **Cuándo NO animar:** Si ya hay datos mostrados (mantener datos y refrescar en background).

### Empty States
- **Cuándo animar:** Aparición cuando no hay datos.
- **Duración:** 240ms.
- **Tipo:** FadeIn + translateY 12 → 0.
- **Cuándo NO animar:** Si se pasa de datos a empty (transición directa, sin animación).

### Error States
- **Cuándo animar:** Aparición de error inline o ErrorState.
- **Duración:** 180ms.
- **Tipo:** FadeIn (sin translateY — los errores no "entran suave", aparecen directo pero sin flash).
- **Cuándo NO animar:** Si ya hay un error visible y cambia el mensaje.

## 6. Haptics system

### Estado actual
`expo-haptics` no está instalado. Este sistema es conceptual y se implementará cuando se apruebe la dependencia.

### Regla de degradación
Si `expo-haptics` no está instalado, toda llamada a haptics debe degradar silenciosamente sin romper la app. Usar un wrapper tipo `safeHaptic()` que haga `noop` si no está disponible.

### Mapa de haptics por acción

| Acción | Tipo de haptic | Prioridad | Justificación |
|--------|---------------|-----------|---------------|
| Tap normal | `none` o `light` opcional | Baja | No abrumar |
| Crear tarea/evento | `medium` | Media | Confirmación de creación |
| Completar tarea | `light` | Media | Satisfacción suave |
| Verificar tarea | `notificationSuccess` | Media | Validación completada |
| Error de formulario | `notificationError` | Media | Alerta de error |
| Copiar invite link | `light` | Media | Confirmación de copia |
| Aprobar miembro | `notificationSuccess` | Alta | Acción significativa |
| Rechazar miembro | `warning` | Media | Acción con consecuencias |
| Cambiar tab | `light` opcional | Baja | No obligatorio |
| Abrir QuickAdd | `light` | Baja | Feedback de apertura |
| Cerrar modal | `none` | - | Cierre es suficiente feedback |
| Disabled press | `none` | - | No reforzar acción bloqueada |

### Implementación futura
Cuando se apruebe `expo-haptics`, crear:
```
utils/haptics.ts → safeHaptic(type) → degrade silencioso
```

## 7. Feedback visual system

### Reglas generales
1. **Feedback inmediato de botón:** Loading state en botón reemplaza texto con ActivityIndicator (ya implementado en AppButton).
2. **Success inline breve:** Mensaje cálido que aparece y desaparece sin bloquear el flujo.
3. **Error humano y recuperable:** Nunca mostrar mensajes técnicos (RPC, stack trace, membership_id).
4. **Retry visible:** Siempre ofrecer acción de reintento cuando el error es recuperable.
5. **Disabled con explicación:** Si no es obvio por qué algo está deshabilitado, incluir helper text.
6. **No usar `Alert` nativo como patrón principal:** Solo para acciones destructivas o confirmaciones críticas (cancelar tarea, eliminar, rechazar miembro).
7. **No exponer errores crudos:** Traducir `ApiError` a mensajes humanos siempre.

### Canales de feedback

| Canal | Cuándo usar | Cuándo NO usar |
|-------|-------------|----------------|
| Botón loading | Acciones con espera de red | Acciones instantáneas |
| Mensaje inline | Forms, campos individuales | Errores de sección completa |
| `ErrorState` component | Secciones, pantallas | Forms |
| `EmptyState` component | Listas vacías | Forms |
| Success pulse | Acciones completadas | Errores |
| Haptic | Acciones significativas | Navegación frecuente |
| `Alert` (nativo) | Solo confirmaciones destructivas | Errores recuperables |

## 8. Loading y skeleton rules

### Regla principal
**Mostrar datos reales siempre que existan. El skeleton es último recurso.**

### Reglas específicas

1. **Primer load sin datos previos:** Mostrar skeleton que refleje estructura real.
2. **Refresh con datos previos:** Mantener contenido anterior visible. Refrescar en background. Si los datos cambian, aplicar transición suave.
3. **ActivityIndicator:** Solo para botones (loading state) y acciones locales pequeñas (nunca para pantalla completa o secciones grandes).
4. **Skeleton debe reflejar estructura real:** Usar variant correcta (`paragraph`, `card`, `listItem`, `screenSection`, `avatar`, `line`).
5. **Evitar pantalla completa vacía si ya hay datos:** Si `tasks.length > 0`, nunca volver a mostrar skeleton en refresh.
6. **Duración mínima visible si skeleton aparece:** 180ms (evitar flash de skeleton < 180ms).
7. **No skeleton grande al volver a tabs:** Mantener contenido previo y refrescar en background (ver §14).

### Implementación actual
- `Skeleton.tsx` tiene variants implementadas: `line`, `paragraph`, `card`, `listItem`, `avatar`, `button`, `screenSection`.
- Base estática (sin shimmer). Futuro: agregar shimmer animado con Animated.

## 9. Empty states

### Estructura obligatoria
```
┌──────────────────────┐
│                      │
│   [icono/ilustración]│
│                      │
│   Título humano      │
│   Descripción breve  │
│                      │
│   [Acción principal] │
│   [Acción secundaria]│
│                      │
└──────────────────────┘
```

### Reglas
1. Icono o ilustración suave (color `sand[50]` o `terracotta[50]`), nunca blanco puro ni negro.
2. Título humano: una frase corta que explica la situación.
3. Descripción breve: máximo 2 líneas.
4. Una acción principal clara (botón `primary`).
5. Acción secundaria opcional (botón `ghost`).
6. Usar `EmptyState` component desde `components/ui`.

### Ejemplos por módulo

| Módulo | Título | Descripción | Acción |
|--------|--------|-------------|--------|
| Planner sin tareas | "Acá van a aparecer tus tareas" | "Creá una tarea o asigná una responsabilidad para organizar el hogar." | "Crear tarea" |
| Planner sin eventos | "Todavía no hay eventos" | "Agregá un evento para coordinar con tu familia." | "Crear evento" |
| Household sin miembros | "Tu hogar está vacío" | "Invitá a los miembros de tu familia para empezar." | "Invitar personas" |
| Pending requests vacío | "Sin solicitudes pendientes" | "Cuando alguien quiera unirse, va a aparecer acá." | — |
| Home sin datos reales | "Tu hogar está tranquilo por ahora" | "Creá tareas o eventos para ver todo acá." | "Ir al Planner" |

## 10. Error states

### Reglas obligatorias

1. **Error inline** para forms (campo individual, pequeño).
2. **ErrorState component** para pantallas o secciones completas.
3. **Mensaje humano:** Nunca exponer RPC, backend, membership, invalid response, stack trace.
4. **Acción retry:** Siempre que el error sea recuperable.
5. **No usar `Alert` para errores** (solo para confirmaciones destructivas).
6. **Errores destructivos** (eliminar, cancelar) usan `Alert` con confirmación.

### Traducción de errores técnicos

| Error técnico | Mensaje humano |
|---------------|---------------|
| `ApiError` con mensaje genérico | "No pudimos cargar tus tareas." |
| Error de red / timeout | "No pudimos guardar los cambios. ¿Revisás tu conexión?" |
| Error de validación | "Revisá este dato antes de continuar." |
| Error de permisos | "Solo un coordinador puede aprobar nuevos miembros." |
| Error de RLS | "No tenés acceso a esta información." |
| Stack trace / RPC error | ❌ Nunca mostrar |

### Ejemplos de copy

- "No pudimos cargar tus tareas. Intentá de nuevo."
- "No pudimos guardar los cambios."
- "Revisá este dato antes de continuar."
- "Solo un coordinador puede aprobar nuevos miembros."
- "Este email ya está en uso."

## 11. Success states

### Reglas

1. **Duración breve:** El feedback aparece, se nota, y no bloquea el flujo.
2. **Copy cálido:** Lenguaje humano, no técnico.
3. **No bloquear flujo:** El usuario puede seguir usando la app inmediatamente.
4. **No usar confeti ni animaciones excesivas:** Un success pulse (1 → 1.03 → 1) es suficiente.
5. **Success inline:** Para acciones pequeñas como copiar link.
6. **Success con navegación:** Para acciones grandes como crear tarea (puede navegar atrás con feedback).

### Ejemplos de copy de success

| Acción | Copy |
|--------|------|
| Crear tarea | "Listo, tarea creada." |
| Completar tarea | "Tarea completada." |
| Verificar tarea | "Tarea verificada." |
| Crear evento | "Evento agregado." |
| Invitar persona | "Invitación enviada." |
| Copiar link de invitación | "Link copiado." |
| Aprobar miembro | "Solicitud aprobada." |
| Rechazar miembro | "Solicitud rechazada." |
| Guardar perfil | "Perfil actualizado." |
| Actualizar contraseña | "Contraseña actualizada." |

## 12. Disabled states

### Reglas

1. **Disabled visual claro:** Opacity 0.58 (ya implementado en AppButton), sin haptic, sin feedback visual extra.
2. **Explicación si no es obvio:** Si el usuario puede preguntarse "¿por qué no puedo hacer esto?", incluir helper text.
3. **No haptic:** Nunca disparar haptic en disabled press.
4. **No error agresivo:** No usar color danger ni mensajes de error para estados disabled.
5. **Helper text:** Texto pequeño debajo del elemento explicando la razón del bloqueo.

### Ejemplos

| Contexto | Estado | Helper text |
|----------|--------|-------------|
| Botón "Aprobar" | Disabled si no sos coordinador | "Solo un coordinador puede aprobar miembros" |
| Botón "Verificar tarea" | Disabled si la tarea no fue completada | "Esperando que se complete la tarea" |
| Botón "Completar tarea" | Disabled si ya está completada | — (obvio: ya tiene check) |
| Chip "Mis tareas" | Disabled si no hay tareas asignadas | — (obvio: vacío) |

## 13. Demo / Próximamente states

### Reglas

1. **Todo mock/demo debe etiquetarse claramente.** Badge "Próximamente" o "Demo" visible.
2. **No mezclar demo con datos reales** sin badge explícito.
3. **Si un bloque usa datos reales, no llamarlo "demo".** Caso concreto: BriefingCard en HomePlannerSections usa datos reales del planner. Su etiqueta "Resumen automático · demo" es incorrecta y debe cambiarse.
4. **Goals del Planner** bloqueado por PLAN-002 con badge "Próximamente".
5. **Home role screens** (HomeAdulto, HomeAdolescente, HomeAdultoMayor) bloqueadas por PLAN-001 con badge si se muestran parcialmente.

### Implementación
Crear un helper o badge consistente:
```
<AppText variant="micro" tone="tertiary">Próximamente</AppText>
```
Dentro de un pill con fondo `sand[50]`.

## 14. Refresh y tab return behavior

### Regla obligatoria

```
SI hay datos previos → mantener contenido, refrescar en background
SI no hay datos previos → skeleton controlado
NUNCA → skeleton grande al volver a tabs con datos
NUNCA → resetear scroll o filtros sin motivo
```

### Comportamiento esperado

| Situación | Qué mostrar | Qué hacer en background |
|-----------|-------------|------------------------|
| Primer load, sin datos | Skeleton | Cargar datos |
| Primer load, con datos cacheados | — (no debería pasar sin persistencia) | — |
| Volver a tab, había datos | Contenido anterior | Refresh silencioso |
| Volver a tab, no había datos | Empty state previo | Refresh silencioso |
| `plannerChangedAt` cambió | Contenido anterior | Refresh inmediato |
| Pull to refresh manual | Contenido anterior | Refresh con indicador |

### Uso de AppRefreshContext
- **Ya implementado:** `plannerChangedAt`, `homeChangedAt`, `householdChangedAt`.
- **Uso controlado:** No disparar refresh si ya se está cargando.
- **Evitar loops:** Si `plannerChangedAt` dispara un load y durante ese load se vuelve a marcar, ignorar.

### Reglas de scroll y estado al volver a tabs
- No resetear posición de scroll al volver a una tab.
- No resetear filtros o chips activos al volver.
- Si los datos cambiaron significativamente (se eliminó el item en foco), ajustar scroll al tope de la sección.

## 15. Sonidos

### Regla definitiva
**No usar sonidos en Phase 1. Punto.**

- Sonidos solo opcionales y futuros (Phase 2+).
- Nunca reproducir sonidos sin configuración de mute.
- Haptics tiene prioridad total sobre sonidos.
- No usar sonidos en errores ni siquiera en el futuro.
- Si en el futuro se implementan sonidos, deben ser:
  - Opcionales (toggle en settings)
  - Cortos (< 200ms)
  - No repetitivos
  - Respetar silent mode del dispositivo

## 16. Accesibilidad y reducción de movimiento

### Reglas

1. **Respetar "Reduce Motion":** Si en el futuro se implementa detección de `AccessibilityInfo.isReduceMotionEnabled()`, desactivar todas las animaciones no esenciales.
2. **Duraciones cortas:** Máximo 320ms para cualquier animación.
3. **No animaciones largas:** Nada de 500ms+ (logo animado, transiciones pesadas).
4. **No parpadeos:** Sin flashes, sin blink, sin animaciones de opacidad que vayan a 0 rápido.
5. **No vibraciones repetitivas:** Haptics una vez por acción, nunca en loop.
6. **No depender solo del color para estados:** Combinar color + texto + icono (ErrorState ya tiene `accessibilityRole="alert"`).
7. **Mantener texto claro:** Labels, estados, y errores deben ser legibles con contraste suficiente.
8. **`accessibilityLabel` y `accessibilityRole`:** Ya implementados en AppButton y ErrorState. Mantener en todos los componentes nuevos.

## 17. Aplicación por módulo

### Auth / UIX-004

**Splash:**
- FadeIn del logo durante 240ms.
- Transición a Login/AuthLoading con fadeOut 180ms → fadeIn 180ms.
- No animar el logo en loop. Una sola entrada.

**Login / Registro:**
- Error inline con fadeIn 140ms.
- Botón loading (ya implementado).
- Sin animación de entrada de pantalla completa (solo contenido).
- Focus en input: border color transition 140ms.

**ForgotPassword / UpdatePassword:**
- Success state con mensaje inline y success pulse 240ms.
- Transición suave al volver a Login tras éxito.

**AuthLoading:**
- ActivityIndicator centrado (ya implementado).
- Sin animaciones extra.

### Planner / UIX-006

**Task Cards:**
- FadeIn + translateY 8 → 0 en primer render (180ms).
- Checkbox toggle con scale 140ms.
- Completar/Verificar: success pulse en card 240ms.

**Event Cards:**
- Igual que task cards.
- Chip de "Hoy" / "Mañana" con color interpolation 140ms.

**Forms (TaskForm / EventForm):**
- Error inline con fadeIn 140ms.
- Success feedback antes de navegar atrás.
- No animar durante escritura.

**Chips / Filtros:**
- Background color + border color interpolation 140ms.
- No animar scroll horizontal.

**Calendar:**
- Transiciones entre meses: fadeIn 240ms (o mantener sin animación si es muy pesado).
- Day press: scale 0.96 → 1 en 140ms.

### Household / Members / Profile / UIX-007

**Member Cards:**
- FadeIn + translateY 8 → 0 (180ms).

**Invite Link Copy:**
- Success pulse en icono 240ms.
- Texto "Link copiado" inline con fadeIn.

**Approve / Reject:**
- Success pulse en member card 240ms tras aprobar.
- FadeOut 180ms en member card tras rechazar (si se remueve de la lista).

**Profile:**
- Save button loading state.
- Success inline: "Perfil actualizado."

### Home / UIX-005

**IMPORTANTE:** UIX-005 no empieza hasta completar SEC-001 + PLAN-001 + PLAN-002 + UIX-003.

**HomePlannerSections (polish directo):**
- Mantener skeletons existentes (ya usan `Skeleton` component).
- Aplicar regla §14: no mostrar skeleton al volver a tabs con datos.
- Eliminar etiqueta "demo" de BriefingCard (los datos son reales).
- FadeIn para cards de tareas y eventos (180ms).

**HomeCoordinador (polish directo):**
- Animación de entrada sutil: fadeIn 240ms.
- Sin animaciones adicionales (es un wrapper de HomePlannerSections).

**Futuras homes por rol (post-PLAN-001):**
- Seguir mismas reglas que HomePlannerSections.
- Animaciones suaves, sin sobrecarga.
- Adulto mayor: animaciones más lentas (soft: 240ms) y sin haptics fuertes.

## 18. Qué NO animar

| Situación | Razón |
|-----------|-------|
| Errores críticos | Los errores requieren atención inmediata, no animación |
| Acciones destructivas sin confirmación | Seguridad primero |
| Pantallas con datos sensibles | Privacidad |
| Skeletons al volver a tabs con datos previos | Rompe la regla §14 |
| Todos los elementos de lista a la vez si hay 10+ cards | Sobrecarga visual |
| Animaciones largas de logo en uso normal | Distracción |
| Alertas de seguridad | Deben ser inmediatas |
| Formularios mientras el usuario escribe | Interfiere con la escritura |
| Scroll horizontal de filtros | El propio scroll es suficiente |
| Items que desaparecen de una lista | FadeOut solo si es una sola card |
| Pantalla completa en cada navegación | Solo animar el contenido nuevo |

## 19. Reglas para implementación futura

### Crear helpers reutilizables antes de tocar pantallas

1. **`utils/animation.ts`:**
   - `fadeIn(value, duration?)` → helper Animated
   - `slideUp(value, distance?, duration?)` → helper Animated
   - `scalePress(value, toValue?, duration?)` → helper Animated
   - `pulseSuccess(value)` → sequence scale 1 → 1.03 → 1

2. **`utils/haptics.ts` (futuro, solo si se instala expo-haptics):**
   - `safeHaptic(type)` → degrada a noop si no disponible

### Reglas de proceso

- No duplicar animaciones por pantalla. Si dos pantallas necesitan lo mismo, usar el helper.
- No instalar dependencias sin aprobación explícita.
- Si se aprueba `expo-haptics`, crear wrapper seguro que degrade sin romper.
- Si se implementan toasts, definir componente propio o aprobar librería.
- **Cada implementación debe terminar con:**
  ```
  npx.cmd tsc --noEmit
  ```
  trabajando desde `front/mi-front-limpio`
- Cada fase debe reportar archivos modificados con `git status --short`.

### Orden recomendado de implementación

1. Crear `utils/animation.ts` con helpers base.
2. Aplicar skeleton rules en HomePlannerSections (corregir flash al volver a tabs).
3. UIX-004: Auth — aplicar haptics wrapper, success states, animaciones suaves.
4. UIX-006: Planner — aplicar task checkbox animations, success feedback, form errors.
5. UIX-007: Household — aplicar member card animations, invite copy feedback.
6. UIX-005: Home — solo después de SEC-001 + PLAN-001 + PLAN-002 + UIX-003.

## 20. Cierre

Este documento define el **sistema transversal de motion, haptics, feedback y estados** para HomePlus y cierra **UIX-003 — Motion, haptics, feedback y estados**.

Con este sistema quedan habilitados:
- **UIX-004 — Auth premium cálido**
- **UIX-006 — Planner premium**
- **UIX-007 — Household/Members/Profile premium**

Y se prepara el camino para:
- **UIX-005 — Home Premium** (post SEC-001 + PLAN-001 + PLAN-002)

Toda implementación de polish visual en Fase 1 debe alinearse con las reglas definidas en este documento.

---

*Documento generado como parte de UIX-003 Etapa 2 — Diseño del sistema transversal de motion/feedback.*
*HomePlus — Fase 1: Core UI/UX Final Premium*