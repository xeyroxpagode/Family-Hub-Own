-- Fase 3A - fix orden soft remove de miembros activos del hogar.
-- Primero limpia people.active_household_id y después finaliza la membership,
-- porque un trigger bloquea desactivar una membership activa si todavía es active_household_id.

create or replace function public.finalize_household_member(
  p_household_id uuid,
  p_membership_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_person_id uuid := public.current_person_id();
  v_target public.household_members%rowtype;
  v_active_coordinators_count integer;
begin
  if public.effective_uid() is null or v_actor_person_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if not public.is_active_household_coordinator(p_household_id) then
    raise exception 'not_household_coordinator' using errcode = '42501';
  end if;

  select *
    into v_target
  from public.household_members
  where id = p_membership_id
    and household_id = p_household_id
  for update;

  if not found then
    raise exception 'membership_not_found' using errcode = 'P0001';
  end if;

  if v_target.status <> 'active' then
    raise exception 'membership_not_active' using errcode = '22023';
  end if;

  if v_target.person_id = v_actor_person_id then
    raise exception 'cannot_finalize_self' using errcode = '22023';
  end if;

  if v_target.role = 'coordinator' then
    select count(*)
      into v_active_coordinators_count
    from public.household_members
    where household_id = p_household_id
      and status = 'active'
      and role = 'coordinator';

    if coalesce(v_active_coordinators_count, 0) <= 1 then
      raise exception 'cannot_finalize_last_coordinator' using errcode = '22023';
    end if;
  end if;

  -- 1) Primero limpiar active_household_id del miembro removido.
  update public.people
  set active_household_id = null,
      updated_at = now()
  where id = v_target.person_id
    and active_household_id = p_household_id;

  -- 2) Después finalizar la membership.
  update public.household_members
  set status = 'finalized',
      left_at = now(),
      updated_at = now()
  where id = p_membership_id
    and household_id = p_household_id
    and status = 'active'
  returning * into v_target;

  return jsonb_build_object(
    'membership', to_jsonb(v_target),
    'success', true,
    'error', null
  );
end;
$$;

grant execute on function public.finalize_household_member(uuid, uuid) to authenticated;