# H-042 — Family Core Final Design

**Proyecto:** HomePlus MVP / evolución a estado final alcanzable  
**Archivo:** `family_core_final_design.md`  
**Bloque:** People mínimo + Household + Members + Profile + Multi-hogar + Permisos  
**Estado:** Diseño funcional final previo a implementación por etapas  

---

## 1. Propósito del documento

Este documento define el diseño final de **Family Core** para HomePlus.

Family Core no es un módulo aislado llamado “Household”. Es una base transversal de la app que conecta:

- Auth / Onboarding.
- People mínimo.
- Household.
- Members / Familia.
- Invite Flow.
- Profile.
- Settings / Cuenta.
- Home.
- Planner.
- Futuras funciones como SOS, Feed, cumpleaños, realtime y permisos por módulo.

El objetivo es pasar de una implementación rápida de entrega a una estructura profesional, consistente y extensible.

---

## 2. Idea central de producto

HomePlus organiza hogares reales.

Un hogar puede ser:

- una persona que vive sola;
- una pareja;
- una familia con hijos;
- una familia extendida;
- un hogar compartido;
- un adulto mayor con apoyo familiar;
- un hogar con cuidadores;
- cualquier grupo de convivencia o coordinación doméstica.

Por eso, la app no debe depender de una sola idea tradicional de “familia”. Debe trabajar sobre el concepto más amplio de **hogar**.

---

## 3. Separación conceptual final

### 3.1 Auth / Cuenta

Auth representa la identidad de acceso.

Incluye:

- email;
- contraseña;
- OAuth;
- sesión;
- logout;
- cambio de email;
- cambio de contraseña;
- seguridad futura.

No debe ser la fuente principal de los datos visuales del usuario dentro de la app.

### 3.2 People

People representa la identidad del usuario dentro de HomePlus.

Incluye:

- `display_name`;
- `first_name`;
- `last_name`;
- `avatar_url`;
- `phone`;
- `date_of_birth`;
- `active_household_id`;
- datos mínimos usados por Profile, Members, Home y Planner.

People no se implementa como módulo social completo. Se usa como base de identidad de la app.

### 3.3 Household

Household representa el hogar como unidad organizativa.

Incluye:

- nombre del hogar;
- tipo de hogar;
- configuración básica;
- permisos del hogar;
- zona horaria;
- idioma;
- relación con miembros;
- límites y reglas de acceso.

### 3.4 Household Membership

Membership representa la relación entre una persona y un hogar.

Incluye:

- `household_id`;
- `person_id`;
- `role`;
- `status`;
- fecha de ingreso;
- fecha de salida;
- permisos derivados del rol y configuración del hogar.

Planner debe asignar tareas usando `household_members.id`, no `person_id` ni `auth_user_id`, porque la asignación ocurre dentro de un hogar específico.

### 3.5 Family / Members

Family o Members es la experiencia donde el usuario ve y gestiona los integrantes de su hogar.

Incluye:

- miembros activos;
- solicitudes pendientes;
- invitaciones;
- roles;
- permisos;
- perfiles familiares;
- solicitudes de cambio de rol;
- acciones administrativas según permisos.

### 3.6 Profile

Profile representa la pantalla personal del usuario.

Incluye:

- datos personales;
- avatar;
- cumpleaños;
- teléfono;
- rol dentro del hogar activo;
- hogar activo;
- acceso a Mis Hogares;
- acceso a Cuenta y Seguridad;
- logout.

---

## 4. Decisiones cerradas

### 4.1 Multi-hogar

HomePlus permite que una persona pertenezca a varios hogares.

Reglas:

- un usuario puede tener varios hogares `active`;
- la app trabaja siempre sobre un `active_household_id` actual;
- cambiar de hogar activo cambia el contexto de Home, Planner, Members y Profile;
- el usuario puede crear otro hogar;
- el usuario puede unirse a otro hogar;
- el usuario puede salir voluntariamente de un hogar;
- un hogar nunca puede quedarse sin al menos un `coordinator` activo.

