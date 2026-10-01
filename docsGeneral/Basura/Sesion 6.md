1. **Veredicto del audit**  
   No está listo para 6A sin migración frontend. El frontend actual sigue basado en Supabase directo \+ schema legacy (`users`, `user_id`, `rol`, `invitations`) y no usa `/api/auth/me` como fuente de verdad.  
2. **Archivos frontend relevantes encontrados**  
   `front/mi-front-limpio/context/AuthContext.tsx`, `context/HouseholdContext.tsx`, `navigation/AppNavigator.tsx`, `services/households.ts`, `services/invitations.ts`, `services/api.ts`, `screens/Login.tsx`, `Registro.tsx`, `CrearGrupo.tsx`, `JoinHousehold.tsx`, `InvitarPersonas.tsx`, `ProfileScreen.tsx`.  
3. **AuthContext/session actual**  
   Vive en \[AuthContext.tsx (line 1)\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/context/AuthContext.tsx:1). Usa `supabase.auth.getSession`, `onAuthStateChange`, `signInWithPassword`, `signUp`, `signOut`, recovery/update password. No usa `/api/auth/me`.  
4. **Login/register/logout**  
   Login: \[Login.tsx (line 14)\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/screens/Login.tsx:14) llama `signIn`.  
   Register: \[Registro.tsx (line 14)\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/screens/Registro.tsx:14) llama `signUp`.  
   Logout: \[CrearGrupo.tsx (line 76)\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/screens/CrearGrupo.tsx:76) y \[ProfileScreen.tsx (line 74)\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/screens/ProfileScreen.tsx:74) llaman `signOut`.  
5. **Navegación inicial**  
   En \[AppNavigator.tsx (line 98)\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/navigation/AppNavigator.tsx:98): decide por `session`.  
   En \[AppNavigator.tsx (line 80)\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/navigation/AppNavigator.tsx:80): decide `HomeTabs` vs `P02CrearGrupo` por `currentHousehold`.  
   `currentHousehold` sale de lectura directa en \[HouseholdContext.tsx (line 60)\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/context/HouseholdContext.tsx:60).  
6. **Create household**  
   Pantalla: \[CrearGrupo.tsx (line 58)\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/screens/CrearGrupo.tsx:58).  
   Servicio: \[households.ts (line 73)\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/services/households.ts:73).  
   Hoy inserta directo en `households`/`household_members` y fallback RPC `create_household_rpc`, no `POST /api/households`.  
7. **Join invitation/link**  
   Deep link se captura en \[AuthContext.tsx (line 136)\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/context/AuthContext.tsx:136).  
   Join screen: \[JoinHousehold.tsx (line 34)\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/screens/JoinHousehold.tsx:34).  
   Servicio: \[invitations.ts (line 71)\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/services/invitations.ts:71), usa RPC legacy `join_household_by_token`, no `POST /api/invite-links/join`.  
8. **Referencias legacy encontradas**  
   No encontré strings hardcodeadas de `/api/invitations/validate`, `/invitations/validate`, `/api/auth/signup`.  
   Sí encontré legacy fuerte: `public.users`/`users`, `user_id`, `rol`, `coordinador`, `rol_asignado`, `invitations`, `used_at`, `used_by`, `ensure_public_user`, `create_household_rpc`, `join_household_by_token`.  
9. **Uso directo de Supabase desde frontend**  
   Central en \[supabase/index.ts (line 1)\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/supabase/index.ts:1).  
   Auth directo en \[AuthContext.tsx (line 115)\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/context/AuthContext.tsx:115).  
   Tablas/RPC directas en `services/households.ts`, `services/invitations.ts`, y también módulos app como `tasks.ts`, `events.ts`, `schedules.ts`.  
10. **Brechas contra contrato final**  
    Falta usar `POST /api/auth/register/login/refresh/logout` y `GET /api/auth/me`.  
    Falta modelo final `people`, `person_id`, `role`, `status`, `active_household`.  
    No hay pending/waiting real basado en membership `pending`; el join actual muestra éxito y espera hogar.  
    No hay approve/reject UI ni consumo de `join-requests`.  
    Invite management usa tabla `invitations`, no `household_invite_links`.  
11. **Archivos probables para 6A**  
    `services/api.ts`, `context/AuthContext.tsx`, `context/HouseholdContext.tsx`, `navigation/AppNavigator.tsx`, `navigation/types.ts`, `screens/Login.tsx`, `screens/Registro.tsx`, `screens/ForgotPassword.tsx`, `screens/UpdatePassword.tsx`.  
