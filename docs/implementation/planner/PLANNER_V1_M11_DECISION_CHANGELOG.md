# Planner V1 — M11-C2 Decision Changelog

**From:** M11-A/B/C discovery package  
**To:** M11-C2 final decision audit  
**Functional changes:** none.  
**Product implementation:** none.

## D1–D10 revalidation

| D | Previous proposal | New evidence / conflict | Final change | Preview | Acceptance delta |
|---|---|---|---|---|---|
| D1 | B full-surface tiles | D16 natural capture, D19 friction, D32 2× | KEEP + formalize focus-title, 0–3 capability reflow, no empty sheet | Quick alternatives + gesture lab | add 2×, duplicate tap, 0 actions |
| D2 | action-first flat Task row | D11–D15 gestures/Undo; current body→Edit | REFINE: visible action remains; right action/left More; body→Detail | rows + gesture lab | add gesture, rollback, hint, screen reader actions |
| D3 | time-first Event | D12 shows Task gestures would erase distinction | KEEP AS IS; explicitly no swipe commit | rows | add negative gesture/parity tests |
| D4 | progress-first Goal | D12/Milestone analysis | KEEP AS IS; no swipe commit, visible milestone completion | rows | add milestone/menu tests |
| D5 | interactive or exceptional chips | overlapping exceptions | KEEP; add priority verify>overdue>high | rows/matrix | add 51-use enforcement and overlap test |
| D6 | one primary + filter sheet | D18 learning/D19 friction/D32 | REFINE count/summary/refindability and ≤2 taps | screenshots/spec | add focus return, empty filtered, 2× |
| D7 | Month dots/`+n` + agenda | P0-1, D27 temporal, D32 | REFINE: drop dots before date number; formal P0 matrix | Calendar preview | add 320 dp/1–2×/5–6 weeks |
| D8 | Quick/Full/Edit disclosure | P0-2, D16/D28 defaults/templates | REFINE defaults summary, template advanced, terminal submit states | forms/gesture lab | add double tap/uncertain/template/draft |
| D9 | one primary; destructive contextual | D14 long press/equivalence | REFINE long press mirrors overflow exactly | Goal detail/gesture lab | add parity/focus/capability matrix |
| D10 | subtle functional motion | D13 threshold/D20 haptics | REFINE haptic only threshold/context/outcome; remove pre-destructive warning | gesture lab/motion table | add exactly-once/low-end/interruption |

No D1–D10 decision was replaced. D3, D4 and D5 remain intact; seven receive bounded refinements backed by interaction, accessibility or P0 evidence.

## Decisions added and consolidated

| Range | Change | Result |
|---|---|---|
| D11–D15 | gesture directions, full swipe, long press, Undo | atajos redundantes; full swipe only Task complete; long press=overflow; Undo contract-gated |
| D16–D20 | natural capture, visibility, learning, friction, haptics | fast path explicit; one hint; measurable tap ceilings; semantic feedback |
| D21–D26 | attention, lists, shell, surfaces, type, color | prior findings converted to enforceable rules/tests |
| D27–D30 | Calendar temporal, forms/defaults/templates, system states, Home | prior screen proposals consolidated; P0 gates embedded |
| D31–D36 | a11y, responsive, platform, perceived performance, learning, telemetry | mandatory quality/privacy closure and platform test gates |

## P0 gate changes

| P0 | Discovery evidence | C2 freeze consequence |
|---|---|---|
| P0-1 Calendar clipping | screenshots `06`, `40`; default 1080×2400 | mandatory D0; Calendar cannot PASS without zero clipping matrix |
| P0-2 submit stuck after persistence | screenshots `14`, `28`; duplicate synthetic records | mandatory D0; terminal outcome + duplicate lock + uncertain recovery required |
| P0-3 Home contradiction/raw code | screenshots `18`, `31` | mandatory D0; failed section replaces only itself; raw technical code prohibited |

## Human approval delta

Discovery asked D1–D10. C2 asks those same ten plus D11, D13, D15, D18, D23, D28, D30 and D35. The remaining decisions are derived or mandatory quality/privacy rules and do not ask Gabriel to approve defects, baseline accessibility or technical-code exposure.

## Assets

Added:

- `m11-proposals/planner-gesture-lab.html`
- `m11-proposals/planner-gesture-lab.png`
- conversation visualization source `planner-gesture-lab.html`

Existing proposals remain references; no application import is allowed.
