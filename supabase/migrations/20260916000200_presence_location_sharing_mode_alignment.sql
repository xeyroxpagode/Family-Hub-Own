-- The current-location table uses sharing_mode as the authoritative source for
-- sharing_enabled. Keep this migration idempotent because the remote project
-- already introduced the mode while this checkout still used the original MVP
-- schema.

alter table public.presence_member_locations
  add column if not exists sharing_mode text not null default 'off',
  add column if not exists history_enabled boolean not null default false;

update public.presence_member_locations
set sharing_mode = case when sharing_enabled then 'foreground' else 'off' end
where sharing_mode is null or sharing_mode not in ('off', 'foreground', 'background');

do $$
begin
  alter table public.presence_member_locations
    add constraint presence_member_locations_sharing_mode_valid
    check (sharing_mode in ('off', 'foreground', 'background'));
exception
  when duplicate_object then null;
end;
$$;

create or replace function public.normalize_presence_sharing_state()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.sharing_enabled := new.sharing_mode <> 'off';

  if new.sharing_mode = 'off' then
    new.latitude := null;
    new.longitude := null;
    new.accuracy_meters := null;
    new.recorded_at := null;
    new.history_enabled := false;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_presence_member_locations_normalize_sharing on public.presence_member_locations;
create trigger trg_presence_member_locations_normalize_sharing
  before insert or update on public.presence_member_locations
  for each row execute function public.normalize_presence_sharing_state();
