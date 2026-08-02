# Planner V1 — M11 UX/UI Freeze Contract

**STATUS:** **FROZEN**  
**HUMAN APPROVAL:** **APPROVED**  
**ORIGINAL FREEZE DATE:** 2026-07-22  
**LATEST APPROVED REVISION:** 2026-08-02  
**APPROVED CHANGE:** CR-M11-11A-GLOBAL-SURFACES-001  
**CANONICAL FUNCTIONAL AUTHORITY:** `PLANNER_V1_M11_FUNCTIONAL_FREEZE.md` (version 1.3)  
**FUNCTIONAL FREEZE:** **APPROVED**  
**IMPLEMENTATION:** **NOT YET AUTHORIZED**

## Authority and freeze protection

This contract protects the freeze, but the normative functional content lives
in `PLANNER_V1_M11_FUNCTIONAL_FREEZE.md`. When this contract or an older M1–M10
artifact differs from that document, the canonical functional freeze prevails.

Final authority order:

1. `PLANNER_V1_M11_FUNCTIONAL_FREEZE.md` — canonical functional authority;
2. `PLANNER_V1_M11_FINAL_DECISION_REGISTRY.md` — decision record and traceability;
3. this UX/UI Freeze Contract — freeze protection and change control;
4. `PLANNER_V1_M11_APPROVAL_PACKET.md` — human-approval evidence;
5. proposals, matrices, research and audits — historical or technical sources.

Historical decisions below remain for traceability. The following conflicts are
**SUPERSEDED BY CANONICAL FUNCTIONAL FREEZE**:

- Task rows: no permanent overflow and no long press;
- entity tap: Detail is the default destination, not Edit;
- Calendar Month: one numeric badge per day, not multiple dots or `+n`;
- visible product term: `Planes`, not `Metas` or `Goals`;
- Plan progress: composable real indicators, never one exclusive progress model
  or a universal percentage.

No technical limitation permits silent simplification. Every functional change
requires an approved change request and corresponding authority updates. Future
implementation may proceed only through separately approved submilestones. This
documentation task authorizes no code, migrations, dependencies, UI changes or
refactors. M11.1A requires a separate prompt after the documentation commit.

## Global invariants

1. Normal state is visually silent; at most one exceptional indicator per row.
2. Every frequent action is visible; gestures are redundant accelerators.
3. Destructive actions are never full-swipe and require labeled context plus existing confirmation semantics.
4. Data remains visible during refresh/stale/offline/partial error whenever valid data exists.
5. No user-visible technical code, raw error, entity ID or stack.
6. No title, description, name, location, query, note, token, ID, raw error or screenshot in telemetry.
7. Targets: Android 48 dp, iOS 44 pt; text/reflow accepted at 320 dp and font scale 1.0/1.3/1.6/2.0.
8. Reduce Motion removes scale/translation/collapse, never information or feedback.

## D1–D10 — Visual direction

