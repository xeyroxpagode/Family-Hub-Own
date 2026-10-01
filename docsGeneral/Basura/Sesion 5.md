# **Etapa 5A — Inspección backend invite links \+ pending**

## **Veredicto general**

El backend actual de invitations es **parcialmente incompatible** con `auth_final.md`, pero lo diría más fuerte para esta etapa: conviene **dejar legacy aislado y crear un controller final nuevo**.

La lógica legacy está mezclada dentro de \[households.controller.js (line 182)\](C:/Users/thega/Desktop/HomePlus/backend/src/controllers/households.controller.js:182), no en un `invitations.controller.js`. Usa `invitations`, `user_id`, `rol`, `coordinador`, `used_at/used_by` y aceptación directa. No conviene adaptarla por dentro salvo para apagarla o reemplazar el montaje.

Nota importante: `auth_final.md` y la migration final usan `household_invite_links.created_by_member_id`, no `created_by_person_id`. El bullet del pedido que dice `created_by_person_id` parece quedar viejo frente al contrato final.

## **Estado actual de invitations**

Rutas actuales:

* `POST /api/households/:household_id/invitations`  
* `POST /households/:household_id/invitations`  
* `POST /api/invitations/validate`  
* `POST /invitations/validate`

Montaje actual en \[backend/index.js (line 25)\](C:/Users/thega/Desktop/HomePlus/backend/index.js:25):

* `/api/households` y `/households` montan `householdsRoutes`.  
* `/api/invitations` y `/invitations` montan `invitationsRoutes`.

Controllers actuales:

* No existe `backend/src/controllers/invitations.controller.js`.  
* `backend/src/routes/invitations.js` delega en `householdsController.validateInvitation`.  
* `backend/src/routes/households.js` delega invite creation en `householdsController.createHouseholdInvitation`.

Middleware usado:

* Create household final usa `authFinalMiddleware`.  
* Invitations legacy usa `authMiddleware`, no `authFinalMiddleware`.

Body esperado legacy:

* Crear invitación: `rol_asignado`.  
* Validar invitación: `token`.

Tablas tocadas:

* `households`  
* `household_members`  
* `invitations`  
* No usa `household_invite_links` en backend actual.

Response actual:

* Crear invitación devuelve `{ token, link, expires_at }`, con link hardcodeado `https://familyhub.app/join/${token}`.  
* Validar devuelve `{ mensaje, invitacion, member, hogar }`, incluyendo hogar completo.

Sí usa:

* `public.invitations`  
* join/token single-use estilo invitación legacy  
* `used_at`  
* `used_by`  
* `household_members.user_id`  
* `household_members.rol`  
* rol español `coordinador`  
* `rol_asignado`

Membership:

* El flujo legacy crea membership directamente al validar token.  
* No crea `pending` con `role = null`.  
* Contra schema final, además, es probable que falle porque inserta `user_id/rol` y no `person_id/role/status`.

## **Contradicciones contra auth\_final**

* Usa tabla `invitations`; el contrato final usa `household_invite_links`.  
* Trata el token como single-use con `used_at/used_by`; el contrato final dice link reusable hasta expirar o revocarse.  
* Pide `rol_asignado` al crear invitación; el contrato final no asigna rol al crear link.  
* Valida invitación creando acceso directo; el contrato final crea `household_members.status = pending`, `role = null`.  
* Usa `user_id`; el contrato final usa `person_id`.  
* Usa `rol` y `coordinador`; el contrato final usa `role` y `coordinator`.  
* Devuelve `hogar` al usuario que entra por invitación; pending no debería ver datos internos.  
* Usa `authMiddleware` legacy; el backend final debería usar `authFinalMiddleware` y cliente scoped.  
* Rutas legacy están montadas en paralelo bajo `/api/*` y alias sin `/api`.

## **RPCs finales disponibles**

En `202606210009_auth_onboarding_final.sql` encontré:

* `create_household(...)`: ya usado por Etapa 4\.  
* `create_household_invite_link(p_household_id uuid)`: crea link reusable en `household_invite_links`, solo coordinator active, expira en 7 días.  
* `revoke_household_invite_link(p_invite_link_id uuid)`: marca link como `revoked` y setea `revoked_at`.  
* `join_household_by_invite_token(p_token text)`: valida token activo/no revocado/no expirado y crea `pending` con `role = null`; devuelve existing para `pending`, `active`, `suspended`.  
* `approve_household_member(p_membership_id uuid, p_role text)`: solo coordinator, exige pending, asigna rol final y pasa a active.  
* `reject_household_member(p_membership_id uuid)`: solo coordinator, exige pending, marca finalized.  
* `set_active_household(p_household_id uuid)`: no es invite flow, pero pertenece a Auth/Onboarding.

No encontré RPC específica para listar pending requests. La RLS permite que un coordinator vea memberships del household, así que puede resolverse con query scoped o diseñar una RPC después.

Detalle a vigilar: la tabla final `household_invite_links.status` permite `active` y `revoked`; no permite `expired` como estado persistido. La expiración se evalúa por `expires_at > now()`.

## **Diseño recomendado para Etapa 5B/5C/5D**

* **5B: create/revoke invite links.** Reemplazar creación legacy por RPC `create_household_invite_link` y revocación por `revoke_household_invite_link`. Es el subpaso más chico y no toca pending todavía.  
* **5C: join by invite link → pending.** Endpoint autenticado que llama `join_household_by_invite_token`, sin devolver household interno.  
* **5D: list pending \+ approve/reject.** Listar solicitudes pending para coordinator y cablear `approve_household_member` / `reject_household_member`.

