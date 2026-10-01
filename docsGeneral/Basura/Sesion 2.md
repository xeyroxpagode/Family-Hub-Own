Perfecto, esta vez tomo como fuente explícita `auth_final.md` y el delta. Voy a leer esos documentos y revisar el schema/migraciones actuales para detectar conflictos reales con Auth, Planner y tablas legacy, sin tocar nada.

Ya tengo la foto macro: el delta coincide con el repo viejo. Ahora voy a mirar las migraciones actuales y helpers RLS para que el diseño de 2A diga exactamente qué reemplazar, qué conservar como patrón y qué puede romperse.

Un punto importante: Planner/Tasks/Events no solo “leen household”; también tienen FKs directas a `public.users` y policies con `auth.uid()`. En el plan voy a separarlo como impacto bloqueante a aislar o migrar luego, porque si cae `public.users` sin estrategia esas tablas quedan rotas.

Hay además una migración 008 que ya parchea `auth.uid()` con `effective_uid()` y trae RPCs viejas. La voy a leer porque conviene decidir explícitamente qué funciones mueren y qué idea reaprovechar en los nuevos RPCs.

Plan

# **Etapa 2A — Diseño de schema final mínimo \+ RLS base**

## **Resumen**

Diseño recomendado: migración limpia MVP hacia `auth.users + people + households + household_members + household_invite_links`, dejando `public.users`, `invitations` y RPCs viejas fuera del flujo final.

La base de seguridad debe apoyarse en `people.auth_user_id -> household_members.person_id`, con RLS que solo trate como miembro con acceso a quien tenga `status = 'active'`. Una membership `pending` sirve para mostrar estado de espera y para que el coordinator la apruebe, pero no concede acceso al household.

## **Tablas finales propuestas**

### **`people`**

Campos:

id uuid primary key default gen\_random\_uuid()  
auth\_user\_id uuid null  
display\_name text not null  
first\_name text null  
last\_name text null  
avatar\_url text null  
phone text null  
date\_of\_birth date null  
gender text null  
default\_language text not null default 'es-419'  
personal\_settings jsonb not null default '{}'  
active\_household\_id uuid null  
app\_onboarding\_status text not null default 'not\_started'  
app\_onboarding\_completed\_at timestamptz null  
created\_at timestamptz not null default now()  
updated\_at timestamptz not null default now()

Relaciones:

* `auth_user_id` referencia `auth.users(id)`.  
* `active_household_id` referencia `households(id)`, agregada después de crear `households` por dependencia circular.  
* `people` reemplaza funcionalmente a `public.users`.

### **`households`**

Campos:

id uuid primary key default gen\_random\_uuid()  
name text not null  
slug text not null unique  
timezone text not null default 'America/Argentina/Buenos\_Aires'  
default\_language text not null default 'es-419'  
config jsonb not null default '{}'  
created\_by\_person\_id uuid not null  
created\_at timestamptz not null default now()  
updated\_at timestamptz not null default now()

Relaciones:

* `created_by_person_id` referencia `people(id)`.  
* Crear household no ocurre en register.  
* Crear household debe ir por RPC atómica.

### **`household_members`**

Campos:

id uuid primary key default gen\_random\_uuid()  
household\_id uuid not null  
person\_id uuid not null  
role text null  
status text not null default 'pending'  
joined\_at timestamptz null  
left\_at timestamptz null  
household\_onboarding\_status text not null default 'not\_started'  
household\_onboarding\_completed\_at timestamptz null  
created\_at timestamptz not null default now()  
updated\_at timestamptz not null default now()

Relaciones:

* `household_id` referencia `households(id)` con `on delete cascade`.  
* `person_id` referencia `people(id)`.  
* No debe existir `user_id`.  
* No debe existir `removed`.

### **`household_invite_links`**

Campos:

id uuid primary key default gen\_random\_uuid()  
household\_id uuid not null  
created\_by\_member\_id uuid not null  
token text not null unique  
status text not null default 'active'  
expires\_at timestamptz not null default now() \+ interval '7 days'  
revoked\_at timestamptz null  
created\_at timestamptz not null default now()  
updated\_at timestamptz not null default now()

Relaciones:

* `household_id` referencia `households(id)` con `on delete cascade`.  
* `created_by_member_id` referencia `household_members(id)`.  
* No existen `used_at` ni `used_by`.

## **Constraints e índices**

Constraints recomendadas:

people.auth\_user\_id unique where auth\_user\_id is not null  
people.app\_onboarding\_status in ('not\_started', 'in\_progress', 'completed')  
household\_members.status in ('pending', 'active', 'suspended', 'finalized')  
household\_members.role in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest')  
household\_members.household\_onboarding\_status in ('not\_started', 'in\_progress', 'completed')  
household\_invite\_links.status in ('active', 'expired', 'revoked')

Reglas de `role/status`:

* `role is null` permitido solo si `status = 'pending'`.  
* `role is not null` obligatorio si `status in ('active', 'suspended')`.  
* Para `finalized`, permitir conservar el último `role` como historial o dejarlo null; default recomendado: conservarlo si existía.

Índices:

people(auth\_user\_id) unique where auth\_user\_id is not null  
people(active\_household\_id)

households(slug) unique  
households(created\_by\_person\_id)

household\_members(household\_id)  
household\_members(person\_id)  
household\_members(status)  
household\_members(household\_id, person\_id) unique where status in ('pending', 'active', 'suspended')  
household\_members(household\_id, role) where status \= 'active'

household\_invite\_links(token) unique  
household\_invite\_links(household\_id)  
household\_invite\_links(created\_by\_member\_id)  
household\_invite\_links(household\_id, status)

Triggers/validaciones necesarias:

* `set_updated_at` reusable para las cuatro tablas.  
* Trigger para validar que `people.active_household_id` solo apunte a un household donde esa persona tenga membership `active`.  
* Trigger sobre `household_members` para impedir que una membership deje de estar `active` si está siendo usada como `people.active_household_id`, salvo que la misma transacción limpie o cambie `active_household_id`.  
* Trigger o validación en RPC para asegurar que `household_invite_links.created_by_member_id` pertenece al mismo `household_id`, tiene `status = 'active'` y `role = 'coordinator'`.

## **Helpers y RLS**

Helpers recomendados, todos `stable security definer set search_path = public`:

effective\_uid() returns uuid  
current\_person\_id() returns uuid  
is\_active\_household\_member(p\_household\_id uuid) returns boolean  
is\_active\_household\_coordinator(p\_household\_id uuid) returns boolean  
can\_view\_household(p\_household\_id uuid) returns boolean  
can\_manage\_household\_members(p\_household\_id uuid) returns boolean

`effective_uid()` debe conservar la intención de `migration_008`: usar `auth.uid()` con fallback a claims si el entorno vuelve a tener JWT ES256 donde `auth.uid()` resulte null.

RLS mínima:

