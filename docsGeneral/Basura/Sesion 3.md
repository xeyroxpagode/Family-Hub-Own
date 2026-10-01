# **Etapa 3A — Inspección backend Auth**

## **Veredicto General**

El backend actual es **reutilizable con cambios, pero parcialmente incompatible** con `auth_final.md`.

No requiere tirar todo, pero sí una **reescritura puntual del Auth backend** y una adaptación posterior de households/invitations. La infraestructura Express, rutas, middleware Bearer token y cliente Supabase sirven como base. El contrato de dominio actual, en cambio, sigue siendo legacy: `public.users`, `household_members.user_id`, `rol`, `invitations` y metadata de Supabase como perfil.

## **Estado Actual Del Backend Auth**

Endpoints actuales:

* `POST /api/auth/signup` en \[auth.js (line 6)\](C:/Users/thega/Desktop/HomePlus/backend/src/routes/auth.js:6)  
* `POST /api/auth/login` en \[auth.js (line 9)\](C:/Users/thega/Desktop/HomePlus/backend/src/routes/auth.js:9)  
* No existe `POST /api/auth/register`.  
* No existe `GET /api/auth/me`.  
* No existe `POST /api/auth/logout`.  
* No existe `POST /api/auth/refresh`.

Controller actual:

* \[auth.controller.js (line 8)\](C:/Users/thega/Desktop/HomePlus/backend/src/controllers/auth.controller.js:8) tiene `signUp`.  
* \[auth.controller.js (line 50)\](C:/Users/thega/Desktop/HomePlus/backend/src/controllers/auth.controller.js:50) tiene `login`.

Uso actual de Supabase Auth:

* Register actual usa `supabase.auth.signUp`.  
* Login usa `supabase.auth.signInWithPassword`.  
* Middleware usa `supabase.auth.getUser(token)` y deja `req.user = data.user` en \[authMiddleware.js (line 12)\](C:/Users/thega/Desktop/HomePlus/backend/src/middleware/authMiddleware.js:12).

Qué devuelve signup:

* `mensaje`  
* `usuario: data.user`  
* No devuelve `session`.  
* No crea `people`.  
* Guarda `nombre` en `user_metadata`.

Qué devuelve login:

* `mensaje`  
* `session`  
* `usuario`  
* No devuelve `person`, `memberships` ni `active_household`.

Config Supabase:

* Un solo cliente en \[supabase.js (line 18)\](C:/Users/thega/Desktop/HomePlus/backend/src/config/supabase.js:18).  
* Usa `SUPABASE_URL` y `SUPABASE_KEY`.  
* No separa cliente anon/auth de cliente service-role/admin.  
* Pero \[users.controller.js (line 140)\](C:/Users/thega/Desktop/HomePlus/backend/src/controllers/users.controller.js:140) ya usa `supabase.auth.admin.updateUserById`, así que el backend probablemente espera una key con privilegios altos.

## **Contradicciones Contra `auth_final`**

* Endpoint viejo `/signup`; contrato final pide `POST /api/auth/register`.  
* Register no crea `people`.  
* Register usa metadata como perfil (`nombre` en `user_metadata`).  
* Register no devuelve sesión de forma contractual.  
* No existe `/api/auth/me`.  
* No existe wrapper refresh/logout.  
* No hay contrato unificado para navegación inicial.  
* `users.controller.js` actualiza perfil en Supabase metadata, no en `people`.  
* Households usa rol español `coordinador` en \[households.controller.js (line 4)\](C:/Users/thega/Desktop/HomePlus/backend/src/controllers/households.controller.js:4).  
* Households usa `household_members.user_id` en \[households.controller.js (line 51)\](C:/Users/thega/Desktop/HomePlus/backend/src/controllers/households.controller.js:51).  
* Households inserta `rol`, no `role`, en \[households.controller.js (line 148)\](C:/Users/thega/Desktop/HomePlus/backend/src/controllers/households.controller.js:148).  
* Invitations usa tabla legacy `invitations`, no `household_invite_links`.  
* Invitation flow actual es single-use: marca `used_at` / `used_by`.  
* Join actual activa membership directa con rol asignado; contrato final exige `pending` sin rol.  
* `POST /api/households` actual crea household manualmente en tablas legacy, no usa RPC final `create_household`.  
* `POST /api/households/:household_id/invitations` contradice el modelo final de reusable invite links.

## **Diseño Recomendado Para Etapa 3B**

Implementar Auth final sin tocar frontend todavía, idealmente con cambios concentrados.

`POST /api/auth/register`:

* Validar `email`, `password`, `display_name`.  
* Password mínimo 8 según contrato.  
* Crear usuario con Supabase Auth.  
* Crear fila en `people` con:  
  * `auth_user_id = auth.users.id`  
  * `display_name`  
  * opcionales: `first_name`, `last_name`, `default_language`  
* No crear household.  
* No crear membership.  
* Devolver `{ user, person, session }`.  
* Si falla crear `people`, hacer rollback compensatorio borrando `auth.users` con admin client.

`POST /api/auth/login`:

* Usar `supabase.auth.signInWithPassword`.  
* Resolver `person` por `people.auth_user_id = user.id`.  
* Devolver `{ user, person, session }`, o idealmente incluir `me` completo reutilizando helper común.

`POST /api/auth/logout`:

* Wrapper sobre Supabase Auth.  
* Con access token del request, crear client scoped al token o usar método compatible.  
* Responder éxito idempotente.

`POST /api/auth/refresh`:

* Recibir `refresh_token`.  
* Usar `supabase.auth.refreshSession`.  
* Devolver nueva `session` y `user`.  
* Después opcionalmente devolver `me`.

`GET /api/auth/me`:

* Middleware Bearer actual sirve como base.  
* Resolver `user` desde token.  
* Resolver `person` desde `people.auth_user_id`.  
* Resolver memberships de esa person.  
* Resolver `active_household` solo si `active_household_id` apunta a una membership `active`.  
* Devolver estado de navegación.

Helpers necesarios:

* `getBearerToken(req)`.  
* `getAuthenticatedUser(token)`.  
* `getPersonByAuthUserId(authUserId)`.  
* `buildAuthMe(user)`.  
* `mapSupabaseAuthError(error)`.  
* `mapDbError(error)`.  
* Clientes separados:  
  * `supabaseAuth` / anon para Auth normal.  
  * `supabaseAdmin` / service-role para operaciones controladas backend.  
  * opcional `createUserScopedClient(accessToken)` para respetar RLS cuando convenga.

## **Contrato Propuesto Para `/api/auth/me`**

Forma base:

{  
  "user": {},  
  "person": {},  
  "memberships": \[\],  
  "active\_household": null,  
  "navigation": {  
    "auth": "authenticated",  
    "has\_person": true,  
    "has\_household": false,  
    "has\_active\_household": false,  
    "membership\_state": "none",  
    "next": "create\_or\_join\_household"  
  }  
}

Casos:

* Usuario autenticado sin `people`:  
  * `user` presente.  
  * `person: null`.  
  * `memberships: []`.  
  * `active_household: null`.  
  * `next: "complete_profile_repair"` o `"create_person_profile"`.  
  * HTTP 200 si se quiere permitir reparación; 409 si se considera estado corrupto.  
* Usuario con `people` sin household:  
  * `person` presente.  
  * `memberships: []`.  
  * `active_household: null`.  
  * `next: "create_or_join_household"`.  
* Membership `pending`:  
  * `memberships` incluye solo datos mínimos propios.  
  * No devolver datos internos del hogar.  
  * `active_household: null`.  
  * `next: "pending_approval"`.  
* Membership `active`:  
  * Devuelve memberships activas.  
  * Si `active_household_id` válido, devuelve `active_household`.  
  * `next: "home"` o `"household_onboarding"` según onboarding.  
* `active_household_id` null:  
  * Si hay una sola membership active, puede sugerir `next: "select_or_set_active_household"` o autocorregirse vía RPC aparte.  
  * Si hay varias active, `next: "select_household"`.  
* `active_household_id` inválido:  
  * No devolver hogar interno.  
  * `active_household: null`.  
  * `next: "select_household"`.  
  * Registrar como inconsistencia; no mutar silenciosamente en `/me` salvo decisión explícita.  
* Múltiples households:  
  * `memberships` lista todas las memberships de la person.  
  * `active_household` solo el seleccionado válido.  
  * `next: "home"` si hay activo válido; si no, `"select_household"`.  
* Suspended/finalized:  
  * `suspended`: no acceso al household; `next: "access_suspended"`.  
  * `finalized`: tratar como sin acceso; puede listarse como histórico mínimo o excluirse del default.  
  * Nunca usar `suspended` o `finalized` para `active_household`.

## **Archivos Que Tocaría En Etapa 3B**

