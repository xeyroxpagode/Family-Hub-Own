# M11 - 11A.P1A Quick Actions + Global Search Research

**MILESTONE:** Planner V1 - 11A.P1 External Comparative Product Research
**WORKTREE:** `C:\Users\thega\Desktop\HomePlus-worktrees\integration`
**BRANCH:** `planner-v1-11a-p1-quick-search-research`
**BASE:** `5ff00a5e88b082e634e5a7c37d94952c3aad2b01`
**DATE:** 2026-08-02
**SCOPE:** Research only. No code, contracts, backend, navigation, UI, styles, Supabase, package, or lockfile changes.

---

## 1. Executive Summary

This report compares current external patterns for global Quick Actions and global Search across family/household organization, task and calendar productivity, inventory/pantry/list apps, collaboration tools, smart home products, and OS/platform patterns.

The strongest findings are:

- Mature apps rarely expose every possible action globally. Global action surfaces prioritize frequent capture, creation, or setup actions, while risky, destructive, item-specific, approval, or lifecycle mutations remain contextual.
- A small, stable global action menu works best when the actions have clear nouns and do not require pre-selecting an existing object.
- Open icon grids without permanent cards work well for 3-6 highly distinct actions if labels are short, icons are visually differentiated, and the full cell is tappable. They become ambiguous when actions are too similar, too numerous, permission-dependent, or mixed between creation and deep navigation.
- Search is normally a separate global affordance, not hidden inside creation actions. The most transferable patterns are Home/header search affordance leading to a full-screen search experience, plus local module search where the module needs immediate filtering.
- Apps that combine search with command palettes or assistants still preserve a boundary: Search finds known content; AI/assistant interprets intent and may propose or execute confirmed actions.
- For HomePlus today, Planner is mature enough for global create actions; Inventory is not yet mature enough for global quantity mutations. Inventory can be searchable and may expose `Abrir inventario` or `Crear item` later, but should not be added merely to balance the menu visually.
- A provisional direction for discussion is: keep the center `+` as a small global action grid for canonical creation/actions, add global Search as a visible Home/header affordance that opens full-screen Search, and keep Geni as a future separate action with a distinct icon and behavior.

This is not a Product Freeze. The output is a decision aid for P2.

---

## 2. Baseline HomePlus

Source: `docs/implementation/planner/M11_11A_P0_CURRENT_CAPABILITIES_INVENTORY.md`, read first during this execution.

Current Quick Actions facts:

- HomePlus has an existing central global button in the bottom tab bar.
- The central button opens the single `PlannerSheetHost` via `PlannerSheetProvider.openActions()`.
- Current implemented global actions are `Crear tarea`, `Crear evento`, and `Crear plan`.
- Templates already have their own Planner access and should not be duplicated as generic Quick Actions.
- Drafts already have their own Planner access and should not be duplicated as generic Quick Actions.
- Inventory has no global actions.
- Geni is future and must eventually be globally accessible.

Current Search facts:

- HomePlus has no global Search.
- Planner Search exists only as a gated placeholder with no productive input or results.
- Inventory has local in-screen search by item name.
- Search must be able to grow across modules.
- Search must open canonical Details or module routes, not duplicate canonical Details or forms.
- Search should not duplicate Planner Search internally before there is a global strategy.

Relevant architectural constraints:

- Planner already has a single form host. Adding another global form host would risk collisions.
- Planner Details are canonical for Tasks, Events, and Plans.
- Inventory is functional but less mature: no reliability queue, no capability system, no pagination, no trash UI, no barcode/camera/OCR, no units, and basic client-role approval gates.

---

## 3. Metodologia

Research date: 2026-08-02.

Source priority used:

- Official product documentation and help centers.
- Official product marketing pages when help pages did not expose UI details.
- Platform documentation and design-system documentation.
- App Store / Play Store listings were considered acceptable when official pages were inaccessible, but this report marks weak observations where direct official page access was limited.

Evidence rules:

- Claims tied to observed documentation include source URLs in the bibliography.
- UI conclusions are pattern-level and do not copy protected assets.
- Where a site required JavaScript or blocked automated access, the source is listed only as a design-system reference, not as a detailed factual source.
- The report does not replace or correct the P0 internal inventory.

Sample included:

- Family/household: FamilyWall, Cozi, Google Home, Apple Home, Google Family Link, Microsoft Family Safety.
- Productivity/tasks/calendar: Todoist, Things, Notion, Microsoft To Do, Trello, Google Calendar, Asana pattern category.
- Inventory/pantry/lists: AnyList pattern category, Bring!/shopping-list pattern category, pantry/inventory apps pattern category, plus HomePlus Inventory baseline.
- Cross-platform/transversal: iOS Search/Quick Actions, Material FAB/Search, Google Search, Notion Command Search, Things Quick Find, smart home setup, collaboration boards.

---

## 4. Aplicaciones y Fuentes

Selected applications and why they matter:

| Application | Category | Why selected |
|---|---|---|
| FamilyWall | Family organizer | Combines calendar, lists, meal planning, location, messaging, and family dashboard. Useful for multi-module household navigation. |
| Cozi | Family organizer | Mature family calendar/list app with Today/dashboard and lists. Useful for family simplicity and module separation. |
| Google Home | Smart home | Strong example of setup/add actions, device grouping, rooms, and permission/household implications. |
| Apple Home | Smart home | Household control model with rooms, scenes, automations, and accessory setup. Useful for contextual vs global control. |
| Google Family Link | Family management | Permission-heavy household app where risky actions stay contextual to a child/member. |
| Microsoft Family Safety | Family management | Role/permission-heavy family dashboard with activity, limits, and restrictions. |
| Todoist | Tasks/productivity | Strong evidence for global/quick task capture, Dynamic Add button, keyboard Quick Add, natural language, and cross-device capture. |
| Things | Tasks/productivity | Strong evidence for Quick Find: search and navigation combined, pull-down on mobile, keyboard-first on desktop/iPad. |
| Notion | Knowledge/project collaboration | Strong evidence for workspace Search, Command Search, recents, filters, and AI coexistence. |
| Microsoft To Do | Tasks | Simple task/list model with My Day and list organization. Useful for avoiding overloaded global action menus. |
| Trello | Collaboration/boards | Board/card model, templates, automation, Inbox/Planner. Useful for global capture vs board-context actions. |
| Google Calendar | Calendar | Dedicated calendar search, event/task creation, offline/accessibility references. Useful for calendar scope. |
| Google Search | Search platform | Strong evidence for history, filters, privacy controls, AI coexistence, and specialized search modes. |
| Material Design 3 | Platform/design system | FAB and search component references. Some pages require JavaScript, so used as pattern reference only. |
| iOS | Platform | Search from OS, app quick actions, pull-down/search behavior, accessibility ecosystem. |

