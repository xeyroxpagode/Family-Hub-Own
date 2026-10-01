# M11 - 11A.P1B Home Research

**MILESTONE:** Planner V1 - 11A.P1 External Comparative Product Research
**WORKTREE:** `C:\Users\thega\Desktop\HomePlus-worktrees\qa`
**BRANCH:** `planner-v1-11a-p1-home-research`
**BASE:** `1b5dea24f5c0ddfb3b5163dd77be095b05f90876`
**DATE:** 2026-08-02
**SCOPE:** Research only. No code, contracts, backend, navigation, UI, styles, Supabase, package, lockfile, Product Freeze, or P2 implementation changes.

---

## 1. Executive Summary

This report compares external Home patterns to clarify what HomePlus Home should help a person understand and do during the first seconds after opening the app.

The strongest finding is that Home should not be treated as a miniature version of every module. Strong Home experiences do four things quickly: orient the user, surface what needs attention, preserve continuity, and provide safe entry points into canonical module flows. They avoid duplicating deep module details, forms, destructive actions, and long activity streams.

For HomePlus, the current internal baseline matters:

- Home is the primary entry surface.
- Planner has high maturity and already contributes a Home summary.
- Inventory works, but has lower maturity and only contributes a limited urgency signal.
- There is no global Attention surface.
- There is no global Activity frontend.
- There is no global Search.
- Geni is future and should not be assumed as implemented.
- Home must not duplicate Planner or Inventory.

The provisional conclusion is that HomePlus should discuss a hybrid Home: stable household orientation plus a short priority/attention layer plus limited module entry points. It should not become a feed-first surface or a dashboard full of decorative metrics. Search and Quick Actions should be visible but conceptually separate: Search retrieves existing content; Quick Actions starts canonical creation or future assistant flows; Home summarizes and routes.

**RECOMENDACION PROVISIONAL PARA DISCUSION:** prefer a Home hibrida de prioridades: a stable top area, a short personal/shared priority section, one upcoming timeline excerpt, limited Inventory urgency, and module gateways. Keep Attention and Activity as future explicit surfaces rather than forcing all alerts and all history into Home.

This is not a Product Freeze. The output is a decision aid for later product choices.

---

## 2. Baseline HomePlus

Sources read first:

- `docs/implementation/planner/M11_11A_P0_CURRENT_CAPABILITIES_INVENTORY.md`
- `docs/implementation/planner/M11_11A_P1A_QUICK_ACTIONS_SEARCH_RESEARCH.md`

Verified internal facts used as baseline:

- Home is the main entry point of HomePlus.
- Planner maturity is high: Tasks, Events, Plans, Presets, Drafts, Calendar, Details, SheetHost, Trash, and Reliability runtime exist.
- Inventory is functional but less mature: one screen, categories, local search, templates, quantity mutations, low/out-of-stock alerts, restock requests, basic client-side role treatment.
- Home already consumes `GET /api/planner/summary` through `useHomePlannerSummary`.
- Home already shows a limited Inventory urgency card via `getInventoryAlerts`.
- No global Attention center exists.
- No global Activity frontend exists, even though Planner has a backend activity endpoint.
- No global Search exists; Planner Search is only a gated placeholder and Inventory has local in-screen search.
- Geni is future and not implemented.
- Home should not duplicate canonical Planner or Inventory surfaces.

Current Home implementation observed:

- `HomeScreen` is role-dispatched from `front/mi-front-limpio/navigation/HomeTabNavigator.tsx`.
- Role variants render `HomePlannerSections` as the central shared block.
- `HomePlannerSections` currently orders content as Inventory urgency, error/attention count, goal, tasks, events, and partial errors.
- Tasks show up to three items and have a one-tap completion path in Home.
- Events show up to three upcoming items.
- Inventory urgency appears only when urgent counts exist and navigates to Inventory.

Interpretation:

- The current structure is not assumed final.
- The current implementation demonstrates that Planner can feed Home safely, but it also shows the main product risk: Home can become Planner-first by accident.
- Inventory can provide urgent signals, but its lower maturity argues against making Home depend on rich Inventory actions now.

---

## 3. Metodologia

Research date: 2026-08-02.

Source priority:

1. Official documentation and help centers.
2. Official product sites.
3. App Store / Play Store when official pages were inaccessible.
4. Official design/platform guidance.
5. Recognized UX analysis only as support, not as primary evidence.

Evidence rules:

- Claims are pattern-level and tied to public sources in the bibliography.
- No complete external interface is copied.
- Blocked, JS-rendered, 404, or sunset products are explicitly marked as limited evidence.
- Internal HomePlus facts come from P0/P1A and current code inspection, not external inference.
- The report evaluates product principles, not implementation contracts.

Research sample:

- Family and home organization: FamilyWall, Cozi, Maple, OurHome, Family Tools, Google Home, Apple Home, Google Family Link, Microsoft Family Safety.
- Productivity and collaboration: Todoist, TickTick, Microsoft To Do, Asana, Notion, Trello, ClickUp, Google Calendar.
- Other strong Home references: Chase Mobile, Apple Health, Apple Fitness, Duolingo, iOS Spotlight/Home Screen, Google Search, smart home control surfaces.

---

## 4. Aplicaciones y Fuentes

### 4.1 Family and Household Apps

