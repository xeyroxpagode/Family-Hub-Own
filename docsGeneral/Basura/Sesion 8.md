\# PROMPT PARA CODEX — AUDITORÍA DE ESTADO ACTUAL ANTES DE IMPLEMENTAR PLANNER \#\# CONTEXTO Estoy por empezar la fase de implementación del módulo \*\*PLANNER\*\* de HomePlus. Ya tengo una especificación final llamada: `planner.md` Esa spec define el MVP real mínimo de Planner: \* Tasks reales. \* Events reales. \* Calendar mínimo. \* Conexión con Home. \* Services aislados. \* Feedback visual. \* Uso de `active_household`. \* Separación por household. \* Nada de features POST\_MVP innecesarias. Antes de implementar, necesito que audites el estado actual del proyecto y me devuelvas toda la información necesaria para poder convertir `planner.md` en prompts chicos de ejecución. \#\# IMPORTANTE NO implementes nada todavía. NO modifiques archivos. NO generes código nuevo. NO hagas refactors. NO cambies migraciones. NO borres archivos. Tu tarea es solamente inspeccionar el repo y devolver un diagnóstico técnico completo, con paths concretos, estado real y riesgos. Quiero que esta auditoría sea suficientemente completa para no tener que volver a preguntarte por contexto antes de ejecutar Planner. \--- \# OBJETIVO DE LA AUDITORÍA Necesito saber exactamente: 1\. Qué ya existe en backend relacionado con Planner. 2\. Qué ya existe en base de datos relacionado con Planner. 3\. Qué ya existe en frontend relacionado con Planner. 4\. Qué partes de Auth/Household/Members/Home ya están listas para conectar Planner. 5\. Qué endpoints, services, pantallas, tipos y navegación hay que crear o adaptar. 6\. Qué decisiones técnicas faltan antes de implementar. 7\. Qué riesgos reales tiene el repo. 8\. Qué orden de implementación conviene seguir. \--- \# ARCHIVOS / ÁREAS QUE DEBÉS INSPECCIONAR Buscá e inspeccioná, si existen: \#\# Backend \* `backend/` \* rutas Express \* controllers \* services \* middlewares de auth \* helpers Supabase \* rutas de households \* rutas de invite links \* rutas legacy \* cualquier archivo relacionado con: \* tasks \* events \* planner \* calendar \* responsibilities \* home \* dashboard \* summary \#\# Supabase / DB \* `supabase/migrations/` \* `supabase/seed.sql` si existe \* schemas actuales \* tablas existentes \* RPCs \* RLS policies \* enums \* funciones \* triggers Buscar específicamente: \* `tasks` \* `events` \* `responsibilities` \* `task_templates` \* `event_participants` \* `households` \* `household_members` \* `people` \* `active_household_id` \#\# Frontend \* `front/` \* `front/mi-front-limpio/` \* navegación \* contexts \* services \* screens \* components \* types Buscar específicamente: \* Planner \* Tasks \* Calendar \* Events \* Home \* Quick Actions \* More \* AuthContext \* HouseholdContext \* services API \* navegación Bottom Tabs \* pantallas mock existentes \#\# Config / tooling \* `package.json` \* scripts disponibles \* `.env.example` si existe \* configuración Expo \* configuración backend \* Supabase config \* tests existentes \* linters \* TypeScript config \--- \# QUÉ NECESITO QUE ME DEVUELVAS Respondé en español, con estructura clara y paths concretos. \#\# 1\. Resumen ejecutivo Decime en pocas líneas: \* estado general del repo; \* si Planner ya existe parcialmente o no; \* si backend está listo para Planner o hay que crearlo; \* si DB ya tiene tablas Planner o hay que migrarlas; \* si frontend ya tiene pantallas Planner o hay que construirlas; \* nivel de riesgo: bajo / medio / alto. \--- \#\# 2\. Estado real de Auth / Household necesario para Planner Necesito saber: \* cómo se obtiene el usuario autenticado actualmente; \* cómo se obtiene el access token en frontend; \* cómo se llama a `/api/auth/me`; \* dónde está guardado el resultado de `/me`; \* cómo se determina `active_household`; \* qué forma exacta tiene el objeto `me`; \* qué campo usar como `householdId` para Planner; \* qué pasa si el usuario no tiene household; \* qué pasa si el usuario tiene membership pending/rejected/finalized; \* qué middleware backend hay que usar para proteger rutas Planner. Incluí paths de archivos. \--- \#\# 3\. Estado real de Backend Planner Inspeccioná si existen rutas/endpoints para: \#\#\# Tasks \* listar tareas; \* crear tarea; \* detalle tarea; \* completar tarea; \* actualizar tarea; \* eliminar tarea; \* verificar tarea; \* listar responsibilities. \#\#\# Events \* listar eventos; \* crear evento; \* detalle evento; \* actualizar evento; \* cancelar evento; \* eliminar evento. \#\#\# Calendar / Home Summary \* endpoint de calendario combinado; \* endpoint de resumen para Home; \* endpoint dashboard/home que ya consuma tasks/events. Para cada cosa respondé en tabla: | Acción | Existe sí/no | Método/Ruta | Archivo | Estado | Problemas | | \------ | \------------ | \----------- | \------- | \------ | \--------- | Si no existe, decí exactamente qué habría que crear. \--- \#\# 4\. Estado real de Base de Datos / Supabase Inspeccioná migraciones y DB actual. Necesito saber si existen: \* tabla `tasks`; \* tabla `events`; \* tabla `responsibilities`; \* tabla `event_participants`; \* tabla `task_templates`; \* columnas necesarias para MVP; \* RLS policies; \* índices; \* constraints; \* enums; \* soft delete; \* campos de verification; \* campos de prioridad; \* campos de status; \* relación con `household_id`; \* relación con `household_members`; \* relación con `people`. Para cada tabla relevante devolvé: | Tabla | Existe | Campos principales | RLS | Problemas | Sirve para MVP | | \----- | \------ | \------------------ | \--- | \--------- | \-------------- | Además respondé: \* si `responsibility_id` es obligatorio; \* si hay seed de responsabilidades; \* si existe alguna responsibility default; \* si crear una task sería posible hoy sin agregar seed; \* si RLS bloquearía correctamente datos de otros households; \* si hay que crear migración nueva. \--- \#\# 5\. Estado real de Frontend Planner Inspeccioná si existen: \* pantalla Planner; \* pantalla Tasks; \* pantalla Calendar; \* pantalla Create Task; \* pantalla Task Detail; \* pantalla Create Event; \* pantalla Event Detail; \* components relacionados; \* services existentes; \* types existentes; \* mocks existentes; \* navegación hacia Planner; \* botón `+`; \* Quick Actions; \* integración con Home. Para cada pantalla/componente: | Elemento | Existe sí/no | Path | Estado | Sirve / reemplazar / adaptar | | \-------- | \------------ | \---- | \------ | \---------------------------- | También respondé: \* si Planner está en Bottom Nav; \* si Home ya tiene cards de tareas/eventos; \* si Home usa datos reales o mock; \* si hay pantalla More conectada; \* si hay UI mock que se puede reutilizar; \* si hay design system/componentes ya reutilizables. \--- \#\# 6\. Estado real de Services frontend Necesito saber qué services existen hoy. Buscar: \* `services/api.ts`; \* `services/households.ts`; \* `services/invitations.ts`; \* cualquier `tasksService`; \* cualquier `eventsService`; \* cualquier `plannerService`; \* cualquier `homeService`. Para cada service: | Service | Path | Funciones actuales | Usa token | Usa backend | Problemas | | \------- | \---- | \------------------ | \--------- | \----------- | \--------- | Decime exactamente qué services nuevos habría que crear según `planner.md`: \* `tasksService`; \* `eventsService`; \* `calendarService`; \* `plannerHomeService`. \--- \#\# 7\. Estado real de Home y conexión con Planner Inspeccioná Home. Necesito saber: \* dónde está la pantalla Home; \* qué cards muestra; \* si muestra tareas; \* si muestra eventos; \* si esos datos son reales o mock; \* si hay resumen del día; \* si hay Atención Requerida; \* si hay Próximos Eventos; \* si hay Tareas; \* qué habría que tocar para conectar Planner real; \* qué conviene dejar mock. Respondé con paths y recomendación. \--- \#\# 8\. Estado real de Members / People para asignar tareas Necesito saber: \* si existe endpoint para listar miembros del hogar; \* si existe service frontend para miembros; \* si existen tipos de member/person; \* si se puede mostrar nombre/avatar; \* si se puede elegir responsable al crear tarea; \* si hay que crear una consulta mínima para members; \* si `assigned_to` debería usar `person_id`, `member_id` o `household_member.id`. Este punto es crítico: decime cuál ID usa cada tabla actual y cuál debería usar Planner. \--- \#\# 9\. Comparación contra `planner.md` Compará el estado real del repo contra la spec. Devolvé una tabla: | Requisito de planner.md | Ya existe | Falta | Archivos a tocar | Riesgo | | \----------------------- | \--------- | \----- | \---------------- | \------ | Incluir como mínimo: \* usuario active puede ver Planner; \* crear tarea; \* listar tareas; \* completar tarea; \* crear evento; \* listar eventos; \* calendar día/semana; \* Home summary; \* services aislados; \* empty/loading/error states; \* separación por household; \* no acceso sin active household. \--- \#\# 10\. Pendientes técnicos bloqueantes Listá solo lo que puede bloquear implementación. Ejemplos: \* no existe tabla tasks; \* no existe responsibilities seed; \* no se sabe qué ID usar para assigned\_to; \* no existe Home real; \* active\_household no está disponible; \* no hay endpoint members; \* navegación Planner rota; \* conflictos entre legacy y final. Formato: | Bloqueante | Por qué bloquea | Solución mínima recomendada | | \---------- | \--------------- | \--------------------------- | \--- \#\# 11\. Riesgos de implementación Listá riesgos reales, no genéricos. Separar en: \#\#\# Riesgos backend \#\#\# Riesgos DB / RLS \#\#\# Riesgos frontend \#\#\# Riesgos de integración \#\#\# Riesgos para demo multi-dispositivo Para cada riesgo: | Riesgo | Probabilidad | Impacto | Mitigación mínima | | \------ | \------------ | \------- | \----------------- | \--- \#\# 12\. Plan recomendado de implementación Proponé un orden de ejecución en etapas chicas para implementar Planner. Cada etapa debe ser pequeña y testeable. Ejemplo de formato: \#\#\# P1 — DB Planner mínimo Objetivo: Archivos a tocar: Qué implementar: Qué NO implementar: Cómo probar: Criterio DONE: \#\#\# P2 — Backend Tasks ... Necesito que el plan esté pensado para que después yo pueda pedirte etapa por etapa. No implementes todavía. \--- \#\# 13\. Comandos de verificación disponibles Decime qué comandos debería correr para validar cada etapa: \* backend install; \* backend dev; \* backend tests si existen; \* frontend install; \* Expo; \* Supabase reset; \* Supabase lint; \* TypeScript; \* lint; \* tests; \* healthcheck. Formato: | Comando | Desde dónde correrlo | Para qué sirve | | \------- | \-------------------- | \-------------- | No inventes comandos si no están en package.json o config. Si asumís uno, marcá “asumido/no confirmado”. \--- \#\# 14\. Archivos más importantes para Planner Listá los archivos que probablemente habrá que tocar, separados por: \#\#\# Backend \#\#\# DB \#\#\# Frontend services \#\#\# Frontend screens \#\#\# Frontend navigation \#\#\# Home integration Para cada archivo: | Path | Por qué importa | Acción probable | | \---- | \--------------- | \--------------- | \--- \#\# 15\. Decisiones que necesitás que tome antes de implementar Listá solo decisiones reales que no puedas tomar con seguridad mirando el repo y `planner.md`. Ejemplos: \* usar `household_member.id` o `person.id` para `assigned_to`; \* crear responsibilities seed o permitir responsibility default; \* implementar verification en primera pasada o dejar visual; \* crear endpoint Home summary o componer en frontend; \* incluir vista Mes o no. Formato: | Decisión | Opciones | Recomendación | Impacto | | \-------- | \-------- | \------------- | \------- | \--- \#\# 16\. Conclusión operativa Cerrá con: \* si ya podemos empezar Planner; \* cuál debería ser la primera etapa; \* qué NO conviene tocar todavía; \* cuál es el camino más corto para una demo real multi-dispositivo. \--- \# REGLAS FINALES No implementes. No modifiques archivos. No hagas commits. No escribas código nuevo. No propongas arquitectura ideal. No metas POST\_MVP. No conviertas mocks visuales en backend real. No ocultes problemas. Sé muy concreto con paths reales y estado real. La respuesta debe dejarme listo para transformar `planner.md` en prompts chicos de implementación.  
Mostrar más  
lunes, 7:18 p.m.  
Procesado durante 5m 20s