12. **Archivos probables para 6B/6C/7A/7B/7C**  
    Create household: `screens/CrearGrupo.tsx`, `services/households.ts`.  
    Invite links/join: `screens/InvitarPersonas.tsx`, `screens/JoinHousehold.tsx`, `services/invitations.ts`.  
    Pending/approve/reject: pantalla nueva probable \+ `ProfileScreen.tsx`/área coordinator o pantalla nueva de requests.  
    Roles/Home: `HomeTabNavigator.tsx`, homes por rol, `FamilyScreen.tsx`, `types/database.ts`.  
13. **Riesgos antes de implementar frontend**  
    El frontend actual puede romper contra backend final por 410/legacy bloqueado. También puede filtrar navegación con datos directos de tablas, justo lo que el contrato final prohíbe. Hay deuda de nombres español/inglés (`rol/coordinador` vs `role/coordinator`) y ausencia de estado pending seguro.  
14. **Próximo paso recomendado**  
    Implementar 6A creando una capa API final y migrando sesión/navegación inicial a `/api/auth/me`; recién después mover create household, invite links, pending y approve/reject. No hice cambios ni ejecuté migraciones.

1:03 a.m.  
\# Etapa 6A — Frontend API client \+ /api/auth/me \+ navegación inicial Objetivo: Migrar la decisión de navegación inicial del frontend para que use `GET /api/auth/me` como fuente de verdad, sin migrar todavía todo register/login/create household/invite flow. No hacer migración frontend completa. No tocar backend. No tocar migrations. No tocar Supabase cloud. No implementar create household. No implementar invite links. No implementar pending approve/reject UI. No hacer refactors generales. No borrar código legacy todavía. No repetir contexto largo. Contexto: \- Usá `source_map_auth_onboarding.md` y `auth_final.md` como source of truth. \- Backend Auth/Onboarding final está cerrado hasta 5F. \- 5F bloqueó endpoints legacy invitations con `410 Gone`. \- El frontend actual usa Supabase directo \+ schema legacy para navegación. \- El contrato final dice que `/api/auth/me` debe ser la fuente de verdad para navegación inicial. \- Esta etapa debe preparar la base frontend para 6B/6C/7A/7B/7C, pero sin implementarlas. Archivos candidatos: \- `front/mi-front-limpio/services/api.ts` \- `front/mi-front-limpio/context/AuthContext.tsx` \- `front/mi-front-limpio/context/HouseholdContext.tsx` \- `front/mi-front-limpio/navigation/AppNavigator.tsx` \- `front/mi-front-limpio/navigation/types.ts` Si necesitás tocar archivos fuera del scope, frená y explicá. Preflight obligatorio: 1\. Ejecutar `git status --short` antes de tocar archivos. 2\. Documentar cambios preexistentes. 3\. No revertir ni reformatear cambios previos. 4\. Confirmar que esta etapa no toca backend, DB, migrations ni Supabase cloud. 5\. Inspeccionar brevemente los archivos candidatos antes de editar. Implementación permitida: \#\# 1\. API client mínimo Crear o ajustar una capa API en `services/api.ts` para llamar al backend final. Debe soportar como mínimo: \- base URL configurable; \- helper para headers con Bearer token; \- request JSON; \- manejo básico de errores; \- función para `GET /api/auth/me`. No meter todavía todos los endpoints futuros salvo tipos/placeholders mínimos si ayudan. \#\# 2\. AuthContext Ajustar `AuthContext` para: \- seguir obteniendo la sesión/token de Supabase si hoy es necesario para mantener login actual funcionando; \- usar el access token para llamar `GET /api/auth/me`; \- guardar estado `me` o `authMe`; \- exponer loading/error/refetchMe; \- no decidir navegación leyendo tablas directamente; \- no romper login/register actual más de lo necesario en esta etapa. No migrar todavía: \- `signIn` a `POST /api/auth/login`; \- `signUp` a `POST /api/auth/register`; \- `signOut` a `POST /api/auth/logout`. Eso queda para 6B, salvo que sea mínimo e inevitable. \#\# 3\. Navegación inicial Ajustar `AppNavigator` para que la navegación inicial use el resultado de `/api/auth/me`. Reglas esperadas: \- Sin sesión/token → Auth stack/login. \- Con sesión pero `/me` sin household activo y sin memberships active → pantalla create/join household. \- Con membership pending → pantalla waiting/pending si existe; si no existe, usar fallback simple existente y documentar deuda. \- Con memberships active pero `active_household = null` → pantalla de selección/set active household si existe; si no existe, fallback a create/select y documentar deuda. \- Con active household válido → Home/app. \- No usar lecturas directas de Supabase para decidir Home vs Create/Join. Si el shape real de `/api/auth/me` difiere, adaptá de forma mínima y documentá el shape usado. \#\# 4\. HouseholdContext Reducir o aislar su rol en navegación inicial: \- No debe ser la fuente primaria para decidir si el usuario entra a Home. \- Puede quedar como contexto secundario para datos internos del hogar si todavía lo usa la app. \- No hacer migración profunda de módulos legacy en esta etapa. Reglas anti-legacy: \- No usar `/api/invitations/validate`. \- No usar `/api/households/:household_id/invitations`. \- No agregar llamadas nuevas a `public.users`. \- No agregar llamadas nuevas con `user_id`, `rol`, `coordinador`, `rol_asignado`. \- No usar `invitations`, `used_at`, `used_by`, `join_code`. \- No decidir navegación inicial consultando tablas Supabase directamente. Verificación: 1\. Ejecutar checks estáticos disponibles del frontend: \- TypeScript check si existe comando conocido. \- lint si existe comando liviano conocido. \- Si no sabés el comando, no inventes: explicá qué comando falta. 2\. Ejecutar búsquedas: \- referencias a `/api/invitations/validate`; \- referencias a `/api/households/:household_id/invitations`; \- referencias a `join_household_by_token`; \- referencias de navegación directa por Supabase. 3\. Verificar manualmente o por inspección: \- sin sesión → Auth/Login; \- sesión con `/me` sin hogar activo → create/join; \- pending → waiting/fallback documentado; \- active household → Home/app; \- errores de `/me` no crashean la app. 4\. Ejecutar: \- `git diff --check` \- `git status --short` Frená si: \- necesitás rediseñar navegación completa; \- necesitás crear muchas pantallas nuevas; \- necesitás tocar backend; \- necesitás tocar migrations; \- necesitás migrar create household o invite flow; \- el shape de `/api/auth/me` no alcanza para navegación y requiere decisión humana. Resultado: Respondé breve: 1\. Veredicto. 2\. Archivos tocados. 3\. API client creado/ajustado. 4\. Cómo se llama `/api/auth/me`. 5\. Qué expone `AuthContext`. 6\. Cómo decide navegación `AppNavigator`. 7\. Qué quedó legacy pero aislado. 8\. Pruebas/checks ejecutados. 9\. Riesgos pendientes. 10\. Próximo paso recomendado.  
Mostrar más  
1:05 a.m.  
Procesado durante 8m 20s

