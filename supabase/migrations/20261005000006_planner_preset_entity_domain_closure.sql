-- Planner closure (overnight): Preset entity domain.
-- Extends `planner_presets` / `planner_revisions` / `planner_drafts` entity_type
-- CHECKs with the canonical frozen domain (overnight Product Truth §33):
--   task | responsibility | event | event_series | plan
-- `measurement` is deliberately NOT a preset type: Measurements are Plan-local
-- state, not a form template.
--
-- Additive/corrective only; no applied migration is edited. Widening a CHECK is
-- strictly non-destructive: existing rows keep their values.

alter table public.planner_presets
  drop constraint if exists planner_presets_entity_type_check;

alter table public.planner_presets
  add constraint planner_presets_entity_type_check
  check (entity_type in ('task', 'responsibility', 'event', 'event_series', 'plan'));

alter table public.planner_drafts
  drop constraint if exists planner_drafts_entity_type_check;

alter table public.planner_drafts
  add constraint planner_drafts_entity_type_check
  check (entity_type in ('task', 'responsibility', 'event', 'event_series', 'plan'));