**1\. Resumen Ejecutivo**

Estado general: el repo está funcional pero mezclado entre modelo legacy y modelo final de Auth/Household.

Planner existe parcialmente:

* DB: sí existen `tasks`, `events`, `schedules`, pero con modelo legacy `public.users/user_id`.  
* Backend: no existen endpoints Planner.  
* Frontend: sí hay UI/servicios parciales para tareas/eventos/calendario, pero consumen Supabase directo y usan IDs legacy.  
* Home: ya muestra tareas/eventos reales desde esos services, pero puede romper con usuarios del flujo final.

Riesgo general: **alto** para implementación directa, porque Planner debe alinearse con `people`, `active_household_id` y `household_members`, mientras las tablas Planner actuales quedaron en el contrato viejo.

Nota importante: no encontré `planner.md` en el workspace. Audito contra los requisitos que pegaste.

---

**2\. Auth / Household Real Para Planner**

Archivos clave:

* `C:\Users\thega\Desktop\HomePlus\backend\src\routes\auth.js`  
* `C:\Users\thega\Desktop\HomePlus\backend\src\controllers\auth.final.controller.js`  
* `C:\Users\thega\Desktop\HomePlus\backend\src\lib\me.service.js`  
* `C:\Users\thega\Desktop\HomePlus\backend\src\middleware\authFinalMiddleware.js`  
* `C:\Users\thega\Desktop\HomePlus\front\mi-front-limpio\context\AuthContext.tsx`  
* `C:\Users\thega\Desktop\HomePlus\front\mi-front-limpio\context\HouseholdContext.tsx`  
* `C:\Users\thega\Desktop\HomePlus\front\mi-front-limpio\services\api.ts`