1. **Veredicto**  
   6A queda implementada: la navegación privada inicial ahora espera `GET /api/auth/me` y decide con `authMe.navigation.next`, no con lecturas directas de `HouseholdContext`.  
2. **Archivos tocados**  
   \[services/api.ts\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/services/api.ts)  
   \[AuthContext.tsx\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/context/AuthContext.tsx)  
   \[AppNavigator.tsx\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/navigation/AppNavigator.tsx)  
   \[types.ts\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/navigation/types.ts)  
3. **API client**  
   `services/api.ts` ahora tiene base URL configurable (`EXPO_PUBLIC_API_URL`), helper Bearer, `requestJson`, `ApiError`, tipos mínimos del shape de `/me`, y `getAuthMe()`.  
4. **Cómo se llama `/api/auth/me`**  
   `AuthContext` toma `session.access_token` de Supabase y llama `getAuthMe(accessToken)`, que hace `GET /api/auth/me` con `Authorization: Bearer ...`.  
5. **Qué expone `AuthContext`**  
   Agrega `authMe`, `authMeLoading`, `authMeError` y `refetchMe`, manteniendo `signIn/signUp/signOut` por Supabase como estaba para no adelantar 6B.  
6. **Cómo decide navegación `AppNavigator`**  
   Sin sesión: Auth stack.  
   Con sesión: espera `/me`.  
   `home`/`household_onboarding` \+ `active_household`: `HomeTabs`.  
   `pending_approval`: fallback simple de espera.  
   `select/set/repair_active_household`: fallback simple de selección pendiente.  
   `suspended`: fallback simple de acceso suspendido.  
   Sin household activo/membership active: `P02CrearGrupo`.  
7. **Legacy aislado**  
   `HouseholdContext`, create household e invite flow siguen legacy y vivos para pantallas internas. `join_household_by_token` sigue apareciendo en `services/invitations.ts` y `types/database.ts`, sin migrarlo en esta etapa.  
8. **Checks ejecutados**  
   `.\node_modules\.bin\tsc.cmd --noEmit` pasó.  
   `git diff --check` pasó, solo warnings CRLF preexistentes/de working copy.  
   Búsquedas: no hay `/api/invitations/validate` ni legacy invitation URLs; `join_household_by_token` sigue solo como legacy existente.  
   `git status --short` confirma que no toqué backend/migrations, aunque ya tenían cambios preexistentes.  
9. **Riesgos pendientes**  
   Home y pantallas internas todavía dependen de `HouseholdContext`/Supabase directo. No hay pantalla real de pending ni selector/set active household todavía.  