| Reference | Source quality | Home-relevant pattern | Transferable principle |
|---|---|---|---|
| FamilyWall | Official site | Family dashboard combines calendar, lists, meal planning, location, messaging, photos, budget | A household Home can be multi-module, but each module needs boundaries. |
| Cozi | Official site | `Cozi Today` gives agenda and reminders at a glance, while calendar/lists/recipes remain module areas | A daily at-a-glance Home works better than exposing every list item. |
| Maple | Official site, sunset notice | Family organization and mental load framing; product sunsets Dec 31, 2026 | Strong mission language is not enough; continuity/export and trust matter. |
| OurHome | Official web access failed in this run | Chores/rewards/home organization app category only | Evidence limited; do not rely on detailed UI claims. |
| Family Tools | Official site | Dashboard, chores, homework, todos, calendar, lists, plans, meals, rewards | Family apps often combine stable module launcher with daily reminders/progress. |
| Google Home | Official help center | Home/rooms/devices; setup via Add; device control remains contextual | Setup can be global; object control must stay contextual. |
| Apple Home | Official user guide | Homes, rooms, accessories, scenes, automations; multiple homes and member invites | Home state is organized by context and permissions, not by one giant feed. |
| Google Family Link | Official help center | Child/member-specific management: screen time, apps, location, permissions | Permission-heavy actions belong near the person/entity target. |
| Microsoft Family Safety | Official support | Family group, organizer/member roles, activity reporting, screen time, restrictions | Role and privacy models must shape what Home shows per user. |

### 4.2 Productivity and Collaboration Apps

| Reference | Source quality | Home-relevant pattern | Transferable principle |
|---|---|---|---|
| Todoist | Official help | Quick Add, Dynamic Add, task completion, task views | One dominant action works in single-domain apps; HomePlus has multiple domains. |
| TickTick | Official features site | Quick capture, filters, calendar, agenda, reminders, habits, Pomodoro | Home can combine capture + today + habit signals, but risks overload. |
| Microsoft To Do | Official support | My Day for daily focus, lists and tasks separate | Daily focus is a strong Home pattern when task scope is personal. |
| Asana | Official site/help access blocked by JS in this run | My Tasks/dashboard category only | Evidence limited; rely only on general collaboration patterns. |
| Notion | Official help center | Search/help categories, workspace navigation, AI/search separation | Complex workspaces need search/recents; do not force all content into Home. |
| Trello | Official guide | Boards, Inbox, Planner, templates, automation, views | Capture and planning are separate from board-level details. |
| ClickUp | Official features site | Home as personalized start page with My Work, reminders, recent activity; Inbox for attention | Mature work apps separate Home, Inbox/Attention, Activity, Search, and module views. |
| Google Calendar | Official support referenced in P1A | Calendar search, events, tasks, reminders, multiple calendars | Time-based content is useful on Home, but the calendar remains canonical. |

### 4.3 Other Strong Home References

| Reference | Category | Home-relevant pattern | Transferable principle |
|---|---|---|---|
| Chase Mobile | Banking | Account status, fraud/security, card lock, pay/transfer, offers, budget tools | Home should prioritize trust, status, urgent risk, and safe primary actions. |
| Apple Health | Health | Health data categories, trends, highlights, privacy-sensitive data | Sensitive personal data should be summarized carefully and not shared by default. |
| Apple Fitness | Fitness | Activity summary, rings/progress, workouts | Progress metrics work when they are motivating and directly tied to action. |
| Duolingo | Learning | Habit/streak/category reference; official page minimal in fetch | Learning Home often prioritizes next action and continuity over full dashboard. |
| iOS Spotlight/Home Screen | OS | Search, widgets, quick actions, recents | System surfaces keep retrieval and app entry predictable. |
| Google Search | Search platform | Search as a dedicated retrieval surface with filters/history/privacy | Search should not be buried inside Home cards or Quick Actions. |

---

## 5. Modelos de Home

### 5.1 Central Question

What does a person need to understand and be able to do during the first seconds after opening HomePlus?

They need to understand:

- Which household they are in.
- Whether anything needs immediate attention.
- What is next today or soon.
- What is personally relevant to them versus shared household context.
- Where to go if they want to create, search, or open a module.
- Whether the app is current, partially unavailable, or offline/stale.

They need to be able to do:

- Open the most relevant item or canonical module.
- Start safe global creation through Quick Actions.
- Find existing content through Search once global Search exists.
- Complete only very low-risk actions where context and permission are clear.
- Avoid making destructive, approval, or ambiguous mutations without context.

Home does not need to include everything. The stronger responsibility is triage and orientation, not module replacement.

### 5.2 Model A - Dashboard de Modulos

Definition: Home is a set of module cards: Planner, Inventory, People, Feed, future Geni, etc. Each card shows status/counts and an entry button.

| Dimension | Evaluation |
|---|---|
| Ease of comprehension | High if modules are few and labels are clear. |
| Cognitive load | Medium; grows with every module. |
| Above-scroll visibility | Good for 3-4 cards, weak for 6+. |
| Personalization | Can allow hidden/reordered modules later. |
| Stability | High if order is fixed. |
| Scalability | Medium; module sprawl becomes a tile wall. |
| Utility with few data | Good because module access remains useful. |
| Utility with much data | Weak unless cards summarize intelligently. |
| Search relation | Search should remain separate, possibly top affordance. |
| Attention relation | Attention becomes a module/card unless separate route exists. |
| Activity relation | Activity can be a card but not a feed. |
| Duplication risk | Medium; each card may duplicate module summaries. |
| Technical cost | Low-medium if cards use existing summaries. |

