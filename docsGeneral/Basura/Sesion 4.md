Voy a hacer solo lectura del repo y armar el diagnóstico contra `auth_final.md`. No voy a tocar archivos ni correr nada mutante; primero ubico contrato, rutas y usos legacy.

Se ejecutaron 3 comandos

Encontré que `auth_final.md` no está en la raíz con ese nombre, así que voy a buscarlo por contenido/nombre y leer los módulos backend relevantes. El primer barrido ya muestra señales legacy fuertes en `households.controller.js`, pero necesito precisar líneas y contrato final antes del veredicto.

Se ejecutaron 5 comandos

La ruta actual está montada con `authMiddleware` legacy y el controller crea hogar/membership directamente. Ahora voy a leer los servicios Auth final, `/me`, config Supabase y la migration final para reconstruir el contrato aunque el markdown fuente no exista en el checkout.

Se ejecutaron 6 comandos

El “source of truth” local que sí está presente para el modelo final es `supabase/migrations/202606210009_auth_onboarding_final.sql`, además de `me.service.js`. Voy a inspeccionar esa función RPC y constraints para no inventar contrato.

Se ejecutaron 13 comandos

La RPC final ya está clara: `create_household(text,text,text,text,jsonb)` normaliza slug, crea household, membership `coordinator/active`, setea `people.active_household_id`, y devuelve JSONB. Me falta una pasada de rutas/montaje y scripts para proponer verificaciones concretas sin asumir demasiado.

Se ejecutaron 4 comandos

Hago una última búsqueda amplia por `auth_final.md` incluyendo carpetas ocultas para dejar explícito si falta en el workspace. Después cierro con el informe de Etapa 4A y un plan 4B implementable, sin ejecutar cambios.

Se ejecutaron 3 comandos  
Plan

# **Etapa 4A \- Inspección Backend Create Household**

## **Veredicto General**

El backend actual de households es **parcialmente incompatible** con `AUTH + ONBOARDING final` y conviene una **reescritura puntual de `POST /api/households`**, no una reescritura global del módulo.

Nota: no encontré `auth_final.md` en el workspace. El contrato final local verificable está en \[202606210009\_auth\_onboarding\_final.sql (line 1)\](C:/Users/thega/Desktop/HomePlus/supabase/migrations/202606210009\_auth\_onboarding\_final.sql:1), \[auth.final.controller.js (line 1)\](C:/Users/thega/Desktop/HomePlus/backend/src/controllers/auth.final.controller.js:1) y \[me.service.js (line 1)\](C:/Users/thega/Desktop/HomePlus/backend/src/lib/me.service.js:1).

## **Estado Actual De Create Household**

* Endpoint montado como `POST /api/households` y alias legacy `POST /households` en \[backend/index.js (line 26)\](C:/Users/thega/Desktop/HomePlus/backend/index.js:26).  
* Ruta: \[households.js (line 7)\](C:/Users/thega/Desktop/HomePlus/backend/src/routes/households.js:7) usa `authMiddleware` legacy.  
* Controller: \[households.controller.js (line 105)\](C:/Users/thega/Desktop/HomePlus/backend/src/controllers/households.controller.js:105).  
* Body actual: `{ "nombre": "...", "tipo": "nucleo|abuelos|separados" }`.  
* Tablas tocadas: `households` con `nombre`, `tipo`, `created_by`; luego `household_members` con `household_id`, `user_id`, `rol`.  
* Respuesta actual: `{ hogar, member }`.  
* No crea invitación legacy durante `createHousehold`, pero el mismo controller sí contiene lógica legacy de `invitations`.  
* Sí usa `user_id`, `rol` y `coordinador`.

## **Contradicciones Contra Contrato Final**

* Usa middleware legacy \[authMiddleware.js (line 3)\](C:/Users/thega/Desktop/HomePlus/backend/src/middleware/authMiddleware.js:3), no \[authFinalMiddleware.js (line 3)\](C:/Users/thega/Desktop/HomePlus/backend/src/middleware/authFinalMiddleware.js:3).  
* Valida token, pero las escrituras usan el cliente Supabase global sin `Authorization` scoped por usuario; la RPC final necesita JWT para resolver `effective_uid()`.  
* Inserta directo en tablas; no usa RPC `public.create_household(...)`.  
* No es atómico: usa compensación manual con delete si falla membership.  
* Usa `public.users` indirectamente por `created_by: userId` y `household_members.user_id`.  
* Usa `rol = "coordinador"`; el final exige `role = "coordinator"`.  
* No usa `people`, `person_id`, `created_by_person_id`.  
* No setea `people.active_household_id`.  
* No garantiza `status = "active"` ni `joined_at` según contrato final; la RPC sí.  
* Body legacy `nombre/tipo` contradice `name/slug/timezone/default_language/config`.  
* Response legacy `hogar/member` contradice `household/membership/person/me`.

## **Diseño Recomendado Para Etapa 4B**

* Mantener endpoint final `POST /api/households`.  
* Cambiar solo la ruta `POST /` de households para usar `authFinalMiddleware`; dejar invitaciones legacy como están por ahora.  
* En el controller:  
  * Leer `req.user` y `req.accessToken` desde middleware final.  
  * Crear client scoped con `createSupabaseForToken(req.accessToken)`.  
  * Validar body mínimo en backend.  
  * Llamar RPC `create_household` con `p_name`, `p_slug`, `p_timezone`, `p_default_language`, `p_config`.  
  * Responder `201` con `household`, `membership`, `person`, `me`.  
  * Construir `me` llamando `buildMe({ user: req.user, accessToken: req.accessToken })` después de la RPC.

