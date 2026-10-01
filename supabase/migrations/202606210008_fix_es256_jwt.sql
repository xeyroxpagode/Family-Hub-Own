-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 008 — Fix ES256 JWT / auth.uid() null — FamilyHub
--
-- Causa raíz confirmada (2026-05-29):
--   • Los access tokens son ES256. PostgREST no propaga los claims del JWT a las
--     variables de sesión Postgres (request.jwt.claim.sub / request.jwt.claims).
--   • auth.uid() → null → todas las políticas RLS que lo usan fallan silenciosamente.
--   • auth.role() funciona ('authenticated') porque PostgREST hace SET ROLE antes.
--
-- Estrategia:
--   1. public.effective_uid()  → lee user_id de 3 fuentes (fallback robusto)
--   2. Intenta override de auth.uid() con fallback (si está permitido)
--   3. Actualiza helpers RLS para usar effective_uid()
--   4. Recrea políticas RLS críticas usando effective_uid()
--   5. Actualiza ensure_public_user, join_household_by_token
--   6. Crea create_household_rpc() SECURITY DEFINER (bypasea RLS)
--   7. Diagnóstico: debug_jwt(), debug_request_settings()
-- ═══════════════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════════════
-- PASO 1: public.effective_uid()
-- DEBE ir primero — las demás funciones dependen de esta.
-- ══════════════════════════════════════════════════════════════════════════════

