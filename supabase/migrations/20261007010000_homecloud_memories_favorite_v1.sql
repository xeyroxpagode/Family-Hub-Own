-- HomeCloud ST-3 — HOUSEHOLD_SHARED Favorites foundation.
--
-- Smallest additive migration: one boolean column on the canonical content
-- table. No per-member table, no normal Favorites Album, no system collection.
--
-- Canonical contract (frozen): the column is `favorite` (shared, per household).
-- Every existing row defaults to false; trash/restore preserve the value
-- because lifecycle updates never touch this column.

alter table public.homecloud_contents
  add column if not exists favorite boolean not null default false;

comment on column public.homecloud_contents.favorite is
  'HOUSEHOLD_SHARED favorite flag. Same value for every household member. Default false. Preserved across lifecycle transitions (trash/restore never rewrite it).';

notify pgrst, 'reload schema';