* `people`  
  * `SELECT`: la propia persona; personas con membership visible en households donde el usuario actual es miembro `active`; pending applicants visibles para coordinator `active`.  
  * `UPDATE`: solo la propia persona, limitado conceptualmente a perfil, settings, onboarding y `active_household_id`.  
  * `INSERT`: preferentemente backend/RPC; si se permite directo, solo `auth_user_id = effective_uid()`.  
  * `DELETE`: bloqueado para usuarios normales.  
* `households`  
  * `SELECT`: solo `is_active_household_member(id)`.  
  * `INSERT`: no directo; usar `create_household`.  
  * `UPDATE`: solo coordinator `active`.  
  * `DELETE`: bloqueado en MVP.  
* `household_members`  
  * `SELECT`: propia membership; miembros `active` ven memberships no pending de su household; coordinator `active` ve también pending.  
  * `INSERT`: no directo; usar `create_household` o `join_household_by_invite_token`.  
  * `UPDATE`: directo solo para campos de onboarding propios si status `active`; approve/reject/role/status por RPC.  
  * `DELETE`: bloqueado; usar `status = 'finalized'`.  
* `household_invite_links`  
  * `SELECT`: solo coordinator `active` del household.  
  * `INSERT`: solo coordinator `active`; preferir RPC para generar token.  
  * `UPDATE`: solo coordinator `active` para revocar, no para marcar used.  
  * `DELETE`: bloqueado; revocación lógica con `status = 'revoked'`, `revoked_at = now()`.

Pending no debe pasar `can_view_household`; solo puede ver su propia fila `household_members` para pantalla de espera.

## **RPCs recomendadas**

### **`create_household`**

Conviene: sí, obligatoria para atomicidad.

Inputs:

p\_name text  
p\_slug text  
p\_timezone text default 'America/Argentina/Buenos\_Aires'  
p\_default\_language text default 'es-419'  
p\_config jsonb default '{}'

Output:

{  
  "household": {},  
  "membership": {},  
  "person": {}  
}

Security:

* `security definer`.  
* Ejecutable por `authenticated`.

Validaciones:

* Usuario autenticado.  
* Existe `people` para `current_person_id()`.  
* `name` no vacío.  
* `slug` normalizado y único.  
* Crea household.  
* Crea membership `active`, `role = 'coordinator'`, `joined_at = now()`.  
* Setea `people.active_household_id`.  
* Todo en una transacción.

### **`join_household_by_invite_token`**

Conviene: sí, obligatoria para validar token sin exponer invite links.

Inputs:

p\_token text

Output:

{  
  "membership": {},  
  "status": "pending|active\_existing|pending\_existing"  
}

Security:

* `security definer`.  
* Ejecutable por `authenticated`.

Validaciones:

* Usuario autenticado y con `people`.  
* Token existe.  
* Link `status = 'active'`.  
* `expires_at > now()`.  
* `revoked_at is null`.  
* Si ya existe membership `pending`, devolverla.  
* Si ya existe membership `active` o `suspended`, no crear otra.  
* Si solo existe `finalized`, crear nueva `pending`.  
* Crear membership con `status = 'pending'`, `role = null`, `joined_at = null`.  
* No setear `active_household_id`.

### **`approve_household_member`**

Conviene: sí, para controlar transición y rol.

Inputs:

p\_membership\_id uuid  
p\_role text

Output:

{  
  "membership": {}  
}

Security:

* `security definer`.  
* Ejecutable por `authenticated`.

Validaciones:

* Current person es coordinator `active` del household de la membership.  
* Membership objetivo está `pending`.  
* `p_role` pertenece a roles válidos.  
* Setea `role = p_role`, `status = 'active'`, `joined_at = coalesce(joined_at, now())`, `left_at = null`.  
* No cambia automáticamente `active_household_id` salvo decisión backend posterior; para MVP puede dejarse al usuario vía `set_active_household`.

### **`reject_household_member`**

Conviene: sí.

Inputs:

p\_membership\_id uuid

Output:

{  
  "membership": {}  
}

Security:

* `security definer`.  
* Ejecutable por `authenticated`.

Validaciones:

* Current person es coordinator `active`.  
* Membership objetivo está `pending`.  
* Setea `status = 'finalized'`, `left_at = now()`.  
* Mantiene `role = null`.

### **`set_active_household`**

Conviene: sí, aunque simple, porque centraliza la regla crítica.

Inputs:

p\_household\_id uuid

Output:

{  
  "person": {}  
}

Security:

* Puede ser `security invoker` con RLS o `security definer`; recomendado `security definer` por consistencia.  
* Ejecutable por `authenticated`.

Validaciones:

* Current person existe.  
* Tiene membership `active` en `p_household_id`.  
* Setea `people.active_household_id = p_household_id`.

### **RPCs auxiliares opcionales**

* `create_household_invite_link(p_household_id uuid)` genera token opaco y crea link.  
* `revoke_household_invite_link(p_invite_link_id uuid)` marca `revoked`.  
* Estas dos pueden ser RPCs o endpoints backend con service role; recomendación: RPC si se quiere que la DB sea fuente fuerte de permisos.

## **Impacto en tablas viejas**

* `public.users`  
  * Deja de ser perfil final.  
  * El trigger `on_auth_user_created -> public.users` debe eliminarse o reemplazarse por creación de `people`.  
  * En migración limpia, puede renombrarse a `legacy_users` temporalmente o dropearse después de migrar/descartar datos MVP.  
  * No debe quedar como FK de Auth final.  
* `invitations`  
  * Reemplazada por `household_invite_links`.  
  * El flujo single-use con `used_at`, `used_by`, `rol_asignado` queda obsoleto.  
  * Policies y rutas viejas deben eliminarse del flujo.  
* RPCs viejas  
  * `ensure_public_user`: obsoleta; reemplazar por creación/control de `people`.  
  * `join_household_by_token`: obsoleta; reemplazar por `join_household_by_invite_token`.  
  * `create_household_rpc`: obsoleta; reemplazar por `create_household`.  
  * `is_household_member`, `is_household_coordinator`, `shares_household_with`: reescribir sobre `person_id` y `status = 'active'`.  
  * `effective_uid`: conservar o reimplementar por el problema ES256 detectado.  
* Policies viejas  
  * Todas las policies sobre `public.users`, `households`, `household_members`, `invitations`, `schedules`, `tasks`, `events` que comparan contra `user_id = auth.uid()` o rol `coordinador` quedan incompatibles.  
* Backend/sql legacy  
  * `backend/sql/*` debe marcarse legacy o retirarse del camino de implementación para evitar confusión.  
  * Source real recomendado: `supabase/migrations`.  
* Planner/Tasks/Events/Schedules  
  * `schedules.user_id -> public.users(id)` rompe si se elimina `public.users`.  
  * `tasks.created_by`, `tasks.assigned_to`, `events.created_by`, `events.assigned_to` también rompen.  
  * Como Planner queda fuera de Auth, opción segura MVP: no dropear físicamente `public.users` hasta decidir migración de Planner, o migrar esas FKs en una etapa posterior a `person_id`.  
  * RLS de esas tablas debe considerarse congelada o deshabilitada del flujo UI hasta adaptar a `people`.