La RPC final ya normaliza slug, crea household, crea membership `coordinator/active`, setea `joined_at`, setea `people.active_household_id` y devuelve JSONB.

## **Contrato Request/Response Propuesto**

Request final:

{  
  "name": "Casa Garcia",  
  "slug": "casa-garcia",  
  "timezone": "America/Argentina/Buenos\_Aires",  
  "default\_language": "es-419",  
  "config": {}  
}

Decisiones:

* `name` requerido, string trim no vacío.  
* `slug` opcional. Si falta o viene vacío, backend manda `null` y la RPC lo deriva desde `name`.  
* La normalización de slug queda en la RPC `normalize_slug`; backend solo trim/nullable.  
* `timezone` opcional, default `America/Argentina/Buenos_Aires`.  
* `default_language` opcional, default `es-419`.  
* `config` opcional, debe ser objeto JSON plano; default `{}`.  
* No aceptar `nombre`/`tipo` como alias en esta etapa para evitar arrastrar contrato legacy.

Response final:

{  
  "household": {},  
  "membership": {},  
  "person": {},  
  "me": {}  
}

Sobre `/api/auth/me`: con el código actual, después de crear hogar debe devolver `active_household` no null, membership `active`, `has_active_household: true`. El `next` esperado por `me.service.js` será `household_onboarding` salvo que `household_onboarding_status` sea `completed`; esto califica como “estado equivalente” sin tocar `/me`.

## **Archivos Que Tocaría En Etapa 4B**

* \[backend/src/routes/households.js (line 1)\](C:/Users/thega/Desktop/HomePlus/backend/src/routes/households.js:1)  
* \[backend/src/controllers/households.controller.js (line 1)\](C:/Users/thega/Desktop/HomePlus/backend/src/controllers/households.controller.js:1)

Usaría funciones ya existentes de:

* \[backend/src/config/supabase.js (line 31)\](C:/Users/thega/Desktop/HomePlus/backend/src/config/supabase.js:31)  
* \[backend/src/lib/me.service.js (line 109)\](C:/Users/thega/Desktop/HomePlus/backend/src/lib/me.service.js:109)  
* \[backend/src/lib/httpErrors.js (line 1)\](C:/Users/thega/Desktop/HomePlus/backend/src/lib/httpErrors.js:1)

## **Archivos Que NO Tocaría**

* Frontend completo.  
* Migrations.  
* Supabase cloud.  
* `routes/invitations.js`.  
* Invite links, approve/reject, join/reject flows.  
* Users profile.  
* Planner, Tasks, Events, Schedules.  
* Auth base endpoints ya cerrados, salvo imports reutilizados.

## **Riesgos**

* Mezclar middleware legacy y final dentro de `households.js`.  
* Usar accidentalmente `user_id` en vez de `person_id`.  
* Crear o modificar invitaciones legacy por tocar demasiado el controller.  
* Devolver una response que frontend o `/me` no puedan reconciliar.  
* Llamar RPC con cliente global sin JWT scoped y recibir `not_authenticated`.  
* `person_not_found` si register/login no creó `people`.  
* Conflicto de slug por índice único `households_slug_unique`.  
* `next` post-create puede ser `household_onboarding`, no `home`, por diseño actual de `me.service.js`.

## **Plan Chica Para Etapa 4B**

1. Cambiar solo `POST /api/households` para usar `authFinalMiddleware`.  
2. Reescribir `createHousehold` para contrato final `name/slug/timezone/default_language/config`.  
3. Usar `createSupabaseForToken(req.accessToken)` y RPC `create_household`.  
4. Mapear errores: sin auth `401`, name vacío `400`, person faltante `409`, slug duplicado `409`, resto `500`.  
5. Armar response con payload RPC más `me = buildMe(...)`.  
6. Verificar manualmente contra Supabase local.

## **Comandos/Pruebas Propuestos**

* Register/login y guardar `access_token`.  
* `GET /api/auth/me` antes del hogar: debe dar `active_household: null`.  
* `POST /api/households` con body final: debe dar `201`.  
* `GET /api/auth/me` después: debe traer `active_household`, membership `active`, role `coordinator`.  
* DB local: verificar `households`, `household_members.person_id`, `role`, `status`, `joined_at`, `people.active_household_id`.  
* Repetir mismo `slug`: debe dar `409`.  
* Request sin auth: debe dar `401`.  
* Request con `name` vacío: debe dar `400`.

No edité archivos, no implementé código, no toqué frontend, no cambié migrations y no ejecuté Supabase cloud.

