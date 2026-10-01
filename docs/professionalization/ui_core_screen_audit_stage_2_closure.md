# HomePlus — UIX-001 Etapa 2 Closure

**Fecha:** 27 de junio de 2026  
**Issue:** UIX-001 — Source map visual de pantallas core  
**Fase:** 1 — Core UI/UX Final Premium

---

## 1. Estado de la auditoría

La auditoría visual profunda de Etapa 2 se ejecutó sobre los 31 archivos del scope definido (6 Auth, 5 Home, 9 Planner, 5 Household/Members/Profile, 3 Navigation, 12 Componentes UI). Se identificaron los hallazgos principales de forma confiable. Sin embargo, el documento largo (`ui_core_screen_audit.md`) quedó parcialmente truncado durante la escritura en dos intentos.

**Decisión:** No se seguirá extendiendo el documento largo. Este closure documenta los hallazgos confirmados y deja el cierre ejecutivo para avanzar a los próximos issues sin más ruido.

---

## 2. Hallazgos confiables confirmados

### Auth (6 pantallas)
- **Login, Registro, ForgotPassword, UpdatePassword, AuthLoading, Splash**: Funcionales, consistentes, con validaciones y error handling correctos.
- **Listas para UIX-004** (diseño final premium de Auth).
- **Falta transversal:** Animaciones de entrada, haptics en botones.
- **Registro.tsx**: Tiene botón placeholder "Continuar con Google (próximamente)" que debería removerse o esconderse.
- **UpdatePassword.tsx**: Sin success message tras actualización exitosa.

### Planner (9 pantallas)
- **PlannerTasksScreen, PlannerCalendarScreen**: ✅ 100% datos reales, con loading/empty/error states completos.
- **TaskForm, EventForm**: ✅ Funcionales, con templates, quick dates, asignación, recurrencia, override de ocurrencias. Riesgo menor: `extraScrollHeight={24}` puede ser insuficiente en dispositivos pequeños.
- **CreateTaskScreen, EditTaskScreen, CreateEventScreen, EditEventScreen**: ✅ Wrappers simples de TaskForm/EventForm.
- **PlannerScreen**: Tasks y Calendar OK, pero **tab "Goals" es 100% mock/demo** (progreso 60% fake, badges "Próximamente").
- **Planner Goals**: Requiere decisión PLAN-002 (implementar mínimo o marcar "Próximamente" permanentemente).
- **Listos para UIX-006** (diseño final premium de Planner).

### Home (5 pantallas)
- **HomeAdulto**: ❌ **BLOQUEADA**. Líneas 129-238 dentro de `if (false)` — secciones de schedule, activity feed, tasks y calendar strip no se renderizan. `MOCK_ACTIVITY` array hardcodeado. Wellbeing y Presence sin persistencia.
- **HomeAdolescente**: ❌ **BLOQUEADA**. Líneas 128-190 dentro de `if (false)` — quests y schedule no se renderizan. `MOCK_ACTIVITY`, `MOCK_CHALLENGE` hardcodeados. XP/streak/level hardcodeados.
- **HomeAdultoMayor**: ❌ **BLOQUEADA**. Líneas 131-154 dentro de `if (false)` — appointments no se renderizan. `MOCK_PHOTOS`, `MOCK_VOICE` hardcodeados. SOS no envía notificación real.
- **HomeCoordinador**: ✅ Más limpio de lo esperado. Pantalla minimalista que solo muestra `HomePlannerSections`. Los mocks detectados en Etapa 1 (DailyBriefing, BudgetCard, FamilyPulse, QuickActions) **no existen en el código actual**.
- **HomePlannerSections**: ✅ Usa datos reales de planner (summary, tareas, eventos). Tiene loading/empty/error states. BriefingCard tiene etiqueta "Resumen automático · demo" que confunde — los datos son reales, la etiqueta sobra.
- **HomePlannerSections y HomeCoordinador están listos para polish.**

### Household / Members / Profile (5 pantallas)
- **CrearGrupo, InvitarPersonas, JoinHousehold, FamilyScreen**: ✅ Funcionales, con datos reales, loading/empty/error states completos.
- **ProfileScreen**: ✅ Funcional. Tiene toggles de configuración que son solo UI (sin persistencia). Stats row (Actividades, Racha, Logros) con valores hardcodeados (147, 38, 12).
- **Listos para UIX-007** (diseño final premium de Household/Members/Profile).

### Deuda visual transversal
- **Animaciones/Haptics**: Cero en todas las pantallas. Faltan fade-in, slide, haptics en botones, haptics en completar/verificar tareas.
- **KeyboardAwareScrollView**: `extraScrollHeight={24}` en TaskForm y EventForm es bajo. Recomendado aumentarlo a 40-60.
- **Scroll horizontal**: Stats en HomePlannerSections y filtros en PlannerTasksScreen usan ScrollView horizontal — riesgo de pérdida de posición.