## **Estrategia de migración limpia**

Orden seguro:

1. Crear/asegurar extensión `pgcrypto`.  
2. Crear función `set_updated_at`.  
3. Crear `people` sin FK `active_household_id` todavía.  
4. Crear `households`.  
5. Crear `household_members`.  
6. Agregar FK `people.active_household_id -> households(id)`.  
7. Crear `household_invite_links`.  
8. Crear constraints, checks e índices parciales.  
9. Crear triggers de `updated_at`.  
10. Crear triggers de integridad para `active_household_id` y `created_by_member_id`.  
11. Crear `effective_uid` y helpers RLS nuevos.  
12. Habilitar RLS en tablas finales.  
13. Crear policies finales.  
14. Crear RPCs finales.  
15. Revocar o dropear funciones legacy del flujo Auth.  
16. Desactivar trigger `on_auth_user_created -> public.users`.  
17. Decidir tratamiento físico de legacy:  
    * mínimo seguro: renombrar `public.users` e `invitations` a legacy solo cuando Planner ya no dependa de ellas;  
    * alternativa inmediata si no hay datos a conservar: dropear tablas dependientes fuera de Auth o migrarlas primero.  
18. Recién después adaptar backend y frontend.

## **Riesgos**

* `active_household_id` no puede validarse con un simple `check`; requiere trigger o validación centralizada en RPC/backend.  
* Dropear `public.users` antes de adaptar `schedules`, `tasks` y `events` rompe FKs y RLS.  
* Mantener helpers viejos con nombres iguales pero lógica vieja puede abrir acceso o bloquear toda la app.  
* Pending debe poder ver su propio estado sin poder leer `households`.  
* `created_by_member_id` en invite links necesita validar que sea coordinator activo del mismo household.  
* Si `auth.uid()` sigue fallando por claims/JWT, el nuevo RLS debe usar `effective_uid()`.  
* La generación de `slug` y token debe tener manejo de colisiones.

## **Criterio para aprobar este diseño**

Aprobar si se acepta explícitamente que:

* `people` reemplaza a `public.users` como perfil final.  
* RLS final se basa en `current_person_id()` y memberships `active`.  
* Pending no accede a datos internos.  
* Las operaciones atómicas van por RPC `security definer`.  
* `household_invite_links` reemplaza por completo a `invitations`.  
* Planner/Tasks/Events/Schedules no se resuelven en Auth 2A, pero no se debe eliminar `public.users` físicamente hasta migrarlos o aislarlos.  
* La próxima etapa puede escribir una migración SQL siguiendo este orden.