Cómo funciona hoy:

* El usuario autenticado backend se obtiene con `authFinalMiddleware`, que lee `Authorization: Bearer <token>`, valida con Supabase Auth y setea `req.user` \+ `req.accessToken`.  
* El frontend obtiene el token desde `session.access_token` en `AuthContext`.  
* `/api/auth/me` se llama desde `getAuthMe(accessToken)` en `services/api.ts`.  
* El resultado de `/me` se guarda en `AuthContext` como `authMe`.  
* `active_household` viene de `people.active_household_id`, resuelto en `backend/src/lib/me.service.js`.  
* `HouseholdContext` expone `currentHousehold` desde `authMe.active_household`.

Forma real de `me`:

{  
  user,  
  person,  
  memberships,  
  active\_household,  
  navigation  
}

Campos importantes:

* `me.person.id`: `people.id`  
* `me.person.active_household_id`: household activo  
* `me.active_household.id`: **householdId recomendado para Planner**  
* `me.memberships[].id`: `household_members.id`  
* `me.memberships[].person_id`: `people.id`  
* `me.memberships[].role`: `coordinator | adult | adolescent | child | senior | guest`  
* `me.memberships[].status`: `pending | active | suspended | finalized`

Estados:

* Sin household: `navigation.next = create_or_join_household`.  
* Pending: `pending_approval`.  
* Suspended: `access_suspended`.  
* Finalized no se trata como membership viva.  
* Active \+ active\_household: entra a Home.  
* Active sin active\_household: fallback `select/set/repair_active_household`.

