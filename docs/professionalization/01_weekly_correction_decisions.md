# HomePlus — Weekly Correction Decisions

**Fecha:** 27 de junio de 2026  
**Basado en:** `00_current_state_deep_audit.md`  
**Objetivo:** Definir qué se corrige esta semana, en qué orden, y qué queda fuera para entrar a Phase 1 con un plan claro.

---

## 1. Executive Decision Summary

### Qué encontró la auditoría

La auditoría PRO-001 reveló que HomePlus tiene un **MVP funcional** pero con varias capas de deuda técnica:

- **Auth/Household/Invite flow:** 100% reales y funcionales.
- **Planner Tasks/Events:** 100% reales con CRUD completo.
- **Home screens:** Parciales — `HomeAdulto` tiene secciones enteras comentadas (`if (false)`) que muestran datos mock en lugar de reales.
- **Planner Goals:** 100% mock/demo — cards con progreso fake (60%), badges de "Próximamente".
- **Presence/Wellbeing:** Funcionales en UI pero sin persistencia.
- **Tablas legacy:** `tasks`, `events`, `schedules` coexisten con `planner_tasks`, `planner_events` sin usarse.
- **Controllers legacy:** `auth.controller.js`, `authMiddleware.js` sin uso.
- **RLS:** Función `is_active_household_member()` mencionada pero no encontrada en migraciones leídas.
- **Inconsistencia DB:** Migraciones mencionan `public.people` pero `auth_base.sql` crea `public.users`.

### Por qué esta semana será de corrección al buen camino

HomePlus **ya funciona** para un demo básico (login → crear hogar → invitar → planner), pero:

1. **La pantalla principal (HomeAdulto) está incompleta** — usuarios no ven su agenda real, tareas o actividad familiar.
2. **Hay mocks mezclados con funcionalidad real** — Planner Goals parece producto terminado pero es demo.
3. **Hay legacy sin limpiar** — código y tablas que podrían causar confusión o errores.
4. **Hay riesgos de seguridad sin auditar** — RLS, service role, aislamiento entre hogares.

Esta semana no es para agregar features nuevas. Es para:

- **Desbloquear lo que ya existe** pero está comentado/oculto.
- **Limpiar lo que sobra** (mocks obvios, legacy confirmado).
- **Verificar lo crítico** (RLS, DB schema, funciones).
- **Dejar las bases limpias** para Phase 1 (UI/UX premium).

### Qué NO vamos a hacer todavía

- **No OAuth** — Google/Apple login queda para después de Phase 1.
- **No Inventory** — Solo hay pantalla, sin backend. Requiere diseño primero.
- **No Finance/Geni/SOS/FamilyCloud** — No existen, son roadmap futuro.
- **No borrar tablas legacy** — Sin confirmar que nada las usa, es riesgoso.
- **No cambiar estrategia de service role** — Requiere auditoría más profunda.
- **No rediseñar toda la arquitectura** — Solo correcciones puntuales para estabilizar.
- **No reescribir la app** — El MVP funciona, solo necesita profesionalización.

### Cuál es la prioridad general antes de seguir agregando módulos

**Primero: Core UI/UX final + estabilización.**

Antes de agregar Inventory, Finance, Geni, o cualquier módulo nuevo, necesitamos:

1. **Auth/Home/Planner funcionando al 100%** — Sin mocks, sin secciones comentadas.
2. **RLS verificado** — Aislamiento entre hogares confirmado con tests.
3. **DB schema limpio** — Confirmar `people` vs `users`, deshabilitar tablas legacy.
4. **UI/UX premium** — Animaciones suaves, haptics con criterio, gestos que no rompan scroll.

Solo después de esto, Phase 1 puede comenzar con Inventory u otros módulos.

---

## 2. Inputs Used

**Documentos usados:**

- `docs/professionalization/00_current_state_deep_audit.md` — Auditoría técnica completa del repo.

**Documentos consultados (si existen):**

- `docs/current_architecture_audit.md` — No existe.
- `docs/rls-policies/familyhub-rls-policies-deliverables.md` — Políticas RLS (referencia).
- `supabase/docs/reglas_negocio_invitaciones.md` — Reglas de invitaciones (referencia).