### Legacy / Fuera de scope
- **CalendarScreen legacy** (`screens/calendar/CalendarScreen.tsx`): Existe pero no está en navegación principal. Usa servicios antiguos (`schedules.ts`, `events.ts`). Fuera de Phase 1.
- **FeedFamiliarScreen, InventarioScreen**: Fuera de scope para esta auditoría. Quedan para Phase 2+.

---

## 3. Pantallas listas para polish

### UIX-004 — Auth Premium
- `Login.tsx`
- `Registro.tsx`
- `ForgotPassword.tsx`
- `UpdatePassword.tsx`
- `AuthLoading.tsx`
- `Splash.tsx`

### UIX-006 — Planner Premium
- `PlannerTasksScreen.tsx`
- `PlannerCalendarScreen.tsx`
- `TaskForm.tsx`
- `EventForm.tsx`
- `CreateTaskScreen.tsx`
- `EditTaskScreen.tsx`
- `CreateEventScreen.tsx`
- `EditEventScreen.tsx`

### UIX-007 — Household/Members/Profile Premium
- `CrearGrupo.tsx`
- `InvitarPersonas.tsx`
- `JoinHousehold.tsx`
- `FamilyScreen.tsx`
- `ProfileScreen.tsx`

### Polish directo (sin issue separado necesario)
- `HomePlannerSections.tsx` — Remover etiqueta "demo" de BriefingCard, agregar animaciones suaves.
- `HomeCoordinador.tsx` — Animación de entrada.

---

## 4. Pantallas bloqueadas

### Bloqueo por PLAN-001 (conexión Home con planner real)
- `HomeAdulto.tsx` — Secciones en `if (false)`, MOCK_ACTIVITY, wellbeing/presence sin persistencia.
- `HomeAdolescente.tsx` — Secciones en `if (false)`, datos gamificación hardcodeados.
- `HomeAdultoMayor.tsx` — Secciones en `if (false)`, check-in hardcodeado, SOS sin backend.

### Bloqueo por PLAN-002 (decisión sobre Goals)
- `PlannerScreen.tsx` — Tab "Goals" es 100% demo.

### Bloqueo por UIX-003 (sistema de animaciones/haptics)
- Transversal a todas las pantallas. Ninguna tiene animaciones ni haptics definidos.

### Bloqueo por SEC-001 (verificación RLS)
- Cualquier conexión de Home con datos reales requiere RLS verificado.

### Fuera de scope Phase 1
- `CalendarScreen.tsx` (legacy)
- `FeedFamiliarScreen.tsx`
- `InventarioScreen.tsx`

---

## 5. Decisión de cierre

**UIX-001 Etapa 2 se considera suficientemente cerrada para avanzar.**

La auditoría identificó:
- ✅ 18 pantallas listas para polish sin bloqueos técnicos.
- ✅ 4 pantallas bloqueadas (3 por `if (false)`, 1 por demo Goals).
- ✅ Mocks confirmados por archivo y línea.
- ✅ Deuda visual transversal documentada (sin animaciones, sin haptics).
- ✅ Riesgos técnicos identificados (keyboard, scroll horizontal).
- ✅ Clasificación por issue (UIX-004, UIX-006, UIX-007) lista.

No seguir expandiendo la auditoría larga.

---

## 6. Próximo paso recomendado

**Recomendado inmediato:**
1. **UIX-002** — Investigación de referencias UI/UX premium familiar (Google Family Link, Cozi, Tody, Nipto).
2. **UIX-003** — Definir sistema de movimiento, haptics y estándares de animación.

**Antes de empezar polish de Home (UIX-005):**
3. **SEC-001** — Verificación de `is_active_household_member()` y tests de RLS.
4. **PLAN-001** — Desbloquear secciones `if (false)` de Home y conectar con planner real.
5. **PLAN-002** — Decidir sobre Planner Goals (implementar mínimo o marcar "Próximamente").

**Polish puede comenzar en paralelo:**
- UIX-004 (Auth) — no depende de SEC ni PLAN.
- UIX-006 (Planner) — no depende de SEC ni PLAN (tasks/calendar ya usan datos reales).
- UIX-007 (Household/Members/Profile) — no depende de SEC ni PLAN.

---

## 7. Verificación

Ejecutado: `git status --short`

**Archivos esperados:**
- `?? docs/professionalization/ui_core_screen_audit.md` (Etapa 1 + contenido parcial Etapa 2)
- `?? docs/professionalization/ui_core_screen_audit_stage_2_closure.md` (este documento)

**Nota:** Los archivos modificados en `front/`, `backend/`, `package.json`, etc. corresponden a trabajo previo de HOME-POLISH-0 **anterior a UIX-001** y no fueron tocados en esta etapa. No se modificó código productivo.

---

**Fin del cierre de UIX-001 Etapa 2.**