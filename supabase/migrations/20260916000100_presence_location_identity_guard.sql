-- A presence row is the current location of one concrete household membership.
-- RLS limits reads and writes to active household members; this guard also
-- makes that ownership immutable after creation.

create or replace function public.guard_presence_location_identity()
returns trigger
language plpgsql
as $$
begin
  if new.household_id is distinct from old.household_id
    or new.membership_id is distinct from old.membership_id
    or new.person_id is distinct from old.person_id then
    raise exception 'presence_location_identity_immutable' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_presence_location_identity on public.presence_member_locations;
create trigger trg_guard_presence_location_identity
  before update on public.presence_member_locations
  for each row execute function public.guard_presence_location_identity();