Middleware a usar para Planner:

* **Usar `authFinalMiddleware`**, no `authMiddleware`.  
* Después de validar token, las rutas Planner deben resolver `me/person/active_household` o consultar `people` por `req.user.id`.

---

**3\. Backend Planner**

No hay backend Planner real. No existen rutas `tasks`, `events`, `planner`, `calendar`, `home-summary`.

| Acción | Existe | Método/Ruta | Archivo | Estado | Problemas |
| ----- | ----- | ----- | ----- | ----- | ----- |
| Listar tareas | No | \- | \- | Crear | Hoy solo existe frontend directo a Supabase |
| Crear tarea | No | \- | \- | Crear | Debe usar `active_household` y `person/member` |
| Detalle tarea | No | \- | \- | Crear | No hay controller/service |
| Completar tarea | No | \- | \- | Crear | No hay endpoint de transición |
| Actualizar tarea | No | \- | \- | Crear | Definir permisos |
| Eliminar tarea | No | \- | \- | Crear | Definir hard/soft delete |
| Verificar tarea | No | \- | \- | Crear o postergar | DB actual no tiene campos verification |
| Listar responsibilities | No | \- | \- | Crear o eliminar del MVP | No existe tabla |
| Listar eventos | No | \- | \- | Crear | Solo frontend directo a Supabase |
| Crear evento | No | \- | \- | Crear | Debe usar household activo |
| Detalle evento | No | \- | \- | Crear | No hay controller/service |
| Actualizar evento | No | \- | \- | Crear | No hay endpoint |
| Cancelar evento | No | \- | \- | Crear si spec lo exige | DB no tiene `status/cancelled_at` |
| Eliminar evento | No | \- | \- | Crear | Hard delete actual en frontend |
| Calendar combinado | No | \- | \- | Crear | Debería combinar tasks/events |
| Home summary | No | \- | \- | Crear | Home compone en frontend |
| Dashboard/home con tasks/events | No backend | \- | \- | Parcial frontend | Home consume services directos |

Crear:

* `backend/src/routes/tasks.js`  
* `backend/src/controllers/tasks.controller.js`  
* `backend/src/services/tasks.service.js`  
* `backend/src/routes/events.js`  
* `backend/src/controllers/events.controller.js`  
* `backend/src/services/events.service.js`  
* Opcional: `backend/src/routes/planner.js` o `calendar.js`  
* Registrar rutas en `backend/index.js`.

---

**4\. Base de Datos / Supabase**

DB local consultada: Supabase está corriendo y las tablas están aplicadas.

| Tabla | Existe | Campos principales | RLS | Problemas | Sirve MVP |
| ----- | ----- | ----- | ----- | ----- | ----- |
| `people` | Sí | `id`, `auth_user_id`, `active_household_id` | Final activa | OK | Sí |
| `households` | Sí | legacy \+ `name`, `slug`, `created_by_person_id` | Final activa | Tiene columnas legacy y final mezcladas | Sí |
| `household_members` | Sí | legacy `user_id/rol` \+ final `person_id/role/status` | Final activa | Mezcla fuerte de modelos | Sí |
| `household_invite_links` | Sí | invite links finales | Final activa | OK | No Planner directo |
| `tasks` | Sí | `household_id`, `created_by`, `assigned_to`, `priority`, `status`, `due_date` | Legacy | FK a `public.users`, no `people` | No sin migrar |
| `events` | Sí | `household_id`, `created_by`, `assigned_to`, `start_at`, `end_at` | Legacy | FK a `public.users`, no `people`; sin status | No sin migrar |
| `schedules` | Sí | `household_id`, `user_id`, recurrence | Legacy | FK a `public.users` | No para Planner MVP final |
| `responsibilities` | No | \- | \- | Falta tabla/seed | No |
| `task_templates` | No | \- | \- | POST\_MVP o crear si spec exige | No |
| `event_participants` | No | \- | \- | Falta soporte multi-participante | No |

Respuestas puntuales:

* `responsibility_id` no existe, por lo tanto hoy no es obligatorio.  
* No hay `supabase/seed.sql`.  
* No hay seed de responsibilities.  
* No existe responsibility default.  
* Crear task hoy puede funcionar solo para usuarios legacy con fila en `public.users` y membership legacy `user_id`.  
* Para usuarios del flujo final, crear task probablemente falla por FK `tasks.created_by -> public.users(id)` o por RLS legacy.  
* RLS actual de `tasks/events` separa households solo en modelo legacy. En modelo final puede bloquear incluso datos propios.  
* Sí hace falta migración nueva para Planner final.

---

**5\. Frontend Planner**

| Elemento | Existe | Path | Estado | Acción |
| ----- | ----- | ----- | ----- | ----- |
| Pantalla Planner | No | \- | No hay tab Planner | Crear o renombrar Calendar según spec |
| Pantalla Tasks | No | \- | No existe lista dedicada | Crear |
| Pantalla Calendar | Sí | `C:\Users\thega\Desktop\HomePlus\front\mi-front-limpio\screens\calendar\CalendarScreen.tsx` | Funcional, mezcla schedules/events | Adaptar |
| Create Task | No | \- | Quick Action sin onPress | Crear |
| Task Detail | No | \- | No existe | Crear |
| Create Event | Parcial | `CalendarScreen.tsx` modal | Inserta evento directo Supabase | Adaptar |
| Event Detail | No | \- | Solo cards \+ delete | Crear |
| Components Planner | No separados | Dentro de Home/Calendar | Componentes inline | Extraer solo si ayuda |
| Services tasks/events | Sí | `services/tasks.ts`, `services/events.ts` | Directo Supabase legacy | Reemplazar contrato |
| Mocks | Sí | Home adulto/adolescente/adulto mayor | Activity/photos/challenges mock | Dejar mock si no es Planner |

Planner no está en Bottom Nav. Existe `CalendarTab`.  
Home ya tiene cards de tareas/eventos:

* `HomeCoordinador`: eventos de hoy \+ tareas pendientes.  
* `HomeAdulto`: agenda, tareas, semana.  
* `HomeAdolescente`: misiones/tareas \+ agenda.  
* `HomeAdultoMayor`: citas de hoy.

---

**6\. Services Frontend**

| Service | Path | Funciones | Usa token | Usa backend | Problemas |
| ----- | ----- | ----- | ----- | ----- | ----- |
| API base | `C:\Users\thega\Desktop\HomePlus\front\mi-front-limpio\services\api.ts` | auth, household, invite links | Sí | Sí | Bien para patrón nuevo |
| Households | `...\services\households.ts` | create household, legacy members | Parcial | Parcial | Mezcla final \+ legacy |
| Invitations | `...\services\invitations.ts` | invite links/join requests | Sí | Sí | Bastante alineado |
| Tasks | `...\services\tasks.ts` | list/my/create/complete/delete | No explícito | No | Directo Supabase legacy |
| Events | `...\services\events.ts` | list/today/my/create/delete | No explícito | No | Directo Supabase legacy |
| Schedules | `...\services\schedules.ts` | list/upsert/delete | No explícito | No | Legacy |
| Planner/Home | No | \- | \- | \- | Crear |