**Si hay conflicto entre documentos viejos y la auditoría actual, gana la auditoría actual.**

---

## 3. Priority System

### Definición de prioridades

```txt
P0 — Crítico:
Puede afectar seguridad, datos, login, hogares, permisos, demo principal o impedir seguir profesionalizando.
Debe entrar esta semana sí o sí.

P1 — Muy importante:
Mejora fuerte de calidad, UX, lógica o estabilidad.
Debe entrar esta semana si no bloquea P0.

P2 — Importante:
Conviene hacerlo, pero puede esperar si P0/P1 consumen tiempo.
Entra si sobra capacidad.

P3 — Futuro:
No entra esta semana.
Se planifica para Phase 2 o posterior.
```

---

## 4. Decisions by Area

### Core UI/UX

**Estado actual:**
- Auth screens consistentes y funcionales.
- HomeAdulto tiene secciones comentadas (`if (false)`) con datos mock.
- Planner Goals es 100% demo (cards con progreso fake).
- No hay skeletons en HomeAdulto.
- Wellbeing funciona pero sin persistencia.

**Decisión:**
- Descomentar y conectar HomeAdulto con datos reales del planner.
- Remover o marcar Planner Goals como "Próximamente" con badge visible.
- Agregar skeletons donde faltan.
- Wellbeing: decidir si se implementa persistencia o se remueve.

**Prioridad:** P0

**Entra esta semana:** Sí — Solo diseño y conexión de datos, sin backend nuevo.

**Por qué:** HomeAdulto es la pantalla principal. No puede estar incompleta.

**Riesgo si no se hace:** Usuarios ven una app incompleta, pierden confianza.

**Qué NO hacer todavía:**
- No crear animaciones complejas sin antes estabilizar datos.
- No agregar gestos que rompan scroll.

**Siguiente tarea sugerida:**
`UIX-001 — Source map visual de HomeAdulto y conexión con planner`

---

### Auth/Household

**Estado actual:**
- Flujo completo funcional (registro, login, logout, recovery).
- RPC `create_household` funciona.
- Invite links con tokens reusables + join requests.
- `auth.controller.js` legacy sin uso.

**Decisión:**
- No tocar funcionalidad — ya está estable.
- Marcar `auth.controller.js` para remoción posterior.
- Verificar restore session post-recovery.

**Prioridad:** P1

**Entra esta semana:** Solo auditoría y marcado de legacy.

**Por qué:** Funciona, pero hay legacy que limpiar después.

**Riesgo si no se hace:** Confusión para desarrolladores futuros.

**Qué NO hacer todavía:**
- No cambiar estrategia de auth.
- No tocar .env.
- No modificar endpoints sin revisar frontend services.

**Siguiente tarea sugerida:**
`AUTH-001 — Auditoría de restore session y marcado de legacy`

---

### RLS/Security

**Estado actual:**
- Función `is_active_household_member()` mencionada en RLS de planner pero no encontrada en migraciones.
- Tablas legacy con RLS habilitado pero sin uso.
- Service role se usa para RPCs pero sin audit log.
- Pending members sin políticas explícitas.

**Decisión:**
- Verificar si `is_active_household_member()` existe en DB.
- Si no existe, crearla o ajustar RLS.
- Tests de aislamiento entre hogares.
- Loguear operaciones con service role.

**Prioridad:** P0

**Entra esta semana:** Sí — Solo auditoría y creación de función si falta.

**Por qué:** Si RLS falla, hay riesgo de fuga de datos entre hogares.

**Riesgo si no se hace:** Vulnerabilidad crítica de seguridad.

**Qué NO hacer todavía:**
- No modificar policies sin tests.
- No borrar tablas legacy sin confirmar que no se usan.

**Siguiente tarea sugerida:**
`SEC-001 — Verificación de is_active_household_member() y tests de RLS`

---

### Planner

**Estado actual:**
- Tasks/Events CRUD completo y funcional.
- Calendar integrado.
- Goals es 100% mock.
- Sheets de creación/edición funcionan.