---

## 5. Research Quick Actions

### 5.1 Access Location Patterns

Observed patterns:

- Bottom-right FAB or dynamic add button: Todoist uses a red Dynamic Add button on mobile and `Q`/global Quick Add on desktop. This pattern works when one action dominates: capture a task.
- Center bottom action: common in apps where creation is a primary global mode. HomePlus already has this pattern.
- Header `+` or Add: Google Home setup documentation uses top-right Add for devices, linking services, and setup flows. This suits setup actions with clear, guided sequences.
- Sidebar/top command search: Notion exposes Search at the top of the sidebar and Command Search on desktop. This is search/navigation, not creation.
- Pull-down search, not add: Things uses pull-down in mobile lists for Quick Find. This supports retrieval/navigation rather than creation.
- Contextual row/card actions: Google Home device tiles, Family Link child settings, Inventory quantity changes, task completion, and approvals are typically contextual because the target object matters.

Transferable principle: global actions should be object-independent or should start a guided canonical create flow. Actions that require an existing item should stay inside the item/module context.

### 5.2 Quantity of Actions

Observed patterns suggest these ranges:

- 1 dominant action: ideal for single-purpose task capture apps like Todoist.
- 3 actions: stable and learnable for HomePlus current Planner create set.
- 4 actions: still clear if the fourth is future Geni or a clearly different module action.
- 5-6 actions: acceptable in an open grid if categories are distinct and labels are short.
- 7+ actions: begins to require grouping, recents, personalization, or search/command palette behavior.

For HomePlus, 3-5 visible actions is the practical first range. Adding every Inventory mutation would exceed the point where the central button remains simple.

### 5.3 Fixed vs Contextual Actions

Fixed actions work when:

- The same action is useful from any screen.
- The label remains stable.
- The action has stable permission rules.
- The action opens a canonical form or assistant flow.

Contextual actions work when:

- The target depends on the current module or item.
- The action is risky or approval-like.
- The action should reflect the current screen context.
- The action would be confusing outside its module.

HomePlus implication: `Crear tarea`, `Crear evento`, `Crear plan`, and future `Geni` can be fixed. Inventory `agregar cantidad`, `consumir cantidad`, `marcar sin stock`, `aprobar reposicion`, and `rechazar reposicion` should not be fixed global actions now.

### 5.4 Recent and Personalized Actions

Observed in broader platform patterns:

- Search and launcher experiences often show recents.
- Command palettes often include recent pages/actions.
- Creation FABs rarely start with personalization because personalization adds state, ordering questions, and discoverability cost.

HomePlus implication: do not start P2 with personalized Quick Actions unless user testing shows the action set cannot remain small. Manual ordering may be useful later if modules grow, but it is not required for the first global surface.

### 5.5 Permissions

Patterns:

- Permission-heavy apps expose allowed flows and hide or explain unavailable flows near context.
- Google Family Link and Microsoft Family Safety keep management actions under child/member/account contexts because role and target matter.
- Google Home setup/linking flows are gated by home/device/service state.

HomePlus implication:

- Hidden unavailable Quick Actions are acceptable for create actions if capability guards are already the product rule.
- Destructive or approval actions should not be hidden globally because users need context and explanation.
- If an action is shown but disabled, the disabled state must explain why. For a compact global grid, this creates visual complexity; hiding capability-gated create actions is simpler.

### 5.6 Layout Patterns

Layout patterns observed or supported by platform conventions:

- Vertical list with icons and labels: most robust for long labels, explanations, and disabled states.
- Open grid of icon + label: efficient for 3-6 known actions, especially mobile bottom sheets.
- Cards with borders: useful when actions need descriptions or module grouping, but heavier and less like quick capture.
- Icon-only: unsuitable for HomePlus because Task/Event/Plan/Geni/Inventory distinctions require labels and accessibility clarity.
- Grouped by module: useful at 6+ actions or when multiple modules contribute comparable actions.

### 5.7 Evaluation of the User Hypothesis: Open Grid

Hypothesis: open grid, actions separated by position, visually distinct icons, brief label below, no permanent cards/borders, full cell tappable, feedback only on press.

Assessment:

- Works well for 3-6 highly differentiated actions.
- Works well when users open the central button intentionally and need quick visual selection.
- Works well with short labels such as `Tarea`, `Evento`, `Plan`, `Geni`, `Inventario`.
- Works well if the entire cell has at least platform-recommended touch target size and visible pressed/focus states.
- Becomes ambiguous if labels are all verbs like `Agregar`, `Crear`, `Abrir`, or if several actions share the same plus/create icon.
- Becomes ambiguous if contextual Inventory mutations are mixed with Planner creation actions.
- Becomes hard to scan above 6 items without grouping or a list layout.
- On tablet, it should not expand into an overly wide row; use 3 columns in a centered sheet or 4 columns only if labels remain readable.

Recommended maximum for HomePlus first pass: 4 visible fixed actions, with a hard caution above 6.

Future Geni representation:

- Geni should be a distinct global action, not a Search replacement.
- Use a non-plus icon family and label `Geni` or `Asistente` after product naming is settled.
- In the open grid, Geni can occupy a stable fourth cell. It should not be mixed into Search results as the primary entry.

Planner monopoly risk:

- Current 3 actions are all Planner actions. This is acceptable because those are the only mature global create flows.
- If the menu remains Planner-only after Geni and Inventory mature, the central button will feel misleading as a global app-shell affordance.
- The menu should reserve conceptual room for non-Planner modules without adding immature actions prematurely.

### 5.8 Inventory as a Quick Actions Source

| Inventory action | Frequency | Context required | Risk | Permission | Global fit now | Reasoning |
|---|---:|---|---|---|---|---|
| Crear item | Weekly | Category/name/form | Medium | No full capability system | Possible later | Global create can work only after canonical inventory form and capability model mature. Current direct modal/basic model is weaker than Planner. |
| Agregar cantidad | Daily | Existing item | Medium | Auth household | No | Requires selecting item and quantity; global entry would first become search/select, then mutation. Better local or contextual. |
| Consumir cantidad | Daily | Existing item | Medium-high | Auth household | No | Similar to add quantity; accidental consumption changes stock state and can trigger alerts. Keep in item context. |
| Marcar sin stock | Daily | Existing item | High | Auth household | No | Risky and item-specific. Should be contextual or Attention flow. |
| Aprobar reposicion | Weekly | Request, role, downstream task | High | Coordinator/adult client gate | No | Approval creates Planner task server-side and needs request context. Not a global quick action. |
| Rechazar reposicion | Weekly | Request, role, reason/context | Medium-high | Coordinator/adult client gate | No | Approval/denial actions need context and possibly explanation. |
| Abrir Inventario | Daily/weekly | None | Low | Module visibility | Maybe | Navigation, not creation. Could help module balance, but should not be added only for aesthetics. Better as module shortcut if central button evolves into launcher. |

Conclusion: no Inventory mutation should be promoted globally in P2. `Abrir Inventario` is the only low-risk Inventory candidate, but it changes Quick Actions from create menu to mixed create/navigation launcher. `Crear item` could become viable after Inventory has a canonical create route, capability guard, mature form, and ideally reliability/offline policy.

---

## 6. Research Search

### 6.1 Entry Alternatives

Observed and evaluated options:

| Entry | Evidence pattern | Strength | Weakness | HomePlus fit |
|---|---|---|---|---|
| Visible Home/header search bar | Google/Notion/search-first apps | High discoverability | Takes visual space | Strong first candidate |
| Persistent all-surface search bar | Search-heavy apps | Always visible | Heavy for household app | Too much for current scope |
| Header magnifier | Many mobile apps | Compact global access | Less discoverable than bar | Good fallback/secondary |
| Full-screen search after entry | Notion/OS search | Good focus and results grouping | Requires new screen | Strong target behavior |
| Pull-down search | Things/iOS patterns | Fast once learned | Low discoverability | Good local/module supplement, not first global entry |
| Search inside Quick Actions | Launcher/command palette | Can unify actions/search | Blurs creation vs retrieval | Not recommended first |
| Search in More | Settings-heavy apps | Low surface cost | Poor discoverability | Not adequate for global Search |
| Command palette | Notion/Things desktop | Powerful keyboard-first | Overkill on mobile-only first | Later tablet/desktop enhancement |

### 6.2 Behavior Patterns

Initial state:

- Notion shows recent pages when opening search.
- Things Quick Find suggests matches immediately and initially searches names before `Continue Search` expands scope.
- Google Search exposes history, filters, and privacy controls.

HomePlus implication: initial state should show recent opened entities and maybe module chips, not an empty white page. Recents must respect household/personal/privacy boundaries.

Immediate vs delayed search:

- Local search can be immediate for small loaded datasets.
- Global search should debounce remote requests and handle partial failures.
- If only Planner + Inventory are included initially, search can start with server-backed Planner results plus local or endpoint-backed Inventory later, but P2 should define product behavior before backend cost.

Grouping and ranking:

- Notion ranks best matches and supports filters/sort.
- Google Calendar keeps calendar search scoped.
- Things first searches names, then expands to notes/logbook with explicit `Continue Search`.

HomePlus implication: grouped results by module/entity type are safer than a fully unified ranking at first. Ranking can be simple: exact title/name matches first, then due/upcoming/recent, then secondary fields.

Scopes and filters:

- Notion filters by title, creator, teamspace, location/page, date.
- Google Search provides filters and specialized modes.
- Todoist filters are powerful but domain-specific.

HomePlus first filters should be minimal: `Todos`, `Tareas`, `Eventos`, `Planes`, `Inventario`. Add `Presets`, `Drafts`, archived, and trash only by explicit product decision.

Privacy:

- Notion and Google Search emphasize permissions and connected sources.
- Family apps have personal vs household data boundaries.

HomePlus implication: private drafts should not appear in household-visible global Search unless the current user owns them and the result clearly indicates private status. Household/personal scope must be applied before ranking.

### 6.3 Search Results for Current Modules

Recommended current result classes:

- Task: title, status/due/assignee summary, opens canonical Task Detail.
- Event: title, date/time, household/personal context, opens canonical Event Detail.
- Plan: title/progress or status, opens canonical Plan Detail.
- Inventory Item: name, quantity/status/category, opens Inventory with item focus when available, otherwise Inventory screen with search prefilled or item highlighted later.

Deferred or conditional result classes:

- Presets: show only if visible in Planner and permissions allow templates use/manage; not a default first global scope if it creates noise.
- Drafts: private only, current-user only, possibly excluded from global Search until a privacy design exists.
- Archived items: exclude by default; include behind a filter.
- Trash/Papelera: exclude by default; include only if user explicitly chooses `Papelera` scope.