Crear según `planner.md`:

* `tasksService`: backend REST.  
* `eventsService`: backend REST.  
* `calendarService`: combinado día/semana.  
* `plannerHomeService`: resumen para Home.

---

**7\. Home y Conexión Planner**

Paths:

* `C:\Users\thega\Desktop\HomePlus\front\mi-front-limpio\screens\home\HomeCoordinador.tsx`  
* `C:\Users\thega\Desktop\HomePlus\front\mi-front-limpio\screens\home\HomeAdulto.tsx`  
* `C:\Users\thega\Desktop\HomePlus\front\mi-front-limpio\screens\home\HomeAdolescente.tsx`  
* `C:\Users\thega\Desktop\HomePlus\front\mi-front-limpio\screens\home\HomeAdultoMayor.tsx`

Estado:

* Home usa datos reales para tasks/events desde services directos.  
* Home usa mocks para actividad familiar, fotos, voice, challenges, budget, SOS/check-in.  
* `QuickActions` tiene `+ Tarea` y `+ Evento`, pero sin navegación real.  
* “Resumen de hoy”, “Próximos eventos”, “Tareas” existen visualmente.  
* Recomendación: conectar solo cards Planner reales y dejar mocks no Planner intactos.

---

**8\. Members / People Para Asignar Tareas**

Endpoint backend para listar miembros: no hay endpoint REST dedicado.

Frontend:

* `HouseholdContext` consulta vista Supabase `household_people_public`.  
* Esa vista devuelve `person_id`, `membership_id`, `display_name`, `avatar_url`, `role`, `status`.  
* Luego mapea a tipo legacy `HouseholdMember`:  
  * `id = membership_id`  
  * `user_id = person_id`  
  * `user.nombre = display_name`

IDs actuales:

* `people.id`: persona final.  
* `household_members.id`: membership final.  
* `household_members.person_id`: persona en hogar.  
* `tasks.created_by`: hoy `public.users.id` legacy.  
* `tasks.assigned_to`: hoy `public.users.id` legacy.  
* `events.created_by/assigned_to`: hoy `public.users.id` legacy.  
* `schedules.user_id`: legacy.

Recomendación Planner:

* `household_id`: `me.active_household.id`.  
* `created_by_person_id`: `me.person.id`.  
* `assigned_to_member_id`: `household_members.id`, nullable.  
* Para UI, mostrar nombre/avatar desde `household_people_public`.  
* Si querés menor cambio, usar `assigned_to_person_id`, pero requiere validar que esa persona tenga active membership en el household.

---

**9\. Comparación Contra planner.md / Requisitos Pegados**

| Requisito | Ya existe | Falta | Archivos a tocar | Riesgo |
| ----- | ----- | ----- | ----- | ----- |
| Usuario active puede ver Planner | Parcial vía HomeTabs | Tab/screen Planner real | navigation \+ screens | Medio |
| Crear tarea | Parcial frontend legacy | Backend \+ DB final | DB, backend, service, screen | Alto |
| Listar tareas | Parcial frontend legacy | Endpoint final | DB/backend/services | Alto |
| Completar tarea | Parcial frontend legacy | Endpoint final | backend/services/Home | Alto |
| Crear evento | Parcial modal legacy | Endpoint final | DB/backend/Calendar | Alto |
| Listar eventos | Parcial frontend legacy | Endpoint final | backend/services | Alto |
| Calendar día/semana | Parcial mes/día | Servicio final combinado | Calendar/service/backend | Medio |
| Home summary | Parcial compuesto en Home | Endpoint/service summary | backend \+ Home | Medio |
| Services aislados | Parcial | Services REST Planner | frontend services | Medio |
| Empty/loading/error | Parcial | Uniformar Planner | screens | Bajo |
| Separación household | DB legacy parcial | Final con active membership | DB/RLS/backend | Alto |
| No acceso sin active household | Auth sí | Planner guard específico | backend middleware/helper | Medio |

---

**10\. Pendientes Técnicos Bloqueantes**

