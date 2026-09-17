-- =============================================================
-- migration_001_auth_base.sql
-- Tablas base: public.users, households, household_members, invitations
-- Trigger: auth.users INSERT → public.users
-- Trigger: updated_at en public.users
-- =============================================================

-- PREFLIGHT
do $$
begin
  if to_regclass('auth.users') is null then
    raise exception 'auth.users no existe — corré contra un proyecto Supabase real';
  end if;
end;
$$;

-- =============================================================
-- FUNCIONES
-- =============================================================

-- Crea la fila en public.users al registrarse un usuario nuevo
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
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'nombre'), ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Actualiza updated_at antes de cada UPDATE en public.users
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================
-- TABLAS
-- =============================================================

create table if not exists public.users (
  id                 uuid        primary key,
  email              text        not null unique,
  nombre             text        not null,
  avatar_url         text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  notification_prefs jsonb       not null default '{}'::jsonb
);

create table if not exists public.households (
  id         uuid        primary key default gen_random_uuid(),
  nombre     text        not null,
  tipo       text        check (tipo in ('nucleo', 'con_abuelos', 'separados', 'otro')),
  foto_url   text,
  created_by uuid        references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.users(id) on delete cascade,
  household_id uuid        not null references public.households(id) on delete cascade,
  rol          text        check (rol in ('coordinador', 'adulto', 'adolescente', 'adulto_mayor')),
  joined_at    timestamptz not null default now(),
  invited_by   uuid        references public.users(id) on delete set null,
  unique (user_id, household_id)
);

create table if not exists public.invitations (
  id           uuid        primary key default gen_random_uuid(),
  household_id uuid        not null references public.households(id) on delete cascade,
  token        text        not null unique default gen_random_uuid()::text,
  rol_asignado text        check (rol_asignado in ('coordinador', 'adulto', 'adolescente', 'adulto_mayor')),
  created_by   uuid        references public.users(id) on delete set null,
  expires_at   timestamptz not null default now() + interval '24 hours',
  used_at      timestamptz,
  used_by      uuid        references public.users(id) on delete set null
);

-- =============================================================
-- TRIGGERS
-- =============================================================

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- =============================================================
-- ÍNDICES
-- =============================================================

create index if not exists idx_household_members_household_id
  on public.household_members(household_id);

create index if not exists idx_household_members_user_id
  on public.household_members(user_id);

create index if not exists idx_invitations_token
  on public.invitations(token);

create index if not exists idx_invitations_household_id
  on public.invitations(household_id);

-- =============================================================
-- GRANTS
-- =============================================================

grant usage on schema public to authenticated, service_role;

grant select, insert, update        on public.users             to authenticated;
grant select, insert, update, delete on public.households        to authenticated;
grant select, insert, update, delete on public.household_members to authenticated;
grant select, insert, update         on public.invitations       to authenticated;

grant all on public.users             to service_role;
grant all on public.households        to service_role;
grant all on public.household_members to service_role;
grant all on public.invitations       to service_role;
