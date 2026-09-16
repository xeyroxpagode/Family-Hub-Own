# HomePlus — UIX-003 Motion & Feedback Audit

## 1. Objetivo

Esta auditoría prepara el sistema de motion, haptics y estados para **UIX-003 — Motion, haptics, feedback y estados**, la tercera etapa de la **Fase 1: Core UI/UX Final Premium** de HomePlus.

Su propósito es documentar el estado actual de animaciones, haptics, feedback y estados en el frontend, identificar riesgos y oportunidades, y establecer la base para diseñar un sistema transversal antes de aplicar polish en Auth (UIX-004), Planner (UIX-006), Household/Members/Profile (UIX-007) y Home (UIX-005).

**IMPORTANTE:** Esta etapa solo audita y documenta. No se instalan dependencias ni se modifica código.

## 2. Documentos base leídos

- `docs/professionalization/ui_core_screen_audit_stage_2_closure.md`
- `docs/professionalization/ui_research_references.md`

## 3. Dependencias disponibles

Revisión de `front/mi-front-limpio/package.json`:

| Dependencia | Estado | Observación |
|-------------|--------|-------------|
| `react-native Animated` | ✅ Disponible | Integrado en react-native, usado en HomeTabNavigator |
| `LayoutAnimation` | ⚠️ No usado | Existe en react-native pero no se utiliza en el código actual |
| `react-native-reanimated` | ❌ No instalado | No presente en package.json |
| `moti` | ❌ No instalado | No presente en package.json |
| `lottie` | ❌ No instalado | No presente en package.json |
| `expo-haptics` | ❌ No instalado | No presente en package.json |
| `expo-av / audio` | ❌ No instalado | No presente en package.json |
| Toast library | ❌ No instalado | No hay librería de toast (react-native-toast-message, etc.) |
| `react-native-calendars` | ✅ Instalado | Usado en PlannerCalendarScreen |
| `react-native-keyboard-aware-scroll-view` | ✅ Instalado | Usado en forms |

**Resumen:**
- Animated nativo disponible y parcialmente usado.
- Cero haptics implementados.
- Cero sonidos implementados.
- Cero librerías de toast/mensajes flotantes.
- Sin librerías de animación avanzada (Reanimated, Moti, Lottie).

## 4. Componentes de estado existentes

### Skeleton
- **Archivo:** `components/ui/Skeleton.tsx`
- **Estado actual:** Componente completo con variants: `line`, `paragraph`, `card`, `listItem`, `avatar`, `button`, `screenSection`.
- **Sirve para sistema transversal:** ✅ Sí, bien estructurado.
- **Deuda detectada:** Sin animación de shimmer (solo fondo estático).

### EmptyState
- **Archivo:** `components/ui/EmptyState.tsx`
- **Estado actual:** Componente completo con título, descripción, ilustración opcional, acción principal y secundaria.
- **Sirve para sistema transversal:** ✅ Sí, bien estructurado.
- **Deuda detectada:** Sin ilustraciones prediseñadas integradas.

### ErrorState
- **Archivo:** `components/ui/ErrorState.tsx`
- **Estado actual:** Componente completo con título, descripción, botón de retry y acción secundaria.
- **Sirve para sistema transversal:** ✅ Sí, bien estructurado.
- **Deuda detectada:** Sin código de error técnico opcional (detail).

### AppButton disabled/loading
- **Archivo:** `components/ui/AppButton.tsx`
- **Estado actual:** Soporta `loading` con ActivityIndicator interno, `disabled` con opacity 0.58, scale 0.98 en pressed.
- **Sirve para sistema transversal:** ✅ Sí, bien estructurado.
- **Deuda detectada:** Sin haptics en press/completar.

### AppScreen
- **Archivo:** `components/ui/AppScreen.tsx`
- **Estado actual:** Wrapper con SafeAreaView, ScrollView opcional, keyboard avoiding, insets configurables.
- **Sirve para sistema transversal:** ✅ Sí, bien estructurado.
- **Deuda detectada:** Sin animación de entrada.

### AppCard
- **Archivo:** `components/ui/AppCard.tsx` (auditar estructura)
- **Estado actual:** Usado en HomePlannerSections, PlannerTasksScreen.
- **Sirve para sistema transversal:** ✅ Sí.
- **Deuda detectada:** Sin variants para estados (warning, success, etc.).

## 5. Estados por pantalla/módulo

### Auth

**Pantallas:** Login, Registro, ForgotPassword, UpdatePassword, AuthLoading, Splash

| Estado | Situación actual |
|--------|------------------|
| Loading | ✅ Login muestra "Ingresando..." en botón. AuthLoading existe pero no se usa consistentemente. |
| Empty | ⚠️ No aplica (forms siempre tienen campos). |
| Error | ✅ Login muestra error en texto rojo. No usa ErrorState component. |
| Success | ❌ UpdatePassword no tiene success message tras actualización. |
| Disabled | ✅ Botones deshabilitados durante loading. |
| Refresh | ⚠️ No hay pull-to-refresh en auth. |
| Animaciones | ❌ Cero animaciones de entrada/salida. |
| Haptics | ❌ Cero haptics. |
| Deuda | - Agregar ErrorState en lugar de texto inline.<br>- Success state en UpdatePassword.<br>- Animación de entrada en Splash.<br>- Haptics en error/success. |

