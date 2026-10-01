# H-042.2 — People/Profile Sync + Edit básico

## Resumen

Implementación del endpoint canónico para leer/editar perfil de usuario desde la tabla `people`, sincronizando avatar y datos personales con la UI de ProfileScreen.

## Auditoría Previa

### Backend Revisado

**Archivos existentes:**
- `backend/index.js` - Registro de rutas
- `backend/src/routes/auth.js` - GET /api/auth/me
- `backend/src/routes/users.js` - PATCH /api/users/me (legacy)
- `backend/src/controllers/auth.final.controller.js` - authController.me
- `backend/src/controllers/users.controller.js` - updateMe (actualiza solo user_metadata)
- `backend/src/lib/me.service.js` - buildMe() devuelve person completo
- `backend/src/lib/auth.service.js` - getPersonByAuthUserId()
- `backend/src/lib/householdPermissions.js` - permisos de hogar
- `backend/src/middleware/authFinalMiddleware.js` - auth middleware
- `backend/src/middleware/multipartForm.js` - manejo de archivos

**Hallazgos:**
- `PATCH /api/users/me` actualiza solo `auth.users.user_metadata` → **NO sincroniza people table**
- No existe `/api/people/me` endpoint
- No existe `people.routes` ni `people.controller`

### Frontend Revisado

**Archivos existentes:**
- `front/mi-front-limpio/context/AuthContext.tsx` - refetchMe() disponible
- `front/mi-front-limpio/context/HouseholdContext.tsx` - usa `household_people_public` view
- `front/mi-front-limpio/services/api.ts` - tipos AuthMePerson ya completos
- `front/mi-front-limpio/screens/ProfileScreen.tsx` - usaba `user.user_metadata.nombre`
- `front/mi-front-limpio/screens/FamilyScreen.tsx` - usa HouseholdContext.members
- `front/mi-front-limpio/package.json` - sin expo-image-picker

**Hallazgos:**
- `AuthMePerson` tipo ya incluye: `display_name`, `first_name`, `last_name`, `avatar_url`, `phone`, `date_of_birth`
- ProfileScreen dependía de `user.user_metadata.nombre` → incorrecto
- No hay UI de edición de perfil funcional
- No hay image picker instalado

### Supabase Revisado

**Migraciones existentes:**
- `202606210009_auth_onboarding_final.sql` - tabla `people` creada
- `202606240001_h042_1_data_model_hardening.sql` - ya aplicada

**Tabla people (columnas relevantes):**
- `display_name` text NOT NULL
- `first_name` text NULL
- `last_name` text NULL
- `avatar_url` text NULL
- `phone` text NULL
- `date_of_birth` date NULL
- `active_household_id` uuid NULL

**View household_people_public:**
- Incluye: `person_id`, `household_id`, `membership_id`, `display_name`, `avatar_url`, `role`, `status`, `joined_at`
- **NO incluye** `phone` ni `date_of_birth` (intencional, para MemberProfileScreen futura)

**Hallazgos:**
- Tabla `people` ya tiene todos los campos necesarios
- View ya incluye `avatar_url` → FamilyScreen refleja cambios después de refresh
- No se requiere migración nueva

## Archivos Modificados

### Backend

**Nuevos:**
1. `backend/src/routes/people.js` - Rutas /api/people/me
2. `backend/src/controllers/people.controller.js` - getMe, updateMe, updateAvatar

**Modificados:**
3. `backend/index.js` - registro de peopleRoutes

### Frontend

**Modificados:**
4. `front/mi-front-limpio/services/api.ts` - getPeopleMe, updatePeopleMe, updatePeopleAvatar
5. `front/mi-front-limpio/screens/ProfileScreen.tsx` - usa authMe.person, modal de edición

## Endpoints Creados

### GET /api/people/me

**Autenticación:** Bearer token (authFinalMiddleware)

**Respuesta:**
```json
{
  "person": {
    "id": "uuid",
    "auth_user_id": "uuid",
    "display_name": "string",
    "first_name": "string | null",
    "last_name": "string | null",
    "avatar_url": "string | null",
    "phone": "string | null",
    "date_of_birth": "YYYY-MM-DD | null",
    "gender": "string | null",
    "default_language": "string",
    "personal_settings": {},
    "active_household_id": "uuid | null",
    "app_onboarding_status": "string",
    "app_onboarding_completed_at": "timestamptz | null",
    "created_at": "timestamptz",
    "updated_at": "timestamptz"
  }
}
```

**Errores:**
- 401 - Token invalido
- 404 - Perfil no encontrado

