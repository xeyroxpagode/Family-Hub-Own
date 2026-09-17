-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 005 — Events (one-off) — FamilyHub
--
-- Tabla: public.events
-- Eventos únicos del hogar (cumpleaños, citas, reuniones, etc.).
-- Los eventos recurrentes viven en public.schedules (migration_003).
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists public.events (
  id           uuid        primary key default gen_random_uuid(),
  household_id uuid        not null references public.households(id) on delete cascade,
  created_by   uuid        not null references public.users(id)      on delete cascade,
  assigned_to  uuid                    references public.users(id)   on delete set null,
  title        text        not null,
  description  text,
  start_at     timestamptz not null,
  end_at       timestamptz,
  location     text,
  category     text        not null default 'personal'
               check (category in (
                 'trabajo', 'escuela', 'familia', 'personal', 'salud', 'deporte', 'otro'
               )),
  color        text        not null default '#CD7353',
  all_day      boolean     not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_events_household on public.events (household_id);
create index if not exists idx_events_start_at  on public.events (start_at);
create index if not exists idx_events_assigned  on public.events (assigned_to);

drop trigger if exists trg_events_updated_at on public.events;
create trigger trg_events_updated_at
  before update on public.events
  for each row execute procedure public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.events enable row level security;

-- Todos los miembros del hogar ven todos los eventos del hogar
drop policy if exists "events_select" on public.events;
create policy "events_select"
  on public.events for select to authenticated
  using (public.is_household_member(household_id));

-- Cualquier miembro puede crear eventos en su hogar
drop policy if exists "events_insert" on public.events;
create policy "events_insert"
  on public.events for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.is_household_member(household_id)
  );

-- El creador o el coordinador pueden actualizar
drop policy if exists "events_update" on public.events;
create policy "events_update"
  on public.events for update to authenticated
  using (
    created_by = auth.uid()
    or public.is_household_coordinator(household_id)
  )
  with check (
    created_by = auth.uid()
    or public.is_household_coordinator(household_id)
  );

-- El creador o el coordinador pueden eliminar
drop policy if exists "events_delete" on public.events;
create policy "events_delete"
  on public.events for delete to authenticated
  using (
    created_by = auth.uid()
    or public.is_household_coordinator(household_id)
  );