Best use: early product with few modules. Risk: Home looks organized but does not answer what matters now.

### 5.3 Model B - Home de Prioridades

Definition: Home leads with priority items: `Para mi`, `Para todos`, `Requiere respuesta`, `Proximo`.

| Dimension | Evaluation |
|---|---|
| Ease of comprehension | High if labels are human and counts are small. |
| Cognitive load | Low-medium; needs strict curation. |
| Above-scroll visibility | Strong; can show 1-3 priority items. |
| Personalization | Strong by role/person. |
| Stability | Medium; content changes but structure can stay fixed. |
| Scalability | High if signals are ranked. |
| Utility with few data | Medium; needs good empty states. |
| Utility with much data | High if ranking works. |
| Search relation | Search complements priority by retrieving non-priority content. |
| Attention relation | Strong; Attention can provide the ranked source. |
| Activity relation | Activity remains separate except recent relevant changes. |
| Duplication risk | Medium-low if rows open canonical details. |
| Technical cost | Medium-high because ranking and permissions are product logic. |

Best use: HomePlus leading direction, once priority policy is defined. Risk: without a global Attention model, priority rules become ad hoc inside Home.

### 5.4 Model C - Home Cronologica

Definition: Home is a time-based agenda: today, next, later, recently missed.

| Dimension | Evaluation |
|---|---|
| Ease of comprehension | High for events/deadlines; lower for non-time items. |
| Cognitive load | Medium; chronological lists can become long. |
| Above-scroll visibility | Strong for `Now/Next/Today`. |
| Personalization | Good by person/household. |
| Stability | Medium; time changes constantly. |
| Scalability | Medium; time-ordered content can bury urgent non-time signals. |
| Utility with few data | Good if it shows empty day well. |
| Utility with much data | Medium; needs grouping and filters. |
| Search relation | Search finds older/non-time items. |
| Attention relation | Attention must override chronology when urgent. |
| Activity relation | Activity should not be mixed with future agenda. |
| Duplication risk | Medium with Planner calendar/tasks. |
| Technical cost | Medium; requires normalized time projection. |

Best use: Planner-heavy households. Risk: Home becomes Calendar Lite.

### 5.5 Model D - Home Accionable

Definition: Home surfaces items with direct buttons: complete, approve, verify, postpone, create.

| Dimension | Evaluation |
|---|---|
| Ease of comprehension | High if only 1-2 obvious actions appear. |
| Cognitive load | High if every card has buttons. |
| Above-scroll visibility | Strong but can become button-heavy. |
| Personalization | Required by permissions. |
| Stability | Medium; actions appear/disappear. |
| Scalability | Low without grouping. |
| Utility with few data | Good if there is one clear action. |
| Utility with much data | Risky; action overload. |
| Search relation | Search should not execute actions. |
| Attention relation | Strong for action queue, better as Attention center. |
| Activity relation | Activity should record outcomes, not be the action place. |
| Duplication risk | High if Home duplicates module mutation flows. |
| Technical cost | High due permissions, reliability, conflicts, undo, offline. |

Best use: narrow safe actions only. Risk: accidental or contextless mutations.

### 5.6 Model E - Home Tipo Feed

Definition: Home is a stream of household activity and updates.

| Dimension | Evaluation |
|---|---|
| Ease of comprehension | Medium; familiar but noisy. |
| Cognitive load | High in active households. |
| Above-scroll visibility | Weak for priority unless ranking is strong. |
| Personalization | Needed to hide irrelevant/private events. |
| Stability | Low; interface shifts constantly. |
| Scalability | High technically, low cognitively. |
| Utility with few data | Weak; empty feed feels dead. |
| Utility with much data | Noisy; important items can be buried. |
| Search relation | Search needed to retrieve feed history. |
| Attention relation | Attention gets diluted if mixed into feed. |
| Activity relation | Direct fit for Activity, not necessarily Home. |
| Duplication risk | Medium; repeats module actions/history. |
| Technical cost | Medium-high; privacy and event normalization. |

Best use: dedicated Activity surface. Risk: Home becomes social feed instead of household command center.

### 5.7 Model F - Home Hibrida

Definition: Home combines stable orientation, short priorities, upcoming timeline, limited module cards, Search, Quick Actions, and future Geni entry without forcing all content into one model.

| Dimension | Evaluation |
|---|---|
| Ease of comprehension | High if hierarchy is strict. |
| Cognitive load | Medium; must cap blocks. |
| Above-scroll visibility | Strong if top area is limited to 3-4 concerns. |
| Personalization | Good by role/person while keeping fixed structure. |
| Stability | High structure, dynamic content. |
| Scalability | High if Attention/Activity/Search become separate surfaces. |
| Utility with few data | Good via module entry and helpful empty states. |
| Utility with much data | Good if Home shows excerpts only. |
| Search relation | Search is visible but not a card swamp. |
| Attention relation | Home shows top Attention excerpt; full queue later. |
| Activity relation | Home shows at most recent important changes; full Activity later. |
| Duplication risk | Medium-low if all rows route to canonical details. |
| Technical cost | Medium; avoids feed/action overload. |

Best use: strongest fit for HomePlus discussion. Risk: ambiguous product policy if every team adds one more card.

---

## 6. Personal vs Household