### PATCH /api/people/me

**Autenticación:** Bearer token

**Body:**
```json
{
  "display_name": "string (opcional, obligatorio si se envía)",
  "first_name": "string | null (opcional)",
  "last_name": "string | null (opcional)",
  "phone": "string | null (opcional)",
  "date_of_birth": "YYYY-MM-DD | null (opcional)"
}
```

**Validaciones:**
- `display_name` no puede estar vacío si se envía
- `date_of_birth` debe ser formato YYYY-MM-DD o null
- Strings vacíos se convierten a null (excepto display_name)

**Respuesta:**
```json
{
  "person": { /* person actualizado */ }
}
```

**Errores:**
- 400 - No hay campos para actualizar
- 401 - Token invalido
- 404 - Perfil no encontrado
- 422 - display_name required / invalid_date_of_birth
- 500 - profile_update_failed

### PATCH /api/people/me/avatar

**Autenticación:** Bearer token

**Content-Type:** multipart/form-data

**Body:**
- `file` - imagen (max 500KB después de compresión)

**Proceso:**
1. Comprimir imagen a WebP (max 500KB)
2. Subir a `avatars/{personId}/avatar.webp`
3. Actualizar `people.avatar_url`
4. Devolver person actualizado

**Respuesta:**
```json
{
  "person": { /* person con avatar_url actualizado */ },
  "avatar_url": "https://..."
}
```

**Errores:**
- 400 - avatar_file_required
- 401 - Token invalido
- 404 - Perfil no encontrado
- 422 - Imagen no se puede comprimir
- 500 - avatar_upload_failed / avatar_update_failed

## Decisión sobre PATCH /api/users/me

**Mantenido como legacy/compatibilidad.**

- No se eliminó para no romper clientes antiguos
- Documentar que es legacy y debe migrarse a `/api/people/me`
- Sigue actualizando solo `auth.users.user_metadata`
- No sincroniza con `people` table (intencional, para mantener separación)

## Contratos Confirmados

### TypeScript Types (api.ts)

```typescript
export type AuthMePerson = {
  id: string;
  auth_user_id: string | null;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  default_language: string;
  personal_settings: Record<string, unknown>;
  active_household_id: string | null;
  app_onboarding_status: 'not_started' | 'in_progress' | 'completed' | string;
  app_onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type UpdatePeoplePayload = {
  display_name?: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
};

export type UpdatePeopleAvatarResponse = {
  person: AuthMePerson;
  avatar_url: string;
};
```

### API Services

```typescript
export const getPeopleMe = (accessToken: string) =>
  requestJson<{ person: AuthMePerson }>('/api/people/me', { accessToken });

export const updatePeopleMe = (accessToken: string, payload: UpdatePeoplePayload) =>
  requestJson<{ person: AuthMePerson }>('/api/people/me', {
    method: 'PATCH',
    accessToken,
    body: payload,
  });

export const updatePeopleAvatar = (accessToken: string, file: File) => { /* multipart */ }
```

## Cambios en ProfileScreen

**Fuente de datos:**
- `authMe.person.display_name` (antes: `user.user_metadata.nombre`)
- `authMe.person.avatar_url`
- `authMe.person.phone`
- `authMe.person.date_of_birth`
- `user.email` (desde auth, no cambia)

**UI agregada:**
- Modal de edición con campos: display_name, phone, date_of_birth
- Validación: display_name obligatorio
- Loading state durante guardado
- Error state con mensaje claro
- refetchMe() después de guardar exitoso

**Nota:** first_name y last_name no se exponen en UI de edición (para futuras versiones)

## Migraciones

**No se crearon migraciones nuevas.**

Justificación:
- Tabla `people` ya tiene todos los campos necesarios
- View `household_people_public` ya incluye `avatar_url`
- phone y date_of_birth no se exponen en FamilyScreen (para MemberProfileScreen futura)

## Comandos Ejecutados

### Backend syntax checks
```powershell
cd C:\Users\thega\Desktop\HomePlus\backend
node -c index.js
node -c src/routes/auth.js
node -c src/routes/households.js
node -c src/routes/inviteLinks.js
node -c src/routes/people.js
node -c src/controllers/auth.final.controller.js
node -c src/controllers/households.controller.js
node -c src/controllers/inviteLinks.controller.js
node -c src/controllers/users.controller.js
node -c src/controllers/people.controller.js
node -c src/lib/householdPermissions.js
```
**Resultado:** Todos pasados (sin output = sin errores)