**Decisión:**
- Conectar HomeAdulto con datos reales de planner.
- Decidir sobre Goals: implementar mínimo viable o remover/marcar como "Próximamente".
- Pulir sheets (animaciones, haptics).

**Prioridad:** P0

**Entra esta semana:** Sí — Conexión de datos y decisión sobre Goals.

**Por qué:** Planner es el core del producto. HomeAdulto debe mostrarlo.

**Riesgo si no se hace:** App parece incompleta.

**Qué NO hacer todavía:**
- No cambiar estructura de tablas.
- No agregar features nuevas (ej: subtareas, dependencias).

**Siguiente tarea sugerida:**
`PLAN-001 — Conexión de HomeAdulto con planner real`

---

### Audit log / Trazabilidad mínima

**Estado actual:**
- No hay audit log de operaciones críticas.
- Service role operations no se loguean.
- No hay trazabilidad de quién hizo qué (finalize member, revoke invite, etc.).

**Decisión:**
- Implementar log mínimo de operaciones críticas (solo backend).
- No es necesario UI de audit log todavía.

**Prioridad:** P2

**Entra esta semana:** Solo si sobra tiempo después de P0/P1.

**Por qué:** Importante para seguridad, pero no bloquea demo.

**Riesgo si no se hace:** Dificultad para debuggear incidentes.

**Qué NO hacer todavía:**
- No crear UI de audit log.
- No loguear datos sensibles.

**Siguiente tarea sugerida:**
`SEC-002 — Log mínimo de operaciones críticas`

---

### Realtime

**Estado actual:**
- No hay implementación de WebSockets o Supabase Realtime.
- Presence toggle es local sin persistencia.
- No hay notificaciones.

**Decisión:**
- No implementar realtime esta semana.
- Presence: decidir si se implementa persistencia simple o se remueve.
- Dejar diseño para Phase 2.

**Prioridad:** P3

**Entra esta semana:** No — Solo decisión sobre Presence.

**Por qué:** Realtime requiere RLS sólido primero.

**Riesgo si no se hace:** Ninguno inmediato.

**Qué NO hacer todavía:**
- No activar realtime global.
- No crear sistema de notificaciones.

**Siguiente tarea sugerida:**
`RT-001 — Decisión sobre persistencia de Presence`

---

### Inventory

**Estado actual:**
- Solo existe `InventarioScreen.tsx`.
- No hay backend, services, ni DB.

**Decisión:**
- No implementar esta semana.
- Requiere auditoría y diseño primero.

**Prioridad:** P3

**Entra esta semana:** No.

**Por qué:** No es core del MVP. Requiere diseño completo.

**Riesgo si no se hace:** Ninguno.

**Qué NO hacer todavía:**
- No crear tablas de DB.
- No implementar backend.
- No tocar hasta tener diseño final.

**Siguiente tarea sugerida:**
`INV-001 — Auditoría y diseño de Inventory (Phase 2)`

---

### OAuth

**Estado actual:**
- No implementado.
- Registro/Login solo con email/password.

**Decisión:**
- No implementar esta semana.
- Queda para Phase 2 o posterior.

**Prioridad:** P3

**Entra esta semana:** No.

**Por qué:** Auth actual funciona. OAuth es feature adicional.

**Riesgo si no se hace:** Ninguno.

**Qué NO hacer todavía:**
- No tocar configuración de OAuth en Supabase.
- No modificar flows de auth.

**Siguiente tarea sugerida:**
`AUTH-002 — Diseño de OAuth (Phase 2)`

---

### Legacy cleanup

**Estado actual:**
- `auth.controller.js` sin uso.
- `authMiddleware.js` sin uso.
- `invitations routes` devuelve 410.
- `createHouseholdInvitation`, `validateInvitation` sin uso.
- Tablas legacy (`tasks`, `events`, `schedules`) con RLS pero sin uso.

**Decisión:**
- Marcar archivos legacy para remoción.
- No borrar esta semana — verificar con git history y DB primero.
- Agregar comentarios en migraciones legacy indicando "NO USAR".