| D | Rule / surface / behavior | States and resilience | Accessibility / motion / feedback | Acceptance and required test |
|---|---|---|---|---|
| D1 | Quick Actions = full-surface tiles Tarea/Event/Meta; 3→2+1→1 reflow; capability items hidden/reflowed. **SUPERSEDED BY CANONICAL FUNCTIONAL FREEZE:** `Meta` is historical; use `Plan`. | idle/pressed/busy/disabled/error; 0 actions prevents empty sheet | full-cell target/label; press 80; sheet 160–180; reduced no transform | 0–3 capabilities, 320 dp, 2×, Back, TalkBack, duplicate tap |
| D2 | Task row action-first: leading action, title, due·assignee, max one exception, overflow; body→Detail. **SUPERSEDED BY CANONICAL FUNCTIONAL FREEZE:** no permanent overflow and no long press. | normal/overdue/high/verify/completed/cancelled/dense/offline/skeleton | max 3 focus targets; autoheight; local busy/rollback | complete/detail 1 tap; all state screenshots + TalkBack/2× |
| D3 | Event row time-first; body→Detail; no inline Edit/Cancel/Trash | normal/all-day/recurring/cancelled/simultaneous/offline | chronological label/order; no color-only | dense 48 dp; recurrence/capability/2× tests |
| D4 | Goal progress-first; next milestone/target; scope conditional; terminal actions contextual. **SUPERSEDED BY CANONICAL FUNCTIONAL FREEZE:** use `Plan`; no exclusive progress mode or universal percentage. | active/personal/household/completed/closed/no milestone/offline | accessible progress value; determinate 180 or instant | historical test intent only; canonical Plan indicators prevail |
| D5 | Chip only interactive; status indicator only exceptional; 0 normal/max1 exception | exception priority verify>overdue>high | selected/disabled semantic; 48 dp | audit all 51 uses; no passive chip survives |
| D6 | One primary filter + `Filtrar (n)` sheet; Calendar views excluded | 0/1/many, empty filtered, refresh/offline/household | expanded/selected; focus return; 2× sheet | secondary filters ≤2 taps; restore/persist tests |
| D7 | Month numbers + max2 dots/`+n` + agenda; Week strip; Day agenda. **SUPERSEDED BY CANONICAL FUNCTIONAL FREEZE:** Month uses one numeric `0/1–9/9+` badge, not multiple dots. | 5/6 weeks, boundaries, empty/dense/stale | cell date/selected/today/count; 140 selection | zero clipping 320 dp/1–2×; grid TalkBack |
| D8 | Quick essential + one disclosure; Full expanded; Edit dirty/busy; no new fields | invalid/saving/success/safe error/uncertain/conflict | focus/error/busy; keyboard-safe; disclosure 180 | no indefinite saving; duplicate/timeout/draft/2× tests |
| D9 | One Detail primary; contextual in menu; destructive last+confirmation. **SUPERSEDED BY CANONICAL FUNCTIONAL FREEZE:** tap always opens Detail before Edit; Task rows do not use long press. | state/capability/conflict/forbidden/not found/offline | menu focus/return, contextual label; no gesture-only | action matrix for three objects; Back/focus tests |
| D10 | Functional motion budgets 80/140/160–180/180–240 ms | interruption/rollback/error/household generation | reduced no transform/collapse; haptic only threshold/context/outcome | low-end, reduced, interruption; no motion >240 ms |

## D11–D20 — Interaction and efficiency

| D | Rule / surface / behavior | States and resilience | Accessibility / motion / feedback | Acceptance and required test |
|---|---|---|---|---|
| D11 | Task: visible leading action; right partial=same frequent action; left partial=More; body=Detail | denied no dead reveal; verify partial only; terminal no commit | overflow/custom actions equivalent; up-event abort | vertical/system Back conflict, directions, cancellation, one-hand, TalkBack |
| D12 | Event/Goal no swipe commit; Milestone visible completion only; long press may mirror overflow. **SUPERSEDED BY CANONICAL FUNCTIONAL FREEZE:** `Goal` means `Plan`; the general long-press model is historical. | capability/offline filter commands | visible tap paths always | horizontal swipe executes nothing; canonical surface tests prevail |
| D13 | Full swipe only eligible Task complete, 70% threshold, release commit, Undo gated | no verify/destructive/restore/reopen; offline/inverse gates | visible action+custom action; threshold haptic once; reduced no collapse | 69/70/100%, retreat, rollback, capability, TalkBack |
| D14 | **SUPERSEDED BY CANONICAL FUNCTIONAL FREEZE:** the general list-row long-press policy is historical and is not part of frozen Planner V1. | release/cancel no command; Back/household closes | canonical visible and accessibility paths are mandatory | canonical surface-specific interaction tests |
| D15 | Undo only where inverse/rollback exists; one contextual bar, 6s accessibility-adapted | failure auto-restores; uncertain never promises undo | status announced once, no focus steal, 48 dp | timeout, multiple actions, navigation, rollback, screen reader |
| D16 | `+`→tile→Quick Form focus title; Save closes/announces/emphasizes result | draft/error/uncertain/capability/household safe | keyboard/focus/2×; success ≤240 | max2 transitions to input; three objects/runtime |
| D17 | Visible: frequent/safe; contextual: edit/admin; advanced: templates/history; destructive: menu/detail+confirm | state/capability promote only valid primary | labels/targets remain at 2× | exactly one primary, no prominent destructive |
| D18 | One inline swipe hint after first visible Task completion; dismiss once; no modal | wait for eligible row; suppress error/offline/transition/screen reader | no focus steal; subtle appear/reduced instant | once-only/dismiss/eligibility/household tests |
| D19 | Friction ceilings: complete/verify/detail/filter=1; edit/filter secondary≤2; destructive≤3; Undo=1 | errors do not require re-entry; denied has no dead path | ceilings never override safety/a11y | runtime task scripts measure taps/gestures |
| D20 | Visual press always; haptic only selection optional, context-open, threshold, final outcome | no hardware dependency; exactly once | no custom vibration; independent announcement | disabled/re-render/reduced/platform haptic tests |