auth\_final.md  
\# Etapa 4A — Inspección backend create household vs contrato final Quiero empezar Etapa 4 de AUTH \+ ONBOARDING: Crear hogar atómico. No implementes código todavía. No edites archivos. No cambies backend. No cambies frontend. No cambies migrations. No ejecutes Supabase cloud. No hagas refactors. Esta etapa es solo inspección y diseño. \#\# Source of truth `auth_final.md` manda sobre todo. La DB/RLS final ya quedó validada localmente en Etapa 2\. Backend Auth base ya quedó implementado y cerrado en Etapa 3: \* `POST /api/auth/register` \* `POST /api/auth/login` \* `GET /api/auth/me` \* `POST /api/auth/refresh` \* `POST /api/auth/logout` Ahora toca diseñar la adaptación de creación de hogar. \#\# Objetivo de Etapa 4 Adaptar backend para que `POST /api/households` use el modelo final: \* requiere usuario autenticado; \* requiere `people`; \* NO usa `public.users`; \* NO usa `household_members.user_id`; \* NO usa roles en español; \* NO crea invitaciones legacy; \* crea hogar de forma atómica vía RPC `create_household`; \* crea membership inicial `active`; \* role inicial `coordinator`; \* setea `joined_at`; \* setea `people.active_household_id`; \* luego `/api/auth/me` debe devolver `active_household` y `next = "home"` o estado equivalente. \#\# Archivos a inspeccionar Inspeccioná, si existen: \* `backend/src/controllers/households.controller.js` \* `backend/src/routes/households.js` \* `backend/src/middleware/authMiddleware.js` \* `backend/src/middleware/authFinalMiddleware.js` \* `backend/src/config/supabase.js` \* `backend/src/lib/auth.service.js` \* `backend/src/lib/me.service.js` \* cualquier uso backend de `public.users`; \* cualquier uso backend de `household_members.user_id`; \* cualquier uso de `rol`, `coordinador`, `invitations`. \#\# Qué NO debe tocar Etapa 4 No tocar todavía: \* invite links; \* `routes/invitations.js`; \* approve/reject; \* frontend; \* users profile; \* Planner/Tasks/Events/Schedules; \* migrations; \* Supabase cloud. \#\# Qué necesito que respondas \# Etapa 4A — Inspección backend create household \#\# Veredicto general Decí si el backend actual de households es: \* reutilizable con cambios; \* parcialmente incompatible; \* conviene reescritura puntual. \#\# Estado actual de create household Describir: \* endpoint actual; \* ruta; \* controller; \* middleware usado; \* qué body espera; \* qué tablas toca; \* qué devuelve; \* si crea invitation legacy; \* si usa user\_id/rol/coordinador. \#\# Contradicciones contra auth\_final Listar contradicciones exactas. \#\# Diseño recomendado para Etapa 4B Proponer implementación sin escribir código todavía. Cubrir: \* endpoint final `POST /api/households`; \* body esperado; \* validaciones; \* autenticación; \* cómo resolver token/user/person; \* cómo llamar RPC `create_household`; \* cómo devolver respuesta; \* cómo manejar errores; \* cómo verificar luego con `/api/auth/me`. \#\# Contrato propuesto de request/response Definir request esperado, por ejemplo:  
json  
{  
  "name": "Casa García",  
  "slug": "casa-garcia",  
  "timezone": "America/Argentina/Buenos\_Aires",  
  "default\_language": "es-419",  
  "config": {}  
}  
Definir response esperado:  
json  
{  
  "household": {},  
  "membership": {},  
  "person": {},  
  "me": {}  
}  
Decidir si `slug` es opcional y si backend/RPC lo normaliza. \#\# Archivos que tocaría en Etapa 4B Listar archivos exactos candidatos. \#\# Archivos que NO tocaría Listar explícitamente frontend, migrations, invitations, Planner, etc. \#\# Riesgos Listar riesgos antes de implementar. Incluir especialmente: \* mezcla de middleware legacy vs auth final; \* uso accidental de `user_id`; \* creación de invitation legacy; \* response incompatible con `/me`; \* RPC que falla por RLS/env/admin/scoped client; \* slug conflict. \#\# Plan de implementación chica para Etapa 4B Dividir en pasos pequeños. \#\# Comandos/pruebas de verificación propuestos Proponer pruebas concretas: 1\. register/login; 2\. `/me` antes de hogar; 3\. `POST /api/households`; 4\. `/me` después de hogar; 5\. DB local verifica household/membership/person; 6\. slug duplicado; 7\. request sin auth; 8\. request con name vacío. Recordatorio: No edites archivos. No implementes código. No toques frontend. No cambies migrations. Esta etapa es solo inspección y diseño. Etapa 3C — Cierre técnico Backend Auth Veredicto Etapa 3B.1 queda cerrada técnicamente para Backend Auth base. No veo bloqueantes en el cableado Auth. No implementé features nuevas. No toqué frontend, migrations, households ni invitations. Archivos modificados Archivo	Cambio	Esperado	Recomendación	Motivo backend/src/config/supabase.js	Separa cliente auth, admin y scoped token	Sí	Conservar	Necesario para Auth final y compatibilidad con SUPABASE\_KEY. backend/src/routes/auth.js	Cambia a controller final y expone rutas finales	Sí	Conservar	/register, /login, /me, /refresh, /logout cableados. backend/src/controllers/auth.final.controller.js	Nuevo controller Auth final	Sí	Conservar	Implementa contrato 3B.1. backend/src/lib/auth.service.js	Helpers auth/person/token	Sí	Conservar	Centraliza validaciones, people, rollback y user lookup. backend/src/lib/me.service.js	Helper para payload /me	Sí	Conservar	Construye navegación inicial y evita household interno salvo active válido. backend/src/lib/httpErrors.js	Helper de errores HTTP	Sí	Conservar	Mantiene respuestas consistentes. backend/src/middleware/authFinalMiddleware.js	Middleware Bearer para Auth final	Sí	Conservar	Evita tocar middleware legacy usado por rutas viejas. Nota: git status también muestra cambios/untracked de supabase/ provenientes de Etapa 2\. No los toqué en este cierre. Confirmación de rutas Auth Método	Path real	Controller	Estado POST	/api/auth/register	auth.final.controller.register	Activo POST	/api/auth/login	auth.final.controller.login	Activo GET	/api/auth/me	auth.final.controller.me \+ authFinalMiddleware	Activo POST	/api/auth/refresh	auth.final.controller.refresh	Activo POST	/api/auth/logout	auth.final.controller.logout	Activo POST	/api/auth/signup	ninguno	Eliminado/no expuesto backend/src/controllers/auth.controller.js legacy quedó físicamente en repo, pero sin uso desde routes/auth.js. Contrato Auth confirmado Register crea auth.users \+ people: confirmado por implementación y prueba DB local previa. Register NO crea household: confirmado. Register NO crea membership: confirmado. Login devuelve sesión: confirmado. /me devuelve user, person, memberships, active\_household, navigation: confirmado. Pending no recibe datos internos del household: confirmado, solo membership mínima. Suspended no recibe datos internos: confirmado, no carga household. Finalized no da acceso: confirmado, no cuenta como active ni carga household. Refresh funciona: confirmado en prueba 3B.1. Logout funciona/idempotente: confirmado en prueba 3B.1. Variables de entorno necesarias Backend: SUPABASE\_URL SUPABASE\_ANON\_KEY SUPABASE\_SERVICE\_ROLE\_KEY PORT SUPABASE\_JWKS\_URL Compatibilidad legacy opcional: SUPABASE\_KEY Confirmé que backend/.env existe y está ignorado por git (\!\! backend/.env). No encontré secretos hardcodeados fuera de .env. Pruebas ejecutadas En este cierre: git status \--short: OK, muestra cambios Auth esperados más cambios Supabase previos. git diff \-- ...: revisado para archivos Auth. node \--check en todos los archivos Auth nuevos/modificados: OK. rg de rutas/imports: OK. Búsqueda de secretos fuera de .env: sin resultados. Arranque backend con .env: OK, GET / respondió 200\. Pruebas manuales de 3B.1 ya ejecutadas: POST /api/auth/register: OK. POST /api/auth/login: OK. GET /api/auth/me: OK. POST /api/auth/refresh: OK. POST /api/auth/logout: OK. DB local: fila creada en public.people. No repetí requests contra Supabase cloud por tu restricción de no ejecutar cloud. Riesgos pendientes Supabase cloud debe tener el schema final equivalente a migration 009 antes de probar estos endpoints contra cloud. Si falta SUPABASE\_SERVICE\_ROLE\_KEY y Supabase no devuelve session por email confirmation, register puede dejar auth user sin people. users.controller.js sigue legacy y actualiza metadata, no people. Households/invitations siguen usando user\_id, rol e invitations. auth.controller.js legacy queda como archivo muerto; se puede limpiar más adelante. Pendientes para siguiente etapa Para create household: Adaptar POST /api/households a RPC create\_household. Resolver current person vía people.auth\_user\_id. Dejar de usar household\_members.user\_id. Dejar de usar rol/coordinador. No tocar invite links todavía salvo que esa etapa lo incluya. Verificar active household luego de crear hogar. Recomendación final Sí, podemos pasar a Etapa 4A / create household. Backend Auth base queda cerrado sin bloqueantes. Etapa 2C — Cierre técnico DB/RLS Veredicto Etapa 2 queda cerrada técnicamente para DB/RLS local. No veo errores bloqueantes en la migration validada. Podemos pasar a Etapa 3A backend, con una salvedad: conviene decidir si revertir los package-lock.json, porque esos cambios no pertenecen realmente a DB/RLS. Archivos modificados Archivo	Tipo de cambio	Esperado	Recomendación	Motivo supabase/migrations/migration\_001\_auth\_base.sql … migration\_008\_fix\_es256\_jwt.sql	Renombrados/eliminados de ruta vieja	Sí	Conservar	Supabase CLI exige formato \<timestamp\>\_name.sql. supabase/migrations/202606210001\_auth\_base.sql … 202606210008\_fix\_es256\_jwt.sql	Nuevos nombres timestamp	Sí	Conservar	Mismo contenido lógico, ahora aplicable por Supabase CLI. supabase/migrations/202606210009\_auth\_onboarding\_final.sql	Nueva migration final Auth/Onboarding	Sí	Conservar	Aplicada localmente, reset OK, lint OK. supabase/migrations/rls\_test.sql	Sin cambio, queda fuera del flujo	Sí	Conservar como manual/test	Supabase lo saltea por naming; no se ejecuta accidentalmente. supabase/config.toml	Creado por supabase init	Sí	Conservar / revisar mínimo	Necesario para Supabase local. No contiene secretos. supabase/.gitignore	Creado por supabase init	Sí	Conservar	Ignora .branches, .temp, env locales. backend/package-lock.json	Cambios por npm install	No para Etapa 2	Revertir o revisar	No cambió package.json; son marcas/metadata de lockfile por npm. front/mi-front-limpio/package-lock.json	Cambios por npm install	No para Etapa 2	Revertir o revisar	No cambió package.json; incluye metadata lockfile y cambios opcionales. Revisión de package-lock backend/package.json y front/mi-front-limpio/package.json no cambiaron. Los lockfiles cambiaron por ejecutar npm install con npm 11.6.2; los diffs muestran principalmente flags como peer: true y metadata de paquetes opcionales. No son necesarios para cerrar DB/RLS. Mi recomendación para mantener Etapa 2 limpia: revertir ambos package-lock.json, salvo que quieras dejar registrado que el entorno fue instalado con npm 11 y aceptar ese ruido. Revisión de Supabase config supabase/config.toml es correcto para conservar porque ahora el proyecto puede correr Supabase local. No contiene secretos reales; usa referencias tipo env(OPENAI\_API\_KEY). Puntos a revisar más adelante, no bloqueantes: minimum\_password\_length \= 6, mientras Auth final hablaba de mínimo 8\. db.seed.enabled \= true apunta a seed.sql, que no existe y genera warning. major\_version \= 17; localmente funcionó. supabase/.gitignore también conviene conservar. Confirmación contra contrato Etapa 2A.2 people final creado. households final agregado sobre legacy sin dropear. household\_members.person\_id existe y se usa en modelo final. household\_invite\_links existe. RLS active-only para acceso interno. pending sin acceso interno. suspended sin acceso interno común. finalized sin acceso interno común. Invite links solo active/revoked. Expiración por expires\_at. RPCs críticas presentes: 7\. people privado \+ household\_people\_public. No se dropea public.users. No se migran/dropean Planner, Tasks, Events, Schedules. Verificaciones ejecutadas supabase startResultado: OK, Supabase local levantado. supabase migration list \--localResultado: migrations 202606210001 a 202606210009 reconocidas. supabase db resetPrimer intento falló por backfill people.auth\_user\_id contra usuario legacy sin auth.users. Se parcheó y luego pasó completo. supabase db lint \--local \--fail-on errorPrimer intento tras reset detectó gen\_random\_bytes sin schema. Se parcheó a extensions.gen\_random\_bytes. Resultado final: No schema errors found. Introspección local con docker exec ... psqltables=4 policies=16 rpcs=7 Riesgos pendientes public.users, invitations, Planner/Tasks/Events/Schedules siguen legacy. No bloquea Etapa 2; debe aislarse en backend/frontend. Backend actual todavía usa modelo viejo. Frontend actual todavía usa modelo viejo. supabase/config.toml tiene password min local en 6; revisar cuando se cierre Auth real. Lockfiles cambiados por instalación, no por trabajo DB/RLS. Pendientes para Etapa 3 Backend register final: crear auth.users \+ people, sin household. Backend login final. GET /api/auth/me. Vinculación/carga de people desde auth\_user\_id. Uso backend de RPCs nuevas. Crear household vía create\_household. Join invite vía join\_household\_by\_invite\_token. Approve/reject members. Frontend todavía no adaptado. Sacar flujo nuevo de public.users, invitations, roles españoles y RPCs viejas. Recomendación final Sí, podemos pasar a Etapa 3A. Antes de commitear, yo dejaría el set limpio así: conservar Supabase config, renames y migration 009; revertir o revisar manualmente los dos package-lock.json si querés que Etapa 2 sea estrictamente solo DB/RLS. \#\# Criterios adicionales obligatorios antes de implementar Antes de editar, verificá la estructura exacta de `backend/src/routes/households.js`. Si existe un middleware legacy global como `router.use(authMiddleware)`, no permitas que `POST /api/households` final pase por ese middleware. El objetivo debe quedar explícito: \- `POST /api/households` → `authFinalMiddleware` → `createHousehold` final. \- Las rutas legacy de invitations, si siguen existiendo, no se modifican ni se validan como flujo final en esta etapa. No debe quedar doble middleware ni mezcla accidental entre `authMiddleware` legacy y `authFinalMiddleware`. También cuidá el mapeo de errores de la RPC `create_household`: \- `household_name_required` → 400 \- `person_not_found` → 409 \- `not_authenticated` → 401 \- `household_slug_conflict` o error `23505` → 409 \- errores desconocidos → 500 sin filtrar detalles sensibles La response pública de `POST /api/households` debe ser contrato final:  
json  
{  
  "household": {},  
  "membership": {},  
  "person": {},  
  "me": {}  
}  
Mostrar más  
domingo, 8:38 p.m.