10. **Próximo paso recomendado**  
    6B: migrar auth actions (`register/login/logout/refresh`) a endpoints finales y consolidar manejo de tokens/error contra el backend.

Se editaron 5 archivos+778-228Revisar cambios  
DeshacerRevisar  
front/mi-front-limpio/services/api.ts+176-9  
front/mi-front-limpio/context/AuthContext.tsx+122-40  
front/mi-front-limpio/navigation/types.ts+9-6  
Mostrar 2 archivos más  
1:13 a.m.  
\# Etapa 6B — Frontend register/login/logout final contra backend Objetivo: Migrar las acciones frontend de auth para que usen los endpoints backend finales, manteniendo la navegación inicial de 6A basada en `GET /api/auth/me`. No implementar create household. No implementar invite links. No implementar join pending. No implementar approve/reject UI. No crear pantallas nuevas salvo ajuste mínimo inevitable. No tocar backend. No tocar migrations. No tocar Supabase cloud. No hacer refactors generales. No borrar legacy profundo. No repetir contexto largo. Contexto: \- Usá `source_map_auth_onboarding.md` y `auth_final.md` como source of truth. \- Backend Auth/Onboarding final está cerrado hasta 5F. \- 6A ya implementó: \- `services/api.ts` con API client. \- `GET /api/auth/me`. \- `AuthContext` con `authMe`, `authMeLoading`, `authMeError`, `refetchMe`. \- `AppNavigator` decide con `authMe.navigation.next`. \- En 6A quedaron `signIn`, `signUp` y `signOut` usando Supabase directo para no adelantar 6B. \- Ahora 6B debe migrar esas acciones al backend final. Archivos candidatos: \- `front/mi-front-limpio/services/api.ts` \- `front/mi-front-limpio/context/AuthContext.tsx` \- `front/mi-front-limpio/screens/Login.tsx` \- `front/mi-front-limpio/screens/Registro.tsx` \- `front/mi-front-limpio/screens/ForgotPassword.tsx` solo si hace falta aislar recovery \- `front/mi-front-limpio/screens/UpdatePassword.tsx` solo si hace falta aislar recovery Si necesitás tocar archivos fuera del scope, frená y explicá. Preflight obligatorio: 1\. Ejecutar `git status --short` antes de tocar archivos. 2\. Documentar cambios preexistentes. 3\. No revertir ni reformatear cambios previos. 4\. Confirmar que esta etapa no toca backend, DB, migrations ni Supabase cloud. 5\. Inspeccionar brevemente: \- `services/api.ts` \- `AuthContext.tsx` \- `Login.tsx` \- `Registro.tsx` Contrato backend final a usar: \- `POST /api/auth/register` \- `POST /api/auth/login` \- `POST /api/auth/logout` \- `GET /api/auth/me` Refresh: \- Si `POST /api/auth/refresh` ya está implementado y el frontend tiene refresh token disponible, podés agregar helper mínimo. \- Si no es necesario para esta etapa o el shape no está claro, no lo fuerces. Documentá deuda para etapa posterior. Implementación esperada: \#\# 1\. API client Agregar helpers en `services/api.ts`: \- `authRegister(payload)` \- `authLogin(payload)` \- `authLogout(accessToken)` \- opcional `authRefresh(payload)` solo si el contrato real está claro Los helpers deben: \- usar la base URL configurable existente; \- usar JSON; \- manejar `ApiError`; \- devolver el shape real del backend sin inventar campos; \- documentar/adaptar el shape si difiere del esperado. Payloads sugeridos: Register:  
json  
{  
  "email": "...",  
  "password": "...",  
  "display\_name": "..."  
}

Login:

{  
  "email": "...",  
  "password": "..."  
}

Logout:

usar Bearer access token si el backend lo espera.

No agregar endpoints de household/invite todavía.

2\. AuthContext

Migrar acciones:

signIn debe llamar POST /api/auth/login.  
signUp debe llamar POST /api/auth/register.  
signOut debe llamar POST /api/auth/logout y luego limpiar sesión local.  
Después de login/register exitoso, asegurar que el token quede disponible para llamar GET /api/auth/me.  
Después de login/register exitoso, llamar o disparar refetchMe.  
Después de logout, limpiar authMe, errores y estado local.

Importante:

Si el backend devuelve sesión Supabase compatible, persistirla de la forma más simple y segura para que session.access\_token siga existiendo.  
Si el proyecto todavía necesita Supabase client para conservar sesión local, podés usarlo solo como almacenamiento/sesión, pero no usar Supabase directo para crear/loguear usuarios si el backend ya devuelve sesión.  
No registrar usuarios con supabase.auth.signUp desde frontend.  
No loguear usuarios con supabase.auth.signInWithPassword desde frontend.  
No crear people desde frontend.  
No consultar public.users.