### 6.4 Avoiding Duplication

Search should not:

- Re-render Task/Event/Plan details inline.
- Open noncanonical create/edit forms.
- Become a second Planner Search route parallel to global Search.
- Replace Inventory local search; local search remains useful for filtering the current list.

Search should:

- Navigate to canonical detail routes.
- Use module-specific filtering internally if needed.
- Allow local module search to remain as a fast within-screen filter.

---

## 7. Relacion Search/Geni

Evidence patterns:

- Notion separates workspace Search from Notion AI: Search finds pages/content, while Notion AI can search connected apps and answer questions.
- Google Search separates classic search, filters, history, and AI/AI Mode. AI may answer or reason, but search filters/history remain available.
- Command Search in Notion can search or ask AI, but the documentation still names separate behaviors and entry choices.

Principles for HomePlus:

- Search finds existing content, navigates, filters, and retrieves known information.
- Geni interprets intention, reasons, proposes, explains, and prepares or executes confirmed actions.
- Geni must not become the only way to find known tasks, events, plans, or inventory items.
- Search results may include an optional `Ask Geni about this` affordance later, but must not require Geni to open a result.
- Geni may start canonical forms or confirmed actions, but must not create parallel forms.
- Search should work without AI availability, network model availability, or assistant permission.

---

## 8. Matriz Comparativa

| Application | Category | Platform | Quick Actions pattern | Location | Visible count | Layout | Personalization | Contextuality | Search pattern | Search location | Scopes | Grouping | Recents | Accessibility observable | Strength | Weakness | Transferable principle | Do not copy |
|---|---|---|---|---|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FamilyWall | Family/home | iOS/Android/Web | Module features for calendar, lists, meal, to-dos, location, messaging | Dashboard/modules | N/A | Dashboard/list modules | Multi-groups | Module-specific | Not documented as global | N/A | N/A | Module pages | N/A | Cross-device | Broad household scope | Can become broad/noisy | Household modules need clear boundaries | Do not put every household feature in `+` |
| Cozi | Family/home | iOS/Android/Web | Feature modules: calendar, to-dos, shopping, recipes | Tabs/modules/Today | N/A | Module dashboard | Family calendar/list setup | Module-specific | Not emphasized globally | N/A | Calendar/lists | By feature | Today reminders | Official support/help | Simple family mental model | Less evidence for global search | Keep family app simple and dashboard-oriented | Do not overfit productivity-app power patterns |
| Google Home | Smart home | iOS/Android | Add device/link service/setup | Top-right Add | 1 entry to guided setup | Guided flow/list | Homes/rooms/devices | Highly contextual | Device/service search inside setup | Add flow/search bar | Devices/services | By room/service | N/A | Help center instructions | Good setup action model | Device control is target-specific | Setup can be global; control stays contextual | Do not expose risky device/service actions globally |
| Apple Home | Smart home | iOS/iPadOS | Add accessory/scenes/automation patterns | Home app/context | Few primary entries | Rooms/scenes/tiles | Homes/rooms | Strongly contextual | OS/app search support; Home controls contextual | OS/App | Accessories/scenes | Rooms | N/A | Apple guide/accessibility ecosystem | Rooms/scenes reduce complexity | Smart home actions can be risky | Context is essential for control actions | Do not make all controls global |
| Google Family Link | Family management | iOS/Android/Web | Child/account management actions | Child/member context | N/A | Cards/settings | Per child | Very high | Help/search center; not product-global | Support/app context | Child/account settings | Per member | N/A | Official help | Permissions explicit | Heavy admin context | Permission-heavy actions belong near target | Do not hide approval/admin actions in generic `+` |
| Microsoft Family Safety | Family management | Windows/Xbox/mobile | Add family, limits, restrictions | Family dashboard/member context | N/A | Settings/dashboard | Family group roles | Very high | Support/product search | Product/support | Members/devices | By topic/member | Activity reports | Official support | Clear roles/permissions | Admin-heavy | Role-based actions need explanation | Do not globalize child/member restrictions |
| Todoist | Tasks | All | Quick Add, Dynamic Add button | Bottom-right mobile, shortcuts desktop | 1 dominant create | Composer | Shortcuts, integrations | Some list context | Filters/search available | App search/filter | Tasks/projects/labels | Views/filters | N/A | Keyboard shortcuts, mobile gestures | Fast capture | Single-domain optimized | One dominant create can justify FAB | Do not assume HomePlus has one dominant entity |
| Things | Tasks | Apple platforms | Add to-do plus strong Quick Find | App toolbar/list | Few create controls | Native lists | Tags/lists | List context | Quick Find combines search/navigation | Pull-down mobile, always sidebar on iPad, typing/shortcut desktop | To-dos/projects/areas/tags; Continue Search expands notes/logbook | Suggestions | Special lists | Keyboard/pull-down | Excellent search/navigation boundary | Apple-only conventions | Search can begin narrow then expand | Do not hide first-time global Search behind pull-down only |
| Notion | Knowledge/collab | Web/desktop/mobile | New page/templates/context blocks | Sidebar/pages | Contextual | Menus/templates | Workspace/teamspaces | Strong | Workspace Search + Command Search + AI | Sidebar top, cmd/ctrl P/K, desktop command shortcut | Pages/content/sources | Relevance/filters | Recent pages | Keyboard shortcuts | Search, commands, AI coexist clearly | Complex for casual family app | Keep Search and AI distinct | Do not copy enterprise filter complexity first |
| Microsoft To Do | Tasks | All | Add task in list/My Day | List bottom/header | 1 per list | Simple list | Lists | List-specific | List/task organization | App/support | Lists/tasks | Lists | My Day suggestions | Official support | Simplicity | Less global ambition | Local creation can stay local | Do not overbuild global commands |
| Trello | Collaboration | Web/mobile | Create board/card, Inbox, templates, automation | Board/header/sidebar | Contextual | Boards/cards | Templates/Power-Ups | Board-specific | Card/board search pattern | App/header/support | Cards/boards/members | Boards | N/A | Atlassian docs | Board context preserved | Many features | Templates and automation are not quick actions | Do not put templates in global `+` |
| Google Calendar | Calendar | Web/mobile | Create event/task/appointment | Calendar create button | Few create types | Menu/composer | Calendars/settings | Calendar context | Search in Calendar | Calendar UI/help | Events/tasks/calendars | Calendar results | N/A | Offline/accessibility docs | Scope clarity | Calendar-specific | Search can be scoped inside module and still coexist globally | Do not make calendar Search the global model alone |
| Google Search | Platform | Web/mobile | Search entry plus specialized modes | Search bar/widget | N/A | Results pages/chips | History/preferences | Query context | Search with filters/history/privacy/AI | Bar/widgets/app | Web/images/news/etc. | Ranking/chips | History | Accessibility docs | Universal model | Too broad for app | Search needs privacy/history controls | Do not copy web-scale complexity |
| Material Design FAB/Search | Platform | Android/design | FAB for primary action; search component | Screen-level | 1 primary | FAB/search bar | App-defined | Screen/module context | Search bar/view | App surfaces | App-defined | App-defined | App-defined | Component patterns | Clear primary action | JS docs limit detail here | FAB should represent primary action, not menu overflow by default | Do not overload FAB with too many unrelated actions |
| iOS Search/Quick Actions | Platform | iOS | App icon quick actions, OS Search | Home/Lock/App Library/app | Few quick actions | Native menus/search | User/system | App/action context | System Search | Home/Lock/app | Apps/content/settings | System ranking | Suggestions | VoiceOver/Dynamic Type ecosystem | User expectation for global search | OS-level not app-specific | Search should be reachable and predictable | Do not rely only on gestures for discoverability |