HomePlus needs a clear distinction between personal relevance and household state.

### 6.1 Label Vocabulary

| Label | Meaning | Home fit |
|---|---|---|
| `Para mi` | Private or personally assigned/relevant items | Strong top-level filter/section. |
| `Para todos` | Shared household information not owned by one person | Strong secondary section. |
| `Asignado a mi` | Work expected from current user | Strong if Planner supports assignee clarity. |
| `Creado por mi` | Ownership/history metadata | Better in details/search/activity, not Home default. |
| `Requiere mi respuesta` | Approvals, verification, invitations, corrections | Strong Attention candidate. |
| `Estado del hogar` | Aggregate household state | Good as compact status, not as many metrics. |
| `Privado` | Current-user only | Must be explicitly labelled if mixed with household content. |
| `De otros miembros` | Visible but not assigned to current user | Useful if it affects household, but should not imply responsibility. |

### 6.2 Household Cases

Single-person household:

- Home can simplify by reducing `shared` language.
- Inventory and Planner summaries remain useful.
- Empty states should not imply missing family members.

Large household:

- Home must avoid showing every member's tasks.
- Use excerpts, counts, and `View all` routes.
- Personal relevance must be first; household state second.

Coordinator:

- Needs household overview, exceptions, approvals, blocked items.
- Should not see private personal details unless authorized.
- May need more Attention signal than a regular adult.

Adult:

- Needs personal assignments, household next events, and relevant inventory signals.
- Should not receive admin-only approval controls unless allowed.

Minor/integrante menor:

- Needs assigned chores/tasks, next events, rewards/progress if product supports it.
- Should not see private adult information, financial data, or full household admin activity.

Household switch:

- Home must make the active household unmistakable.
- Recents, Search, Activity, and Attention must be scoped per household before display.

Permissions and privacy:

- Permission filtering must occur before ranking.
- Hidden/private data should not leak through counts, snippets, notification copy, recents, or empty states.
- If role-based content changes Home, the structure should remain predictable enough that users do not feel the app is rearranging itself randomly.

---

## 7. Planner e Inventario

### 7.1 Planner Signals

| Signal | Immediate value | Frequency | Urgency | Actionable | Privacy | Repetition risk | Best surface |
|---|---|---:|---:|---|---|---|---|
| Tasks due today | High | Daily | Medium-high | Open/complete if eligible | Depends scope | Medium | Home excerpt + Planner detail |
| Overdue tasks | High | Daily | High | Open/complete/reschedule in module | Depends scope | High | Attention, Home top excerpt |
| Assigned to me | High | Daily | Medium | Open/complete | Personal | Medium | Home `Para mi` |
| Awaiting verification | High for verifier | Weekly | High | Verify/request correction | Role-sensitive | High | Attention first, Home excerpt |
| Events today/next | High | Daily | Medium | Open event/calendar | Household/personal | Low | Home timeline |
| Plans in progress | Medium | Weekly | Low-medium | Open Plan | Household | Medium | Home module/featured, not every plan |
| Plan blocked/risk | High | Occasional | High | Open Plan details | Household | Medium | Attention/Home exception |
| Due milestones | Medium-high | Weekly | Medium | Open Plan | Household | Medium | Home only if soon/blocked |
| Daily summary | High | Daily | Medium | Mostly navigation | Mixed | Low | Home primary content |
| Draft recovery | Medium | Rare | Medium | Resume | Private | Low | Planner/drafts, maybe Attention if risk is high |

Planner implication:

- Home should show a curated subset: today/next, assigned to me, verification/overdue exceptions, one meaningful Plan signal.
- Full lists, filters, calendar, Plan structure, Presets, Drafts, Trash, and detailed lifecycle actions remain inside Planner.
- One-tap completion from Home is acceptable only if Reliability/capability/context rules are explicitly safe. Current inventory notes that `completeTaskFromHome` is outside M11.7C productiveMutations, so this remains a risk to discuss.

### 7.2 Inventory Signals

| Signal | Immediate value | Frequency | Urgency | Actionable | Privacy | Repetition risk | Best surface |
|---|---|---:|---:|---|---|---|---|
| Low stock | Medium-high | Daily/weekly | Medium | Open item/module | Household | High | Home compact + Attention if threshold important |
| Out of stock | High | Daily/weekly | High | Open item/module/request restock | Household | High | Home exception + Attention |
| Restock request pending | High for adult/coordinator | Weekly | High | Approve/reject in context | Role-sensitive | Medium | Attention/Inventory, Home excerpt |
| Reposition needed | Medium | Weekly | Medium | Create task/request | Household | Medium | Inventory module, maybe Attention |
| Relevant change | Low-medium | Daily | Low | Mostly view | Household | High | Activity, not Home default |
| Inventory access | Medium | Weekly | Low | Navigate | Household | Low | Module gateway/card |

Inventory implication:

- Home should not become Inventory dashboard.
- Home can show severe Inventory exceptions: out-of-stock, pending restock requests, maybe low-stock count.
- Quantity mutations, approve/reject, delete, edit, and item creation should remain contextual until Inventory has stronger capabilities/reliability/canonical routes.

### 7.3 Surface Assignment Rule

- Belongs to Home if it changes what the user should know or do in the first seconds.
- Belongs to Attention if it requires response, verification, approval, or urgent correction.
- Belongs to Activity if it explains what happened recently.
- Belongs inside module if it requires context, detailed filtering, forms, lifecycle decisions, or repeated browsing.