Si el shape de respuesta del backend no permite persistir sesión en Supabase client, frená y explicá qué falta decidir.

3\. Pantallas Login / Registro

Ajustar solo lo necesario para que consuman el nuevo AuthContext.

Mantener UX actual.  
No rediseñar.  
No cambiar flujo visual salvo mensajes de error mínimos.  
Register debe mandar display\_name o equivalente desde los campos existentes.  
Si la pantalla tiene nombre/name, mapearlo a display\_name.  
No crear household durante register.  
Después de register/login, navegación debe quedar en manos de 6A vía /api/auth/me.  
4\. Recovery / Update password

No migrar recovery si no está claro el contrato.

Si hoy depende de Supabase directo y no bloquea 6B, dejarlo como deuda documentada.  
No romper recovery intencionalmente.  
No inventar endpoints.

Reglas anti-legacy:

No usar /api/auth/signup.  
No usar Supabase directo para register/login.  
No usar public.users.  
No usar ensure\_public\_user.  
No usar user\_id, rol, coordinador, rol\_asignado.  
No tocar invitations, used\_at, used\_by, join\_code.  
No decidir navegación inicial consultando tablas Supabase directamente.

Verificación funcional/local:

Confirmar frontend apunta al backend local con EXPO\_PUBLIC\_API\_URL o mecanismo equivalente.  
Register usuario nuevo:  
llama POST /api/auth/register;  
crea sesión/token usable;  
/api/auth/me responde;  
no crea household automáticamente;  
navegación va a create/join según navigation.next.  
Login usuario existente:  
llama POST /api/auth/login;  
sesión/token usable;  
/api/auth/me responde;  
navegación según navigation.next.  
Logout:  
llama POST /api/auth/logout si hay token;  
limpia sesión/authMe;  
vuelve a Auth/Login.  
Error login inválido:  
muestra error controlado;  
no crashea.  
Ejecutar checks:  
TypeScript check si existe comando conocido, por ejemplo .\\node\_modules\\.bin\\tsc.cmd \--noEmit.  
git diff \--check  
git status \--short  
Buscar y reportar:  
usos restantes de supabase.auth.signUp;  
usos restantes de supabase.auth.signInWithPassword;  
usos restantes de /api/auth/signup;  
usos nuevos no permitidos de public.users.

Frená si:

necesitás tocar backend;  
el backend no devuelve sesión/token suficiente para persistir login;  
necesitás migrar create household para que register funcione;  
necesitás rediseñar navegación;  
necesitás tocar demasiados archivos fuera del scope;  
el contrato real de register/login contradice auth\_final.md.

Resultado:  
Respondé breve:

Veredicto.  
Archivos tocados.  
Helpers API agregados.  
Cómo quedó signIn.  
Cómo quedó signUp.  
Cómo quedó signOut.  
Cómo se persiste/obtiene el token para /api/auth/me.  
Pantallas ajustadas.  
Checks/pruebas ejecutadas.  
Legacy que queda pendiente.  
Riesgos pendientes.  
Próximo paso recomendado.  
Mostrar más  
1:16 a.m.  
Procesado durante 2m 30s

1. **Veredicto**  
   6B queda implementada: `signIn`, `signUp` y `signOut` ya usan endpoints backend finales, y 6A sigue decidiendo navegación con `/api/auth/me`.  
2. **Archivos tocados**  
   \[services/api.ts\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/services/api.ts)  
   \[AuthContext.tsx\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/context/AuthContext.tsx)  
   \[Registro.tsx\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/screens/Registro.tsx)  
3. **Helpers API agregados**  
   `authRegister()` → `POST /api/auth/register`  
   `authLogin()` → `POST /api/auth/login`  
   `authLogout()` → `POST /api/auth/logout`  
   No agregué refresh todavía.  
4. **signIn**  
   Ahora llama `authLogin({ email, password })`, persiste la sesión devuelta por backend y dispara `GET /api/auth/me`.  
5. **signUp**  
   Ahora llama `authRegister({ email, password, display_name })`. La pantalla sigue usando `nombre`, mapeado a `display_name`. No crea household.  
6. **signOut**  
   Ahora llama `POST /api/auth/logout` con Bearer token si existe, luego limpia sesión local con Supabase solo como storage local y limpia `authMe`.  
7. **Token para `/api/auth/me`**  
   El backend devuelve sesión Supabase compatible. Se persiste con `supabase.auth.setSession({ access_token, refresh_token })`; luego `AuthContext` usa `session.access_token` para `/api/auth/me`.  
8. **Pantallas ajustadas**  
   `Login.tsx` no necesitó cambios.  
   `Registro.tsx` ajustó password mínimo de 6 a 8 para coincidir con backend final.  