* \[backend/src/controllers/auth.controller.js (line 1)\](C:/Users/thega/Desktop/HomePlus/backend/src/controllers/auth.controller.js:1)  
* \[backend/src/routes/auth.js (line 1)\](C:/Users/thega/Desktop/HomePlus/backend/src/routes/auth.js:1)  
* \[backend/src/middleware/authMiddleware.js (line 1)\](C:/Users/thega/Desktop/HomePlus/backend/src/middleware/authMiddleware.js:1)  
* \[backend/src/config/supabase.js (line 1)\](C:/Users/thega/Desktop/HomePlus/backend/src/config/supabase.js:1)  
* Posible nuevo helper: `backend/src/services/auth.service.js`  
* Posible nuevo helper: `backend/src/services/me.service.js`  
* Posible nuevo helper: `backend/src/utils/httpErrors.js`

Después de Auth, pero no necesariamente en 3B estricta:

* \[backend/src/controllers/households.controller.js (line 1)\](C:/Users/thega/Desktop/HomePlus/backend/src/controllers/households.controller.js:1)  
* \[backend/src/routes/households.js (line 1)\](C:/Users/thega/Desktop/HomePlus/backend/src/routes/households.js:1)  
* \[backend/src/routes/invitations.js (line 1)\](C:/Users/thega/Desktop/HomePlus/backend/src/routes/invitations.js:1)  
* \[backend/src/controllers/users.controller.js (line 1)\](C:/Users/thega/Desktop/HomePlus/backend/src/controllers/users.controller.js:1)

## **Archivos Que NO Tocaría**

* Frontend completo: `front/mi-front-limpio/**`.  
* Migrations Supabase.  
* `supabase/migrations/**`.  
* Planner.  
* Tasks.  
* Events.  
* Schedules.  
* Inventory.  
* Calendar.  
* Feed.  
* Home screens.  
* Prisma schema, salvo que se decida usar Prisma más adelante; hoy no aporta al flujo.

## **Riesgos**

* Si Supabase tiene email confirmation activa, `signUp` puede no devolver sesión; el contrato final espera sesión.  
* Crear `auth.users` \+ `people` no es una transacción real entre Auth y Postgres; hace falta rollback compensatorio.  
* El backend usa un único `SUPABASE_KEY`; conviene separar anon key y service-role.  
* `users.controller.js` todavía escribe metadata; chocará con `people` como perfil final.  
* RLS puede bloquear lecturas de `/me` si se usa cliente no autenticado o mal scoping del token.  
* Legacy tables siguen presentes; hay que evitar leer columnas viejas por accidente.  
* Households/invitations actuales romperán si se prueban contra el contrato final sin adaptación.  
* Errores Supabase/Postgres necesitan normalización para no filtrar detalles internos.

## **Plan Chico Para Etapa 3B**

1. Separar clientes Supabase en config: auth/anon, admin/service, y scoped client por access token.  
2. Crear helpers Auth: validar token, resolver user, resolver person.  
3. Cambiar `/signup` a `/register` o agregar `/register` manteniendo `/signup` solo temporalmente si hace falta compatibilidad.  
4. Implementar register final: Auth user \+ `people` \+ session \+ rollback.  
5. Implementar login final.  
6. Implementar `/api/auth/me` con helper común.  
7. Implementar refresh/logout wrappers.  
8. Agregar manejo consistente de errores.  
9. Verificar con Supabase local y requests HTTP.  
10. Recién después adaptar households/invite-links a RPCs finales.

## **Comandos De Verificación Propuestos**