---

## 8. Jerarquia y Densidad

Strong Home screens are dense enough to be useful and sparse enough to be trusted.

Recommended Home density for HomePlus discussion:

- 1 stable header/orientation area.
- 1 Search affordance if global Search is chosen.
- 1 short priority/attention area with 1-3 items.
- 1 upcoming/today area with 1-3 items.
- 1 compact Inventory exception only when meaningful.
- 2-4 module shortcuts/cards at most.
- Optional recent activity teaser only if globally scoped Activity exists.

Cards vs lists:

- Cards work for distinct concepts: Inventory exception, Plan highlight, module gateway.
- Lists work for similar items: tasks, events, requests.
- Too many cards create visual weight without helping decisions.

Sections:

- Use stable sections like `Para mi`, `Hoy`, `Hogar`, `Modulos` rather than module-only card sprawl.
- Avoid many chip rows. Chips are useful for filtering but expensive in vertical space.

`Ver todo`:

- Use for excerpts that have a canonical destination.
- Do not use `Ver todo` as an excuse to put a weak miniature module on Home.

Progressive disclosure:

- Show what changed or what matters first.
- Expand to details only by navigation to canonical surfaces, not inline details.

Permanent vs exceptional blocks:

- Permanent: orientation, Search if chosen, Quick Actions access, today's/next priority, module entry.
- Exceptional: out-of-stock, verification queue, offline/stale, partial error, blocked Plan.

Metrics:

- Avoid decorative totals such as `12 tasks, 4 events` unless they drive action.
- Metrics are useful when connected to clear interpretation: `2 requieren respuesta`, `1 sin stock`, `proximo evento en 30 min`.

Empty states:

- Empty Home must not feel broken.
- Good empty states say what is true and what the user can do: `Nada urgente`, `Crear tarea`, `Abrir Planner`, `Buscar cuando haya contenido`.

Loading, partial errors, offline:

- Prefer skeletons for stable sections.
- Partial failures should isolate affected sections, not collapse all Home.
- Offline/stale state should show the timestamp and safe read-only content.

Risks:

- Too many cards make Home decorative and slow.
- Metrics without decisions create false productivity.
- Duplicating Planner/Inventory erodes module clarity.
- Many simultaneous alerts make everything less urgent.
- A visually attractive but low-signal Home becomes ignored.
- A too-empty Home makes the app feel immature.

---

## 9. Temporalidad

Home should vary by context, but not become unstable.

Stable structure:

- Household header/switch context.
- Search entry if selected.
- Priority/attention section location.
- Today/upcoming section location.
- Module entry location.

Dynamic content:

- Morning: today summary, upcoming events, assigned tasks.
- Afternoon/evening: overdue items, remaining tasks, dinner/meal if module exists later.
- Near event: upcoming event moves up.
- Deadline approaching: task/verification/plan risk moves up.
- Inventory exception: out-of-stock appears above low-stock.

Exceptional alerts:

- Permission-sensitive approvals.
- Offline/stale data.
- Partial module failure.
- Conflicts or reliability uncertainty if surfaced globally later.

Predictable personalization:

- Role affects content eligibility.
- Household affects all results.
- Recent use can inform suggestions, but should not reorder primary sections automatically.

Unstable personalization to avoid:

- Opaque AI ranking before users understand Home.
- Reordering whole sections every open.
- Mixing private and household data without labels.
- Showing content from a previous household after switch.

---

## 10. Acciones

Home should allow actions only when the action is safe, clear, reversible or reliable, and does not need the full module context.

Action evaluation:

| Action | Home fit | Reason |
|---|---|---|
| Open entity | Strong | Safe; routes to canonical detail. |
| Complete task | Conditional | Good only if eligibility, state, rollback/reliability, and context are clear. |
| Verify | Weak for Home, strong for Attention | Needs context and role clarity. |
| Approve restock | Weak for Home, strong for Attention/Inventory | Creates downstream task and needs request context. |
| Reject/restock dismiss | Weak | Can be mistaken and may need reason/context. |
| Postpone | Weak-medium | Needs scheduling context; better in detail/Attention. |
| Mark as read | Possible later | Good for Attention/Activity, not core Home. |
| Navigate to module | Strong | Safe and clear. |
| Create something | Strong via Quick Actions | Use canonical forms/host. |
| Delete/cancel/archive | Not Home | Lifecycle/destructive actions need module/detail context. |

Preserve canonical flows:

- Details stay in Task/Event/Plan/Inventory canonical routes.
- Forms stay in canonical hosts/routes.
- Mutations that require Reliability, permissions, conflict handling, or context should not be recreated in Home.

Design implications:

- Limit buttons per block.
- Prefer row tap to open detail plus one optional safe action.
- Avoid multi-button cards where labels compete.
- Show disabled actions only when there is space to explain why; otherwise hide capability-gated actions.

---

## 11. Accesibilidad

Home is the first screen, so accessibility failures here are product-critical.

Screen reader:

- Reading order should match visual priority: household, search, urgent/priority, today, modules.
- Counts need semantic labels: `2 tareas requieren respuesta`, not just `2`.
- Cards must announce role/action: `Abrir tarea Comprar leche`, `Abrir inventario`.

Dynamic Type:

- Cards and rows must grow vertically.
- Do not rely on two-column dense layouts on small phones.
- Important nouns must not truncate before the distinguishing word.

