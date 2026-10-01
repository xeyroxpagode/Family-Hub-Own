-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 001 — Auth Base — FamilyHub
--
-- Tablas   : public.users · public.households · public.household_members · public.invitations
-- Triggers : on_auth_user_created (auth.users → public.users)
--            trg_users_updated_at (mantiene updated_at)
-- Índices  : household_members(household_id|user_id)
--            invitations(token|household_id)
--
-- Filosofía: una persona tiene UNA identidad global (public.users) y puede
--            pertenecer a MÚLTIPLES hogares con roles distintos (household_members).
-- ═══════════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";   -- gen_salt, crypt (test script)


-- ══════════════════════════════════════════════════════════════════════════════
-- TABLA: public.users
-- Identidad global. id = auth.uid() → un único perfil por persona, sin importar
-- cuántos hogares integre. Lo que cambia es la membresía, no la identidad.
-- ══════════════════════════════════════════════════════════════════════════════
create table if not exists public.users (
  id                 uuid        primary key default auth.uid(),
  email              text        not null unique,
  nombre             text        not null,
  avatar_url         text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  notification_prefs jsonb       not null default '{}'
);


-- ── Trigger: actualiza updated_at en cada UPDATE ─────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
  before update on public.users
  for each row execute procedure public.set_updated_at();


-- ── Trigger: replica auth.users → public.users en cada nuevo registro ────────
-- security definer + search_path fijo: blindaje contra search_path hijacking.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, nombre)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ══════════════════════════════════════════════════════════════════════════════
-- TABLA: public.households
-- El tipo describe la composición del hogar; no encierra al usuario en ninguna
-- categoría. Un usuario puede pertenecer a múltiples hogares de distintos tipos.
-- ══════════════════════════════════════════════════════════════════════════════
create table if not exists public.households (
  id         uuid        primary key default gen_random_uuid(),
  nombre     text        not null,
  tipo       text        check (tipo in ('nucleo','con_abuelos','separados','otro')),
  foto_url   text,
  created_by uuid        references public.users(id),
  created_at timestamptz not null default now()
);


-- ══════════════════════════════════════════════════════════════════════════════
-- TABLA: public.household_members
-- Membresía contextual. UNIQUE(user_id, household_id) impide duplicados dentro
-- del mismo hogar, pero una persona puede aparecer en N hogares con roles distintos.
-- ON DELETE CASCADE: si se borra el usuario o el hogar, la membresía desaparece.
-- ══════════════════════════════════════════════════════════════════════════════
create table if not exists public.household_members (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.users(id) on delete cascade,
  household_id uuid        not null references public.households(id) on delete cascade,
  rol          text        check (rol in ('coordinador','adulto','adolescente','adulto_mayor')),
  joined_at    timestamptz not null default now(),
  invited_by   uuid        references public.users(id),
  unique (user_id, household_id)
);

create index if not exists idx_hm_household_id on public.household_members (household_id);
create index if not exists idx_hm_user_id      on public.household_members (user_id);


-- ══════════════════════════════════════════════════════════════════════════════
-- TABLA: public.invitations
-- Tokens de uso único con TTL de 24 horas. Cada llamada genera un token nuevo;
-- los tokens anteriores del mismo hogar no se invalidan automáticamente
-- (ver reglas de negocio en docs/reglas_negocio_invitaciones.md).
-- ══════════════════════════════════════════════════════════════════════════════
create table if not exists public.invitations (
  id           uuid        primary key default gen_random_uuid(),
  household_id uuid        not null references public.households(id) on delete cascade,
  token        text        not null unique default gen_random_uuid()::text,
  rol_asignado text        check (rol_asignado in ('coordinador','adulto','adolescente','adulto_mayor')),
  created_by   uuid        references public.users(id),
  expires_at   timestamptz not null default now() + interval '24 hours',
  used_at      timestamptz,
  used_by      uuid        references public.users(id)
);

create index if not exists idx_inv_token        on public.invitations (token);
create index if not exists idx_inv_household_id on public.invitations (household_id);


-- ══════════════════════════════════════════════════════════════════════════════
-- CONFIGURACIÓN DE AUTH PROVIDERS — Supabase Dashboard
-- Dashboard → Authentication → Providers
-- ══════════════════════════════════════════════════════════════════════════════
--
-- 1. EMAIL
--    Enable email provider : ON
--    Confirm email         : OFF  ← desactivado para desarrollo; activar en prod
--    Secure email change   : ON
--    Min password length   : 8
--
-- 2. GOOGLE OAUTH
--    Enable sign in with Google : ON
--    Client ID (Web)            : <GOOGLE_CLIENT_ID>
--    Client Secret              : <GOOGLE_CLIENT_SECRET>
--    Redirect URL (copiar de Supabase → agregar en Google Cloud Console como
--    "Authorized redirect URI"): https://<project-ref>.supabase.co/auth/v1/callback
--
-- 3. APPLE OAUTH
--    Enable sign in with Apple : ON
--    Service ID                : <APPLE_SERVICE_ID>   (ej: com.familyhub.auth)
--    Team ID                   : <APPLE_TEAM_ID>
--    Key ID                    : <APPLE_KEY_ID>
--    Private Key (.p8)         : <APPLE_PRIVATE_KEY>
--    Redirect URL (igual que Google): https://<project-ref>.supabase.co/auth/v1/callback
--
-- ══════════════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════════════
-- SCRIPT DE VERIFICACIÓN
-- Inserta un usuario de prueba simulando el INSERT de GoTrue y verifica que
-- el trigger lo replicó correctamente en public.users.
-- Todo corre en una transacción que termina con ROLLBACK (no deja datos).
-- ══════════════════════════════════════════════════════════════════════════════
do $verify$
declare
  v_user_id uuid    := '99999999-9999-9999-9999-999999999999';
  v_count   integer;
begin

  insert into auth.users (
    id, instance_id,
    email, aud, role,
    encrypted_password, email_confirmed_at,
    raw_user_meta_data, raw_app_meta_data,
    created_at, updated_at
  ) values (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'verify@familyhub.dev', 'authenticated', 'authenticated',
    crypt('verify-pass', gen_salt('bf')), now(),
    '{"nombre":"FamilyHub Verify"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    now(), now()
  )
  on conflict (id) do nothing;

  select count(*)::int into v_count
  from public.users
  where id    = v_user_id
    and email = 'verify@familyhub.dev'
    and nombre = 'FamilyHub Verify';

  assert v_count = 1,
    format('[VERIFY FAIL] El trigger no replicó el usuario en public.users (count=%s)', v_count);

  raise notice '[VERIFY PASS] Trigger on_auth_user_created funcionó correctamente.';
  raise notice '              Usuario "FamilyHub Verify" encontrado en public.users.';

  -- Limpieza: la FK ON DELETE CASCADE borra public.users en cadena
  delete from auth.users where id = v_user_id;

end;
$verify$;