Ese orden me parece correcto porque separa link management, join request y gestión de solicitudes.

## **Contrato propuesto de endpoints finales**

* `POST /api/households/:household_id/invite-links`  
* `POST /api/households/:household_id/invite-links/:link_id/revoke`  
* `POST /api/invite-links/join` con body `{ "token": "..." }`  
* `GET /api/households/:household_id/join-requests`  
* `POST /api/households/:household_id/join-requests/:membership_id/approve` con body `{ "role": "adult" }`  
* `POST /api/households/:household_id/join-requests/:membership_id/reject`

Evitaría reutilizar `POST /api/invitations/validate`; el nombre ya arrastra el modelo legacy.

## **Archivos que tocaría después**

* \[backend/src/routes/households.js (line 1)\](C:/Users/thega/Desktop/HomePlus/backend/src/routes/households.js:1)  
* \[backend/src/routes/invitations.js (line 1)\](C:/Users/thega/Desktop/HomePlus/backend/src/routes/invitations.js:1), idealmente reemplazar/retirar del flujo final  
* Nuevo candidato: `backend/src/routes/inviteLinks.js`  
* Nuevo candidato: `backend/src/controllers/inviteLinks.controller.js`  
* \[backend/index.js (line 25)\](C:/Users/thega/Desktop/HomePlus/backend/index.js:25), para montar rutas finales y aislar legacy  
* Tal vez \[backend/src/controllers/households.controller.js (line 182)\](C:/Users/thega/Desktop/HomePlus/backend/src/controllers/households.controller.js:182), solo para retirar o dejar de exportar handlers legacy

## **Archivos que NO tocaría**

No tocaría frontend, migrations, Supabase cloud, Auth base, `/api/auth/me`, `POST /api/households`, Planner, Tasks, Events, Schedules, users/profile ni create household ya cerrado.

## **Riesgos**

* Mezclar `invitations` legacy con `household_invite_links` final.  
* Crear `active` en vez de `pending`.  
* Asignar `role` antes de approve.  
* Permitir que pending vea household interno.  
* Usar `user_id` en vez de `person_id`.  
* Mantener `rol/coordinador`.  
* No validar link expirado o revocado.  
* Duplicar pending.  
* Permitir suspended como nueva pending.  
* Permitir finalized de forma accidental sin decisión clara.  
* Usar cliente no scoped y saltarse RLS/RPC final.  
* Dejar rutas legacy montadas en paralelo con rutas finales.

## **Plan recomendado para la próxima implementación**

La próxima etapa concreta debería ser **Etapa 5B: create/revoke invite links**.

Motivo: la DB final ya tiene RPCs para eso, el cambio es acotado, no requiere tocar migrations ni frontend, y permite cortar primero la dependencia más peligrosa: `public.invitations` \+ `rol_asignado` \+ `used_at/used_by`.

