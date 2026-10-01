# FamilyHub — Auth Base (migration_001)

## Archivos creados

| Archivo | Propósito |
|---|---|
| `backend/sql/migration_001_auth_base.sql` | Migración principal |
| `backend/sql/migration_001_verify.sql` | Script de verificación |

---

## Tablas creadas

### `public.users`
Espejo de `auth.users`. Creada automáticamente por trigger al registrarse.

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | = auth.users.id — NO usa gen_random_uuid() |
| email | text NOT NULL UNIQUE | |
| nombre | text NOT NULL | desde raw_user_meta_data.nombre o prefijo del email |
| avatar_url | text | |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | actualizado por trigger |
| notification_prefs | jsonb | default '{}' |

### `public.households`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| nombre | text NOT NULL | |
| tipo | text | CHECK: nucleo / con_abuelos / separados / otro |
| foto_url | text | |
| created_by | uuid FK → users | ON DELETE SET NULL |
| created_at | timestamptz | |

### `public.household_members`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → users | ON DELETE CASCADE |
| household_id | uuid FK → households | ON DELETE CASCADE |
| rol | text | CHECK: coordinador / adulto / adolescente / adulto_mayor |
| joined_at | timestamptz | |
| invited_by | uuid FK → users | ON DELETE SET NULL |
| UNIQUE | (user_id, household_id) | |

### `public.invitations`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| household_id | uuid FK → households | ON DELETE CASCADE |
| token | text UNIQUE | gen_random_uuid()::text |
| rol_asignado | text | CHECK: coordinador / adulto / adolescente / adulto_mayor |
| created_by | uuid FK → users | ON DELETE SET NULL |
| expires_at | timestamptz | default now() + 24h |
| used_at | timestamptz | null = no usada |
| used_by | uuid FK → users | ON DELETE SET NULL |

---

## Triggers

### `on_auth_user_created`
- Tabla: `auth.users`
- Evento: `AFTER INSERT`
- Función: `public.handle_new_user()` (SECURITY DEFINER)
- Lee `raw_user_meta_data->>'nombre'`; si está vacío, usa el prefijo del email.
- Usa `ON CONFLICT (id) DO NOTHING` — idempotente.

### `set_users_updated_at`
- Tabla: `public.users`
- Evento: `BEFORE UPDATE`
- Función: `public.set_updated_at()`

---

## Índices

```
idx_household_members_household_id  ON household_members(household_id)
idx_household_members_user_id       ON household_members(user_id)
idx_invitations_token               ON invitations(token)
idx_invitations_household_id        ON invitations(household_id)
```

---

## Cómo aplicar la migración

1. Abrir Supabase SQL Editor (como postgres/superuser).
2. Pegar y ejecutar `backend/sql/migration_001_auth_base.sql`.
3. Verificar con `backend/sql/migration_001_verify.sql` — espera 4 líneas `OK` y hace ROLLBACK.

---

## Configuración de Auth Providers (Supabase Dashboard)

### Email

```
Dashboard → Authentication → Providers → Email
```

| Setting | Valor desarrollo | Valor producción |
|---|---|---|
| Enable Email provider | ON | ON |
| Confirm email | OFF | ON |
| Secure email change | ON | ON |
| Double confirm email changes | OFF | ON |

---

### Google OAuth

```
Dashboard → Authentication → Providers → Google
```

1. Habilitar Google.
2. Completar:
   - **Client ID:** `<TU_GOOGLE_CLIENT_ID>` (obtener en [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials)
   - **Client Secret:** `<TU_GOOGLE_CLIENT_SECRET>`
3. Authorized redirect URI a configurar en Google Console:
   ```
   https://<tu-proyecto>.supabase.co/auth/v1/callback
   ```
4. Guardar.

> Para development local, agregar también: `http://localhost:3000/auth/v1/callback`

---

### Apple OAuth

```
Dashboard → Authentication → Providers → Apple
```

1. Habilitar Apple.
2. Completar:
   - **Service ID:** `<TU_APPLE_SERVICE_ID>` (formato: `com.tuempresa.familyhub`)
   - **Team ID:** `<TU_APPLE_TEAM_ID>` (10 caracteres alfanuméricos)
   - **Key ID:** `<TU_APPLE_KEY_ID>`
   - **Private Key:** contenido del archivo `.p8` descargado de Apple Developer
3. Redirect URL a registrar en Apple Developer:
   ```
   https://<tu-proyecto>.supabase.co/auth/v1/callback
   ```

> Apple requiere cuenta Apple Developer ($99/año). Para mobile: configurar también `Sign in with Apple` en Xcode capabilities.

---

## Decisiones técnicas

- `public.users.id` no usa `DEFAULT auth.uid()` — `auth.uid()` retorna NULL en contexto de trigger de servidor. El id se pasa explícitamente desde `NEW.id` en el trigger.
- `ON DELETE SET NULL` en FKs hacia `public.users` en `households.created_by`, `household_members.invited_by`, `invitations.created_by/used_by` — evita cascades destructivos si un usuario elimina su cuenta.
- `ON DELETE CASCADE` en `household_members` y `invitations` hacia `households` — si el hogar se elimina, se limpian sus miembros e invitaciones.
- El trigger es SECURITY DEFINER con `set search_path = public` para evitar privilege escalation.

## Límites detectados

- `updateMe` (backend) escribe solo en `auth.users` metadata — NO sincroniza cambios de nombre/avatar a `public.users` después del signup. Si se necesita mantener `public.users` actualizado con cambios de perfil, agregar un trigger `on auth.users AFTER UPDATE` o un segundo UPDATE en el controller.
- El schema de `public.users` diverge del schema en español (`public.perfiles`) existente en el proyecto. Son tablas paralelas: `perfiles` es para el frontend mobile, `users` es para el backend API.
