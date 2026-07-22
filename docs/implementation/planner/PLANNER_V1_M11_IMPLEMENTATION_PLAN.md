# Planner V1 — M11-D/F Proposed Implementation Plan

**Status:** planning only; implementation not authorized.  
**Global dependency:** human approval of the final Approval Packet and freeze contract.  
**Invariant:** each block preserves M1–M10 functional contracts and can be rolled back independently.

## M11-D0 — P0 correctness recovery

| Field | Plan |
|---|---|
| Decisions | D7, D8, D29, D30, D32, D34, D36 |
| Scope/files | Calendar screen/components; Task/Event/Goal submit presentation and sheet host; `HomePlannerSections.tsx`; error adapter/parser tests. Services/contracts only inspected unless a separately authorized correctness fix is unavoidable. |
| Dependencies | none new; existing idempotency/cache/error contracts |
| Risks | accidental behavior change; duplicate writes; Month fix regressions; Home valid sections lost |
| Tests | P0 matrices: Calendar 320 dp/1–2×/5–6 weeks; submit 0/500/5k/timeout/double tap/late success; all Home partial permutations/no raw code |
| Runtime | Android audited emulator + controlled local dataset; slow/offline simulation; screenshot/TalkBack |
| PASS | P0-1/2/3 closure criteria all green, M1–M10 focused regression, product state consistent |
| Rollback | revert each P0 slice independently; preserve existing contracts/data; feature presentation can fall back to current surface while no duplicate/corrupt state remains |

## M11-D1 — Component foundation and Quick Actions

| Field | Plan |
|---|---|
| Decisions | D1, D5, D10, D17, D20, D24–D26, D31, D32 |
| Scope/files | `QuickActionsMenu.tsx`, visual chrome in `PlannerSheetHost.tsx`, theme/shared Planner primitives, `AppButton` reuse |
| Dependencies | approved D1; D0 P0 submit state available for form transition |
| Risks | new primitives become mega-component; surface inflation; capability reflow gaps |
| Tests | 0–3 capabilities, press/busy/error, 320 dp/2×, TalkBack order, Reduce Motion, Back/focus |
| Runtime | Android + visual snapshots; iOS later F1 for platform parity |
| PASS | Quick Actions B matches freeze, no route/service change, no product import from proposals |
| Rollback | keep old QuickActions presentation behind same catalog/host; remove only new visual composition |

## M11-D2 — Shell, tabs, filters and lists

| Field | Plan |
|---|---|
| Decisions | D5, D6, D21–D26, D29, D32–D34 |
| Scope/files | `AppTopBar.tsx`, visual layer of `PlannerScreen.tsx`/`HomeTabNavigator.tsx`, filter controls/sheet, list/metadata/status primitives |
| Dependencies | D1 primitives; M6/M7 behavior frozen |
| Risks | sticky focus obstruction; tab persistence regression; filters lose state/discoverability |
| Tests | tab persistence, household transition, filter 0/1/many, dense/empty/refresh/offline, 320 dp/2×, focus/Back |
| Runtime | Android scrolling/focus/TalkBack; performance with 20+ rows |
| PASS | first actionable content visible, tabs behave identically, secondary filters ≤2 taps |
| Rollback | restore existing shell/filter composition without reverting shared accessible state primitives |

## M11-D3 — Tasks, gestures and Task Detail

| Field | Plan |
|---|---|
| Decisions | D2, D5, D9, D11, D13–D15, D17–D22, D31–D35 |
| Scope/files | `PlannerTasksScreen.tsx`, `TaskDetailScreen.tsx`, `PlannerTrashScreen.tsx`, Task row gesture wrapper/menu/Undo presentation |
| Dependencies | D2/D11/D13/D15 approvals; D0 submit/feedback; D2 list primitives |
| Risks | gesture/system Back conflict; accidental full swipe; rollback race; focus complexity |
| Tests | complete/verify/denied/terminal matrices, 69/70/100% threshold, abort, vertical scroll, predictive Back, offline/rollback/Undo, long press parity, once-only hint, 2×/TalkBack |
| Runtime | Android one-hand, screen reader, slow network, dense list; iOS swipe/context menu in F1 |
| PASS | visible controls sufficient; no destructive full swipe; full swipe reversible; all friction ceilings met |
| Rollback | disable gesture layer/full swipe/hint independently; retain visible row/action/detail improvements |

## M11-D4 — Calendar, Events and Event Detail

| Field | Plan |
|---|---|
| Decisions | D3, D7, D9, D12, D17, D22, D25–D27, D29, D31–D34 |
| Scope/files | Calendar screen/components, Event rows/detail, no route/recurrence semantics changes |
| Dependencies | P0-1 closed in D0; shared rows/states from D2 |
| Risks | Month clipping recurrence; locale/boundary bugs; mixed Task/Event focus order |
| Tests | Day/Week/Month/agenda, 5/6 weeks, today/selected, all-day/recurring/cancelled/simultaneous, dated Tasks, offline/stale, 320 dp/2×, TalkBack |
| Runtime | audited Android resolution plus narrow and large type; performance on dense month |
| PASS | zero clipping, chronological agenda, no inline destructive cluster, D7 friction/accessibility met |
| Rollback | view-specific visual rollback; Calendar navigation/state remains untouched |

