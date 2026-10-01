HOME-POLISH-0 AUDIT RESULT

1. Main Home files:
- `navigation/HomeTabNavigator.tsx:85-104` — `HomeScreen` routes to role-specific homes based on `currentRole`
- `screens/home/HomeCoordinador.tsx` — Coordinator home (most feature-complete)
- `screens/home/HomeAdulto.tsx` — Adult home
- `screens/home/HomeAdolescente.tsx` — Adolescent home (gamified)
- `screens/home/HomeAdultoMayor.tsx` — Senior home (large touch targets, check-in, SOS)
- `screens/home/HomePlannerSections.tsx` — Shared planner sections used by all roles (fetches real data via `useHomePlannerData`)

2. Current Home section order (Coordinator - most complete):
1. Header: greeting, date, active household name
2. FamilyPulse (Family card) — horizontal scroll of members with role emojis
3. DailyBriefing — MOCK card showing "0 eventos, 0 tareas" + day progress bar
4. QuickActions — horizontal pills: "Tarea", "Evento", "Invitar", "SOS"
5. HomePlannerSections:
   - Action row: "Crear tarea", "Crear evento", "Geni"
   - Atención Requerida (conditional: overdue > 0 OR awaiting_verification > 0)
   - Tareas del hogar (max 5, sorted by urgency)
   - Próximos eventos (max 3)
6. BudgetCard — MOCK finance card (72% budget used, $3,200 remaining)

3. Family card location and recommendation:
- Rendered in `HomeCoordinador.tsx:39-65` as `FamilyPulse()` component
- Uses real members from `useHousehold()` → `members` array with role, name, avatar
- **Recommendation**: REMOVE from top position. People tab (FamilyScreen) owns family management. If kept, move to bottom as "Miembros del hogar" compact list, or remove entirely from Home.

4. Duplicated action buttons found:
- **HomeCoordinador QuickActions** (line 93-113): "Tarea", "Evento", "Invitar", "SOS"
- **HomePlannerSections actionsRow** (line 170-174): "Crear tarea", "Crear evento", "Geni"
- **QuickAdd FAB** (HomeTabNavigator.tsx:258-287): "Crear tarea", "Crear evento", "Preguntar a Geni"
- **All three duplicate each other**. QuickAdd FAB is the canonical creation entry point.
- **Keep**: Compact CTAs inside cards ("Ver tareas", "Ver calendario", "Chatear con Geni")
- **Remove from Home**: All horizontal action pill rows that duplicate QuickAdd FAB

5. Real planner data available in Home:
- Via `useHomePlannerData()` in `HomePlannerSections.tsx:73-146`:
  - `summary`: `pending_tasks_count`, `today_tasks_count`, `overdue_tasks_count`, `awaiting_verification_count`, `upcoming_events_count`, `tasks_today`, `overdue_tasks`, `awaiting_verification_tasks`, `upcoming_events`, `briefing_text`
  - `tasks`: filtered to `pending` + `awaiting_verification`, sorted by urgency (awaiting_verification first, then overdue, then today, then assigned to me, then dated, then undated), max 5
  - `events`: upcoming 14 days, max 3 (falls back to `summary.upcoming_events`)
  - `memberNameById`: Map<membershipId, display_name> from household members
  - `myMembershipId`: current user's membership ID in active household
- `HouseholdContext` provides: `currentHousehold`, `currentRole` (coordinador/adulto/adolescente/adulto_mayor), `members[]`, `isCoordinator`
- `AuthContext` provides: `user`, `authMe` (with `active_household`, `memberships[]` with role/status)

6. Upcoming events data available:
- `listPlannerEvents` fetches 14 days forward with `include_recurring: true`
- `PlannerSummary.upcoming_events` fallback
- Event shape: `id`, `title`, `starts_at`, `ends_at`, `all_day`, `location_name`, `category`, `color`, `recurrence`

7. Household/member/role data available:
- `useHousehold()` → `members: HouseholdMember[]` with `id`, `user_id`, `rol`, `user: { nombre, email, avatar_url }`
- `currentRole`: 'coordinador' | 'adulto' | 'adolescente' | 'adulto_mayor'
- `isCoordinator`: boolean
- `authMe.memberships` → each has `role`, `status`, `household_id`, `person_id`

8. Geni/Briefing card recommendation:
**Replace `DailyBriefing` mock with real data-driven briefing card** (always near top, max 2-3 lines):

```tsx
// In HomePlannerSections or new component
const briefingLines = [];
if (summary.awaiting_verification_count > 0) 
  briefingLines.push(`Hay ${summary.awaiting_verification_count} tarea${summary.awaiting_verification_count !== 1 ? 's' : ''} esperando verificación. Conviene empezar por eso.`);
else if (summary.overdue_tasks_count > 0)
  briefingLines.push(`Hay ${summary.overdue_tasks_count} tarea${summary.overdue_tasks_count !== 1 ? 's' : ''} vencida${summary.overdue_tasks_count !== 1 ? 's' : ''} que necesitan atención.`);
else if (summary.today_tasks_count > 0)
  briefingLines.push(`Hoy quedan ${summary.today_tasks_count} tarea${summary.today_tasks_count !== 1 ? 's' : ''} activa${summary.today_tasks_count !== 1 ? 's' : ''}.`);
else if (summary.upcoming_events_count > 0)
  briefingLines.push(`También hay ${summary.upcoming_events_count} evento${summary.upcoming_events_count !== 1 ? 's' : ''} próximo${summary.upcoming_events_count !== 1 ? 's' : ''}.`);
else
  briefingLines.push("Tu hogar está tranquilo por ahora. 🎉");

// Show first 2 lines max
// CTA: "Chatear con Geni" → opens QuickAdd Geni action or future Geni chat
```

