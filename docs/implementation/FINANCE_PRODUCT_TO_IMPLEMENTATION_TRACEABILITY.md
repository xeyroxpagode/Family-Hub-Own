# HOMePLUS Finance — Product to Implementation Traceability

Status: CORRECTION PASS — TRACEABILITY COMPLETE
Date: 2026-08-11
Mode: PRODUCT → IMPLEMENTATION OWNERSHIP TRACEABILITY; NO IMPLEMENTATION

## 1. Authority

- Product Truth: `HOMePLUS_FINANCE_PRODUCT_FREEZE_V1.0.md` (SHA-256 `D1DDDC2166DBFA4FB7B3940F4C5A3BA37E92CBD403BFE8983D0D16CD4B9A87A2`).
- Planning inputs: accepted Current Audit, Donor Audit, Current+Donor Matrix, corrected Real Gap Map, corrected Minimal Integration Plan.
- This document maps normative Product Truth to exactly one primary future implementation owner. Secondary gaps are regression/integration consumers only.

## 2. Coverage Rules

- Canonical Use Cases / Flows: all 60 mapped.
- Product Invariants: all 74 mapped.
- Final Acceptance Definition: all 62 mapped.
- Supplemental normative rules: only clauses with functional consequences not sufficiently explicit in the three sets above are added.
- Explanatory examples, repeated philosophy, illustrative labels and layout examples are not treated as separate implementation requirements.
- `FIN-GAP identity != technical entity identity`; mapping to a gap does not imply a table/service/RPC/subsystem.

## 3. Traceability Matrix

