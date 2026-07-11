-- Fix planner_goals RLS for create + return.
-- A valid insert must be for the authenticated member's active household and
-- must carry the membership id resolved server-side by the backend.
-- The SELECT policy must use direct row predicates because INSERT ... RETURNING
-- evaluates SELECT visibility before a self-lookup helper can see the new row.

drop policy if exists "planner_goals_select_visible" on public.planner_goals;

create policy "planner_goals_select_visible"
  on public.planner_goals for select to authenticated
  using (
    deleted_at is null
    and public.is_active_household_member(household_id)
    and (
      visibility = 'household'
      or created_by_member_id = public.current_household_member_id(household_id)
    )
  );

drop policy if exists "planner_goals_insert_active_household" on public.planner_goals;

create policy "planner_goals_insert_active_household"
  on public.planner_goals for insert to authenticated
  with check (
    public.is_active_household_member(household_id)
    and created_by_member_id = public.current_household_member_id(household_id)
  );