Contrast and color:

- Alert severity must not be color-only.
- Use text labels, icons, and accessible contrast.

Touch and focus:

- Entire actionable rows/cards should meet platform touch target expectations.
- Keyboard focus order should be stable and visible.
- Tablet and external keyboard flows should not trap focus in horizontal lists.

Reduce Motion:

- Refresh, skeleton, and card animations should be non-essential.
- Urgency should not depend on motion.

Responsive:

- Small phone: single column, strict top priority, few rows.
- Large phone: same hierarchy, more breathing room.
- Tablet: two-column layout possible, but left column should retain priority sequence; secondary modules can sit right.
- Orientation changes should not reorder meaning unpredictably.

Offline and errors:

- Screen readers should hear stale/offline state before stale content.
- Partial errors should identify affected section and available next step.

---

## 12. Alternativas

### Alternative 1 - Home de Prioridades Personales y Hogar

**Responsibility:** Tell the user what matters now: personal responsibilities first, then shared household state.

**Structure and order:** household header, Search, `Para mi`, `Para todos`, upcoming, Inventory exception, module shortcuts.

**Blocks:** `Para mi` tasks/verification, `Para todos` shared next event or household issue, `Proximo`, Inventory urgency if any, module gateways.

**Personal/household:** explicit split. Personal data is labelled and scoped; household state is shared.

**Planner:** tasks due/assigned, next events, one Plan risk/highlight.

**Inventory:** only out-of-stock/low-stock/restock exceptions.

**Search:** visible Home/header search entry.

**Quick Actions:** existing center `+` for create task/event/plan; future Geni separate or fourth action.

**Attention:** Home shows top 1-3 attention items; full Attention later.

**Activity:** not central; maybe one `Actividad reciente` teaser after full Activity exists.

**Geni growth:** future assistant can explain priorities or propose actions, but not replace Search.

**Phone:** single column.

**Tablet:** priorities left, modules/upcoming right.

Advantages:

- Directly answers first-seconds question.
- Good balance of personal and household.
- Avoids feed noise.

Disadvantages:

- Needs priority policy.
- Needs careful empty states.

Risks:

- If priority ranking is weak, users will distrust Home.
- If Attention does not exist, Home may accumulate too many alert rules.

Wireframe:

```text
HomePlus / Casa Rodriguez              Buscar

Para mi
! Verificar: Tarea lista para revision
- Hoy: Comprar leche                   Abrir

Para todos
- Proximo: Pediatra 16:30              Calendario

Inventario
! 1 producto sin stock                 Abrir inventario

Modulos
[Planner] [Inventario] [Personas] [Mas]
```

### Alternative 2 - Home Hoy + Proximo

**Responsibility:** Give a stable day agenda and near-future continuity.

**Structure and order:** header, Search, `Ahora/Proximo`, `Hoy`, tasks, events, Inventory exceptions, modules.

**Blocks:** next event, today's assigned tasks, later today, tomorrow preview.

**Personal/household:** timeline rows labelled with assignee/scope.

**Planner:** strongest source: tasks/events/Plans with dates.

**Inventory:** only if urgent, since it is not naturally chronological unless request/due exists.

**Search:** visible; retrieves non-today content.

**Quick Actions:** create through canonical Quick Actions.

**Attention:** urgent overdue/verification can override the top timeline.

**Activity:** separate; do not mix past activity with upcoming agenda.

**Geni growth:** future `Planificar mi dia` suggestion possible.

**Phone:** compact vertical agenda.

**Tablet:** day column plus household status column.

Advantages:

- Easy to understand.
- Works well with mature Planner.
- Useful every day.

Disadvantages:

- Can underrepresent Inventory and non-dated household work.
- Risks becoming Calendar Lite.

Risks:

- Urgent non-time alerts can be buried if chronology dominates.

Wireframe:

```text
HomePlus / Casa Rodriguez              Buscar

Ahora
16:30 Pediatra                         Abrir evento

Hoy
[ ] Comprar leche       Para mi        Completar
[ ] Revisar tarea       Requiere tu respuesta

Luego
- Plan: Mudanza tiene 1 bloqueo        Abrir plan

Inventario
Sin alertas criticas                   Abrir
```

### Alternative 3 - Dashboard Modular Controlado

**Responsibility:** Orient users to modules and give small status summaries.

**Structure and order:** header, Search, alert strip, module cards.

**Blocks:** Planner card, Inventory card, People card, future Activity/Attention cards.

**Personal/household:** module cards include personal/shared mini-counts.

**Planner:** summary counts + next task/event.

**Inventory:** stock status + pending requests.

**Search:** top-level bar or icon.

**Quick Actions:** center `+` remains creation.

**Attention:** separate card if product chooses dedicated center.

**Activity:** separate card/teaser, not feed.

**Geni growth:** Geni card or action, but avoid making it a module duplicate.

**Phone:** 1-column cards.

**Tablet:** 2-column cards.

Advantages:

- Low conceptual risk.
- Good with few data.
- Lower initial technical cost.

Disadvantages:

- Less helpful for `what matters now`.
- Can become decorative metrics.

Risks:

- Every module asks for a card; Home becomes a tile wall.

Wireframe:

```text
HomePlus / Casa Rodriguez              Buscar

Atencion
2 cosas requieren respuesta            Ver

[Planner]
3 tareas hoy / 1 evento proximo        Abrir

[Inventario]
1 sin stock / 2 bajos                  Abrir

[Personas]
4 miembros                             Abrir
```