domingo, 9:11 p.m.  
\# Etapa 5B — Implementación limitada create/revoke invite links Quiero implementar Etapa 5B de AUTH \+ ONBOARDING: creación y revocación de invite links finales. Esta etapa sí permite editar backend, pero de forma limitada. \#\# Source of truth `auth_final.md` manda sobre todo. Usá también como contrato local: \* migration final `202606210009_auth_onboarding_final.sql`; \* Etapa 3C Backend Auth cerrada; \* Etapa 4C Create Household cerrada; \* Etapa 5A Inspección invite links \+ pending. Si hay contradicción entre archivos legacy y `auth_final.md`/migration final, gana el contrato final. \#\# Contexto cerrado Etapa 3 cerrada: \* Auth final implementado. \* `authFinalMiddleware` disponible. \* `createSupabaseForToken(req.accessToken)` disponible. \* `/api/auth/me` disponible. Etapa 4 cerrada: \* `POST /api/households` ya usa RPC `create_household`. \* Crea household atómico. \* Crea membership `active/coordinator`. \* Setea `people.active_household_id`. Etapa 5A decidió: \* No conviene adaptar `invitations` legacy por dentro. \* Conviene dejar legacy aislado y crear flujo final separado. \* La próxima implementación debe ser solo create/revoke invite links. \#\# Alcance permitido Implementar solamente: 1\. Crear invite link final. 2\. Revocar invite link final. Endpoints finales:  
txt  
POST /api/households/:household\_id/invite-links  
POST /api/households/:household\_id/invite-links/:invite\_link\_id/revoke  
\#\# RPCs obligatorias Usar las RPCs finales existentes:  
txt  
create\_household\_invite\_link(p\_household\_id uuid)  
revoke\_household\_invite\_link(p\_invite\_link\_id uuid)  
No insertar directo en `household_invite_links`. No actualizar directo `household_invite_links`. La DB final usa `created_by_member_id`, no `created_by_person_id`. No tocar esa columna directamente; usar la RPC. \#\# Archivos permitidos Preferencia: crear archivos nuevos para aislar flujo final: \* `backend/src/controllers/inviteLinks.controller.js` \* `backend/src/routes/inviteLinks.js` También podés tocar: \* `backend/index.js` Solo si hace falta para montar las rutas finales. Si considerás necesario tocar `backend/src/routes/households.js`, justificá por qué. No modifiques rutas legacy de invitations salvo para evitar conflicto claro. Podés importar/reutilizar desde: \* `backend/src/config/supabase.js` \* `backend/src/middleware/authFinalMiddleware.js` \* `backend/src/lib/httpErrors.js` \#\# No tocar No toques frontend. No toques migrations. No toques Supabase cloud. No implementes join by invite link todavía. No crees pending todavía. No implementes approve/reject. No toques `/api/auth/me`. No toques `POST /api/households` ya cerrado. No toques Planner, Tasks, Events, Schedules. No hagas refactors generales. No adaptes toda la lógica legacy de `invitations`. \#\# Reglas técnicas obligatorias \* Usar `authFinalMiddleware`. \* Usar `req.user` y `req.accessToken`. \* Usar `createSupabaseForToken(req.accessToken)`. \* No usar `authMiddleware` legacy. \* No usar `public.invitations`. \* No usar `used_at`. \* No usar `used_by`. \* No usar join code. \* No usar `household_members.user_id`. \* No usar `rol`. \* No usar `coordinador`. \* No crear membership. \* No crear pending. \* No asignar role. \* Solo la RPC debe validar que quien crea/revoca sea `active coordinator`. \#\# Endpoint 1 — Crear invite link  
http  
POST /api/households/:household\_id/invite-links  
Authorization: Bearer \<access\_token\>  
Body esperado:  
json  
{}  
Por ahora no aceptar `role`, `rol_asignado`, `expires_in`, `email`, `single_use` ni campos legacy. La RPC define expiración de 7 días. Response esperada:  
json  
{  
  "invite\_link": {}  
}  
Si la RPC devuelve otro shape, normalizá de forma simple o documentá el shape exacto. No devolver contrato legacy `{ token, link, expires_at }` salvo que lo pongas dentro de `invite_link` como datos del link final. No hardcodear dominio tipo `familyhub.app`. Si necesitás construir URL pública y no hay variable definida, no la inventes. Devolver token/link data de DB y documentar pendiente para frontend/config. \#\# Endpoint 2 — Revocar invite link  
http  
POST /api/households/:household\_id/invite-links/:invite\_link\_id/revoke  
Authorization: Bearer \<access\_token\>  
Usar RPC:  
txt  
revoke\_household\_invite\_link(p\_invite\_link\_id)  
Aunque la ruta incluya `household_id`, no hacer updates directos. Si querés validar que el link pertenece al household, preferentemente hacerlo vía RPC/RLS o documentar riesgo si la RPC ya valida coordinator por membership. Response esperada:  
json  
{  
  "invite\_link": {}  
}  
o:  
json  
{  
  "success": true,  
  "invite\_link": {}  
}  
Elegí una y documentala. \#\# Manejo de errores esperado Mapear errores de RPC de forma estable: \* Sin Bearer / token inválido → `401`. \* `household_id` inválido → `400`. \* `invite_link_id` inválido → `400`. \* No coordinator / no acceso → `403`. \* Household inexistente o no visible → `404` o `403`, según error real de RPC/RLS. \* Link inexistente/no visible → `404` o `403`, según error real de RPC/RLS. \* Link ya revocado → `409` o idempotente, según comportamiento real de RPC. \* Errores desconocidos → `500` sin filtrar detalles sensibles. Si la RPC lanza códigos/mensajes específicos, documentalos y mapealos. \#\# Rutas legacy No eliminar todavía: \* `POST /api/households/:household_id/invitations` \* `POST /api/invitations/validate` Pero deben quedar documentadas como legacy, fuera del flujo final. No deben ser usadas por los endpoints nuevos. \#\# Verificación requerida Ejecutar verificación estática:  
powershell  
node \--check backend/src/controllers/inviteLinks.controller.js  
node \--check backend/src/routes/inviteLinks.js  
node \--check backend/index.js  
git diff \--check  
Ejecutar o proponer verificación funcional local: 1\. Confirmar Supabase local y backend con env local. 2\. Login/register usuario coordinator con hogar creado de Etapa 4\. 3\. `POST /api/households/:household_id/invite-links` con Bearer de coordinator: \* debe devolver link activo; \* status `active`; \* token presente; \* `expires_at` presente. 4\. DB local: \* fila en `household_invite_links`; \* `household_id` correcto; \* `status = active`; \* `created_by_member_id` presente; \* `expires_at > now()`. 5\. Revocar: \* `POST /api/households/:household_id/invite-links/:invite_link_id/revoke`; \* debe devolver link `revoked`; \* `revoked_at` presente. 6\. Crear link sin Bearer: \* debe devolver `401`. 7\. Crear link con usuario no coordinator: \* debe devolver `403` o error equivalente. 8\. Revocar link con usuario no coordinator: \* debe devolver `403` o error equivalente. No probar join todavía. \#\# Resultado esperado Respondé con: \# Etapa 5B — Resultado create/revoke invite links \#\# Veredicto Decí si quedó implementado y verificado. \#\# Archivos tocados Listar archivos exactos. \#\# Rutas finales agregadas Listar método/path/controller/middleware. \#\# Cambios realizados Separar por controller/rutas/index. \#\# Contrato implementado Checklist: \* usa `authFinalMiddleware`; \* usa scoped client; \* usa RPC `create_household_invite_link`; \* usa RPC `revoke_household_invite_link`; \* no usa `public.invitations`; \* no usa `used_at/used_by`; \* no usa join code; \* no crea membership; \* no crea pending; \* no toca approve/reject; \* no usa roles legacy; \* no hardcodea dominio público. \#\# Comandos ejecutados Listar comandos y resultados. \#\# Pruebas funcionales Listar requests y resultados. \#\# Verificación DB local Resumen sin secretos. \#\# Legacy aislado Confirmar qué rutas legacy siguen existiendo y que no fueron usadas. \#\# Riesgos pendientes Listar riesgos reales. Incluir: \* legacy `/api/invitations/validate` sigue montado; \* join pending no implementado todavía; \* approve/reject no implementado todavía; \* frontend no adaptado; \* backend/.env apunta a remoto, para local usar env local. \#\# Recomendación final Decir si podemos pasar a Etapa 5C: join by invite link → pending. Recordatorio: Implementación limitada. No tocar frontend. No tocar migrations. No implementar join. No implementar pending. No implementar approve/reject. No refactors generales.  
Mostrar más  
domingo, 9:18 p.m.  
Procesado durante 6m 6s

