-- Auth register fix: allow an authenticated user to create their own person row
-- through a SECURITY DEFINER RPC when direct RLS insert is blocked.

create or replace function public.create_person_for_current_user(p_display_name text default null)
returns public.people
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := public.effective_uid();
  v_person public.people%rowtype;
  v_display_name text;
begin
  if v_user_id is null then
    raise exception 'No authenticated user found for person creation'
      using errcode = '28000';
  end if;

  select *
  into v_person
  from public.people
  where auth_user_id = v_user_id
  limit 1;

  if found then
    return v_person;
  end if;

  select coalesce(
    nullif(btrim(p_display_name), ''),
    nullif(btrim(u.raw_user_meta_data->>'display_name'), ''),
    nullif(btrim(u.raw_user_meta_data->>'nombre'), ''),
    nullif(split_part(u.email, '@', 1), ''),
    'HomePlus user'
  )
  into v_display_name
  from auth.users u
  where u.id = v_user_id;

  if v_display_name is null then
    raise exception 'Auth user not found for person creation'
      using errcode = '23503';
  end if;

  insert into public.people (auth_user_id, display_name, default_language)
  values (v_user_id, v_display_name, 'es-419')
  returning * into v_person;

  return v_person;
end;
$$;

grant execute on function public.create_person_for_current_user(text) to authenticated;