\# Etapa 2A.1 — Auditoría conceptual de schema final mínimo \+ RLS base Quiero que actúes como consultor técnico de base de datos para HomePlus. No implementes código. No edites archivos. No escribas migraciones. No generes SQL final todavía. No toques backend ni frontend. Tu tarea es auditar conceptualmente el diseño de schema final mínimo \+ RLS base para AUTH \+ ONBOARDING, antes de pasar a implementación. \#\# Source of truth Usá `auth_final.md` como fuente de verdad absoluta. Si el repo actual, migraciones viejas, README, Linear, diseños visuales o documentos legacy contradicen `auth_final.md`, gana `auth_final.md`. \#\# Contexto Estamos migrando limpiamente el módulo AUTH \+ ONBOARDING hacia este modelo: \* `auth.users` \* `people` \* `households` \* `household_members` \* `household_invite_links` El repo actual todavía tiene modelo viejo: \* `public.users` \* `household_members.user_id` \* roles en español \* `invitations` single-use \* invitaciones que dan acceso directo \* helpers/RLS viejos basados en `user_id` \* dependencias legacy en Planner/Tasks/Events/Schedules La estrategia general es migración limpia MVP, pero antes de escribir SQL queremos revisar si el diseño de tablas, constraints, índices, triggers, helpers y RLS soporta bien el producto a futuro. \#\# Objetivo de esta etapa Hacer una auditoría crítica, pensativa y profesional del diseño de DB/RLS. Quiero que encuentres debilidades, contradicciones, ambigüedades, casos borde y riesgos antes de implementar. No quiero una migración todavía. \#\# Diseño base a auditar Tablas finales mínimas: \#\#\# people Debe reemplazar funcionalmente a `public.users` como perfil final. Campos esperados: \* `id` \* `auth_user_id` \* `display_name` \* `first_name` \* `last_name` \* `avatar_url` \* `phone` \* `date_of_birth` \* `gender` \* `default_language` \* `personal_settings` \* `active_household_id` \* `app_onboarding_status` \* `app_onboarding_completed_at` \* `created_at` \* `updated_at` Reglas: \* `auth_user_id` referencia `auth.users(id)`. \* `auth_user_id` debe ser único cuando no es null. \* `active_household_id` debe apuntar solo a un hogar donde esa persona tenga membership `active`. \* `app_onboarding_status` debe ser `not_started`, `in_progress` o `completed`. \#\#\# households Campos esperados: \* `id` \* `name` \* `slug` \* `timezone` \* `default_language` \* `config` \* `created_by_person_id` \* `created_at` \* `updated_at` Reglas: \* `created_by_person_id` referencia `people(id)`. \* `slug` debe ser único. \* No se crea household durante register. \* La creación real del household debe ser atómica junto con membership inicial y `active_household_id`. \#\#\# household\_members Campos esperados: \* `id` \* `household_id` \* `person_id` \* `role` \* `status` \* `joined_at` \* `left_at` \* `household_onboarding_status` \* `household_onboarding_completed_at` \* `created_at` \* `updated_at` Reglas: \* Usa `person_id`, no `user_id`. \* `status`: `pending`, `active`, `suspended`, `finalized`. \* `role`: `coordinator`, `adult`, `adolescent`, `child`, `senior`, `guest`. \* `pending` debe tener `role = null`. \* `active` debe tener `role not null`. \* `suspended` debe tener `role not null`, pero no debe conceder acceso interno. \* `finalized` puede conservar último role como historial o quedar null; definir recomendación. \* No existe `removed`. \* Debe evitar duplicados vivos para una misma persona/hogar. \* Debe permitir historial o reintento si una membership quedó `finalized`. \#\#\# household\_invite\_links Campos esperados: \* `id` \* `household_id` \* `created_by_member_id` \* `token` \* `status` \* `expires_at` \* `revoked_at` \* `created_at` \* `updated_at` Reglas: \* Reemplaza `invitations`. \* Link reutilizable. \* Expira a los 7 días. \* Revocable. \* No usa `used_at`. \* No usa `used_by`. \* No usa join code tipeable. \* Solo coordinator active puede crear/revocar links. \* Usar link crea membership `pending`. \* Usar link no da acceso directo al household. \#\# Puntos críticos a auditar Analizá especialmente: 1\. Si las tablas propuestas son suficientes para AUTH \+ ONBOARDING MVP. 2\. Si sobran campos que puedan crear deuda innecesaria. 3\. Si falta algún campo que sea importante para futuro cercano. 4\. Si `display_name not null` es compatible con register y onboarding. 5\. Si `active_household_id` está bien modelado o requiere trigger/RPC. 6\. Si la relación `auth.users -> people -> household_members -> households` queda sólida. 7\. Si `pending` queda correctamente aislado. 8\. Si `suspended` queda correctamente aislado. 9\. Si `finalized` permite historial sin romper reingresos. 10\. Si los índices únicos evitan duplicados sin bloquear reintentos. 11\. Si `household_invite_links.status` conviene que sea `active/revoked` o `active/expired/revoked`. 12\. Si `expires_at` debe ser la fuente real de expiración. 13\. Si `created_by_member_id` debe validarse con trigger, RPC o ambos. 14\. Si las RPCs propuestas son necesarias o si alguna debería postergarse. 15\. Si RLS debería basarse únicamente en `status = 'active'`. 16\. Si hay riesgo de fuga de datos en policies de `people`. 17\. Si las policies permiten bootstrap seguro de creación de household. 18\. Si conviene usar views para exposición pública de people/members. 19\. Si mantener `public.users` temporalmente es necesario por dependencias legacy. 20\. Si hay algún impacto no obvio sobre Planner/Tasks/Events/Schedules. \#\# Escenarios que tenés que simular mentalmente Sin escribir código, probá si el diseño soporta estos casos: 1\. Usuario se registra: se crea `auth.users + people`, pero no household. 2\. Usuario recién registrado llama `/api/auth/me` y no tiene hogar. 3\. Usuario crea primer hogar. 4\. La creación del hogar deja: \* household creado; \* membership inicial active; \* role coordinator; \* joined\_at; \* people.active\_household\_id seteado. 5\. Usuario B usa invite link válido. 6\. Usuario B queda `pending`, `role = null`. 7\. Usuario B pending intenta ver datos internos del household. 8\. Coordinator ve solicitudes pending. 9\. Coordinator aprueba a Usuario B con rol real. 10\. Usuario B aprobado entra al hogar. 11\. Coordinator rechaza a Usuario C. 12\. Usuario C queda `finalized`. 13\. Usuario C intenta reusar un link válido después del reject. 14\. Usuario con membership active intenta usar el mismo link otra vez. 15\. Usuario con membership pending intenta usar el mismo link otra vez. 16\. Usuario con membership suspended intenta acceder al hogar. 17\. Usuario pertenece a dos hogares y cambia `active_household_id`. 18\. Alguien intenta setear `active_household_id` hacia un hogar donde no es active. 19\. Coordinator revoca un invite link. 20\. Link expirado se usa después de 7 días. 21\. Planner/Tasks/Events/Schedules siguen dependiendo de `public.users`. \#\# Resultado esperado Respondé con este formato: \# Etapa 2A.1 — Auditoría conceptual de schema \+ RLS \#\# Veredicto general Decí si el diseño está: \* aprobado; \* aprobado con correcciones; \* no aprobado. \#\# Correcciones obligatorias antes de migrar Listado de cambios que sí o sí deben hacerse antes de escribir SQL. \#\# Decisiones que deben congelarse Listado de decisiones de producto/técnicas que siguen ambiguas y deben definirse antes de implementar. \#\# Análisis tabla por tabla Para cada tabla: \* propósito; \* campos correctos; \* campos dudosos; \* campos faltantes; \* constraints necesarias; \* índices necesarios; \* riesgos; \* recomendación final. Cubrir: \* `people` \* `households` \* `household_members` \* `household_invite_links` \#\# Análisis de RLS Explicar: \* helpers recomendados; \* policies por tabla; \* qué puede ver un usuario sin household; \* qué puede ver un pending; \* qué puede ver un active; \* qué puede ver un suspended; \* qué puede ver un coordinator; \* qué debe quedar bloqueado; \* riesgos de fuga de datos. \#\# Análisis de RPCs Evaluar estas RPCs: \* `create_household` \* `join_household_by_invite_token` \* `approve_household_member` \* `reject_household_member` \* `set_active_household` \* `create_household_invite_link` \* `revoke_household_invite_link` Para cada una: \* si es obligatoria o opcional; \* por qué; \* input esperado; \* output esperado; \* validaciones; \* riesgos; \* si debe ser `security definer` o no. \#\# Pruebas mentales de escenarios Recorrer los 21 escenarios indicados y marcar: \* pasa; \* falla; \* ambiguo; \* qué habría que corregir. \#\# Impacto legacy Analizar específicamente: \* `public.users` \* `invitations` \* helpers viejos \* policies viejas \* RPCs viejas \* Planner/Tasks/Events/Schedules Decir qué NO conviene dropear todavía. \#\# Propuesta final de diseño corregido Dar una versión corregida del diseño, todavía sin SQL final. \#\# Checklist para aprobar Etapa 2A.1 Checklist claro para decidir si podemos pasar a Etapa 2A.2 o Etapa 2B. \#\# Archivos que NO deben tocarse todavía Listar explícitamente qué no se debe modificar aún. Recordatorio final: No edites archivos. No escribas migraciones. No generes SQL final. No implementes código. Esta etapa es solo auditoría conceptual.  
Mostrar más  
sábado, 11:21 p.m.

# **Etapa 2A.1 — Auditoría conceptual de schema \+ RLS**

## **Veredicto general**

**Aprobado con correcciones.**

El diseño base es sólido para AUTH \+ ONBOARDING MVP y está alineado con `auth_final.md`, pero no debería migrarse todavía sin congelar varias reglas de integridad y exposición RLS. Los riesgos principales están en `active_household_id`, visibilidad de `people`, estados `pending/suspended/finalized`, expiración de invite links y dependencias legacy de `public.users`.

## **Correcciones obligatorias antes de migrar**

* `active_household_id` requiere validación fuerte por trigger o RPC; no alcanza FK simple.  
* RLS debe tratar como acceso interno solo `household_members.status = 'active'`.  
* `suspended` debe conservar rol pero no conceder acceso.  
* `pending` debe poder ver su propia solicitud, pero no `households`.  
* `people` no debe exponer datos personales completos a todos los miembros sin una vista limitada.  
* `household_members` necesita unique parcial: `(household_id, person_id)` solo para `pending/active/suspended`.  
* `finalized` debe quedar fuera del unique vivo para permitir reintento.  
* `household_invite_links.created_by_member_id` debe validarse contra coordinator active del mismo household.  
* `expires_at` debe ser la fuente real de expiración; `status = expired` no puede ser la única verdad.  
* No dropear todavía `public.users` si Planner/Tasks/Events/Schedules siguen con FKs legacy.

## **Decisiones que deben congelarse**