cd C:\\Users\\thega\\Desktop\\HomePlus\\backend  
npm run dev  
curl \-i \-X POST http://localhost:3000/api/auth/register \`  
  \-H "Content-Type: application/json" \`  
  \-d '{"email":"test@example.com","password":"Password123","display\_name":"Test User"}'  
curl \-i \-X POST http://localhost:3000/api/auth/login \`  
  \-H "Content-Type: application/json" \`  
  \-d '{"email":"test@example.com","password":"Password123"}'  
curl \-i http://localhost:3000/api/auth/me \`  
  \-H "Authorization: Bearer \<access\_token\>"  
curl \-i \-X POST http://localhost:3000/api/auth/refresh \`  
  \-H "Content-Type: application/json" \`  
  \-d '{"refresh\_token":"\<refresh\_token\>"}'  
curl \-i \-X POST http://localhost:3000/api/auth/logout \`  
  \-H "Authorization: Bearer \<access\_token\>"

También validaría en DB local:

docker exec supabase\_db\_HomePlus psql \-U postgres \-d postgres \-c "select id, auth\_user\_id, display\_name from public.people order by created\_at desc limit 5;"

Conclusión: podemos avanzar a Etapa 3B con un cambio acotado de Auth backend. La parte delicada no es Express; es cortar limpiamente la dependencia de metadata/legacy y hacer que `/api/auth/me` sea la nueva fuente de verdad.

domingo, 7:46 p.m.  
\# Etapa 3B.1 — Implementación limitada Backend Auth base \+ /api/auth/me Quiero …  
Procesado durante 11m 11s

# **Etapa 3B.1 — Resultado Backend Auth base**

## **Veredicto**

Quedó **implementado y verificado localmente** el backend Auth base: `register`, `login`, `me`, `refresh` y `logout`.

No toqué frontend, migrations, households/invitations ni controllers legacy fuera de Auth. Ojo: `git status` sigue mostrando cambios previos de migrations/Supabase de Etapa 2, pero esta etapa solo modificó backend Auth/config/helpers.

## **Archivos tocados**

* \[backend/src/config/supabase.js\](C:/Users/thega/Desktop/HomePlus/backend/src/config/supabase.js)  
* \[backend/src/routes/auth.js\](C:/Users/thega/Desktop/HomePlus/backend/src/routes/auth.js)  
* \[backend/src/controllers/auth.final.controller.js\](C:/Users/thega/Desktop/HomePlus/backend/src/controllers/auth.final.controller.js)  
* \[backend/src/lib/auth.service.js\](C:/Users/thega/Desktop/HomePlus/backend/src/lib/auth.service.js)  
* \[backend/src/lib/me.service.js\](C:/Users/thega/Desktop/HomePlus/backend/src/lib/me.service.js)  
* \[backend/src/lib/httpErrors.js\](C:/Users/thega/Desktop/HomePlus/backend/src/lib/httpErrors.js)  
* \[backend/src/middleware/authFinalMiddleware.js\](C:/Users/thega/Desktop/HomePlus/backend/src/middleware/authFinalMiddleware.js)

## **Cambios realizados**

Config Supabase:

* Soporta `SUPABASE_URL`.  
* Soporta `SUPABASE_ANON_KEY`, con fallback a `SUPABASE_KEY`.  
* Soporta `SUPABASE_SERVICE_ROLE_KEY`.  
* Mantiene export `supabase` para compatibilidad legacy.  
* Agrega cliente scoped por Bearer token.

Endpoints:

* `POST /api/auth/register`: crea `auth.users` \+ `people`, no crea household ni membership.  
* `POST /api/auth/login`: autentica con Supabase y devuelve `user`, `person`, `session`, `me`.  
* `GET /api/auth/me`: devuelve `user`, `person`, `memberships`, `active_household`, `navigation`.  
* `POST /api/auth/refresh`: refresca sesión con `refresh_token`.  
* `POST /api/auth/logout`: wrapper idempotente sobre Supabase scoped signOut.

## **Contrato implementado**

* register: sí.  
* login: sí.  
* me: sí.  
* refresh: sí.  
* logout: sí.  
* people: sí, vía `people.auth_user_id`.  
* no household en register: confirmado.  
* no membership en register: confirmado.

## **Comandos ejecutados**

* `node --check` sobre config, controller, helpers, middleware y routes: OK.  
* `supabase status`: OK con escalación local para Docker.  
* Backend levantado contra Supabase local en job PowerShell: OK.  
* Consulta DB local:  
  * `select id, auth_user_id, display_name from public.people order by created_at desc limit 5;`  
  * Resultado: fila creada con `display_name = Auth 3B1 Test`.

## **Pruebas manuales**

Probé contra `http://localhost:3000`:

* `POST /api/auth/register`: OK, devolvió `user`, `person`, `session`, `requires_email_confirmation=false`.  
* `POST /api/auth/login`: OK, devolvió `session` y `me.navigation.next=create_or_join_household`.  
* `GET /api/auth/me`: OK, `memberships=0`, `active_household=null`, `next=create_or_join_household`.  
* `POST /api/auth/refresh`: OK, devolvió nueva sesión.  
* `POST /api/auth/logout`: OK, `{ success: true }`.

## **Riesgos pendientes**

* Si no existe `SUPABASE_SERVICE_ROLE_KEY` y Supabase no devuelve session por email confirmation, register no puede crear `people`; devuelve error claro.  
* `auth.controller.js` legacy quedó en repo, pero ya no lo usa `routes/auth.js`.  
* `users.controller.js` todavía actualiza metadata Supabase, no `people`.  
* Households/invitations siguen legacy y todavía usan `user_id`, `rol`, `invitations`.

## **Pendientes para Etapa 3B.2**

* Adaptar households a RPC `create_household`.  
* Adaptar invite links a `household_invite_links`.  
* Implementar approve/reject final.  
* Adaptar frontend `AuthContext`.  
* Migrar profile/users controller a `people`.  
* Cleanup legacy: `/signup`, metadata, `public.users`, `invitations`, roles españoles.