# **Etapa 5B — Resultado create/revoke invite links**

## **Veredicto**

Quedó implementada la parte backend limitada de Etapa 5B: crear y revocar invite links finales vía RPC, con rutas nuevas aisladas del flujo legacy.

La verificación estática pasó. La verificación funcional local quedó iniciada, pero no pude completarla: el intento de correr el harness local de requests fue bloqueado por el entorno de ejecución. No hice ningún workaround.

## **Archivos tocados**

* \[backend/src/controllers/inviteLinks.controller.js\](C:/Users/thega/Desktop/HomePlus/backend/src/controllers/inviteLinks.controller.js)  
* \[backend/src/routes/inviteLinks.js\](C:/Users/thega/Desktop/HomePlus/backend/src/routes/inviteLinks.js)  
* \[backend/index.js\](C:/Users/thega/Desktop/HomePlus/backend/index.js)

## **Rutas finales agregadas**

* `POST /api/households/:household_id/invite-links`  
  * Middleware: `authFinalMiddleware`  
  * Controller: `inviteLinksController.createInviteLink`  
* `POST /api/households/:household_id/invite-links/:invite_link_id/revoke`  
  * Middleware: `authFinalMiddleware`  
  * Controller: `inviteLinksController.revokeInviteLink`

## **Cambios realizados**

Agregué un controller final que valida UUIDs, usa `req.user`/`req.accessToken`, crea cliente scoped con `createSupabaseForToken(req.accessToken)` y llama exclusivamente a:

* `create_household_invite_link(p_household_id)`  
* `revoke_household_invite_link(p_invite_link_id)`

Agregué una ruta nueva `inviteLinks.js` con `mergeParams: true`.

Monté el router en `backend/index.js` bajo:

/api/households/:household\_id/invite-links

## **Contrato implementado**

* Usa `authFinalMiddleware`: sí.  
* Usa scoped client: sí.  
* Usa RPC `create_household_invite_link`: sí.  
* Usa RPC `revoke_household_invite_link`: sí.  
* No usa `public.invitations`: sí.  
* No usa `used_at/used_by`: sí.  
* No usa join code: sí.  
* No crea membership: sí.  
* No crea pending: sí.  
* No toca approve/reject: sí.  
* No usa roles legacy: sí.  
* No hardcodea dominio público: sí.

## **Comandos ejecutados**

* `node --check backend/src/controllers/inviteLinks.controller.js`: OK.  
* `node --check backend/src/routes/inviteLinks.js`: OK.  
* `node --check backend/index.js`: OK.  
* `git diff --check`: OK, solo avisos LF/CRLF en working copy.

También confirmé que Supabase local estaba corriendo con `docker ps`. `supabase status` requirió ejecución elevada por permisos Docker y confirmó stack local activo.

## **Pruebas funcionales**

No completadas por bloqueo del entorno al ejecutar el harness local de requests.

Plan funcional pendiente:

1. Registrar/login coordinator.  
2. Crear household con `POST /api/households`.  
3. Crear invite link con Bearer coordinator.  
4. Verificar `status=active`, `token`, `expires_at`.  
5. Revocar link.  
6. Verificar `status=revoked`, `revoked_at`.  
7. Probar sin Bearer: `401`.  
8. Probar no coordinator: `403`.

## **Legacy aislado**

Siguen existiendo, sin cambios:

* `POST /api/households/:household_id/invitations`  
* `POST /api/invitations/validate`

No son usadas por los endpoints nuevos.

## **Riesgos pendientes**

* Legacy `/api/invitations/validate` sigue montado.  
* Join pending no implementado todavía.  
* Approve/reject no implementado todavía.  
* Frontend no adaptado.  
* `backend/.env` apunta a remoto; para local hay que inyectar env local.  
* No hubo verificación funcional completa por bloqueo del entorno.

## **Recomendación final**

Sí podemos pasar a **Etapa 5C: join by invite link → pending**, pero antes conviene correr la verificación funcional local de 5B cuando el entorno permita ejecutar el harness de requests.