### 4.2 Límite de hogares

Un usuario puede tener como máximo 5 hogares no finalizados.

El límite cuenta:

- memberships `active`;
- memberships `pending`.

No cuenta:

- memberships `finalized`.

Regla práctica:

```txt
active + pending <= 5
```

Si el usuario intenta crear o unirse a un sexto hogar, la app debe mostrar un mensaje claro.

### 4.3 Roles finales

Roles técnicos finales:

```txt
coordinator
adult
adolescent
child
senior
guest
```

No eliminar `child`.

Diferencia entre `child` y `adolescent`:

- `child` representa niños pequeños o usuarios con experiencia muy guiada;
- `adolescent` representa adolescentes con más autonomía;
- ambos pueden tener tratamiento visual y permisos distintos en Home, Planner y futuras funciones.

### 4.4 Estados finales de membership

Estados usados en la experiencia principal:

```txt
pending
active
finalized
```

Significado:

- `pending`: el usuario pidió entrar y espera aprobación;
- `active`: el usuario pertenece al hogar;
- `finalized`: el usuario salió, fue removido o fue rechazado.

`Suspended` no se usa en la experiencia actual.

Si existe técnicamente en DB, queda como estado técnico no utilizado por UI en esta etapa. No implementar suspender/reactivar ahora.

### 4.5 Invitaciones

El link de invitación es general.

Flujo:

```txt
adult/coordinator crea link
↓
invitado entra por token/link
↓
queda pending
↓
adult/coordinator aprueba o rechaza
↓
quien aprueba elige rol final permitido
```

No usar rol sugerido en el link por ahora.

### 4.6 Adultos

Adult tiene poder operativo, pero no control estructural completo.

Adult puede:

- invitar miembros;
- aprobar solicitudes;
- rechazar solicitudes;
- elegir rol inicial al aprobar;
- quitar miembros comunes;
- ver miembros;
- ver teléfonos y cumpleaños;
- solicitar cambio de rol;
- salir del hogar.

Adult no puede:

- cambiar roles de miembros ya activos;
- asignar `coordinator`;
- quitar `coordinator`;
- editar configuración del hogar;
- editar permisos;
- dejar el hogar sin coordinator.

### 4.7 Coordinator

Coordinator es el rol estructural del hogar.

Puede:

- editar configuración del hogar;
- editar permisos;
- invitar;
- aprobar/rechazar;
- elegir rol inicial al aprobar;
- cambiar roles de miembros activos;
- asignar `coordinator`;
- quitar miembros;
- quitar otro coordinator solo si queda al menos un coordinator activo;
- salir del hogar solo si no es el último coordinator.

Regla obligatoria:

```txt
Un hogar nunca puede quedar sin al menos un coordinator active.
```

### 4.8 Solicitud de cambio de rol

Cualquier miembro puede solicitar cambio de rol.

Puede solicitar:

- `adult`;
- `adolescent`;
- `child`;
- `senior`;
- `guest`.

No puede solicitar:

- `coordinator`.

`coordinator` solo puede ser asignado directamente por otro coordinator.

El motivo de solicitud es opcional.

### 4.9 Perfil familiar visible

Todo miembro `active` del hogar puede ver perfil básico de otros miembros.

Visible para todos los roles activos, incluido `guest`:

- avatar;
- nombre visible;
- rol;
- estado;
- teléfono;
- cumpleaños.

Por ahora no se implementa privacidad por campo.

### 4.10 Cumpleaños

El cumpleaños debe existir como dato de People.

Uso actual:

- mostrar en perfil propio;
- mostrar en perfil familiar;
- preparar base para cumpleaños en Feed/Home/Calendar futuro.

Uso futuro:

- post automático de cumpleaños;
- recordatorios;
- organización de cumpleaños;
- sugerencias familiares;
- eventos automáticos.

