-- Role changes must reach active household members without waiting for a cache
-- TTL. RLS remains the authority for which rows each client can receive.
alter table public.household_members replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.household_members;
    exception
      when duplicate_object then null;
    end;
  end if;
end $$;
