# Planner V1 — M11-C2 Final Approval Packet

**APPROVAL STATUS:** **APPROVED**  
**HUMAN APPROVAL DATE:** 2026-07-22  
**M11 FUNCTIONAL FREEZE:** **COMPLETE**  
**CANONICAL AUTHORITY:** `PLANNER_V1_M11_FUNCTIONAL_FREEZE.md`  
**FUNCTIONAL FREEZE:** **APPROVED**  
**IMPLEMENTATION:** **NOT YET AUTHORIZED**  
**Historical review scope:** final UX/UI direction before M11-D/F implementation  
**Branch / audited commit:** `v1` / `f093bff`  
**Audit date:** 2026-07-18 · Android · controlled fictional dataset  
**Product implementation:** not authorized; this packet changes documentation and isolated previews only.

> **Authority warning:** This Approval Packet preserves the approval summary and
> traceability. It must not be used as the complete functional specification
> when it differs from `PLANNER_V1_M11_FUNCTIONAL_FREEZE.md`; the canonical
> functional freeze prevails.

Final authority order:

1. `PLANNER_V1_M11_FUNCTIONAL_FREEZE.md` — canonical functional authority;
2. `PLANNER_V1_M11_FINAL_DECISION_REGISTRY.md` — decision record and traceability;
3. `PLANNER_V1_M11_UX_UI_FREEZE_CONTRACT.md` — freeze protection and change control;
4. this Approval Packet — human-approval evidence;
5. proposals, matrices, research and audits — historical or technical sources.

No technical limitation permits silent simplification. A functional change
requires an approved change request. Future implementation may proceed only
through separately approved submilestones. This task authorizes no code,
migrations, dependencies, UI changes or refactors; M11.1A requires a separate
prompt after the documentation commit.

## 1. Executive recommendation

Freeze Planner around a quiet, action-first system: compact full-surface Quick Action tiles; flat semantic rows for Tasks and Events; progress-led Goals; one exceptional state at a time; Month as overview plus agenda; progressively disclosed forms; one visible primary action; and subtle functional motion. Gestures are optional accelerators, never the only path. Full swipe is permitted only for reversible Task completion and only after the implementation proves inverse, rollback and Undo behavior.

The original D1–D10 direction remains structurally valid. D1, D2 and D6–D10 receive bounded refinements; D3–D5 remain intact. D11–D36 close interaction, attention, platform, accessibility, learning, perceived-performance and telemetry rules. P0-1, P0-2 and P0-3 are mandatory quality gates, not preference votes.

The preceding recommendation is an approval-time historical summary. The
following earlier models are **SUPERSEDED BY CANONICAL FUNCTIONAL FREEZE**:

- `Goal`/`Meta` as the visible product concept; the frozen term is `Plan`;
- progress-led Goal as one exclusive progress model; Plan uses composable real
  indicators and never a universal percentage;
- multiple Calendar dots or `+n`; Month uses one numeric `0/1–9/9+` badge;
- permanent Task-row overflow and general list-row long press;
- any tap path that opens Edit instead of Detail;
- old lifecycle states, navigation descriptions or partial decisions wherever
  they conflict with the canonical freeze.

Supporting authorities:

- [Final decision registry](PLANNER_V1_M11_FINAL_DECISION_REGISTRY.md)
- [UX/UI freeze contract](PLANNER_V1_M11_UX_UI_FREEZE_CONTRACT.md)
- [Coverage matrix](PLANNER_V1_M11_DECISION_COVERAGE_MATRIX.md)
- [Implementation plan](PLANNER_V1_M11_IMPLEMENTATION_PLAN.md)
- [Decision changelog](PLANNER_V1_M11_DECISION_CHANGELOG.md)
- [External research](PLANNER_V1_M11_EXTERNAL_UX_RESEARCH.md)

## 2. Evidence and previews

The audit evidence remains 30 real runtime screenshots with fictional data. The proposal package now contains 40 isolated assets; none is imported by product code.