**Prioridad:** P1

**Entra esta semana:** Solo marcado y documentación, no borrado.

**Por qué:** Limpieza necesaria pero requiere verificación previa.

**Riesgo si no se hace:** Confusión para desarrolladores.

**Qué NO hacer todavía:**
- No borrar archivos sin confirmación.
- No borrar tablas sin queries de verificación.

**Siguiente tarea sugerida:**
`CLEAN-001 — Marcado y documentación de legacy`

---

### Profile/Settings

**Estado actual:**
- `ProfileScreen.tsx` existe pero no auditada en detalle.
- `UpdatePassword.tsx` para recovery.
- Falta: editar perfil, preferencias, cambiar email, eliminar cuenta.

**Decisión:**
- Auditoría rápida de `ProfileScreen.tsx`.
- Implementar edición básica de perfil (nombre, avatar) si es simple.
- Resto queda para Phase 2.

**Prioridad:** P2

**Entra esta semana:** Solo auditoría y edición básica si es simple.

**Por qué:** Perfil básico es esperado por usuarios.

**Riesgo si no se hace:** Menor — usuarios pueden vivir sin editar perfil temporalmente.

**Qué NO hacer todavía:**
- No implementar eliminación de cuenta sin diseño de flujo.
- No cambiar email sin verificación.

**Siguiente tarea sugerida:**
`PROF-001 — Auditoría de ProfileScreen y edición básica`

---

## 5. Weekly Scope

### Qué entra esta semana

| Bloque | Entra esta semana | Prioridad | Objetivo | Resultado esperado |
|--------|-------------------|-----------|----------|-------------------|
| **Bloque 1 — Core UI/UX final premium** | ✅ Sí | P0 | Desbloquear HomeAdulto, limpiar mocks | HomeAdulto muestra datos reales, Goals marcado/removido |
| **Bloque 2 — Auth/Household hardening pre-OAuth** | ⚠️ Solo auditoría | P1 | Verificar restore session, marcar legacy | Auth estable, legacy documentado |
| **Bloque 3 — RLS/Security + lógica de datos** | ✅ Sí | P0 | Verificar `is_active_household_member()`, tests de aislamiento | RLS verificado, función creada si falta |
| **Bloque 4 — Planner professionalization** | ✅ Sí | P0 | Conectar HomeAdulto con planner | Planner visible en home, no solo en tab |
| **Bloque 5 — Audit log / trazabilidad mínima** | ⚠️ Solo si sobra tiempo | P2 | Log mínimo de operaciones críticas | Logs en consola/backend, sin UI |
| **Bloque 6 — Realtime foundation** | ❌ No | P3 | — | Solo decisión sobre Presence |
| **Bloque 7 — Inventory audit/design** | ❌ No | P3 | — | Solo lectura de pantalla existente |
| **Bloque 8 — Elegir próximo módulo semanal** | ✅ Sí | P2 | Decidir qué sigue después de Core UI/UX | Decisión documentada |

---

## 6. Recommended Order of Execution

### Orden de trabajo sugerido

```txt
1. Core UI/UX source map y decisiones visuales.
   → Entender qué pantallas tocar y qué mocks limpiar.

2. RLS/Security verification.
   → Verificar is_active_household_member() y tests de aislamiento.
   → Bloquea: no se puede conectar HomeAdulto sin RLS verificado.

3. Planner professionalization.
   → Conectar HomeAdulto con datos reales de planner.
   → Requiere: RLS verificado.

4. Core UI/UX final de Auth/Home/Planner.
   → Pulir animaciones, haptics, gestos.
   → Requiere: datos reales conectados.

5. Auth/Household hardening.
   → Verificar restore session, marcar legacy.
   → No bloquea, pero conviene hacer temprano.

6. Audit log mínimo.
   → Solo si sobra tiempo después de P0/P1.

7. Inventory audit.
   → Solo lectura, sin implementación.

8. Elegir próximo módulo.
   → Decidir entre Profile/Settings básico u otro.
```

### Justificación del orden