### 4.11 Teléfono

El teléfono debe existir como dato de People.

Uso actual:

- mostrar en perfil propio;
- mostrar en perfil familiar.

Uso futuro:

- SOS;
- contactos rápidos;
- adulto mayor;
- emergencias;
- comunicación familiar.

---

## 5. Tipos de hogar

La UI no debe hablar solo de “tipo de familia”. Debe hablar de **tipo de hogar**.

Opciones iniciales:

```txt
solo
couple
family_with_children
extended_family
shared_household
senior_support
caregiving
other
```

Labels sugeridos:

| Valor | Label UI |
|---|---|
| `solo` | Vivo solo/a |
| `couple` | Pareja |
| `family_with_children` | Familia con hijos |
| `extended_family` | Familia extendida |
| `shared_household` | Hogar compartido |
| `senior_support` | Adulto mayor con apoyo familiar |
| `caregiving` | Cuidadores / asistencia |
| `other` | Otro |

Guardar en:

```txt
households.config.household_type
```

No crear columna nueva salvo que luego se vuelva necesario.

---

## 6. Permisos configurables

HomePlus debe tener una pestaña o sección de permisos del hogar.

Esta sección debe incluir permisos de todo lo implementado actualmente. A medida que se desarrollen nuevos módulos, se agregan permisos nuevos.

### 6.1 Ubicación

La sección debe vivir en:

```txt
Configuración del hogar → Permisos
```

Accesible desde:

- Family / Hogar;
- Profile → Mis hogares → Hogar actual;
- Settings si existe.

Solo `coordinator` puede editar permisos.

### 6.2 Almacenamiento inicial

Usar `households.config.permissions`.

Ventajas:

- evita sobrediseño de tablas al inicio;
- permite agregar permisos por módulo;
- es fácil de versionar;
- mantiene flexible la configuración.

A futuro, si crece demasiado, se puede migrar a tablas formales.

### 6.3 Permisos iniciales Family Core

```json
{
  "invite_members": ["coordinator", "adult"],
  "approve_members": ["coordinator", "adult"],
  "reject_members": ["coordinator", "adult"],
  "choose_role_on_approval": ["coordinator", "adult"],

  "remove_members": ["coordinator", "adult"],
  "remove_coordinators": ["coordinator"],

  "manage_roles": ["coordinator"],
  "assign_coordinator": ["coordinator"],

  "edit_household_settings": ["coordinator"],
  "edit_permissions": ["coordinator"],

  "view_members": ["coordinator", "adult", "adolescent", "child", "senior", "guest"],
  "view_member_contact_info": ["coordinator", "adult", "adolescent", "child", "senior", "guest"],

  "request_role_change": ["coordinator", "adult", "adolescent", "child", "senior", "guest"],
  "leave_household": ["coordinator", "adult", "adolescent", "child", "senior", "guest"]
}
```

### 6.4 Reglas que los permisos no pueden romper

Aunque config diga otra cosa:

- nadie puede dejar el hogar sin coordinator;
- adult no puede quitar coordinators;
- adult no puede asignar coordinator;
- solo coordinator puede editar permisos;
- solo coordinator puede editar configuración estructural;
- pending no accede a Home completo;
- finalized no accede al hogar.

### 6.5 Permisos preparados para Planner

Si Planner ya consume members, dejar preparado:

```json
{
  "create_tasks": ["coordinator", "adult", "adolescent", "senior"],
  "assign_tasks": ["coordinator", "adult"],
  "complete_tasks": ["coordinator", "adult", "adolescent", "child", "senior", "guest"],
  "verify_tasks": ["coordinator", "adult"]
}
```

Estos permisos no deben bloquear Planner si todavía no está preparado para leerlos. Pueden quedar en config como base futura.

---

## 7. Arquitectura de datos final

### 7.1 `people`

Fuente de verdad del perfil de HomePlus.

Campos esperados:

```txt
id
auth_user_id
display_name
first_name
last_name
avatar_url
phone
date_of_birth
gender
default_language
personal_settings
active_household_id
app_onboarding_status
created_at
updated_at
```

Reglas:

- `display_name` es obligatorio o debe tener fallback seguro;
- `avatar_url` se actualiza en `people`, no solo en auth metadata;
- `phone` es visible para miembros activos del mismo hogar;
- `date_of_birth` se usa como cumpleaños;
- `active_household_id` apunta al hogar actualmente seleccionado.

### 7.2 `households`

Fuente de verdad del hogar.

Campos esperados:

```txt
id
name
slug
timezone
default_language
config
created_by_person_id
created_at
updated_at
```

`config` debe incluir:

```json
{
  "household_type": "family_with_children",
  "permissions": {},
  "setup_version": 1
}
```

### 7.3 `household_members`

Fuente de verdad de membresía.

Campos esperados:

```txt
id
household_id
person_id
role
status
joined_at
left_at
created_at
updated_at
```

Roles finales:

```txt
coordinator
adult
adolescent
child
senior
guest
```

Estados usados por UX:

```txt
pending
active
finalized
```

### 7.4 `household_invite_links`

Fuente de verdad de links de invitación.

Campos esperados:

```txt
id
household_id
token
status
created_by_person_id
revoked_at
expires_at
created_at
```

Estados esperados:

```txt
active
revoked
expired
```

Si el backend actual usa otro shape compatible, no crear tabla nueva innecesaria.

### 7.5 Nueva tabla: `household_role_change_requests`

Necesaria para solicitudes de cambio de rol.

Campos propuestos:

```txt
id uuid primary key
household_id uuid not null
membership_id uuid not null
requested_by_person_id uuid not null
current_role text not null
requested_role text not null
reason text null
status text not null default 'pending'
reviewed_by_person_id uuid null
reviewed_at timestamptz null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Estados:

```txt
pending
approved
rejected
cancelled
```

Reglas:

- solo el propio miembro puede solicitar cambio de rol para sí mismo;
- no se puede solicitar `coordinator`;
- solo coordinator puede aprobar/rechazar;
- el motivo es opcional;
- al aprobar, se actualiza `household_members.role`;
- no se aprueba si membership ya no está active;
- no se aprueba si el hogar no coincide.

---

## 8. Migraciones necesarias o probables

### 8.1 Verificar soporte real de `child`

Acción:

- revisar constraints/enums/types;
- asegurar que `child` sea rol permitido;
- si no existe, agregarlo;
- si ya existe, mantenerlo.

### 8.2 Permisos default en `households.config`

Acción:

- al crear hogar, inicializar `config.permissions`;
- si hogares existentes no tienen permisos, backend debe aplicar defaults;
- opcional: backfill de config para hogares existentes.

### 8.3 Límite de 5 hogares

Acción:

- validar en `create_household`;
- validar en `join_household_by_invite_token`;
- contar memberships `active + pending`;
- devolver error claro si excede.

### 8.4 Nueva tabla de solicitudes de cambio de rol

Acción:

- crear tabla `household_role_change_requests`;
- crear índices;
- crear RLS;
- crear RPCs o endpoints seguros.

### 8.5 Last coordinator protection

Acción:

- validar en finalize/remove;
- validar en leave household;
- validar en role change;
- validar en remove coordinator;
- validar en cualquier acción que pueda dejar 0 coordinators.

### 8.6 Profile/People sync

Acción:

- crear o adaptar endpoint para actualizar `people`;
- asegurar avatar en `people.avatar_url`;
- dejar `auth.users.user_metadata` como secundario o compatibilidad.

---

## 9. Endpoints esperados

### 9.1 Auth existente

```txt
GET /api/auth/me
POST /api/auth/logout
```

`/api/auth/me` debe devolver:

```txt
user
person
memberships
active_household
navigation
```

### 9.2 People/Profile

```txt
GET /api/people/me
PATCH /api/people/me
PATCH /api/people/me/avatar
```

`PATCH /api/people/me` debe permitir:

```txt
display_name
first_name
last_name
phone
date_of_birth
```

Avatar:

- puede ir en endpoint separado multipart;
- debe actualizar `people.avatar_url`;
- debe refrescar `/api/auth/me` en frontend.

### 9.3 Household

```txt
POST /api/households
GET /api/households/my
POST /api/households/:household_id/set-active
PATCH /api/households/:household_id/settings
PATCH /api/households/:household_id/permissions
POST /api/households/:household_id/leave
```

Notas:

- `GET /api/households/my` puede ser opcional si `/api/auth/me` ya devuelve memberships suficientes;
- `set-active` debe validar membership `active`;
- `leave` debe impedir dejar el hogar sin coordinator.

### 9.4 Members

```txt
GET /api/households/:household_id/members
POST /api/households/:household_id/members/:membership_id/finalize
PATCH /api/households/:household_id/members/:membership_id/role
GET /api/households/:household_id/members/:membership_id/profile
```

Reglas:

- listar miembros depende de permisos;
- finalizar/quitar depende de permisos;
- adult puede quitar miembros comunes;
- adult no puede quitar coordinators;
- solo coordinator puede cambiar roles;
- solo coordinator puede asignar coordinator.

### 9.5 Invite flow

```txt
POST /api/households/:household_id/invite-links
POST /api/households/:household_id/invite-links/:id/revoke
POST /api/invite-links/join
GET /api/households/:household_id/join-requests
POST /api/households/:household_id/join-requests/:membership_id/approve
POST /api/households/:household_id/join-requests/:membership_id/reject
```

Cambios necesarios:

- permitir `coordinator` y `adult` según permisos;
- adult puede aprobar/rechazar;
- adult puede elegir rol final permitido, excepto `coordinator`;
- coordinator puede elegir cualquier rol, incluido `coordinator`, si la app lo permite con confirmación.

### 9.6 Role change requests

```txt
POST /api/households/:household_id/role-change-requests
GET /api/households/:household_id/role-change-requests
POST /api/households/:household_id/role-change-requests/:request_id/approve
POST /api/households/:household_id/role-change-requests/:request_id/reject
POST /api/households/:household_id/role-change-requests/:request_id/cancel
```

Reglas:

- cualquier miembro active puede crear solicitud propia;
- no se puede solicitar `coordinator`;
- solo coordinator aprueba/rechaza;
- usuario puede cancelar su propia solicitud pending.

### 9.7 Cuenta y seguridad

Diseñar ahora, implementar si no complica Auth.

```txt
POST /api/auth/change-password
POST /api/auth/change-email
```

Puede quedar para bloque posterior si Supabase/confirmaciones lo vuelven más grande.

---

## 10. Pantallas finales

### 10.1 Create Household

Objetivo:

- crear primer hogar o nuevo hogar.

Debe incluir:

- nombre del hogar;
- tipo de hogar;
- helper humano;
- opción para unirse a hogar;
- validación de límite 5;
- guardar `households.config.household_type`;
- inicializar permisos default.

### 10.2 Manage Households / Mis hogares

Objetivo:

- gestionar los hogares del usuario.

Debe mostrar:

- hogar activo;
- hogares active;
- hogares pending;
- hogares finalized solo si se decide mostrar historial;
- rol en cada hogar;
- cantidad de miembros si está disponible;
- acciones disponibles.

Acciones:

- cambiar hogar activo;
- crear hogar;
- unirse a hogar;
- salir de hogar;
- abrir configuración del hogar si tiene permiso.

### 10.3 Household Selection

Objetivo:

- resolver `navigation.next === select_household`.

Debe mostrar:

- lista de hogares active;
- rol del usuario;
- botón continuar;
- estado empty/error.

Acción:

- seleccionar hogar;
- llamar `set-active`;
- refrescar `/me`;
- navegar a Home.

### 10.4 FamilyScreen / Hogar / Familia

Objetivo:

- centro principal de miembros y administración familiar.

Secciones:

1. Resumen del hogar.
2. Miembros activos.
3. Solicitudes pendientes.
4. Invitaciones.
5. Solicitudes de cambio de rol.
6. Acciones administrativas.
7. Acceso a permisos/configuración si corresponde.

Debe mostrar:

- avatar;
- nombre;
- rol;
- estado;
- chips visuales;
- CTA invitar;
- CTA permisos;
- CTA solicitudes;
- empty states;
- loading;
- error + retry.

### 10.5 MemberProfileScreen

Objetivo:

- ver perfil básico de un integrante del hogar.

Debe mostrar:

- avatar;
- display name;
- rol;
- estado;
- teléfono;
- cumpleaños;
- hogar;
- fecha de ingreso si existe.

Acciones según rol/permisos:

- solicitar cambio de rol propio;
- cambiar rol si coordinator;
- quitar miembro si permitido;
- asignar coordinator si coordinator;
- volver.

### 10.6 Invite People

Objetivo:

- crear, mostrar, copiar, compartir y revocar link.

Debe mostrar:

- link activo;
- QR;
- botón copiar;
- botón compartir;
- botón revocar si permitido;
- explicación de pending;
- solicitudes pendientes.

### 10.7 WaitingApprovalScreen

Objetivo:

- mostrar que la solicitud fue enviada.

Debe incluir ahora:

- mensaje claro;
- fecha de solicitud si está disponible;
- botón actualizar estado;
- no permitir Home completo;
- diseño emocional.

Preparado para futuro:

- realtime;
- Lottie de espera;
- actualización automática.

El botón actualizar puede quedarse como fallback incluso con realtime.

### 10.8 ProfileScreen

Objetivo:

- identidad personal y acceso a cuenta/hogares.

Secciones:

1. Mi perfil.
2. Mi hogar actual.
3. Mis hogares.
4. Cuenta y seguridad.
5. Preferencias.

Debe mostrar:

- avatar;
- display_name;
- first_name;
- last_name;
- phone;
- cumpleaños;
- email;
- rol actual;
- hogar activo;
- botón editar perfil;
- botón cambiar hogar;
- botón cerrar sesión.

### 10.9 Edit Profile

Puede ser modal o pantalla.

Campos:

- avatar;
- display_name obligatorio;
- first_name opcional;
- last_name opcional;
- phone opcional;
- date_of_birth opcional.

Guardar en `people`.

### 10.10 Household Permissions Screen

Objetivo:

- configurar permisos de funciones implementadas.

Versión inicial:

- quién puede invitar;
- quién puede aprobar/rechazar;
- quién puede quitar miembros comunes;
- quién puede ver información de contacto;
- permisos Planner si ya están listos.

Solo coordinator puede editar.

---

## 11. UI / UX principles

### 11.1 No mock silencioso en datos familiares

Family Core maneja datos sensibles y estructurales.

Regla:

- no usar fallback mock silencioso para miembros;
- si falla members real, mostrar error y retry;
- si existe modo demo, debe estar marcado como demo;
- en desarrollo, loggear warning claro.

### 11.2 Perfil humano, no formulario frío

Usar lenguaje como:

- “Cumpleaños” en vez de “fecha de nacimiento”;
- “Teléfono” en vez de “número de contacto obligatorio”;
- “Mis hogares” en vez de “household selector”.

### 11.3 Permisos simples al principio

No mostrar una matriz inmensa de permisos.

Agrupar por secciones:

- Miembros;
- Invitaciones;
- Roles;
- Información visible;
- Planner.

### 11.4 Motion/Lottie

Lottie/Motion debe ayudar a entender estados, no decorar por decorar.

Buenos lugares:

- WaitingApprovalScreen;
- invitación copiada/creada;
- hogar vacío;
- perfil actualizado;
- cambio de hogar;
- aprobación exitosa.

---

## 12. Integración con Home

Home debe consumir:

- hogar activo;
- nombre del hogar;
- rol del usuario;
- miembros básicos si la pantalla lo usa;
- cumpleaños futuros;
- pending states si aplica.

Home no administra miembros en profundidad.

---

## 13. Integración con Planner

Planner debe consumir:

- `members` activos;
- `household_members.id` para asignaciones;
- nombre/avatar/rol para mostrar responsables;
- permisos Planner cuando estén activos.

Regla:

```txt
assigned_to_member_id = household_members.id
```

No usar `auth_user_id` para asignar tareas.

---

## 14. Integración futura con SOS

SOS no se implementa en este bloque.

Pero Family Core deja listo:

- teléfono;
- perfiles familiares;
- miembros del hogar;
- roles;
- contactos rápidos.

Esto permitirá que SOS use datos reales más adelante.

---

## 15. Cuenta y seguridad

Debe diseñarse ahora como sección visible, pero puede implementarse por etapas.

### Ahora

- mostrar email actual;
- logout;
- entrada visual a cambiar contraseña/email.

### Implementar si no complica

- solicitar cambio de contraseña;
- solicitar cambio de email.

### Futuro

- sesiones activas;
- dispositivos;
- eliminar cuenta;
- MFA;
- privacidad avanzada.

---

## 16. Plan de implementación por etapas

### H-042.1 — Data model hardening

Objetivo:

- verificar roles;
- asegurar `child`;
- defaults de permissions;
- límite 5 hogares;
- last coordinator protection;
- evitar mock silencioso.

Incluye:

- migraciones si hacen falta;
- helpers de permisos;
- validaciones backend.

### H-042.2 — Profile / People sync

Objetivo:

- hacer de `people` la fuente real del perfil.

Incluye:

- `PATCH /api/people/me`;
- avatar en `people.avatar_url`;
- ProfileScreen usa `authMe.person`;
- refetchMe;
- FamilyScreen refleja cambios.

### H-042.3 — Edit Profile + Account section

Objetivo:

- perfil editable completo razonable.

Incluye:

- display_name;
- first_name;
- last_name;
- phone;
- cumpleaños;
- avatar;
- sección Cuenta y Seguridad base.

### H-042.4 — Multi-household management

Objetivo:

- cerrar multi-hogar profesional.

Incluye:

- HouseholdSelectionScreen;
- ManageHouseholdsScreen;
- set active household;
- create/join desde Mis hogares;
- leave household;
- límite 5;
- estados pending/active/finalized.

### H-042.5 — Permissions system

Objetivo:

- permisos configurables para funciones actuales.

Incluye:

- config defaults;
- UI de permisos;
- invite/approve/reject por adult/coordinator;
- remove common members por adult/coordinator;
- settings/roles solo coordinator;
- permisos preparados para Planner.

### H-042.6 — FamilyScreen final

Objetivo:

- convertir FamilyScreen en centro real del hogar.

Incluye:

- miembros activos;
- perfiles familiares;
- pending requests;
- invite link;
- quitar miembros;
- cambiar roles;
- role change requests;
- chips/sections/empty/loading/error.

### H-042.7 — Role change requests

Objetivo:

- solicitudes reales de cambio de rol.

Incluye:

- tabla;
- endpoints;
- UI para solicitar;
- UI coordinator para aprobar/rechazar;
- motivo opcional;
- no solicitar coordinator.

### H-042.8 — Invite / Waiting polish

Objetivo:

- mejorar experiencia de entrada.

Incluye:

- copy/share/QR;
- revoke;
- pending screen;
- botón actualizar;
- mensajes humanos;
- preparado para realtime/Lottie.

### H-042.9 — Create Household final UX

Objetivo:

- pulir creación de hogar.

Incluye:

- tipo de hogar;
- guardar en config;
- wording humano;
- inicializar permisos;
- límite 5;
- opción unirse.

### H-042.10 — QA multiusuario + visual polish

Objetivo:

- validar todo el bloque.

Incluye:

- dos o más usuarios;
- multi-hogar;
- invite;
- pending;
- approve/reject;
- role requests;
- profile;
- members;
- Home;
- Planner;
- permisos;
- checks técnicos;
- polish visual/motion.

---

## 17. QA final obligatorio

### Usuario sin hogar

- registrar usuario;
- `/me` devuelve create/join;
- crear hogar;
- queda coordinator;
- entra a Home.

### Multi-hogar

- crear segundo hogar;
- límite 5;
- seleccionar hogar activo;
- cambiar de hogar;
- Home/Planner cambian contexto.

### Invitaciones

- adult crea link;
- coordinator crea link;
- invitado entra;
- queda pending;
- adult aprueba;
- coordinator aprueba;
- reject funciona.

### Members

- listar miembros;
- ver perfil familiar;
- ver teléfono/cumpleaños;
- adult quita miembro común;
- adult no quita coordinator;
- coordinator cambia rol;
- no queda hogar sin coordinator.

### Role change request

- usuario solicita rol;
- no puede solicitar coordinator;
- coordinator aprueba;
- rol cambia;
- coordinator rechaza;
- usuario cancela pending.

### Profile

- editar nombre;
- editar teléfono;
- editar cumpleaños;
- subir avatar;
- avatar aparece en Profile;
- avatar aparece en FamilyScreen;
- avatar aparece en members para Planner.

### Permissions

- adult puede invitar/aprobar según config;
- si config cambia, permisos cambian;
- solo coordinator edita permisos;
- permisos no rompen reglas duras.

### Waiting approval

- muestra estado pending;
- botón actualizar;
- no accede a Home completo;
- cuando se aprueba, entra al hogar.

---

## 18. Decisiones futuras no bloqueantes

No implementar ahora salvo que el equipo decida ampliar scope:

- privacidad por campo;
- visibilidad avanzada de teléfono/cumpleaños;
- suspender/reactivar miembros;
- audit log completo;
- historial completo de invitaciones;
- transferencia formal de ownership;
- parental controls;
- verificación legal por edad;
- cuenta infantil administrada por adulto;
- feed de cumpleaños;
- eventos automáticos de cumpleaños;
- SOS completo;
- realtime completo;
- notificaciones push.

---

## 19. Criterio DONE de Family Core

Family Core queda listo cuando:

- People es fuente real del perfil;
- Profile edita datos básicos;
- avatar sincroniza con Members;
- multi-hogar funciona;
- límites de hogares se respetan;
- permisos básicos existen y se aplican;
- adult/coordinator pueden invitar/aprobar según reglas;
- FamilyScreen gestiona miembros reales;
- perfiles familiares existen;
- role change requests funcionan;
- último coordinator está protegido;
- Create Household guarda tipo de hogar;
- WaitingApprovalScreen está pulida;
- Home y Planner consumen datos correctos;
- no hay mocks silenciosos en datos familiares;
- QA multiusuario pasa;
- TypeScript/expo-doctor/backend syntax pasan.

---

## 20. Resumen final

Family Core debe convertir la base familiar de HomePlus en una estructura sólida y humana.

La app debe entender:

- quién es el usuario;
- en qué hogares participa;
- cuál es su hogar activo;
- qué rol tiene en cada hogar;
- qué permisos tiene;
- quiénes conviven o coordinan con él;
- cómo invitar personas;
- cómo aprobarlas;
- cómo gestionar roles;
- cómo ver perfiles familiares;
- cómo preparar datos para Home, Planner, SOS y futuras funciones.

Este diseño prioriza una app profesional, extensible y preparada para crecer sin reescribir toda la base familiar más adelante.