| Evidence | Use |
|---|---|
| [`index.html`](m11-proposals/index.html) | annotated current Planner, Forms, Details and Home evidence plus proposal gallery |
| [`quick-actions-alternatives.svg`](m11-proposals/quick-actions-alternatives.svg) | Quick Actions A/B/C |
| [`planner-cards-proposal.svg`](m11-proposals/planner-cards-proposal.svg) | Task/Event/Goal hierarchy |
| [`calendar-month-proposal.svg`](m11-proposals/calendar-month-proposal.svg) | Month density and agenda relationship |
| [`planner-gesture-lab.html`](m11-proposals/planner-gesture-lab.html) | visible action, partial swipes, long press, Undo and state comparison |
| [`planner-gesture-lab.png`](m11-proposals/planner-gesture-lab.png) | static gesture-lab review image |

## 3. Top ten problems and mandatory P0 gate

The highest-impact visual problems are: Month clipping; submit stuck on `Guardando…`; contradictory Home Summary/raw error code; oversized Quick Action rows; excessive passive chips; competing borders/surfaces; Task/Event/Goal visual sameness; multiple equally prominent actions; weak long-content/Dynamic Type behavior; and hidden-state feedback that does not reliably close the user’s action loop.

| Gate | Evidence | Risk and probable cause | Later files | Required tests | Closure criterion | Order / rollback |
|---|---|---|---|---|---|---|
| P0-1 Calendar Month clipping | runtime Month screenshot and audit | unreadable dates/actions; rigid cell geometry plus font/padding assumptions | `PlannerCalendarScreen.tsx`, `PlannerCalendarComponents.tsx` | 320/360/412 dp; 1×/1.3×/2×; locale; 5/6 weeks; event overflow | every date remains legible/tappable; dots disappear before number; no horizontal clipping | M11-D0 first; revert visual geometry atomically if matrix fails |
| P0-2 successful persistence with submit trapped | runtime form evidence | duplicate creation and loss of trust; terminal UI state not reconciled with persisted result | Task/Event/Goal forms and existing mutation adapters, without changing contracts | double tap, delayed response, lost acknowledgement, offline, retry, idempotency | one intent creates at most one entity; busy always terminates; success closes/announces once; uncertain outcome never invites blind duplicate | M11-D0 before form polish; disable new presentation and retain last known-safe submit UI if reconciliation fails |
| P0-3 contradictory Home Summary/raw technical code | Home screenshot | false global empty state and privacy/trust failure; partial-result aggregation plus unsanitized error rendering | `HomePlannerSections.tsx`, existing Summary presentation adapter | partial error, stale+refresh, offline, forbidden/not-found; synthetic code canary | healthy sections remain visible; failing section is local; no technical code/stack/request id/user content appears | M11-D0 before Home redesign; fall back to sanitized generic section error |

No approval is requested for closing these defects, meeting baseline accessibility, protecting privacy or prohibiting technical codes in user-facing UI.

## 4. Decision ledger D1–D36

The ledger is retained as historical approval traceability. Every former
`HUMAN_APPROVAL_REQUIRED` item has final result **APPROVED** as of 2026-07-22,
subject to the canonical freeze and the supersession notes above.