* Si `finalized` conserva último `role` como historial. Recomendación: **sí, conservarlo si existía**.  
* Si `household_invite_links.status = expired` se materializa o se deriva. Recomendación: mantener status, pero validar expiración siempre con `expires_at`.  
* Si habrá preview público de invite link. Recomendación MVP: no exponer household completo; como máximo una RPC/view mínima.  
* Si se permiten múltiples coordinators. Recomendación: sí, no bloquearlo en DB.  
* Quién genera `slug`: backend/RPC, no cliente.  
* Si register crea `people` vía backend o trigger sobre `auth.users`. Recomendación: backend/RPC controlado, no trigger legacy a `public.users`.

## **Análisis tabla por tabla**

## **`people`**

Propósito: perfil/persona HomePlus, reemplazo funcional de `public.users`.

Campos correctos: todos los listados son pertinentes para MVP. `auth_user_id nullable` soporta personas sin login.

Campos dudosos: `display_name not null` puede chocar con register/OAuth si aún no hay nombre. Recomendación: permitir que register derive fallback inicial desde email/provider, pero no dejarlo vacío.

Campos faltantes: ninguno obligatorio para MVP. No agregaría email duplicado; vive en `auth.users`.

Constraints necesarias:

* `auth_user_id` FK a `auth.users(id)`.  
* unique parcial `auth_user_id where auth_user_id is not null`.  
* onboarding status check.  
* `active_household_id` FK nullable a `households(id)`.  
* trigger/RPC para exigir membership active.

Índices: `auth_user_id`, `active_household_id`.

Riesgo: RLS de `people` puede filtrar teléfono, fecha de nacimiento o settings a miembros del hogar. Recomendación final: tabla completa visible solo al propio usuario; para cohabitantes usar view tipo `household_people_public`.

## **`households`**

Propósito: unidad de aislamiento.

Campos correctos: suficientes para MVP. `config jsonb` está bien como escape hatch controlado.

Campos dudosos: `slug unique` obliga definir generación/normalización antes de migrar.

Campos faltantes: ninguno obligatorio.

Constraints: `created_by_person_id` FK a `people`; `name` y `slug` no vacíos; slug único.

Índices: `slug unique`, `created_by_person_id`.

Riesgo: bootstrap por RLS. El creador todavía no es miembro al insertar household. Recomendación final: crear siempre por `create_household` security definer.

## **`household_members`**

Propósito: relación persona-hogar-rol-estado.

Campos correctos: cubren pending, active, suspended, finalized y onboarding por hogar.

Campos dudosos: `left_at` para reject/finalized está bien, pero no debe usarse para inferir acceso; manda `status`.

Campos faltantes: ninguno obligatorio. No agregaría `invited_by` todavía porque el link ya guarda creador; si se necesita auditoría fina, queda POST-MVP.

Constraints:

* `status` check.  
* `role` check.  
* `pending => role is null`.  
* `active/suspended => role is not null`.  
* `joined_at` requerido al pasar a `active`.  
* `left_at` requerido al pasar a `finalized`, recomendado.  
* unique parcial vivo `(household_id, person_id) where status in ('pending','active','suspended')`.

Índices: `household_id`, `person_id`, `status`, unique parcial, `(household_id, role) where status='active'`.

Riesgo: permitir update directo de status/role abre bypass de approve/reject. Recomendación final: cambios de status/role solo por RPC.

## **`household_invite_links`**

Propósito: link reusable, temporal y revocable para solicitar ingreso.

Campos correctos: alineados con `auth_final.md`.

Campos dudosos: `status = expired` puede desincronizarse. Recomendación: conservarlo solo como estado administrativo/materializado; la validez real es `status='active' and revoked_at is null and expires_at > now()`.

Campos faltantes: ninguno obligatorio. No agregar `used_at/used_by`.

Constraints:

* status check.  
* token unique.  
* `revoked_at is not null` cuando `status='revoked'`.  
* trigger/RPC para validar `created_by_member_id` coordinator active del mismo household.

Índices: `token unique`, `household_id`, `created_by_member_id`, `(household_id, status)`.

Riesgo: token en SELECT para coordinators está bien, pero nunca debe ser visible a pending/no miembros.

## **Análisis de RLS**

Helpers recomendados:

* `effective_uid()`  
* `current_person_id()`  
* `is_active_household_member(household_id)`  
* `is_active_household_coordinator(household_id)`  
* `can_view_household(household_id)`  
* `can_view_membership(member_id)` o equivalente

Visibilidad:

* Usuario sin household: ve y edita su propio `people`; no ve `households`.  
* Pending: ve su propia fila `household_members`; no ve `households`, members internos ni invite links.  
* Active: ve su household y datos mínimos de miembros activos.  
* Suspended: ve su propio estado, no ve datos internos.  
* Coordinator active: ve household, invite links, members active/suspended/finalized relevantes y solicitudes pending.

Bloqueado:

* Deletes físicos.  
* Inserts directos en households/members/invite links salvo RPC controlada.  
* Updates directos de role/status.  
* Lectura completa de `people` ajeno.

Riesgo de fuga: `people.personal_settings`, `phone`, `date_of_birth` y `gender` no deberían exponerse por policies amplias de “comparten hogar”. Mejor usar views públicas con `id`, `display_name`, `avatar_url`.

## **Análisis de RPCs**

* `create_household`: **obligatoria**, `security definer`. Inputs `name`, opcional `slug/timezone/default_language/config`. Valida person actual, slug único, crea household \+ membership coordinator active \+ active\_household.  
* `join_household_by_invite_token`: **obligatoria**, `security definer`. Input `token`. Valida token activo/no expirado/no revocado, crea o devuelve pending, no asigna rol.  
* `approve_household_member`: **obligatoria**, `security definer`. Inputs `membership_id`, `role`. Solo coordinator active; pending \-\> active.  
* `reject_household_member`: **obligatoria**, `security definer`. Input `membership_id`. Solo coordinator active; pending \-\> finalized.  
* `set_active_household`: **recomendada/obligatoria práctica**, `security definer`. Input `household_id`. Solo si membership active.  
* `create_household_invite_link`: **recomendada**, `security definer`. Evita tokens débiles y bypass de creator.  
* `revoke_household_invite_link`: **recomendada**, `security definer`. Marca revoked/revoked\_at, no delete.

## **Pruebas mentales de escenarios**

1. Register crea `auth.users + people`: **pasa**, si `display_name` tiene fallback.  
2. `/api/auth/me` sin hogar: **pasa**, si acepta memberships vacío.  
3. Crea primer hogar: **pasa**, solo por RPC.  
4. Household \+ coordinator \+ active\_household: **pasa**, si RPC es transaccional.  
5. Usuario B usa link válido: **pasa**.  
6. B queda pending sin role: **pasa**, con constraint.  
7. Pending ve datos internos: **falla si RLS usa membership genérica**; corregir a active-only.  
8. Coordinator ve pending: **pasa**, con policy específica.  
9. Approve con rol: **pasa**, por RPC.  
10. B entra al hogar: **pasa**, tras active.  
11. Reject C: **pasa**.  
12. C finalized: **pasa**.  
13. C reusa link tras reject: **pasa**, si unique parcial excluye finalized.  
14. Active usa link otra vez: **pasa como no-op**, devolver active\_existing.  
15. Pending usa link otra vez: **pasa como no-op**, devolver pending\_existing.  
16. Suspended accede: **falla si helper no filtra status**; corregir active-only.  
17. Dos hogares y cambio active: **pasa**, con `set_active_household`.  
18. Set active a hogar no active: **pasa bloqueado**, con trigger/RPC.  
19. Coordinator revoca link: **pasa**, por RPC.  
20. Link expirado: **pasa bloqueado**, si manda `expires_at`.  
21. Planner legacy con `public.users`: **ambiguo/riesgo alto**; no dropear `public.users` todavía.

