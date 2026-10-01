**\# HomePlus 2-Week CTO Delivery Plan**

**\#\# Executive decision**

The documented HomePlus vision is a 6-18 month product, not a 2-week deliverable. Current implementation is roughly 15-20% of the full specification: auth, households, profiles, database foundations, and frontend-only Planner services exist; most documented domains are missing.

For a 2-week deadline, the winning strategy is not to chase all 10 domains. The winning strategy is to ship a stable, demonstrable, integrated vertical slice:

\> **\*\*HomePlus MVP: a household coordination app where a family can sign up, create/join a household, manage members, assign tasks/events, track shopping/inventory, record basic shared expenses, and see a unified household activity feed.\*\***

This maximizes:

\- **\*\*Stability:\*\*** build on existing Auth, Household, Supabase, RLS, and Expo foundation.  
\- **\*\*Demonstrability:\*\*** every feature supports a clear demo flow.  
\- **\*\*Grading success:\*\*** covers the strongest documented product themes: household isolation, roles, Planner, shared coordination, Feed, Finance-lite, Inventory-lite.  
\- **\*\*Development speed:\*\*** avoids high-risk AI, real-time, offline, geofencing, media processing, and automation engines.

**\---**

**\#\# 1\. MVP definition**

**\#\#\# MVP name**

**\*\*HomePlus Family Coordination MVP\*\***

**\#\#\# MVP promise**

HomePlus helps one household coordinate daily life in one place: people, tasks, calendar events, shopping needs, basic expenses, and household activity.

**\#\#\# MVP user story**

A coordinator can:

1\. Register and create a household.  
2\. Invite family members with role-based access.  
3\. View household members.  
4\. Create tasks and assign them.  
5\. Create calendar events and routines.  
6\. Add inventory/shopping items.  
7\. Record basic shared expenses.  
8\. See important household actions appear in a feed.  
9\. Update profile/avatar/notification preferences.  
10\. Demo the complete flow reliably on a mobile device or Expo.

**\#\#\# MVP acceptance criteria**

The MVP is complete only if:

\- A fresh user can complete onboarding without manual database intervention.  
\- A second user can join via invitation token.  
\- Household data is isolated by \`household\_id\`.  
\- Core screens have empty, loading, success, and error states.  
\- Tasks, events, inventory items, and expenses persist in Supabase.  
\- At least one role restriction is visibly enforced in UI and RLS.  
\- The app has a seeded demo household for grading/demo.  
\- A 5-7 minute demo can be performed without crashes.  
\- Lint/typecheck/build pass.  
\- At least critical flows have smoke or integration tests.

**\#\#\# Explicit non-goal**

This MVP is **\*\*not\*\*** the full "home operating system." It is a credible first delivery that proves the product direction and protects quality.

**\---**

**\#\# 2\. Features required for delivery**

**\#\#\# P0 — must ship**

These are required for a stable, gradeable MVP.

**\#\#\#\# 1\. Auth and onboarding hardening**

\- Email/password signup.  
\- Login/logout.  
\- Password recovery remains functional.  
\- Onboarding completion tracking.  
\- First household creation.  
\- Join household via token.  
\- Clear error messages for expired/used invalid invitation tokens.  
\- Decide and enforce invitation duration as **\*\*24 hours\*\*** to match current business rules.

**\#\#\#\# 2\. Household and People management**

\- Household member list.  
\- Invite member flow.  
\- Coordinator can remove a member.  
\- Coordinator can change member role among currently supported roles.  
\- Supported MVP roles:  
  \- \`coordinador\`  
  \- \`adulto\`  
  \- \`adolescente\`  
  \- \`adulto\_mayor\`  
\- Role display on home/profile/member screens.

Do **\*\*not\*\*** implement \`niño\`, \`invitado\`, or \`empleado\_familiar\` unless all P0 work is already stable.

**\#\#\#\# 3\. Planner vertical slice**

Planner is the highest-leverage domain because current database migrations already include \`tasks\`, \`schedules\`, and \`events\`.

Required:

\- Task CRUD.  
\- Assign task to household member.  
\- Task priority and status.  
\- Mark task complete.  
\- Event CRUD.  
\- Calendar day/week view using existing calendar screen.  
\- Schedule/routine CRUD.  
\- Home dashboard widgets:  
  \- "Today"  
  \- "Pending tasks"  
  \- "Upcoming events"

Defer:

\- Goals.  
\- Responsibilities as a complex cross-domain grouping system.  
\- Streaks.  
\- RFC 5545 recurrence engine.  
\- Conflict detection.

**\#\#\#\# 4\. Inventory-lite**

Inventory is already visible in navigation, so leaving it as a placeholder damages demonstrability.

Required:

\- Inventory item CRUD.  
\- Category field.  
\- Quantity/status.  
\- Low-stock indicator.  
\- Shopping list section.  
\- "Create task from shopping item" shortcut if feasible.

Defer:

\- Expiry records.  
\- Barcode scanning.  
\- Advanced stock forecasting.  
\- Inventory analytics.

**\#\#\#\# 5\. Finance-lite**

Finance is core in the documentation and named as a major gap. A narrow slice is enough for grading.

Required:

\- Shared expense CRUD.  
\- Amount, category, date, paid by, optional notes.  
\- Simple monthly total.  
\- Simple budget limit and "over budget" warning.  
\- Role rule:  
  \- Coordinator/adult can create household expenses.  
  \- Adolescente can create own expense or view limited information.  
  \- Niño/invitado/empleado are out of MVP scope.

Defer:

\- Multiple accounts.  
\- Incomes.  
\- Funds.  
\- Debts.  
\- Approval workflows.  
\- Financial audit sophistication.  
\- Sensitive-data encryption beyond existing platform controls.

**\#\#\#\# 6\. Feed/activity timeline**

The MVP feed should be an activity timeline, not a full social network.

Required:

\- Feed entries generated from important actions:  
  \- member joined  
  \- task created/completed  
  \- event created  
  \- shopping item added  
  \- expense created  
\- Read-only feed list.  
\- Basic filtering or visual grouping by event type if easy.

Defer:

\- User-authored posts.  
\- Comments.  
\- Reactions.  
\- Media posts.  
\- Achievement gamification.

**\#\#\#\# 7\. Profile and preferences polish**

Required:

\- Profile name update remains stable.  
\- Avatar upload remains stable.  
\- Notification preferences screen does not imply unsupported push notifications.  
\- Clear labeling: preferences are saved but push delivery is not part of MVP unless implemented.

**\#\#\#\# 8\. Minimum quality infrastructure**

Required:

\- Single source of truth for migrations: \`supabase/migrations\`.  
\- Basic frontend lint/typecheck.  
\- Backend lint or syntax check.  
\- Smoke tests for auth/household/planner.  
\- Seed/demo data script.  
\- \`.env.example\` or setup documentation.  
\- Basic CI if repository hosting supports it.  
\- Crash/error boundary in the mobile app.

**\---**

**\#\# 3\. Features to postpone**

Postponement is not failure. It is required to protect delivery quality.

**\#\#\# Postpone entirely**

**\#\#\#\# Geni / AI layer**

Reason:

\- High complexity.  
\- Core privacy contradictions unresolved.  
\- Real AI quality cannot be delivered safely in 2 weeks.

Allowed MVP substitute:

\- Static "Geni coming soon" card.  
\- Optional rule-based daily summary from existing data, clearly not branded as full AI.

**\#\#\#\# Presence / location / geofences**

Reason:

\- High privacy and permission risk.  
\- Requires background location, device permissions, retention policy, and location-AI boundary decisions.

Allowed MVP substitute:

\- Event location text field only.

**\#\#\#\# SOS emergency system**

Reason:

\- Safety-critical. A fake or unreliable emergency system is worse than no system.

Allowed MVP substitute:

\- "Emergency contacts coming soon" settings placeholder, or internal "help request" clearly labeled as non-emergency if needed for demo.

**\#\#\#\# HomeCloud**

Reason:

\- Requires file limits, quotas, storage security, media/document UX, and processing.

Allowed MVP substitute:

\- Avatar upload only.

**\#\#\#\# Assets**

Reason:

\- Too many subdomains: vehicles, pets, properties, devices, maintenance.

Allowed MVP substitute:

\- Future roadmap card.

**\#\#\#\# Automatizaciones**

Reason:

\- Rule engines create recursion, audit, permission, and failure-mode complexity.

Allowed MVP substitute:

\- Manual shortcuts only, such as "create task from shopping item."

**\#\#\#\# Full real-time and offline sync**

Reason:

\- Missing conflict strategy.  
\- High bug risk in collaborative mobile app.

Allowed MVP substitute:

\- Pull-to-refresh.  
\- Refetch on screen focus.  
\- Optimistic UI only where easy to rollback.

**\#\#\#\# Full role model**

Postpone:

\- Niño.  
\- Invitado.  
\- Empleado Familiar.  
\- Complete permission matrix.

Ship:

\- Existing 4 roles only.  
\- Enforce coordinator-only admin actions.

**\---**

**\#\# 4\. Domain implementation order**

**\#\#\# Order of execution**

**\#\#\#\# 1\. Stabilization foundation**

Includes:

\- Auth.  
\- Onboarding.  
\- Household creation.  
\- Invitation flow.  
\- Member management.  
\- RLS confirmation.

Why first:

\- Every other feature depends on a valid user, household, member, role, and \`household\_id\`.  
\- Bugs here destroy the demo.

**\#\#\#\# 2\. Planner**

Includes:

\- Tasks.  
\- Events.  
\- Schedules.  
\- Calendar UI.  
\- Home dashboard summaries.

Why second:

\- Existing migrations already exist.  
\- It is the most demonstrable family coordination loop.  
\- It gives immediate user value.

**\#\#\#\# 3\. Inventory-lite**

Includes:

\- Inventory items.  
\- Shopping list.  
\- Low stock.  
\- Optional shopping-task link.

Why third:

\- Existing UI tab already exists.  
\- Lower data complexity than Finance.  
\- Creates a strong household coordination demo.

**\#\#\#\# 4\. Finance-lite**

Includes:

\- Expenses.  
\- Simple monthly totals.  
\- Simple budget warning.

Why fourth:

\- Important for documented core scope.  
\- Can be delivered narrowly.  
\- Must not consume the project with full finance complexity.

**\#\#\#\# 5\. Feed/activity timeline**

Includes:

\- Generated activity entries.  
\- Read-only household timeline.

Why fifth:

\- Ties domains together.  
\- Makes the app feel integrated without building full AI or automations.

**\#\#\#\# 6\. Quality, demo, and hardening**

Includes:

\- Test flows.  
\- Demo data.  
\- Error states.  
\- Build/lint/typecheck.  
\- Crash fixes.  
\- Final documentation.

Why last but continuous:

\- Final delivery quality depends on hardening, not more feature count.

**\---**

**\#\# 5\. Daily roadmap**

Assumption: 14 calendar days, with the final 2-3 days reserved for stabilization. If capacity is one developer only, cut Finance-lite before cutting Planner or Household stability.

**\#\#\# Day 1 — Scope freeze and technical alignment**

Deliverables:

\- Freeze MVP scope from this plan.  
\- Create final entity list for MVP only.  
\- Resolve blocking contradictions:  
  \- invitation token duration \= 24 hours  
  \- Persona/User distinction deferred  
  \- no GPS data or AI in MVP  
  \- no true emergency SOS in MVP  
\- Decide implementation style:  
  \- Supabase-first for MVP data access.  
  \- Express only where already used or server-side processing is required.  
\- Create implementation checklist.

Quality gate:

\- No new domain work starts until MVP schema and route/data-access decisions are locked.

**\#\#\# Day 2 — Auth, onboarding, household hardening**

Deliverables:

\- Onboarding completion tracking.  
\- Invitation error handling.  
\- Member list reliability.  
\- Coordinator-only member actions.  
\- Remove/disable routes or UI paths that imply unsupported features.

Quality gate:

\- Fresh signup to household creation works.  
\- Join via invite works.  
\- Expired/used token is handled cleanly.

**\#\#\# Day 3 — Planner backend/data layer**

Deliverables:

\- Confirm/complete \`tasks\`, \`events\`, \`schedules\` schema.  
\- RLS policies validated for Planner tables.  
\- Service functions for CRUD operations.  
\- Shared validation for required fields.

Quality gate:

\- CRUD works from service layer for coordinator/adult test users.  
\- Unauthorized cross-household access fails.

**\#\#\# Day 4 — Planner UI**

Deliverables:

\- Task create/edit/complete flow.  
\- Event create/edit flow.  
\- Schedule/routine create/edit flow.  
\- Calendar and home dashboard read from persisted data.

Quality gate:

\- Demo user can create and complete a task and see it update on Home/Calendar.

**\#\#\# Day 5 — Inventory-lite data and UI**

Deliverables:

\- Inventory item table/migration if missing.  
\- Inventory CRUD.  
\- Shopping list state.  
\- Low-stock visual indicator.  
\- Optional create-task-from-item shortcut.

Quality gate:

\- Inventory tab is no longer a placeholder.  
\- Shopping list can be demonstrated end-to-end.

**\#\#\# Day 6 — Finance-lite data and UI**

Deliverables:

\- Expenses table.  
\- Optional simple budgets table or budget setting.  
\- Expense CRUD.  
\- Monthly expense total.  
\- Over-budget warning.  
\- Role-aware visibility.

Quality gate:

\- Coordinator/adult can add an expense and see total update.  
\- Restricted users do not get full finance controls.

**\#\#\# Day 7 — Feed/activity timeline**

Deliverables:

\- \`activity\_feed\` or \`household\_events\` table.  
\- Activity generation for key actions.  
\- Feed screen connected to real data.  
\- Empty state and refresh behavior.

Quality gate:

\- Completing a task and adding an expense creates visible feed activity.

**\#\#\# Day 8 — Role, RLS, and security hardening**

Deliverables:

\- Review all MVP RLS policies.  
\- Add missing indexes for \`household\_id\`, dates, assigned users.  
\- Add input validation.  
\- Add basic API rate limiting if Express endpoints remain public.  
\- Remove duplicate/confusing backend route registration if risky.

Quality gate:

\- Cross-household data isolation tested.  
\- Coordinator-only flows enforced server-side/RLS, not only in UI.

**\#\#\# Day 9 — UX polish and stability**

Deliverables:

\- Consistent loading states.  
\- Empty states.  
\- Error boundaries.  
\- Basic design tokens extracted for colors/spacing where fastest.  
\- Home screen tells a coherent story:  
  \- household  
  \- today  
  \- tasks  
  \- events  
  \- shopping  
  \- spending

Quality gate:

\- No obvious placeholder screens in primary navigation.

**\#\#\# Day 10 — Testing infrastructure**

Deliverables:

\- Smoke tests for auth, household, planner.  
\- Service-layer tests for key Supabase calls where practical.  
\- Manual E2E checklist.  
\- Seed/demo data script.  
\- Build/typecheck/lint commands documented and passing.

Quality gate:

\- One command or clear checklist can validate the MVP.

**\#\#\# Day 11 — Full demo rehearsal and bug bash**

Deliverables:

\- Run complete demo script start-to-finish.  
\- Fix blocker bugs.  
\- Add missing validation messages.  
\- Verify mobile layout at target viewport/device.

Quality gate:

\- 5-7 minute demo completes without crash or manual DB edits.

**\#\#\# Day 12 — Documentation and grading package**

Deliverables:

\- README update.  
\- Setup instructions.  
\- Demo account/seed instructions.  
\- MVP scope statement.  
\- Postponed features documented honestly.  
\- Known limitations documented.

Quality gate:

\- A grader can run or understand the MVP without asking the team.

**\#\#\# Day 13 — Release candidate**

Deliverables:

\- Final lint/typecheck/build.  
\- Final database migration review.  
\- Final RLS review.  
\- Record demo video if required.  
\- Freeze feature work.

Quality gate:

\- Only release-blocking bugs may be changed after this point.

**\#\#\# Day 14 — Contingency and final delivery**

Deliverables:

\- Fix release-blocking defects.  
\- Prepare final handoff.  
\- Submit app, repo, demo video, docs, and roadmap.

Quality gate:

\- Delivery is stable, not feature-maximal.

**\---**

**\#\# 6\. Risk mitigation plan**

| Risk | Severity | Why it matters | Mitigation | Cut line |  
|---|---:|---|---|---|  
| Scope creep across 10 domains | Critical | Full documented scope is impossible in 2 weeks | Freeze MVP to 5 demonstrable domains: Auth/People, Planner, Inventory-lite, Finance-lite, Feed | Cut Finance-lite before cutting Planner stability |  
| Auth/onboarding instability | Critical | Demo cannot start | Harden first; test fresh signup and invite join daily | No feature work if auth is broken |  
| RLS/security bugs | Critical | Household app depends on data isolation | RLS policies with each table; test cross-household reads/writes | Disable feature if RLS cannot be verified |  
| Finance becomes too large | High | Full finance is months of work | Only expenses \+ simple budget warning | Cut accounts/incomes/funds/debts |  
| Placeholder navigation hurts grading | High | Visible placeholders signal incompleteness | Make Inventory/Feed real or hide unsupported tabs | Hide unfinished modules |  
| AI/Geni expectations | High | Documentation positions AI as core but implementation is 0% | Present Geni as roadmap; optional rule-based summary only | Do not integrate real AI |  
| Real-time/offline sync complexity | High | Conflict resolution missing | Use refetch-on-focus and pull-to-refresh | No offline queue in MVP |  
| SOS liability | High | Emergency systems must be reliable | Do not ship fake SOS | Only non-emergency placeholder |  
| No testing infrastructure | High | Regression risk in rapid build | Add smoke tests and manual E2E checklist by Day 10 | Manual smoke tests required before delivery |  
| Database migration divergence | Medium | Existing backend SQL duplicates Supabase migrations | Use \`supabase/migrations\` only for MVP | Do not edit duplicate SQL unless removing debt intentionally |  
| Hardcoded design inconsistency | Medium | Hurts polish | Extract minimal design tokens only for changed screens | Avoid full design system build |  
| Missing CI/CD | Medium | Manual errors | Add minimal CI if feasible | If CI slips, document exact local validation commands |

**\---**

**\#\# 7\. Recommended architecture adjustments**

**\#\#\# 1\. Adopt a Supabase-first MVP architecture**

For the 2-week MVP, use Supabase as the primary application backend for domain CRUD:

\- PostgreSQL tables.  
\- RLS policies.  
\- Supabase JS client.  
\- RPC only for operations that need elevated privileges.

Keep Express for:

\- Existing auth/profile endpoints if already stable.  
\- Avatar processing.  
\- Any server-only logic already implemented.

Avoid building a full parallel Express API for every domain during the MVP. That duplicates effort and increases failure risk.

**\#\#\# 2\. Make \`household\_id\` the non-negotiable isolation boundary**

Every MVP domain table must include:

\- \`id\`  
\- \`household\_id\`  
\- \`created\_by\`  
\- \`created\_at\`  
\- \`updated\_at\`  
\- optional \`deleted\_at\` if soft-delete is implemented now

Every MVP query should be scoped by current household.

**\#\#\# 3\. Defer Persona ≠ User model migration**

The documented Persona/User distinction is important, but changing the membership model now risks breaking auth and invitations.

MVP decision:

\- Keep current \`user\_id\`-based membership model.  
\- Document Persona/User as a post-MVP migration.  
\- Do not introduce nullable \`user\_id\` during this deadline unless absolutely required.

**\#\#\# 4\. Introduce a lightweight event/activity layer**

Instead of full notifications, automations, audit logs, and Geni event consumers, create one MVP table:

\`\`\`sql  
household\_activity (  
  id uuid primary key,  
  household\_id uuid not null,  
  actor\_user\_id uuid,  
  type text not null,  
  entity\_type text not null,  
  entity\_id uuid,  
  message text not null,  
  created\_at timestamptz not null  
)  
\`\`\`

Use it for:

\- Feed.  
\- Demo visibility.  
\- Future audit/notification expansion.

Do not call it a complete audit system.

**\#\#\# 5\. Create domain service modules in frontend**

Use a predictable structure:

\`\`\`text  
services/  
  households.ts  
  planner.ts  
  inventory.ts  
  finance.ts  
  activity.ts  
\`\`\`

Each service should:

\- Accept \`householdId\`.  
\- Return typed data.  
\- Convert Supabase errors into user-friendly errors.  
\- Avoid direct table calls scattered across screens.

**\#\#\# 6\. Add minimal shared validation**

Use lightweight validation at service/UI boundaries:

\- Required title/name fields.  
\- Numeric amount/quantity validation.  
\- Date validation.  
\- Role/action checks.

Do not build a large validation framework unless already available.

**\#\#\# 7\. Consolidate migration strategy**

MVP rule:

\- New schema changes go only in \`supabase/migrations\`.  
\- \`backend/sql\` should not be expanded.  
\- If duplicate files remain, document them as legacy/debt.

**\#\#\# 8\. Add only essential infrastructure**

Required now:

\- Typecheck.  
\- Lint or syntax checks.  
\- Smoke tests.  
\- Seed/demo data.  
\- Setup instructions.

Post-MVP:

\- Full CI/CD pipeline.  
\- Monitoring/APM.  
\- Sentry.  
\- Backups.  
\- Security scanning.

**\#\#\# 9\. Use feature flags or hidden navigation for unfinished modules**

If a feature is not real, do not expose it as a main tab.

Rule:

\- Real minimal feature \> impressive placeholder.  
\- Hidden unfinished module \> visible broken promise.

**\#\#\# 10\. Build for demo reproducibility**

Add:

\- Seed household.  
\- Seed coordinator/adult/adolescent members if auth constraints allow.  
\- Seed tasks/events/inventory/expenses/feed.  
\- Demo script in README.

The grader should see the product value in minutes.

**\---**

**\#\# Recommended final demo script**

1\. Launch app.  
2\. Register as coordinator.  
3\. Create household "Casa García."  
4\. Invite an adult member.  
5\. Show household member list.  
6\. Create task: "Comprar leche" assigned to adult.  
7\. Add calendar event: "Cita médica abuela."  
8\. Add inventory item: "Leche" with low-stock status.  
9\. Create shopping task from inventory item if implemented.  
10\. Add expense: "Supermercado \- $45."  
11\. Show Home dashboard summary.  
12\. Show Feed with generated activity from the above actions.  
13\. Update profile/avatar or preferences.  
14\. Explain postponed modules as deliberate roadmap, not missing work.

**\---**

**\#\# Final CTO recommendation**

Ship a narrow but polished household coordination MVP. Do not attempt full HomePlus, full Geni, real-time sync, SOS, HomeCloud, Assets, or complete Finance.

The grading story should be:

\> "HomePlus has a stable foundation and delivers the core household coordination loop today. The architecture preserves household isolation, roles, and extensibility for the broader documented vision, while intentionally postponing high-risk domains that cannot be responsibly delivered in two weeks."

This is the highest-quality delivery strategy under the deadline.