## D21–D36 — Integral closure

| D | Rule / surface / behavior | States and resilience | Accessibility / motion / feedback | Acceptance and required test |
|---|---|---|---|---|
| D21 | L1–L5 attention: normal silent, relevant understood, exceptional visible, actionable recognized, advanced deferred | valid data survives errors/transition | visual and reading order match | first-attention screenshot + TalkBack audit |
| D22 | Comfortable flat rows; meaningful sections; dense drops metadata, not targets/type | filtered empty vs dataset empty; position preserved | headings, autoheight, no horizontal list scroll | 20+ item dense and section navigation tests |
| D23 | Compact AppTopBar/heading; role plain; tabs no outer card; behavior unchanged | readiness/error/persistence preserved | selected semantic; sticky not obscure focus | height, scroll/focus, Back, persistence, 2× |
| D24 | Spacing/surfaces tokens; one containment; elevation only plane changes | narrow reduces padding before target | safe area/keyboard/rhythm 4/8 | token audit + visual diff, no ad-hoc stacks |
| D25 | Type roles; title ≥2 lines/autoheight; remove L3 before truncating L1/L2 | long strings/errors/dates | scalable type, contrast, full label | pseudo-long, 320 dp, 1–2×, TalkBack |
| D26 | Neutral dominates; one terracotta anchor; max one semantic; icon+label; elevation rare | exception priority, disabled/focus | 3:1 UI, 4.5:1 text, no color-only | contrast/grayscale/state combination tests |
| D27 | Date period/arrows/Today visible; select updates agenda; no new route | boundary/stale/household/recurrence | chronological focus, 48 dp, 140/instant | boundaries, today, simultaneous/all-day/tasks |
| D28 | Quick/Full/Edit; defaults visible if interpretive; templates advanced and never automatic | incompatible/denied hidden; manual input protected | selection/focus/keyboard/2× | default/template/override/draft tests |
| D29 | initial skeleton; refresh keep; offline/stale banner; partial inline; fatal/state-specific safe | M2 priority/lifecycle | live exactly once; no raw code/shake | full state matrix per consumer |
| D30 | One Home Planner block: ≤3 Tasks, ≤3 Events, 1 Goal; section error replaces only failed section. **SUPERSEDED BY CANONICAL FUNCTIONAL FREEZE:** `Goal` means `Plan`; no exclusive progress projection may redefine the Plan. | one-tap rollback; stale/household safe | headings/rows/2×/local announce | all partial combinations; zero contradiction/code |
| D31 | name/role/value/state; gesture actions mirrored; focus return; error/status once | 0–3 capabilities, keyboard, menus/sheets | TalkBack mandatory; VoiceOver release gate | screen-reader scripts per M11-D block |
| D32 | 320 dp and font 1/1.3/1.6/2; prescribed component reflow; no fixed heights | landscape/tablet max-width; keyboard/safe area | no clipping/overlap | screenshot matrix every key surface |
| D33 | platform-native recognition/menu/haptics; Android yields system Back; iOS preserves system gestures | mouse/keyboard/tablet visible alternatives | 48 dp Android/44 pt iOS | predictive Back, one-hand, VoiceOver/iOS release QA |
| D34 | feedback ≤100 ms; preserve data/layout; local busy; terminal success/error/uncertain | slow/offline/duplicate/conflict/late response | busy semantics; reduced no collapse | 0/500/5k/timeout latency and rollback |
| D35 | self-evident base + contextual hint; advanced always refindable; no tutorial/gamification | dismissed stays dismissed; suppress on error | screen reader gets direct actions | first/returning/dismissed/no-block tests |
| D36 | allowlisted categorical telemetry only; forbidden content list absolute | telemetry failure silent; lifecycle clears context | no disability inference/content logs | allowlist/forbidden canary/raw-error tests |

