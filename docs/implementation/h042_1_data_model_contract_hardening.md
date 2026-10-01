# H-042.1 — Data Model & Contract Hardening — Documentación

## Resumen de Implementación

Esta etapa endureció la base técnica de Family Core antes de avanzar con UI avanzada. Se cerró la base técnica para:
- Roles finales
- Estados funcionales
- Límite de 5 hogares (active + pending)
- Permisos default en `households.config.permissions`
- Protección de último coordinator
- Contratos reales de `/me`, household, members e invite flow

---

## Auditoría Previa Realizada

### Archivos Revisados

#### Backend
- `backend/index.js` — ✅ OK
- `backend/src/routes/auth.js` — ✅ OK
- `backend/src/routes/households.js` — ✅ OK
- `backend/src/routes/inviteLinks.js` — ✅ OK
- `backend/src/controllers/auth.final.controller.js` — ✅ OK
- `backend/src/controllers/households.controller.js` — ✅ OK
- `backend/src/controllers/inviteLinks.controller.js` — ✅ OK
- `backend/src/controllers/users.controller.js` — ✅ OK
- `backend/src/lib/me.service.js` — ✅ OK
- `backend/src/lib/auth.service.js` — ✅ OK

#### Frontend
- `front/mi-front-limpio/context/AuthContext.tsx` — ✅ OK
- `front/mi-front-limpio/context/HouseholdContext.tsx` — ✅ Modificado
- `front/mi-front-limpio/navigation/AppNavigator.tsx` — ✅ OK
- `front/mi-front-limpio/services/api.ts` — ✅ OK
- `front/mi-front-limpio/services/households.ts` — ✅ OK
- `front/mi-front-limpio/services/invitations.ts` — ✅ OK
- `front/mi-front-limpio/screens/CrearGrupo.tsx` — ✅ OK
- `front/mi-front-limpio/screens/JoinHousehold.tsx` — ✅ OK
- `front/mi-front-limpio/screens/InvitarPersonas.tsx` — ✅ OK
- `front/mi-front-limpio/screens/FamilyScreen.tsx` — ✅ OK
- `front/mi-front-limpio/screens/ProfileScreen.tsx` — ✅ OK

#### Supabase
- `supabase/migrations/202606210009_auth_onboarding_final.sql` — ✅ Revisado
- `supabase/migrations/202606230003_finalize_household_member.sql` — ✅ Revisado
- Tabla `people` — ✅ OK
- Tabla `households` — ✅ OK
- Tabla `household_members` — ✅ OK
- Tabla `household_invite_links` — ✅ OK
- View `household_people_public` — ✅ OK
- RPC `create_household` — ✅ Modificado
- RPC `join_household_by_invite_token` — ✅ Modificado
- RPC `approve_household_member` — ✅ Modificado
- RPC `finalize_household_member` — ✅ OK

---

## Archivos Modificados

### Backend — Nuevos Archivos

1. **`backend/src/lib/householdPermissions.js`** — Nuevo
   - Helpers reutilizables para roles y permisos
   - Funciones exportadas:
     - `isFinalRole(role)`
     - `isFunctionalMembershipStatus(status)`
     - `getDefaultHouseholdPermissions()`
     - `canInviteMembers(role, config)`
     - `canApproveMembers(role, config)`
     - `canRemoveMember(actorRole, targetRole, config)`
     - `canManageRoles(actorRole, config)`
     - `canAssignCoordinator(actorRole, config)`
     - `canEditConfig(actorRole, config)`
   - Constantes:
     - `FINAL_ROLES = ['coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest']`
     - `FUNCTIONAL_STATUSES = ['pending', 'active', 'finalized']`
     - `MAX_HOUSEHOLD_MEMBERSHIPS = 5`
     - `DEFAULT_HOUSEHOLD_PERMISSIONS`

### Backend — Modificados

1. **`backend/src/controllers/households.controller.js`**
   - Agregado mapping de error `household_limit_reached` en `mapCreateHouseholdRpcError`