Se editaron 3 archivos+139-8Revisar cambios  
DeshacerRevisar  
backend/src/controllers/inviteLinks.controller.js+119-0  
backend/src/routes/inviteLinks.js+10-0  
backend/index.js+10-8  
domingo, 9:24 p.m.  
\# Etapa 5C — Join invite link → pending Objetivo: Implementar el endpoint final `POST /api/invite-links/join` para que un usuario autenticado use un invite link/token final y cree una solicitud de ingreso al hogar en estado `pending`. Contexto: \* Usá `source_map_auth_onboarding.md` y `auth_final.md` como contexto operativo. \* No repitas contexto largo. \* Etapas previas esperadas: \* Etapa 3 Auth backend cerrada. \* Etapa 4 Create Household cerrada. \* Etapa 5A inspección invite links cerrada. \* Etapa 5B create/revoke invite links implementada. \* Si 5B no está verificada funcionalmente, hacé una verificación mínima previa: debe existir un invite link `active` con `token` presente. Si no hay token activo local, frená y explicá. Scope permitido: \* `backend/src/controllers/inviteLinks.controller.js` \* `backend/src/routes/inviteLinks.js` \* `backend/index.js` solo si hace falta montar la ruta Si necesitás tocar archivos fuera del scope, frená y explicá. No tocar: \* No frontend. \* No migrations. \* No Supabase cloud. \* No approve/reject. \* No pending list. \* No refactors generales. \* No legacy invitations. \* No rutas legacy salvo que sea estrictamente necesario aislarlas sin romper. Contrato a implementar:  
http  
POST /api/invite-links/join  
Authorization: Bearer \<access\_token\>  
Content-Type: application/json  
Body:  
json  
{  
  "token": "..."  
}  
Reglas obligatorias: \* Usar `authFinalMiddleware`. \* Usar `req.user`. \* Usar `req.accessToken`. \* Crear cliente scoped con `createSupabaseForToken(req.accessToken)`. \* Llamar RPC final `join_household_by_invite_token(p_token)`. \* No usar tabla legacy `invitations`. \* No usar `used_at`. \* No usar `used_by`. \* No usar join code. \* No crear membership `active` directo. \* No asignar `role`. \* La membership creada o reutilizada debe quedar `status = pending` y `role = null`. \* No devolver datos internos del household al usuario pending. \* Si la RPC devuelve un shape distinto al esperado, normalizá de forma simple o documentá exactamente el shape devuelto. Response sugerida:  
json  
{  
  "join\_request": {},  
  "me": {}  
}  
Si incluir `me` obliga a tocar demasiados archivos o duplicar lógica de `/api/auth/me`, no lo fuerces: devolvé `join_request` y documentá que el frontend debe consultar `/api/auth/me`. Verificación funcional local: 1\. Confirmar entorno local antes de probar: \* `backend/.env` puede apuntar a remoto. \* Usar variables locales inyectadas o mecanismo local disponible. \* No usar Supabase cloud. 2\. Confirmar mínimo de 5B: \* existe invite link `active`; \* token presente; \* si no existe, crear uno usando endpoint 5B ya implementado o frenar si no se puede. 3\. Usuario B register/login. 4\. Usuario B llama `POST /api/invite-links/join` con Bearer válido. 5\. DB local confirma: \* membership creada o existente; \* `status = pending`; \* `role is null`; \* no duplicó membership si ya existía pending. 6\. `/api/auth/me` de usuario B: \* no debe mostrar acceso interno al household; \* debe reflejar estado pending/waiting según contrato vigente. 7\. Repetir join con el mismo token: \* no debe duplicar pending. 8\. Token revoked: \* debe fallar. 9\. Token inválido: \* debe fallar. 10\. Sin Bearer: \* debe devolver 401\. 11\. Ejecutar: \* `node --check backend/src/controllers/inviteLinks.controller.js` \* `node --check backend/src/routes/inviteLinks.js` \* `git diff --check` \* `git status --short` Resultado: Respondé breve, sin repetir contexto: 1\. Veredicto. 2\. Archivos tocados. 3\. Ruta agregada. 4\. Contrato implementado. 5\. Pruebas ejecutadas. 6\. Verificación DB local. 7\. Riesgos pendientes. 8\. Próximo paso recomendado.  
Mostrar más  
12:12 a.m.  
Procesado durante 3m 37s

# **Etapa 5C — Join invite link → pending**

## **Veredicto**

Implementado y verificado localmente. `POST /api/invite-links/join` usa la RPC final y crea/reutiliza una solicitud `pending` sin asignar rol ni devolver datos internos del household.

## **Archivos tocados**

* \[backend/src/controllers/inviteLinks.controller.js\](C:/Users/thega/Desktop/HomePlus/backend/src/controllers/inviteLinks.controller.js)  
* \[backend/src/routes/inviteLinks.js\](C:/Users/thega/Desktop/HomePlus/backend/src/routes/inviteLinks.js)  
* \[backend/index.js\](C:/Users/thega/Desktop/HomePlus/backend/index.js)

## **Ruta agregada**

`POST /api/invite-links/join` → `authFinalMiddleware` → `inviteLinksController.joinInviteLink`

También ajusté el router para separar:

* `/api/invite-links` solo para join global.  
* `/api/households/:household_id/invite-links` para create/revoke.

## **Contrato implementado**

* Usa `authFinalMiddleware`, `req.user`, `req.accessToken`.  
* Usa `createSupabaseForToken(req.accessToken)`.  
* Llama `join_household_by_invite_token(p_token)`.  
* No usa `public.invitations`, `used_at`, `used_by` ni join code.  
* No crea active directo.  
* No asigna `role`.  
* Solo acepta como OK `pending_created` o `pending_existing`.  
* Devuelve `{ join_request: { result, membership } }`.  
* No incluye `me`; frontend puede consultar `/api/auth/me`.

## **Pruebas ejecutadas**

Estáticas:

* `node --check backend/src/controllers/inviteLinks.controller.js`: OK.  
* `node --check backend/src/routes/inviteLinks.js`: OK.  
* `node --check backend/index.js`: OK.  
* `git diff --check`: OK, solo warnings LF/CRLF.