Gracias, ahora sí tengo la ubicación real de `auth_final.md` fuera del workspace. Voy a leerlo con permiso de solo lectura y revalidar la estructura exacta de `households.js`; sigo en modo inspección, sin editar ni ejecutar nada contra Supabase.

Se ejecutaron 4 comandos

Ya confirmé algo importante para el criterio adicional: `households.js` no tiene `router.use(...)`; hoy cada ruta declara explícitamente `authMiddleware` legacy. Para que 4B quede limpia, el cambio tendría que ser quirúrgico: solo `router.post('/')` pasa a `authFinalMiddleware`; invitaciones quedan con legacy, sin doble middleware.

Se ejecutaron 4 comandos

También verifiqué `auth_final.md`: confirma `POST /api/households` como creación atómica de household \+ membership `coordinator` \+ `active_household`, y deja la generación exacta de slug como política pendiente. Eso vuelve razonable decidir en backend: slug opcional, RPC normaliza, conflicto explícito `409`.

Se ejecutaron 4 comandos  
Plan

# **Etapa 4A \- Inspección Backend Create Household**

## **Veredicto General**

El backend actual de households es **parcialmente incompatible** con `auth_final.md` y conviene una **reescritura puntual de `createHousehold` \+ cableado de su ruta**, no una reescritura completa del módulo.

