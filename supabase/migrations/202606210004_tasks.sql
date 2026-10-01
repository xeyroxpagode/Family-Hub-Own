-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 004 — Tasks — FamilyHub
--
-- Tabla: public.tasks
-- Tareas del hogar con prioridad, estado y asignación opcional a un miembro.
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists public.tasks (
  id           uuid        primary key default gen_random_uuid(),
  household_id uuid        not null references public.households(id) on delete cascade,
  created_by   uuid        not null references public.users(id)      on delete cascade,
  assigned_to  uuid                    references public.users(id)   on delete set null,
  title        text        not null,
  description  text,
  priority     text        not null default 'media'
               check (priority in ('alta', 'media', 'baja')),
  status       text        not null default 'pendiente'
               check (status in ('pendiente', 'en_progreso', 'completada')),
  due_date     date,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_tasks_household on public.tasks (household_id);
create index if not exists idx_tasks_assigned  on public.tasks (assigned_to);
create index if not exists idx_tasks_status    on public.tasks (status);

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
  before update on public.tasks
  for each row execute procedure public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.tasks enable row level security;

-- Todos los miembros del hogar ven todas las tareas del hogar
drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select"
  on public.tasks for select to authenticated
  using (public.is_household_member(household_id));

-- Cualquier miembro puede crear tareas dentro de su hogar
drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert"
  on public.tasks for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.is_household_member(household_id)
  );

-- El creador, el asignado o el coordinador pueden actualizar
drop policy if exists "tasks_update" on public.tasks;
create policy "tasks_update"
  on public.tasks for update to authenticated
  using (
    created_by = auth.uid()
    or assigned_to = auth.uid()
    or public.is_household_coordinator(household_id)
  )
  with check (
    created_by = auth.uid()
    or assigned_to = auth.uid()
    or public.is_household_coordinator(household_id)
  );

-- El creador o el coordinador pueden eliminar
drop policy if exists "tasks_delete" on public.tasks;
create policy "tasks_delete"
  on public.tasks for delete to authenticated
  using (
    created_by = auth.uid()
    or public.is_household_coordinator(household_id)
  );
