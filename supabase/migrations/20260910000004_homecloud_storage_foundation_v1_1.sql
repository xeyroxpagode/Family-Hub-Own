-- HomeCloud HC-1E - Storage Foundation.
--
-- Provisions two PRIVATE buckets for HomeCloud binary custody:
--   homecloud-originals  (canonical originals, write-once after finalize)
--   homecloud-previews   (derived previews, regenerable, replaceable)
--
-- Both buckets are PRIVATE. No public buckets. No per-Household buckets.
-- Storage is byte custody only; Postgres remains semantic authority.

-- 1) Create private buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('homecloud-originals', 'homecloud-originals', false, 52428800, null),
  ('homecloud-previews',  'homecloud-previews',  false, 52428800, null)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2) RLS policies for homecloud-originals
--    storage.objects already has RLS enabled by Supabase
--    anon: no access (no policy = default deny)
--    authenticated: no direct access (all access via backend signed URLs)
--    service_role: full access via explicit policy

drop policy if exists "homecloud_originals_service_full" on storage.objects;
create policy "homecloud_originals_service_full" on storage.objects
  for all
  to service_role
  using (bucket_id = 'homecloud-originals')
  with check (bucket_id = 'homecloud-originals');

-- 3) RLS policies for homecloud-previews (same pattern)

drop policy if exists "homecloud_previews_service_full" on storage.objects;
create policy "homecloud_previews_service_full" on storage.objects
  for all
  to service_role
  using (bucket_id = 'homecloud-previews')
  with check (bucket_id = 'homecloud-previews');

-- 4) No policies for anon or authenticated = default deny (RLS already enabled)
--    This ensures NO direct client access to homecloud objects.

notify pgrst, 'reload schema';