| PRODUCT SOURCE | REQUIREMENT | PRIMARY FIN-GAP | SECONDARY FIN-GAP(S) | FIU | FZ | TEST OWNER | STATUS | NOTES |
|---|---|---|---|---|---|---|---|---|
| UC-FIN-001 | UC-FIN-001 — Create Personal Account: Name + Currency → Personal Account ACTIVE | FIN-GAP-002 | FIN-GAP-001 | FIU-02 | FZ-02 | FIU-02 | MAPPED | Canonical use case / flow. |
| UC-FIN-002 | UC-FIN-002 — Create Household Account: Name + Currency → Household Account ACTIVE | FIN-GAP-002 | FIN-GAP-001 | FIU-02 | FZ-02 | FIU-02 | MAPPED | Canonical use case / flow. |
| UC-FIN-003 | UC-FIN-003 — Create Account without Opening Balance: → BALANCE UNKNOWN | FIN-GAP-002 | None | FIU-02 | FZ-02 | FIU-02 | MAPPED | Canonical use case / flow. |
| UC-FIN-004 | UC-FIN-004 — Establish Balance Anchor: Declare real balance → KNOWN Balance | FIN-GAP-002 | None | FIU-02 | FZ-02 | FIU-02 | MAPPED | Canonical use case / flow. |
| UC-FIN-005 | UC-FIN-005 — Correct Balance: Known calculated balance differs → Correct Balance → Adjustment + new Anchor | FIN-GAP-002 | None | FIU-02 | FZ-02 | FIU-02 | MAPPED | Canonical use case / flow. |
| UC-FIN-006 | UC-FIN-006 — Archive / Unarchive Account: ACTIVE ↔ ARCHIVED | FIN-GAP-002 | None | FIU-02 | FZ-02 | FIU-02 | MAPPED | Canonical use case / flow. |
| UC-FIN-007 | UC-FIN-007 — Record Personal Income: Income → Personal context | FIN-GAP-003 | FIN-GAP-001 | FIU-03 | FZ-03A | FIU-03 | MAPPED | Canonical use case / flow. |
| UC-FIN-008 | UC-FIN-008 — Record Household Income: Income → Household context | FIN-GAP-003 | FIN-GAP-001 | FIU-03 | FZ-03A | FIU-03 | MAPPED | Canonical use case / flow. |
| UC-FIN-009 | UC-FIN-009 — Record Personal Expense: Expense → Personal reports | FIN-GAP-003 | FIN-GAP-001 | FIU-03 | FZ-03A | FIU-03 | MAPPED | Canonical use case / flow. |
| UC-FIN-010 | UC-FIN-010 — Record Household Expense: Expense → Household reports | FIN-GAP-003 | FIN-GAP-001 | FIU-03 | FZ-03A | FIU-03 | MAPPED | Canonical use case / flow. |
| UC-FIN-011 | UC-FIN-011 — Record Expense without Account: Expense → reports/budget → no Account balance | FIN-GAP-003 | FIN-GAP-008, FIN-GAP-011 | FIU-03 | FZ-03A | FIU-03 | MAPPED | Canonical use case / flow. |
| UC-FIN-012 | UC-FIN-012 — Personal Account pays Household Expense: Personal source + Household context → one Household Expense | FIN-GAP-001 | FIN-GAP-002, FIN-GAP-003, FIN-GAP-011 | FIU-01 | FZ-01 | FIU-01 | MAPPED | Canonical use case / flow. |
| UC-FIN-013 | UC-FIN-013 — Transfer between Accounts: Source → Destination → no Income/Expense | FIN-GAP-004 | FIN-GAP-002, FIN-GAP-003 | FIU-04 | FZ-04 + Financial History Policy precondition | FIU-04 | MAPPED | Canonical use case / flow. |
| UC-FIN-014 | UC-FIN-014 — Personal contribution to Household: Personal → Household Transfer | FIN-GAP-004 | FIN-GAP-001, FIN-GAP-011 | FIU-04 | FZ-04 + Financial History Policy precondition | FIU-04 | MAPPED | Canonical use case / flow. |
| UC-FIN-015 | UC-FIN-015 — Household to Personal transfer: Household → Personal → visible shared money movement | FIN-GAP-004 | FIN-GAP-001 | FIU-04 | FZ-04 + Financial History Policy precondition | FIU-04 | MAPPED | Canonical use case / flow. |
| UC-FIN-016 | UC-FIN-016 — Cross-currency Transfer: Source Amount/Currency → Destination Amount/Currency | FIN-GAP-004 | FIN-GAP-011 | FIU-04 | FZ-04 + Financial History Policy precondition | FIU-04 | MAPPED | Canonical use case / flow. |
| UC-FIN-017 | UC-FIN-017 — Credit-card-style Expense: Expense on negative-capable Account | FIN-GAP-002 | FIN-GAP-003 | FIU-02 | FZ-02 | FIU-02 | MAPPED | Canonical use case / flow. |
| UC-FIN-018 | UC-FIN-018 — Pay credit card via Transfer: Bank → Card Account → no second Expense | FIN-GAP-004 | FIN-GAP-002 | FIU-04 | FZ-04 + Financial History Policy precondition | FIU-04 | MAPPED | Canonical use case / flow. |
| UC-FIN-019 | UC-FIN-019 — Edit Transaction: correct fields → current truth recalculated → revision retained | FIN-GAP-005 | FIN-GAP-003 | FIU-05 | FZ-05 | FIU-05 | MAPPED | Canonical use case / flow. |
| UC-FIN-020 | UC-FIN-020 — Trash Transaction: ACTIVE → TRASH → remove financial effects | FIN-GAP-005 | FIN-GAP-003, FIN-GAP-011 | FIU-05 | FZ-05 | FIU-05 | MAPPED | Canonical use case / flow. |
| UC-FIN-021 | UC-FIN-021 — Restore Transaction: TRASH → ACTIVE → restore effects if conflict-free | FIN-GAP-005 | FIN-GAP-003, FIN-GAP-011 | FIU-05 | FZ-05 | FIU-05 | MAPPED | Canonical use case / flow. |
| UC-FIN-022 | UC-FIN-022 — Full Refund: Expense → Refund total → Net Expense 0 | FIN-GAP-006 | FIN-GAP-005, FIN-GAP-008, FIN-GAP-011 | FIU-06 | FZ-06 | FIU-06 | MAPPED | Canonical use case / flow. |
| UC-FIN-023 | UC-FIN-023 — Partial Refund: Expense → Refund partial → Net Expense reduced | FIN-GAP-006 | FIN-GAP-005, FIN-GAP-008, FIN-GAP-011 | FIU-06 | FZ-06 | FIU-06 | MAPPED | Canonical use case / flow. |
| UC-FIN-024 | UC-FIN-024 — Archive Category: ACTIVE → ARCHIVED → historical classification preserved | FIN-GAP-007 | None | FIU-03 | FZ-03B | FIU-03 | MAPPED | Canonical use case / flow. |
| UC-FIN-025 | UC-FIN-025 — Create Total Monthly Budget: Context + Currency + Month + Amount | FIN-GAP-008 | FIN-GAP-001 | FIU-07 | FZ-08 | FIU-07 | MAPPED | Canonical use case / flow. |
| UC-FIN-026 | UC-FIN-026 — Create Category Budget: Context + Currency + Month + Category + Amount | FIN-GAP-008 | FIN-GAP-007 | FIU-07 | FZ-08 | FIU-07 | MAPPED | Canonical use case / flow. |
| UC-FIN-027 | UC-FIN-027 — Expense updates Budget: Expense → Spent increases | FIN-GAP-008 | FIN-GAP-003 | FIU-07 | FZ-08 | FIU-07 | MAPPED | Canonical use case / flow. |
| UC-FIN-028 | UC-FIN-028 — Refund reduces Budget consumption: Refund → Spent decreases | FIN-GAP-008 | FIN-GAP-006 | FIU-07 | FZ-08 | FIU-07 | MAPPED | Canonical use case / flow. |
| UC-FIN-029 | UC-FIN-029 — Exceed Budget: Spent > Target → OVER BUDGET → Expense still allowed | FIN-GAP-008 | None | FIU-07 | FZ-08 | FIU-07 | MAPPED | Canonical use case / flow. |
| UC-FIN-030 | UC-FIN-030 — Close month without carry-over: historical result preserved → next month fresh target | FIN-GAP-008 | None | FIU-07 | FZ-08 | FIU-07 | MAPPED | Canonical use case / flow. |
| UC-FIN-031 | UC-FIN-031 — Explicit Transfer to Savings: Account → Savings Account | FIN-GAP-008 | FIN-GAP-002, FIN-GAP-004 | FIU-07 | FZ-08 | FIU-07 | MAPPED | Canonical use case / flow. |
| UC-FIN-032 | UC-FIN-032 — Edit Budget only current month: current period changes → future unchanged | FIN-GAP-008 | None | FIU-07 | FZ-08 | FIU-07 | MAPPED | Canonical use case / flow. |
| UC-FIN-033 | UC-FIN-033 — Edit Budget current and future: current + future configuration changes → past unchanged | FIN-GAP-008 | None | FIU-07 | FZ-08 | FIU-07 | MAPPED | Canonical use case / flow. |
| UC-FIN-034 | UC-FIN-034 — Create one-time Obligation: Name + Currency + Due Date → PENDING | FIN-GAP-009 | FIN-GAP-001 | FIU-08 | FZ-07 | FIU-08 | MAPPED | Canonical use case / flow. |
| UC-FIN-035 | UC-FIN-035 — Create recurring Obligation: Rule ACTIVE → future occurrences | FIN-GAP-009 | FIN-GAP-001 | FIU-08 | FZ-07 | FIU-08 | MAPPED | Canonical use case / flow. |
| UC-FIN-036 | UC-FIN-036 — Generate recurrence occurrence: Rule → individual occurrence PENDING | FIN-GAP-009 | None | FIU-08 | FZ-07 | FIU-08 | MAPPED | Canonical use case / flow. |
| UC-FIN-037 | UC-FIN-037 — Household Obligation creates Planner Task: Occurrence → canonical Planner Task | FIN-GAP-010 | FIN-GAP-009 | FIU-09 | FZ-09 | FIU-09 | MAPPED | Canonical use case / flow. |
| UC-FIN-038 | UC-FIN-038 — Planner completion opens Payment registration: Task Completed → Register Payment | FIN-GAP-010 | FIN-GAP-009 | FIU-09 | FZ-09 | FIU-09 | MAPPED | Canonical use case / flow. |
| UC-FIN-039 | UC-FIN-039 — Exit payment handoff without paying: Task completed → Obligation stays PENDING/OVERDUE | FIN-GAP-010 | FIN-GAP-009 | FIU-09 | FZ-09 | FIU-09 | MAPPED | Canonical use case / flow. |
| UC-FIN-040 | UC-FIN-040 — Register Payment before Planner completion: Finance payment → PAID → offer complete Planner Task | FIN-GAP-010 | FIN-GAP-009 | FIU-09 | FZ-09 | FIU-09 | MAPPED | Canonical use case / flow. |
| UC-FIN-041 | UC-FIN-041 — Cancel Planner Task: Task cancelled → Obligation remains unresolved | FIN-GAP-010 | FIN-GAP-009 | FIU-09 | FZ-09 | FIU-09 | MAPPED | Canonical use case / flow. |
| UC-FIN-042 | UC-FIN-042 — Skip occurrence: PENDING → SKIPPED | FIN-GAP-009 | None | FIU-08 | FZ-07 | FIU-08 | MAPPED | Canonical use case / flow. |
| UC-FIN-043 | UC-FIN-043 — Cancel occurrence: PENDING → CANCELLED | FIN-GAP-009 | None | FIU-08 | FZ-07 | FIU-08 | MAPPED | Canonical use case / flow. |
| UC-FIN-044 | UC-FIN-044 — Pause recurring Obligation: ACTIVE → PAUSED | FIN-GAP-009 | None | FIU-08 | FZ-07 | FIU-08 | MAPPED | Canonical use case / flow. |
| UC-FIN-045 | UC-FIN-045 — Resume recurring Obligation: PAUSED → ACTIVE | FIN-GAP-009 | None | FIU-08 | FZ-07 | FIU-08 | MAPPED | Canonical use case / flow. |
| UC-FIN-046 | UC-FIN-046 — End recurrence: ACTIVE/PAUSED → ENDED | FIN-GAP-009 | None | FIU-08 | FZ-07 | FIU-08 | MAPPED | Canonical use case / flow. |
| UC-FIN-047 | UC-FIN-047 — Multiple unpaid occurrences coexist: July OVERDUE August PENDING | FIN-GAP-009 | None | FIU-08 | FZ-07 | FIU-08 | MAPPED | Canonical use case / flow. |
| UC-FIN-048 | UC-FIN-048 — Trash Payment transaction: Payment removed → PAID recalculated to PENDING/OVERDUE | FIN-GAP-009 | FIN-GAP-005 | FIU-08 | FZ-07 | FIU-08 | MAPPED | Canonical use case / flow. |
| UC-FIN-049 | UC-FIN-049 — Restore Payment transaction: restore → PAID if conflict-free | FIN-GAP-009 | FIN-GAP-005 | FIU-08 | FZ-07 | FIU-08 | MAPPED | Canonical use case / flow. |
| UC-FIN-050 | UC-FIN-050 — Household reports personal-funded Expense once: Household Context → counted once in Household | FIN-GAP-011 | FIN-GAP-001, FIN-GAP-009 | FIU-10 | FZ-11 | FIU-10 | MAPPED | Canonical use case / flow. |
| UC-FIN-051 | UC-FIN-051 — Personal reports exclude Household Expense: Personal Account funded but Context Household → not Personal spending | FIN-GAP-011 | FIN-GAP-001 | FIU-10 | FZ-11 | FIU-10 | MAPPED | Canonical use case / flow. |
| UC-FIN-052 | UC-FIN-052 — Reports separate currencies: ARS / USD → no unsupported aggregation | FIN-GAP-011 | FIN-GAP-004 | FIU-10 | FZ-11 | FIU-10 | MAPPED | Canonical use case / flow. |
| UC-FIN-053 | UC-FIN-053 — Personal Finance remains private cross-Household: unauthorized member → no discovery | FIN-GAP-001 | None | FIU-01 | FZ-01 | FIU-01 | MAPPED | Canonical use case / flow. |
| UC-FIN-054 | UC-FIN-054 — Personal Obligation does not invent private Planner Task: Personal Obligation → Finance-owned due behavior | FIN-GAP-010 | None | FIU-09 | FZ-09 | FIU-09 | MAPPED | Canonical use case / flow. |
| UC-FIN-055 | UC-FIN-055 — Inventory purchase relation: Inventory purchase ↔ Finance Expense | FIN-GAP-013 | FIN-GAP-003 | FIU-12 | FZ-13 Inventory / FZ-14 Assets+HomeCloud deferred | FIU-12 | MAPPED | Canonical use case / flow. |
| UC-FIN-056 | UC-FIN-056 — Asset repair relation: Asset Repair ↔ Finance Expense | FIN-GAP-013 | None | FIU-12 | FZ-13 Inventory / FZ-14 Assets+HomeCloud deferred | FIU-12 | MAPPED | Canonical use case / flow. |
| UC-FIN-057 | UC-FIN-057 — Optional receipt/document: Finance object ↔ HomeCloud file | FIN-GAP-013 | None | FIU-12 | FZ-13 Inventory / FZ-14 Assets+HomeCloud deferred | FIU-12 | MAPPED | Canonical use case / flow. |
| UC-FIN-058 | UC-FIN-058 — Budget Exceeded Attention: OVER BUDGET → Attention candidate | FIN-GAP-012 | FIN-GAP-008 | FIU-11 | FZ-12 | FIU-11 | MAPPED | Canonical use case / flow. |
| UC-FIN-059 | UC-FIN-059 — Payment Due Attention: PENDING approaching due → candidate when not duplicated by Planner | FIN-GAP-012 | FIN-GAP-009, FIN-GAP-010 | FIU-11 | FZ-12 | FIU-11 | MAPPED | Canonical use case / flow. |
| UC-FIN-060 | UC-FIN-060 — Payment Overdue Attention: PENDING + due passed → OVERDUE candidate | FIN-GAP-012 | FIN-GAP-009 | FIU-11 | FZ-12 | FIU-11 | MAPPED | Canonical use case / flow. |
| FIN-INV-001 | Finance no es banco ni contabilidad empresarial. | NO GAP — NON-GOAL | None | N/A | N/A | N5 scope/control regression | NON-GOAL | Product invariant. |
| FIN-INV-002 | Personal Finance pertenece al User. | FIN-GAP-001 | None | FIU-01 | FZ-01 | FIU-01 | MAPPED | Product invariant. |
| FIN-INV-003 | Household Finance pertenece al Household. | FIN-GAP-001 | None | FIU-01 | FZ-01 | FIU-01 | MAPPED | Product invariant. |
| FIN-INV-004 | Personal Finance es privada por defecto. | FIN-GAP-001 | None | FIU-01 | FZ-01 | FIU-01 | MAPPED | Product invariant. |
| FIN-INV-005 | Household authority no otorga acceso automático a Personal Finance. | FIN-GAP-001 | None | FIU-01 | FZ-01 | FIU-01 | MAPPED | Product invariant. |
| FIN-INV-006 | Personal Finance no filtra datos a Household Search, Home, Feed, Activity, Attention o Geni. | FIN-GAP-012 | FIN-GAP-015 | FIU-11 | FZ-12 | FIU-11 | MAPPED | Product invariant. |
| FIN-INV-007 | Household-funded money no puede ocultarse como Personal mediante una edición. | FIN-GAP-001 | None | FIU-01 | FZ-01 | FIU-01 | MAPPED | Product invariant. |
| FIN-INV-008 | No Opening Balance no equivale a zero. | FIN-GAP-002 | None | FIU-02 | FZ-02 | FIU-02 | MAPPED | Product invariant. |
| FIN-INV-009 | Known Balance necesita un Balance Anchor confiable. | FIN-GAP-002 | None | FIU-02 | FZ-02 | FIU-02 | MAPPED | Product invariant. |
| FIN-INV-010 | Balance Adjustment modifica Balance pero no Income/Expense/Budget. | FIN-GAP-002 | None | FIU-02 | FZ-02 | FIU-02 | MAPPED | Product invariant. |
| FIN-INV-011 | Negative Account Balance es válido. | FIN-GAP-002 | None | FIU-02 | FZ-02 | FIU-02 | MAPPED | Product invariant. |
| FIN-INV-012 | Account Currency no cambia después de existir History financiera. | FIN-GAP-002 | None | FIU-02 | FZ-02 | FIU-02 | MAPPED | Product invariant. |
| FIN-INV-013 | Archived Account conserva Balance e History. | FIN-GAP-002 | FIN-GAP-005 | FIU-02 | FZ-02 | FIU-02 | MAPPED | Product invariant. |
| FIN-INV-014 | Income significa dinero externo entrante. | FIN-GAP-003 | None | FIU-03 | FZ-03A | FIU-03 | MAPPED | Product invariant. |
| FIN-INV-015 | Expense significa dinero realmente gastado. | FIN-GAP-003 | FIN-GAP-007 | FIU-03 | FZ-03A | FIU-03 | MAPPED | Product invariant. |
| FIN-INV-016 | Transfer no es Income ni Expense. | FIN-GAP-004 | FIN-GAP-003 | FIU-04 | FZ-04 + Financial History Policy precondition | FIU-04 | MAPPED | Product invariant. |
| FIN-INV-017 | Transfer afecta ambos extremos como una operación lógica. | FIN-GAP-004 | None | FIU-04 | FZ-04 + Financial History Policy precondition | FIU-04 | MAPPED | Product invariant. |
| FIN-INV-018 | Source Account y Destination Account de Transfer no pueden ser la misma. | FIN-GAP-004 | None | FIU-04 | FZ-04 + Financial History Policy precondition | FIU-04 | MAPPED | Product invariant. |
| FIN-INV-019 | Cross-currency Transfer requiere Source Amount y Destination Amount. | FIN-GAP-004 | None | FIU-04 | FZ-04 + Financial History Policy precondition | FIU-04 | MAPPED | Product invariant. |
| FIN-INV-020 | Account es opcional para Income/Expense pero obligatorio semánticamente para Transfer. | FIN-GAP-003 | FIN-GAP-004 | FIU-03 | FZ-03A | FIU-03 | MAPPED | Product invariant. |
| FIN-INV-021 | Expense Analytics siguen Financial Context. | FIN-GAP-001 | FIN-GAP-011 | FIU-01 | FZ-01 | FIU-01 | MAPPED | Product invariant. |
| FIN-INV-022 | Funding Source no duplica Expense. | FIN-GAP-001 | FIN-GAP-011 | FIU-01 | FZ-01 | FIU-01 | MAPPED | Product invariant. |
| FIN-INV-023 | Personal-funded Household Expense no expone Personal Account. | FIN-GAP-001 | None | FIU-01 | FZ-01 | FIU-01 | MAPPED | Product invariant. |
| FIN-INV-024 | Contribution Personal→Household es Transfer, no Income. | FIN-GAP-004 | None | FIU-04 | FZ-04 + Financial History Policy precondition | FIU-04 | MAPPED | Product invariant. |
| FIN-INV-025 | Reimbursement es Transfer, no segundo Expense. | FIN-GAP-004 | None | FIU-04 | FZ-04 + Financial History Policy precondition | FIU-04 | MAPPED | Product invariant. |
| FIN-INV-026 | Transaction correction preserva History. | FIN-GAP-005 | None | FIU-05 | FZ-05 | FIU-05 | MAPPED | Product invariant. |
| FIN-INV-027 | Real reversal no equivale a Delete. | FIN-GAP-005 | None | FIU-05 | FZ-05 | FIU-05 | MAPPED | Product invariant. |
| FIN-INV-028 | Trash elimina efectos financieros actuales pero preserva Restore. | FIN-GAP-005 | None | FIU-05 | FZ-05 | FIU-05 | MAPPED | Product invariant. |
| FIN-INV-029 | Refund no es Income. | FIN-GAP-006 | None | FIU-06 | FZ-06 | FIU-06 | MAPPED | Product invariant. |
| FIN-INV-030 | Refund referencia un Expense real. | FIN-GAP-006 | None | FIU-06 | FZ-06 | FIU-06 | MAPPED | Product invariant. |
| FIN-INV-031 | Refund reduce Net Expense y Budget Spent. | FIN-GAP-006 | FIN-GAP-008, FIN-GAP-011 | FIU-06 | FZ-06 | FIU-06 | MAPPED | Product invariant. |
| FIN-INV-032 | Refunds V1 no exceden el Expense original. | FIN-GAP-006 | None | FIU-06 | FZ-06 | FIU-06 | MAPPED | Product invariant. |
| FIN-INV-033 | Expense con Refund activo no puede dejar Refund huérfano. | FIN-GAP-006 | FIN-GAP-005 | FIU-06 | FZ-06 | FIU-06 | MAPPED | Product invariant. |
| FIN-INV-034 | Budget nunca bloquea registrar un Expense real. | FIN-GAP-008 | FIN-GAP-003 | FIU-07 | FZ-08 | FIU-07 | MAPPED | Product invariant. |
| FIN-INV-035 | Budget Spent deriva de Transactions. | FIN-GAP-008 | None | FIU-07 | FZ-08 | FIU-07 | MAPPED | Product invariant. |
| FIN-INV-036 | Transfer no consume Budget. | FIN-GAP-008 | FIN-GAP-004, FIN-GAP-011 | FIU-07 | FZ-08 | FIU-07 | MAPPED | Product invariant. |
| FIN-INV-037 | Balance Adjustment no consume Budget. | FIN-GAP-002 | FIN-GAP-011 | FIU-02 | FZ-02 | FIU-02 | MAPPED | Product invariant. |
| FIN-INV-038 | Refund reduce Budget Spent. | FIN-GAP-006 | FIN-GAP-008 | FIU-06 | FZ-06 | FIU-06 | MAPPED | Product invariant. |
| FIN-INV-039 | Budget leftover no representa dinero. | FIN-GAP-008 | None | FIU-07 | FZ-08 | FIU-07 | MAPPED | Product invariant. |
| FIN-INV-040 | No existe carry-over automático V1. | FIN-GAP-008 | None | FIU-07 | FZ-08 | FIU-07 | MAPPED | Product invariant. |
| FIN-INV-041 | Savings se representa mediante Accounts normales. | FIN-GAP-008 | FIN-GAP-002 | FIU-07 | FZ-08 | FIU-07 | MAPPED | Product invariant. |
| FIN-INV-042 | Mover dinero a Savings requiere Transfer real. | FIN-GAP-008 | FIN-GAP-004 | FIU-07 | FZ-08 | FIU-07 | MAPPED | Product invariant. |
| FIN-INV-043 | Budget Currency no mezcla monedas sin FX. | FIN-GAP-011 | None | FIU-10 | FZ-11 | FIU-10 | MAPPED | Product invariant. |
| FIN-INV-044 | Editar Budget futuro no reescribe targets pasados. | FIN-GAP-008 | None | FIU-07 | FZ-08 | FIU-07 | MAPPED | Product invariant. |
| FIN-INV-045 | Obligation no equivale a Expense. | FIN-GAP-009 | None | FIU-08 | FZ-07 | FIU-08 | MAPPED | Product invariant. |
| FIN-INV-046 | Planner Task Completed no equivale a Payment. | FIN-GAP-010 | None | FIU-09 | FZ-09 | FIU-09 | MAPPED | Product invariant. |
| FIN-INV-047 | Obligation PAID requiere Payment real. | FIN-GAP-009 | None | FIU-08 | FZ-07 | FIU-08 | MAPPED | Product invariant. |
| FIN-INV-048 | OVERDUE es derivado. | FIN-GAP-009 | FIN-GAP-012 | FIU-08 | FZ-07 | FIU-08 | MAPPED | Product invariant. |
| FIN-INV-049 | Recurring occurrences preservan historia individual. | FIN-GAP-009 | None | FIU-08 | FZ-07 | FIU-08 | MAPPED | Product invariant. |
| FIN-INV-050 | Obligaciones financieras impagas pueden acumular occurrences. | FIN-GAP-009 | None | FIU-08 | FZ-07 | FIU-08 | MAPPED | Product invariant. |
| FIN-INV-051 | Pause no genera occurrences durante el período pausado. | FIN-GAP-009 | None | FIU-08 | FZ-07 | FIU-08 | MAPPED | Product invariant. |
| FIN-INV-052 | Editar recurrence no reescribe occurrences existentes. | FIN-GAP-009 | None | FIU-08 | FZ-07 | FIU-08 | MAPPED | Product invariant. |
| FIN-INV-053 | V1 no soporta partial-payment lifecycle. | NO GAP — NON-GOAL | None | N/A | N/A | N5 scope/control regression | NON-GOAL | Product invariant. |
| FIN-INV-054 | Una Obligation occurrence posee máximo un Payment activo canónico V1. | FIN-GAP-009 | None | FIU-08 | FZ-07 | FIU-08 | MAPPED | Product invariant. |
| FIN-INV-055 | Trash del Payment recalcula Obligation state. | FIN-GAP-009 | FIN-GAP-005 | FIU-08 | FZ-07 | FIU-08 | MAPPED | Product invariant. |
| FIN-INV-056 | Planner Task cancelada no cancela Obligation. | FIN-GAP-010 | None | FIU-09 | FZ-09 | FIU-09 | MAPPED | Product invariant. |
| FIN-INV-057 | Household Obligation puede componerse con Planner. | FIN-GAP-010 | None | FIU-09 | FZ-09 | FIU-09 | MAPPED | Product invariant. |
| FIN-INV-058 | Personal Finance no inventa un private Planner model paralelo. | FIN-GAP-010 | None | FIU-09 | FZ-09 | FIU-09 | MAPPED | Product invariant. |
| FIN-INV-059 | Cada Expense se cuenta una sola vez. | FIN-GAP-011 | None | FIU-10 | FZ-11 | FIU-10 | MAPPED | Product invariant. |
| FIN-INV-060 | Transfer queda fuera de Income/Expense/Budget. | FIN-GAP-011 | FIN-GAP-004 | FIU-10 | FZ-11 | FIU-10 | MAPPED | Product invariant. |
| FIN-INV-061 | Balance Adjustment queda fuera de Income/Expense/Budget. | FIN-GAP-011 | FIN-GAP-002 | FIU-10 | FZ-11 | FIU-10 | MAPPED | Product invariant. |
| FIN-INV-062 | Refund reduce Expense, no crea Income. | FIN-GAP-006 | FIN-GAP-011 | FIU-06 | FZ-06 | FIU-06 | MAPPED | Product invariant. |
| FIN-INV-063 | Contributions no inflan Income externo. | FIN-GAP-004 | FIN-GAP-011 | FIU-04 | FZ-04 + Financial History Policy precondition | FIU-04 | MAPPED | Product invariant. |
| FIN-INV-064 | Reports no suman currencies incompatibles sin FX. | FIN-GAP-011 | None | FIU-10 | FZ-11 | FIU-10 | MAPPED | Product invariant. |
| FIN-INV-065 | Finance posee financial truth. | FIN-GAP-003 | FIN-GAP-005, FIN-GAP-011 | FIU-03 | FZ-03A | FIU-03 | MAPPED | Product invariant. |
| FIN-INV-066 | Planner posee acciones temporales. | FIN-GAP-010 | None | FIU-09 | FZ-09 | FIU-09 | MAPPED | Product invariant. |
| FIN-INV-067 | Inventory posee quantities/stock. | FIN-GAP-013 | None | FIU-12 | FZ-13 Inventory / FZ-14 Assets+HomeCloud deferred | FIU-12 | MAPPED | Product invariant. |
| FIN-INV-068 | Assets posee Asset/service/repair truth. | FIN-GAP-013 | None | FIU-12 | FZ-13 Inventory / FZ-14 Assets+HomeCloud deferred | FIU-12 | MAPPED | Product invariant. |
| FIN-INV-069 | HomeCloud posee archivos. | FIN-GAP-013 | None | FIU-12 | FZ-13 Inventory / FZ-14 Assets+HomeCloud deferred | FIU-12 | MAPPED | Product invariant. |
| FIN-INV-070 | Attention decide relevancia final. | FIN-GAP-012 | FIN-GAP-015 | FIU-11 | FZ-12 | FIU-11 | MAPPED | Product invariant. |
| FIN-INV-071 | Notifications posee delivery. | FIN-GAP-012 | FIN-GAP-015 | FIU-11 | FZ-12 | FIU-11 | MAPPED | Product invariant. |
| FIN-INV-072 | Search no amplía permisos. | FIN-GAP-012 | None | FIU-11 | FZ-12 | FIU-11 | MAPPED | Product invariant. |
| FIN-INV-073 | Automations/Geni consumen operaciones canónicas y no crean modelos paralelos. | FIN-GAP-014 | None | NO EXECUTABLE FIU — Finance-side conformance owned across FIU-03/04/08 | FZ-10 External Canonical Consumer Boundary | FIU-03 primary + N4 regression FIU-04/FIU-08 | DEFERRED EXTERNAL CAPABILITY | Product invariant. |
| FIN-INV-074 | Finance Core funciona completamente sin IA. | FIN-GAP-014 | None | NO EXECUTABLE FIU — Finance-side conformance owned across FIU-03/04/08 | FZ-10 External Canonical Consumer Boundary | FIU-03 primary + N4 regression FIU-04/FIU-08 | DEFERRED EXTERNAL CAPABILITY | Product invariant. |
| ACCEPT-01 | Personal Finance y Household Finance son scopes distintos | FIN-GAP-001 | None | FIU-01 | FZ-01 | FIU-01 | MAPPED | Final Acceptance Definition. |
| ACCEPT-02 | Personal Finance es privada por defecto | FIN-GAP-001 | None | FIU-01 | FZ-01 | FIU-01 | MAPPED | Final Acceptance Definition. |
| ACCEPT-03 | un adulto no obtiene automáticamente acceso al Finance personal de otro | FIN-GAP-001 | None | FIU-01 | FZ-01 | FIU-01 | MAPPED | Final Acceptance Definition. |
| ACCEPT-04 | una Account puede crearse sin Opening Balance | FIN-GAP-002 | None | FIU-02 | FZ-02 | FIU-02 | MAPPED | Final Acceptance Definition. |
| ACCEPT-05 | ausencia de Opening Balance no se interpreta como zero | FIN-GAP-002 | None | FIU-02 | FZ-02 | FIU-02 | MAPPED | Final Acceptance Definition. |
| ACCEPT-06 | Balance puede anclarse y corregirse explícitamente | FIN-GAP-002 | None | FIU-02 | FZ-02 | FIU-02 | MAPPED | Final Acceptance Definition. |
| ACCEPT-07 | Balance Adjustment no contamina gastos/ingresos | FIN-GAP-002 | FIN-GAP-011 | FIU-02 | FZ-02 | FIU-02 | MAPPED | Final Acceptance Definition. |
| ACCEPT-08 | una Account puede tener Balance negativo | FIN-GAP-002 | None | FIU-02 | FZ-02 | FIU-02 | MAPPED | Final Acceptance Definition. |
| ACCEPT-09 | Currency histórica de Account no se reinterpreta | FIN-GAP-002 | None | FIU-02 | FZ-02 | FIU-02 | MAPPED | Final Acceptance Definition. |
| ACCEPT-10 | Income, Expense y Transfer tienen semánticas distintas | FIN-GAP-003 | None | FIU-03 | FZ-03A | FIU-03 | MAPPED | Final Acceptance Definition. |
| ACCEPT-11 | Expense puede registrarse sin Account | FIN-GAP-003 | None | FIU-03 | FZ-03A | FIU-03 | MAPPED | Final Acceptance Definition. |
| ACCEPT-12 | Transfer requiere origen/destino | FIN-GAP-004 | None | FIU-04 | FZ-04 + Financial History Policy precondition | FIU-04 | MAPPED | Final Acceptance Definition. |
| ACCEPT-13 | Transfer no cuenta como Expense ni Income | FIN-GAP-004 | FIN-GAP-011 | FIU-04 | FZ-04 + Financial History Policy precondition | FIU-04 | MAPPED | Final Acceptance Definition. |
| ACCEPT-14 | cross-currency Transfer conserva ambos Amounts | FIN-GAP-004 | FIN-GAP-011 | FIU-04 | FZ-04 + Financial History Policy precondition | FIU-04 | MAPPED | Final Acceptance Definition. |
| ACCEPT-15 | Personal Account puede financiar Household Expense | FIN-GAP-001 | FIN-GAP-004 | FIU-01 | FZ-01 | FIU-01 | MAPPED | Final Acceptance Definition. |
| ACCEPT-16 | ese gasto se cuenta una sola vez en Household | FIN-GAP-001 | FIN-GAP-011 | FIU-01 | FZ-01 | FIU-01 | MAPPED | Final Acceptance Definition. |
| ACCEPT-17 | ese gasto no aparece como Personal spending | FIN-GAP-001 | FIN-GAP-011 | FIU-01 | FZ-01 | FIU-01 | MAPPED | Final Acceptance Definition. |
| ACCEPT-18 | Household no obtiene acceso al Personal Account | FIN-GAP-001 | None | FIU-01 | FZ-01 | FIU-01 | MAPPED | Final Acceptance Definition. |
| ACCEPT-19 | Household-funded money no puede ocultarse como Personal | FIN-GAP-001 | FIN-GAP-004 | FIU-01 | FZ-01 | FIU-01 | MAPPED | Final Acceptance Definition. |
| ACCEPT-20 | Contributions son Transfers | FIN-GAP-004 | None | FIU-04 | FZ-04 + Financial History Policy precondition | FIU-04 | MAPPED | Final Acceptance Definition. |
| ACCEPT-21 | Reimbursements son Transfers | FIN-GAP-004 | None | FIU-04 | FZ-04 + Financial History Policy precondition | FIU-04 | MAPPED | Final Acceptance Definition. |
| ACCEPT-22 | tarjeta puede representarse con Account negativa | FIN-GAP-002 | None | FIU-02 | FZ-02 | FIU-02 | MAPPED | Final Acceptance Definition. |
| ACCEPT-23 | pagar tarjeta es Transfer, no segundo Expense | FIN-GAP-004 | None | FIU-04 | FZ-04 + Financial History Policy precondition | FIU-04 | MAPPED | Final Acceptance Definition. |
| ACCEPT-24 | Transaction puede corregirse preservando History | FIN-GAP-005 | None | FIU-05 | FZ-05 | FIU-05 | MAPPED | Final Acceptance Definition. |
| ACCEPT-25 | Transaction Trash quita efectos financieros | FIN-GAP-005 | None | FIU-05 | FZ-05 | FIU-05 | MAPPED | Final Acceptance Definition. |
| ACCEPT-26 | Restore recupera efectos cuando no hay conflicto | FIN-GAP-005 | None | FIU-05 | FZ-05 | FIU-05 | MAPPED | Final Acceptance Definition. |
| ACCEPT-27 | Refund no es Income | FIN-GAP-006 | None | FIU-06 | FZ-06 | FIU-06 | MAPPED | Final Acceptance Definition. |
| ACCEPT-28 | Refund reduce Net Expense y Budget | FIN-GAP-006 | FIN-GAP-008, FIN-GAP-011 | FIU-06 | FZ-06 | FIU-06 | MAPPED | Final Acceptance Definition. |
| ACCEPT-29 | Category es opcional | FIN-GAP-007 | FIN-GAP-003 | FIU-03 | FZ-03B | FIU-03 | MAPPED | Final Acceptance Definition. |
| ACCEPT-30 | Category Archive preserva clasificación histórica | FIN-GAP-007 | None | FIU-03 | FZ-03B | FIU-03 | MAPPED | Final Acceptance Definition. |
| ACCEPT-31 | Monthly Total Budget existe | FIN-GAP-008 | None | FIU-07 | FZ-08 | FIU-07 | MAPPED | Final Acceptance Definition. |
| ACCEPT-32 | Category Budget existe | FIN-GAP-008 | None | FIU-07 | FZ-08 | FIU-07 | MAPPED | Final Acceptance Definition. |
| ACCEPT-33 | Expense sin Category afecta Total Budget | FIN-GAP-003 | FIN-GAP-008 | FIU-03 | FZ-03A | FIU-03 | MAPPED | Final Acceptance Definition. |
| ACCEPT-34 | Budget nunca bloquea un gasto real | FIN-GAP-003 | FIN-GAP-008 | FIU-03 | FZ-03A | FIU-03 | MAPPED | Final Acceptance Definition. |
| ACCEPT-35 | no existe carry-over automático | FIN-GAP-008 | None | FIU-07 | FZ-08 | FIU-07 | MAPPED | Final Acceptance Definition. |
| ACCEPT-36 | Budget leftover nunca crea dinero | FIN-GAP-008 | None | FIU-07 | FZ-08 | FIU-07 | MAPPED | Final Acceptance Definition. |
| ACCEPT-37 | Savings usa Account + Transfer | FIN-GAP-008 | FIN-GAP-002, FIN-GAP-004 | FIU-07 | FZ-08 | FIU-07 | MAPPED | Final Acceptance Definition. |
| ACCEPT-38 | Budget/Reports no mezclan currencies sin FX | FIN-GAP-011 | None | FIU-10 | FZ-11 | FIU-10 | MAPPED | Final Acceptance Definition. |
| ACCEPT-39 | Obligation no crea Expense por existir | FIN-GAP-009 | None | FIU-08 | FZ-07 | FIU-08 | MAPPED | Final Acceptance Definition. |
| ACCEPT-40 | Expected Amount puede ser desconocido | FIN-GAP-009 | None | FIU-08 | FZ-07 | FIU-08 | MAPPED | Final Acceptance Definition. |
| ACCEPT-41 | PENDING/PAID/SKIPPED/CANCELLED están definidos | FIN-GAP-009 | None | FIU-08 | FZ-07 | FIU-08 | MAPPED | Final Acceptance Definition. |
| ACCEPT-42 | OVERDUE es derivado | FIN-GAP-009 | FIN-GAP-012 | FIU-08 | FZ-07 | FIU-08 | MAPPED | Final Acceptance Definition. |
| ACCEPT-43 | recurring Obligation crea occurrences históricas | FIN-GAP-009 | None | FIU-08 | FZ-07 | FIU-08 | MAPPED | Final Acceptance Definition. |
| ACCEPT-44 | debt occurrences pueden acumularse | FIN-GAP-009 | None | FIU-08 | FZ-07 | FIU-08 | MAPPED | Final Acceptance Definition. |
| ACCEPT-45 | pause/end no reescriben pasado | FIN-GAP-009 | None | FIU-08 | FZ-07 | FIU-08 | MAPPED | Final Acceptance Definition. |
| ACCEPT-46 | Planner Task completion no marca Payment automáticamente | FIN-GAP-010 | None | FIU-09 | FZ-09 | FIU-09 | MAPPED | Final Acceptance Definition. |
| ACCEPT-47 | Payment real marca Obligation PAID | FIN-GAP-009 | None | FIU-08 | FZ-07 | FIU-08 | MAPPED | Final Acceptance Definition. |
| ACCEPT-48 | Payment manual puede reconciliar Planner Task | FIN-GAP-010 | None | FIU-09 | FZ-09 | FIU-09 | MAPPED | Final Acceptance Definition. |
| ACCEPT-49 | Task cancelada no cancela Obligation | FIN-GAP-010 | None | FIU-09 | FZ-09 | FIU-09 | MAPPED | Final Acceptance Definition. |
| ACCEPT-50 | Personal Obligation no inventa private Planner Task | FIN-GAP-010 | None | FIU-09 | FZ-09 | FIU-09 | MAPPED | Final Acceptance Definition. |
| ACCEPT-51 | Household Obligation sí puede componerse con Planner | FIN-GAP-010 | None | FIU-09 | FZ-09 | FIU-09 | MAPPED | Final Acceptance Definition. |
| ACCEPT-52 | Trash de Payment recalcula Obligation | FIN-GAP-009 | FIN-GAP-005 | FIU-08 | FZ-07 | FIU-08 | MAPPED | Final Acceptance Definition. |
| ACCEPT-53 | Reports cuentan cada Expense una sola vez | FIN-GAP-011 | None | FIU-10 | FZ-11 | FIU-10 | MAPPED | Final Acceptance Definition. |
| ACCEPT-54 | Transfers/Adjustments quedan fuera de Income/Expense | FIN-GAP-011 | FIN-GAP-002, FIN-GAP-004 | FIU-10 | FZ-11 | FIU-10 | MAPPED | Final Acceptance Definition. |
| ACCEPT-55 | Refunds reducen gastos sin inflar Income | FIN-GAP-006 | FIN-GAP-011 | FIU-06 | FZ-06 | FIU-06 | MAPPED | Final Acceptance Definition. |
| ACCEPT-56 | Home sólo muestra Finance cuando es relevante | FIN-GAP-012 | FIN-GAP-015 | FIU-11 | FZ-12 | FIU-11 | MAPPED | Final Acceptance Definition. |
| ACCEPT-57 | Attention Core se limita a Payment Due, Payment Overdue y Budget Exceeded | FIN-GAP-012 | FIN-GAP-009, FIN-GAP-015 | FIU-11 | FZ-12 | FIU-11 | MAPPED | Final Acceptance Definition. |
| ACCEPT-58 | Inventory/Assets/HomeCloud conservan ownership | FIN-GAP-013 | None | FIU-12 | FZ-13 Inventory / FZ-14 Assets+HomeCloud deferred | FIU-12 | MAPPED | Final Acceptance Definition. |
| ACCEPT-59 | Search/Geni respetan privacy | FIN-GAP-012 | FIN-GAP-014 | FIU-11 | FZ-12 | FIU-11 | MAPPED | Final Acceptance Definition. |
| ACCEPT-60 | Finance funciona sin IA | FIN-GAP-014 | None | NO EXECUTABLE FIU — Finance-side conformance owned across FIU-03/04/08 | FZ-10 External Canonical Consumer Boundary | FIU-03 primary + N4 regression FIU-04/FIU-08 | DEFERRED EXTERNAL CAPABILITY | Final Acceptance Definition. |
| ACCEPT-61 | Bank Sync/Open Banking no es requisito V1 | NO GAP — NON-GOAL | None | N/A | N/A | N5 scope/control regression | NON-GOAL | Final Acceptance Definition. |
| ACCEPT-62 | investimentos/trading/enterprise accounting/Splitwise-like settlements no forman parte del Target V1. | NO GAP — NON-GOAL | None | N/A | N/A | N5 scope/control regression | NON-GOAL | Final Acceptance Definition. |
| Product Principle 02.2 | Simple expense remains simple; advanced capability appears only when needed. | FIN-GAP-015 | None | FIU-14 | FZ-15 after Frontend Detail Pass | FIU-14 | SPECIFICATION DEPENDENCY | Frontend Detail Pass must preserve progressive complexity. |
| 04.2 Personal Finance | Personal Finance survives active-Household switching and can coexist with multiple Household memberships. | FIN-GAP-001 | None | FIU-01 | FZ-01 | FIU-01 | MAPPED | Personal owner is not active-Household membership. |
| 05.3 Cross-scope disclosure | Household disclosure of a personal-funded Household Expense is limited to allowed expense/payer/funding facts and must not expose private Account name, balance, private income/savings or unrelated movements. | FIN-GAP-001 | FIN-GAP-011, FIN-GAP-012 | FIU-01 | FZ-01 | FIU-01 | MAPPED | Projection-safe disclosure is explicit. |
| 07.3 Historical entry before anchor | A historical transaction before the Balance Anchor may affect historical reports without being subtracted again from a balance already incorporating it. | FIN-GAP-002 | FIN-GAP-011 | FIU-02 | FZ-02 | FIU-02 | MAPPED | Historical balance/report interaction. |
| 09.2 Archived Account | Archived Account is normally unavailable for new movements but preserves balance, transactions, historical reports and relationships. | FIN-GAP-002 | FIN-GAP-005, FIN-GAP-011 | FIU-02 | FZ-02 | FIU-02 | MAPPED | Archive is not deletion. |
| 12 / 12.1 Expense | Expense core carries Amount/Currency/Context/Date; Description/Category/Account/Notes/Document/Related Domain Object are optional where applicable; Quick Expense must not force optional complexity. | FIN-GAP-003 | FIN-GAP-015 | FIU-03 | FZ-03A | FIU-03 | MAPPED | Frontend labels/details remain pending. |
| 14 Cross-currency Transfer | A real transfer commission, if any, is a separate Expense rather than part of FX semantics. | FIN-GAP-004 | FIN-GAP-003 | FIU-04 | FZ-04 + Financial History Policy precondition | FIU-04 | MAPPED | No FX engine required. |
| 20.1 Transaction Editing | Only semantically valid fields may be corrected; listed correction dimensions include Amount, Date, Category, Description, Account, Context and Notes. | FIN-GAP-005 | FIN-GAP-003, FIN-GAP-007 | FIU-05 | FZ-05 | FIU-05 | MAPPED | Exact technical edit mechanism remains FZ-05. |
| 21.3 Permanent delete | Permanent delete belongs to the Global Data Lifecycle Pass, not the Finance trash/restore implementation. | FIN-GAP-005 | None | FIU-05 | FZ-05 | FIU-05 | EXTERNAL GLOBAL LIFECYCLE DEPENDENCY | Do not invent permanent-delete policy inside Finance. |
| 26 Total + Category Budgets | Total and Category budgets may coexist and category-budget sums are not required to equal the total budget. | FIN-GAP-008 | None | FIU-07 | FZ-08 | FIU-07 | MAPPED | Complementary limits. |
| 31 Savings | Finance V1 has no independent Savings Goal object; savings is normal Account + real Transfer. | FIN-GAP-008 | FIN-GAP-002, FIN-GAP-004 | FIU-07 | FZ-08 | FIU-07 | MAPPED | Prevents extra subsystem. |
| 35 One-time Obligation | One-time Obligation requires Name, Currency and Due Date; Expected Amount, Notes and Document are optional. | FIN-GAP-009 | None | FIU-08 | FZ-07 | FIU-08 | MAPPED | Field-level product requirement. |
| 38 SKIPPED | SKIPPED creates no Expense and does not stop future recurrence. | FIN-GAP-009 | None | FIU-08 | FZ-07 | FIU-08 | MAPPED | Occurrence-specific state. |
| 39 CANCELLED | Cancelling one occurrence does not necessarily end the recurrence series. | FIN-GAP-009 | None | FIU-08 | FZ-07 | FIU-08 | MAPPED | Occurrence and series lifecycle are distinct. |
| 44 Payment | Payment requires Actual Amount and Currency; Account is optional, and no-Account payment remains valid without affecting Account Balance. | FIN-GAP-009 | FIN-GAP-002, FIN-GAP-003 | FIU-08 | FZ-07 | FIU-08 | MAPPED | Financial truth uses actual payment amount. |
| 46 Expected vs Actual Amount | Expected Amount is optional and Payment Actual Amount is financial truth even when it differs from expectation. | FIN-GAP-009 | None | FIU-08 | FZ-07 | FIU-08 | MAPPED | Expected != actual. |
| 51 Payment before Planner completion | Registering Payment may offer completion of linked Planner Task but Planner must not change silently. | FIN-GAP-010 | FIN-GAP-009 | FIU-09 | FZ-09 | FIU-09 | MAPPED | User choice required. |
| 52 Planner Task Cancelled | After linked Task cancellation Finance may offer recreate/skip/cancel actions, but no automatic recreation loop exists. | FIN-GAP-010 | FIN-GAP-009 | FIU-09 | FZ-09 | FIU-09 | MAPPED | Planner/Finance lifecycle separation. |
| 55 Payment Restore | Payment restore may restore PAID only when conflict-free; another active Payment requires explicit conflict resolution. | FIN-GAP-009 | FIN-GAP-005 | FIU-08 | FZ-07 | FIU-08 | MAPPED | One active canonical Payment rule. |
| 56 Reports | Core Reports include Income, Expense, Net, Spending by Category, Month vs Previous Month, Budget vs Actual, and Upcoming Obligations. | FIN-GAP-011 | FIN-GAP-009 | FIU-10 | FZ-11 | FIU-10 | MAPPED — CORRECTED | Upcoming Obligations now has FIN-GAP-009 prerequisite. |
| 56 Reports UX | Reports must be visual/understandable rather than accounting-oriented; no final layout is frozen. | FIN-GAP-015 | FIN-GAP-011 | FIU-14 | FZ-15 after Frontend Detail Pass | FIU-14 | SPECIFICATION DEPENDENCY | Frontend Detail Pass owner. |
| 57.5 Contributions | Contributions may be shown as a separate statistic but must not inflate external Household Income. | FIN-GAP-011 | FIN-GAP-004 | FIU-10 | FZ-11 | FIU-10 | MAPPED | Optional statistic; financial classification fixed. |
| 59 Finance Main Experience | Finance may have a strong own statistical surface, but the Product Freeze does not define final layout. | FIN-GAP-015 | FIN-GAP-011 | FIU-14 | FZ-15 after Frontend Detail Pass | FIU-14 | SPECIFICATION DEPENDENCY | Frontend Detail Pass. |
| 60 Home | Home has no permanent right to show a Finance dashboard; Finance appears only when relevant. | FIN-GAP-012 | None | FIU-11 | FZ-12 | FIU-11 | MAPPED | Preserves Home authority. |
| 61.1 Attention thresholds | 80%/90% budget thresholds may be visual inside Finance but are not Attention Core. | FIN-GAP-012 | FIN-GAP-015 | FIU-11 | FZ-12 | FIU-11 | MAPPED | Attention Core remains Payment Due/Overdue/Budget Exceeded. |
| 61.2 Planner deduplication | Active Planner execution reminders must not be duplicated by equivalent Finance reminders. | FIN-GAP-012 | FIN-GAP-010 | FIU-11 | FZ-12 | FIU-11 | MAPPED | Finance owns financial state; Planner owns execution reminder. |
| 62 Inventory integration | Inventory owns items/quantities/stock/replenishment; Finance owns money; relation does not require copying financial line items into Inventory. | FIN-GAP-013 | None | FIU-12 | FZ-13 Inventory / FZ-14 Assets+HomeCloud deferred | FIU-12 | MAPPED | Inventory subpart planable. |
| 63 Assets integration | Assets owns repair/service truth; Finance owns expense/payment/cost truth; trashing Finance Expense must not delete real Asset Repair truth. | FIN-GAP-013 | FIN-GAP-005 | FIU-12 | FZ-13 Inventory / FZ-14 Assets+HomeCloud deferred | FIU-12 | DEFERRED EXTERNAL SUBPART | Wait for Assets canonical authority. |
| 64 HomeCloud | HomeCloud owns files; Finance owns contextual relation; documents are optional. | FIN-GAP-013 | None | FIU-12 | FZ-13 Inventory / FZ-14 Assets+HomeCloud deferred | FIU-12 | DEFERRED EXTERNAL SUBPART | Wait for HomeCloud canonical authority. |
| 65 Search | Search discovers Finance only under caller authority and never widens permissions. | FIN-GAP-012 | FIN-GAP-001 | FIU-11 | FZ-12 | FIU-11 | MAPPED | Search remains current authority. |
| 66 Geni | Geni is future-only in current Finance implementation; when available it must call canonical Finance capabilities and never own parallel accounting or bypass privacy. | FIN-GAP-014 | FIN-GAP-001 | NO EXECUTABLE FIU — Finance-side conformance owned across FIU-03/04/08 | FZ-10 External Canonical Consumer Boundary | FIU-03 primary + N4 regression FIU-04/FIU-08 | DEFERRED EXTERNAL CAPABILITY | No Geni FIU/runtime implementation now. |
| 67 Automations | Automations may consume deterministic canonical Finance operations but cannot invent Payment, bypass permissions, silently cross context, create parallel truth, or create Expense without valid cause/rule. | FIN-GAP-014 | FIN-GAP-001 | NO EXECUTABLE FIU — Finance-side conformance owned across FIU-03/04/08 | FZ-10 External Canonical Consumer Boundary | FIU-03 primary + N4 regression FIU-04/FIU-08 | DEFERRED EXTERNAL CAPABILITY | Accepted Current evidence lacks canonical Automations authority; future capability check required. |
| 69 Permissions | Finance defines capabilities, not final role bundles; Personal Finance is owner authority; Household capabilities are VIEW FINANCE, MANAGE MONEY, MANAGE BUDGETS, MANAGE OBLIGATIONS; Planner/HomeCloud actions also obey their module permissions. | FIN-GAP-001 | FIN-GAP-010, FIN-GAP-013 | FIU-01 | FZ-01 | FIU-01 | MAPPED / EXTERNAL GLOBAL PERMISSIONS PASS | Role-package defaults remain Global Permissions Pass. |
| 70.1 Planner creation failure | Planner creation failure leaves Obligation PENDING and creates no fake Planner link. | FIN-GAP-010 | FIN-GAP-009 | FIU-09 | FZ-09 | FIU-09 | MAPPED | Explicit conflict-path test requirement. |
| 70.2 Duplicate Payment | Duplicate Payment for the same occurrence is blocked in V1. | FIN-GAP-009 | None | FIU-08 | FZ-07 | FIU-08 | MAPPED | Explicit conflict-path test requirement. |
| 70.3 Duplicate Transfer execution | Duplicate Transfer execution cannot silently apply twice. | FIN-GAP-004 | None | FIU-04 | FZ-04 + Financial History Policy precondition | FIU-04 | MAPPED | Explicit conflict-path test requirement. |
| 70.4 Half Transfer | Half Transfer is not a valid product state. | FIN-GAP-004 | None | FIU-04 | FZ-04 + Financial History Policy precondition | FIU-04 | MAPPED | Explicit conflict-path test requirement. |
| 70.5 Cross-currency missing amount | Cross-currency Transfer missing source or destination amount is invalid. | FIN-GAP-004 | None | FIU-04 | FZ-04 + Financial History Policy precondition | FIU-04 | MAPPED | Explicit conflict-path test requirement. |
| 70.6 Expense with Refund → Trash | Expense with active Refund cannot be trashed until dependent Refund relation is explicitly resolved. | FIN-GAP-006 | FIN-GAP-005 | FIU-06 | FZ-06 | FIU-06 | MAPPED | Explicit conflict-path test requirement. |
| 70.7 Payment Expense Trash | Trashing Payment/Expense recalculates Obligation state. | FIN-GAP-009 | FIN-GAP-005 | FIU-08 | FZ-07 | FIU-08 | MAPPED | Explicit conflict-path test requirement. |
| 70.8 Account Currency change with History | Account Currency change is blocked when financial history exists. | FIN-GAP-002 | None | FIU-02 | FZ-02 | FIU-02 | MAPPED | Explicit conflict-path test requirement. |
| 70.9 Household-funded movement made private | Household-funded movement cannot be silently made private; it is blocked or explicitly restructured through Transfer. | FIN-GAP-001 | FIN-GAP-004 | FIU-01 | FZ-01 | FIU-01 | MAPPED | Explicit conflict-path test requirement. |
| 70.10 Unauthorized Personal Finance read | Unauthorized Personal Finance read is invisible/denied. | FIN-GAP-001 | None | FIU-01 | FZ-01 | FIU-01 | MAPPED | Explicit conflict-path test requirement. |
| 70.11 Account archive with history | Archiving an Account with historical transactions/obligations is allowed and history remains preserved. | FIN-GAP-002 | FIN-GAP-005, FIN-GAP-009 | FIU-02 | FZ-02 | FIU-02 | MAPPED | Explicit conflict-path test requirement. |
| 70.12 HomeCloud unavailable | Finance object survives when linked HomeCloud document is unavailable. | FIN-GAP-013 | None | FIU-12 | FZ-13 Inventory / FZ-14 Assets+HomeCloud deferred | FIU-12 | MAPPED | Explicit conflict-path test requirement. |
| 70.13 Asset/Inventory relation unavailable | Canonical Asset/Inventory object survives an unavailable Finance relationship and vice versa; relationship failure must not delete owner truth. | FIN-GAP-013 | None | FIU-12 | FZ-13 Inventory / FZ-14 Assets+HomeCloud deferred | FIU-12 | MAPPED | Explicit conflict-path test requirement. |