## M11-D5 — Goals, Milestones and Goal Detail

| Field | Plan |
|---|---|
| Decisions | D4–D6, D9, D12, D14, D17, D21–D26, D28–D32 |
| Scope/files | `PlannerGoalsScreen.tsx`, `GoalDetailScreen.tsx`, Goal/Milestone rows/progress/menu |
| Dependencies | shared rows/filters; D4 approval |
| Risks | scope hidden when material; progress semantics mismatch; Close confusion |
| Tests | personal/household mix, no milestones, progress states, completed/closed/reopen, capability/offline, long press parity, 2×/TalkBack |
| Runtime | Android dense list/detail and milestone mutations |
| PASS | progress-first, scope conditional correct, Close/Delete contextual, progress accessible |
| Rollback | restore Goal presentation per screen; keep shared primitives where safe |

## M11-D6 — Forms and natural capture

| Field | Plan |
|---|---|
| Decisions | D1, D8, D16, D19, D25, D28, D31–D35 |
| Scope/files | `TaskForm.tsx`, `EventForm.tsx`, `GoalForm.tsx`, sheet chrome/focus, existing template entry only |
| Dependencies | P0-2 closed; Quick Actions D1; D8/D28 approvals |
| Risks | draft loss; keyboard CTA overlap; default/template surprise; submit regression |
| Tests | Quick/Full/Edit, essential/advanced, validation, keyboard/Back, default/template/manual override, success/error/uncertain/conflict, duplicate tap, household change, 2×/TalkBack |
| Runtime | Android keyboard variants, slow/offline, three object types |
| PASS | natural capture ceilings; no new fields; every submit terminal and announced; no duplicate risk |
| Rollback | mode-by-mode presentation rollback; retain D0 correctness lock/state |

## M11-D7 — Home Planner Summary

| Field | Plan |
|---|---|
| Decisions | D2–D4, D5, D17, D21–D26, D29–D34 |
| Scope/files | `HomePlannerSections.tsx`, shared rows/progress/status/error presentation |
| Dependencies | P0-3 closed; Task/Event/Goal primitives stable |
| Risks | one-tap regression; partial error hides valid section; Home height inflation |
| Tests | all section outcome combinations, empty/ready/stale/offline, one-tap busy/rollback, capability/household, 2×/TalkBack |
| Runtime | Android Home with controlled mixed dataset and slow network |
| PASS | no contradiction/raw code; valid sections remain; object hierarchies match Planner |
| Rollback | Summary presentation rollback only; M8/M9 request/cache/one-tap contracts untouched |

## M11-F1 — Accessibility and responsive validation

| Field | Plan |
|---|---|
| Decisions | D1–D9, D11–D18, D21–D33 |
| Scope/files | test fixtures/scripts/docs and minimal presentation fixes discovered; no new features |
| Dependencies | D1–D7 implementation blocks integrated |
| Risks | late structural reflow changes; iOS-specific issues |
| Tests | TalkBack complete; VoiceOver where supported; 320 dp, 1/1.3/1.6/2×; contrast; targets; focus; keyboard; predictive Back; accessible actions |
| Runtime | Android mandatory; iOS mandatory before cross-platform release claim |
| PASS | zero blocker a11y/reflow defects; gesture equivalence; no clipped/obscured focus |
| Rollback | revert offending visual refinement per component, never accessibility semantics to a worse state |

## M11-F2 — Motion, haptics and feedback

| Field | Plan |
|---|---|
| Decisions | D10, D13–D15, D20, D29, D34 |
| Scope/files | shared motion/feedback/haptic layer and component state transitions |
| Dependencies | stable interactions and D10 approval; no dependency install |
| Risks | duplicate haptics, animation races, low-end jank |
| Tests | budgets, exactly-once, interruption, threshold, rollback, reduced motion, unavailable hardware, low-end profiling |
| Runtime | physical device recommended for haptics; emulator for state/motion |
| PASS | no input delay/jank/loop; reduced path complete; haptics semantic and nonessential |
| Rollback | disable haptic/motion per token/feature while preserving immediate visual state |

## M11-F3 — Telemetry, runtime and visual closure

| Field | Plan |
|---|---|
| Decisions | D19, D34–D36 and all acceptance criteria |
| Scope/files | existing telemetry catalogs/adapters/tests, final runtime evidence/docs; no external provider |
| Dependencies | separate authorization for any new allowlisted events; all prior blocks PASS |
| Risks | content/ID leakage; metrics change behavior; false closure from emulator-only QA |
| Tests | allowlist/forbidden canaries, raw error/content strings, friction/duration buckets, runtime full states, screenshot diff, proposal-import scan |
| Runtime | Android controlled dataset; iOS release gate; slow/offline/household/roles |
| PASS | privacy contract green, D1–D36 acceptance evidence linked, no P0/P1 blocker, no proposal imports |
| Rollback | remove new telemetry events/adapters without affecting UI; retain closure evidence |

## Sequence gate

`D0 → D1 → D2 → D3/D4/D5 → D6 → D7 → F1 → F2 → F3`.

D3/D4/D5 may run independently only after shared foundations stabilize. No block authorizes M12, dependency installation, navigation changes, migrations, commit or push.