## **Impacto legacy**

* `public.users`: no conviene dropear todavía si Planner/Tasks/Events/Schedules siguen referenciándola. Sí debe salir del flujo Auth final.  
* `invitations`: puede quedar legacy temporal, pero no debe usarse.  
* Helpers viejos: deben reemplazarse; peligro si conservan nombres con semántica vieja.  
* Policies viejas: incompatibles por `user_id`, roles españoles y falta de status.  
* RPCs viejas: `ensure_public_user`, `join_household_by_token`, `create_household_rpc` deben retirarse del contrato.  
* Planner/Tasks/Events/Schedules: no migrarlos en esta etapa, pero tampoco romper sus FKs accidentalmente.

## **Propuesta final de diseño corregido**

* Mantener las cuatro tablas finales propuestas.  
* Agregar vista segura `household_people_public` o equivalente para datos visibles de miembros.  
* RLS de acceso interno basada exclusivamente en memberships `active`.  
* `pending` y `suspended` solo ven su propia membership.  
* Usar RPCs `security definer` para todas las transiciones críticas.  
* Validar `active_household_id` con RPC \+ trigger defensivo.  
* Usar unique parcial vivo en memberships.  
* Usar `expires_at` como verdad real de invite expiration.  
* Mantener `public.users` temporalmente como legacy hasta resolver Planner.

## **Checklist para aprobar Etapa 2A.1**

* Definida política de `display_name` fallback.  
* Definido que `finalized` conserva último rol si existía.  
* Definido `expires_at` como fuente real de expiración.  
* Aprobado unique parcial vivo para memberships.  
* Aprobado RLS active-only para household internals.  
* Aprobada view limitada para personas ajenas.  
* Aprobadas RPCs obligatorias.  
* Aprobado no dropear `public.users` todavía.  
* Confirmado que Planner queda aislado/migración posterior.

## **Archivos que NO deben tocarse todavía**

* `supabase/migrations/*`  
* `backend/src/*`  
* `backend/sql/*`  
* `front/mi-front-limpio/*`  
* `front/mi-front-limpio/types/database.ts`  
* `supabase/docs/*`

No edité archivos, no generé migraciones y no implementé código.

sábado, 11:22 p.m.  
\# Etapa 2A.2 — Diseño corregido final \+ contrato de migración DB/RLS Quiero que…

Voy a leer el pedido adjunto de 2A.2 y mantenerme en modo diseño: sin editar, sin migraciones, sin tocar código.

Plan

# **Etapa 2A.2 — Diseño corregido final \+ contrato de migración**

## **Veredicto**

El diseño queda **listo para pasar luego a migración SQL**, sin bloqueantes conceptuales, siempre que Etapa 2B respete este contrato: RLS active-only, RPCs para transiciones críticas, `people` privado por defecto, invite links sin estado `expired`, y legacy aislado sin dropear `public.users` todavía.

## **Decisiones finales congeladas**

* `auth_final.md` manda sobre repo, Linear y migraciones viejas.  
* `people` reemplaza funcionalmente a `public.users`.  
* `people.display_name` es `NOT NULL`; backend/RPC debe generar fallback no vacío.  
* No duplicar email en `people`; email vive en `auth.users`.  
* `household_members` usa `person_id`, nunca `user_id`.  
* Roles finales: `coordinator`, `adult`, `adolescent`, `child`, `senior`, `guest`.  
* Status finales: `pending`, `active`, `suspended`, `finalized`.  
* Solo `active` concede acceso interno.  
* `suspended` conserva rol, bloquea acceso y cuenta como membership viva.  
* `finalized` no concede acceso, queda fuera del unique vivo y permite reintento.  
* `pending` siempre tiene `role = null`.  
* `active/suspended` siempre tienen `role not null`.  
* Invite links son reutilizables, revocables y expiran por `expires_at`.  
* `household_invite_links.status` queda solo `active` / `revoked`.  
* No `used_at`, no `used_by`, no join code tipeable.  
* `public.users`, Planner, Tasks, Events y Schedules no se dropean en esta etapa.

## **Schema final corregido**

### **`people`**

Campos:

* `id uuid`, not null, default `gen_random_uuid()`, PK.  
* `auth_user_id uuid`, nullable, FK `auth.users(id)`.  
* `display_name text`, not null.  
* `first_name text`, nullable.  
* `last_name text`, nullable.  
* `avatar_url text`, nullable.  
* `phone text`, nullable.  
* `date_of_birth date`, nullable.  
* `gender text`, nullable.  
* `default_language text`, not null, default `es-419`.  
* `personal_settings jsonb`, not null, default `{}`.  
* `active_household_id uuid`, nullable, FK `households(id)` after `households` exists.  
* `app_onboarding_status text`, not null, default `not_started`.  
* `app_onboarding_completed_at timestamptz`, nullable.  
* `created_at timestamptz`, not null, default `now()`.  
* `updated_at timestamptz`, not null, default `now()`.

Checks/unique/índices:

* `auth_user_id` unique parcial where not null.  
* `app_onboarding_status in ('not_started','in_progress','completed')`.  
* `display_name` trimmed not empty.  
* Índices: `auth_user_id`, `active_household_id`.

Triggers:

* `updated_at`.  
* Validación defensiva de `active_household_id`: si no es null, debe existir membership `active` para esa misma persona.

### **`households`**

Campos:

* `id uuid`, not null, default `gen_random_uuid()`, PK.  
* `name text`, not null.  
* `slug text`, not null.  
* `timezone text`, not null, default `America/Argentina/Buenos_Aires`.  
* `default_language text`, not null, default `es-419`.  
* `config jsonb`, not null, default `{}`.  
* `created_by_person_id uuid`, not null, FK `people(id)`.  
* `created_at timestamptz`, not null, default `now()`.  
* `updated_at timestamptz`, not null, default `now()`.

Checks/unique/índices:

* `name` trimmed not empty.  
* `slug` trimmed not empty.  
* `slug` unique.  
* Índices: `slug`, `created_by_person_id`.

Triggers:

* `updated_at`.

### **`household_members`**

Campos:

* `id uuid`, not null, default `gen_random_uuid()`, PK.  
* `household_id uuid`, not null, FK `households(id)`.  
* `person_id uuid`, not null, FK `people(id)`.  
* `role text`, nullable.  
* `status text`, not null, default `pending`.  
* `joined_at timestamptz`, nullable.  
* `left_at timestamptz`, nullable.  
* `household_onboarding_status text`, not null, default `not_started`.  
* `household_onboarding_completed_at timestamptz`, nullable.  
* `created_at timestamptz`, not null, default `now()`.  
* `updated_at timestamptz`, not null, default `now()`.