### Alternative 4 - Home Hibrida con Attention Ligera

**Responsibility:** Combine stable orientation, top attention, next context, and module gateways without becoming feed or module dashboard.

**Structure and order:** header, Search, top Attention excerpt, Today/Next, Planner summary, Inventory exception, module gateways, optional recent activity teaser.

**Blocks:** `Requiere atencion`, `Hoy`, `Continuar`, `Hogar`, `Modulos`.

**Personal/household:** each block can mix personal/shared with labels; top priority remains current-user relevance.

**Planner:** tasks/events/Plans as curated excerpts.

**Inventory:** exception-only.

**Search:** top entry; results open canonical details.

**Quick Actions:** separate `+` creation. Do not turn Home into action menu.

**Attention:** Home excerpt now; dedicated Attention later.

**Activity:** at most recent important change; dedicated Activity later.

**Geni growth:** future assistant can sit near Search or Quick Actions as distinct entry.

**Phone:** single column, maximum 4 meaningful blocks before module gateways.

**Tablet:** main column priorities/today, side column household/module state.

Advantages:

- Best balance for current HomePlus.
- Lets Planner lead by maturity without making Home Planner-only.
- Supports future Search, Attention, Activity, Geni.

Disadvantages:

- Requires strict product governance on which blocks qualify.
- Slightly higher design complexity than pure dashboard.

Risks:

- Can degrade into all models at once if not capped.

Wireframe:

```text
HomePlus / Casa Rodriguez              Buscar

Requiere atencion
! Verificar tarea de Ana                Revisar
! Sin stock: leche                      Inventario

Hoy
16:30 Pediatra                          Abrir
[ ] Comprar leche       Para mi         Completar

Continuar
Plan Mudanza: 62% / 1 bloqueo           Abrir plan

Modulos
[Planner] [Inventario] [Personas] [Mas]
```

---

## 13. Recomendacion Provisional

**RECOMENDACION PROVISIONAL PARA DISCUSION**

Use Alternative 4 as the leading discussion direction: Home hibrida con Attention ligera.

Provisional product stance:

- Home should answer `what matters now`, not `everything in HomePlus`.
- Keep a stable skeleton: household/header, Search if selected, Attention excerpt, Today/Next, limited continuity, module gateways.
- Treat Planner as the richest data contributor today, but do not make Home a Planner duplicate.
- Treat Inventory as exception/status contributor until its maturity improves.
- Keep Quick Actions separate from Home content.
- Keep Search separate from Home ranking and future Geni.
- Reserve Activity for a dedicated surface; Home may show only a small teaser later.
- Avoid decorative metrics and excess cards.
- Preserve canonical details, forms, and mutations.

Why this recommendation is provisional:

- It depends on product decisions about Attention, Search, role privacy, and one-tap Home actions.
- It has not been validated by user testing.
- It does not define implementation contracts or navigation.

---

## 14. Decisiones Para El Usuario

### DECISION HOME-01 - Responsabilidad principal

A. Dashboard de modulos.
B. Prioridades personales.
C. Linea temporal.
D. Modelo hibrido.

Recommendation provisional: D.

Consequences:

- A is easiest but can be less useful.
- B is useful but needs ranking policy.
- C is clear but can duplicate Calendar/Planner.
- D balances current needs but needs governance.

### DECISION HOME-02 - Top hierarchy

A. Search first.
B. Attention first.
C. Today/Next first.
D. Module cards first.

Recommendation provisional: B after household/header, with Search visible in header/top.

Consequences:

- A makes retrieval central but may underplay urgent work.
- B answers what matters now.
- C is strongest for calendar-oriented homes.
- D is stable but less action-guiding.

### DECISION HOME-03 - Personal vs household split

A. Separate sections: `Para mi` and `Hogar`.
B. Mixed list with labels.
C. Household-first only.
D. Personal-first only.

Recommendation provisional: A for clarity, with labelled mixed rows where space is tight.

Consequences:

- A is clear but takes space.
- B is compact but requires excellent labels.
- C misses personal responsibility.
- D misses household coordination.

### DECISION HOME-04 - Planner presence

A. Full Planner mini-dashboard.
B. Curated Planner excerpts only.
C. Planner module card only.
D. No Planner content on Home.

Recommendation provisional: B.

Consequences:

- A duplicates Planner.
- B leverages maturity safely.
- C is low cost but underuses existing summary.
- D ignores the strongest current module.

### DECISION HOME-05 - Inventory presence

A. Exception-only alerts.
B. Inventory dashboard card always.
C. Full item list excerpt.
D. No Inventory on Home.

Recommendation provisional: A.

Consequences:

- A matches current maturity and urgency value.
- B may be acceptable later but risks weak metrics.
- C duplicates Inventory.
- D hides household stock risk.

### DECISION HOME-06 - Actions from Home

A. Open only.
B. Open plus safe complete.
C. Include approvals/verification.
D. Include full mutations.

Recommendation provisional: B only where reliability/context is proven; otherwise A.

Consequences:

- A is safest.
- B adds utility but needs robust guards.
- C belongs better in Attention.
- D duplicates modules and increases risk.

### DECISION HOME-07 - Activity relationship

A. No Activity on Home.
B. One recent important teaser.
C. Feed section on Home.
D. Home is Activity feed.

