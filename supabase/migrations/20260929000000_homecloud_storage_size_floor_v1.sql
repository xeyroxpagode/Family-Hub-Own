-- HomeCloud Slice 01 — defer per-bucket limits to the deployment Storage
-- ceiling. This forward-only repair removes the old 50 MiB bucket wall.
update storage.buckets
set file_size_limit = null
where id in ('homecloud-originals', 'homecloud-previews');

notify pgrst, 'reload schema';