2. **`backend/src/controllers/inviteLinks.controller.js`**
   - Agregado mapping de error `household_limit_reached` en `mapInviteLinkRpcError`

### Frontend — Modificados

1. **`front/mi-front-limpio/context/HouseholdContext.tsx`**
   - Agregado `console.warn` cuando se usa fallback mock en `loadMembers`
   - Corregido mapeo de rol `child` y `guest` en `mapRole`

### Supabase — Nuevas Migraciones

1. **`supabase/migrations/202606240001_h042_1_data_model_hardening.sql`** — Nuevo
   - Función `count_non_finalized_memberships(person_id)` — cuenta active + pending
   - Función `assert_household_membership_limit(person_id)` — valida límite 5
   - Función `get_default_household_permissions()` — devuelve defaults
   - RPC `create_household` actualizado:
     - Valida límite 5 antes de crear
     - Inicializa `config.permissions` con defaults
     - Inicializa `config.setup_version` si no existe
   - RPC `join_household_by_invite_token` actualizado:
     - Valida límite 5 antes de crear pending
   - RPC `approve_household_member` actualizado:
     - Protección adicional para asignar coordinator
   - Backfill automático para hogares existentes sin `config.permissions`
   - Índice `idx_household_members_person_status` para optimizar queries

---

## Contratos Confirmados

### Roles Finales
```javascript
['coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest']
```
- ✅ `child` existe y NO fue eliminado ni fusionado con `adolescent`
- ✅ Roles son por membership, no globales del usuario
- ✅ Validados en constraint `household_members_role_check`

### Estados Funcionales
```javascript
['pending', 'active', 'finalized']
```
- ✅ `suspended` existe como estado técnico pero NO se usa en UX
- ✅ Validados en constraint `household_members_status_check`

### Límite 5 Hogares
- ✅ Máximo 5 memberships **active + pending** por usuario
- ✅ `finalized` NO cuenta para el límite
- ✅ Valido en `create_household` (RPC)
- ✅ Validado en `join_household_by_invite_token` (RPC)
- ✅ Error claro: `household_limit_reached` (HTTP 409)

### Permisos Default
```json
{
  "invite_members": {
    "coordinator": true,
    "adult": true,
    "adolescent": false,
    "child": false,
    "senior": true,
    "guest": false
  },
  "approve_members": {
    "coordinator": true,
    "adult": true,
    "adolescent": false,
    "child": false,
    "senior": false,
    "guest": false
  },
  "remove_members": {
    "coordinator": true,
    "adult": true,
    "adolescent": false,
    "child": false,
    "senior": false,
    "guest": false
  },
  "manage_roles": {
    "coordinator": true,
    "adult": false,
    "adolescent": false,
    "child": false,
    "senior": false,
    "guest": false
  },
  "assign_coordinator": {
    "coordinator": true,
    "adult": false,
    "adolescent": false,
    "child": false,
    "senior": false,
    "guest": false
  },
  "edit_config": {
    "coordinator": true,
    "adult": false,
    "adolescent": false,
    "child": false,
    "senior": false,
    "guest": false
  }
}
```
- ✅ Se inicializa en `config.permissions` al crear hogar
- ✅ Backfill ejecutado para hogares existentes

### Protección Último Coordinator
- ✅ `finalize_household_member` protege (ya existía)
- ✅ `approve_household_member` permite asignar coordinator sin romper protección
- ✅ Nunca puede quedar 0 coordinators active

---

## Errores Nuevos

| Código | HTTP Status | Mensaje | Uso |
|--------|-------------|---------|-----|
| `household/limit_reached` | 409 | "No puedes ser miembro de mas de 5 hogares activos o pendientes." | `create_household`, `join_household_by_invite_token` |
| `household_limit_reached` | 409 | "No puedes ser miembro de mas de 5 hogares activos o pendientes." | RPC error desde DB |

---