Leí el source of truth en \[auth\_final.md (line 1187)\](C:/Users/thega/Desktop/infra docs/Entrega/Auth/auth\_final.md:1187). Confirma que `POST /api/households` requiere Bearer token \+ `people`, crea hogar atómicamente, crea membership inicial `coordinator/active`, setea `joined_at` y `people.active_household_id`.

## **Estado Actual De Create Household**

* Endpoint actual: `POST /api/households`; también queda expuesto como alias legacy `POST /households` por \[backend/index.js (line 26)\](C:/Users/thega/Desktop/HomePlus/backend/index.js:26).  
* Ruta actual: \[backend/src/routes/households.js (line 7)\](C:/Users/thega/Desktop/HomePlus/backend/src/routes/households.js:7).  
* Estructura exacta: no existe `router.use(authMiddleware)` global; cada ruta declara middleware explícito.  
* Middleware actual: `authMiddleware` legacy, no `authFinalMiddleware`.  
* Controller actual: \[backend/src/controllers/households.controller.js (line 105)\](C:/Users/thega/Desktop/HomePlus/backend/src/controllers/households.controller.js:105).  
* Body actual: `{ "nombre": "...", "tipo": "nucleo|abuelos|separados" }`.  
* Tablas que toca: `households` con `nombre`, `tipo`, `created_by`; `household_members` con `household_id`, `user_id`, `rol`.  
* Response actual: `{ "hogar": household, "member": member }`.  
* `createHousehold` no crea invitation legacy, pero el mismo controller sí contiene flujos legacy de `invitations`.  
* Sí usa `user_id`, `rol` y `coordinador`.