1. **RLS primero** — Si hay fuga de datos entre hogares, todo lo demás es inútil.
2. **Planner conectado** — HomeAdulto no puede mostrar datos fake.
3. **UI/UX después** — Una vez que los datos son reales, pulir la experiencia.
4. **Auth hardening** — No es crítico pero conviene limpiar legacy temprano.
5. **Audit log** — Importante pero no bloquea demo.
6. **Inventory** — No es core, requiere diseño primero.

---

## 7. Phase 1 Entry Criteria

### Qué es Phase 1

Phase 1 será: **Core UI/UX final premium**

Debe incluir:
- Auth (Login, Registro, Forgot, UpdatePassword)
- Home (HomeAdulto, HomeAdolescente, HomeCoordinador, HomeAdultoMayor)
- Planner (Tasks, Events, Calendar)
- Household/Members (CrearGrupo, InvitarPersonas, FamilyScreen)
- Profile/Settings básico si aplica

### Qué puede tocar Phase 1

- **UI/UX de pantallas existentes** — Mejorar visuales, animaciones, haptics.
- **Conexión de datos** — Conectar mocks con backend real.
- **Sheets y modales** — Pulir animaciones de apertura/cierre.
- **Empty states y error states** — Mejorar mensajes y visuales.
- **Loading states** — Agregar skeletons donde faltan.

### Qué NO puede tocar Phase 1

- **Backend** — No cambiar endpoints, controllers, services.
- **Database** — No crear/migrar tablas, no modificar RLS.
- **Auth flow** — No cambiar registro/login/recovery.
- **Features nuevas** — No agregar Inventory, Finance, Geni, SOS, etc.
- **OAuth** — No implementar Google/Apple login.
- **Realtime global** — No activar WebSockets o Supabase Realtime.

### Qué pantallas entran

- ✅ Login
- ✅ Registro
- ✅ ForgotPassword
- ✅ UpdatePassword
- ✅ HomeAdulto (desbloquear secciones comentadas)
- ✅ HomeAdolescente (si hay datos reales)
- ✅ HomeCoordinador (si hay datos reales)
- ✅ HomeAdultoMayor (si hay datos reales)
- ✅ Planner (Tasks, Calendar)
- ✅ CrearGrupo
- ✅ InvitarPersonas
- ✅ FamilyScreen
- ✅ ProfileScreen (básico)

### Qué pantallas quedan fuera

- ❌ InventarioScreen (sin backend)
- ❌ FeedFamiliarScreen (posiblemente mock)
- ❌ Planner Goals (mock/demo — marcar como "Próximamente")

### Qué significa "diseño final premium"

- **Consistencia visual** — Mismos colores, tipografía, spacing en todas las pantallas.
- **Animaciones suaves** — Sheets que se deslizan, botones con feedback, transiciones fluidas.
- **Haptics con criterio** — Vibración sutil en acciones importantes (guardar, eliminar).
- **Gestos que no rompan scroll** — Swipe solo donde no interfiera con navegación.
- **Loading states apropiados** — Skeletons en lugar de spinners donde sea posible.
- **Empty states claros** — Mensajes amigables con acción sugerida.
- **Error states útiles** — Mensajes claros con retry o guía.

### Qué animaciones/haptics/gestos pueden planificarse

- **Sheets:** Slide up con spring, backdrop fade.
- **Botones:** Scale down on press, haptic light.
- **Pull-to-refresh:** Ya existe, mantener.
- **Swipe-to-delete:** Solo si no rompe scroll (evaluar).
- **Tap-to-edit:** Feedback visual + haptic.
- **Transiciones entre tabs:** Fade o slide suave.

### Qué cosas requieren source map propio antes de tocar

- **HomeAdulto** — Entender qué secciones están comentadas y por qué.
- **Planner Goals** — Decidir si se implementa o se marca como "Próximamente".
- **ProfileScreen** — Auditoría rápida para ver qué falta.
- **AppRefreshContext** — Mapear qué pantallas lo escuchan antes de modificar.

---

## 8. Phase 1 Initial Issues for Linear

### Lista inicial de issues para Linear