### Planner

**Pantallas:** PlannerTasksScreen, PlannerCalendarScreen, TaskForm, EventForm, Create/Edit screens, PlannerScreen

| Estado | Situación actual |
|--------|------------------|
| Loading | ✅ PlannerTasksScreen muestra ActivityIndicator. HomePlannerSections usa Skeleton. |
| Empty | ✅ PlannerTasksScreen tiene EmptyState con acción. HomePlannerSections tiene inline empty. |
| Error | ✅ PlannerTasksScreen muestra error con botón retry. No usa ErrorState component. |
| Success | ❌ No hay feedback visual claro tras completar/crear tarea/evento. |
| Disabled | ✅ Botones deshabilitados durante mutation (`isSaving`). |
| Refresh | ✅ Usa `useAppRefresh` y `plannerChangedAt` para auto-refresh. |
| Animaciones | ❌ Cero animaciones en cards, transiciones, o microinteracciones. |
| Haptics | ❌ Cero haptics en completar, verificar, crear. |
| Deuda | - Feedback success tras completar tarea.<br>- Haptics en completar/verificar.<br>- Usar ErrorState/EmptyState componentes.<br>- Animación en lista al agregar/eliminar item. |

### Household / Members / Profile

**Pantallas:** CrearGrupo, InvitarPersonas, JoinHousehold, FamilyScreen, ProfileScreen

| Estado | Situación actual |
|--------|------------------|
| Loading | ✅ Contexto Household maneja loading inicial. |
| Empty | ✅ FamilyScreen tiene empty state para miembros. |
| Error | ⚠️ Error handling con Alert nativo, no componentes visuales. |
| Success | ❌ No hay feedback claro tras invitar/aprobar miembro. |
| Disabled | ✅ Botones deshabilitados durante acciones. |
| Refresh | ✅ Usa `useAppRefresh` y `householdChangedAt`. |
| Animaciones | ❌ Cero animaciones. |
| Haptics | ❌ Cero haptics en aprobar, invitar, copiar link. |
| Deuda | - Success message tras invitar miembro.<br>- Haptics en acciones clave.<br>- ErrorState en lugar de Alert puro. |

### Home

**Pantallas:** HomePlannerSections, HomeCoordinador, HomeAdulto, HomeAdolescente, HomeAdultoMayor

| Estado | Situación actual |
|--------|------------------|
| Loading | ✅ HomePlannerSections usa Skeleton. |
| Empty | ✅ HomePlannerSections tiene empty inline. |
| Error | ✅ HomePlannerSections usa ErrorState. |
| Success | ❌ No hay feedback tras actualizar datos desde Home. |
| Disabled | ⚠️ No aplica directamente (Home es mostly read-only). |
| Refresh | ✅ Usa `useFocusEffect` + `useAppRefresh` + `plannerChangedAt`. |
| Animaciones | ✅ HomeTabNavigator tiene Animated.scale en tab icons y Animated.fade/slide en QuickAdd modal. |
| Haptics | ❌ Cero haptics. |
| Deuda | - Haptics en navegación entre tabs.<br>- Haptics en abrir/cerrar QuickAdd.<br>- Eliminar etiqueta "demo" de BriefingCard. |

## 6. Refresh y tab return behavior

### AppRefreshContext
- **Archivo:** `context/AppRefreshContext.tsx`
- **Implementación:** ✅ Funcional con `plannerChangedAt`, `homeChangedAt`, `householdChangedAt`.
- **Uso:** HomePlannerSections, PlannerTasksScreen usan `useFocusEffect` + `plannerChangedAt` para auto-refresh.

### useFocusEffect
- **Uso detectado:** HomePlannerSections.tsx línea 153-157.
- **Comportamiento:** Recarga datos al volver a la tab.

### Recargas al volver a tabs
- **Situación:** ✅ Datos se refrescan automáticamente via `useFocusEffect`.
- **Mantiene contenido previo:** ⚠️ Parcialmente. Skeleton aparece brevemente durante refresh.
- **Skeleton grande aunque había datos:** ⚠️ HomePlannerSections muestra skeleton en `loading` state incluso si ya hubo datos previos.
- **Resetea scroll o estado:** ⚠️ No se preserva posición de scroll al volver.

### Riesgos detectados
- Skeleton aparece en cada focus aunque los datos ya existan.
- No hay "stale data first, then refresh" pattern.
- Scroll position se pierde al navegar entre tabs.

## 7. Riesgos actuales