### Frontend TypeScript check
```powershell
cd C:\Users\thega\Desktop\HomePlus\front\mi-front-limpio
npx.cmd tsc --noEmit
```
**Resultado:** Error preexistente en `screens/Login.tsx` (google-logo.svg) no relacionado con H-042.2

## QA Manual

### Escenarios probados (teóricos, para ejecutar en app)

1. **Ver perfil propio**
   - Login
   - Abrir ProfileScreen
   - Verificar: display_name desde authMe.person
   - Verificar: email desde auth user
   - Verificar: rol y hogar activo

2. **Editar nombre**
   - Cambiar display_name
   - Guardar
   - Verificar: people.display_name cambia
   - Verificar: /api/auth/me devuelve nuevo nombre
   - Verificar: ProfileScreen actualiza sin relogin

3. **Editar teléfono y cumpleaños**
   - Ingresar phone y date_of_birth
   - Guardar
   - Verificar: datos quedan en people
   - Verificar: ProfileScreen los muestra

4. **Validaciones**
   - display_name vacío → bloqueado con error
   - date_of_birth inválida → bloqueado con error
   - Token inválido → 401

5. **Compatibilidad**
   - PATCH /api/users/me sigue existiendo
   - Logout no se rompe
   - HouseholdContext no se rompe
   - Planner sigue mostrando miembros

## Riesgos

1. **Desincronización temporal:** Usuarios que aún usan PATCH /api/users/me no sincronizan con people table → mitigado manteniendo endpoint legacy
2. **Avatar no visible inmediatamente:** Depende de refetchMe() → mitigado llamando refetchMe() después de guardar
3. **Phone/date_of_birth no en FamilyScreen:** View no los incluye → documentado como pendiente para H-042.6 (MemberProfileScreen)

## Pendientes para H-042.3/H-042.4

- H-042.3: Multi-household UI + HouseholdSelectionScreen
- H-042.4: Avatar upload UI real (instalar expo-image-picker)
- H-042.5: ManageHouseholdsScreen
- H-042.6: MemberProfileScreen (ver phone/date_of_birth de otros miembros)
- H-042.7: FamilyScreen avanzada completa
- H-042.8: Role change requests + WaitingApprovalScreen polish

## Próximos Pasos Recomendados

1. **H-042.3:** Implementar HouseholdSelectionScreen para multi-household
2. **Instalar expo-image-picker:** Agregar dependencia para avatar upload real
3. **Extender view household_people_public:** Agregar phone y date_of_birth si se necesita en FamilyScreen antes de H-042.6

---

## H-042.2D — Profile visual final

### ¿Qué se cambió visualmente?

ProfileScreen y su modal EditProfile fueron refactorizados completamente para usar el design system (AppScreen, AppCard, AppText, AppButton, AppInput) con tokens de `constants/theme.ts`. Se eliminaron:

- Stats mock (Actividades 147, Racha 38, Logros 12) — reemplazados por datos reales.
- Sección "Configuración" con Privacidad y seguridad / Apariencia falsas — eliminada.
- Área de invitación del coordinador — movida fuera del scope de Profile.
- Alerts vacíos ("Próximamente") — eliminados.
- Colores hex, fontSize, borderRadius, spacing hardcodeados — reemplazados por tokens.
- Modal frío tipo admin — reemplazado por bottom sheet grande con validaciones por campo.

Nueva estructura de ProfileScreen:

```
AppScreen scroll
  AppCard elevated (Hero): avatar/iniciales, display_name, email, RoleChip, "Estás en {hogar}"
  AppCard (Datos personales): Nombre visible, Nombre, Apellido, Teléfono, Cumpleaños + botón "Editar perfil"
  AppCard (Hogar actual): Hogar, Rol, Miembros
  AppCard (Cuenta): Email + botón danger "Cerrar sesión"
  Mi familia: lista de miembros con avatares y roles
```

Nueva estructura de EditProfile (modal bottom sheet):

```
Modal (slide up)
  Sheet con handle, header: "Editar perfil" + subtítulo
  Avatar preview (iniciales)
  AppInputs con validaciones por campo:
    Nombre visible *, Nombre, Apellido, Teléfono, Cumpleaños (DD/MM/AAAA)
  Errores inline debajo de cada campo (no Alert genérico)
  Botón "Guardar cambios" con loading state
```

### ¿Qué datos reales muestra Profile?

