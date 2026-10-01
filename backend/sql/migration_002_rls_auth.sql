do $$
declare
  policy_record record;
begin
  if to_regclass('public.grupos_familiares') is null then
    raise exception 'Missing table public.grupos_familiares';
  end if;

  if to_regclass('public.miembros_grupo') is null then
    raise exception 'Missing table public.miembros_grupo';
  end if;

  if to_regclass('public.perfiles') is null then
    raise exception 'Missing table public.perfiles';
  end if;

  if to_regtype('public.rol_familiar') is null then
    raise exception 'Missing type public.rol_familiar';
  end if;

  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('grupos_familiares', 'miembros_grupo', 'perfiles')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end;
$$;

create or replace function public.is_group_member(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.miembros_grupo as mg
    where mg.grupo_id = target_group_id
      and mg.usuario_id = auth.uid()
  )
$$;

create or replace function public.is_group_coordinator(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.miembros_grupo as mg
    where mg.grupo_id = target_group_id
      and mg.usuario_id = auth.uid()
      and mg.rol = 'ADMINISTRADOR'::public.rol_familiar
  )
$$;

create or replace function public.is_group_creator(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.grupos_familiares as gf
    where gf.id = target_group_id
      and gf.creador_id = auth.uid()
  )
$$;

create or replace function public.shares_group_with_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.miembros_grupo as viewer_membership
    join public.miembros_grupo as target_membership
      on target_membership.grupo_id = viewer_membership.grupo_id
    where viewer_membership.usuario_id = auth.uid()
      and target_membership.usuario_id = target_profile_id
  )
$$;

grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.is_group_coordinator(uuid) to authenticated;
grant execute on function public.is_group_creator(uuid) to authenticated;
grant execute on function public.shares_group_with_profile(uuid) to authenticated;

alter table public.grupos_familiares enable row level security;
alter table public.miembros_grupo enable row level security;
alter table public.perfiles enable row level security;

-- Group rows are visible only to members of that same family group.
create policy grupos_familiares_select_member_scope
on public.grupos_familiares
for select
to authenticated
using (
  public.is_group_member(grupos_familiares.id)
);

-- Any authenticated user can create a family group only for themselves.
create policy grupos_familiares_insert_creator_only
on public.grupos_familiares
for insert
to authenticated
with check (
  auth.uid() is not null
  and creador_id = auth.uid()
);

-- Only the group creator can update that family group.
create policy grupos_familiares_update_creator_only
on public.grupos_familiares
for update
to authenticated
using (
  creador_id = auth.uid()
)
with check (
  creador_id = auth.uid()
);

-- Only the group creator can delete that family group.
create policy grupos_familiares_delete_creator_only
on public.grupos_familiares
for delete
to authenticated
using (
  creador_id = auth.uid()
);

-- Members can read membership rows only inside shared family groups.
create policy miembros_grupo_select_shared_group
on public.miembros_grupo
for select
to authenticated
using (
  public.is_group_member(miembros_grupo.grupo_id)
);

-- Coordinators can add members and creators can bootstrap their own coordinador row.
create policy miembros_grupo_insert_coordinator_or_creator_bootstrap
on public.miembros_grupo
for insert
to authenticated
with check (
  public.is_group_coordinator(miembros_grupo.grupo_id)
  or (
    miembros_grupo.usuario_id = auth.uid()
    and miembros_grupo.rol = 'ADMINISTRADOR'::public.rol_familiar
    and public.is_group_creator(miembros_grupo.grupo_id)
  )
);

-- Only coordinators can update membership rows inside their family group.
create policy miembros_grupo_update_coordinator_only
on public.miembros_grupo
for update
to authenticated
using (
  public.is_group_coordinator(miembros_grupo.grupo_id)
)
with check (
  public.is_group_coordinator(miembros_grupo.grupo_id)
);

-- Coordinators can remove members and members can remove their own row.
create policy miembros_grupo_delete_coordinator_or_self
on public.miembros_grupo
for delete
to authenticated
using (
  miembros_grupo.usuario_id = auth.uid()
  or public.is_group_coordinator(miembros_grupo.grupo_id)
);

-- Profiles are visible only when both users share a family group.
create policy perfiles_select_shared_group_only
on public.perfiles
for select
to authenticated
using (
  public.shares_group_with_profile(perfiles.id)
);

-- Users can update only their own public profile row.
create policy perfiles_update_self_only
on public.perfiles
for update
to authenticated
using (
  perfiles.id = auth.uid()
)
with check (
  perfiles.id = auth.uid()
);

-- Profiles never get a delete policy so direct deletes stay blocked.