#### UIX — UI/UX Core

**UIX-001 — Source map visual de pantallas core**
- **Objetivo:** Auditar las pantallas principales antes de rediseñar.
- **Alcance:** HomeAdulto, Planner, FamilyScreen.
- **Entregable:** Documento con lista de mocks, secciones comentadas, y recomendaciones.
- **Dependencias:** Ninguna.

**UIX-002 — Investigación de referencias UI/UX premium familiar**
- **Objetivo:** Revisar apps de referencia para animaciones, gestos, haptics y tono visual.
- **Alcance:** Apps como Google Family Link, Cozi, Tody, Nipto.
- **Entregable:** Documento con referencias y recomendaciones aplicables.
- **Dependencias:** Ninguna.

**UIX-003 — Definir sistema de movimiento, haptics y sonidos**
- **Objetivo:** Decidir cuándo la app se mueve, vibra o suena.
- **Alcance:** Animaciones de sheets, botones, transiciones, haptics por acción.
- **Entregable:** Documento de estándares de movimiento/haptics.
- **Dependencias:** UIX-001, UIX-002.

**UIX-004 — Diseño final premium de Auth**
- **Objetivo:** Dejar Login/Register/Forgot/UpdatePassword con diseño final sin cambiar backend.
- **Alcance:** Consistencia visual, animaciones, empty/error states.
- **Entregable:** Pantallas de Auth actualizadas.
- **Dependencias:** UIX-003.

**UIX-005 — Diseño final premium de Home**
- **Objetivo:** Convertir Home en centro operativo real, separando mock/demo de datos reales.
- **Alcance:** Descomentar secciones de HomeAdulto, conectar con planner, limpiar mocks.
- **Entregable:** HomeAdulto funcional con datos reales.
- **Dependencias:** UIX-001, PLAN-001.

**UIX-006 — Diseño final premium de Planner/Tasks/Events**
- **Objetivo:** Pulir Planner, Tasks, Events, Calendar, sheets, formularios y gestos.
- **Alcance:** Animaciones de sheets, haptics en completar/verificar, gestos de swipe.
- **Entregable:** Planner con UX premium.
- **Dependencias:** UIX-003, PLAN-001.

**UIX-007 — Diseño final premium de Household/Members/Profile básico**
- **Objetivo:** Pulir gestión de miembros, invitaciones, perfil y settings mínimos.
- **Alcance:** FamilyScreen, InvitarPersonas, ProfileScreen (edición básica).
- **Entregable:** Household/Members/Profile con UX consistente.
- **Dependencias:** UIX-003.

#### SEC — Security/RLS

**SEC-001 — Verificación de is_active_household_member() y tests de RLS**
- **Objetivo:** Confirmar que la función existe en DB o crearla. Tests de aislamiento entre hogares.
- **Alcance:** DB, migraciones, tests de RLS.
- **Entregable:** Función creada (si falta), tests de RLS pasando.
- **Dependencias:** Ninguna.

**SEC-002 — Log mínimo de operaciones críticas**
- **Objetivo:** Loguear operaciones con service role y acciones críticas.
- **Alcance:** Backend — finalize member, revoke invite, approve/reject join request.
- **Entregable:** Logs en consola/backend, sin UI.
- **Dependencias:** Ninguna.

#### PLAN — Planner

**PLAN-001 — Conexión de HomeAdulto con planner real**
- **Objetivo:** Descomentar secciones de HomeAdulto y conectar con datos de planner.
- **Alcance:** HomeAdulto.tsx — schedule, activity feed, tasks, calendar strip.
- **Entregable:** HomeAdulto mostrando datos reales.
- **Dependencias:** SEC-001.

**PLAN-002 — Decisión sobre Planner Goals**
- **Objetivo:** Decidir si se implementa mínimo viable o se marca como "Próximamente".
- **Alcance:** PlannerScreen.tsx — pestaña Goals.
- **Entregable:** Goals implementado (mínimo) o removido/marcado.
- **Dependencias:** UIX-001.

#### AUTH — Auth/Household

