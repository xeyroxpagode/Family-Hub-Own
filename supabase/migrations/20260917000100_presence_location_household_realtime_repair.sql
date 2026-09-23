-- A current location is owned by one household membership. These policies keep
-- writes private to the current member while allowing active household peers to
-- read only locations explicitly being shared.

alter table public.presence_member_locations replica identity full;
-- The remote project previously used this grant-only policy. It left two
-- adults in the same household unable to see one another even when both had
-- explicitly enabled sharing.
drop policy if exists "presence_locations_select_visible_only" on public.presence_member_locations;
drop policy if exists "presence_locations_select_household_shared_or_self" on public.presence_member_locations;
create policy "presence_locations_select_household_shared_or_self"
  on public.presence_member_locations for select to authenticated
  using (
    public.is_active_household_member(household_id)
    and (
      sharing_enabled = true
      or person_id = public.current_person_id()
    )
  );
-- Re-add the table idempotently for installations where the original MVP
-- migration ran before Realtime was enabled for this project.
do $$
begin
  alter publication supabase_realtime add table public.presence_member_locations;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