Vista previa webSitio webAbrir en Codex BrowserAbrir en  
Se editaron 9 archivos+714-136Revisar cambios  
DeshacerRevisar  
backend/src/config/supabase.js+42-15  
backend/src/lib/auth.service.js+122-0  
backend/src/lib/httpErrors.js+17-0  
Mostrar 6 archivos más  
domingo, 8:00 p.m.  
decime todas las claves que necesitas para el env y yo las recolecto  
domingo, 8:03 p.m.

Para este backend Auth base, juntá estas claves:

SUPABASE\_URL=  
SUPABASE\_ANON\_KEY=  
SUPABASE\_SERVICE\_ROLE\_KEY=  
PORT=3000

Opcional por compatibilidad legacy:

SUPABASE\_KEY=

Notas rápidas:

* `SUPABASE_URL`: URL del proyecto Supabase.  
* `SUPABASE_ANON_KEY`: publishable/anon key, usada para Auth normal.  
* `SUPABASE_SERVICE_ROLE_KEY`: secret/service-role key, necesaria para rollback y operaciones backend controladas.  
* `SUPABASE_KEY`: solo fallback viejo; si ya ponés `SUPABASE_ANON_KEY`, no hace falta.  
* No mandes estas claves por chat si son de producción; pegarlas en `backend/.env` alcanza.

domingo, 8:03 p.m.  
SUPABASE\_URL=https://pkidoxngqdwoummbdlop.supabase.co SUPABASE\_ANON\_KEY=sb\_publishable\_rlsJn\_PY19nGQw83ReDVBQ\_ErcW-13I SUPABASE\_SERVICE\_ROLE\_KEY=sb\_secret\_AXFQI4qfU09So3Ju088tzQ\_5j4-\_qh5 PORT=3000 SUPABASE\_JWKS\_URL=https://pkidoxngqdwoummbdlop.supabase.co/auth/v1/.well-known/jwks.json esas son todas las q necesitas?  
domingo, 8:07 p.m.  
Procesado durante 7s

Sí, para **Etapa 3B.1 Auth backend** esas alcanzan.

Necesarias:

SUPABASE\_URL=...  
SUPABASE\_ANON\_KEY=...  
SUPABASE\_SERVICE\_ROLE\_KEY=...  
PORT=3000

`SUPABASE_JWKS_URL` no la usa el backend actual que implementé, porque validamos token con `supabase.auth.getUser(token)`. Podés dejarla en `.env` igual; no molesta.

No necesitás `SUPABASE_KEY` si ya tenés `SUPABASE_ANON_KEY`.

Importante: como pegaste `SUPABASE_SERVICE_ROLE_KEY` acá, si esa key es de un proyecto real/producción, yo la rotaría después en Supabase. Esa key tiene privilegios altos.

domingo, 8:07 p.m.  
SUPABASE\_SECRET\_KEY= esta es la key q pegue en SUPABASE\_SERVICE\_ROLE\_KEY es la misma?  
domingo, 8:08 p.m.  
Procesado durante 9s

Sí: por el prefijo `sb_secret_...`, esa es la **secret/server key** de Supabase, y para nuestro backend cumple el rol que pusimos como:

SUPABASE\_SERVICE\_ROLE\_KEY=sb\_secret\_...

Pero ojo con el nombre de variable: el código actual lee `SUPABASE_SERVICE_ROLE_KEY`, no `SUPABASE_SECRET_KEY`.

Entonces dejalo así:

SUPABASE\_SERVICE\_ROLE\_KEY=tu\_sb\_secret

No hace falta duplicarla como `SUPABASE_SECRET_KEY`, salvo que después queramos agregar compatibilidad con ese nombre también.

domingo, 8:08 p.m.  
y esto en que ubicacion lo tengo q pegar?  
domingo, 8:09 p.m.

Pegalo en un archivo `.env` dentro de la carpeta del backend:

C:\\Users\\thega\\Desktop\\HomePlus\\backend\\.env

Contenido:

SUPABASE\_URL=https://pkidoxngqdwoummbdlop.supabase.co  
SUPABASE\_ANON\_KEY=...  
SUPABASE\_SERVICE\_ROLE\_KEY=...  
PORT=3000  
SUPABASE\_JWKS\_URL=https://pkidoxngqdwoummbdlop.supabase.co/auth/v1/.well-known/jwks.json

El `index.js` ya hace `require('dotenv').config()`, así que al correr desde `backend` con:

cd C:\\Users\\thega\\Desktop\\HomePlus\\backend  
npm run dev

debería cargar ese `.env`.

También revisá que `backend\.env` no se commitee. Debería estar ignorado; si no, lo agregamos al `.gitignore`.

domingo, 8:09 p.m.  