## P0 gates

- **P0-1:** D7/D27/D32 must pass zero-clipping Calendar matrix before Calendar block PASS.
- **P0-2:** D8/D15/D34 must prove terminal submit state, duplicate lock/idempotency continuity and safe uncertain recovery before Forms PASS.
- **P0-3:** D29/D30/D36 must prove no contradiction or technical code in every Home partial combination before Home PASS.

No M11-D/F block may declare PASS while its applicable P0 or mandatory quality rule is failing.

---

## Global Surfaces — Frozen visual contract (CR-M11-11A-GLOBAL-SURFACES-001, approved 2026-08-02)

This section freezes the structure, behavior and states — not final colors or
decorative visual style (those belong to 11C). It is binding for all
implementation.

### GS-V1 — Quick Actions + Search surface

- One single surface reached from the central bottom-navigation button.
- Top: `Buscar en HomePlus...` search bar. Tapping it opens full-screen Search;
  the sheet closes or transitions to Search.
- Below: open grid of Quick Actions — no permanent cards, no borders, no
  chevrons, no subtitles, no metadata.
- Grid order: Tarea → Evento → Plan. Fixed; no auto-reorder.
- Cell: distinct icon + short label, full cell tappable, pressed/focus visible,
  accessible reflow (3→2+1→1 columns).
- Geni enters as fourth cell only when implemented; no disabled placeholder.
- No Inventory mutations, Templates, Drafts, Search-as-tile, or
  Lifecycle/Trash/Archive actions in this surface.
- Phone: bottom sheet grid. Tablet: centered sheet, do not stretch full width.

### GS-V2 — Global Search

- Full-screen Search activated from the Quick Actions + Search surface.
- Initial state: recents (per-user, privacy-scoped) + module chips.
- Results grouped by module/entity; no unified single ranking.
- Each result: type icon, title, essential metadata; tap opens canonical Detail.
- Do not: render inline Detail inside Search, duplicate Planner Search, create
  parallel forms, or show hidden content in default search.
- Hidden content contexts: explicit `Activos`/`Archivados`/`Papelera` chips;
  never silently mix with active results.
- Archived result: `Archivado` indicator + archive context + `Desarchivar`
  where applicable.
- Trash result: `En Papelera` + retention time + recovery context (Restaurar,
  Eliminar definitivamente only to coordinator). Never opens normal operational
  Detail.
- Inventory excluded from initial Search scope.

### GS-V3 — Attention + Activity surface

- Entry: icon in AppTopBar with badge (count of unresolved Attention).
- Opens full screen with two tabs: `Atención` | `Actividad`.
- Attention:
  - Persists until valid resolution (read/view do NOT resolve).
  - Deduplicated by problem or entity.
  - One primary action + `Abrir`.
  - Grouped by prioritized order: importance/impact, decision proximity,
    temporal proximity, recency among equivalents.
  - Empty state: `Nada requiere tu intervención.`.
  - Badge counts unresolved Attention items for the current person + household.
- Activity:
  - Chronological timeline, no unread/new-dot/Marcar todo Leído/Badge.
  - Grouped by day, then entity, then process.
  - NO navigation, keystroke, screen-visit, routine-sync or technical logs.
  - No inline mutations; tap opens canonical destination.
  - Geni confirmed process: one grouped row with `Ver proceso` showing
    author+order per step. Never 3 independent rows for one operation.
  - Failed/uncertain Geni process: never appears as success; remains or returns
    to Attention.
- Inventory excluded from both tabs in P4.

### GS-V4 -- Global Trash

- Location: `More ▸ Papelera`.
- Local entries (Planner→Trash filtered to Planner, Tasks→Trash filtered
  Tasks, etc.) lead to the same surface with pre-applied filters.