- Clearly mark as mock/demo: subtitle "Resumen automático (demo)" or similar
- Use `summary.briefing_text` from backend if available (currently unused)

9. Carga del hogar recommendation:
**Add new card (Coordinator only, `isCoordinator` guard)** using real task data:

Data available per task:
- `assigned_to_member_id` → assigned count by member
- `completed_by_person_id` / `completed_member` → completed count by member
- `verified_by_person_id` / `verified_member` → verified count by member
- `status === 'awaiting_verification'` → awaiting count by member (via `assigned_to_member_id`)

Simplest MVP formula:
- **Workload** = active assigned tasks per member (`pending` + `awaiting_verification` where `assigned_to_member_id === member.id`)
- **Contribution** = completed + verified tasks per member (last 7-30 days or all-time)
- Show top 4 members (or all if ≤4) with horizontal bars
- Label: "Carga del hogar" / "Balance familiar"
- No shaming/ranking tone — use "equilibrio", "reparto", "colaboración"
- Fallback: "Sin datos suficientes" if no tasks exist

10. Recommended new Home order (all roles, Coordinator-specific marked ★):

1. **Header**: greeting, date, active household name
2. **Geni / Briefing card** — real stats, 2-3 lines, mock AI wording, CTA "Chatear con Geni"
3. **Atención Requerida** (conditional) — only if `overdue_tasks_count > 0` OR `awaiting_verification_count > 0` OR pending approvals (future) → CTA to relevant module
4. **Resumen de hoy** — today events count + today pending tasks count + simple day progress (from existing `DailyBriefing` progress bar logic)
5. **Carga del hogar** (★ Coordinator only) — workload distribution bars, "balance familiar" language
6. **Tareas del hogar preview** — max 3 important tasks (from `tasks` array, already sorted by urgency), compact, CTA "Ver tareas"
7. **Próximos eventos preview** — max 3 upcoming events (from `events` array), compact, CTA "Ver calendario"
8. **Lower/conditional widgets** (only when useful):
   - Finanzas Relevantes — only if budget alert exists (currently mock, keep mock but gated)
   - Presence / Activity — only if useful mock (Adolescente/AdultoMāyor have wellbeing/mood)
   - Family card — REMOVED or moved here (People tab owns it)

11. HOME-POLISH implementation order:

**HOME-POLISH-1: Remove duplication & reorder Coordinator Home**
- Remove `FamilyPulse` from top of `HomeCoordinador.tsx`
- Remove `QuickActions` component (duplicates QuickAdd FAB)
- Remove action row from `HomePlannerSections.tsx` (lines 170-174)
- Reorder: Header → Briefing (new) → Atención Requerida (existing conditional) → Resumen de hoy → HomePlannerSections (tasks + events only)
- Keep `BudgetCard` but gate behind finance alert (future) or move to bottom with "Demo" label

**HOME-POLISH-2: Build real Geni/Briefing card**
- Create `BriefingCard` component using `summary` data
- Place at top of `HomePlannerSections` or as standalone in each role home
- Max 2-3 lines, CTA to QuickAdd Geni action
- Mark clearly as demo/local

**HOME-POLISH-3: Add Carga del hogar (Coordinator only)**
- New component `HouseholdWorkloadCard` in `HomePlannerSections` or `HomeCoordinador`
- Compute from `tasks` array + `members` array
- Show assigned active tasks + completed/verified per member
- Only render if `isCoordinator` && `members.length > 1` && `tasks.length > 0`

**HOME-POLISH-4: Polish previews & conditional widgets**
- Limit tasks preview to 3 (currently 5 in `HomePlannerSections`)
- Limit events preview to 3 (already 3)
- Truncate long task titles
- Gate `BudgetCard` / finance behind real alert or "Demo" badge
- Align Adult/Adolescent/Senior homes to same pattern (they all use `HomePlannerSections`)

12. Files likely to modify first:
- `screens/home/HomeCoordinador.tsx` — remove FamilyPulse, QuickActions, reorder, add BriefingCard
- `screens/home/HomePlannerSections.tsx` — remove actionsRow, add BriefingCard at top, add HouseholdWorkloadCard (coordinator), limit tasks to 3
- `screens/home/HomeAdulto.tsx` — ensure uses shared sections, add BriefingCard
- `screens/home/HomeAdolescente.tsx` — ensure uses shared sections, add BriefingCard
- `screens/home/HomeAdultoMayor.tsx` — ensure uses shared sections, add BriefingCard

13. Files to avoid touching:
- `services/plannerTasks.ts` — data layer, do not modify
- `services/plannerEvents.ts` — data layer, do not modify
- `services/plannerSummary.ts` — data layer, do not modify
- `context/HouseholdContext.tsx` — provides data, do not modify
- `context/AuthContext.tsx` — auth, do not modify
- `navigation/HomeTabNavigator.tsx` — navigation structure, QuickAdd FAB is canonical, keep
- `components/ui/*` — shared UI primitives, do not modify

14. Risks:
- **Visual-only changes**: Removing FamilyPulse, QuickActions, action rows, reordering cards — LOW RISK
- **Real data mapping**: BriefingCard, HouseholdWorkloadCard need correct aggregation from `summary` + `tasks` + `members` — MEDIUM RISK (ensure empty states handled)
- **Role-specific homes**: Adult/Adolescent/Senior have custom sections (mood, wellbeing, check-in, photos) — must preserve their unique UX while adding shared BriefingCard
- **Mock features**: BudgetCard, Family activity, Challenges, Voice messages — keep as-is but gate behind "Demo" label or move lower; do not build real backend for them in this polish
- **QuickAdd FAB**: Must remain the single creation entry point; verify all "Crear tarea/evento" CTAs navigate to PlannerTab with correct params