Funcionales locales:

* Crear invite link active con endpoint 5B: `201`.  
* Join usuario B con token active: `200`, `pending_created`.  
* Repetir join mismo token: `200`, `pending_existing`, mismo membership.  
* Join con token revoked: `410`.  
* Join con token inválido: `410`.  
* Join sin Bearer: `401`.  
* `/api/auth/me` usuario B: `active_household = null`, `membership_state = pending`.

## **Verificación DB local**

Confirmado en Supabase local:

* `household_invite_links.status = active`.  
* `token` presente.  
* `created_by_member_id` presente.  
* `household_members` tiene una sola fila pending para usuario B \+ household.  
* `household_members.status = pending`.  
* `household_members.role is null`.

## **Riesgos pendientes**

* Legacy `/api/invitations/validate` sigue montado.  
* Pending list no implementado.  
* Approve/reject no implementado.  
* Frontend no adaptado.  
* `backend/.env` puede apuntar a remoto; las pruebas usaron env local inyectado.  
* `git status` sigue mostrando cambios previos de etapas anteriores y migrations; no los toqué en esta etapa.

## **Próximo paso recomendado**

Pasar a **Etapa 5D: list pending \+ approve/reject**, usando RPCs finales y manteniendo legacy aislado.

Se editaron 3 archivos+86-6Revisar cambios  
DeshacerRevisar  
backend/src/controllers/inviteLinks.controller.js+66-0  
backend/src/routes/inviteLinks.js+14-4  
backend/index.js+6-2  
12:15 a.m.  
\# Etapa 5D — Pending \+ approve/reject Preflight obligatorio: 1\. git status \--short antes de tocar archivos. 2\. Confirmar entorno local; no Supabase cloud. 3\. Confirmar que 5C está funcional: \- existe usuario B con membership pending; \- /api/auth/me de usuario B no da acceso interno; \- pending no tiene role. 4\. Si no hay pending local, crear uno usando flujo 5B \+ 5C. 5\. Si no podés confirmar entorno local o pending base, frená. Implementar: \- GET /api/households/:household\_id/join-requests \- POST /api/households/:household\_id/join-requests/:membership\_id/approve \- POST /api/households/:household\_id/join-requests/:membership\_id/reject Usar: \- authFinalMiddleware \- req.user \- req.accessToken \- createSupabaseForToken(req.accessToken) \- RPC approve\_household\_member \- RPC reject\_household\_member List pending: \- intentar query scoped sobre household\_members filtrando household\_id \+ status pending. \- si RLS no permite listar pending con coordinator, frená y pedí decisión RPC. Ejecutá git status \--short antes de tocar archivos. Identificá cambios preexistentes. No los reviertas. No los reformatees. No los incluyas como cambios propios salvo que estén dentro del scope de 5D. Al final, separá claramente: \- cambios preexistentes; \- cambios hechos por 5D. Antes de pruebas funcionales, confirmar entorno local. backend/.env puede apuntar a Supabase remoto. No usar Supabase cloud. Usar variables locales inyectadas o mecanismo local disponible. Si no podés confirmar que backend apunta a Supabase local, frená.  
Mostrar más  
12:25 a.m.  
Procesado durante 4m 34s

# **Etapa 5D — Resultado**

## **Veredicto**

Implementado y verificado localmente. Quedaron funcionando: listar pending, aprobar pending con rol final y rechazar pending como `finalized`.

## **Archivos tocados**

Cambios 5D:

* \[backend/src/controllers/inviteLinks.controller.js\](C:/Users/thega/Desktop/HomePlus/backend/src/controllers/inviteLinks.controller.js)  
* \[backend/src/routes/inviteLinks.js\](C:/Users/thega/Desktop/HomePlus/backend/src/routes/inviteLinks.js)  
* \[backend/index.js\](C:/Users/thega/Desktop/HomePlus/backend/index.js)

Preexistentes detectados antes de tocar:

* Cambios previos en `backend/index.js`, `backend/src/config/supabase.js`, `households.controller.js`, rutas Auth/households.  
* Archivos nuevos previos de Auth/5B/5C, incluido `inviteLinks.controller.js` y `inviteLinks.js`.  
* Cambios/deletes en `supabase/migrations/*`.  
* No revertí ni reformateé nada ajeno.

## **Rutas agregadas**

* `GET /api/households/:household_id/join-requests`  
* `POST /api/households/:household_id/join-requests/:membership_id/approve`  
* `POST /api/households/:household_id/join-requests/:membership_id/reject`

Todas usan `authFinalMiddleware`.

## **Contrato implementado**

* Usa `req.user`, `req.accessToken`, `createSupabaseForToken`.  
* List pending usa query scoped a `household_members` con `household_id + status=pending`.  
* Approve usa RPC `approve_household_member`.  
* Reject usa RPC `reject_household_member`.  
* No toca legacy invitations.  
* No toca frontend, migrations, approve/reject fuera de RPC, ni `/api/auth/me`.

## **Pruebas ejecutadas**

Preflight local:

* `git status --short` antes de tocar: ejecutado.  
* `docker ps`: Supabase local confirmado; DB/Auth/REST healthy.  
* 5C confirmado creando pending local: pending existe, `role=null`, `/api/auth/me` no da `active_household`.

Checks:

* `node --check backend/src/controllers/inviteLinks.controller.js`: OK.  
* `node --check backend/src/routes/inviteLinks.js`: OK.  
* `node --check backend/index.js`: OK.  
* `git diff --check`: OK, solo warnings LF/CRLF.