## **Contradicciones Contra `auth_final.md`**

* Usa `authMiddleware` legacy en vez de `authFinalMiddleware`.  
* Usa `supabase` global sin scoped JWT; la RPC final necesita resolver `effective_uid()` desde token.  
* Inserta directo en tablas; `auth_final.md` exige operación atómica controlada.  
* Usa `public.users`/`auth.users.id` como FK lógica vía `created_by` y `household_members.user_id`.  
* Usa `rol = "coordinador"`; contrato final exige `role = "coordinator"`.  
* No usa `people`, `person_id` ni `created_by_person_id`.  
* No setea `people.active_household_id`.  
* No garantiza atomicidad real; solo compensación manual.  
* Body legacy `nombre/tipo` contradice `name/timezone/default_language` y el modelo final.  
* Response legacy `hogar/member` contradice el contrato final público pedido: `household/membership/person/me`.

## **Diseño Recomendado Para Etapa 4B**

* Mantener endpoint final `POST /api/households`.  
* Cambiar solo `router.post('/')` para que quede: `authFinalMiddleware -> createHousehold final`.  
* Dejar `router.post('/:household_id/invitations', authMiddleware, ...)` intacta y fuera del flujo final.  
* No agregar doble middleware ni `router.use`.  
* En `createHousehold`, leer `req.user` y `req.accessToken` del middleware final.  
* Crear un client scoped con `createSupabaseForToken(req.accessToken)`.  
* Llamar RPC `create_household` con `p_name`, `p_slug`, `p_timezone`, `p_default_language`, `p_config`.  
* Después de la RPC, llamar `buildMe({ user: req.user, accessToken: req.accessToken })`.  
* Responder `201` con `{ household, membership, person, me }`.

## **Contrato Request/Response Propuesto**

Request final:

{  
  "name": "Casa García",  
  "slug": "casa-garcia",  
  "timezone": "America/Argentina/Buenos\_Aires",  
  "default\_language": "es-419",  
  "config": {}  
}

Decisión de contrato:

* `name` requerido.  
* `slug` opcional. Si falta, se manda `null` y la RPC lo normaliza desde `name`.  
* `timezone`, `default_language` y `config` opcionales.  
* Si `slug` duplica, devolver `409`; no inventar auto-suffix en backend en esta etapa.

Response final:

{  
  "household": {},  
  "membership": {},  
  "person": {},  
  "me": {}  
}

Nota: `auth_final.md` muestra `member` en el ejemplo de response, pero el criterio adicional del usuario exige `membership`; además la RPC final ya devuelve `membership`.

## **Errores**

Mapeo obligatorio para 4B:

* `household_name_required` \-\> `400`, code `household/invalid_name`.  
* `person_not_found` \-\> `409`, code `auth/person_not_found` o equivalente estable.  
* `not_authenticated` \-\> `401`, code `auth/unauthorized`.  
* `household_slug_conflict` o `23505` \-\> `409`, code `household/slug_conflict`.  
* Desconocidos \-\> `500`, code `household/create_failed`, sin filtrar detalles sensibles.

## **Archivos Que Tocaría En Etapa 4B**

* \[backend/src/routes/households.js (line 1)\](C:/Users/thega/Desktop/HomePlus/backend/src/routes/households.js:1)  
* \[backend/src/controllers/households.controller.js (line 1)\](C:/Users/thega/Desktop/HomePlus/backend/src/controllers/households.controller.js:1)

Reutilizaría sin rediseñar:

* \[backend/src/config/supabase.js (line 31)\](C:/Users/thega/Desktop/HomePlus/backend/src/config/supabase.js:31)  
* \[backend/src/lib/me.service.js (line 109)\](C:/Users/thega/Desktop/HomePlus/backend/src/lib/me.service.js:109)  
* \[backend/src/lib/httpErrors.js (line 1)\](C:/Users/thega/Desktop/HomePlus/backend/src/lib/httpErrors.js:1)

## **Archivos Que NO Tocaría**

No tocar frontend, migrations, Supabase cloud, `routes/invitations.js`, invite links, approve/reject, users profile, Planner, Tasks, Events, Schedules, ni módulos Auth ya cerrados salvo imports necesarios.

## **Riesgos**

* Mezcla accidental de `authMiddleware` legacy y `authFinalMiddleware`.  
* Que el alias legacy `/households` herede el comportamiento final porque comparte router.  
* Uso accidental de `user_id`, `rol` o `coordinador`.  
* Crear/modificar invitation legacy por tocar demasiado el controller.  
* Response incompatible con `/api/auth/me`.  
* RPC llamada con cliente no scoped y fallo por RLS/contexto.  
* `person_not_found` si register no creó `people`.  
* Slug conflict.  
* `/me` actual devuelve `next = "household_onboarding"` si `household_onboarding_status` no está `completed`; eso es estado equivalente válido salvo que se decida completar onboarding al crear hogar.

