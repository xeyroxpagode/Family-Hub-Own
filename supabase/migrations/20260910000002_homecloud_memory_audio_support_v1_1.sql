-- HomeCloud HC-1A corrective patch — Memory Audio Support v1.1.
--
-- Revalidated Product Truth expands the canonical MEMORY MIME families from
-- image/* + video/* to image/* + video/* + audio/*. A MEMORY is media
-- preserved for reminiscence and may now hold audio (audio/mpeg, audio/mp4,
-- audio/x-m4a, audio/ogg, ...).
--
-- Audio is NOT a new HomeCloud role. role remains exactly file|memory. This
-- patch replaces ONLY the MEMORY MIME invariant and preserves every other
-- HC-1A constraint (role domain, capture rules, file rules, lifecycle, folder
-- behavior, storage fields, permissions) unchanged.
--
-- The historical migration 20260910000000_homecloud_canonical_content_v1_1.sql
-- is immutable and is deliberately NOT edited.

alter table public.homecloud_contents
  drop constraint if exists homecloud_contents_memory_media_check;

alter table public.homecloud_contents
  add constraint homecloud_contents_memory_media_check
  check (
    role <> 'memory'
    or mime_type like 'image/%'
    or mime_type like 'video/%'
    or mime_type like 'audio/%'
  );

notify pgrst, 'reload schema';