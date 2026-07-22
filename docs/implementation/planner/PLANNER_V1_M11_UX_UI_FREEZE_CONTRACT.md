# Planner V1 — M11 UX/UI Freeze Contract

**STATUS:** **FROZEN**  
**HUMAN APPROVAL:** **APPROVED**  
**FREEZE DATE:** 2026-07-22  
**CANONICAL FUNCTIONAL AUTHORITY:** `PLANNER_V1_M11_FUNCTIONAL_FREEZE.md`  
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