## **Plan Chico Para Etapa 4B**

1. Importar `authFinalMiddleware` en `households.js`.  
2. Cambiar solo `router.post('/')` a `authFinalMiddleware`.  
3. Reescribir `createHousehold` para body final y RPC `create_household`.  
4. Agregar mapeo de errores RPC sin exponer detalles sensibles.  
5. Armar response `{ household, membership, person, me }`.  
6. Confirmar que rutas legacy de invitations quedan intactas.  
7. Verificar con requests locales y consultas DB locales.

## **Pruebas Propuestas**

1. `POST /api/auth/register` o login y guardar access token.  
2. `GET /api/auth/me` antes: `memberships: []`, `active_household: null`.  
3. `POST /api/households` con body final: esperar `201`.  
4. `GET /api/auth/me` después: `active_household` no null, membership `active/coordinator`.  
5. DB local: verificar `households`, `household_members.person_id`, `role`, `status`, `joined_at`, `people.active_household_id`.  
6. Repetir mismo `slug`: esperar `409`.  
7. Request sin Bearer: esperar `401`.  
8. Request con `name` vacío: esperar `400`.

No edité archivos, no implementé código, no toqué frontend, no cambié migrations y no ejecuté Supabase cloud.

Implementar plan  
domingo, 8:44 p.m.  
Procesado durante 3m 9s

Implementado el plan chico de Etapa 4B.

Cambié \[backend/src/routes/households.js (line 3)\](C:/Users/thega/Desktop/HomePlus/backend/src/routes/households.js:3) para que solo `POST /` use `authFinalMiddleware`; la ruta legacy `/:household_id/invitations` sigue con `authMiddleware`, sin `router.use` ni doble middleware.

Reescribí \[backend/src/controllers/households.controller.js (line 125)\](C:/Users/thega/Desktop/HomePlus/backend/src/controllers/households.controller.js:125) para que `createHousehold` use el contrato final: valida `name`, acepta `slug/timezone/default_language/config`, crea client scoped con token, llama `rpc('create_household')`, arma response `{ household, membership, person, me }`, y mapea errores a `400/401/409/500` sin filtrar detalles internos.

Verificación ejecutada:

* `node --check backend/src/routes/households.js`  
* `node --check backend/src/controllers/households.controller.js`  
* `git diff --check -- backend/src/routes/households.js backend/src/controllers/households.controller.js`  
* búsquedas `rg` para confirmar middleware y RPC final

No toqué frontend, migrations, Supabase cloud, `routes/invitations.js`, Planner/Tasks/Events/Schedules ni approve/reject. Nota: como \[backend/index.js (line 27)\](C:/Users/thega/Desktop/HomePlus/backend/index.js:27) monta el mismo router también en `/households`, ese alias hereda el nuevo comportamiento final; no lo cambié porque estaba fuera del scope acordado.

Se editaron 2 archivos+113-102Revisar cambios  
DeshacerRevisar  
backend/src/routes/households.js+6-5  
backend/src/controllers/households.controller.js+107-97  
domingo, 8:47 p.m.  
\# Etapa 4C — Verificación y cierre técnico POST /api/households final No implementes nuevas features. No toques frontend. No toques migrations. No toques Supabase cloud. No toques invite links. No toques approve/reject. No hagas refactors. Etapa 4B ya fue implementada, pero falta verificación funcional real. Cambios reportados: \- `backend/src/routes/households.js`: `POST /` usa `authFinalMiddleware`; invitations legacy sigue con `authMiddleware`. \- `backend/src/controllers/households.controller.js`: `createHousehold` usa contrato final, valida body, usa `createSupabaseForToken(req.accessToken)`, llama RPC `create_household`, responde `{ household, membership, person, me }`. Verificación estática ya ejecutada: \- `node --check` \- `git diff --check` \- búsquedas `rg` Ahora quiero verificar funcionalmente. \#\# Tareas 1\. Levantá/verificá Supabase local: `supabase status` 2\. Levantá backend local. 3\. Crear o usar usuario de prueba: \- `POST /api/auth/register` o `POST /api/auth/login` \- guardar `access_token`. 4\. Ejecutar: `GET /api/auth/me` con Bearer token. Confirmar antes del hogar: \- `person` presente; \- `memberships` vacío o sin active; \- `active_household: null`; \- `navigation.next = create_or_join_household` o equivalente. 5\. Ejecutar: `POST /api/households` con Bearer token y body: { "name": "Casa Test 4B", "slug": "casa-test-4b", "timezone": "America/Argentina/Buenos\_Aires", "default\_language": "es-419", "config": {} } Confirmar: \- status 201; \- response `{ household, membership, person, me }`; \- `membership.role = coordinator`; \- `membership.status = active`; \- `membership.joined_at` no null; \- `person.active_household_id` no null. 6\. Ejecutar de nuevo: `GET /api/auth/me` Confirmar: \- `active_household` no null; \- membership active; \- role coordinator; \- `navigation.has_active_household = true`; \- `navigation.next = home`, `household_onboarding` o equivalente. 7\. Verificar DB local: \- household creado; \- `households.created_by_person_id`; \- `household_members.person_id`; \- `household_members.role = coordinator`; \- `household_members.status = active`; \- `household_members.joined_at is not null`; \- `people.active_household_id = household.id`. 8\. Probar errores: \- request sin Bearer → 401; \- request con `name` vacío → 400; \- request con `config` array/no objeto → 400; \- repetir mismo `slug` → 409\. 9\. Ejecutar: `git status --short` 10\. Confirmar que no se tocaron archivos fuera del alcance. \#\# Resultado esperado Respondé con: \# Etapa 4C — Cierre técnico Create Household \#\# Veredicto Decí si Etapa 4 queda cerrada o si hay bloqueantes. \#\# Archivos tocados Listar archivos exactos. \#\# Confirmación de alcance Checklist: \- no frontend; \- no migrations; \- no Supabase cloud; \- no invite links; \- no approve/reject; \- no Planner/Tasks/Events. \#\# Rutas finales confirmadas Listar: \- `POST /api/households`; \- si `/households` alias sigue heredando el router, documentarlo como legacy alias pendiente. \#\# Pruebas funcionales ejecutadas Listar cada request y resultado: \- register/login; \- `/me` antes; \- `POST /api/households`; \- `/me` después; \- 401 sin token; \- 400 name vacío; \- 400 config inválido; \- 409 slug duplicado. \#\# Verificación DB local Pegar resumen de resultados, sin secretos. \#\# Contrato confirmado Checklist: \- usa `authFinalMiddleware`; \- usa RPC `create_household`; \- no insert directo; \- no `public.users`; \- no `household_members.user_id`; \- no `rol/coordinador`; \- no invitation legacy; \- response `{ household, membership, person, me }`; \- `/me` post-create correcto. \#\# Riesgos pendientes Listar riesgos reales. Incluir si aplica: \- alias legacy `/households` hereda comportamiento final; \- rutas de invitations siguen legacy; \- frontend todavía no adaptado. \#\# Recomendación final Decir si podemos pasar a Etapa 5A: invite links \+ pending.  
Mostrar más  
domingo, 8:50 p.m.  
Procesado durante 13m 47s