9. **Checks ejecutados**  
   `.\node_modules\.bin\tsc.cmd --noEmit` pasó.  
   `git diff --check` pasó, solo warnings CRLF.  
   Búsquedas: no quedan `supabase.auth.signUp`, `supabase.auth.signInWithPassword` ni `/api/auth/signup`.  
10. **Legacy pendiente**  
    Recovery/update password siguen usando Supabase directo. `public.users`/`ensure_public_user` siguen en `services/households.ts`, fuera de esta etapa. No hice pruebas reales de register/login/logout para no crear usuarios ni tocar Supabase.  
11. **Próximo paso recomendado**  
    6C: migrar create household a `POST /api/households` y empezar a retirar el flujo legacy de `public.users`, `user_id`, `rol` y RPCs viejas.

Se editaron 3 archivos+193-72Revisar cambios  
DeshacerRevisar  
front/mi-front-limpio/services/api.ts+56-0  
front/mi-front-limpio/context/AuthContext.tsx+129-64  
front/mi-front-limpio/screens/Registro.tsx+8-8  
1:18 a.m.  
\# Etapa 6C — Frontend create household visible contra backend final Objetivo: Migrar la creación visible de hogar en frontend para usar el endpoint backend final `POST /api/households`, eliminando del flujo de create household las escrituras directas legacy a Supabase (`public.users`, `households`, `household_members`, `user_id`, `rol`, `coordinador`). No implementar invite links. No implementar join pending. No implementar approve/reject UI. No implementar selector avanzado multi-hogar. No implementar cleanup profundo de módulos legacy. No tocar backend salvo bug mínimo bloqueante y frenando antes. No tocar migrations. No tocar Supabase cloud. No hacer refactors generales. No repetir contexto largo. Contexto: \- Usá `source_map_auth_onboarding.md` y `auth_final.md` como source of truth. \- Backend Auth/Onboarding final está cerrado hasta 5F. \- 6A ya implementó navegación inicial con `GET /api/auth/me`. \- 6B ya migró `signIn`, `signUp`, `signOut` a backend final, pero no tuvo prueba funcional real de register/login/logout. \- Esta etapa debe migrar solo create household visible. \- Después de crear hogar, el frontend debe refrescar `/api/auth/me` y dejar que la navegación se resuelva por `authMe.navigation.next`. Archivos candidatos: \- `front/mi-front-limpio/services/api.ts` \- `front/mi-front-limpio/services/households.ts` \- `front/mi-front-limpio/screens/CrearGrupo.tsx` \- `front/mi-front-limpio/context/AuthContext.tsx` solo si hace falta usar/refinar `refetchMe` \- `front/mi-front-limpio/context/HouseholdContext.tsx` solo si hace falta aislarlo de navegación inicial \- `front/mi-front-limpio/navigation/AppNavigator.tsx` solo si hace falta ajustar fallback post-create Si necesitás tocar archivos fuera del scope, frená y explicá. Preflight obligatorio: 1\. Ejecutar `git status --short` antes de tocar archivos. 2\. Documentar cambios preexistentes. 3\. No revertir ni reformatear cambios previos. 4\. Confirmar que esta etapa no toca backend, DB, migrations ni Supabase cloud. 5\. Confirmar frontend apunta a backend local con `EXPO_PUBLIC_API_URL` o mecanismo equivalente. 6\. Validar mínimo 6B contra backend local: \- register real con usuario nuevo o test; \- login real si aplica; \- confirmar que `/api/auth/me` responde; \- confirmar que navegación cae en create/join cuando no hay hogar. 7\. Si register/login o `/api/auth/me` no funcionan, frená y reportá que hay que corregir 6B antes de 6C. Contrato backend final a usar:  
http  
POST /api/households  
Authorization: Bearer \<access\_token\>  
Content-Type: application/json

Body esperado mínimo:

{  
  "name": "..."  
}

Si el backend acepta más campos como timezone o default\_language, usalos solo si ya existen en la pantalla o contrato real. No inventes configuración avanzada.

Response:

Usar el shape real del backend.  
Si devuelve household, membership, active\_household o similar, adaptá mínimo.  
No depender de shape inventado: después de crear, llamar refetchMe() / GET /api/auth/me.

Implementación esperada:

1\. API client

Agregar en services/api.ts o capa equivalente:

createHousehold(accessToken, payload) o helper equivalente.  
Debe llamar POST /api/households.  
Debe mandar Bearer token.  
Debe usar requestJson / ApiError existente.  
No agregar endpoints de invite links todavía.  
2\. services/households.ts

Migrar create household para que use backend final.

Eliminar del flujo nuevo:

inserts directos a households;  
inserts directos a household\_members;  
RPC legacy create\_household\_rpc;  
ensure\_public\_user;  
public.users;  
user\_id;  
rol;  
coordinador.

