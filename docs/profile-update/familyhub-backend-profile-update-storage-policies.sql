insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "avatars_authenticated_can_read" on storage.objects;
create policy "avatars_authenticated_can_read"
on storage.objects
for select
to authenticated
using (bucket_id = 'avatars');

drop policy if exists "avatars_owner_can_insert" on storage.objects;
create policy "avatars_owner_can_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars_owner_can_update" on storage.objects;
create policy "avatars_owner_can_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars_owner_can_delete" on storage.objects;
create policy "avatars_owner_can_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
