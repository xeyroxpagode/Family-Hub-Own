-- HOMePLUS Assets - A4.3 Period Correction Timestamp Fix
--
-- The correct_asset_record_period RPC received expected_updated_at as
-- timestamptz, but the Supabase JS driver serializes Date objects to ISO
-- strings with microsecond precision that may not parse identically to
-- PostgreSQL's internal timestamptz representation. This caused false
-- conflicts (500 internal_error) on every period correction.
--
-- The fix: change the parameter type to text and cast inside the function
-- using ::timestamptz. The backend sends the raw updated_at value obtained
-- via SQL ::text, which PostgreSQL can always parse back correctly.

create or replace function public.correct_asset_record_period(
  p_household_id uuid,
  p_actor_member_id uuid,
  p_period_id uuid,
  p_expected_updated_at text,
  p_valid_from date,
  p_valid_until date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_updated_at timestamptz;
  v_current record;
  v_record_id uuid;
begin
  if p_household_id is null or p_actor_member_id is null or p_period_id is null then
    raise exception 'Parámetros obligatorios.' using errcode = '42501';
  end if;
  if p_expected_updated_at is null then
    raise exception 'expected_updated_at es obligatorio.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.household_members
    where id = p_actor_member_id
      and household_id = p_household_id
      and status = 'active'
  ) then
    raise exception 'No sos miembro activo del household.' using errcode = '42501';
  end if;

  select updated_at, record_id into v_current_updated_at, v_record_id
  from public.assets_record_periods
  where id = p_period_id
    and household_id = p_household_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if v_current_updated_at <> p_expected_updated_at::timestamptz then
    select * into v_current from public.assets_record_periods where id = p_period_id;
    return jsonb_build_object(
      'status', 'conflict',
      'current_updated_at', v_current.updated_at
    );
  end if;

  if p_valid_from is not null and p_valid_until is not null and p_valid_from > p_valid_until then
    return jsonb_build_object('status', 'invalid_validity');
  end if;

  update public.assets_record_periods
  set valid_from = coalesce(p_valid_from, valid_from),
      valid_until = coalesce(p_valid_until, valid_until)
  where id = p_period_id
    and household_id = p_household_id
    and updated_at = p_expected_updated_at::timestamptz;

  if not found then
    select * into v_current from public.assets_record_periods where id = p_period_id;
    return jsonb_build_object(
      'status', 'conflict',
      'current_updated_at', v_current.updated_at
    );
  end if;

  return jsonb_build_object('status', 'corrected');
end;
$$;

revoke execute on function public.correct_asset_record_period(uuid, uuid, uuid, text, date, date) from public, anon, authenticated;
grant execute on function public.correct_asset_record_period(uuid, uuid, uuid, text, date, date) to service_role;

notify pgrst, 'reload schema';