Checks/unique/índices:

* `status in ('pending','active','suspended','finalized')`.  
* `role in ('coordinator','adult','adolescent','child','senior','guest')`.  
* `pending => role is null`.  
* `active/suspended => role is not null`.  
* `household_onboarding_status in ('not_started','in_progress','completed')`.  
* Unique parcial vivo: `(household_id, person_id)` where `status in ('pending','active','suspended')`.  
* Índices: `household_id`, `person_id`, `status`, `(household_id, role)` for active coordinators.

Triggers:

* `updated_at`.  
* Al pasar a `finalized`, exigir `left_at`.  
* Si una membership deja de estar `active`, impedir que siga siendo `people.active_household_id`.

### **`household_invite_links`**

Campos:

* `id uuid`, not null, default `gen_random_uuid()`, PK.  
* `household_id uuid`, not null, FK `households(id)`.  
* `created_by_member_id uuid`, not null, FK `household_members(id)`.  
* `token text`, not null.  
* `status text`, not null, default `active`.  
* `expires_at timestamptz`, not null, default 7 días desde creación.  
* `revoked_at timestamptz`, nullable.  
* `created_at timestamptz`, not null, default `now()`.  
* `updated_at timestamptz`, not null, default `now()`.

Checks/unique/índices:

* `status in ('active','revoked')`.  
* `token` unique.  
* Si `status = 'revoked'`, `revoked_at is not null`.  
* Si `status = 'active'`, `revoked_at is null`.  
* Índices: `token`, `household_id`, `created_by_member_id`, `(household_id, status)`.

Triggers:

* `updated_at`.  
* Validar que `created_by_member_id` pertenece al mismo `household_id`, tiene `status = 'active'` y `role = 'coordinator'`.

### **`household_people_public` view**

Campos expuestos:

* `person_id`  
* `household_id`  
* `membership_id`  
* `display_name`  
* `avatar_url`  
* `role`  
* `status`  
* `joined_at`

Regla: no expone `auth_user_id`, `phone`, `date_of_birth`, `gender`, `personal_settings` ni datos privados.

## **Reglas de integridad obligatorias**

* `people.active_household_id` solo puede apuntar a household con membership `active` de esa persona.  
* `pending` siempre tiene `role null`.  
* `active` y `suspended` siempre tienen `role not null`.  
* `suspended` no concede acceso interno y bloquea nueva pending duplicada.  
* `finalized` no concede acceso, conserva role histórico si venía de active/suspended y exige `left_at`.  
* No puede haber más de una membership viva por `(household_id, person_id)`.  
* Link válido \= `status = 'active'`, `revoked_at is null`, `expires_at > now()`.  
* `created_by_member_id` debe ser coordinator active del mismo household.  
* Deletes físicos bloqueados para usuarios normales.

## **Helpers RLS finales**

* `effective_uid()`: obtiene auth user id desde `auth.uid()` con fallback a JWT claims. `stable`, `security definer`, `search_path = public`.  
* `current_person_id()`: resuelve `people.id` desde `effective_uid() = people.auth_user_id`. `stable`, `security definer`, `search_path = public`.  
* `is_active_household_member(p_household_id uuid)`: true si current person tiene membership `active`. `stable`, `security definer`.  
* `is_active_household_coordinator(p_household_id uuid)`: true si current person tiene membership `active` y role `coordinator`. `stable`, `security definer`.  
* `is_self_person(p_person_id uuid)`: helper opcional para policies de `people`.  
* `can_view_membership(p_household_id uuid, p_person_id uuid)`: opcional para separar “mi propia membership” de “coordinator ve pending”.

Todos deben fijar `search_path = public` para evitar riesgos de search path hijacking.

## **Policies finales en lenguaje natural**

### **`people`**

* SELECT: solo la propia persona sobre tabla completa.  
* INSERT: por backend/RPC/register controlado; si se habilita directo, solo para `auth_user_id = effective_uid()`.  
* UPDATE: solo la propia persona; no permitir cambiar `auth_user_id`.  
* DELETE: bloqueado.  
* Otros miembros deben ver personas solo por `household_people_public`.

### **`households`**

* SELECT: solo current person con membership `active`.  
* INSERT: bloqueado directo; usar `create_household`.  
* UPDATE: solo coordinator active.  
* DELETE: bloqueado en MVP.  
* Pending/suspended/finalized no ven household.

### **`household_members`**

* SELECT:  
  * propia membership para `pending`, `active`, `suspended`, `finalized`;  
  * miembros active ven memberships visibles del household;  
  * coordinator active ve pending del household.  
* INSERT: bloqueado directo; usar RPCs.  
* UPDATE: status/role bloqueados directo; usar approve/reject/suspensión futura. Onboarding propio puede permitirse solo si active.  
* DELETE: bloqueado.

### **`household_invite_links`**

* SELECT: solo coordinator active.  
* INSERT: bloqueado directo o solo vía RPC recomendada.  
* UPDATE: revocación solo vía RPC.  
* DELETE: bloqueado.

### **`household_people_public`**

* SELECT: active members ven miembros visibles del household; coordinator active también ve pending. Pending/suspended/finalized no ven lista interna.

## **RPCs finales**

### **`create_household`**

* Estado: obligatoria.  
* Objetivo: crear household \+ membership coordinator active \+ set active household.  
* Inputs: `name`, opcional `slug`, `timezone`, `default_language`, `config`.  
* Output: household, membership, person actualizado.  
* Validaciones: auth, current person, display\_name existente, name no vacío, slug único.  
* Transacción: todo o nada.  
* Security: `security definer`.  
* Errores: no autenticado, person missing, name invalid, slug conflict.  
* Protege: bootstrap seguro y `active_household_id`.

### **`join_household_by_invite_token`**

* Estado: obligatoria.  
* Inputs: `token`.  
* Output: membership y resultado `pending_created`, `pending_existing`, `active_existing` o `suspended_existing`.  
* Validaciones: token válido por regla active/no revoked/no expired; person actual existe.  
* Transacción: valida link y crea/devuelve membership.  
* Security: `security definer`.  
* Errores: invalid/expired/revoked token, no authenticated, no person.  
* Protege: pending sin acceso directo y unique vivo.

### **`approve_household_member`**

* Estado: obligatoria.  
* Inputs: `membership_id`, `role`.  
* Output: membership actualizada.  
* Validaciones: caller coordinator active; target pending; role válido.  
* Transacción: pending \-\> active, set `joined_at`, `left_at = null`.  
* Security: `security definer`.  
* Errores: not coordinator, invalid role, membership not pending.  
* Protege: asignación centralizada de rol real.

### **`reject_household_member`**