Si esas funciones todavía son usadas por pantallas/módulos legacy fuera de create household, no las borres necesariamente; aislalas y documentá deuda. Pero la pantalla CrearGrupo no debe usarlas para crear hogar.

3\. CrearGrupo.tsx

Ajustar la pantalla para:

llamar el servicio final de create household;  
usar access token actual desde AuthContext/session;  
mostrar loading/error controlado;  
después de éxito llamar refetchMe();  
no navegar manualmente a Home si /api/auth/me todavía debe decidir;  
si authMe.navigation.next queda en set\_active\_household, documentar si falta 6D.

Mantener UX actual.  
No rediseñar.  
No agregar invite flow.  
No crear household durante register.

4\. HouseholdContext

No debe volver a ser fuente de verdad para navegación inicial.  
Puede quedar como contexto secundario legacy para pantallas internas, pero no para decidir create vs Home.

Reglas anti-legacy:

No agregar nuevas llamadas a public.users.  
No agregar nuevas llamadas a ensure\_public\_user.  
No usar household\_members.user\_id.  
No usar rol.  
No usar coordinador.  
No usar create\_household\_rpc.  
No usar Supabase directo para crear hogar.  
No decidir navegación leyendo tablas Supabase directamente.

Verificación funcional/local:

Register/login real con backend final si no se validó en preflight.  
Usuario sin hogar entra a pantalla create/join.  
Crear hogar desde CrearGrupo.  
Confirmar request:  
POST /api/households;  
Bearer token presente;  
no inserts directos desde frontend.  
Confirmar DB local:  
household creado;  
membership creador active;  
role coordinator;  
usa person\_id, no user\_id;  
people.active\_household\_id queda seteado si el backend/RPC lo hace.  
Confirmar /api/auth/me después de crear:  
refleja membership active/coordinator;  
si active\_household existe, navegación va a Home;  
si active\_household queda null, navigation.next indica set/select active household y se documenta 6D.  
Error sin Bearer o sesión expirada:  
error controlado;  
no crashea.  
Ejecutar checks:  
.\\node\_modules\\.bin\\tsc.cmd \--noEmit si existe;  
git diff \--check;  
git status \--short.  
Buscar y reportar:  
usos restantes de create\_household\_rpc;  
usos restantes de ensure\_public\_user;  
usos restantes de public.users;  
usos restantes de rol/coordinador en create household;  
confirmar que CrearGrupo ya no usa flujo legacy.

Frená si:

necesitás tocar backend;  
POST /api/households no responde como contrato final;  
6B register/login no funciona;  
/api/auth/me no refleja el hogar creado;  
necesitás implementar selector multi-hogar completo;  
necesitás migrar invite links para que create household funcione;  
necesitás tocar demasiados archivos fuera del scope.

Resultado:  
Respondé breve:

Veredicto.  
Archivos tocados.  
Helper API agregado.  
Cómo quedó create household.  
Qué legacy dejó de usarse en CrearGrupo.  
Cómo se refresca /api/auth/me.  
Resultado de navegación después de crear hogar.  
Verificación DB local.  
Checks/pruebas ejecutadas.  
Legacy que queda pendiente.  
Riesgos pendientes.  
Próximo paso recomendado.  
Mostrar más  
1:22 a.m.  
Procesado durante 9m 36s

1. **Veredicto**  
   6C implementada para el flujo visible: `CrearGrupo` ya crea hogar vía `POST /api/households` con Bearer token y luego refresca `/api/auth/me`.  
2. **Archivos tocados**  
   \[services/api.ts\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/services/api.ts)  
   \[services/households.ts\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/services/households.ts)  
   \[CrearGrupo.tsx\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/screens/CrearGrupo.tsx)  
   \[AppNavigator.tsx\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/navigation/AppNavigator.tsx)  
3. **Helper API agregado**  
   `createHousehold(accessToken, { name })` en `services/api.ts`, usando `POST /api/households`.  
4. **Cómo quedó create household**  
   `CrearGrupo` toma `session.access_token`, llama `createHousehold(accessToken, nombreHogar)`, maneja error/loading y después ejecuta `refetchMe()`.  
5. **Legacy fuera de CrearGrupo**  
   `CrearGrupo` ya no usa `useHousehold`, `reload`, `currentHousehold`, `user.id`, `rol`, `coordinador`, inserts directos ni `create_household_rpc`.  
6. **Refresco / navegación**  
   Después de crear hogar se refresca `/api/auth/me`. Ajusté `AppNavigator` para remount del stack privado por ruta inicial, así `authMe.navigation.next` puede llevar a `HomeTabs`.  
