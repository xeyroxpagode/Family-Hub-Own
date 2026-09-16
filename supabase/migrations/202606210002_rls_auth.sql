-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 002 — Row Level Security (RLS) — FamilyHub
--
-- Requiere: migration_001_auth_base.sql aplicada previamente.
-- Tablas protegidas: public.users · public.households
--                    public.household_members · public.invitations
--
-- El backend usa service_role (bypasa RLS); estas políticas protegen el acceso
-- directo del cliente con JWT de usuario (anon/authenticated).
--
-- Principio guía: identidad global + membresías contextuales.
-- Una persona tiene un único public.users, pero puede tener N filas en
-- household_members con roles distintos en hogares distintos.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════════════
-- FUNCIONES HELPER
-- security definer + search_path fijo: evitan recursión en políticas RLS
-- y blindan contra search_path hijacking.
-- ══════════════════════════════════════════════════════════════════════════════

-- Devuelve true si el usuario actual pertenece al hogar indicado
create or replace function public.is_household_member(p_household_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.household_members
    where household_id = p_household_id
      and user_id      = auth.uid()
  );
$$;

-- Devuelve true si el usuario actual es coordinador del hogar indicado
create or replace function public.is_household_coordinator(p_household_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.household_members
    where household_id = p_household_id
      and user_id      = auth.uid()
      and rol          = 'coordinador'
  );
$$;

-- Devuelve true si p_user_id comparte al menos un hogar con el usuario actual
create or replace function public.shares_household_with(p_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from   public.household_members a
    join   public.household_members b on b.household_id = a.household_id
    where  a.user_id = auth.uid()
      and  b.user_id = p_user_id
  );
$$;

grant execute on function public.is_household_member(uuid)      to authenticated;
grant execute on function public.is_household_coordinator(uuid) to authenticated;
grant execute on function public.shares_household_with(uuid)    to authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- TABLA: public.users
-- Identidad global: visible para cohabitantes, editable solo por el propio usuario.
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.users enable row level security;

-- El usuario ve su propio perfil o el de cualquier persona que comparta hogar
drop policy if exists "users_select" on public.users;
create policy "users_select"
  on public.users
  for select to authenticated
  using (
    id = auth.uid()
    or public.shares_household_with(id)
  );

-- El trigger (security definer) hace el INSERT; esta política cubre inserts manuales
drop policy if exists "users_insert" on public.users;
create policy "users_insert"
  on public.users
  for insert to authenticated
  with check (id = auth.uid());

-- Solo el propio usuario puede editar su perfil
drop policy if exists "users_update" on public.users;
create policy "users_update"
  on public.users
  for update to authenticated
  using     (id = auth.uid())
  with check (id = auth.uid());

-- Borrado bloqueado: los usuarios se eliminan en cascada desde auth.users (service_role)
drop policy if exists "users_delete" on public.users;
create policy "users_delete"
  on public.users
  for delete to authenticated
  using (false);


-- ══════════════════════════════════════════════════════════════════════════════
-- TABLA: public.households
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.households enable row level security;

-- Solo ves los hogares en los que sos miembro (admite múltiples hogares por usuario)
drop policy if exists "households_select" on public.households;
create policy "households_select"
  on public.households
  for select to authenticated
  using (public.is_household_member(id));

-- Cualquier usuario autenticado puede crear un hogar
drop policy if exists "households_insert" on public.households;
create policy "households_insert"
  on public.households
  for insert to authenticated
  with check (created_by = auth.uid());

-- Solo el coordinador puede editar datos del hogar
drop policy if exists "households_update" on public.households;
create policy "households_update"
  on public.households
  for update to authenticated
  using     (public.is_household_coordinator(id))
  with check (public.is_household_coordinator(id));

-- Solo el coordinador puede eliminar el hogar
drop policy if exists "households_delete" on public.households;
create policy "households_delete"
  on public.households
  for delete to authenticated
  using (public.is_household_coordinator(id));


-- ══════════════════════════════════════════════════════════════════════════════
-- TABLA: public.household_members
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.household_members enable row level security;

-- Ves los miembros de todos los hogares en los que vos también participás
drop policy if exists "household_members_select" on public.household_members;
create policy "household_members_select"
  on public.household_members
  for select to authenticated
  using (public.is_household_member(household_id));

-- El coordinador agrega miembros vía invitación, O el propio usuario se une
-- (self-join); la validación del token se hace en el backend/RPC antes de este INSERT
drop policy if exists "household_members_insert" on public.household_members;
create policy "household_members_insert"
  on public.household_members
  for insert to authenticated
  with check (
    public.is_household_coordinator(household_id)
    or user_id = auth.uid()
  );

-- Solo el coordinador puede cambiar el rol de los miembros
drop policy if exists "household_members_update" on public.household_members;
create policy "household_members_update"
  on public.household_members
  for update to authenticated
  using     (public.is_household_coordinator(household_id))
  with check (public.is_household_coordinator(household_id));

-- Salida voluntaria del propio usuario, o expulsión por el coordinador
drop policy if exists "household_members_delete" on public.household_members;
create policy "household_members_delete"
  on public.household_members
  for delete to authenticated
  using (
    user_id = auth.uid()
    or public.is_household_coordinator(household_id)
  );


-- ══════════════════════════════════════════════════════════════════════════════
-- TABLA: public.invitations
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.invitations enable row level security;

-- Solo el coordinador ve las invitaciones pendientes de su hogar
-- (la lookup por token para validar el join la hace el backend con service_role)
drop policy if exists "invitations_select" on public.invitations;
create policy "invitations_select"
  on public.invitations
  for select to authenticated
  using (public.is_household_coordinator(household_id));

-- Solo el coordinador puede crear invitaciones para su hogar
drop policy if exists "invitations_insert" on public.invitations;
create policy "invitations_insert"
  on public.invitations
  for insert to authenticated
  with check (
    public.is_household_coordinator(household_id)
    and created_by = auth.uid()
  );

-- Marcar used_at/used_by se hace server-side con service_role; bloqueado por RLS
drop policy if exists "invitations_update" on public.invitations;
create policy "invitations_update"
  on public.invitations
  for update to authenticated
  using (false);

-- Solo el coordinador puede revocar una invitación no usada
drop policy if exists "invitations_delete" on public.invitations;
create policy "invitations_delete"
  on public.invitations
  for delete to authenticated
  using (
    public.is_household_coordinator(household_id)
    and used_at is null
  );