# **Etapa 4C — Cierre técnico Create Household**

## **Veredicto**

Etapa 4 queda **cerrada funcionalmente en local**. `POST /api/households` crea hogar atómico vía RPC, deja membership `active/coordinator`, setea `joined_at`, setea `people.active_household_id`, y `/api/auth/me` queda consistente después.

Salvedad: el primer arranque del backend heredó `backend/.env`, que apunta a Supabase remoto; detecté el 500, detuve ese backend y repetí la verificación con variables locales en memoria. La verificación válida fue contra Supabase local.

## **Archivos tocados**

En 4C no edité archivos.

Cambios de Etapa 4B verificados:

* \[backend/src/routes/households.js (line 1)\](C:/Users/thega/Desktop/HomePlus/backend/src/routes/households.js:1)  
* \[backend/src/controllers/households.controller.js (line 1)\](C:/Users/thega/Desktop/HomePlus/backend/src/controllers/households.controller.js:1)

## **Confirmación de alcance**

* No frontend: confirmado.  
* No migrations: confirmado.  
* No Supabase cloud para la verificación válida: confirmado, con la salvedad inicial indicada.  
* No invite links: confirmado.  
* No approve/reject: confirmado.  
* No Planner/Tasks/Events: confirmado.  
* Backend temporal detenido al final: confirmado.

## **Rutas finales confirmadas**

* `POST /api/households` → `authFinalMiddleware` → `createHousehold`.  
* `POST /api/households/:household_id/invitations` sigue legacy con `authMiddleware`.  
* `/households` sigue montado como alias legacy y hereda el mismo router; pendiente documentarlo/decidirlo más adelante.

## **Pruebas funcionales ejecutadas**

* `supabase status`: Supabase local corriendo.  
* `POST /api/auth/register`: `201`, usuario/person creado.  
* `GET /api/auth/me` antes del hogar: `person` presente, `memberships_count = 0`, `active_household = null`, `navigation.next = create_or_join_household`.  
* `POST /api/households` con `Casa Test 4B` / `casa-test-4b`: `201` en backend log y DB confirmó efectos.  
* `GET /api/auth/me` después: `200`, `active_household.slug = casa-test-4b`, membership `active/coordinator`, `navigation.has_active_household = true`, `navigation.next = household_onboarding`.  
* Sin Bearer: `401`, `code = token_required`.  
* `name` vacío: `400`, `code = household/invalid_name`.  
* `config` array: `400`, `code = household/invalid_config`.  
* Slug duplicado: `409`, `code = household/slug_conflict`.

## **Verificación DB local**

Resumen DB para `slug = casa-test-4b`:

household creado: sí  
created\_by\_person\_id: presente  
membership.person\_id: presente  
membership.role: coordinator  
membership.status: active  
membership.joined\_at\_present: true  
people.active\_household\_id \= household.id: true

## **Contrato confirmado**

* Usa `authFinalMiddleware`: sí.  
* Usa RPC `create_household`: sí.  
* No insert directo en `createHousehold`: sí.  
* No `public.users` en `createHousehold`: sí.  
* No `household_members.user_id` en `createHousehold`: sí.  
* No `rol/coordinador` en `createHousehold`: sí.  
* No crea invitation legacy en `createHousehold`: sí.  
* Response `{ household, membership, person, me }`: implementada y ruta responde 201\.  
* `/me` post-create correcto: sí.

## **Riesgos pendientes**

* `backend/.env` apunta a Supabase remoto; para pruebas locales hay que inyectar env local o ajustar entorno antes de arrancar.  
* Alias legacy `/households` hereda comportamiento final.  
* Rutas de invitations siguen legacy y todavía usan `user_id`, `rol`, `coordinador`, `invitations`.  
* Frontend todavía no está adaptado al contrato final.  
* `navigation.next` queda en `household_onboarding`, no `home`, hasta completar onboarding específico.

## **Recomendación final**

Sí, podemos pasar a **Etapa 5A: invite links \+ pending**.