| Bloqueante | Por qué bloquea | Solución mínima |
| ----- | ----- | ----- |
| `tasks/events` usan `public.users` | Flujo final crea `people`, no necesariamente `users` | Migrar Planner a `people/household_members` |
| No backend Planner | Spec pide services aislados/backend | Crear rutas/controllers/services |
| No `planner.md` en repo | No puedo validar campos exactos | Agregar spec o confirmar decisiones |
| No responsibilities | Si MVP las exige, no se puede crear task con responsibility real | Crear tabla/seed o quitar del MVP |
| No endpoint members | Crear tarea necesita responsables | Usar vista actual o endpoint mínimo |
| Quick Actions sin navegación | Demo no puede crear desde Home | Agregar stack screens |
| DB types desactualizados | `types/database.ts` refleja migrations 001-006 legacy | Actualizar tipos tras migración |
| RLS legacy en Planner | Puede bloquear usuarios finales | Rehacer policies con helpers finales |

---

**11\. Riesgos**

Backend:

| Riesgo | Probabilidad | Impacto | Mitigación |
| ----- | ----- | ----- | ----- |
| Copiar patrones legacy | Alta | Alto | Usar `authFinalMiddleware` \+ `people` |
| Duplicar lógica en frontend/backend | Media | Medio | Backend dueño del household activo |
| Falta validación de membership activa | Alta | Alto | Helper server `requireActiveHousehold` |

DB/RLS:

| Riesgo | Probabilidad | Impacto | Mitigación |
| ----- | ----- | ----- | ----- |
| RLS bloquea usuarios finales | Alta | Alto | Migrar policies a `is_active_household_member` |
| FK a `public.users` falla | Alta | Alto | FK a `people`/`household_members` |
| Sin soft delete/status eventos | Media | Medio | Definir mínimo: hard delete o `cancelled_at` |

Frontend:

| Riesgo | Probabilidad | Impacto | Mitigación |
| ----- | ----- | ----- | ----- |
| Home parece real pero falla al guardar | Alta | Alto | Cambiar services a backend |
| Tipos legacy inducen errores | Alta | Medio | Tipos Planner nuevos |
| No navegación create/detail | Alta | Medio | Stack Planner pequeño |

Integración:

| Riesgo | Probabilidad | Impacto | Mitigación |
| ----- | ----- | ----- | ----- |
| `user.id` vs `person.id` | Alta | Alto | Nombrar campos explícitamente |
| Multiple households | Media | Alto | Siempre backend usa active\_household |
| Pending members visibles | Media | Medio | Filtrar `status='active'` |

Demo multi-dispositivo:

| Riesgo | Probabilidad | Impacto | Mitigación |
| ----- | ----- | ----- | ----- |
| Un dispositivo crea y otro no ve | Media | Alto | Backend \+ refetch; realtime post-MVP |
| Datos cruzados por household | Baja/Media | Alto | RLS final \+ tests |
| Sesión expirada | Media | Medio | Manejo ApiError 401 |

---

**12\. Plan Recomendado**

**P1 — DB Planner mínimo final**  
Objetivo: alinear `tasks/events` con Auth final.  
Tocar: `supabase/migrations/new_planner.sql`.  
Implementar: columnas `created_by_person_id`, `assigned_to_member_id` o tablas nuevas limpias; RLS final; índices.  
No implementar: templates, IA, recurrencia compleja.  
Probar: `supabase db reset`, metadata, RLS básico.  
DONE: usuario active crea/lee solo su household.

**P2 — Backend Tasks**  
Tocar: backend routes/controllers/services.  
Implementar: list/create/detail/complete/update/delete mínimo.  
No: verification avanzada.  
Probar: requests con token real.  
DONE: Home puede listar y completar vía backend.

**P3 — Backend Events \+ Calendar**  
Implementar: list/create/detail/update/delete/cancel si se decide.  
Calendar: endpoint día/semana combinado.  
DONE: Calendar usa backend.

**P4 — Frontend Services Planner**  
Crear `tasksService`, `eventsService`, `calendarService`, `plannerHomeService` sobre `requestJson`.  
DONE: cero writes directos a Supabase para Planner.

**P5 — Screens Planner MVP**  
Crear lista tasks, create task, detail task, create event/detail event o adaptar Calendar modal.  
DONE: crear/listar/completar desde UI.

**P6 — Home Integration**  
Reemplazar llamadas actuales por `plannerHomeService`.  
DONE: Home muestra resumen real sin romper mocks no Planner.

**P7 — QA Multi-dispositivo**  
Dos usuarios, mismo household, pending/active, dos households.  
DONE: separación correcta y refetch visible.

---

**13\. Comandos de Verificación**