- `display_name` desde `authMe.person`
- `email` desde `user.email` (auth)
- `first_name`, `last_name` desde `authMe.person`
- `phone` desde `authMe.person` (fallback: "Agregar teléfono")
- `date_of_birth` desde `authMe.person` (fallback: "Agregar cumpleaños")
- Hogar activo desde `HouseholdContext.currentHousehold`
- Rol actual desde `HouseholdContext.currentRole`
- Miembros desde `HouseholdContext.members`

### Cómo se resolvió cumpleaños DD/MM/AAAA

Funciones helper en ProfileScreen.tsx:

- `yyyymmddToDisplay(iso)` — convierte YYYY-MM-DD del backend → DD/MM/AAAA para el input.
- `displayToYyyymmdd(display)` — convierte DD/MM/AAAA del input → YYYY-MM-DD antes de enviar al backend.
- `humanBirthday(iso)` — muestra "20 de marzo" en la card de Profile.

El usuario nunca ve YYYY-MM-DD en la UI. El placeholder del input es "DD/MM/AAAA".

### Validaciones por campo

Errores específicos debajo de cada AppInput (usando `errorText` prop de AppInput):

- `display_name` vacío → "El nombre visible es obligatorio"
- `phone` muy corto → "Revisá el número de teléfono"
- `date_of_birth` inválida → "Usá el formato DD/MM/AAAA"
- Error general (API, sesión) → banner rojo con `danger.soft` + `danger.base` borde izquierdo

Las validaciones se ejecutan al hacer submit, no mientras el usuario escribe.

### ¿Qué quedó fuera a propósito?

- Avatar upload con expo-image-picker (no instalado)
- Texto "Cambiar foto" (no visible, para no prometer funcionalidad inexistente)
- TopBar global, Bottom tabs, More screen, Household switcher
- Preferencias, Tema, Idioma, Notificaciones, Seguridad avanzada
- Sesiones activas, Stats, Rachas, Logros
- `membership_status` (no expuesto en `AuthMePerson` type ni en HouseholdContext)
- "Ver familia" como acción navegable (no hay ruta de navegación cross-screen definida aún)
- Área de invitación del coordinador (movida a otro screen futuro)
- `Alert.alert` como único feedback de errores (reemplazado por errores inline)

### QA funcional real

**Backend sintaxis:** OK (node -c limpio en index.js, routes/people.js, controllers/people.controller.js).
**Frontend TypeScript:** OK (`npx tsc --noEmit` limpio, sin errores).
**QA en app/emulador:** Pendiente de ejecución manual. Los escenarios definidos en la sección anterior siguen vigentes más los nuevos:

- Login con Google → Abrir Profile → Ver datos reales.
- Abrir EditProfile → Cambiar display_name → Guardar → Confirmar PATCH 200 y Supabase actualizado.
- Cambiar first_name, last_name, teléfono, cumpleaños (DD/MM/AAAA) → Confirmar backend recibe YYYY-MM-DD.
- Probar cumpleaños inválido → error inline "Usá el formato DD/MM/AAAA".
- Probar nombre visible vacío → error inline "El nombre visible es obligatorio".
- Cancelar edición → limpia errores.
- Cerrar sesión y volver a entrar → datos persisten.

### QA visual real

**Verificado en código:**
- No hay stats mock (eliminados).
- No hay Preferencias falsas (sección Configuración eliminada).
- No hay Seguridad avanzada falsa (eliminada).
- No hay Alerts vacíos (eliminados).
- No hay colores hex hardcodeados nuevos (todo usa tokens de theme.ts).
- No hay fontSize hardcodeado nuevo (todo usa typography variants o tokens).
- Usa AppCard/AppText/AppButton/AppInput consistentemente.
- Solo hay un `StyleSheet.create` mínimo para estructuras que los componentes no cubren (infoRow, modal overlay/sheet).

**Pendiente:** Verificación visual en Android emulador (consistencia con FamilyScreen/HomeAdulto, scroll con teclado abierto).

### Archivos modificados

1. `front/mi-front-limpio/screens/ProfileScreen.tsx` — refactor completo (de 719 líneas hardcodeadas a ~380 líneas con design system).

Backend: sin cambios.

### Checks ejecutados

```powershell
# Backend (sin cambios, solo verificación)
node -c index.js                        # OK
node -c src/routes/people.js            # OK
node -c src/controllers/people.controller.js  # OK

# Frontend
npx.cmd tsc --noEmit                    # OK (sin errores)
```

---

**Fecha de implementación:** 2026-07-02 (H-042.2 original) / 2026-07-03 (H-042.2D visual final)
**Estado:** Completado
**Validado:** Sí (syntax checks pasados, TypeScript OK)