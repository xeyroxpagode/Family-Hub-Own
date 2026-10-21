-- Plans · R4 — authorization foundation for the Plan root (planner_goals).
--
-- Authority: PLANS_TECHNICAL_TRUTH_V1 §15 (authorization), §6 (trash), §17
-- (a relationship never widens visibility), §34 B3 (remote audit gate).
--
-- Scope of this migration — security findings that belong directly to the Plan
-- write boundary on `planner_goals`:
--   1. `anon` held full table privileges on the Plan root (platform default
--      privileges; no migration had revoked them, unlike `planner_plans`).
--   2. The `planner_goals` SELECT policy did not filter `trashed_at`, while the
--      read helpers (`can_select_planner_goal`, `can_update_planner_goal`) did,
--      so a trashed Plan was still selectable.
--   3. `trash_goal_rpc` accepted `p_member_id` as an authorizing actor without
--      validating it, derived no actor from `auth.uid()`, checked no capability
--      and was executable by `anon`.
--
-- Deliberately NOT in this migration (they belong to the writer slice, and
-- applying them here would break Plan creation):
--   * the Personal/Hogar ownership shape CHECK — the Plan writer still emits
--     `visibility='personal' AND household_id NOT NULL`;
--   * the Personal branch of the SELECT policy — it requires the writer to
--     populate `owner_person_id` first, otherwise a just-created Personal Plan
--     would immediately become unreadable.
--   * small SECURITY DEFINER Plan writers — see the R4 writer slice.
--
-- No DROP, no data deletion.

-- ---------------------------------------------------------------------------
-- 1. The Plan root is not writable or readable by the anonymous role
-- ---------------------------------------------------------------------------

revoke all on public.planner_goals from anon;

comment on table public.planner_goals is
  'Plan root (Technical Truth §1.1). Reads are gated by RLS; anon has no privileges; writes are server-authorized.';

-- ---------------------------------------------------------------------------
-- 2. A trashed Plan leaves the normal read surfaces
-- ---------------------------------------------------------------------------

drop policy if exists planner_goals_select_visible on public.planner_goals;

create policy planner_goals_select_visible
  on public.planner_goals
  for select
  to authenticated
  using (
    deleted_at is null
    and trashed_at is null
    and is_active_household_member(household_id)
    and (
      visibility = 'household'
      or created_by_member_id = current_household_member_id(household_id)
    )
  );

-- ---------------------------------------------------------------------------
-- 3. trash_goal_rpc — actor derived from auth.uid(), capability checked,
--    client-supplied member id can no longer authorize the write
-- ---------------------------------------------------------------------------

create or replace function public.trash_goal_rpc(
  p_goal_id uuid,
  p_expected_version integer default null,
  p_member_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $$
declare
  v_goal public.planner_goals%rowtype;
  v_actor_member_id uuid;
begin
  if auth.uid() is null or public.current_person_id() is null then
    raise exception 'authenticated actor required' using errcode = '42501';
  end if;

  select * into v_goal from public.planner_goals where id = p_goal_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'goal_not_found');
  end if;

  if v_goal.trashed_at is not null then
    return jsonb_build_object(
      'success', true, 'id', v_goal.id, 'version', v_goal.version, 'already_trashed', true
    );
  end if;

  v_actor_member_id := public.current_household_member_id(v_goal.household_id);
  if v_actor_member_id is null
    or not public.planner_current_actor_has_capability(v_goal.household_id, 'goal.restore')
    or (v_goal.visibility = 'personal' and v_goal.created_by_member_id is distinct from v_actor_member_id)
  then
    raise exception 'goal trash forbidden' using errcode = '42501';
  end if;

  if p_member_id is not null and p_member_id <> v_actor_member_id then
    raise exception 'actor spoofing rejected' using errcode = '42501';
  end if;

  if p_expected_version is not null and v_goal.version <> p_expected_version then
    raise exception 'goal version conflict' using errcode = '40007';
  end if;

  update public.planner_goals
  set trashed_at = now(),
      trashed_by_member_id = v_actor_member_id
  where id = p_goal_id
  returning * into v_goal;

  return jsonb_build_object('success', true, 'id', v_goal.id, 'version', v_goal.version);
end;
$$;

revoke all on function public.trash_goal_rpc(uuid, integer, uuid) from public, anon;
grant execute on function public.trash_goal_rpc(uuid, integer, uuid) to authenticated;