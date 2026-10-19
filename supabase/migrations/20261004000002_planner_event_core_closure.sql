-- Event Core closure: preserve the V1 DTO as the single Event projection, but
-- calculate all-day temporal state in the household's local calendar.
create or replace function public.planner_event_v1_dto(p_event_id uuid)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare
  v_event public.planner_events%rowtype;
  v_series public.planner_event_series%rowtype;
  v_participants jsonb;
  v_temporal text;
  v_actions jsonb := '[]'::jsonb;
  v_can_edit boolean;
  v_can_cancel boolean;
  v_can_participants boolean;
  v_safe_split boolean := false;
  v_occurrence_date date;
  v_local_today date;
begin
  select * into v_event from public.planner_events where id = p_event_id;
  if not found or not public.planner_event_can_view(p_event_id) then return null; end if;

  if v_event.series_id is not null then
    select * into v_series from public.planner_event_series where id = v_event.series_id;
    v_occurrence_date := coalesce(v_event.occurrence_original_start_date, v_event.start_date,
      (coalesce(v_event.occurrence_original_starts_at, v_event.starts_at)
        at time zone coalesce(v_event.time_zone, v_series.time_zone, 'UTC'))::date);
    v_safe_split := found and v_series.lifecycle = 'active' and v_event.occurrence_key is not null
      and v_occurrence_date > v_series.starts_on and v_event.lifecycle <> 'trash';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'personId', p.person_id, 'memberId', p.member_id,
    'rsvp', p.rsvp_status, 'attendance', p.attendance_status, 'version', p.version,
    'createdAt', p.created_at, 'updatedAt', p.updated_at
  ) order by p.created_at, p.id), '[]'::jsonb) into v_participants
  from public.planner_event_participants p where p.event_id = p_event_id;

  if v_event.lifecycle = 'trash' then
    v_temporal := null;
  elsif v_event.schedule_type = 'all_day' then
    select (now() at time zone coalesce(h.timezone, 'UTC'))::date into v_local_today
    from public.households h where h.id = v_event.household_id;
    v_local_today := coalesce(v_local_today, (now() at time zone 'UTC')::date);
    v_temporal := case
      when v_local_today < v_event.start_date then 'upcoming'
      when v_local_today > v_event.end_date then 'past'
      else 'in_progress'
    end;
  else
    v_temporal := case
      when now() < v_event.starts_at then 'upcoming'
      when now() >= coalesce(v_event.ends_at, v_event.starts_at + make_interval(mins => v_event.duration_minutes)) then 'past'
      else 'in_progress'
    end;
  end if;

  v_can_edit := (v_event.scope = 'personal' and v_event.owner_person_id = public.current_person_id())
    or public.planner_event_can_mutate(p_event_id, 'event.edit_own', 'event.edit_any');
  v_can_cancel := (v_event.scope = 'personal' and v_event.owner_person_id = public.current_person_id())
    or public.planner_event_can_mutate(p_event_id, 'event.cancel_own', 'event.cancel_any');
  v_can_participants := (v_event.scope = 'personal' and v_event.owner_person_id = public.current_person_id())
    or public.planner_event_can_mutate(p_event_id, 'event.manage_participants', 'event.manage_participants');
  if v_can_edit and v_event.lifecycle not in ('trash', 'cancelled') then v_actions := v_actions || '"edit"'::jsonb; end if;
  if v_can_cancel and v_event.lifecycle = 'scheduled' then v_actions := v_actions || '"cancel"'::jsonb; end if;
  if v_can_cancel and v_event.lifecycle = 'cancelled' then v_actions := v_actions || '"reactivate"'::jsonb; end if;
  if v_can_cancel and v_event.lifecycle <> 'trash' then v_actions := v_actions || '"trash"'::jsonb; end if;
  if v_can_cancel and v_event.lifecycle = 'trash' then v_actions := v_actions || '"restore"'::jsonb; end if;
  if v_can_participants and v_event.lifecycle <> 'trash' then
    v_actions := v_actions || '"manage_participants"'::jsonb;
    if v_event.attendance_required then v_actions := v_actions || '"record_attendance"'::jsonb; end if;
  end if;

  return jsonb_build_object(
    'id', v_event.id, 'version', v_event.version, 'scope', v_event.scope,
    'ownerPersonId', v_event.owner_person_id,
    'householdId', case when v_event.scope = 'household' then v_event.household_id else null end,
    'lifecycle', v_event.lifecycle, 'temporalCondition', v_temporal,
    'title', v_event.title, 'description', v_event.description,
    'scheduling', case when v_event.schedule_type = 'all_day' then
      jsonb_build_object('type', 'all_day', 'startDate', v_event.start_date, 'endDate', v_event.end_date)
    else jsonb_build_object('type', 'timed', 'startsAt', v_event.starts_at, 'endsAt', v_event.ends_at,
      'durationMinutes', v_event.duration_minutes, 'timeZone', v_event.time_zone) end,
    'location', case when v_event.location_type is null then null else
      jsonb_build_object('type', v_event.location_type, 'payload', coalesce(v_event.location_payload, '{}'::jsonb)) end,
    'recurrence', jsonb_build_object(
      'seriesId', v_event.series_id, 'occurrenceKey', v_event.occurrence_key,
      'originalStartsAt', v_event.occurrence_original_starts_at, 'originalStartDate', v_event.occurrence_original_start_date,
      'rule', case when v_event.series_id is null then null else v_series.recurrence_rule end,
      'seriesVersion', case when v_event.series_id is null then null else v_series.version end,
      'availableEditScopes', case when v_event.series_id is null then '["this_occurrence"]'::jsonb
        when v_safe_split then '["this_occurrence","this_and_following","whole_series"]'::jsonb
        else '["this_occurrence","whole_series"]'::jsonb end),
    'attendanceRequired', v_event.attendance_required, 'participants', v_participants,
    'availableActions', v_actions, 'createdByPersonId', v_event.created_by_person_id,
    'createdByMemberId', v_event.created_by_member_id, 'createdAt', v_event.created_at, 'updatedAt', v_event.updated_at);
end;
$$;

revoke all on function public.planner_event_v1_dto(uuid) from public, anon;
grant execute on function public.planner_event_v1_dto(uuid) to authenticated, service_role;