---

## 9. Principios

### Quick Actions Principles

Discoverability:

- The central button must clearly communicate that it creates or starts high-frequency work.
- Labels must be visible; icon-only is insufficient.

Frequency:

- Prioritize actions used weekly/daily across screens.
- Rare setup, templates, admin, and recovery flows do not belong in the primary Quick Actions menu.

Cognitive load:

- Keep the first action set small.
- Avoid mixing similar verbs unless nouns are clear.

Contextuality:

- If the action needs a selected item, keep it contextual.
- If the action mutates lifecycle, stock, approval, or destructive state, keep it contextual.

Stability:

- Initial ordering should be stable, not automatic.
- Recents can come later, but should not reorder primary actions unpredictably.

Personalization:

- Do not add customization before the action set proves too broad.
- If customization is introduced, use manual order and default recommendations, not opaque ranking.

Scalability:

- 3-5 actions can be an open grid.
- 6+ should consider grouping, a list, or a launcher/search model.

Accessibility:

- Entire cell should be tappable.
- Provide pressed, focus, screen reader labels, and keyboard traversal.
- Labels must support larger text without truncating critical nouns.
- Reduce Motion should not impair feedback.
- Haptics should be enhancement only, not the sole feedback.

### Search Principles

Universality:

- Global Search should be globally discoverable, even if results initially cover only Planner + Inventory.

Scope:

- Start with visible/currently understandable modules.
- Exclude private, archived, and trash content by default unless explicitly scoped.

Ranking:

- Start with grouped results and simple relevance.
- Avoid opaque global ranking before there is enough content and telemetry.

Privacy:

- Apply permissions before display.
- Clearly mark private/personal results if included.

Initial state:

- Show recents or suggested scopes, not an empty page.
- Recents must be per-user and privacy-safe.

Navigation:

- Results open canonical Details or module screens.
- No duplicate details or duplicate forms.

Progressive disclosure:

- Start with title/name fields and essential metadata.
- Add filters and expanded scopes later.

Growth by modules:

- Each module should contribute indexed result types and canonical navigation contracts.
- Local search can remain for within-module filtering.

---

## 10. Anti-patterns

- Promoting Inventory mutations globally just to balance Planner visually.
- Adding `Plantillas` or `Borradores` to Quick Actions despite their existing contextual routes.
- Treating Search as a Quick Action tile if Search is expected to be a core global retrieval tool.
- Combining Search and Geni into one ambiguous `Ask/Search` entry before users understand either.
- Showing disabled actions in a compact grid without explaining permissions.
- Reordering Quick Actions automatically based on recency in a household app where multiple users may share mental models.
- Returning Drafts, Trash, or archived content in default Search without explicit scope and privacy decisions.
- Rendering result details inside Search instead of navigating to canonical Details.
- Creating a separate global form host instead of using the existing PlannerSheetHost for Planner create forms.
- Copying enterprise command palettes or web-scale search filters before HomePlus has enough modules/content.

---

## 11. Alternativas Quick Actions

### QA Option 1 - Current Planner Core, Open Grid

Visible actions:

- Crear tarea
- Crear evento
- Crear plan

Order:

- Fixed manual product order: task, event, plan.

Layout:

- Open grid without permanent cards/borders.
- Distinct icons.
- Brief label below.
- Full cell tappable.
- Pressed/focus feedback only on interaction.

Location:

- Existing center `+` bottom tab button.

Behavior:

- Opens `PlannerSheetHost` actions sheet.
- Selecting an action opens canonical Planner create form in the existing host.

Personalization:

- None.

Permissions:

- Hide unavailable create actions using existing capability guards.

Phone:

- 3-column grid in bottom sheet.

Tablet:

- Centered sheet, 3 columns, do not stretch full width.

Accessibility:

- Full-cell hit target, screen reader label `Crear tarea`, `Crear evento`, `Crear plan`, keyboard focus order left-to-right/top-to-bottom.

Future Geni:

- Add stable fourth cell when implemented.

Advantages:

- Minimal change, respects current architecture, high clarity.

Disadvantages:

- Still Planner-only.

Risks:

- Users may perceive central global button as Planner-specific until Geni or another mature module joins.

### QA Option 2 - Global Core Grid with Reserved Geni Slot

Visible actions:

- Crear tarea
- Crear evento
- Crear plan
- Geni (when implemented; absent until real)

Order:

- Fixed: Task, Event, Plan, Geni.

Layout:

- Open grid, 2x2 when Geni exists.

Location:

- Existing center `+`.

Behavior:

- Planner actions use existing host; Geni opens future assistant entry.

Personalization:

- None in P2.

Permissions:

- Hide Planner actions if unavailable; Geni visibility based on feature availability.

Phone:

- 2 columns or 4 cells in balanced grid depending sheet width.

Tablet:

- 4 cells in centered row or 2x2 grid if labels enlarge.

Accessibility:

- Same as Option 1; Geni gets distinct semantic label such as `Abrir Geni`.

Future Geni:

- First-class global action.

Advantages:

- Keeps action set stable and future-aware.

Disadvantages:

- Cannot show Geni until implemented; placeholder must not ship.

Risks:

- If Geni becomes too prominent, users may expect it to replace Search.

### QA Option 3 - Module-Aware Create Menu

Visible actions:

- Crear tarea
- Crear evento
- Crear plan
- Crear item (only after Inventory create matures)

Order:

- Group Planner first, Inventory after; stable order.

Layout:

- Open grid up to 4, or grouped list if descriptions are needed.

Location:

- Existing center `+`.

Behavior:

- Planner actions open PlannerSheetHost.
- Inventory action opens canonical Inventory create route/modal once mature.

Personalization:

- None initially.

Permissions:

- Requires future Inventory capability guard.

Phone:

- 2x2 grid.

Tablet:

- 4-cell grid or grouped layout.

Accessibility:

- Labels must include module noun if ambiguity appears: `Item inventario`.

Future Geni:

- Adds fifth action or replaces one row layout; may require grouping.

Advantages:

- Makes central action truly cross-module.

Disadvantages:

- Inventory is not ready now.

Risks:

- Premature Inventory exposure creates inconsistent reliability and permissions.

### QA Option 4 - Vertical Action List with Module Groups

Visible actions:

- Planner: Crear tarea, Crear evento, Crear plan.
- Inventario: Abrir inventario or Crear item later.
- Geni: future action.

Order:

- Module groups, fixed order.

Layout:

- Vertical list with section labels and optional descriptions.

Location:

- Existing center `+`.

Behavior:

- A launcher-style sheet.

Personalization:

- Manual reorder later, not first.

Permissions:

- Can show explanatory disabled states more safely than a grid.

Phone:

- Bottom sheet list.

Tablet:

- Center/modal panel.

Accessibility:

- Best for Dynamic Type and screen reader grouping.

Future Geni:

- Dedicated top or bottom group.

Advantages:

- Scales better than grid.

Disadvantages:

- Feels slower/heavier for only 3 actions.

Risks:

- Over-frames the central button as a full app launcher instead of quick capture.

---

## 12. Alternativas Search

### Search Option 1 - Home/Header Search Bar to Full-Screen Global Search

Entry:

- Visible search affordance on Home or AppTopBar/Home header: `Buscar en HomePlus...`.

Initial state:

- Recent results and module chips.

Modules included:

- Planner Tasks, Events, Plans; Inventory Items when endpoint/product behavior exists.

Results:

- Grouped by module/entity.

Filters:

- `Todo`, `Tareas`, `Eventos`, `Planes`, `Inventario`.

Recents:

- Per-user recent opened results.

Privacy:

- Exclude private drafts by default. Apply household/personal scope before display.

Local Search relation:

- Inventory local search remains within Inventory.

Geni relation:

- Separate entry; optional future suggestions only.

Phone:

- Full-screen search.

Tablet:

- Centered modal or split overlay with results pane.

Advantages:

- Most discoverable and scalable.

Disadvantages:

- Takes Home/header space.

Risks:

- If backend search is immature, visible search may feel underpowered.

### Search Option 2 - Header Magnifier Everywhere

Entry:

- Magnifier icon in AppTopBar right slot.

Initial state:

- Recents and filters.

Modules included:

- Same as Option 1.

Results:

- Grouped list.

Filters:

- Chips after input.

Recents:

- Yes.

Privacy:

- Same as Option 1.

Local Search relation:

- Local search remains where useful.

Geni relation:

- Separate future action; Geni not the icon.

Phone:

- Icon opens full screen.

Tablet:

- Icon opens overlay/popover/full screen depending navigation.

Advantages:

- Available from every module with low visual cost.

Disadvantages:

- Less discoverable than a visible bar.

Risks:

- Users may miss it if the top bar is visually dense.

### Search Option 3 - Home-Only Search Bar + Module Local Search

Entry:

- Visible search bar only on Home.

Initial state:

- Home-oriented recents and suggested modules.

Modules included:

- Current global modules only.

Results:

- Grouped.

Filters:

- Module chips.

Recents:

- Yes.

Privacy:

- Same as Option 1.

Local Search relation:

- Planner/Inventory may keep or later add local search.

Geni relation:

- Geni separate.

Phone:

- Search starts from Home; from other tabs user returns Home or uses future header icon.

Tablet:

- Home dashboard search becomes prominent.

Advantages:

- Strong discoverability on Home with less shell churn.

Disadvantages:

- Not accessible from every module.

Risks:

- May not feel truly global.

### Search Option 4 - Command Palette / Launcher Hybrid

Entry:

- Search field inside a global launcher that also lists actions.

Initial state:

- Recent pages/actions and quick actions.

Modules included:

- Planner, Inventory, future Geni commands.

Results:

- Unified list of content and commands.

Filters:

- Inline command syntax or chips.

Recents:

- Content and actions.

Privacy:

- Strict per result/action.

Local Search relation:

- Local search still exists.

Geni relation:

- Geni command can appear but remains distinct.

Phone:

- Full-screen command search.

Tablet:

- Keyboard-first command palette.

Advantages:

- Powerful and scalable.

Disadvantages:

- Too complex for current module count and family-user mental model.

Risks:

- Blurs Search, actions, and Geni too early.

---

## 13. Arquitecturas Combinadas

### Combination A - Open Grid Quick Actions + Home/Header Search Bar

Pattern:

- Center `+` remains creation/action.
- Search is a visible Home/header affordance.

Text wireframe:

```text
┌─────────────────────────────┐
│ Buscar en HomePlus...       │
└─────────────────────────────┘

        ○          ○          ○
   Crear tarea  Crear evento  Crear plan
```

Pros:

- Clean separation between create/actions and retrieval.
- Works with current PlannerSheetHost.
- Best fit for user hypothesis.

Cons:

- Needs careful Home/header layout.

### Combination B - Open Grid Quick Actions + Global Header Magnifier

Pattern:

- Center `+` stays compact.
- Search icon lives in AppTopBar right slot across surfaces.

Text wireframe:

```text
┌──────── HomePlus         🔍 ┐
└─────────────────────────────┘

        ○          ○          ○
   Crear tarea  Crear evento  Crear plan
```

Pros:

- Search accessible from anywhere.
- Low visual footprint.

Cons:

- Less discoverable than a bar.

### Combination C - Module-Aware Quick Actions + Home Search Bar

Pattern:

- Quick Actions becomes cross-module only when Inventory create matures.
- Search bar starts global retrieval.

Text wireframe:

```text
┌─────────────────────────────┐
│ Buscar en HomePlus...       │
└─────────────────────────────┘

        ○          ○
   Crear tarea  Crear evento

        ○          ○
   Crear plan   Crear item
```

Pros:

- Future-proof and commercially balanced.

Cons:

- Not appropriate until Inventory has canonical create/capabilities.

### Combination D - Launcher Hybrid with Search

Pattern:

- Center button opens a full launcher with search plus quick actions.

Text wireframe:

```text
┌─────────────────────────────┐
│ Buscar o ejecutar...        │
└─────────────────────────────┘

Acciones rápidas
○ Crear tarea   ○ Crear evento
○ Crear plan    ○ Geni

Recientes
Tarea: Comprar leche
Plan: Mudanza
```

Pros:

- Very scalable.

Cons:

- Too much for P2 unless product intentionally chooses command-palette direction.

---

## 14. Recomendacion Provisional

**RECOMENDACION PROVISIONAL PARA DISCUSION**

Adopt Combination A as the leading P2 direction:

- Keep the existing center `+` and `PlannerSheetHost` for Quick Actions.
- Use an open grid without permanent borders/cards for the current three Planner create actions.
- Do not add Inventory mutations globally now.
- Do not add Templates or Drafts to Quick Actions.
- Reserve conceptual room for Geni as a future fourth global action, but do not implement a placeholder.
- Add global Search as a separate Home/header visible affordance that opens a full-screen global Search.
- Initial Search should cover Planner Tasks, Events, Plans, and Inventory Items when backend/product behavior is ready; it should group results by module/entity and open canonical Details or module screens.
- Keep Inventory local search as local filtering.
- Exclude Drafts, Trash, archived items, and Presets from default global Search until explicit scope/privacy decisions are made.

Why this is the provisional recommendation:

- It respects HomePlus's current Planner maturity and single `PlannerSheetHost`.
- It avoids exposing immature Inventory mutations globally.
- It separates Search from Geni and from creation.
- It keeps implementation cost lower than a full command palette.
- It is commercially legible: quick create remains quick; search has a clear home.
- It reduces risk of having to redesign navigation immediately.

---

## 15. Decisiones Para El Usuario

### DECISION QA-01 - Layout de Quick Actions

A. Open grid without cards/borders, icon + brief label, full cell tappable.
B. Vertical list with icons and labels.
C. Cards with border and descriptions.
D. Hybrid grouped by module.

Recommendation: A for 3-4 actions.

Consequence:

- A is fastest and cleanest but should stay under 6 actions.
- B scales and supports accessibility text best but feels heavier.
- C adds explanation but reduces quickness.
- D helps future modules but is premature now.

### DECISION QA-02 - Initial Quick Actions Catalog

A. Keep only Crear tarea, Crear evento, Crear plan.
B. Add Abrir Inventario.
C. Add Crear item.
D. Add Inventory quantity/approval actions.

Recommendation: A.

Consequence:

- A preserves maturity and architecture.
- B makes menu mixed create/navigation.
- C requires Inventory maturity first.
- D creates context, permission, and risk problems.

### DECISION QA-03 - Geni Placement

A. Future fourth Quick Action in the grid.
B. Separate header/action entry outside Quick Actions.
C. Inside Search only.
D. Hidden until invoked contextually.

Recommendation: A, once implemented.

Consequence:

- A satisfies global access and keeps Geni distinct.
- B may compete with Search/header space.
- C risks making Geni replace Search.
- D fails global-access expectation.

### DECISION QA-04 - Permission Treatment

A. Hide unavailable Quick Actions.
B. Show disabled with explanation.
C. Show all and fail after tap.
D. Ask permission upgrade inline.

Recommendation: A for compact grid; B only in list layout.

Consequence:

- A keeps the menu clean.
- B improves transparency but needs space.
- C is poor UX.
- D is premature unless paid/role upgrade flows exist.

### DECISION SEARCH-01 - Principal Search Entry

A. Home/header visible search bar.
B. Global AppTopBar magnifier.
C. Search tile inside Quick Actions.
D. More-tab entry only.

Recommendation: A, with B as possible secondary if space is constrained.

Consequence:

- A is most discoverable.
- B is compact and global.
- C blurs create and retrieval.
- D makes Search too hidden.

