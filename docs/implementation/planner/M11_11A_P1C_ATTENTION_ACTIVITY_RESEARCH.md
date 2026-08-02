# M11 — 11A.P1C Attention & Activity External Comparative Research

**MILESTONE:** Planner V1 — 11A.P1 External Comparative Product Research  
**WORKTREE:** `C:\Users\thega\Desktop\HomePlus-worktrees\events`  
**BRANCH:** `planner-v1-11a-p1-attention-activity-research`  
**BASE P0:** `1b5dea24f5c0ddfb3b5163dd77be095b05f90876`  
**DATE:** 2026-08-02  
**SCOPE:** Research only. No code, contracts, backend, navigation, UI, styles, Supabase, package, or lockfile changes.

---

## 1. Executive Summary

This report compares how leading household, productivity, social, and smart-home applications differentiate and present **Attention** (items requiring human intervention, response, or decision) versus **Activity** (events and changes occurring within the household and its modules).

**Key findings:**

- **Attention** is universally implemented as a **priority inbox / review queue / alert center** — items persist until resolved, increment badges, support dismiss/snooze, and separate critical from informational. It is not a notification log.
- **Activity** is universally a **chronological feed** — grouped by time, person, or entity; shows "who did what on what when"; supports filters, search, unread markers, and "mark all read"; informs by default, does not demand action.
- **Badges** count unresolved Attention items (exact number up to a cap, then "9+"), not total Activity. Reading Activity does not clear Attention badges.
- **Relationship models** split into: separate screens (Asana, Slack, GitHub), tabs in one screen (Notion, Teams), Activity with priority section (Todoist, ClickUp), Attention on Home + Activity separate (Family apps), or unified inbox with types (Gmail, Outlook). Each has trade-offs in noise, navigation, scalability, and privacy.
- **Home previews** show 1–3 urgent Attention items + 3–5 recent Activity items, with "Ver todo" links. Cards persist only when content exists.
- **Privacy** defaults: personal drafts hidden from household Activity; sensitive actions (approvals, financial) require role gate; children's activity visible to coordinators; Geni activity labeled; household switch resets badges.
- **Inline actions**: Attention supports approve/verify/respond/resolve/retry/open-detail/dismiss/snooze; Activity supports open-entity/react/mark-read/filter/follow. Risk/permission/context evaluated per action.
- **Deduplication** principles: collapse rapid bursts on same entity; group by day then entity; keep persistent alerts as single entry until resolved; separate system mutations from human actions.

Four complete HomePlus architectures are proposed with wireframes, trade-offs, and a provisional recommendation.

---

## 2. Baseline HomePlus (from P0)

| Concern | Status |
|---|---|
| Global Attention center | **No** |
| Global Activity dashboard | **No** |
| Planner local attention signals | Yes: task filter `attention` (overdue, awaiting verification, blocked, invalid assignment, uncertain ops) |
| Home attention preview | Yes: "Atención requerida" count card (informational only) |
| Inventory alerts | Yes: low stock, out of stock, pending restock, approval required, actionable inventory issue |
| Planner Activity backend endpoint | Yes: `GET /api/planner/activity` (no frontend consumer) |
| Multi-user, household-scoped | Yes |
| Geni | Future, not implemented |

**Signals to evaluate for Attention:**

- Planner: verificación, corrección, RSVP, conflicto, tarea vencida, Plan bloqueado, operación incierta persistente, asignación inválida
- Inventory: bajo stock, sin stock, reposición pendiente, aprobación requerida, problema de inventario accionable

**Signals to evaluate for Activity:**

- Planner: task/event/plan create/edit/complete/verify/cancel/trash/restore, assignment changes, preset/draft actions
- Inventory: item create/edit/delete, quantity add/consume, out-of-stock mark, restock request create/approve/reject
- Future: Geni proposals, confirmations, explanations

---

## 3. External Research Sources

### 3.1 Family / Household Apps (≥5)