| Comando | Desde dónde | Para qué |
| ----- | ----- | ----- |
| `npm install` | `C:\Users\thega\Desktop\HomePlus\backend` | Instalar backend |
| `npm run dev` | backend | Backend watch |
| `npm start` | backend | Backend normal |
| `npm install` | `C:\Users\thega\Desktop\HomePlus\front\mi-front-limpio` | Instalar frontend |
| `npm start` | front | Expo |
| `npm run web` | front | Expo web |
| `npm run android` | front | Android |
| `npm run ios` | front | iOS |
| `supabase start` | repo root | Levantar Supabase local |
| `supabase db reset` | repo root | Reaplicar migraciones |
| `supabase db lint` | repo root | Lint DB |
| `supabase migration list` | repo root | Ver migraciones |
| `npx tsc --noEmit` | front | TypeScript, asumido/no script |
| `npx eslint .` | backend | ESLint, asumido/no script |
| `GET /` backend | backend corriendo | Healthcheck, asumido/no script |

No hay scripts de tests en `package.json`.

---

**14\. Archivos Más Importantes**

Backend:

| Path | Por qué | Acción |
| ----- | ----- | ----- |
| `C:\Users\thega\Desktop\HomePlus\backend\index.js` | Registro rutas | Agregar Planner |
| `C:\Users\thega\Desktop\HomePlus\backend\src\middleware\authFinalMiddleware.js` | Auth final | Reusar |
| `C:\Users\thega\Desktop\HomePlus\backend\src\lib\me.service.js` | active household | Reusar patrón |
| `C:\Users\thega\Desktop\HomePlus\backend\src\config\supabase.js` | Cliente token/admin | Reusar |

DB:

| Path | Por qué | Acción |
| ----- | ----- | ----- |
| `C:\Users\thega\Desktop\HomePlus\supabase\migrations\202606210004_tasks.sql` | Tasks legacy | Reemplazar/migrar |
| `C:\Users\thega\Desktop\HomePlus\supabase\migrations\202606210005_events.sql` | Events legacy | Reemplazar/migrar |
| `C:\Users\thega\Desktop\HomePlus\supabase\migrations\202606210009_auth_onboarding_final.sql` | Modelo final | Seguir contrato |

Frontend:

| Path | Por qué | Acción |
| ----- | ----- | ----- |
| `C:\Users\thega\Desktop\HomePlus\front\mi-front-limpio\services\tasks.ts` | Service legacy | Rehacer REST |
| `C:\Users\thega\Desktop\HomePlus\front\mi-front-limpio\services\events.ts` | Service legacy | Rehacer REST |
| `C:\Users\thega\Desktop\HomePlus\front\mi-front-limpio\screens\calendar\CalendarScreen.tsx` | UI calendar | Adaptar |
| `C:\Users\thega\Desktop\HomePlus\front\mi-front-limpio\navigation\types.ts` | Rutas | Agregar screens |
| `C:\Users\thega\Desktop\HomePlus\front\mi-front-limpio\navigation\HomeTabNavigator.tsx` | Bottom tabs | Decidir Planner/Calendar |
| `C:\Users\thega\Desktop\HomePlus\front\mi-front-limpio\screens\home\HomeCoordinador.tsx` | Home summary | Conectar backend |

---

**15\. Decisiones Antes de Implementar**

| Decisión | Opciones | Recomendación | Impacto |
| ----- | ----- | ----- | ----- |
| ID para asignación | `person_id` / `household_member.id` | `household_member.id` | Evita asignar fuera del household |
| Migrar tablas o crear nuevas | Alterar `tasks/events` / recrear | Migración conservadora | Menos ruptura |
| Responsibilities | Crear tabla / no MVP | No bloquear MVP; nullable o sin tabla | Reduce alcance |
| Verification | Real / visual | Visual o campo mínimo post-complete | Evita complejidad |
| Home summary | Backend / frontend compone | Backend endpoint | Mejor multi-dispositivo |
| Vista Mes | Sí / no | Reusar Calendar actual, priorizar día/semana | Menor alcance |

---

**16\. Conclusión Operativa**

Sí podemos empezar Planner, pero **no conviene implementar encima de los services legacy actuales**.

Primera etapa recomendada: **P1 — DB Planner mínimo final**, porque el bloqueo real está en IDs/FKs/RLS. Después backend Tasks, luego Events/Calendar, y recién ahí frontend.

No conviene tocar todavía:

* Feed, inventario, fotos, voice, challenges, SOS.  
* Schedules/rutinas salvo que `planner.md` las exija.  
* Refactors grandes de Home visual.

Camino más corto para demo real multi-dispositivo:

1. Migración Planner final por household activo.  
2. Backend tasks/events con `authFinalMiddleware`.  
3. Services frontend REST.  
4. Conectar Home \+ Calendar existente.  
5. Crear pantallas mínimas de crear/listar/completar.