## 4. External / Deferred Capability Rules

- **Geni:** no current Finance implementation work. `FZ-10` freezes only the Finance-side canonical-consumer contract. Runtime Geni integration is deferred until a canonical Geni authority exists. No Geni FIU, prompt, route, service, adapter, query, command, parser, tool, prompt, UI or runtime test is required to complete Finance Core.
- **Automations:** accepted Current evidence demonstrates only Planner provenance token `automation`, not a canonical Automations authority. Runtime integration is deferred; a targeted capability check is required before any future Automations integration work.
- **Assets / HomeCloud:** FIN-GAP-013 remains partially deferred until their canonical authorities are available. Inventory subpart remains planable.
- **Permanent delete:** remains owned by the future Global Data Lifecycle Pass; Finance FZ-05 owns trash/restore/history, not global permanent-deletion policy.
- **Role bundles:** Finance defines capabilities; final Coordinator/Adult/Teen/Child bundles remain a Global Permissions Pass concern.

## 5. Test Ownership Rule

Every donor behavior used by a Finance FIU must receive a HOMePLUS-owned characterization test that expresses the HOMePLUS Product invariant. Donor tests are evidence/provenance only and never count as HOMePLUS correctness evidence.

## 6. Coverage Result

- Canonical Use Cases mapped: **60/60**
- Product Invariants mapped: **74/74**
- Final Acceptance rows mapped: **62/62**
- Supplemental normative clauses mapped: **46**
- Total normative source rows mapped: **242**
- Orphan requirements: **0**
- Rows with more than one PRIMARY owner: **0**
- Unexplained duplicate primary owners: **0**
- Product requirements lost: **0 identified in this correction pass**

## 7. Correction-Sensitive Checks

- `Upcoming Obligations` → PRIMARY `FIN-GAP-011`, SECONDARY/source truth `FIN-GAP-009`, FIU-10/FZ-11, test owner FIU-10 with FIU-08 source-truth regression.
- FIN-INV-073 / FIN-INV-074 → PRIMARY `FIN-GAP-014`, but no executable Geni/Automations FIU. Finance-side canonical-operation/no-AI conformance is tested by Finance core units under FZ-10.
- Transfer/history → FIN-GAP-004 remains Transfer owner; Financial History Policy is a mandatory precondition before FZ-04, while FIN-GAP-005/FZ-05 completes correction/trash/restore lifecycle.

## 8. Pre-Code Requirement

This traceability document must be preserved/versioned with the canonical Finance planning corpus and must remain PASS before the first Finance code-changing prompt.