| D | Final recommendation | Change from discovery | Preview / evidence | Main risk | Impact | Class |
|---|---|---|---|---|---|---|
| D1 | full-surface compact tiles; 3 columns, 2+1 at large text/narrow width | refined reflow/focus/0-action rule | Quick Actions SVG | tile chrome becomes another card layer | Quick menu only | APPROVED |
| D2 | flat Task row; leading complete/verify, body→Detail, overflow | refined with optional partial swipe and Undo | rows + gesture lab | focus/gesture conflict | Tasks, Home, Trash | APPROVED |
| D3 | time-first Event row, no swipe commit | kept | rows | long temporal content | Calendar/Home/Detail | APPROVED |
| D4 | progress-first Goal; milestone remains distinct | kept | rows | mixed-scope context | Goals/Home/Detail | APPROVED — HISTORICAL/SUPERSEDED WHERE NOTED |
| D5 | chips only interactive or exceptional; zero on normal row | kept; exception precedence formalized | chip matrix + rows | metadata removal without Detail path | all Planner rows | APPROVED |
| D6 | one primary filter + `Filtrar (n)` sheet | refined for refindability/focus return | screen proposal | secondary filter costs one tap | collections | APPROVED |
| D7 | Month overview: date + up to two markers/`+n`, agenda below | refined with P0 matrix | Calendar SVG | less direct detail in grid | Calendar | APPROVED — HISTORICAL/SUPERSEDED WHERE NOTED |
| D8 | Quick/Full/Edit modes with explicit defaults and terminal submit | refined for templates/P0-2 | forms + gesture lab | hidden advanced value surprises | forms | APPROVED |
| D9 | one primary; contextual overflow; destructive final+confirm | refined long-press parity | Detail evidence + lab | secondary action gains a tap | Details/Trash | APPROVED — HISTORICAL/SUPERSEDED WHERE NOTED |
| D10 | subtle functional motion, reduced-motion fallback | refined haptic boundaries | motion spec + lab | inconsistent adapters | cross-Planner | APPROVED |
| D11 | Task right partial=frequent action; left partial=`Más`; visible equivalents | new | gesture lab | accidental gesture/state mismatch | Task rows | APPROVED |
| D12 | no commit swipe for Event/Goal; milestone visible action; shared menus only | derived from D3/D4/D17 | gesture lab | perceived inconsistency | Event/Goal/Milestone | DERIVED_DECISION |
| D13 | full swipe only eligible reversible Task completion | new restricted policy | gesture lab | false reversibility/duplicate | Task rows | APPROVED |
| D14 | long press mirrors visible overflow exactly, never adds actions | derived from D9/D31 | gesture lab | low discoverability | list rows | DERIVED_DECISION |
| D15 | 6 s base Undo when inverse/rollback exists; adjusted accessibility timeout | new | gesture lab | stale undo/cross-household state | reversible mutations | APPROVED |
| D16 | `+`→tile→Quick Form, focus title, success closes and emphasizes result | derived from D1/D8/D19 | lab + forms | redirect uncertainty | creation path | DERIVED_DECISION |
| D17 | frequent visible; contextual overflow; advanced Detail; destructive confirm | derived from D2/D9 | lab + rows | buried frequent action | all entities | DERIVED_DECISION |
| D18 | one dismissible inline gesture hint after first visible completion | new | gesture lab | coaching noise | Tasks | APPROVED |
| D19 | measurable tap ceilings; Undo one tap | derived from frequency hierarchy | registry | edge paths exceed budget | navigation within frozen routes | DERIVED_DECISION |
| D20 | visual feedback always; restrained optional haptics at semantic moments | refined D10 | lab + motion spec | haptic fatigue/device variance | interaction feedback | DERIVED_DECISION |
| D21 | normal recedes, relevant reads, exceptional alerts, advanced waits | consolidated | all previews | local exceptions dilute rule | global Planner | DERIVED_DECISION |
| D22 | sectioned flat lists, progressive metadata, stable row geometry | consolidated | rows | density hurts targets | lists | DERIVED_DECISION |
| D23 | lighter header; tabs are sole local-nav surface; stable scroll boundary | refined | audit/screens | accidental route/back change | shell/tabs | APPROVED |
| D24 | 16 dp screen padding, 24 section, 12 row; cards only for grouped meaning | kept/formalized | component spec | token drift | visual system | DERIVED_DECISION |
| D25 | role-based type, max two metadata lines, predictable wrap | refined | rows/calendar | truncation hides essentials | content | DERIVED_DECISION |
| D26 | terracotta for action/selection, semantic status colors, minimal elevation | refined | proposal system | color overload/contrast | theme usage | DERIVED_DECISION |
| D27 | date navigation preserves selected context; Month→agenda | consolidated from D7 | Calendar SVG | temporal disorientation | Calendar | DERIVED_DECISION |
| D28 | essential Quick defaults summarized; templates selectable, not silently applied | refined; template authoring deferred | forms | stale/hidden defaults | create/edit | APPROVED |
| D29 | loading/empty/stale/offline/partial/fatal/conflict have one shared presentation grammar | consolidated | state audit | contradictory composites | all screens | DERIVED_DECISION |
| D30 | Home shows one next action per entity type; section-local errors; one-tap Task | refined with P0-3 | Home evidence | dashboard competition | Home Summary | APPROVED — HISTORICAL/SUPERSEDED WHERE NOTED |
| D31 | semantic labels/states/order; all gestures have tap and accessibility-action parity | consolidated/mandatory | registry + lab | custom action mismatch | all interactions | MANDATORY_QUALITY_RULE |
| D32 | 320 dp and 1×–2× scale; reflow before truncating L1; touch ≥48×48 dp | refined | Quick/Calendar/lab | vertical expansion | responsive UI | MANDATORY_QUALITY_RULE |
| D33 | Android Back closes transient layer first; platform-native focus/keyboard/haptic behavior | refined | registry | cross-platform divergence | shell/forms/sheets | MANDATORY_QUALITY_RULE |
| D34 | stable skeleton geometry; optimistic continuity only with rollback; no indefinite busy | consolidated, P0-2 reinforced | states/forms | misleading optimism | perceived performance | MANDATORY_QUALITY_RULE |
| D35 | contextual, optional, once-only hints; no modal tutorial | refined | gesture lab | hint unseen or annoying | learning | APPROVED |
| D36 | allowlisted metadata only; never titles, notes, raw errors or identifiers | refined/frozen privacy floor | research/registry | content leakage | M11-F3 telemetry | MANDATORY_QUALITY_RULE |

