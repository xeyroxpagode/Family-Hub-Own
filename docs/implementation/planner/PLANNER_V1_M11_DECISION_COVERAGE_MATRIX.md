# Planner V1 — M11-C2 Decision Coverage Matrix

**Baseline:** `v1` / `f093bff` · 2026-07-18  
**Alcance:** percepción, presentación, interacción física, accesibilidad, aprendizaje, eficiencia, confianza y telemetry de experiencia. M1–M10 permanecen congelados.

## Escala

Cobertura: `COMPLETE`, `STRONG`, `PARTIAL`, `WEAK`, `MISSING`, `FROZEN_BY_M1_M10`, `OUT_OF_SCOPE`.  
Acción: `KEEP`, `REFINE`, `RESEARCH`, `PROTOTYPE`, `MERGE`, `REPLACE`, `FORMALIZE`, `NO_ACTION`.

## Matriz inicial, previa a investigación C2

| D | Evidencia existente | Documento | Preview | Cobertura | Contradicción | Gap | Acción |
|---|---|---|---|---|---|---|---|
| D1 | runtime Quick Actions default/1.3; A/B/C | Quick Actions Proposal; Approval Packet | `quick-actions-alternatives` | STRONG | ninguna | gesto/creation path y 2× | REFINE |
| D2 | Tasks empty/dense/overdue/review + IA | Audit; Hierarchy; Screen Proposal | `planner-cards-proposal` | STRONG | tap actual abre Edit | gestos, undo, busy | REFINE |
| D3 | Calendar agenda real + IA time-first | Audit; Hierarchy; Screen Proposal | `planner-cards-proposal` | STRONG | acciones destructivas inline actuales | gestures/recurrence edge | REFINE |
| D4 | Goals dense/detail + IA progress-first | Audit; Hierarchy; Screen Proposal | `planner-cards-proposal` | STRONG | Close compite con primary | milestone gestures | REFINE |
| D5 | 51 usos clasificados | Chip Reduction Matrix | row proposal | COMPLETE | ninguna conceptual | enforcement tests | FORMALIZE |
| D6 | filtros reales saturados + modelo sheet | Chip Matrix; Screen Proposal | screenshots `20`, `38` | STRONG | métricas/counts duplican filtros | reencontrabilidad/learning | REFINE |
| D7 | Month P0 + Day/Week runtime | Audit; Screen Proposal | `calendar-month-proposal` | STRONG | geometry actual viola spec | interacción temporal y 2× | REFINE |
| D8 | tres forms reales + advanced | Hierarchy; Screen Proposal | screenshots `03/25/32` | STRONG | submit atrapado; draft ambiguo | defaults/templates/capture | REFINE |
| D9 | details/overflow reales | Hierarchy; Screen Proposal | Goal Detail anotado | STRONG | Task tap→Edit; Event inline actions | gesture equivalence | REFINE |
| D10 | durations/reduced motion definidos | Accessibility Motion Proposal | motion table | STRONG | ninguna | gesture-specific feedback | REFINE |
| D11 | swipe reservado; primary visible | Research; Hierarchy | ninguno específico | PARTIAL | completion visible vs swipe potencial | derecha/izquierda por estado | RESEARCH + PROTOTYPE |
| D12 | overflow/detail policy | Hierarchy; Screen Proposal | row proposal | PARTIAL | Event actual expone 3 acciones | gestures por objeto | RESEARCH + PROTOTYPE |
| D13 | swipe no destructivo, alternativa | Research; Hierarchy | ninguno | WEAK | full swipe no cerrado | commit threshold/protection | RESEARCH + PROTOTYPE |
| D14 | long press no tratado | — | ninguno | MISSING | N/A | propósito, discoverability, a11y | RESEARCH |
| D15 | optimistic rollback M1–M10; feedback | Accessibility Motion | state diagram | PARTIAL | undo UI no especificada | scope/duración/stack | RESEARCH + PROTOTYPE |
| D16 | tiles + Quick/Full/Edit | Quick Actions; Hierarchy | Quick Actions preview | STRONG | form actual excesivo | natural capture/defaults | FORMALIZE |
| D17 | taxonomy de acciones | Hierarchy | rows/detail | STRONG | acciones actuales compiten | matriz visible/contextual final | FORMALIZE |
| D18 | progressive disclosure forms | Research; Screen Proposal | ninguno | WEAK | gestures no aprendibles aún | enseñanza no intrusiva | RESEARCH + PROTOTYPE |
| D19 | taps/frequency en research | Research; Audit | ninguno | PARTIAL | no existe budget formal | ceilings por job | FORMALIZE |
| D20 | motion/haptics baseline | Accessibility Motion | motion table | STRONG | haptic de warning preacción es riesgoso | mapa por commit/outcome | REFINE |
| D21 | L1–L5 + regla normal/relevante | Hierarchy; Component System | rows | STRONG | ninguna | contrato compacto | FORMALIZE |
| D22 | flat/sectioned/comfortable | Research; Screen Proposal | rows | STRONG | compact density sin prototipo | reglas de grouping/dense | REFINE |
| D23 | shell/tabs visual-only | Screen Proposal; Audit | screenshots | STRONG | header actual alto | scroll/focus/platform | FORMALIZE |
| D24 | spacing/surfaces/tokens | Component System | todos | COMPLETE | ninguna | test visual | FORMALIZE |
| D25 | type roles + 200% | Component; Accessibility Motion | QA 1.3 | STRONG | falta runtime 2× | truncation/content policy | REFINE |
| D26 | semantic palette/icons/elevation | Component System | previews | STRONG | valores finales no contrastados | acceptance token contrast | REFINE |
| D27 | Day/Week/Month/agenda | Screen Proposal | Calendar preview | STRONG | Month P0 | selection, simultaneous events | REFINE |
| D28 | Quick/Full/Edit, no fields | Hierarchy; Screen Proposal | forms screenshots | STRONG | templates/defaults no formalizados | template placement | REFINE |
| D29 | global state model visual | Audit; Screen; Accessibility Motion | runtime states | STRONG | Home filtra code | consistent state contract | FORMALIZE |
| D30 | Summary hierarchy/partial errors | Audit; Screen Proposal | screenshots `31` | STRONG | P0 contradicción/código | continuity and tap targets | REFINE |
| D31 | TalkBack/focus/equivalence | Accessibility Motion | N/A | STRONG | gestures aún no cerrados | custom actions/rotor parity | REFINE |
| D32 | breakpoints/font scale table | Accessibility Motion; Quick Actions | QA 1.3 | STRONG | 2× no runtime | exact reflow criteria | REFINE |
| D33 | Android runtime, Apple HIG | Audit; Research | Android captures | PARTIAL | iOS no ejecutado | platform-specific gestures/haptics | RESEARCH |
| D34 | skeleton/stale/optimistic continuity | Research; Accessibility Motion | stuck/loading screenshots | STRONG | P0 submit y Home | perceived timing ceilings | REFINE |
| D35 | progressive disclosure only | Research | ninguno | WEAK | learning de gestures/filter no cerrado | cue lifetime/reappearance | RESEARCH + PROTOTYPE |
| D36 | privacy contract + allowlist | Accessibility Motion | N/A | STRONG | ninguno | experience event catalog/metrics | FORMALIZE |