create or replace function public.effective_uid()
returns uuid
language sql stable security definer
set search_path = public, auth
as $$
  select coalesce(
    auth.uid(),
    nullif(current_setting('request.jwt.claim.sub', true), '')::uuid,
    case
      when nullif(current_setting('request.jwt.claims', true), '') is not null
      then (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
      else null
    end
  )
$$;
grant execute on function public.effective_uid() to authenticated, anon;


-- ══════════════════════════════════════════════════════════════════════════════
-- PASO 2: Diagnóstico (depende de effective_uid, por eso va después)
-- ══════════════════════════════════════════════════════════════════════════════

create or replace function public.debug_request_settings()
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select coalesce(jsonb_object_agg(name, setting), '{}'::jsonb)
  from   pg_settings
  where  name like 'request.%'
$$;
grant execute on function public.debug_request_settings() to authenticated, anon;

create or replace function public.debug_jwt()
returns jsonb
language sql stable security definer
set search_path = public, auth
as $$
  select jsonb_build_object(
    'auth_uid',           auth.uid()::text,
    'auth_role',          auth.role(),
    'jwt_claim_sub',      current_setting('request.jwt.claim.sub',  true),
    'jwt_claim_role',     current_setting('request.jwt.claim.role', true),
    'jwt_claims_full',    current_setting('request.jwt.claims',      true),
    'jwt_sub_from_json',  case
      when nullif(current_setting('request.jwt.claims', true), '') is not null
      then current_setting('request.jwt.claims', true)::jsonb ->> 'sub'
      else null
    end,
    'effective_uid',      public.effective_uid()::text
  )
$$;
grant execute on function public.debug_jwt() to authenticated, anon;


-- ══════════════════════════════════════════════════════════════════════════════
-- PASO 3: Override auth.uid() con fallback explícito
-- Si Supabase no permite el override, continúa (effective_uid ya cubre el fix).
-- ══════════════════════════════════════════════════════════════════════════════

do $$
begin
  execute $f$
    create or replace function auth.uid()
    returns uuid language sql stable as $inner$
      select coalesce(
        nullif(current_setting('request.jwt.claim.sub',  true), '')::uuid,
        (nullif(current_setting('request.jwt.claims',    true), '')::jsonb ->> 'sub')::uuid
      )
    $inner$
  $f$;
  raise notice 'auth.uid() override aplicado exitosamente';
exception when insufficient_privilege then
  raise warning 'No se pudo sobreescribir auth.uid(). effective_uid() actúa como fallback en todas las funciones.';
end;
$$;


-- ══════════════════════════════════════════════════════════════════════════════
-- PASO 4: Funciones helper RLS — usar effective_uid()
-- ══════════════════════════════════════════════════════════════════════════════

create or replace function public.is_household_member(p_household_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.household_members
    where household_id = p_household_id
      and user_id      = public.effective_uid()
  );
$$;

create or replace function public.is_household_coordinator(p_household_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.household_members
    where household_id = p_household_id
      and user_id      = public.effective_uid()
      and rol          = 'coordinador'
  );
$$;

create or replace function public.shares_household_with(p_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from   public.household_members a
    join   public.household_members b on b.household_id = a.household_id
    where  a.user_id = public.effective_uid()
      and  b.user_id = p_user_id
  );
$$;

grant execute on function public.is_household_member(uuid)      to authenticated;
grant execute on function public.is_household_coordinator(uuid) to authenticated;
grant execute on function public.shares_household_with(uuid)    to authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- PASO 5: Recrear políticas RLS que usan auth.uid() directamente
-- Las que usan los helpers ya quedan cubiertas por el paso 4.
-- ══════════════════════════════════════════════════════════════════════════════

-- public.users
drop policy if exists "users_select" on public.users;
create policy "users_select"
  on public.users for select to authenticated
  using (id = public.effective_uid() or public.shares_household_with(id));

drop policy if exists "users_insert" on public.users;
create policy "users_insert"
  on public.users for insert to authenticated
  with check (id = public.effective_uid());

drop policy if exists "users_update" on public.users;
create policy "users_update"
  on public.users for update to authenticated
  using     (id = public.effective_uid())
  with check (id = public.effective_uid());

-- public.households
drop policy if exists "households_insert" on public.households;
create policy "households_insert"
  on public.households for insert to authenticated
  with check (created_by = public.effective_uid());

-- public.household_members
drop policy if exists "household_members_insert" on public.household_members;
create policy "household_members_insert"
  on public.household_members for insert to authenticated
  with check (
    public.is_household_coordinator(household_id)
    or user_id = public.effective_uid()
  );

drop policy if exists "household_members_delete" on public.household_members;
create policy "household_members_delete"
  on public.household_members for delete to authenticated
  using (
    user_id = public.effective_uid()
    or public.is_household_coordinator(household_id)
  );

-- public.invitations
drop policy if exists "invitations_insert" on public.invitations;
create policy "invitations_insert"
  on public.invitations for insert to authenticated
  with check (
    public.is_household_coordinator(household_id)
    and created_by = public.effective_uid()
  );


-- ══════════════════════════════════════════════════════════════════════════════
-- PASO 6: ensure_public_user() y join_household_by_token() con effective_uid()
-- ══════════════════════════════════════════════════════════════════════════════

create or replace function public.ensure_public_user()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_email   text;
  v_nombre  text;
begin
  v_user_id := public.effective_uid();
  if v_user_id is null then return; end if;

  select
    u.email,
    coalesce(u.raw_user_meta_data->>'nombre', split_part(u.email, '@', 1))
  into v_email, v_nombre
  from auth.users u
  where u.id = v_user_id;

  if v_email is null then return; end if;

  insert into public.users (id, email, nombre)
  values (v_user_id, v_email, v_nombre)
  on conflict (id) do nothing;
end;
$$;
grant execute on function public.ensure_public_user() to authenticated;


create or replace function public.join_household_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_inv     public.invitations%rowtype;
  v_user_id uuid := public.effective_uid();
begin
  if v_user_id is null then
    return jsonb_build_object('error', 'No estás autenticado.');
  end if;

  select * into v_inv
  from   public.invitations
  where  token = p_token and used_at is null and expires_at > now();

  if not found then
    return jsonb_build_object('error', 'La invitación no existe, ya fue usada o expiró. Pedile al coordinador una nueva.');
  end if;

  insert into public.users (id, email, nombre)
  select u.id, u.email,
    coalesce(u.raw_user_meta_data->>'nombre', split_part(u.email, '@', 1))
  from auth.users u where u.id = v_user_id
  on conflict (id) do nothing;

  begin
    insert into public.household_members (user_id, household_id, rol, invited_by)
    values (v_user_id, v_inv.household_id, v_inv.rol_asignado, v_inv.created_by);
  exception when unique_violation then
    return jsonb_build_object('error', 'Ya eres miembro de este hogar.');
  end;

  update public.invitations
  set used_at = now(), used_by = v_user_id
  where id = v_inv.id;

  return jsonb_build_object(
    'household_id', v_inv.household_id,
    'rol',          v_inv.rol_asignado,
    'error',        null
  );
end;
$$;
grant execute on function public.join_household_by_token(text) to authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- PASO 7: create_household_rpc() — SECURITY DEFINER, bypasea RLS
-- Crea hogar + membresía coordinador en una sola transacción atómica.
-- Úsalo como fallback cuando el INSERT directo falla con 42501.
-- ══════════════════════════════════════════════════════════════════════════════

create or replace function public.create_household_rpc(
  p_nombre text,
  p_tipo   text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id   uuid := public.effective_uid();
  v_household public.households%rowtype;
begin
  if v_user_id is null then
    return jsonb_build_object('error', 'No estás autenticado.');
  end if;

  if trim(p_nombre) = '' then
    return jsonb_build_object('error', 'El nombre del hogar no puede estar vacío.');
  end if;

  -- Garantizar fila en public.users
  insert into public.users (id, email, nombre)
  select u.id, u.email,
    coalesce(u.raw_user_meta_data->>'nombre', split_part(u.email, '@', 1))
  from auth.users u where u.id = v_user_id
  on conflict (id) do nothing;

  -- Crear hogar (SECURITY DEFINER bypasea RLS)
  insert into public.households (nombre, tipo, created_by)
  values (trim(p_nombre), p_tipo, v_user_id)
  returning * into v_household;

  -- Asignar como coordinador
  insert into public.household_members (user_id, household_id, rol)
  values (v_user_id, v_household.id, 'coordinador');

  return jsonb_build_object(
    'household_id', v_household.id,
    'household',    row_to_json(v_household),
    'error',        null
  );
end;
$$;
grant execute on function public.create_household_rpc(text, text) to authenticated;
