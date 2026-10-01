# H-042 Family Core — Implementation Handoff

## 0. Propósito

Este documento es el paquete de contexto para arrancar un chat nuevo de implementación de `H-042 Family Core`.

No reemplaza a `family_core_final_design.md`.  
El diseño final sigue siendo la fuente principal de verdad.

Este handoff resume:
- estado real actual detectado en auditoría;
- decisiones cerradas;
- enfoque de implementación;
- formato de prompt recomendado;
- puntos donde el implementador debe auditar el repo antes de tocar código.

---

## 1. Proyecto

Proyecto: HomePlus / Family Hub.

Stack:
- Frontend: React Native + Expo.
- Backend: Node/Express.
- Auth/DB/RLS: Supabase.

Rutas del repo:
- Frontend: `front/mi-front-limpio`
- Backend: `backend`
- Migraciones Supabase: `supabase/migrations`

Objetivo actual:

Implementar `H-042 Family Core` con la mayor calidad posible, ya no como entrega rápida, sino como base estable y profesional de la aplicación.

---

## 2. Documentos para el chat nuevo

Adjuntar o pegar:

1. `family_core_final_design.md`
   - Fuente principal de verdad.
   - Contiene decisiones finales de producto, roles, permisos, multi-hogar, profile, members, migraciones y QA.

2. `h042_family_core_audit.md`
   - Auditoría previa del estado real del repo.
   - Sirve para entender qué ya existe y qué está semi implementado.

3. Linear / tareas actuales
   - IDs, estados y prioridades.

4. Este archivo: `h042_family_core_implementation_handoff.md`
   - Contexto compacto para no arrancar desde cero.

---

## 3. Estado real actual según auditoría

No se arranca de cero.

Ya existe una implementación base:
- Auth/Onboarding con `/api/auth/me`.
- Crear hogar.
- Invite links.
- Join por token.
- Pending requests.
- Approve/reject.
- Members reales vía `household_people_public`.
- `FamilyScreen` real.
- `HouseholdContext` real.
- Planner consume `members`.

Backend detectado como avanzado:
- registro/login;
- `/api/auth/me`;
- crear hogar;
- crear invite link;
- revocar invite link;
- join por token;
- listar solicitudes;
- aprobar solicitud;
- rechazar solicitud;
- finalizar/quitar miembro.

Brechas detectadas:
- multi-hogar sin UI completa;
- permisos no formalizados;
- Profile/People sync incompleto;
- avatar guardado en metadata pero no sincronizado con `people.avatar_url`;
- edición de perfil incompleta;
- `FamilyScreen` necesita pasar de lista básica a gestión familiar avanzada;
- `WaitingApprovalScreen` muy básica;
- posible fallback mock en `HouseholdContext`;
- tipo de hogar en crear familia no se persiste o no está cerrado;
- falta QA multiusuario completo.

---

## 4. Decisiones cerradas

### Multi-hogar

- HomePlus permite multi-hogar.
- Un usuario puede pertenecer a varios hogares activos.
- `people.active_household_id` representa el hogar actualmente seleccionado.
- Límite: máximo 5 hogares `active + pending` por usuario.
- Cualquier usuario autenticado puede crear otro hogar mientras no supere el límite.

### Roles finales

Roles técnicos finales:
- `coordinator`
- `adult`
- `adolescent`
- `child`
- `senior`
- `guest`

Importante:
- No eliminar `child`.
- `child` y `adolescent` son roles distintos.
- Los roles son por hogar/membership, no globales del usuario.

### Estados

Estados funcionales principales:
- `pending`
- `active`
- `finalized`

`suspended`:
- no se usa en la UX actual;
- no implementar suspender/reactivar ahora;
- si existe en DB, queda como estado técnico no usado por la experiencia actual.

### Coordinator

- Es el rol máximo del hogar.
- Puede editar configuración del hogar.
- Puede editar permisos.
- Puede cambiar roles de miembros active.
- Puede asignar coordinator a otro miembro.
- Puede quitar miembros.
- Nunca puede quedar un hogar sin al menos un coordinator active.

### Adult

Adult puede:
- invitar miembros;
- aprobar solicitudes;
- rechazar solicitudes;
- elegir rol inicial al aprobar;
- quitar miembros comunes.

Adult no puede:
- quitar coordinators;
- cambiar roles de miembros active;
- asignar coordinator;
- editar configuración del hogar;
- editar permisos.

### Datos visibles dentro del hogar

Todos los miembros active del hogar pueden ver perfil familiar básico de otros miembros:
- avatar;
- nombre;
- rol;
- estado;
- teléfono;
- cumpleaños.