Status totals: 4 `APPROVED_AS_IS`, 21 `APPROVED_WITH_REFINEMENT`, 11 `DERIVED_FROM_APPROVED_DECISION`, 0 replaced, 0 merged, 0 blocked and 0 global out-of-scope decisions. The D28 subcapability “create/edit templates” is deferred because it would add behavior rather than polish existing fields.

## 5. APPROVED — historical questions and resolution

**Resolution:** **APPROVED** on 2026-07-22. The questions below are preserved
only as approval evidence; they are no longer pending requests. Where their
wording conflicts with the canonical freeze, the canonical decision prevails.

1. **D1:** Do you approve compact full-surface Quick Action tiles—three columns at normal width, 2+1 reflow for narrow/large text, hidden unavailable capabilities and no empty menu—as the binding layout?
2. **D2:** Do you approve a flat Task row with visible leading complete/verify, body opening Detail, one exceptional state and contextual overflow, with partial swipe only as a redundant accelerator?
3. **D3:** Do you approve Event as a time-first row—time, title, then duration/location—with no Task-like completion affordance or commit swipe?
4. **D4:** Do you approve Goal as progress-first—direction, progress and next milestone—with normal scope/status silent and destructive actions outside the primary surface?
5. **D5:** Do you approve zero chips on a normal row, reserving chips for interactive controls or one exceptional state and moving passive metadata to plain text or Detail?
6. **D6:** Do you approve one visible primary collection filter plus `Filtrar (n)` for secondary filters, with focus return and ≤2 taps to any secondary filter?
7. **D7:** Do you approve Month as an overview with legible dates, at most two event markers/`+n`, and day detail in the selected-date agenda?
8. **D8:** Do you approve separate Quick/Full/Edit presentation modes, explicit default summaries, advanced existing fields under disclosure and templates only by explicit selection?
9. **D9:** Do you approve one primary Detail action, contextual actions in overflow, destructive actions last with confirmation, and long press mirroring that same overflow?
10. **D10:** Do you approve subtle functional motion—80 ms press, 140 ms selection, 160–180 ms sheets and 180–240 ms state changes—with no decorative motion and reduced-motion fallbacks?
11. **D11:** Do you approve Task-only partial swipes: right reveals the state-valid frequent action, left reveals `Más`, while visible controls remain the primary accessible route?
12. **D13:** Do you approve full swipe only for eligible reversible Task completion, committing on release after a 70% threshold, never for verify/destructive/restore/reopen actions?
13. **D15:** Do you approve a 6-second base Undo for contract-reversible actions, extended by accessibility timeout, with one-tap restore and no cross-household stale Undo?
14. **D18:** Do you approve one dismissible inline gesture hint on the next eligible Tasks visit after a successful visible completion, suppressed for screen readers, errors, offline and transition states?
15. **D23:** Do you approve a lighter AppTopBar and tabs as the only local navigation surface, with visual-only scroll behavior and no route/back-stack change?
16. **D28:** Do you approve explicit Quick Create default summaries and selectable existing templates, while deferring template authoring/editing as out of scope?
17. **D30:** Do you approve Home Planner Summary as three quiet section summaries with at most one next action each, one-tap Task completion and isolated sanitized partial errors?
18. **D35:** Do you approve contextual, optional, once-only inline learning hints with persistent visible/accessibility alternatives and no modal tutorial?