## Resumen inicial

| Cobertura | Cantidad |
|---|---:|
| COMPLETE | 2 |
| STRONG | 24 |
| PARTIAL | 6 |
| WEAK | 3 |
| MISSING | 1 |
| FROZEN_BY_M1_M10 | 0 decisiones completas; los límites funcionales aplican transversalmente |
| OUT_OF_SCOPE | 0 |

La investigación C2 se concentra en D11–D15, D18, D20, D33 y D35. El resto se formaliza o refina con evidencia existente; no se repite la auditoría general.

## Closure after research, prototype and reconciliation

| D | Final coverage | Gap resolution / final authority |
|---|---|---|
| D1 | COMPLETE | reflow, capabilities, focus and 0-action behavior frozen in Registry/Contract |
| D2 | COMPLETE | Task gesture, busy, offline, Dynamic Type and TalkBack rules integrated |
| D3 | COMPLETE | Event semantics and explicit no-commit-swipe rule frozen |
| D4 | COMPLETE | Goal/Milestone distinction and action placement frozen |
| D5 | COMPLETE | 51 uses classified; exception precedence and enforcement tests added |
| D6 | COMPLETE | count, summary, focus return, empty-filter and tap ceiling added |
| D7 | COMPLETE | temporal behavior plus P0-1 size/scale matrix added |
| D8 | COMPLETE | defaults/templates and P0-2 terminal submit model added |
| D9 | COMPLETE | visible/overflow/long-press parity and destructive protection added |
| D10 | COMPLETE | gesture-specific motion/haptic map added |
| D11 | COMPLETE | right/left action-by-state, visible parity and cancellation prototyped |
| D12 | COMPLETE | Event/Goal/Milestone gesture policy derived and frozen |
| D13 | COMPLETE | 70% release threshold and eligibility exclusions frozen |
| D14 | COMPLETE | long press purpose, size, ordering and parity frozen |
| D15 | COMPLETE | inverse gate, 6 s base, timeout adjustment and invalidation frozen |
| D16 | COMPLETE | natural capture focus/default/success path frozen |
| D17 | COMPLETE | visible/contextual/advanced/destructive allocation frozen |
| D18 | COMPLETE | one contextual dismissible hint with suppression rules prototyped |
| D19 | COMPLETE | job-level tap ceilings formalized |
| D20 | COMPLETE | visual, haptic, reduced-motion and interruption rules reconciled |
| D21 | COMPLETE | architecture of attention consolidated |
| D22 | COMPLETE | section/list/density/scan rules consolidated |
| D23 | COMPLETE | shell/tabs/scroll/focus visual boundary formalized |
| D24 | COMPLETE | surfaces and spacing tokens formalized |
| D25 | COMPLETE | wrapping/truncation/content-long rules formalized |
| D26 | COMPLETE | semantic color/icon/elevation limits formalized |
| D27 | COMPLETE | Day/Week/Month/agenda selection and continuity frozen |
| D28 | COMPLETE | mode/default/template-selection rules frozen; authoring explicitly out of scope |
| D29 | COMPLETE | shared system-state presentation grammar frozen |
| D30 | COMPLETE | section-local Summary continuity and P0-3 sanitization frozen |
| D31 | COMPLETE | semantic/custom-action/visible-equivalence contract frozen |
| D32 | COMPLETE | 320 dp, 1×–2× and target/reflow criteria frozen |
| D33 | COMPLETE | Android Back/keyboard/focus plus platform-specific fallback frozen; iOS runtime remains later validation, not missing design evidence |
| D34 | COMPLETE | stable geometry, terminal busy and optimistic continuity frozen |
| D35 | COMPLETE | contextual learning trigger/lifetime/reappearance rules frozen |
| D36 | COMPLETE | allowlist, prohibited fields, metrics and deletion/aggregation boundary frozen |

**Final coverage:** 36 `COMPLETE`; 0 `PARTIAL`, `WEAK`, `MISSING` or `BLOCKED_BY_MISSING_EVIDENCE`. Functional mechanics referenced by these decisions remain `FROZEN_BY_M1_M10`, not reopened. Human preference choices remain pending approval without reducing evidence coverage.