El teléfono queda visible dentro del hogar.  
El cumpleaños queda visible dentro del hogar y puede usarse luego para feed/calendario/eventos.

### Role change requests

- Cualquier miembro puede solicitar cambio de rol.
- No puede solicitar `coordinator`.
- `coordinator` solo se asigna directamente por otro coordinator.
- Motivo de solicitud: opcional.
- Coordinator revisa y aprueba/rechaza.

### Invitaciones

- Invite link general.
- El usuario entra como `pending`.
- Al aprobar, adult/coordinator elige rol final.
- No usar rol sugerido dentro del link por ahora.

---

## 5. Enfoque sobre “no tocar”

No conviene llenar los prompts de prohibiciones rígidas porque puede limitar demasiado al implementador.

Usar protecciones suaves:
- Preservar Auth/OAuth salvo integración necesaria con `/me`.
- No modificar secretos ni `.env`.
- No cambiar deploy config.
- Evitar tocar Planner/Home salvo consumo de `household`, `members` o permisos.
- No borrar legacy sin justificarlo.
- Antes de tocar una zona sensible, auditar y explicar el motivo.

La idea no es decir “nunca toques X”, sino:
“tocá lo necesario, justificá cambios sensibles y no rompas lo que ya está validado”.

---

## 6. Auditoría previa obligatoria antes de implementar

Antes de cada etapa, revisar el repo real y responder:
- qué archivos existen;
- qué funciones ya están implementadas;
- qué contratos reales tienen los endpoints;
- qué migraciones ya existen;
- qué tipos frontend/backend ya existen;
- qué pantallas usan datos reales, mock o fallback;
- qué cambios mínimos y profesionales propone;
- qué riesgos detecta.

Archivos esperados a revisar según etapa:

Backend:
- `backend/src/routes/auth.js`
- `backend/src/routes/households.js`
- `backend/src/routes/inviteLinks.js`
- `backend/src/controllers/auth.final.controller.js`
- `backend/src/controllers/households.controller.js`
- `backend/src/controllers/inviteLinks.controller.js`
- `backend/src/controllers/users.controller.js`
- `backend/src/lib/me.service.js`
- `backend/src/lib/auth.service.js`
- middlewares auth
- helpers Supabase
- migraciones Supabase

Frontend:
- `front/mi-front-limpio/context/AuthContext.tsx`
- `front/mi-front-limpio/context/HouseholdContext.tsx`
- `front/mi-front-limpio/navigation/AppNavigator.tsx`
- `front/mi-front-limpio/services/api.ts`
- `front/mi-front-limpio/services/households.ts`
- `front/mi-front-limpio/services/invitations.ts`
- `front/mi-front-limpio/screens/CrearGrupo.tsx`
- `front/mi-front-limpio/screens/JoinHousehold.tsx`
- `front/mi-front-limpio/screens/InvitarPersonas.tsx`
- `front/mi-front-limpio/screens/FamilyScreen.tsx`
- `front/mi-front-limpio/screens/ProfileScreen.tsx`
- Planner screens/services solo para integración con `members`.

---

## 7. Áreas de implementación posibles

El nuevo chat puede redefinir el orden final, pero el alcance general incluye:
- hardening de modelo de datos;
- permisos configurables;
- multi-hogar;
- Profile + People sync;
- edición de perfil;
- FamilyScreen avanzada;
- perfiles familiares;
- role change requests;
- invite/pending polish;
- create household final UX;
- fallback real en HouseholdContext;
- QA multiusuario;
- polish visual/motion cuando corresponda.

---

## 8. Formato de prompt de implementación