## 6. DERIVED_DECISION

D12, D14, D16, D17, D19, D21, D22, D24, D25, D26, D27 and D29 derive from approved visual hierarchy, frozen M1–M10 behavior, shared Design System rules or measurable acceptance needs. They are not independent preference votes; rejecting one requires identifying the upstream approved decision it conflicts with.

## 7. MANDATORY_QUALITY_RULE

- P0-1, P0-2 and P0-3 close before polish blocks.
- D31 semantic accessibility/equivalent actions, D32 responsive/Dynamic Type floor, D33 platform Back/focus behavior, D34 no indefinite busy and D36 privacy allowlist are non-optional.
- No hidden gesture is the only path. No destructive gesture commits without protection. No technical code appears in user-facing UI.
- Telemetry records only allowlisted interaction metadata and outcome classes; it never records title, note, location, search/filter text, raw error, token or stable person/household/entity identifier.

## 8. OUT_OF_SCOPE

No global D is blocked or deferred. Creating/editing templates, new fields, new routes, search without capability, new domain actions, M12 and changes to M1–M10 contracts remain outside M11-C2. Later implementation may touch the product files listed in the Implementation Plan only after approval; `back/**`, `supabase/**`, navigation contracts, manifests/lockfiles and proposal assets remain untouched/import-free.

## 9. Expected before/after and implementation order

Expected result: fewer competing surfaces; zero normal-state chips; obvious entity distinction; frequent actions at one tap; optional gestures with parity; legible Month at narrow/large text; terminal and trustworthy async feedback; sanitized section-local Home errors; and measurable accessibility/performance behavior.

Proposed order: M11-D0 P0 recovery → D1 foundations/Quick Actions → D2 shell/tabs/filters/lists → D3 Tasks/gestures/Detail → D4 Calendar/Events → D5 Goals/Milestones → D6 Forms/natural capture → D7 Home Summary → F1 accessibility/responsive → F2 motion/haptics → F3 telemetry/runtime/visual closure. Each block has PASS and rollback rules in the [Implementation Plan](PLANNER_V1_M11_IMPLEMENTATION_PLAN.md).

## 10. Approval state

**M11-C2 FINAL DECISION AUDIT STATUS: APPROVED**  
**M11 UX/UI FREEZE STATUS: FROZEN — HUMAN APPROVAL APPROVED**  
**M11 FUNCTIONAL FREEZE STATUS: COMPLETE**  
**M11 IMPLEMENTATION STATUS: NOT YET AUTHORIZED**  
**M12 STATUS: NOT AUTHORIZED**