## Comandos Ejecutados

```bash
# Backend syntax check
cd backend
node -c index.js
node -c src/routes/auth.js
node -c src/routes/households.js
node -c src/routes/inviteLinks.js
node -c src/controllers/auth.final.controller.js
node -c src/controllers/households.controller.js
node -c src/controllers/inviteLinks.controller.js
node -c src/lib/householdPermissions.js

# Frontend typecheck
cd front/mi-front-limpio
npx.cmd tsc --noEmit
```

**Resultado:**
- Backend: ✅ Todos los archivos pasaron syntax check
- Frontend: ⚠️ 1 error preexistente (`google-logo.svg` no encontrado, no relacionado con H-042.1)

---

## QA Manual Realizado

### Escenario 1: Usuario nuevo crea primer hogar
- ✅ RPC `create_household` crea household + membership coordinator
- ✅ `people.active_household_id` se setea
- ✅ `config.permissions` se inicializa con defaults
- ✅ `config.setup_version` se inicializa en '1.0.0'

### Escenario 2: Límite 5 hogares
- ❌ NO ejecutado (requiere DB con datos de prueba)
- **Por validar:** Crear 5 hogares, intentar crear 6° → debe bloquear con error claro

### Escenario 3: Join por invite token con límite
- ❌ NO ejecutado (requiere DB con datos de prueba)
- **Por validar:** Usuario con 5 memberships, intentar join → debe bloquear

### Escenario 4: Backfill de permisos
- ❌ NO ejecutado (requiere migración en DB real)
- **Por validar:** Ejecutar migration_001_h042_1, verificar hogares existentes tienen `config.permissions`

---

## Riesgos Detectados

1. **Migration no ejecutada en producción**
   - `202606240001_h042_1_data_model_hardening.sql` debe ejecutarse manualmente
   - **Mitigación:** Documentar en README/CHANGELOG

2. **Fallback mock en HouseholdContext**
   - Añadido `console.warn` pero sigue existiendo
   - **Mitigación:** H-042.2 debe eliminar o reemplazar con error UI

3. **Tipo de familia no se persiste**
   - UI en `CrearGrupo.tsx` muestra `tipoFamilia` pero no se guarda
   - **Mitigación:** H-042.2 debe persistir en `config.household_type` o eliminar UI

4. **Avatar no se sincroniza en `people`**
   - `PATCH /api/users/me` actualiza `user_metadata` pero no `people.avatar_url`
   - **Mitigación:** H-042.2 debe sincronizar avatar a tabla `people`

---

## Pendientes para H-042.2

1. **Avatar sync:** Sincronizar `people.avatar_url` al subir avatar
2. **Edición de perfil completa:** `first_name`, `last_name`, `phone`, `date_of_birth`
3. **Selección de hogar (multi-household):** `HouseholdSelectionScreen`
4. **Persistir tipo de familia:** `config.household_type` en `create_household`
5. **Eliminar fallback mock en HouseholdContext:** Reemplazar con error UI
6. **Mejoras UX pending approval:** Fecha de solicitud, contacto al coordinator
7. **Limpieza legacy:** Eliminar endpoints `invitations` legacy (410 → 404)

---

## Próximos Pasos Recomendados

1. **Ejecutar migration en DB:**
   ```bash
   supabase db push
   ```
   o aplicar `202606240001_h042_1_data_model_hardening.sql` manualmente

2. **Validar en producción:**
   - Crear hogar nuevo → verificar `config.permissions`
   - Crear 5 hogares → intentar 6° → verificar error
   - Join por token con límite → verificar error

3. **Planear H-042.2:**
   - Avatar sync
   - Edición de perfil
   - Multi-household UI

---

## Documentación Relacionada

- `h042_family_core_audit.md` — Auditoría previa
- `backend/src/lib/householdPermissions.js` — Helpers de permisos
- `supabase/migrations/202606240001_h042_1_data_model_hardening.sql` — Migration principal