| App | Category | Key Patterns Observed | Source |
|---|---|---|---|
| **Google Family Link** | Family management | Permission-heavy; risky actions (screen time, app block, location) stay contextual to child/profile; approvals require parent gate; activity reporting per member | [support.google.com/families/answer/7101025](https://support.google.com/families/answer/7101025) |
| **Microsoft Family Safety** | Family management | Role-based (organizer vs member); activity reports per device/app; limits and restrictions scoped to member; admin actions require context | [support.microsoft.com/.../getting-started-with-microsoft-family-safety](https://support.microsoft.com/en-us/account-billing/getting-started-with-microsoft-family-safety-b6280c9d-38d7-82ff-0e4f-a6cb7e659344) |
| **Cozi** | Family organizer | Module dashboard (Calendar, Lists, Recipes, To-Dos); "Cozi Today" shows day agenda + reminders; no global attention center; each module has own alerts | [cozi.com/feature-overview/](https://www.cozi.com/feature-overview/) |
| **Google Home** | Smart home | Setup/add is global guided flow; control stays contextual (room/device); linked services managed per home; nicknames/rooms for grouping; multi-admin via Matter | [support.google.com/googlenest/answer/9159862](https://support.google.com/googlenest/answer/9159862) |
| **Apple Home** | Smart home | Rooms/scenes/automations reduce complexity; accessory setup global but control contextual; household sharing via Home Hub; secure remote access | [support.apple.com/guide/iphone/intro-to-home-iph22d98bbca/ios](https://support.apple.com/guide/iphone/intro-to-home-iph22d98bbca/ios) |
| **FamilyWall** (marketing) | Family organizer | Combines calendar, lists, meals, location, messaging; dashboard per module; location alerts contextual | familywall.com |

### 3.2 Productivity & Collaboration (≥7)

| App | Category | Key Patterns Observed | Source |
|---|---|---|---|
| **Asana** | Work management | **Inbox** = Attention: tasks assigned, @mentions, status changes, due soon, approvals; persists until "Done"; badges on Inbox tab; "Archive" removes; filters by project/assignee | asana.com/guide/help/inbox |
| **Slack** | Team messaging | **Activity** = Home sidebar: channels, DMs, mentions, reactions, threads; **Mentions & reactions** = Attention (badge on @); unread markers per channel; "Mark all read"; threads collapse | slack.com/help/articles/115003119246 |
| **Notion** | Knowledge/collab | **Updates** = Activity + Attention combined: comments, mentions, page edits, task assignments; tabs: "All", "Assigned to me", "Mentions", "Following"; badge on Updates icon; filters; "Mark all read" | notion.com/help/notifications |
| **ClickUp** | Work management | **Inbox** (Attention): assigned tasks, mentions, reminders, approvals; **Activity** (Feed): all changes grouped by task/list; separate tabs; badges on Inbox; custom filters | clickup.com/help (Inbox/Activity categories) |
| **Todoist** | Task management | **Inbox** (Attention): tasks added, due today, overdue; **Activity Log** (premium): completed, comments, changes; **Quick Find** = search+navigation; karma/streaks for engagement | todoist.com/help/articles/getting-started-with-activity-history |
| **Trello** | Boards/collab | **Notifications** (bell): mentions, card moves, due dates, comments; **Activity** on board/card: chronological changes; badge on bell; "Mark all read"; filter by type | trello.com/guide/notifications |
| **Microsoft Teams** | Collaboration | **Activity** feed: @mentions, replies, reactions, missed calls, app notifications; tabs: "Feed", "My activity"; filters; badge on Activity icon; "Mark all read" | support.microsoft.com/.../activity-feed-in-teams |
| **GitHub** | Developer platform | **Notifications Inbox** (Attention): reasons = mention, review-requested, subscribed, assign, CI failure; triage: Done/Save/Unsubscribe; filters by reason/repo; badge on bell; retention 5 months | [docs.github.com/.../about-notifications](https://docs.github.com/en/account-and-profile/managing-subscriptions-and-notifications-on-github/setting-up-notifications/about-notifications) |

### 3.3 Social Media & Feeds (≥4)

| App | Category | Key Patterns Observed | Source |
|---|---|---|---|
| **Instagram** | Social | **Activity** tab: following/followers activity (likes, comments, follows); **Inbox** (DMs) = Attention; badges on both; "Mark all seen" in DMs | help.instagram.com |
| **TikTok** | Social | **Inbox** = unified: system notifications (live, replies, likes) + messages; tabs: "All", "Messages", "Activities"; badge on Inbox; "Mark all read" | tiktok.com/safety/en-us/activity-center |
| **Facebook** | Social | **Notifications** (bell) = Attention: likes, comments, tags, live, groups; **Activity Log** = personal history (posts, likes, searches); badge on bell; filters | facebook.com/help/212538162109616 |
| **Reddit** | Social | **Inbox** = messages, comment replies, mentions, mod mail; **Notifications** = trending, live, recommendations; badge on Inbox; "Mark all read" | reddit.com/help |

### 3.4 Smart Home, Security, Finance (≥3)

| App | Category | Key Patterns Observed | Source |
|---|---|---|---|
| **Google Home / Nest** | Smart home | Device alerts (offline, battery, motion) → **Home feed** cards; critical alerts (smoke, CO) push + persist; history per device; household sharing; nickname/room grouping | support.google.com/googlenest |
| **Apple Home** | Smart home | **Home** tab: scenes, accessories, automations; **Notifications** for accessory events (motion, door, leak); critical alerts bypass Focus; Secure Video activity timeline | support.apple.com/guide/iphone/intro-to-home |
| **iOS System (Wallet, Find My, Screen Time)** | Platform | **Wallet**: transaction alerts, card issues (Attention); **Find My**: location notifications (Arrival/Departure); **Screen Time**: weekly report (Activity), limit warnings (Attention); badges on Settings/app icons | support.apple.com/guide/iphone/search-on-iphone |

---

## 4. Attention — Deep Analysis

### 4.1 What Attention Is Across Apps

| Pattern | Apps | Description |
|---|---|---|
| **Priority Inbox** | Asana, ClickUp, GitHub, Slack (Mentions), Todoist | Items assigned to you, @mentions, approvals, due/overdue, blockers. Persists until explicit resolution (Done, Archive, Complete, Approve/Reject). |
| **Review Queue** | GitHub (review-requested), ClickUp (approvals), Asana (approvals) | Items needing a decision: approve/reject, verify, merge, sign-off. High urgency, cannot dismiss without action. |
| **Alert Center** | Google Home (critical device alerts), Apple Home (leak/smoke), iOS Wallet (card issues), Family Link (permission requests) | System-critical or safety-related. Often push + persist. Cannot silence permanently. May require coordinator/admin. |
| **Notification Center** | Instagram DMs, TikTok Inbox, Facebook Notifications, Reddit Inbox | Messages, mentions, replies. Can mark read, archive, delete. Badge counts unread. |
| **Badges** | All above | Exact count up to cap (typically 9, 99, or "9+"). Increments on new Attention item. Decrements only on resolution (not on read). |

### 4.2 Decision Framework: What Merits Entry to Attention

| Criterion | Enter Attention | Stay Out (→ Activity only) |
|---|---|---|
| **Requires human decision** (approve, verify, choose, resolve conflict) | ✅ Yes | ❌ No |
| **Blocking / unblocking** (task blocked, plan blocked, uncertain op) | ✅ Yes | ❌ No |
| **Time-critical with consequence** (overdue with SLA, stock-out affecting meal) | ✅ Yes | ❌ No |
| **Assigned to you / @mention / explicit request** | ✅ Yes | ❌ No |
| **Informational change** (someone completed a task, stock changed, event moved) | ❌ No | ✅ Activity |
| **System mutation without human target** (sync, backup, background recompute) | ❌ No | ✅ Activity (if visible) |
| **Already resolved / expired / superseded** | ❌ No (remove) | ✅ History |

### 4.3 HomePlus Signal Evaluation

| Signal | Module | Merits Attention? | Rationale |
|---|---|---|---|
| **Verificación** (task awaiting verification) | Planner | ✅ Yes | Explicit decision required; assigned verifier; blocks completion |
| **Corrección** (task returned for correction) | Planner | ✅ Yes | Assigned to original assignee; requires resubmission |
| **RSVP** (event response needed) | Planner | ✅ Yes | Explicit accept/decline; time-bound; affects planning |
| **Conflicto** (schedule/assignment conflict) | Planner | ✅ Yes | Blocking; requires choice or negotiation |
| **Tarea vencida** (overdue task) | Planner | ⚠️ Conditional | Only if has SLA/consequence or assigned to you; else Activity |
| **Plan bloqueado** (blocked plan/milestone) | Planner | ✅ Yes | Blocks progress; needs resolution or explicit waiver |
| **Operación incierta persistente** (uncertain op > threshold) | Planner | ✅ Yes | Reliability queue item; needs human retry/resolve/discard |
| **Asignación inválida** (assignee left/removed) | Planner | ✅ Yes | Actionable: reassign or unassign |
| **Bajo stock** (below threshold) | Inventory | ⚠️ Conditional | Only if no restock request yet; else request is the Attention item |
| **Sin stock** (out of stock) | Inventory | ✅ Yes | Immediate consequence; needs restock or substitution |
| **Reposición pendiente** (restock request awaiting approval) | Inventory | ✅ Yes | Approval required; creates Planner task on approve |
| **Aprobación requerida** (restock approval) | Inventory | ✅ Yes | Coordinator/adult decision; downstream task creation |
| **Problema de inventario accionable** (e.g., negative qty, template mismatch) | Inventory | ✅ Yes | Data integrity; needs correction |

**Do not auto-promote all Inventory alerts to Attention.** Low-stock without pending request → Activity (informational). Only when it becomes actionable (request created, approval needed, or critical out-of-stock) → Attention.

### 4.4 Attention Behaviors (from research)

| Behavior | Pattern | HomePlus Implication |
|---|---|---|
| **Persists until resolved** | Asana Inbox, GitHub Notifications, ClickUp Inbox | Attention items stay until explicit action (Done, Approve, Complete, Verify, Dismiss-with-reason). Reading ≠ resolving. |
| **Increments badge** | All | Badge = count of unresolved Attention items. Cap at 99 or "99+". |
| **Expires / auto-removes** | GitHub (5 months unsaved), Slack (thread archive), Todoist (karma reset) | Only informational/system items expire. Decision-required items never auto-expire. |
| **Deduplicates** | GitHub (same PR review), Asana (same task multiple signals), ClickUp (same task updates) | Collapse multiple signals on same entity into one entry; show latest state + count of updates. |
| **Silence / snooze** | Asana (snooze), Slack (mute channel), GitHub (unsubscribe) | User can silence per-item or per-source. Silenced items don't increment badge but remain accessible. |
| **Mark as seen / read** | All notification centers | "Seen" ≠ "Resolved". Separate states: unread → read → resolved. |
| **Needs action vs knowledge-only** | Asana (approval vs comment), GitHub (review-requested vs subscribed) | Distinguish: `action_required` (badge increments, persists) vs `info_only` (badge may not increment, auto-expire). |
| **Grouping** | Asana (by project), ClickUp (by list), GitHub (by repo/reason) | Group by module (Planner/Inventory), then by entity, then by reason. |

---

## 5. Activity — Deep Analysis

### 5.1 What Activity Is Across Apps

| Pattern | Apps | Description |
|---|---|---|
| **Chronological Feed** | Slack, Teams, Notion, ClickUp, GitHub (audit log), Trello, Reddit | Reverse-chronological list of "who did what on what when". |
| **Grouped by Time** | Slack (Today, Yesterday, Earlier), Teams, Notion, Facebook Activity Log | Day headers; collapsible. |
| **Grouped by Person** | Instagram Activity, TikTok Inbox, Facebook | "María liked your photo", "Juan commented". |
| **Grouped by Entity** | ClickUp (by task), GitHub (by PR/repo), Trello (by card), Notion (by page) | All changes on one task/page/card together. |
| **System vs Human** | GitHub (CI, bots labeled), ClickUp (automation), Notion (integrations) | System mutations visually distinct (icon, label "Bot", "Automation"). |
| **Comments / Mentions** | All collaboration apps | Inline in feed or expandable thread. |
| **Unread / New markers** | Slack, Teams, Notion, ClickUp, GitHub | Dot or bold for unread; "Mark all read" global or per-group. |
| **Filters & Search** | Notion (by type, person, page), ClickUp (by list, assignee), GitHub (by reason, repo) | Filter by module, person, entity type, date range, action type. |
| **Pagination / Infinite scroll** | All | Load more / cursor-based. Initial load: 20–50 items. |
| **Privacy** | Family apps, Slack (private channels), GitHub (private repos) | Personal drafts hidden; sensitive actions (approvals, financial) role-gated; children's activity visible to coordinators. |

### 5.2 Activity Behaviors (from research)

| Behavior | Pattern | HomePlus Implication |
|---|---|---|
| **Informs, doesn't demand** | All | Default state: read-only. No badge increment for new Activity (unless also Attention). |
| **Global vs per-module** | Slack/Teams (global), ClickUp/Notion (per-workspace + global), Trello (per-board) | HomePlus: global household feed + module-scoped tabs (Planner, Inventory). |
| **Chronological order** | All | Newest first. Day headers. |
| **Grouping** | ClickUp (by task), Notion (by page), GitHub (by repo) | Primary: by day. Secondary: by entity (task/event/plan/item). Tertiary: by person. |
| **Repeated events** | ClickUp, GitHub, Trello | Collapse rapid bursts on same entity: "María updated 'Comprar leche' 3 times · 10 min ago". Expand on tap. |
| **System-generated** | GitHub (CI), ClickUp (automations), Notion (integrations) | Label "Sistema", "Automatización", "Geni". Different icon. Filterable. |
| **Geni-produced** | Notion AI, ClickUp Brain | Labeled "Geni"; shows proposal → confirmation → action. Not mixed with human actions without label. |
| **Initial load** | 20–50 items, last 7–30 days | HomePlus: last 14 days default, "Cargar más" pagination. |
| **Unread / Mark read** | Slack, Teams, Notion, ClickUp | Per-item dot; "Marcar todo como leído" per day or global. |
| **Filters** | Notion (type, person, date), ClickUp (list, assignee), GitHub (reason, repo) | HomePlus: Module (Planner/Inventory), Person, Entity type, Action type, Date range. |
| **Search** | Notion, ClickUp, GitHub | Full-text on entity names, descriptions, comments. |
| **Privacy boundaries** | Family apps, Slack, GitHub | Personal drafts: only owner sees in Activity. Approvals: only coordinators see. Children: coordinators see all. Household switch: feed resets. |

---

## 6. Badges & Unread — Deep Analysis

### 6.1 What a Badge Represents

| App | Badge On | Counts | Cap | Behavior |
|---|---|---|---|---|
| **Asana** | Inbox tab | Unresolved Inbox items (assigned, mentions, approvals, due) | 99+ | Decrements only on "Done"/Archive |
| **Slack** | Workspace icon / @mentions badge | Unread mentions + direct messages | 99+ | Reading DM clears; mention clears on view |
| **GitHub** | Bell icon | Unread notifications (reason: mention, review, assign, CI fail) | 99+ | "Done" removes; "Save" keeps; read ≠ done |
| **Notion** | Updates icon | Unread updates (mentions, comments, assignments) | 99+ | "Mark all read" clears; mentions persist until action |
| **ClickUp** | Inbox icon | Unresolved Inbox items | 99+ | Action required items only |
| **Teams** | Activity icon | Unread activity items (mentions, replies, reactions) | 99+ | "Mark all read" clears |
| **iOS** | App icons / Settings | System-defined (mail, messages, updates) | 99 | App-defined |

### 6.2 HomePlus Badge Model

| Distinction | Definition | Badge Impact |
|---|---|---|
| **Leído** (read) | User opened the item/detail | No badge change for Attention; clears Activity dot |
| **Visto** (seen) | Item appeared on screen (e.g., in Home preview) | No badge change |
| **Resuelto** (resolved) | User took required action (approved, verified, completed, dismissed-with-reason) | **Decrements Attention badge** |
| **Expirado** (expired) | Time-bound item passed without action (e.g., RSVP past event) | Removes from Attention; moves to Activity history |
| **Descartado** (dismissed) | User explicitly dismissed (snoozed, "not relevant") | Removes from Attention; no badge decrement if not resolved |
| **Silenciado** (muted) | User muted source/entity | No new items from source increment badge; existing stay |

**Critical principle:** **Reading ≠ Resolving.** Attention badge counts unresolved items. Activity has no global badge (only per-item "new" dots).

### 6.3 Synchronization & Household Switch

| Scenario | Behavior |
|---|---|
| **Multi-device** | Badge count synced via backend (unresolved count per household+person). Read state synced per item. |
| **Household switch** | Badges recomputed for new household. Personal Attention (drafts, private tasks) follows person. |
| **Duplicate badges** | Single source of truth: backend `attention_count(household_id, person_id)`. Frontend caches, reconciles on focus. |
| **Tab/section badges** | Home tab: total Attention count. Planner tab: Planner Attention count. Inventory tab: Inventory Attention count. More tab: sum of others. |

---

## 7. Attention–Activity Relationship Models

| Model | Apps | Pros | Cons | HomePlus Fit |
|---|---|---|---|---|
| **A. Separate screens** | Asana (Inbox vs Projects), Slack (Mentions vs Activity), GitHub (Notifications vs Audit log) | Clear mental model; distinct badges; no noise bleed; scales independently | Two top-level nav entries; user must check both; Home preview split | ✅ Strong if both are dense |
| **B. One screen, tabs** | Notion (Updates: All/Assigned/Mentions/Following), Teams (Feed/My Activity), ClickUp (Inbox/Activity) | Single nav entry; easy switch; shared filters/search | Tab noise if one is empty; badge only on Attention tab; Activity can feel hidden | ✅ Good for moderate volume |
| **C. Activity with priority section** | Todoist (Inbox + Today), ClickUp (Inbox at top of Activity), Trello (Notifications on board) | One feed; urgent visible first; less navigation | Priority section can dominate; Activity scrolling pushes priority down; badge ambiguity | ⚠️ Risk: Activity noise buries Attention |
| **D. Attention on Home, Activity separate** | Family apps (Cozi Today + module screens), Google Home (Home feed + Device history), Apple Home (Home + accessory history) | Home is actionable dashboard; Activity is deep-dive | Home can clutter; Attention limited to 1–3 items; no global Attention center | ✅ Fits current HomePlus Home card |
| **E. Unified inbox with types** | Gmail (Primary/Social/Promotions), Outlook (Focused/Other), Superhuman (Split) | Single place; type chips/filter; powerful search | Complex mental model; type misclassification; heavy for household app | ❌ Overkill for current scope |

### 7.1 Evaluation Matrix for HomePlus

| Criterion | A: Separate | B: Tabs | C: Priority Section | D: Home + Separate | E: Unified |
|---|---|---|---|---|---|
| **Comprensión** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Ruido** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Badges** | ⭐⭐⭐⭐⭐ (clear) | ⭐⭐⭐⭐ (tab badge) | ⭐⭐ (ambiguous) | ⭐⭐⭐ (Home count) | ⭐⭐ (type chips) |
| **Navegación** | ⭐⭐⭐ (2 taps) | ⭐⭐⭐⭐ (1 tap + tab) | ⭐⭐⭐⭐⭐ (1 screen) | ⭐⭐⭐ (Home + nav) | ⭐⭐⭐⭐ (1 screen) |
| **Escalabilidad** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Privacidad** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Coste técnico** | ⭐⭐⭐ (2 screens) | ⭐⭐⭐⭐ (1 screen, 2 tabs) | ⭐⭐⭐⭐⭐ (1 feed) | ⭐⭐⭐⭐ (Home + 1 screen) | ⭐⭐ (complex feed) |
| **Relación Home** | Preview split | Preview split | Home shows top priority | Home = Attention preview | Home = unified preview |
| **Relación Search** | Separate indexes | Shared index | Shared index | Separate indexes | Shared index |
| **Relación Geni** | Geni → Attention actions | Geni → tab actions | Geni → feed items | Geni → Home cards | Geni → inbox items |

**Provisional lean:** **Model B (Tabs in one screen)** or **Model D (Attention on Home + Activity separate)**. Model B scales better; Model D fits current Home card. Decision in Section 13.

---

## 8. Home — Preview Strategy

### 8.1 What Apps Show on Home / Dashboard

| App | Attention Preview | Activity Preview | Max Items | "Ver todo" |
|---|---|---|---|---|
| **Asana** | My Tasks (due today, overdue) — 3–5 | Recent projects — 3 | 5 | → Inbox / My Tasks |
| **Notion** | Updates badge + 1–2 urgent | Recent pages — 5 | 5 | → Updates / All pages |
| **ClickUp** | Inbox count + 2–3 items | Recent activity — 3 | 5 | → Inbox / Activity |
| **Todoist** | Today / Overdue — 5 | Activity log (premium) — 3 | 5 | → Inbox / Activity |
| **Cozi** | Today agenda (events + due tasks) — 5 | Reminders (new list items) — 3 | 5 | → Calendar / Lists |
| **Google Home** | Critical alerts (smoke, offline) — 1–2 | Device activity — 3 | 3 | → Device / History |
| **Apple Home** | Accessory alerts (leak, motion) — 1–2 | Scenes/automation runs — 3 | 3 | → Accessory / History |

### 8.2 HomePlus Home Preview Proposal

| Section | Content | Max Items | Condition | Navigation |
|---|---|---|---|---|
| **Attention urgente** | Items with `urgency: critical` or `due: today` + assigned to current user | 2 | Only if >0 | → Attention screen (filtered to user) |
| **Atención pendiente** | Count badge + next 1–2 items (verification, approval, conflict, out-of-stock) | 2 | Only if >0 | → Attention screen |
| **Actividad reciente** | Last 3–5 household changes (human + system, grouped by entity) | 5 | Only if >0 | → Activity screen |
| **Sin contenido** | No cards shown | — | When all empty | — |

**No fixed arbitrary counts.** Evidence shows 1–3 urgent + 3–5 recent is the observed range. Cards persist only when content exists.

---

## 9. Privacy & Roles

### 9.1 Visibility Matrix

| Content | Personal (owner) | Household (all adults) | Coordinators | Minors | Geni |
|---|---|---|---|---|---|
| **Personal drafts** (Planner) | ✅ Attention + Activity | ❌ | ❌ | ❌ | ✅ (labeled) |
| **Household tasks/events/plans** | ✅ | ✅ | ✅ | ✅ (assigned only) | ✅ |
| **Inventory items** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Restock approvals** | ❌ | ❌ | ✅ Attention + Activity | ❌ | ✅ (proposal) |
| **Verification/Correction** | ✅ (if assignee/verifier) | ❌ | ✅ (if coordinator) | ❌ | ✅ |
| **RSVP** | ✅ (if invitee) | ✅ (aggregate) | ✅ | ✅ (if invitee) | ✅ |
| **Conflicts/Blocks** | ✅ (if involved) | ❌ | ✅ | ❌ | ✅ |
| **Uncertain ops** | ✅ (if owner) | ❌ | ✅ | ❌ | ✅ (proposal) |
| **System mutations** | ✅ | ✅ (anonymized) | ✅ | ❌ | ✅ (labeled) |
| **Geni actions** | ✅ | ✅ (labeled "Geni") | ✅ | ❌ | N/A |
| **Errors/technical** | ❌ | ❌ | ✅ (ops only) | ❌ | ✅ |

### 9.2 Principles to Avoid "Domestic Surveillance"

1. **Personal ≠ Household.** Drafts, private tasks, personal notes never appear in household Activity/Attention.
2. **Role-gated sensitivity.** Approvals, financial, health (medication stock) visible only to coordinators/adults.
3. **Minor protection.** Children see only their assigned items + shared household items. Coordinators see children's activity; children don't see coordinators' private items.
4. **Geni transparency.** Every Geni-produced item labeled "Geni". User can filter out. Geni never acts without confirmation for mutations.
5. **Household switch = context reset.** Badges, feed, previews recompute for new household. No cross-household leakage.
6. **Identifiers minimized.** Activity shows "María" not "María (ID: 123)". No internal IDs in UI.
7. **Audit ≠ Activity.** Technical logs (login, sync, errors) separate from household Activity. Only coordinators/ops see audit.

---

## 10. Inline Actions

### 10.1 Attention Inline Actions (require evaluation per signal)

| Action | Signals | Risk | Permission | Context Needed | Reliability |
|---|---|---|---|---|---|
| **Aprobar** | Restock request, Plan approval | Medium (creates task) | Coordinator/Adult | Request detail, budget | ✅ Backend mutation |
| **Verificar** | Task verification | Low | Assigned verifier | Task detail, outcome | ✅ Reliability queue |
| **Responder RSVP** | Event RSVP | Low | Invitee | Event detail | ✅ Direct mutation |
| **Resolver conflicto** | Schedule/assignment conflict | Medium | Involved parties + coordinator | Conflict detail, options | ⚠️ Multi-step |
| **Reintentar** | Uncertain operation | Low | Owner | Operation detail | ✅ Reliability queue (retry) |
| **Abrir Detail** | All | None | View access | Entity ID | ✅ Navigation |
| **Descartar** | Low-stock (if restocked externally), RSVP past | Low | Owner/Assignee | Reason optional | ✅ Soft delete |
| **Posponer / Snooze** | Overdue task, verification | Low | Assignee | New due date | ⚠️ Reschedule mutation |

**Rule:** Inline actions only for `action_required` Attention items. `info_only` items → "Abrir Detail" only.

### 10.2 Activity Inline Actions

| Action | Scope | Risk | Permission |
|---|---|---|---|
| **Abrir entidad** | All items | None | View access |
| **Reaccionar** (👍, ❤️, 👀) | Comments, completions | None | Household member |
| **Marcar leído** | Per item / per day / all | None | Owner |
| **Filtrar** | By module, person, entity, date | None | All |
| **Seguir conversación** | Comment threads | None | Participant |

**No inline mutations from Activity.** Activity informs; mutations go through canonical forms or Attention.

---

## 11. Deduplication & Grouping Principles

### 11.1 Attention Deduplication

| Scenario | Principle | Result |
|---|---|---|
| **Múltiples cambios en misma entidad** (task updated 5x in 10 min) | Collapse to single entry; show latest state + "3 actualizaciones más" | One Attention item per entity until resolved |
| **Ráfagas de actividad** (burst of completions) | Group by time window (5 min) + entity; expandable | Reduces noise; preserves chronology |
| **Alerta que persiste** (out-of-stock for 3 days) | Single entry; update timestamp; add "hace 3 días" | Doesn't multiply badge |
| **Operaciones inciertas repetidas** (same op retried 3x) | Single entry; show retry count; "Reintentar" action | One badge increment |
| **Actualización de mismo stock** (qty changed 3x) | Collapse to latest qty; show delta | One entry |

### 11.2 Activity Grouping

| Level | Rule | Example |
|---|---|---|
| **Primary: Day** | Day headers (Hoy, Ayer, Lunes, 15 ago) | Standard chronological feed |
| **Secondary: Entity** | Within day, group all actions on same task/event/item | "Comprar leche: María completó, Juan añadió 2 uds, Sistema repuso" |
| **Tertiary: Person** | Within entity, sub-group by person if >2 actors | "María: completó · Juan: +2 uds · Sistema: repuso" |
| **System vs Human** | System/Automation/Geni visually distinct (icon, label) | "🤖 Geni: propuso reposición" |
| **Collapse threshold** | >3 actions on same entity in 1 hour → collapse with "Ver X cambios" | Prevents feed spam |

**Principle:** Group for readability, never lose auditability. Expandable groups preserve full history.

---

## 12. HomePlus Architectures — 4 Complete Alternatives

### 12.1 Architecture A — Separate Screens (Model A)

```
┌─────────────────────────────────────┐
│  Home                               │
│  ┌─────────────────────────────┐    │
│  │ ⚠️ Atención (2)              │    │
│  │  • Verificar: "Comprar leche" │    │
│  │  • Aprobar: Reposición leche  │    │
│  │  [Ver todo]                   │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ 📋 Actividad reciente (3)    │    │
│  │  • Juan completó "Comprar"   │    │
│  │  • Sistema: stock repuesto   │    │
│  │  • María creó evento "Cena"  │    │
│  │  [Ver todo]                   │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘

Bottom Tabs: [Home] [People] [+] [Planner] [More]
                     ↑
              New Tab: [Attention] [Activity]  (or More → Attention/Activity)
```

| Aspect | Detail |
|---|---|
| **Ubicación** | Two new top-level destinations (bottom tab or More sub-menu) |
| **Pantallas** | `AttentionScreen` + `ActivityScreen` (separate routes) |
| **Home** | Preview cards for both (see above) |
| **Badge** | Home tab: total Attention count. Attention tab: same. Activity tab: no badge (per-item dots). |
| **Attention** | Priority inbox: grouped by module → entity → reason. Filters: module, mine, urgency. Actions inline per §10. |
| **Activity** | Chronological feed: day headers → entity groups → person sub-groups. Filters: module, person, entity type, date. System/Geni labeled. |
| **Filtros** | Shared filter bar (module, person, date) + type-specific (Attention: urgency, status; Activity: action type) |
| **Agrupación** | Attention: by entity (deduped). Activity: day → entity → person. |
| **Acciones** | Attention: approve/verify/respond/resolve/retry/open/dismiss/snooze. Activity: open/react/mark-read/filter/follow. |
| **Privacidad** | Per §9 matrix. Personal drafts only in owner's Attention. |
| **Planner** | Signals → Attention (verification, conflict, block, uncertain, invalid assign, overdue-if-assigned). Activity: all mutations. |
| **Inventario** | Signals → Attention (out-of-stock, approval, actionable issue). Low-stock → Activity unless request pending. Activity: all mutations. |
| **Geni futuro** | Proposals → Attention (action_required). Confirmations → Activity (labeled "Geni"). |
| **Teléfono** | Two tabs or More sub-items. Bottom sheet for inline actions. |
| **Tablet** | Split view: list (left) + detail (right) for both screens. |
| **Ventajas** | Mental model claro; badges sin ambigüedad; escalan independientemente; privacidad simple; Home preview natural. |
| **Desventajas** | Dos entradas navegación; usuario debe revisar dos lugares; coste técnico 2 pantallas. |
| **Riesgos** | Activity puede sentirse "oculto" sin badge; fragmentación si volumen bajo. |

---

### 12.2 Architecture B — One Screen, Tabs (Model B) ★ Provisional Recommendation

```
┌─────────────────────────────────────┐
│  Home                               │
│  ┌─────────────────────────────┐    │
│  │ ⚠️ Atención (2)  📋 Actividad │    │
│  │  • Verificar: "Comprar"       │    │
│  │  • Aprobar: Reposición        │    │
│  │  [Ver todo]                   │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ 📋 Actividad reciente (3)    │    │
│  │  • Juan completó "Comprar"   │    │
│  │  • Sistema: stock repuesto   │    │
│  │  • María creó evento "Cena"  │    │
│  │  [Ver todo]                   │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘

Bottom Tabs: [Home] [People] [+] [Planner] [More]
                     ↑
              More → [Atención y Actividad]  (single route)

Route: /attention-activity
  Tabs: [⚠️ Atención (2)] [📋 Actividad]
```

| Aspect | Detail |
|---|---|
| **Ubicación** | Single route under More (or new bottom tab if promoted) |
| **Pantallas** | `AttentionActivityScreen` with two tabs |
| **Home** | Combined preview card with tab-like header showing both counts |
| **Badge** | More tab / Home: total Attention count. Attention tab: badge. Activity tab: no badge. |
| **Attention** | Tab 1: Priority inbox (same as Arch A). Filter bar shared. |
| **Activity** | Tab 2: Chronological feed (same as Arch A). Filter bar shared. |
| **Filtros** | Shared sticky filter bar: Module (All/Planner/Inventory), Person, Date. Attention adds Urgency/Status. Activity adds Action Type. |
| **Agrupación** | Attention: entity-deduped. Activity: day → entity → person. |
| **Acciones** | Same as Arch A per tab. |
| **Privacidad** | Same as Arch A. |
| **Planner / Inventario / Geni** | Same as Arch A. |
| **Teléfono** | Tab bar at top of screen. Swipe between tabs. Bottom sheet actions. |
| **Tablet** | Side-by-side: tab list (left) + content (right). Or tabs at top, feed below. |
| **Ventajas** | Una sola entrada nav; cambio instantáneo tabs; filtros compartidos; coste 1 pantalla; badge claro en tab Atención; escala bien. |
| **Desventajas** | Activity sin badge puede sentirse secundaria; tab Atención puede dominar visualmente. |
| **Riesgos** | Si Atención vacía, tab parece roto; si Actividad densa, tab Atención se entierra. Mitigación: badge en tab Atención siempre visible. |

---

### 12.3 Architecture C — Attention on Home, Activity Separate (Model D)

```
┌─────────────────────────────────────┐
│  Home                               │
│  ┌─────────────────────────────┐    │
│  │ ⚠️ ATENCIÓN REQUERIDA (2)     │    │
│  │  1. Verificar: "Comprar"     │    │
│  │  2. Aprobar: Reposición      │    │
│  │  [Gestionar todo]             │    │
│  └─────────────────────────────┘    │
│  (Planner cards / Inventory cards)  │
└─────────────────────────────────────┘

Bottom Tabs: [Home] [People] [+] [Planner] [More]
                     ↑
              More → [📋 Actividad]  (single route)

Route: /activity
  Full-screen chronological feed
```

| Aspect | Detail |
|---|---|
| **Ubicación** | Attention = Home section (prominent). Activity = separate route under More. |
| **Pantallas** | Home (enhanced) + `ActivityScreen` |
| **Home** | Attention section = primary actionable area. Persistent if items exist. Max 3 items + "Gestionar todo". |
| **Badge** | Home tab: Attention count. App icon: Attention count. Activity route: no badge. |
| **Attention** | Home section only (no separate screen). Inline actions in Home cards. "Gestionar todo" → modal/sheet with full list. |
| **Activity** | Full-screen feed (same as Arch A/B). |
| **Filtros** | Activity: full filter bar. Home Attention: no filters (top 3 only). |
| **Agrupación** | Home: flat priority list. Activity: day → entity → person. |
| **Acciones** | Home: inline approve/verify/respond/open. Activity: open/react/mark-read/filter. |
| **Privacidad** | Home Attention: only current user's + household critical. Activity: per §9. |
| **Planner / Inventario / Geni** | Same signals. Home shows cross-module top 3. |
| **Teléfono** | Home scroll includes Attention. Activity full screen. |
| **Tablet** | Home: Attention sidebar + main content. Activity: split view. |
| **Ventajas** | Home cumple promesa "dashboard accionable"; Attention visible sin navegar; Activity para quien busca historia; 1.5 pantallas. |
| **Desventajas** | Home puede saturar; Attention limitado a 3 items; "Gestionar todo" abre modal (no pantalla canónica); dos modelos mentales. |
| **Riesgos** | Home se vuelve "otra bandeja"; Attention items >3 requieren modal; mala escalabilidad si módulos crecen. |

---

### 12.4 Architecture D — Unified Inbox with Type Chips (Model E)

```
┌─────────────────────────────────────┐
│  Home                               │
│  ┌─────────────────────────────┐    │
│  │ 📥 Bandeja (2)  [⚠️ Atención] [📋 Actividad] [🤖 Geni] │
│  │  ⚠️ Verificar: "Comprar"      │    │
│  │  📋 Juan completó "Comprar"   │    │
│  │  ⚠️ Aprobar: Reposición       │    │
│  │  [Ver todo]                   │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘

Route: /bandeja
  Unified feed with type chips: [⚠️ Atención] [📋 Actividad] [🤖 Geni] [📦 Inventario] [📅 Planner]
```

| Aspect | Detail |
|---|---|
| **Ubicación** | Single route `/bandeja` (new bottom tab or More) |
| **Pantallas** | `UnifiedInboxScreen` |
| **Home** | Preview shows mixed top items with type chips |
| **Badge** | Home tab: total Attention count (not total inbox). Inbox route: Attention chip shows count. |
| **Attention** | Filtered view: chip `⚠️ Atención` shows only action_required. Inline actions. |
| **Activity** | Filtered view: chip `📋 Actividad` shows all. Read-only. |
| **Filtros** | Chips (type) + Module + Person + Date. Persistent across chips. |
| **Agrupación** | By day → entity → person (same for both types). |
| **Acciones** | Attention items: full inline actions. Activity items: open/react/mark-read. |
| **Privacidad** | Same matrix. Chips respect visibility. |
| **Planner / Inventario / Geni** | Geni gets own chip `🤖 Geni`. Module chips for Planner/Inventory. |
| **Teléfono** | Chip carousel at top. Feed below. |
| **Tablet** | Chip sidebar left. Feed right. |
| **Ventajas** | Máxima flexibilidad; búsqueda unificada; Geni integrado; una sola pantalla. |
| **Desventajas** | Modelo mental complejo; chips ≠ pestañas; badge ambigüo; ruido si chips no filtran bien; sobreingeniería para estado actual. |
| **Riesgos** | Usuarios no entienden diferencia chip Atención/Actividad; Geni compite con Search; coste técnico alto. |

---

### 12.5 Architecture Comparison Summary

| Criterion | A: Separate | B: Tabs ★ | C: Home + Separate | D: Unified |
|---|---|---|---|---|
| **Claridad conceptual** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Ruido en Home** | Bajo | Bajo | Alto | Medio |
| **Badges claros** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Navegación a Atención** | 2 taps | 1 tap + tab | 0 taps (en Home) | 1 tap + chip |
| **Navegación a Actividad** | 2 taps | 1 tap + tab | 2 taps | 1 tap + chip |
| **Escalabilidad módulos** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Coste implementación** | 2 pantallas | 1 pantalla + tabs | 1.5 pantallas | 1 pantalla compleja |
| **Privacidad** | Simple | Simple | Compleja (Home mix) | Compleja |
| **Geni futuro** | Natural | Natural | Home cards | Chip propio |
| **Alineación P0** | Media | **Alta** | Media (Home card existe) | Baja |

**Provisional Recommendation: Architecture B (Tabs in one screen).** Balances clarity, scalability, implementation cost, and badge semantics. Home shows combined preview with "Ver todo" → opens the screen at Attention tab.

---

## 13. Decisions for the User (≤10)

| ID | Decision | Options | Recommendation | Consequences |
|---|---|---|---|---|
| **ATTN-01** | **Superficie principal de Attention** | A. Pantalla dedicada (`/attention`)<br>B. Tab en pantalla compartida (`/attention-activity` → tab Atención)<br>C. Sección en Home + modal "Gestionar todo"<br>D. Chip en bandeja unificada | **B** (Tab en pantalla compartida) | A: +claridad, +nav taps. B: equilibrio, 1 ruta, badge en tab. C: Home saturado, modal no canónico. D: complejidad alta. |
| **ACT-01** | **Modelo de feed de Activity** | A. Pantalla dedicada (`/activity`)<br>B. Tab en pantalla compartida (`/attention-activity` → tab Actividad)<br>C. Solo en módulos (Planner/Inventory)<br>D. Chip en bandeja unificada | **B** (Tab en pantalla compartida) | Misma navegación que Attention; filtros compartidos; sin badge propio. |
| **BADGE-01** | **Qué cuenta en el badge global** | A. Solo Attention sin resolver (action_required)<br>B. Attention + Activity no leídos<br>C. Solo Attention críticas (urgency=critical)<br>D. Conteo por módulo (Planner + Inventory separados) | **A** (Solo Attention sin resolver) | Coherente con Asana/GitHub/ClickUp. Leer Activity no limpia badge. Badge = "cosas que requieren tu decisión". |
| **HOME-ATTN-01** | **Preview de Attention en Home** | A. Top 3 urgentes (assigned to user + critical)<br>B. Conteo + top 1 + "Gestionar todo"<br>C. Solo conteo badge<br>D. Sin preview (solo badge en tab) | **A** (Top 3 urgentes asignadas + críticas) | Evidencia: 1-3 items accionables. Cards solo si hay contenido. "Ver todo" → Attention tab. |
| **HOME-ACT-01** | **Preview de Activity en Home** | A. Últimos 5 cambios household (agrupados por entidad)<br>B. Últimos 3 + "Ver todo"<br>C. Solo si hay Attention = 0<br>D. Sin preview | **A** (Últimos 5 agrupados por entidad) | Informa sin exigir. Agrupación evita ruido. "Ver todo" → Activity tab. |
| **PRIVACY-01** | **Visibilidad household vs personal** | A. Todo household visible para todos adultos<br>B. Personal drafts/private tasks solo owner; resto household<br>C. Coordinadores ven todo; adultos ven asignados; menores ven solo suyos<br>D. Configurable por usuario | **B** (Personal solo owner; resto household) + **C** (roles) | Drafts privados nunca en feed household. Aprobaciones/salud solo coordinadores. Menores: asignados + compartidos. |
| **PRIVACY-02** | **Actividad Geni** | A. Mezclada sin distinción<br>B. Etiquetada "Geni" + filtro exclusivo<br>C. Solo en Attention si action_required<br>D. Feed separado "Geni" | **B** (Etiquetada + filtro) | Transparencia. Usuario puede filtrar Geni. No sustituye Search. |
| **INLINE-01** | **Acciones inline en Attention** | A. Todas (aprobar, verificar, RSVP, resolver, reintentar, abrir, descartar, posponer)<br>B. Solo abrir + una acción principal por tipo<br>C. Solo abrir; acciones en Detail<br>D. Configurable por señal | **A** (Todas, evaluadas por riesgo/permiso/contexto) | Evidencia: Asana/GitHub/ClickUp permiten inline. Requiere Reliability para mutaciones. |
| **DEDUP-01** | **Deduplicación en Attention** | A. Colapsar por entidad (una entrada por task/event/item hasta resolver)<br>B. Colapsar por entidad + ventana temporal (5 min)<br>C. Sin deduplicación (todo aparece)<br>D. Solo alertas persistentes (stock) | **A** (Colapsar por entidad hasta resolver) | Badge no infla. Usuario ve estado actual + "X actualizaciones más". Expandible. |
| **ARCH-01** | **Arquitectura global elegida** | A. Separate screens<br>B. **Tabs en una pantalla** ★<br>C. Home + Activity separada<br>D. Bandeja unificada | **B** (Tabs en una pantalla bajo More o nueva tab) | Ver §12.5. Home preview combinado → abre en tab Atención. Escalable, bajo coste, badges claros. |

---

## 14. Report & Commit

### 14.1 File Created

```
docs/implementation/planner/M11_11A_P1C_ATTENTION_ACTIVITY_RESEARCH.md
```

### 14.2 Validation

```bash
git diff --check
git status --short
```

### 14.3 Commit

```bash
git add docs/implementation/planner/M11_11A_P1C_ATTENTION_ACTIVITY_RESEARCH.md
git commit -m "docs(planner): research attention and activity"
```

### 14.4 Worktree Final State

Clean worktree, no uncommitted changes except the research document.

---

## 15. Handoff

**HANDOFF PARA CONTROL GENERAL**

| Field | Value |
|---|---|
| **LANE** | Planner V1 — 11A.P1 External Comparative Research |
| **MILESTONE** | Planner V1 — 11A.0 Global Surfaces Product Research |
| **BRANCH** | `planner-v1-11a-p1-attention-activity-research` |
| **WORKTREE** | `C:\Users\thega\Desktop\HomePlus-worktrees\events` |
| **BASE** | `1b5dea24f5c0ddfb3b5163dd77be095b05f90876` |
| **VERDICT** | **PLANNER_ATTENTION_ACTIVITY_RESEARCH_COMPLETE** |
| **COMMIT** | `docs(planner): research attention and activity` |
| **BLOCKERS** | None |
| **RISKS** | - Decision ATTN-01/ACT-01 coupling: if user chooses separate screens (A), Home preview must split. <br> - Geni labeling (PRIVACY-02) requires Geni implementation to validate. <br> - Badge sync (BADGE-01) needs backend `attention_count` endpoint. |
| **INTEGRATION REQUESTS** | - Backend: `GET /api/attention/count` per household+person for badge sync. <br> - Backend: `GET /api/attention` with filters (module, urgency, status, assignee). <br> - Backend: `GET /api/activity` with pagination, filters (module, person, entity, date, action_type). <br> - Real-time: Attention badge updates via Supabase Realtime on attention table. |
| **SUPABASE** | No changes in this phase. Future: `attention_items` table, `activity_events` table, realtime subscriptions. |
| **FILES CHANGED** | `docs/implementation/planner/M11_11A_P1C_ATTENTION_ACTIVITY_RESEARCH.md` |
| **NEXT ACTION** | **Iniciar 11A.P2** — Product definition based on decisions above. Await user selection on §13 decisions before P2. |

---

## 16. Bibliography

All sources consulted 2026-08-02.

**Family / Household:**
- Google Family Link: https://support.google.com/families/answer/7101025
- Microsoft Family Safety: https://support.microsoft.com/en-us/account-billing/getting-started-with-microsoft-family-safety-b6280c9d-38d7-82ff-0e4f-a6cb7e659344
- Cozi Features: https://www.cozi.com/feature-overview/
- Google Home/Nest: https://support.google.com/googlenest/answer/9159862
- Apple Home: https://support.apple.com/guide/iphone/intro-to-home-iph22d98bbca/ios

**Productivity / Collaboration:**
- Asana Inbox: https://asana.com/guide/help/articles/8523748460651-asana-inbox
- Slack Activity: https://slack.com/help/articles/115003119246
- Notion Notifications: https://www.notion.com/help/notifications
- ClickUp Help: https://clickup.com/help
- Todoist Activity History: https://todoist.com/help/articles/getting-started-with-activity-history
- Trello Notifications: https://trello.com/guide/notifications
- Microsoft Teams Activity: https://support.microsoft.com/en-us/office/activity-feed-in-teams
- GitHub Notifications: https://docs.github.com/en/account-and-profile/managing-subscriptions-and-notifications-on-github/setting-up-notifications/about-notifications

**Social / Feeds:**
- Instagram Help: https://help.instagram.com
- TikTok Activity Center: https://www.tiktok.com/safety/en-us/activity-center/
- Facebook Notifications: https://www.facebook.com/help/212538162109616
- Reddit Inbox: https://reddit.com/help

**Smart Home / Platform:**
- Google Home/Nest: https://support.google.com/googlenest
- Apple Home: https://support.apple.com/guide/iphone/intro-to-home-iph22d98bbca/ios
- iOS Search: https://support.apple.com/guide/iphone/search-on-iphone-iph3c511548/ios

**Internal Baseline:**
- `docs/implementation/planner/M11_11A_P0_CURRENT_CAPABILITIES_INVENTORY.md`
- `docs/implementation/planner/M11_11A_P1A_QUICK_ACTIONS_SEARCH_RESEARCH.md`

---

**END OF REPORT**