- Filters: module, entity type, `fecha de eliminación`, remaining time scope.
- Row shows: entity type, title, key metadata, retention copy (human format):
  - `Se eliminará el 26 de agosto · quedan 24 días`
  - `Se eliminará mañana`
  - `Se eliminará hoy`
- Row actions per entity: `Restaurar` (anyone with permission), `Eliminar definitivamente` (coordinator only).
- Drafts do NOT appear in Trash.
- Inventory Items appear only when the complete Inventory Trash contract
  (restore + visual) is implemented.
- Empty State: `No hay elementos eliminados recuperables.`
- Empty Trash button: coordinator-only, shows count and entity types, explicit
  confirmation, cannot-undo warning, never offline. Tolerates partial failure;
  failed items remain visible with success/failure distinction.
- Do NOT: show permanent delete or Empty Trash on active entities, Home,
  Attention, Activity, or default Search.

### GS-V5 -- Archive contextual

- Archive is per-module and not a single global screen in V1 of Global
  Surfaces.
- Each archivable entity (Tasks, Events, Plans, Presets, Inventory)
  has its own contextual Archive screen.
- Archived entity in Search: `Archivado` indicator + opens Archive context
  (not normal operational Detail).
- Archive does NOT change entity's operational state (complete, completed,
  closed, cancelled remain as-is).
- Unarchive returns entity to its previous state; `Mover a Papelera`
  available per permissions.
- Inventory Archive: approved functional result but waits for Inventory
  polish/contract.. Not implemented until Inventory restore and visual
  readiness is confirmed.

### GS-V6 -- Draft discard

- `Descartar borrador` = immediate and definitive.
- NO `Eliminar`, `Mover a Papelera`, or `Restaurar borrador eliminado`.
- Confirmation before discard if the Draft has meaningful content.
- Self-cleared from local storage; no backend commit required for discard.

### GS-V7 -- Permanent delete + Empty Trash confirmation

- Permanent Delete = `Eliminar definitivamente`:
  - Only inside Trash surface.
  - Shows entity title + type + remaining retention + cannot-undo warning.
  - Requires explicit button press (not swipe or quick gesture).
  - Not offline to the backend.
- Empty Trash = `Vaciar Papelera`:
  - Tells count + entity types.
  - Explicit confirmation.
  - Not offline to backend.
  - Partial failure: remaining visible + distinguished from successes.

### GS-V8 -- Phone / Tablet mirrors

- Phone:
  - Home: single-column.
  - Quick Actions: accessible bottom sheet.
  - Search / Trash / Attention+Activity: full-screen.
  - Contextual Archive: full-screen.
- Tablet:
  - Home may use 2 columns, no priority change.
  - Search: overlay or split.
  - Attention+Activity: list + detail.
  - Trash: filters + list + recovery context.
  - Same visible capabilities as phone.

### GS-V9 -- Accessibility

- Android minimum 48 dp hit target; iOS minimum 44 pt.
- Dynamic Type reflow not clipping.
- Screen-reader announces complete labels including counts, dates, consequences.
- Focus order logical, not based on position only.
- Destructive confirmations have accessible alternatives and announce "no se
  puede deshacer"/"restauración posible" appropriately.
- Badge icon has semantic accessibility label.
- Offline/stale state announced to screen reader.
- `Reducir movimiento` stops non-essential / pathological motion + scale/translation collapses.
- Purge date announced as readable date, not technical string.

### GS-V10 -- States (empty / loading / error / offline / partial)

- Offline/stale: Header warns once per surface; data stays visible when possible.
- Partial failure: Module-level failure banner with `Reintentar` per failing
  source, healthy sections remain.
- Empty states: Zero-content helpful descriptive text (e.g. `No hay tareas,`, `No
  hay elementos eliminados recuperables.`); always a direct route to the
  canonical module's create/access point.

### GS-V11 -- Privacy labels

- Personal content never filtered into household feed.
- Coordinator does not auto-gain personal private content.
- Household switch resets search recents, filters, badges, hidden-content
  states.
- Geni always identified in Attention/Activity.
- Drafts always owner-only and do not appear in any global surface.