**AUTH-001 — Auditoría de restore session y marcado de legacy**
- **Objetivo:** Verificar restore session post-recovery. Marcar archivos legacy.
- **Alcance:** AuthContext, controllers legacy, middlewares legacy.
- **Entregable:** Documento de legacy marcado, restore session verificado.
- **Dependencias:** Ninguna.

#### CLEAN — Legacy cleanup

**CLEAN-001 — Marcado y documentación de legacy**
- **Objetivo:** Marcar archivos legacy y documentar qué no usar.
- **Alcance:** Controllers, routes, services, tablas legacy.
- **Entregable:** Archivos marcados con comentarios, documento de legacy.
- **Dependencias:** AUTH-001.

#### PROF — Profile/Settings

**PROF-001 — Auditoría de ProfileScreen y edición básica**
- **Objetivo:** Auditar ProfileScreen. Implementar edición básica de nombre/avatar si es simple.
- **Alcance:** ProfileScreen.tsx, endpoint PATCH /api/users/me.
- **Entregable:** ProfileScreen con edición básica funcional.
- **Dependencias:** UIX-003.

#### NEXT — Next module decision

**NEXT-001 — Elegir próximo módulo después de Core UI/UX**
- **Objetivo:** Decidir qué módulo se implementa después de Phase 1.
- **Alcance:** Evaluar Inventory, Finance, Presence/Realtime, Notifications.
- **Entregable:** Decisión documentada con justificación.
- **Dependencias:** UIX-005, UIX-006, UIX-007.

---

## 9. Out of Scope This Week

### Lista explícita de cosas que NO se hacen esta semana

- ❌ **No OAuth todavía** — Google/Apple login queda para Phase 2+.
- ❌ **No Inventory implementation** — Solo hay pantalla, sin backend. Requiere diseño.
- ❌ **No Finance real** — No existe, es roadmap futuro.
- ❌ **No Geni real** — No existe, es roadmap futuro.
- ❌ **No Presence real** — Si no se decide formalmente, no se implementa.
- ❌ **No SOS** — No existe, es roadmap futuro.
- ❌ **No FamilyCloud/Documents** — No existe, es roadmap futuro.
- ❌ **No borrar tablas legacy** — Sin confirmar que nada las usa, es riesgoso.
- ❌ **No activar realtime global** — Requiere RLS sólido primero.
- ❌ **No cambiar estrategia de service role** — Requiere auditoría más profunda.
- ❌ **No rediseñar toda la arquitectura** — Solo correcciones puntuales.
- ❌ **No reescribir toda la app** — El MVP funciona, solo necesita profesionalización.
- ❌ **No crear features nuevas en Planner** — Solo conectar datos existentes.
- ❌ **No modificar endpoints** — Sin revisar frontend services primero.
- ❌ **No tocar .env** — Sin autorización explícita.
- ❌ **No instalar dependencias** — Sin autorización explícita.

---

## 10. Risks Accepted Temporarily

### Riesgos que aceptamos por ahora, pero dejamos visibles

- ⚠️ **Goals puede quedar como "Próximamente"** — Si se marca bien con badge visible, no confunde usuarios.
- ⚠️ **Presence local puede removerse o quedar oculto** — Si no se implementa persistencia, se puede quitar el toggle.
- ⚠️ **Wellbeing puede quitarse** — Si no hay persistencia, se puede remover la sección evening.
- ⚠️ **Legacy tables no se borran todavía** — Coexisten con tablas nuevas hasta confirmar que no se usan.
- ⚠️ **AppRefreshContext no se elimina** — Hasta mapear todos los usos, se mantiene.
- ⚠️ **auth.controller.js legacy se mantiene** — Hasta verificar git history, no se borra.
- ⚠️ **No hay audit log completo** — Solo log mínimo si sobra tiempo.
- ⚠️ **Profile/Settings incompleto** — Edición básica si es simple, resto queda para Phase 2.

---

## 11. Final Linear Task List

### Lista final sugerida de tareas para Linear

#### Phase 1 — UI/UX