1. **Feedback inconsistente:** Algunos módulos usan Alert, otros ErrorState, otros texto inline.
2. **Pantallas sin success claro:** Planner, Household no muestran confirmación tras acciones exitosas.
3. **Errores técnicos visibles:** Algunos errores muestran mensajes crudos de API sin traducción.
4. **Skeletons ausentes o excesivos:** HomePlannerSections tiene skeleton, pero otras pantallas solo ActivityIndicator.
5. **Refresh agresivo:** Skeleton aparece en cada focus, incluso con datos previos.
6. **Ausencia total de haptics:** Cero haptics en toda la app.
7. **Animaciones inexistentes o aisladas:** Solo HomeTabNavigator tiene animaciones (tabs + QuickAdd modal).
8. **Sonidos no definidos:** Cero implementación de audio.
9. **Estados demo no etiquetados consistentemente:** BriefingCard tiene "Resumen automático · demo" pero los datos son reales — etiqueta confunde.

## 8. Oportunidades para UIX-003

1. **Definir motion tokens:** Duraciones (140ms, 180ms, 250ms), easing curves, escalas de press.
2. **Definir haptics por acción:** Light impact en completar tarea, medium en crear, success en verificar.
3. **Definir skeleton rules:** Cuándo usar skeleton vs ActivityIndicator, shimmer vs estático.
4. **Definir tab return rules:** "Stale data first, then refresh" para evitar flash de skeleton.
5. **Definir empty/error/success copy:** Tono cálido, humano, no técnico.
6. **Definir microinteracciones por módulo:** Card press, checkbox toggle, chip select.
7. **Definir qué no animar:** Loading states críticos, errores, transiciones entre secciones muy distintas.

## 9. Pantallas listas para recibir sistema

Estas pantallas pueden recibir motion/haptics después del documento final de UIX-003:

### Auth (UIX-004)
- Login.tsx
- Registro.tsx
- ForgotPassword.tsx
- UpdatePassword.tsx
- AuthLoading.tsx
- Splash.tsx

### Planner (UIX-006)
- PlannerTasksScreen.tsx
- PlannerCalendarScreen.tsx
- TaskForm.tsx
- EventForm.tsx
- CreateTaskScreen.tsx
- EditTaskScreen.tsx
- CreateEventScreen.tsx
- EditEventScreen.tsx

### Household/Members/Profile (UIX-007)
- CrearGrupo.tsx
- InvitarPersonas.tsx
- JoinHousehold.tsx
- FamilyScreen.tsx
- ProfileScreen.tsx

### Home (polish directo)
- HomePlannerSections.tsx
- HomeCoordinador.tsx

## 10. Pantallas bloqueadas o con cuidado

### Bloqueadas por PLAN-001
- HomeAdulto.tsx — Secciones en `if (false)`, mocks hardcodeados.
- HomeAdolescente.tsx — Secciones en `if (false)`, datos gamificación hardcodeados.
- HomeAdultoMayor.tsx — Secciones en `if (false)`, check-in hardcodeado.

### Bloqueado por PLAN-002
- PlannerScreen.tsx (tab Goals) — 100% demo, requiere decisión implementar o marcar "Próximamente".

### Bloqueado por SEC-001 + PLAN-001 + PLAN-002
- Home final (HomeAdulto, HomeAdolescente, HomeAdultoMayor) — No polish hasta RLS verificado y secciones desbloqueadas.

### Fuera de scope Phase 1
- CalendarScreen.tsx (legacy)
- FeedFamiliarScreen.tsx
- InventarioScreen.tsx

## 11. Recomendación final

**✅ UIX-003 puede avanzar a Etapa 2: diseño del sistema de motion/feedback.**

**Razones:**
1. Componentes base (Skeleton, EmptyState, ErrorState, AppButton) están implementados y son sólidos.
2. AppRefreshContext funciona y es usado consistentemente.
3. Animated nativo ya está en uso (HomeTabNavigator) — hay base para extender.
4. Riesgos están identificados y documentados.
5. Pantallas listas para polish están claramente separadas de bloqueadas.

**Próximos pasos recomendados:**
1. Etapa 2 de UIX-003: Definir motion tokens, haptics por acción, skeleton rules, tab return rules.
2. Crear documento final `ui_motion_feedback_system.md` con especificaciones completas.
3. Aplicar sistema a UIX-004 (Auth), UIX-006 (Planner), UIX-007 (Household/Members/Profile).
4. Postergar UIX-005 (Home) hasta completar SEC-001 + PLAN-001 + PLAN-002.

## 12. Verificación

Ejecutado: `git status --short docs/professionalization/ui_motion_feedback_audit.md`

**Resultado esperado:**
```
?? docs/professionalization/ui_motion_feedback_audit.md
```

**Nota:** Los archivos modificados en `front/`, `backend/`, `package.json`, etc. corresponden a trabajo previo **anterior a UIX-003** y no fueron tocados en esta etapa. Esta auditoría solo creó documentación.

---

*Documento generado como parte de UIX-003 Etapa 1 — Auditoría de movimiento/feedback actual.*
*HomePlus — Fase 1: Core UI/UX Final Premium*