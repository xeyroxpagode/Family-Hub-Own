-- S7-01 — ASSETS <-> PLANNER: planner_events origin_* fields.
--
-- Mirror semantico EXACTO del patron ya existente en planner_tasks
-- (202607080003_planner_tasks_origin_fields.sql +
--  20260916000002_planner_tasks_origin_module_include_planner.sql).
--
-- Contrato congelado S6:
-- - origin_* es una REFERENCIA SUAVE (soft reference). NO hay FK hacia
--   public.assets ni hacia ningun otro dominio: el dominio propietario
--   (Assets) es la autoridad de la semantica de esa referencia.
-- - origin_* es INMUTABLE despues del create (garantizado por el trigger de
--   20261022000001_planner_event_origin_write_v1.sql).
-- - origin_* lo emite el SERVIDOR. El frontend NUNCA envia origin_*.
--
-- Sin backfill destructivo: los Events existentes siguen con origin_* = NULL
-- y siguen funcionando exactamente igual.

alter table public.planner_events
  add column if not exists origin_module text null;

alter table public.planner_events
  add column if not exists origin_entity_type text null;

alter table public.planner_events
  add column if not exists origin_entity_id uuid null;

alter table public.planner_events
  add column if not exists origin_reason text null;

-- origin_module: catalogo cerrado, identico al de planner_tasks.
alter table public.planner_events
  drop constraint if exists planner_events_origin_module_check;
alter table public.planner_events
  add constraint planner_events_origin_module_check
  check (
    origin_module is null
    or origin_module in (
      'inventory',
      'assets',
      'finance',
      'geni',
      'automation',
      'planner'
    )
  );

-- origin_entity_type: si esta presente, no puede estar en blanco.
alter table public.planner_events
  drop constraint if exists planner_events_origin_entity_type_not_empty_check;
alter table public.planner_events
  add constraint planner_events_origin_entity_type_not_empty_check
  check (
    origin_entity_type is null
    or length(trim(origin_entity_type)) > 0
  );

-- origin_reason: si esta presente, no puede estar en blanco.
alter table public.planner_events
  drop constraint if exists planner_events_origin_reason_not_empty_check;
alter table public.planner_events
  add constraint planner_events_origin_reason_not_empty_check
  check (
    origin_reason is null
    or length(trim(origin_reason)) > 0
  );

-- Indice de resolucion de referencia: household + quartet origin.
-- Predicado espejo de idx_planner_tasks_origin (Event activo/no cancelado).
create index if not exists idx_planner_events_origin
  on public.planner_events (household_id, origin_module, origin_entity_type, origin_entity_id)
  where origin_module is not null
    and status <> 'cancelled';

-- Indice del read model "Proximo": incluye origin_reason + status/lifecycle.
create index if not exists idx_planner_events_origin_active
  on public.planner_events (
    household_id, origin_module, origin_entity_type, origin_entity_id,
    origin_reason, status, lifecycle
  )
  where origin_module is not null
    and origin_entity_type is not null
    and origin_entity_id is not null
    and status = 'scheduled'
    and lifecycle = 'scheduled'
    and trashed_at is null;

comment on column public.planner_events.origin_module is
  'Dominio propietario de la referencia suave (S7-01). Emitido por el servidor; nunca enviado por el frontend.';
comment on column public.planner_events.origin_entity_type is
  'Tipo de entidad referenciada (ej. asset). Inmutable despues del create.';
comment on column public.planner_events.origin_entity_id is
  'Id de la entidad referenciada. Soft reference: sin FK cross-domain.';
comment on column public.planner_events.origin_reason is
  'Motivo de la referencia (ej. asset_scheduled). Inmutable despues del create.';