7. **Verificación DB local**  
   Validé contra backend temporal local \+ Supabase local: `POST /api/households` creó household, membership `active`, `role=coordinator`, con `person_id`, y `people.active_household_id` seteado. `/api/auth/me` quedó en `household_onboarding` con `membership_state=active`.  
8. **Checks ejecutados**  
   `.\node_modules\.bin\tsc.cmd --noEmit` pasó.  
   `git diff --check` pasó, solo warnings CRLF.  
   Error sin Bearer devuelve `401 token_required`.  
   `git status --short` ejecutado.  
9. **Legacy pendiente**  
   `services/households.ts` todavía conserva código legacy interno (`ensure_public_user`, `create_household_rpc`, `user_id`, `rol`) y `HouseholdContext` sigue leyendo tablas directas para pantallas internas. No está en el flujo visible de create.  
10. **Riesgos pendientes**  
    `front/mi-front-limpio/.env` no tiene `EXPO_PUBLIC_API_URL`; para probar la app real hay que configurarlo. Yo validé con backend temporal en localhost sin editar `.env`.  
11. **Próximo paso recomendado**  
    6D o 7A: retirar/aislar `HouseholdContext` legacy y preparar invite links sin volver a `invitations`/`join_household_by_token`.

Se editaron 6 archivos+123-235Revisar cambios  
DeshacerRevisar  
front/mi-front-limpio/services/api.ts+18-0  
front/mi-front-limpio/services/households.ts+34-157  
front/mi-front-limpio/services/households.ts+20-2  
Mostrar 3 archivos más  
1:32 a.m.  
\# 6C-Cierre — Validación real create household \+ aislamiento legacy Objetivo: C…  
Procesado durante 7m 27s

**Veredicto**  
6C queda cerrado funcionalmente para el flujo visible de create household. La app real registró usuario, cayó en create/join, creó hogar con `POST /api/households`, refrescó `/api/auth/me` y navegó a Home como coordinador.

**Archivos tocados**

* \[front/mi-front-limpio/.env (line 1)\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/.env:1)  
* \[front/mi-front-limpio/.env.example (line 1)\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/.env.example:1)  
* \[front/mi-front-limpio/services/api.ts (line 244)\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/services/api.ts:244)  
* \[front/mi-front-limpio/services/households.ts (line 76)\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/services/households.ts:76)  
* \[front/mi-front-limpio/screens/CrearGrupo.tsx (line 53)\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/screens/CrearGrupo.tsx:53)

**API / env**  
`EXPO_PUBLIC_API_URL` quedó apuntando a `http://127.0.0.1:3100`. También alineé Supabase frontend a local en `.env`, porque la sesión backend local necesita persistirse contra el Supabase local. `.env.example` quedó con URL local y placeholder de anon key.

**Create household**  
`CrearGrupo` usa `createHousehold(accessToken, nombreHogar)`, que termina en `POST /api/households` con Bearer token. Después llama `refetchMe()` y deja la navegación en manos de `authMe.navigation.next`.

**Validación real**

* Expo web en `http://127.0.0.1:8082`.  
* Backend local temporal en `http://127.0.0.1:3100`.  
* Register UI exitoso.  
* `/api/auth/me` respondió `200`.  
* Create household UI exitoso.  
* Backend log confirmó `POST /api/households 201`.  
* Después de `refetchMe`, la app navegó a Home mostrando “Buenos días, Coordinador”.

**Legacy aislado**  
`CrearGrupo.tsx` ya no referencia `useHousehold`, navegación manual a invite/Home, `create_household_rpc`, `ensure_public_user`, `public.users`, `households`, `household_members`, `user_id`, `rol` ni `coordinador`.

Queda legacy en \[services/households.ts (line 27)\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/services/households.ts:27) e internas como `HouseholdContext`, `Family/Profile/Calendar/InvitarPersonas`, pero marcado/aislado y fuera del flujo visible de create household.

**Checks**

* `.\node_modules\.bin\tsc.cmd --noEmit`: OK.  
* `git diff --check`: OK, solo warnings LF/CRLF.  
* Búsquedas legacy: `CrearGrupo.tsx` sin matches; quedan matches legacy fuera del flujo visible.  
* `git status --short`: muestra cambios preexistentes backend/migrations y cambios frontend. También quedaron logs temporales `.codex-*`; intenté borrarlos, pero el revisor automático lo rechazó por límite de uso.

**Riesgos pendientes**  
No pude completar la verificación DB directa del usuario creado por UI porque el `docker exec` fue rechazado por límite de uso/aprobación. La evidencia funcional quedó por UI \+ logs backend \+ `/api/auth/me`; la verificación DB exacta queda pendiente.

**Próximo paso recomendado**  
Etapa 7A/6D según roadmap: resolver selector/set active household si aparece `active_household = null`, o avanzar a invite links finales si ese estado ya está estable.