```txt
# H-042.X — [Nombre de la etapa]

## Contexto
Estamos implementando H-042 Family Core en HomePlus.

Fuente principal de verdad:
- family_core_final_design.md

Fuente de estado actual:
- h042_family_core_audit.md
- repo real

Esta etapa NO parte desde cero. Debe reutilizar lo ya implementado cuando esté correcto.

## Objetivo
[Explicar en 3-6 líneas qué se quiere lograr.]

## Alcance de esta etapa
Implementar:
- [punto 1]
- [punto 2]
- [punto 3]

No implementar todavía:
- [punto que pertenece a otra etapa]
- [punto futuro]
- [punto condicionado por otro módulo]

## Auditoría previa obligatoria
Antes de modificar código, revisar:

Backend:
- [archivos concretos]

Frontend:
- [archivos concretos]

Supabase/migraciones:
- [archivos o tablas concretas]

Reportar:
- qué existe;
- qué falta;
- qué se reutiliza;
- qué se cambia;
- riesgos.

## Decisiones de producto aplicables
- [decisión cerrada 1]
- [decisión cerrada 2]
- [decisión cerrada 3]

No reinterpretar estas decisiones.

## Implementación esperada

Backend:
- [endpoints/RPC/services esperados]
- [validaciones]
- [errores]
- [permisos]

Frontend:
- [pantallas]
- [servicios]
- [contextos]
- [estados UX]
- [loading/error/empty states]

DB/RLS si aplica:
- [tabla]
- [campos]
- [policies]
- [constraints]
- [migración]

## Reglas de calidad
- Mantener contratos existentes cuando sea posible.
- No duplicar lógica.
- Evitar mocks silenciosos.
- Errores claros.
- Loading states reales.
- Empty states reales.
- Tipos TypeScript actualizados.
- Backend valida permisos, no solo UI.
- No dejar un hogar sin coordinator.
- No permitir acciones sobre otro hogar.

## QA manual
Probar:
1. [caso]
2. [caso]
3. [caso]

## Validaciones técnicas

Backend:
cd backend
node -c index.js
node -c src/routes/auth.js
node -c src/routes/households.js
node -c src/routes/inviteLinks.js
node -c src/controllers/auth.final.controller.js
node -c src/controllers/households.controller.js
node -c src/controllers/inviteLinks.controller.js

Frontend:
cd front/mi-front-limpio
npx.cmd tsc --noEmit
npx.cmd expo-doctor

Supabase:
- validar migraciones nuevas;
- revisar RLS si se agregan tablas;
- confirmar que una DB limpia puede aplicar migraciones.

## Documentación
Crear o actualizar:
- docs/implementation/h042_X_[nombre].md

Debe incluir:
- archivos modificados;
- contratos reales;
- decisiones aplicadas;
- QA ejecutado;
- comandos ejecutados;
- pendientes.

## Reporte final esperado
Responder con:
- resumen de implementación;
- archivos modificados;
- endpoints/migraciones creadas;
- riesgos;
- comandos ejecutados y resultado;
- QA manual realizado;
- siguiente etapa recomendada.
```

---

## 9. Prompt inicial recomendado para el chat nuevo

```txt
Estoy implementando H-042 Family Core avanzado en HomePlus.

Te voy a adjuntar:
1. family_core_final_design.md
2. h042_family_core_audit.md
3. h042_family_core_implementation_handoff.md
4. Linear / tareas actuales
5. formato de prompt por etapas

Usá family_core_final_design.md como fuente principal de verdad.
Usá h042_family_core_audit.md para entender el estado real actual.
Usá h042_family_core_implementation_handoff.md como resumen de contexto y decisiones cerradas.

No arranques implementando todavía.

Primero:
1. Leé los documentos.
2. Resumí qué entendiste.
3. Detectá dependencias reales.
4. Proponé el orden de etapas.
5. Proponé la primera etapa técnica con formato de prompt.
6. Esperá mi confirmación antes de implementar.

Objetivo:
Implementar Family Core al máximo nivel profesional posible, reutilizando lo ya existente, sin romper Auth/OAuth, y dejando la base preparada para Home, Planner, Realtime, Motion/Lottie y futuros módulos.
```

---

## 10. Validaciones base

Backend:
```bash
cd backend
node -c index.js
node -c src/routes/auth.js
node -c src/routes/households.js
node -c src/routes/inviteLinks.js
node -c src/controllers/auth.final.controller.js
node -c src/controllers/households.controller.js
node -c src/controllers/inviteLinks.controller.js
```

Frontend:
```bash
cd front/mi-front-limpio
npx.cmd tsc --noEmit
npx.cmd expo-doctor
```

Supabase:
- validar migraciones nuevas;
- revisar RLS;
- si se agregan tablas, probar reset/aplicación limpia cuando corresponda.

---

## 11. Nota sobre el orden de etapas

El orden no debe quedar fijo desde este handoff.

El nuevo chat debe poder proponer el orden real según:
- estado del repo;
- dependencias técnicas;
- Linear;
- riesgo;
- migraciones necesarias;
- qué conviene implementar primero para no rehacer trabajo.

Orden tentativo posible:
1. Data model / migrations.
2. Permissions.
3. Multi-household.
4. Profile + People sync.
5. FamilyScreen advanced.
6. Role change requests.
7. Invite/Pending polish.
8. Create household UX.
9. QA + visual polish.

Pero el orden final lo debe confirmar el nuevo chat después de revisar documentos y repo.