* Estado: obligatoria.  
* Inputs: `membership_id`.  
* Output: membership actualizada.  
* Validaciones: caller coordinator active; target pending.  
* Transacción: pending \-\> finalized, `left_at = now()`, role queda null.  
* Security: `security definer`.  
* Errores: not coordinator, membership not pending.  
* Protege: soft delete de solicitudes.

### **`set_active_household`**

* Estado: obligatoria práctica.  
* Inputs: `household_id`.  
* Output: person actualizada.  
* Validaciones: current person tiene membership active en household.  
* Transacción: update `people.active_household_id`.  
* Security: `security definer`.  
* Errores: not member active, household missing.  
* Protege: selector multi-hogar.

### **`create_household_invite_link`**

* Estado: recomendada fuerte.  
* Inputs: `household_id`, opcional TTL si se decide permitirlo; default 7 días.  
* Output: invite link.  
* Validaciones: caller coordinator active; token opaco único.  
* Transacción: crea link.  
* Security: `security definer`.  
* Errores: not coordinator, token collision retry exhausted.  
* Protege: token generation y creator válido.

### **`revoke_household_invite_link`**

* Estado: recomendada fuerte.  
* Inputs: `invite_link_id`.  
* Output: invite link actualizado.  
* Validaciones: caller coordinator active del household.  
* Transacción: `status = revoked`, `revoked_at = now()`.  
* Security: `security definer`.  
* Errores: not coordinator, already revoked, link missing.  
* Protege: revocación lógica sin delete.

## **Orden recomendado de migración**

1. Extensiones necesarias: `pgcrypto`.  
2. Funciones base: `set_updated_at`, helpers internos de validación si se necesitan.  
3. Crear tablas sin dependencias circulares: `people`, `households`, `household_members`, `household_invite_links`.  
4. Agregar FKs, incluyendo `people.active_household_id` después de `households`.  
5. Agregar checks de statuses, roles, onboarding, display/slug/name no vacíos.  
6. Crear índices y unique parcial vivo.  
7. Crear triggers de `updated_at` e integridad.  
8. Crear helpers RLS finales.  
9. Habilitar RLS en tablas finales.  
10. Crear policies finales.  
11. Crear view `household_people_public` con exposición limitada.  
12. Crear RPCs finales.  
13. Manejo legacy: identificar/desactivar flujo viejo sin dropear `public.users` ni Planner.  
14. Verificaciones: introspección de tablas, constraints, RLS, RPCs y escenarios mínimos.

## **Tests SQL esperados después de migrar**

* Crear `people` para auth user.  
* Impedir `display_name` vacío.  
* Crear household por RPC.  
* Verificar membership inicial active coordinator.  
* Verificar `people.active_household_id` seteado.  
* Intentar setear `active_household_id` inválido y esperar rechazo.  
* Crear invite link por coordinator.  
* Impedir invite link por no coordinator.  
* Join por token válido crea pending.  
* Pending no ve household.  
* Coordinator ve pending.  
* Approve pending con role válido.  
* Active ve household.  
* Suspended no ve household.  
* Reject pending deja finalized con `left_at`.  
* Reintento después de finalized crea nueva pending.  
* Active reusa link y no duplica.  
* Pending reusa link y no duplica.  
* Suspended reusa link y no crea pending.  
* Link revoked no permite join.  
* Link expired no permite join.  
* Unique parcial bloquea duplicados vivos.  
* `household_people_public` no expone campos sensibles.  
* Deletes físicos bloqueados.

## **Impacto legacy y límites**

* `public.users`: legacy temporal, no participa del Auth final nuevo, no dropear todavía.  
* `invitations`: fuera del flujo final; puede quedar temporalmente, no usar.  
* RPCs viejas: incompatibles si usan `public.users`, `user_id`, roles españoles o `invitations`.  
* Helpers viejos: incompatibles si no filtran `status = active`.  
* Policies viejas: incompatibles por `auth.uid()/user_id`, roles españoles y ausencia de pending/suspended/finalized.  
* Planner/Tasks/Events/Schedules: fuera de esta etapa; no migrar y no dropear porque dependen de `public.users`.

No se debe dropear todavía:

* `public.users`  
* `schedules`  
* `tasks`  
* `events`  
* Tablas legacy necesarias para no romper FKs hasta etapa dedicada

## **Archivos que se podrían tocar recién en Etapa 2B**

* `supabase/migrations/*` para nueva migración DB/RLS.  
* `supabase/migrations/rls_test.sql` o nuevo archivo de verificación, si se decide.  
* Eventualmente docs internos de DB Auth, si el equipo quiere registrar el contrato.

## **Archivos que NO deben tocarse**

* `backend/src/*`  
* `backend/sql/*`  
* `front/mi-front-limpio/*`  
* `front/mi-front-limpio/types/database.ts`  
* `front/mi-front-limpio/services/*`  
* `front/mi-front-limpio/context/*`  
* Planner/Tasks/Events/Schedules frontend/backend  
* README, Linear docs, diseños visuales legacy

## **Criterio para aprobar paso a Etapa 2B**

* Diseño acepta `status` invite link solo `active/revoked`.  
* Aprobada expiración por `expires_at`.  
* Aprobada privacidad estricta de `people` \+ view pública limitada.  
* Aprobados helpers RLS active-only.  
* Aprobadas RPCs obligatorias/recomendadas.  
* Aprobado unique parcial vivo.  
* Aprobado no dropear `public.users` todavía.  
* Aprobado no migrar Planner en esta etapa.  
* Aprobado orden de migración.  
* Aprobada lista de tests post-migración.

No se editan archivos, no se escribe migración y no se implementa código en esta etapa.

Implementar plan  
sábado, 11:38 p.m.  
Procesado durante 10m 34s

Implemented the Etapa 2A.2 plan as a new DB migration only:

\[supabase/migrations/migration\_009\_auth\_onboarding\_final.sql\](C:/Users/thega/Desktop/HomePlus/supabase/migrations/migration\_009\_auth\_onboarding\_final.sql)

What it includes:

* Final `people`, `households`, `household_members`, `household_invite_links` shape.  
* In-place upgrade path for existing legacy `households` / `household_members`.  
* `household_people_public` view with non-sensitive fields only.  
* Active-only RLS helpers and policies.  
* RPCs for household creation, invite links, join pending, approve/reject, and active household switching.  
* Legacy protection: keeps `public.users`, Planner/Tasks/Events/Schedules, and `invitations` physically present, but removes final-flow access from old RPCs and disables the old `auth.users -> public.users` trigger.  
* Drops old `households` / `household_members` policies so `user_id`\-based RLS cannot leak through by OR-composition.

Verification:

* Static checks passed for balanced parentheses and dollar quotes.  
* `supabase db lint --local --fail-on error` could not run because local Postgres is not running on `127.0.0.1:54322`.  
* I did not touch backend, frontend, Planner, Tasks, Events, Schedules, or legacy SQL files.

Se editó migration\_009\_auth\_onboarding\_final.sql+1,074-11Revisar cambios  
DeshacerRevisar  
sábado, 11:48 p.m.  