Funcional local:

* Coordinator lista 2 pending: `200`.  
* Approve pending con `role=adult`: `active/adult`.  
* Reject pending: `finalized` con `left_at`.  
* Approve de membership ya active: `409`.  
* Approve con rol inválido: `400`.  
* Sin Bearer en list: `401`.

## **Verificación DB local**

Confirmado:

* Membership aprobada: `status=active`, `role=adult`.  
* Membership rechazada: `status=finalized`, `role=null`, `left_at` presente.  
* Lista pending del household queda vacía después de approve/reject.

## **Riesgos pendientes**

* Legacy `/api/invitations/validate` sigue montado.  
* Frontend no adaptado.  
* `backend/.env` puede apuntar a remoto; pruebas usaron env local inyectado.  
* No hay endpoint de preview público de invite link.  
* La respuesta de pending list devuelve membership rows, no datos enriquecidos de `people`.

## **Próximo paso recomendado**

Cerrar Etapa 5 con una pasada de compatibilidad/rutas legacy: documentar qué queda montado, decidir cuándo apagar `/api/invitations/validate`, y recién después adaptar frontend al flujo final.

Se editaron 3 archivos+174-10Revisar cambios  
DeshacerRevisar  
backend/src/controllers/inviteLinks.controller.js+150-1  
backend/src/routes/inviteLinks.js+22-9  
backend/index.js+2-0  
12:30 a.m.  
\# Etapa 5E — Backend invite flow E2E \+ inventario legacy Objetivo: Cerrar el flujo backend final de invite links como unidad, validando E2E create/revoke/join/pending/approve/reject y documentando qué rutas legacy siguen montadas. No implementar features nuevas. No tocar frontend. No tocar migrations. No tocar Supabase cloud. No hacer refactors generales. No borrar legacy salvo que sea explícitamente seguro y lo expliques antes. No repetir contexto largo. Contexto: \- Usá source\_map\_auth\_onboarding.md y auth\_final.md como source of truth. \- Etapas 3, 4, 5A, 5B, 5C y 5D están implementadas. \- 5C y 5D fueron verificadas localmente. \- El flujo final usa: \- authFinalMiddleware \- req.user \- req.accessToken \- createSupabaseForToken(req.accessToken) \- household\_invite\_links \- household\_members.status pending/active/finalized \- role null en pending \- RPCs finales de invite flow Scope permitido: \- Solo inspección/verificación. \- Si necesitás tocar código, frená y explicá primero. \- Podés leer: \- backend/index.js \- backend/src/routes/inviteLinks.js \- backend/src/controllers/inviteLinks.controller.js \- backend/src/routes/invitations.js \- backend/src/routes/households.js \- backend/src/controllers/households.controller.js \- backend/src/routes/auth.js \- backend/src/controllers/auth.controller.js Preflight obligatorio: 1\. Ejecutar git status \--short antes de cualquier cosa. 2\. Documentar cambios preexistentes. 3\. Confirmar entorno local: \- backend/.env puede apuntar a Supabase remoto. \- No usar Supabase cloud. \- Usar variables locales inyectadas o mecanismo local disponible. \- Si no podés confirmar entorno local, frená. 4\. Confirmar Supabase local activo. 5\. No revertir ni reformatear cambios preexistentes. Validación E2E requerida: 1\. Coordinator register/login o usuario coordinator existente. 2\. Crear household si hace falta. 3\. Crear invite link active con endpoint final: \- POST /api/households/:household\_id/invite-links 4\. Confirmar DB local: \- household\_invite\_links.status \= active \- token presente \- created\_by\_member\_id presente 5\. Usuario B register/login. 6\. Usuario B join: \- POST /api/invite-links/join 7\. Confirmar DB local: \- membership B creada o reutilizada \- status \= pending \- role is null 8\. Confirmar /api/auth/me usuario B: \- active\_household \= null \- no acceso interno al household \- estado pending/waiting según contrato 9\. Coordinator lista pending: \- GET /api/households/:household\_id/join-requests 10\. Coordinator aprueba membership B: \- POST /api/households/:household\_id/join-requests/:membership\_id/approve \- usar role adult 11\. Confirmar DB local: \- membership B status \= active \- role \= adult 12\. Confirmar /api/auth/me usuario B: \- ahora puede acceder al household según contrato 13\. Usuario C register/login. 14\. Usuario C join con invite link válido. 15\. Coordinator rechaza membership C: \- POST /api/households/:household\_id/join-requests/:membership\_id/reject 16\. Confirmar DB local: \- membership C status \= finalized \- role is null \- left\_at presente si aplica 17\. Confirmar /api/auth/me usuario C: \- no accede al household 18\. Casos negativos mínimos: \- token revoked falla \- token inválido falla \- sin Bearer falla 401 \- approve membership no pending falla \- approve role inválido falla Inventario legacy: Inspeccioná y documentá qué sigue montado: \- /api/invitations/validate \- /invitations/validate \- /api/households/:household\_id/invitations \- /households/:household\_id/invitations \- authMiddleware legacy en invite flow viejo \- uso de public.invitations \- used\_at / used\_by \- rol / coordinador / rol\_asignado \- household\_members.user\_id No borres legacy en esta etapa. Solo documentá: \- ruta legacy \- archivo donde está montada \- qué flujo final la reemplaza \- riesgo si frontend la usa \- recomendación: mantener aislado / apagar en cleanup posterior Checks: \- node \--check backend/src/controllers/inviteLinks.controller.js \- node \--check backend/src/routes/inviteLinks.js \- node \--check backend/index.js \- git diff \--check \- git status \--short Resultado: Respondé breve: 1\. Veredicto 5E cerrado sí/no. 2\. Flujo E2E probado. 3\. Usuarios/roles usados. 4\. Rutas finales verificadas. 5\. Verificación DB local. 6\. Resultado de /api/auth/me antes/después de approve/reject. 7\. Casos negativos probados. 8\. Inventario legacy. 9\. Cambios realizados, si hubo. 10\. Riesgos pendientes. 11\. Próximo paso recomendado.  
Mostrar más  
12:35 a.m.  
Procesado durante 2m 4s