| Issue | Título | Prioridad | Dependencias |
|-------|--------|-----------|--------------|
| UIX-001 | Source map visual de pantallas core | P0 | — |
| UIX-002 | Investigación de referencias UI/UX premium | P1 | — |
| UIX-003 | Definir sistema de movimiento, haptics y sonidos | P1 | UIX-001, UIX-002 |
| UIX-004 | Diseño final premium de Auth | P0 | UIX-003 |
| UIX-005 | Diseño final premium de Home | P0 | UIX-001, PLAN-001 |
| UIX-006 | Diseño final premium de Planner/Tasks/Events | P0 | UIX-003, PLAN-001 |
| UIX-007 | Diseño final premium de Household/Members/Profile | P1 | UIX-003 |

#### Phase 2 — Auth/Household

| Issue | Título | Prioridad | Dependencias |
|-------|--------|-----------|--------------|
| AUTH-001 | Auditoría de restore session y marcado de legacy | P1 | — |

#### Phase 3 — RLS/Security

| Issue | Título | Prioridad | Dependencias |
|-------|--------|-----------|--------------|
| SEC-001 | Verificación de is_active_household_member() y tests de RLS | P0 | — |
| SEC-002 | Log mínimo de operaciones críticas | P2 | — |

#### Phase 4 — Planner

| Issue | Título | Prioridad | Dependencias |
|-------|--------|-----------|--------------|
| PLAN-001 | Conexión de HomeAdulto con planner real | P0 | SEC-001 |
| PLAN-002 | Decisión sobre Planner Goals | P1 | UIX-001 |

#### Phase 5 — Audit log

| Issue | Título | Prioridad | Dependencias |
|-------|--------|-----------|--------------|
| SEC-002 | Log mínimo de operaciones críticas | P2 | — |

#### Phase 6 — Realtime

| Issue | Título | Prioridad | Dependencias |
|-------|--------|-----------|--------------|
| RT-001 | Decisión sobre persistencia de Presence | P3 | — |

#### Phase 7 — Inventory audit

| Issue | Título | Prioridad | Dependencias |
|-------|--------|-----------|--------------|
| INV-001 | Auditoría y diseño de Inventory | P3 | — |

#### Phase 8 — Next module decision

| Issue | Título | Prioridad | Dependencias |
|-------|--------|-----------|--------------|
| NEXT-001 | Elegir próximo módulo después de Core UI/UX | P2 | UIX-005, UIX-006, UIX-007 |

#### Phase 9 — Legacy cleanup

| Issue | Título | Prioridad | Dependencias |
|-------|--------|-----------|--------------|
| CLEAN-001 | Marcado y documentación de legacy | P1 | AUTH-001 |

#### Phase 10 — Profile/Settings

| Issue | Título | Prioridad | Dependencias |
|-------|--------|-----------|--------------|
| PROF-001 | Auditoría de ProfileScreen y edición básica | P2 | UIX-003 |

---

**Fin del documento de decisiones semanales.**

---

## Verificación final

Al finalizar esta tarea PRO-002, deben existir:

```txt
docs/professionalization/00_current_state_deep_audit.md ✅ (ya existe)
docs/professionalization/01_weekly_correction_decisions.md ✅ (este documento)
docs/professionalization/02_sprint_working_rules.md ⏳ (siguiente)
```

Y deben responder:

- ✅ Qué se corrige esta semana: Core UI/UX, RLS, Planner conectado, HomeAdulto desbloqueado.
- ✅ Qué queda fuera: OAuth, Inventory, Finance, Geni, SOS, Realtime, borrar legacy.
- ✅ Qué orden seguimos: RLS → Planner → UI/UX → Auth hardening → Audit log → Decisiones.
- ✅ Qué entra en Phase 1: Auth, Home, Planner, Household/Members, Profile básico.
- ✅ Qué tareas iniciales van a Linear: UIX-001 a UIX-007, SEC-001, PLAN-001, AUTH-001, etc.
- ⏳ Qué reglas debe seguir Codex/OpenCode: Ver `02_sprint_working_rules.md`.
- ⏳ Cómo se verifica cada bloque: Ver `02_sprint_working_rules.md`.