Recommendation provisional: B only after global Activity exists; A until then.

Consequences:

- A avoids noise now.
- B gives continuity with low noise.
- C can be useful but pushes Home downward.
- D is noisy and weak for first-second priorities.

### DECISION HOME-08 - Attention relationship

A. Dedicated Attention later, Home shows top excerpt.
B. Attention only inside Home.
C. Attention only inside modules.
D. No Attention concept.

Recommendation provisional: A.

Consequences:

- A scales and keeps Home focused.
- B overloads Home.
- C fragments urgent work.
- D misses cross-module urgency.

### DECISION HOME-09 - Search placement

A. Visible Home/header search affordance.
B. Header icon only.
C. Search card in Home.
D. No Search on Home.

Recommendation provisional: A if space allows; B as fallback.

Consequences:

- A is discoverable.
- B is compact.
- C wastes card space and may look like a module.
- D keeps current discoverability problem.

### DECISION HOME-10 - Geni growth path

A. Future distinct global action.
B. Future Home block.
C. Future Search replacement.
D. Hidden contextual only.

Recommendation provisional: A, with optional Home suggestions later.

Consequences:

- A preserves Search and Quick Actions boundaries.
- B can be useful later but should not ship as placeholder.
- C blurs retrieval and reasoning.
- D fails global assistant expectation.

---

## 15. Limitaciones

- No live user testing was conducted.
- No telemetry was available for current Home usage.
- No prototype or accessibility audit was performed.
- Some external pages were blocked, JS-rendered, or inaccessible; Asana and OurHome evidence is therefore limited.
- Maple is a valid family-organization reference but is sunsetting on December 31, 2026, so it should not be treated as a current long-term product model.
- Apple support pages fetched large table-of-contents-heavy content; conclusions are limited to documented Health, Fitness, Search, Home, accessibility, and app navigation concepts.
- This report does not define data contracts, navigation contracts, schema, APIs, ranking algorithms, or UI implementation.
- The qa worktree had pre-existing untracked files during continuation; this report does not touch them.

---

## 16. Bibliografia

All sources consulted on 2026-08-02 unless noted otherwise.

- FamilyWall official site: https://familywall.com
- Cozi feature overview and Cozi Today: https://www.cozi.com/feature-overview/
- Maple official sunset notice: https://www.growmaple.com/
- Family Tools official site and dashboard/rewards: https://familytoolsapp.com/
- Google Home/Nest Help, connect smart home devices and manage rooms/devices: https://support.google.com/googlenest/answer/9159862
- Apple iPhone User Guide, Intro to Home: https://support.apple.com/guide/iphone/intro-to-home-iph22d98bbca/ios
- Google Family Link Help, get started, screen time, app permissions, location: https://support.google.com/families/answer/7101025
- Microsoft Family Safety Support, setup, roles, limits, activity reporting: https://support.microsoft.com/en-us/account-billing/getting-started-with-microsoft-family-safety-b6280c9d-38d7-82ff-0e4f-a6cb7e659344
- Todoist Help, Introduction to tasks, Quick Add, completion: https://todoist.com/help/articles/introduction-to-tasks
- TickTick official features: https://ticktick.com/about/features
- Microsoft To Do help and learning, My Day, lists, tasks: https://support.microsoft.com/en-us/todo
- Notion Help Center: https://www.notion.com/help/guides
- Trello official guide: https://trello.com/guide
- ClickUp official features, Home, My Tasks, Inbox, dashboards, permissions: https://clickup.com/features
- Chase Mobile Banking official page: https://www.chase.com/digital/mobile-banking
- Apple iPhone User Guide, Search with Spotlight: https://support.apple.com/guide/iphone/search-on-iphone-iph3c511548/ios
- Apple iPhone User Guide, View your data in Health: https://support.apple.com/guide/iphone/view-your-health-data-iphe3d379c32/ios
- Apple iPhone User Guide, See your activity summary in Fitness: https://support.apple.com/guide/iphone/see-your-activity-summary-iph4c34a8a95/ios
- Google Search Help references from P1A: https://support.google.com/websearch
- Google Calendar Help references from P1A: https://support.google.com/calendar
- Material Design 3 Search/FAB references from P1A: https://m3.material.io/components/search/overview and https://m3.material.io/components/floating-action-button/overview

---

HANDOFF PARA CONTROL GENERAL

LANE: Planner V1 - 11A.P1B Home Research
MILESTONE: Planner V1 - 11A.P1 External Comparative Product Research
BRANCH: `planner-v1-11a-p1-home-research`
WORKTREE: `C:\Users\thega\Desktop\HomePlus-worktrees\qa`
BASE: `1b5dea24f5c0ddfb3b5163dd77be095b05f90876`
VERDICT: PLANNER_HOME_RESEARCH_COMPLETE
COMMIT: (pending)
BLOCKERS: Pre-existing untracked files remain in the qa worktree and were not touched.
RISKS: Home can become a Planner duplicate, decorative metric board, or noisy feed if Attention/Activity/Search responsibilities are not decided before implementation.
INTEGRATION REQUESTS: None for this research-only phase.
SUPABASE: No changes.
FILES CHANGED:
- `docs/implementation/planner/M11_11A_P1B_HOME_RESEARCH.md`
NEXT ACTION: User decisions HOME-01 through HOME-10 before any P2 planning or implementation.
