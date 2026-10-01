-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 003 — Schedules / Rutinas — FamilyHub
--
-- Tabla: public.schedules
-- Permite a cada miembro configurar rutinas recurrentes (diaria, semanal, mensual).
-- Un schedule pertenece a un usuario dentro de un hogar.
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists public.schedules (
  id               uuid        primary key default gen_random_uuid(),
  household_id     uuid        not null references public.households(id)  on delete cascade,
  user_id          uuid        not null references public.users(id)        on delete cascade,
  title            text        not null,
  start_time       time        not null,
  end_time         time,
  recurrence       text        not null default 'none'
                               check (recurrence in ('daily','weekly','monthly','none')),
  recurrence_days  int[]       ,   -- [1..7] Lun=1 Dom=7 (weekly)
  recurrence_day   int         ,   -- día del mes 1-31 (monthly)
  color            text        not null default '#CD7353',
  category         text        not null default 'personal'
                               check (category in (
                                 'trabajo','escuela','deporte','salud','familia','personal','otro'
                               )),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_sch_household_id on public.schedules (household_id);
create index if not exists idx_sch_user_id      on public.schedules (user_id);

drop trigger if exists trg_schedules_updated_at on public.schedules;
create trigger trg_schedules_updated_at
  before update on public.schedules
  for each row execute procedure public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.schedules enable row level security;

-- Miembros del hogar ven todos los horarios del hogar
drop policy if exists "schedules_select" on public.schedules;
create policy "schedules_select"
  on public.schedules for select to authenticated
  using (public.is_household_member(household_id));

-- Cada usuario solo puede insertar sus propios horarios dentro de sus hogares
drop policy if exists "schedules_insert" on public.schedules;
create policy "schedules_insert"
  on public.schedules for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_household_member(household_id)
  );

-- Cada usuario edita solo sus propios horarios;
-- el coordinador puede editar cualquier horario del hogar
drop policy if exists "schedules_update" on public.schedules;
create policy "schedules_update"
  on public.schedules for update to authenticated
  using (
    user_id = auth.uid()
    or public.is_household_coordinator(household_id)
  )
  with check (
    user_id = auth.uid()
    or public.is_household_coordinator(household_id)
  );

-- Ídem para borrado
drop policy if exists "schedules_delete" on public.schedules;
create policy "schedules_delete"
  on public.schedules for delete to authenticated
  using (
    user_id = auth.uid()
    or public.is_household_coordinator(household_id)
  );