### DECISION SEARCH-02 - Initial Result Scope

A. Tasks, Events, Plans, Inventory Items.
B. Planner only.
C. Include Presets and Drafts by default.
D. Include Trash/Archive by default.

Recommendation: A when Inventory result navigation is defined; otherwise Planner first with Inventory explicitly staged.

Consequence:

- A proves global value.
- B is simpler but less global.
- C creates privacy/noise concerns.
- D is unsafe and surprising.

### DECISION SEARCH-03 - Result Organization

A. Group by module/entity.
B. Single unified ranking.
C. Search scopes first, no unified results.
D. Command-palette mixed commands/results.

Recommendation: A.

Consequence:

- A is transparent and scalable.
- B needs better ranking data.
- C is safe but slower.
- D is powerful but complex.

### DECISION SEARCH-04 - Initial Search State

A. Recents + module chips.
B. Empty input only.
C. Suggested actions mixed with results.
D. Geni prompt first.

Recommendation: A.

Consequence:

- A teaches scope and gives value before typing.
- B feels unfinished.
- C blurs search/actions.
- D blurs Search/Geni.

### DECISION SEARCH-05 - Private and Hidden Content

A. Exclude Drafts/Trash/Archive by default, add explicit filters later.
B. Include all accessible content by default.
C. Include private Drafts for owner by default.
D. Never include hidden content in global Search.

Recommendation: A.

Consequence:

- A balances safety and future expansion.
- B creates surprise.
- C requires strong privacy labeling.
- D may limit recovery workflows later.

### DECISION COMBO-01 - Combined Architecture for P2

A. Open grid Quick Actions + Home/header Search bar.
B. Open grid Quick Actions + header magnifier.
C. Module-aware Quick Actions + Search bar.
D. Launcher hybrid with Search and actions.

Recommendation: A.

Consequence:

- A is clear, low-risk, and aligns with current architecture.
- B is lower visual cost but less discoverable.
- C is better later when Inventory matures.
- D is powerful but overbuilt for current scope.

---

## 16. Limitaciones Del Research

- Several modern design-system pages require JavaScript, so Material and Apple HIG component pages are used as pattern references rather than detailed quoted evidence.
- App Store pages for OurHome and Maple were rate-limited during automated access; this report therefore does not rely on them for detailed conclusions.
- Inventory/pantry app evidence is weaker than task/search evidence because official help pages are less consistently accessible. The Inventory recommendations are therefore anchored primarily in HomePlus's verified internal capability inventory and general contextual-action patterns.
- This research did not include live user testing, telemetry, accessibility audit, prototype validation, or implementation cost estimation beyond qualitative product/architecture risk.
- The report does not define backend contracts, search indexes, ranking algorithms, UI components, or navigation contracts.

---

## 17. Proximo Paso

Proceed to P2 only after the user selects the relevant decisions above.

Recommended P2 preparation:

- Choose QA layout and initial catalog.
- Choose Search entry and initial result scope.
- Define product rules for excluded scopes: Presets, Drafts, Trash, Archive.
- Define canonical navigation destinations for each Search result type.
- Estimate backend/search effort separately before implementation.

---

## Bibliografia

All sources consulted on 2026-08-02 unless noted otherwise.

- FamilyWall official site, family dashboard, calendar, shopping lists, to-dos, meal planner, location, messaging: https://familywall.com
- Cozi official site, family organizer overview: https://www.cozi.com
- Cozi features overview, calendar, to-dos, shopping lists, recipes, Today: https://www.cozi.com/feature-overview/
- Todoist Help, Introduction to tasks, Quick Add, Dynamic Add button, keyboard shortcuts, task actions: https://todoist.com/help/articles/introduction-to-tasks
- Todoist features, capture, Quick Add, filters, collaboration, activity history: https://todoist.com/features
- Things Support, Quick Find search/navigation, pull-down search, Continue Search, keyboard access: https://culturedcode.com/things/support/articles/2803584/
- Things Support index, feature categories including Quick Find, Siri, Shortcuts, gestures, keyboard shortcuts: https://culturedcode.com/things/support/
- Notion Help, Search in workspace, Command Search, recents, AI, filters, database search: https://www.notion.com/help/search
- Notion Help center and product navigation references: https://www.notion.so/help/guides
- Microsoft To Do help and learning, lists, tasks, My Day, integrations: https://support.microsoft.com/en-us/todo
- Trello Guide, boards, templates, Inbox, Planner, automation, collaboration: https://trello.com/guide
- Google Calendar Help, Search on Calendar, create/edit events, tasks, offline, accessibility: https://support.google.com/calendar
- Google Search Help, filters, privacy, history, AI modes, connected apps: https://support.google.com/websearch
- Google Home/Nest Help, connect smart devices, Add device, rooms, linked services, voice sync: https://support.google.com/googlenest/answer/9159862
- Google Family Link Help, account management, screen time, app permissions, location, child context: https://support.google.com/families/answer/7101025
- Microsoft Family Safety Support, family roles, limits, restrictions, activity reporting: https://support.microsoft.com/en-us/account-billing/getting-started-with-microsoft-family-safety-b6280c9d-38d7-82ff-0e4f-a6cb7e659344
- Apple iPhone User Guide, Search on iPhone, quick actions, Home app, accessibility ecosystem: https://support.apple.com/guide/iphone/search-on-iphone-iph3c511548/ios
- Apple iPhone User Guide, Intro to Home, rooms/scenes/automations/accessories: https://support.apple.com/guide/iphone/intro-to-home-iph22d98bbca/ios
- Apple Developer Documentation, Search fields reference page, JS-rendered: https://developer.apple.com/design/human-interface-guidelines/search-fields
- Material Design 3, Floating Action Button component page, JS-rendered: https://m3.material.io/components/floating-action-button/overview
- Material Design 3, Search component page, JS-rendered: https://m3.material.io/components/search/overview