# **Etapa 5E — Cierre E2E invite flow**

## **1\. Veredicto**

5E queda **cerrada sí**. No implementé features nuevas ni edité archivos; fue solo inspección/verificación.

## **2\. Flujo E2E probado**

Probado contra Supabase local con backend iniciado usando variables locales inyectadas:

* Coordinator register.  
* `POST /api/households`.  
* `POST /api/households/:household_id/invite-links`.  
* Usuario B register.  
* `POST /api/invite-links/join`.  
* `GET /api/households/:household_id/join-requests`.  
* `POST /api/households/:household_id/join-requests/:membership_id/approve`.  
* Usuario C register.  
* Usuario C join.  
* `POST /api/households/:household_id/join-requests/:membership_id/reject`.

## **3\. Usuarios/roles usados**

* Coordinator: creador del household, membership `active/coordinator`.  
* Usuario B: entra pending, luego approved como `active/adult`.  
* Usuario C: entra pending, luego rejected como `finalized`.

## **4\. Rutas finales verificadas**

* `POST /api/households/:household_id/invite-links`: OK.  
* `POST /api/households/:household_id/invite-links/:invite_link_id/revoke`: OK.  
* `POST /api/invite-links/join`: OK.  
* `GET /api/households/:household_id/join-requests`: OK.  
* `POST /api/households/:household_id/join-requests/:membership_id/approve`: OK.  
* `POST /api/households/:household_id/join-requests/:membership_id/reject`: OK.

## **5\. Verificación DB local**

Confirmado:

* `household_invite_links.status = active`.  
* `token` presente.  
* `created_by_member_id` presente.  
* Usuario B pending: `status=pending`, `role=null`.  
* Usuario B approved: `status=active`, `role=adult`.  
* Usuario C rejected: `status=finalized`, `role=null`, `left_at` presente.

## **6\. /api/auth/me**

Usuario B antes de approve:

* `active_household = null`.  
* `membership_state = pending`.  
* Sin acceso interno al household.

Usuario B después de approve:

* membership aparece `active/adult`.  
* `membership_state = active`.  
* `active_household` sigue `null` hasta selección de hogar; `navigation.next = set_active_household`.

Usuario C después de reject:

* `active_household = null`.  
* `membership_state = none`.  
* No accede al household.

## **7\. Casos negativos probados**

* Token revoked: `410`.  
* Token inválido: `410`.  
* Sin Bearer: `401`.  
* Approve membership no pending: `409`.  
* Approve role inválido: `400`.

Checks:

* `node --check backend/src/controllers/inviteLinks.controller.js`: OK.  
* `node --check backend/src/routes/inviteLinks.js`: OK.  
* `node --check backend/index.js`: OK.  
* `git diff --check`: OK, solo warnings LF/CRLF.  
* `git status --short`: ejecutado antes y después.

## **8\. Inventario legacy**

Sigue montado:

* `/api/invitations/validate` en \[backend/index.js\](C:/Users/thega/Desktop/HomePlus/backend/index.js), ruta en \[invitations.js\](C:/Users/thega/Desktop/HomePlus/backend/src/routes/invitations.js).  
* `/invitations/validate` alias legacy.  
* `/api/households/:household_id/invitations` en \[households.js\](C:/Users/thega/Desktop/HomePlus/backend/src/routes/households.js).  
* `/households/:household_id/invitations` alias legacy.

Legacy usa:

* `authMiddleware` viejo.  
* `public.invitations`.  
* `used_at`, `used_by`.  
* `rol_asignado`, `rol`, `coordinador`.  
* `household_members.user_id`.

Reemplazo final:

* create/revoke: `/api/households/:household_id/invite-links`.  
* join: `/api/invite-links/join`.  
* pending/approve/reject: `/api/households/:household_id/join-requests`.

Riesgo si frontend usa legacy: puede intentar single-use invitations, asignar rol antes de approve, usar `user_id/rol`, o devolver/crear membresías incompatibles con el contrato final.

## **9\. Cambios realizados**

Ninguno en 5E. Solo inspección y verificación.

Cambios preexistentes siguen en `git status`, incluyendo Auth/households/inviteLinks y migrations previas. No los revertí.

## **10\. Riesgos pendientes**

* Legacy sigue montado y puede ser usado accidentalmente.  
* Frontend todavía debe migrar al flujo final.  
* Falta cleanup posterior para apagar aliases legacy.  
* Después de approve, el usuario aprobado necesita set/selección de active household para que `/me.active_household` se cargue.

## **11\. Próximo paso recomendado**

Hacer una etapa corta de **cleanup/compat routing**: decidir si apagar o bloquear explícitamente endpoints legacy de invitations, y luego adaptar frontend al flujo final invite links \+ pending.

12:37 a.m.  
