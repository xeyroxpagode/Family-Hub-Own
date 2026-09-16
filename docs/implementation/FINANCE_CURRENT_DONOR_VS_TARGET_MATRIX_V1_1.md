# HOMePLUS — FINANCE CURRENT + DONOR vs TARGET MATRIX V1.1

**Documento:** `FINANCE_CURRENT_DONOR_VS_TARGET_MATRIX_V1_1.md`  
**Módulo:** Finance  
**Fecha:** 2026-08-12  
**Estado:** `FINANCE_CURRENT_DONOR_MATRIX_V1_1_COMPLETE`  
**Modo:** `DECISION MATRIX / EXISTING-FIRST / NO IMPLEMENTATION`

---

# 00. PURPOSE

Este documento ejecuta el gate:

```text
CURRENT HOMePLUS V1.1
+
DONOR CAPABILITY REBASE V1.1
+
FINANCE PRODUCT FREEZE V1.1
↓
CURRENT + DONOR vs TARGET V1.1
```

Su objetivo es determinar, capability por capability:

```text
TARGET V1.1
CURRENT COVERAGE
DONOR CONTRIBUTION
COMBINED COVERAGE
RESIDUAL TARGET
OWNERSHIP BOUNDARY
```

Este documento NO:

- implementa Finance;
- diseña schema final;
- crea migrations;
- crea servicios/RPCs/screens;
- autoriza donor code copy;
- declara todavía los Real Gaps finales;
- convierte donor behavior en HomePlus authority;
- reabre Product Truth V1.1;
- implementa cross-module composition diferida.

El próximo gate será:

```text
REAL GAP MAP V1.1
```

---

# 01. INPUT AUTHORITIES

## 01.1 Target authority

```text
HOMePLUS_FINANCE_PRODUCT_FREEZE_V1.1
```

Estado:

```text
MODULE_PRODUCT_AND_FRONTEND_DEFINITION_CLOSED
```

V1.1 congela:

```text
Product Truth
Functional Behavior
Experience Model
Information Architecture
Frontend Surface Model
```

y difiere:

```text
role packages
→ Global Permissions Pass

cross-module composition
→ Cross-Module Integration Pass
```

## 01.2 Current authority

```text
FINANCE_CURRENT_CAPABILITY_AUDIT.md
+
FINANCE_CURRENT_CAPABILITY_REBASE_V1_1.md
```

Current baseline aceptado:

```text
Repo:
C:\Users\thega\Desktop\HomePlus

Branch:
pulido-medio-inventario-planner

HEAD:
3282907c0b0e2fe3b963e33cf4f0afc10909424f
```

El código fue confirmado por Control como sin cambios desde el audit original.

No se ejecutó una nueva inspección del repo para este rebase.

## 01.3 Donor authority

```text
FINANCE_DONOR_CAPABILITY_AUDIT.md
+
FINANCE_DONOR_CAPABILITY_REBASE_V1_1.md
```

Primary donor:

```text
kirill-markin/expense-budget-tracker
HEAD:
93d6ed1f8174a8f39551642391484dd87b4a045b
MIT
```

Mature reference:

```text
actualbudget/actual
HEAD:
d67ca574673fef386115fa5ebe26b62f0d6216e3
REFERENCE ONLY
```

Edge reference:

```text
firefly-iii/firefly-iii
NOT CONSULTED
NO CODE COPY
```

---

# 02. MATRIX CLASSIFICATION

## CURRENT STATUS

```text
PRESENT
→ Current already owns the required capability.

PARTIAL
→ Current owns useful foundations/primitives
  but not the complete Finance behavior.

ABSENT
→ No Current Finance capability was demonstrated.

NOT PROVEN
→ Old Current Audit did not inspect this exact reusable primitive.
```

## DONOR STATUS

```text
KEEP
→ behavior remains a valid adaptation source.

KEEP + REBOUND
→ behavior remains useful under a changed HomePlus boundary.

NARROW
→ only a limited behavior may be reused.

REFERENCE ONLY
→ edge cases/tests/invariant ideas only.

DONOR NOT NEEDED
→ HomePlus already owns the authority
  or donor has no canonical role.

REJECT
→ contradicts V1.1 or imports parallel architecture.

NONE
→ donor does not cover the capability.
```

## COMBINED COVERAGE

```text
COVERED BY CURRENT
→ no Finance-specific implementation gap for this capability,
  though integration may still be needed.

DONOR-BEHAVIOR COVERED
→ donor provides the relevant behavior,
  but HomePlus adaptation/authority is still required.

PARTIAL
→ Current + donor reduce the work,
  but important V1.1 behavior remains.

RESIDUAL
→ V1.1 capability remains substantially unprovided.

DEFERRED
→ intentionally outside Finance Core.

NON-TARGET ALIGNMENT
→ absence is correct because V1.1 excludes it.
```

Important:

```text
DONOR-BEHAVIOR COVERED
≠
IMPLEMENTED
```

Donor logic never automatically owns:

```text
privacy
canonical lifecycle
HomePlus entities
HomePlus mutations
HomePlus UI
HomePlus permissions
```

---

# 03. EXECUTIVE RESULT

Current already owns substantial platform authority:

```text
Auth
Person identity
Household
Membership
RLS foundations
Audit
Outbox
Mutation contracts
Idempotency/reliability foundations
App Shell
Home pattern
Attention pattern
Search pattern
Notification preference primitive
Shared UI
Test infrastructure
```

Current does NOT contain an active Finance implementation:

```text
no Finance schema
no Finance API
no Finance services
no Finance screens
no Finance tests
no Accounts
no Transactions
no Budgets
no Payments
no Finance Reports
```

Donor materially reduces implementation uncertainty for:

```text
ledger/movement semantics
transaction classification
balance derivation
negative balances
transfer grouping
monthly/category Budget models
Budget actual derivation
report aggregation
native Currency safety
```

Donor does NOT solve:

```text
HomePlus financial scope/privacy
persistent Account authority
Unknown Balance
Balance Anchor
history-safe correction
Refund
Expense without Account
Finance Category authority
Payment/occurrence domain
HomePlus frontend
HomePlus reliability ownership
Attention/Home/Search integration ownership
```

Therefore:

```text
FINANCE V1.1:
NOT COVERED BY CURRENT + DONOR

BUT

IMPLEMENTATION UNCERTAINTY:
MATERIALLY REDUCED
```

---

# 04. CANONICAL OWNERSHIP PRESERVATION MAP

| Capability / Authority | Canonical owner | Current | Donor role | V1.1 decision |
|---|---|---|---|---|
| Identity | Auth/Core | PRESENT | NONE | KEEP CURRENT |
| Person ownership | Auth/Core | PRESENT | NONE | EXTEND CURRENT |
| Household | Household | PRESENT | NONE | EXTEND CURRENT |
| Membership | Household | PRESENT | NONE | EXTEND CURRENT |
| RLS foundation | Core/Household/Auth | PRESENT | REJECT donor RLS | EXTEND CURRENT |
| Audit | Core | PRESENT | NONE | EXTEND CURRENT |
| Outbox | Core | PRESENT | NONE | EXTEND CURRENT |
| Mutation contracts | Core | PRESENT | NONE | EXTEND CURRENT |
| Reliability | Global/Core | PARTIAL/strong | donor not authority | EXTEND CURRENT |
| App Shell | Global | PRESENT | donor UI rejected | KEEP CURRENT |
| Finance financial truth | Finance | ABSENT | behavior only | BUILD MINIMAL FINANCE AUTHORITY |
| Home | Home | PRESENT pattern | NONE | Finance produces projection only |
| Attention | Attention | PRESENT pattern | NONE | Finance produces signals only |
| Notifications | Notifications | PARTIAL | NONE | Finance never owns delivery |
| Search | Search | PRESENT pattern | donor search rejected | Finance supplies permission-safe projection |
| Planner | Planner | PRESENT | NONE | KEEP OWNER; Finance relation deferred |
| Inventory | Inventory | PRESENT | NONE | KEEP OWNER; relation deferred |
| Assets | Assets | not active in old Current evidence | NONE | relation deferred |
| HomeCloud | HomeCloud | not active in old Current evidence | NONE | relation deferred |
| Geni | Geni | external | SQL agent rejected | consume canonical Finance ops only |
| Automations | Automations | external | SQL agent rejected | consume canonical Finance ops only |

---

# 05. CORE TARGET MATRIX — IDENTITY, CONTEXT, PRIVACY

## C-001 — Personal and Household Finance are distinct

**Target V1.1**

```text
PERSONAL
HOUSEHOLD
```

are separate Financial Contexts.

**Current**

```text
PARTIAL
```

Evidence/foundation:

```text
people
households
household_members
current_person_id()
membership/RLS helpers
Planner personal/shared visibility precedent
```

No Finance context authority.

**Donor**

```text
REJECT
```

Donor workspace/business-personal concepts are not HomePlus privacy authority.

**Combined**

```text
PARTIAL
```

**Residual target**

```text
Finance Financial Context ownership
scope binding
scope selection
scope inheritance
Finance RLS/projections
```

---

## C-002 — Personal Finance owner-only by default

**Current:** `PARTIAL`

Self-only person policy and personal visibility precedents exist.

**Donor:** `REJECT`

**Combined:** `PARTIAL`

**Residual**

```text
Personal Finance record ownership
Personal Account owner projection
owner-only selectors/reports/search/attention
```

---

## C-003 — Household Finance uses Household authority

**Current:** `PARTIAL / strong foundation`

**Donor:** `DONOR NOT NEEDED`

**Combined:** `PARTIAL`

**Residual**

```text
Finance household-scoped records
Finance membership capability checks
household financial projection rules
```

---

## C-004 — Household Finance cannot expose private Personal Account internals

**Current:** `PARTIAL`

RLS primitives exist; no Finance projection.

**Donor:** `REJECT`

**Combined:** `PARTIAL`

**Residual**

```text
cross-context privacy boundary
safe presentation of household Expense funded from Personal Account
```

---

## C-005 — Financial Context selector is independent from global Household switch

**Current:** `PARTIAL`

`HouseholdSwitcherSheet` and App Shell exist.

No Finance context selector.

**Donor:** `NONE`

**Combined:** `PARTIAL`

**Residual**

```text
Finance-scoped context selector
without mutating global App Shell household state
```

---

# 06. CORE TARGET MATRIX — ACCOUNTS & BALANCE

## C-006 — Persistent Account authority

**Target**

Account may exist with no movements.

**Current:** `ABSENT`

**Donor:** `KEEP + REBOUND`

Useful donor behavior:

```text
account-related read models
balance aggregation
```

Rejected:

```text
derived account existence
MODE currency
```

**Combined:** `PARTIAL`

**Residual**

```text
canonical persistent Account authority
create/read/edit lifecycle
ownership/context
```

---

## C-007 — Account type ACCOUNT / CREDIT_CARD

**Current:** `ABSENT`

**Donor:** `NARROW / reference via negative balance`

**Combined:** `RESIDUAL`

**Residual**

```text
HomePlus Account type
presentation semantics
```

No card subsystem.

---

## C-008 — Account can exist with Unknown Balance

**Current:** `ABSENT`

**Donor:** `REJECT`

**Combined:** `RESIDUAL`

**Residual**

```text
Unknown Balance state
unknown != zero
```

---

## C-009 — Balance Anchor

**Current:** `ABSENT`

**Donor:** `REJECT`

**Combined:** `RESIDUAL`

**Residual**

```text
Balance Anchor authority
effects-after-anchor calculation
```

---

## C-010 — Balance derivation

**Current:** `ABSENT`

**Donor:** `KEEP`

Useful:

```text
ledger sum arithmetic
positive/negative balance handling
derived-total tests
```

**Combined:** `DONOR-BEHAVIOR COVERED`

**Residual**

```text
adapt into HomePlus Account/Anchor/history semantics
```

---

## C-011 — Negative Balance allowed

**Current:** `ABSENT`

**Donor:** `KEEP + REBOUND`

**Combined:** `DONOR-BEHAVIOR COVERED`

**Residual**

```text
HomePlus validation/presentation
Credit Card debt language
```

---

## C-012 — Balance Correction

**Current:** `PARTIAL foundation`

Audit/history foundation only.

**Donor:** `NONE`

**Combined:** `RESIDUAL`

**Residual**

```text
Balance Correction financial effect
no Income/Expense/Budget contamination
history
```

---

## C-013 — Account Currency stable after financial history

**Current:** `ABSENT`

**Donor:** `REJECT`

Donor MODE-derived currency conflicts.

**Combined:** `RESIDUAL`

---

## C-014 — Account Archive / Unarchive

**Current:** `PARTIAL generic trash/archive precedent`

No Finance Account lifecycle.

**Donor:** `REJECT`

**Combined:** `RESIDUAL`

**Residual**

```text
ACTIVE ↔ ARCHIVED
preserve Balance/history
hide from normal selectors
restore to active
```

---

# 07. CORE TARGET MATRIX — TRANSACTIONS

## C-015 — Income / Expense / Transfer are distinct

**Current:** `ABSENT`

**Donor:** `KEEP`

Useful:

```text
kind validation
filtering
report grouping
```

**Combined:** `DONOR-BEHAVIOR COVERED`

**Residual**

```text
canonical HomePlus transaction authority
```

---

## C-016 — Expense can exist without Account

**Current:** `ABSENT`

**Donor:** `REJECT`

Donor requires `account_id`.

**Combined:** `RESIDUAL`

This is non-negotiable for V1.1 Quick Expense.

---

## C-017 — Income can exist without Account

**Current:** `ABSENT`

**Donor:** donor account requirement is incompatible

**Combined:** `RESIDUAL`

---

## C-018 — Canonical Transfer has Source + Destination

**Current:** `ABSENT`

**Donor:** `KEEP`

Paired effect/grouping semantics useful.

**Combined:** `PARTIAL`

**Residual**

```text
one logical Transfer authority
atomic mutation
source != destination validation
```

---

## C-019 — Same-account Transfer rejected

**Current:** `ABSENT`

**Primary donor:** insufficient

**Actual Budget:** `REFERENCE ONLY`

**Combined:** `PARTIAL / reference`

**Residual**

```text
HomePlus canonical validation
```

---

## C-020 — Transfer not counted as Income or Expense

**Current:** `ABSENT`

**Donor:** `KEEP / reference`

**Combined:** `DONOR-BEHAVIOR COVERED`

Residual adaptation into HomePlus reports/Budget.

---

## C-021 — Cross-currency Transfer stores both amounts

**Current:** `ABSENT`

**Donor:** `REFERENCE ONLY`

**Combined:** `PARTIAL`

**Residual**

```text
two-side amount/currency semantics
without required FX engine
```

---

## C-022 — Ledger/event grouping for multi-effect operations

**Current:** `PARTIAL infrastructure`

Mutation correlation exists, but not Finance ledger event grouping.

**Donor:** `KEEP`

**Combined:** `PARTIAL / strong`

**Residual**

```text
HomePlus financial event grouping
without adopting donor architecture
```

---

# 08. CORE TARGET MATRIX — SOURCE vs CONTEXT

## C-023 — Source and Financial Context are separate

**Current:** `ABSENT`

**Donor:** `REFERENCE ONLY` via business/personal transfer analogue

**Combined:** `RESIDUAL`

---

## C-024 — Personal Account may fund Household Expense without exposing internals

**Current:** `PARTIAL privacy foundation`

**Donor:** no valid HomePlus privacy authority

**Combined:** `RESIDUAL`

---

## C-025 — Contribution represented as Transfer

**Current:** `ABSENT`

**Donor:** transfer primitive behavior can support representation

**Combined:** `PARTIAL`

Residual is HomePlus semantics, not a new Contribution subsystem.

---

## C-026 — Reimbursement represented as Transfer

**Current:** `ABSENT`

**Donor:** transfer primitive behavior can support representation

**Combined:** `PARTIAL`

---

# 09. CORE TARGET MATRIX — HISTORY / CORRECTION / TRASH

## C-027 — Transaction correction preserves history

**Current:** `PARTIAL / strong shared foundation`

```text
audit_events
append-only guard
mutation correlation
version precedents
```

**Primary donor:** `REJECT`

Direct mutation/hard-delete model conflicts.

**Actual Budget:** `REFERENCE ONLY`

**Combined:** `PARTIAL`

**Residual**

```text
Finance correction lifecycle
financial current-effect recalculation
history presentation
```

---

## C-028 — Trash removes current financial effects

**Current:** `PARTIAL`

Planner trash/restore precedent.

**Donor:** primary donor rejected; Actual reference only.

**Combined:** `PARTIAL`

**Residual**

```text
financial effect exclusion
recalculation
dependency validation
```

---

## C-029 — Restore reapplies effects safely

**Current:** `PARTIAL`

Restore RPC precedent.

**Donor:** reference only.

**Combined:** `PARTIAL`

---

## C-030 — Permanent delete belongs to Global Data Lifecycle

**Current:** global lifecycle final authority not proven by Finance audit

**Donor:** not authority

**Combined:** `DEFERRED / external`

Finance Core must not invent a permanent-delete subsystem.

---

# 10. CORE TARGET MATRIX — REFUND

## C-031 — Refund is not Income

**Current:** `ABSENT`

**Donor:** `REJECT / no refund model`

**Combined:** `RESIDUAL`

---

## C-032 — Refund linked to original Expense

**Current:** `ABSENT`

**Donor:** `NONE`

**Combined:** `RESIDUAL`

---

## C-033 — Refund reduces Net Expense

**Current:** `ABSENT`

**Donor:** no canonical Refund

**Combined:** `RESIDUAL`

---

## C-034 — Refund reduces Budget Spent

**Current:** `ABSENT`

**Donor:** budget derivation can be adapted but lacks Refund

**Combined:** `PARTIAL`

Residual Refund-specific calculation.

---

## C-035 — Refund cannot exceed original Expense

**Current:** `ABSENT`

**Donor:** `NONE`

**Combined:** `RESIDUAL`

---

# 11. CORE TARGET MATRIX — CATEGORIES V1.1

## C-036 — Category optional on Expense

**Current:** `PARTIAL generic category precedent`

**Donor:** `NARROW`

Nullable category behavior useful.

**Combined:** `DONOR-BEHAVIOR COVERED`

Residual is Finance authority integration.

---

## C-037 — Useful native Category baseline required

**Current:** `ABSENT / no Finance category authority`

No content-seeding capability was proven for Finance.

**Donor:** `REJECT` as canonical catalog; donor history-derived categories not authority.

**Combined:** `RESIDUAL`

---

## C-038 — Custom Category create/edit/delete

**Current:** `ABSENT`

**Donor:** `NARROW / reference only`

**Combined:** `RESIDUAL`

---

## C-039 — Deleting Category preserves historical transaction meaning

**Current:** `ABSENT`

**Donor:** `REFERENCE ONLY`

Historical stored value demonstrates an idea, not target architecture.

**Combined:** `PARTIAL / reference`

---

## C-040 — Category Archive is NOT a V1.1 lifecycle

**Current:** no Finance category/archive surface

**Donor:** no need

**Combined:** `NON-TARGET ALIGNMENT`

Do not recreate old V1.0 archive semantics.

---

# 12. CORE TARGET MATRIX — BUDGETS

## C-041 — Monthly total Budget

**Current:** `ABSENT`

**Donor:** `KEEP + REBOUND`

**Combined:** `PARTIAL / strong donor behavior`

Residual HomePlus authority/scope/history.

---

## C-042 — Category Budget

**Current:** `ABSENT`

**Donor:** `KEEP + REBOUND`

**Combined:** `PARTIAL / strong donor behavior`

---

## C-043 — Budget Spent derived from real transactions

**Current:** `ABSENT`

**Donor:** `KEEP`

**Combined:** `DONOR-BEHAVIOR COVERED`

Must adapt:

```text
Expense +
Refund -
Transfer 0
Balance Correction 0
```

---

## C-044 — Budget never blocks Expense

**Current:** `ABSENT`

**Donor:** useful no-blocking precedent

**Combined:** `PARTIAL`

HomePlus mutation authority must preserve invariant.

---

## C-045 — No automatic carry-over

**Current:** `ABSENT`

**Donor:** no useful carry-over authority needed

**Combined:** `RESIDUAL / simple invariant`

---

## C-046 — Budget leftover != savings

**Current:** `ABSENT`

**Donor:** `REFERENCE ONLY`

**Combined:** `RESIDUAL / product semantic`

---

## C-047 — Savings via Account + Transfer

**Current:** `ABSENT Finance primitives`

**Donor:** `REFERENCE ONLY`

**Combined:** `PARTIAL once Account/Transfer exist`

No separate savings subsystem.

---

## C-048 — Historical Budget target preserved

**Current:** `ABSENT`

**Donor:** `KEEP + REBOUND` base-plan/history concepts

**Combined:** `PARTIAL`

Residual exact HomePlus period-history behavior.

---

## C-049 — Future applicability can be changed/stopped

**Current:** `ABSENT`

**Donor:** budget adjustment subsystem now `REFERENCE ONLY`

**Combined:** `RESIDUAL`

Do not assume donor `budget_adjustments` is required.

---

## C-050 — No generic Budget Archive

**Current:** no Finance Budget/archive

**Donor:** no need

**Combined:** `NON-TARGET ALIGNMENT`

---

# 13. CORE TARGET MATRIX — PAYMENTS

## C-051 — Expected Payment does not create Expense

**Current:** `ABSENT`

Planner terminology is not Finance payment.

**Donor:** `REJECT / none`

**Combined:** `RESIDUAL`

---

## C-052 — Expected amount may be Unknown

**Current:** `ABSENT`

**Donor:** `NONE`

**Combined:** `RESIDUAL`

---

## C-053 — One-time expected Payment

**Current:** `ABSENT`

**Donor:** `NONE`

**Combined:** `RESIDUAL`

---

## C-054 — Recurring expected Payment

**Current:** `PARTIAL recurrence precedent`

Planner recurrence exists.

**Donor:** `NONE`

**Combined:** `PARTIAL`

Residual Finance recurrence authority.

---

## C-055 — Occurrence history

**Current:** `PARTIAL`

Planner occurrence identity/series semantics exist.

**Donor:** `NONE`

**Combined:** `PARTIAL`

Residual Finance occurrence ledger.

---

## C-056 — PENDING / PAID / SKIPPED / CANCELLED

**Current:** `PARTIAL`

Planner has some temporal/task states, not Finance Payment states.

**Donor:** `NONE`

**Combined:** `RESIDUAL`

---

## C-057 — OVERDUE is derived

**Current:** `PARTIAL`

Planner Attention derives temporal urgency.

**Donor:** `NONE`

**Combined:** `PARTIAL`

Residual Finance due-state calculation.

---

## C-058 — Debt occurrences can accumulate independently

**Current:** `ABSENT`

**Donor:** `NONE`

**Combined:** `RESIDUAL`

---

## C-059 — Pause/end recurrence does not rewrite history

**Current:** `PARTIAL recurrence precedent`

**Donor:** `NONE`

**Combined:** `PARTIAL`

---

## C-060 — Register Payment creates actual financial truth

**Current:** `ABSENT`

**Donor:** `NONE`

**Combined:** `RESIDUAL`

Target:

```text
Payment
+
Expense
+
occurrence PAID
```

---

## C-061 — Only actual Payment marks occurrence PAID

**Current:** `ABSENT`

**Donor:** `NONE`

**Combined:** `RESIDUAL`

---

## C-062 — Trashing Payment recalculates occurrence

**Current:** `PARTIAL trash foundation`

**Donor:** `NONE`

**Combined:** `RESIDUAL`

---

# 14. PAYMENT RESOLUTION PATH — V1.1 CHANGE

## C-063 — Due/Overdue Finance state can feed Attention

**Current:** `PARTIAL`

Attention authority/pattern exists.

Finance signal source absent.

**Donor:** `DONOR NOT NEEDED`

**Combined:** `PARTIAL`

Residual Finance signal production.

---

## C-064 — Notifications owns delivery

**Current:** `PARTIAL`

Notification preferences include `finanzas`; delivery completeness not proven by old Finance audit.

**Donor:** `DONOR NOT NEEDED`

**Combined:** `PARTIAL / external authority`

Finance must not create delivery infrastructure.

---

## C-065 — Attention/notification routes to Payment Detail / Register Payment

**Current:** `PARTIAL surface/navigation precedent`

**Donor:** `NONE`

**Combined:** `RESIDUAL`

---

## C-066 — No automatic Planner Task for ordinary Payment reminder

**Current:** Planner composition seam exists.

**Donor:** not needed.

**Combined:** `COVERED AS BOUNDARY`

Decision:

```text
DO NOT USE Planner seam in Finance Core.
```

---

# 15. CORE TARGET MATRIX — REPORTS / MULTICURRENCY

## C-067 — Income/Expense/Net aggregation

**Current:** `ABSENT`

**Donor:** `KEEP + REBOUND`

**Combined:** `DONOR-BEHAVIOR COVERED`

Residual HomePlus scope/privacy/refund semantics.

---

## C-068 — Spending by Category

**Current:** `ABSENT`

**Donor:** `KEEP + REBOUND`

**Combined:** `DONOR-BEHAVIOR COVERED`

---

## C-069 — Period vs previous period

**Current:** no Finance read model

**Donor:** aggregation patterns reusable

**Combined:** `PARTIAL`

---

## C-070 — Budget vs Actual

**Current:** `ABSENT`

**Donor:** `KEEP`

**Combined:** `DONOR-BEHAVIOR COVERED`

Residual HomePlus Budget authority/history.

---

## C-071 — Count real Expense once

**Current:** `ABSENT`

**Donor:** grouping/reporting behavior useful

**Combined:** `PARTIAL`

Must include Source vs Context dedupe and Refund rules.

---

## C-072 — No silent currency mixing

**Current:** `ABSENT`

**Donor:** `KEEP`

**Combined:** `DONOR-BEHAVIOR COVERED`

---

## C-073 — No required FX engine

**Current:** no FX engine

**Donor:** donor FX worker explicitly rejected

**Combined:** `COVERED AS BOUNDARY / NON-TARGET ALIGNMENT`

---

# 16. CORE TARGET MATRIX — CREDIT CARD

## C-074 — Card purchase is Expense

**Current:** `ABSENT`

**Donor:** generic Expense/negative balance behavior partial

**Combined:** `PARTIAL`

---

## C-075 — Card payment is Transfer, not second Expense

**Current:** `ABSENT`

**Donor:** Transfer behavior useful

**Combined:** `PARTIAL`

---

## C-076 — Advanced card statement tracking is Future

**Current:** absent

**Donor:** no import required

**Combined:** `NON-TARGET ALIGNMENT`

Do not build:

```text
statement closing
minimum payment
rich statement engine
```

---

# 17. FRONTEND MATRIX — GLOBAL SHELL & IA

## FE-001 — Entry is More → Finanzas

**Current:** `PARTIAL`

Global App Shell/navigation exists.

Finance route absent.

**Donor:** web UI `NARROW / no authority`

**Combined:** `PARTIAL`

Residual: add Finance entry using existing navigation.

---

## FE-002 — No Finance-specific App Shell/Navbar/Design System

**Current:** global shell/UI primitives exist.

**Donor:** donor shell rejected.

**Combined:** `COVERED AS BOUNDARY`

---

## FE-003 — Financial Context selector

**Current:** `PARTIAL`

Household switcher exists but semantics differ.

**Donor:** none.

**Combined:** `PARTIAL`

Residual Finance-only scope switch.

---

## FE-004 — Primary tabs exactly Resumen / Movimientos / Pagos

**Current:** `ABSENT`

Generic segmented control matching target not proven.

**Donor:** UI not authority.

**Combined:** `RESIDUAL`

---

## FE-005 — No Reports tab

**Current:** no Finance UI.

**Donor:** donor report IA rejected.

**Combined:** `NON-TARGET ALIGNMENT / BOUNDARY`

---

## FE-006 — No Accounts tab

**Current:** no Finance UI.

**Donor:** web navigation rejected.

**Combined:** `NON-TARGET ALIGNMENT / BOUNDARY`

---

# 18. FRONTEND MATRIX — RESUMEN

## FE-007 — Resumen period header

**Current:** `PARTIAL date/calendar precedent`

**Donor:** aggregation behavior only.

**Combined:** `PARTIAL`

Residual Finance month navigator.

---

## FE-008 — Expense / Income / Net summary

**Current:** UI cards present; Finance data absent.

**Donor:** report aggregation useful.

**Combined:** `PARTIAL / strong`

---

## FE-009 — Budget state

**Current:** progress display precedent.

**Donor:** Budget actual behavior useful.

**Combined:** `PARTIAL / strong`

---

## FE-010 — Spending composition

**Current:** cards/list precedent.

**Donor:** category aggregation useful.

**Combined:** `PARTIAL / strong`

---

## FE-011 — Relevant financial Attention only when needed

**Current:** Attention/Home patterns.

**Donor:** not needed.

**Combined:** `PARTIAL`

---

## FE-012 — Link to Análisis

**Current:** navigation primitives.

**Donor:** none.

**Combined:** `PARTIAL`

---

# 19. FRONTEND MATRIX — MOVIMIENTOS

## FE-013 — Movement list

**Current:** generic list/loading/error/empty patterns.

**Donor:** transaction query/filter behavior useful.

**Combined:** `PARTIAL / strong`

---

## FE-014 — Local + opens canonical Money Flow

**Current:** ActionSheet/QuickAction patterns.

**Donor:** no frontend authority.

**Combined:** `PARTIAL`

---

## FE-015 — Gasto / Ingreso / Transferir selector

**Current:** dedicated Finance segmented control absent.

**Donor:** kind model useful, UI rejected.

**Combined:** `PARTIAL`

---

## FE-016 — Expense form

**Current:** form primitives/date picker/decimal input.

**Donor:** transaction validation behavior useful but Account requirement rejected.

**Combined:** `PARTIAL`

Residual Finance semantics and optional Account/Category.

---

## FE-017 — Income form

**Current:** form primitives.

**Donor:** transaction kind behavior.

**Combined:** `PARTIAL`

---

## FE-018 — Transfer form

**Current:** generic forms/cards only.

**Donor:** paired Transfer behavior useful.

**Combined:** `PARTIAL`

---

## FE-019 — Transfer impact preview

**Current:** no Finance preview.

**Donor:** arithmetic can support calculation.

**Combined:** `PARTIAL`

Residual dedicated UX/presentation.

---

## FE-020 — Money-aware input

**Current:** `PARTIAL`

`decimal-pad` exists; dedicated money primitive absent.

**Donor:** UI not authority.

**Combined:** `PARTIAL`

Residual:

```text
locale formatting
Currency visibility
derived sign
unknown != 0
safe correction
```

---

## FE-021 — Quick filters

**Current:** Inventory/Planner filter patterns.

**Donor:** transaction kind filtering useful.

**Combined:** `PARTIAL / strong`

---

## FE-022 — Detailed filters

**Current:** filter pattern partial.

**Donor:** Category/Account/Currency filtering logic useful.

**Combined:** `PARTIAL / strong`

---

## FE-023 — Movement Detail

**Current:** generic detail/action UI precedent.

**Donor:** data/read-model behavior.

**Combined:** `PARTIAL`

---

## FE-024 — “Algo está mal” contextual correction menu

**Current:** sheets/trash/undo patterns.

**Donor:** primary mutation lifecycle rejected.

**Combined:** `PARTIAL`

Residual Finance Correction/Refund/Trash semantics.

---

# 20. FRONTEND MATRIX — PAGOS

## FE-025 — Pagos urgency ordering

**Target**

```text
Vencidos
Próximos
Más adelante
Resueltos recientemente
```

**Current:** temporal/Attention precedent only.

**Donor:** none.

**Combined:** `PARTIAL`

---

## FE-026 — Pagos local + adds expected Payment

**Current:** ActionSheet/button patterns.

**Donor:** none.

**Combined:** `PARTIAL`

---

## FE-027 — Expected Payment form

**Current:** form/date/recurrence precedents.

**Donor:** none.

**Combined:** `PARTIAL`

---

## FE-028 — Payment Detail

**Current:** generic detail patterns.

**Donor:** none.

**Combined:** `PARTIAL`

---

## FE-029 — Register Payment flow

**Current:** generic forms/mutation foundation.

**Donor:** none.

**Combined:** `RESIDUAL`

---

## FE-030 — Recurrence history/status actions

**Current:** Planner recurrence/series precedent.

**Donor:** none.

**Combined:** `PARTIAL`

---

# 21. FRONTEND MATRIX — ANÁLISIS / BUDGET

## FE-031 — Single Análisis surface

**Current:** generic cards/progress.

**Donor:** aggregation behavior useful.

**Combined:** `PARTIAL`

---

## FE-032 — Análisis merges analytics + Budget detail

**Current:** no Finance surfaces.

**Donor:** logic useful, IA rejected.

**Combined:** `PARTIAL`

Residual is HomePlus composition, not new math.

---

## FE-033 — Category drill-down → scoped Movimientos

**Current:** navigation/filter patterns.

**Donor:** category filter/read-model behavior.

**Combined:** `PARTIAL / strong`

---

## FE-034 — Manage Budget contextual action

**Current:** form/sheet primitives.

**Donor:** Budget plan behavior useful.

**Combined:** `PARTIAL`

---

# 22. FRONTEND MATRIX — SECONDARY SURFACES

## FE-035 — Root overflow only Cuentas / Categorías / Papelera

**Current:** ActionSheet/overflow pattern.

**Donor:** donor navigation rejected.

**Combined:** `PARTIAL`

---

## FE-036 — Accounts surface

**Current:** list/card/empty state only.

**Donor:** account/balance read behavior.

**Combined:** `PARTIAL`

---

## FE-037 — Accounts grouped safely by Currency

**Current:** no Finance list.

**Donor:** native currency grouping useful.

**Combined:** `PARTIAL`

---

## FE-038 — Accounts empty state says Finance works without Accounts

**Current:** `EmptyState` present.

**Donor:** none.

**Combined:** `PARTIAL`

Residual Product copy/CTA.

---

## FE-039 — Create Account Edit step

**Current:** form primitives.

**Donor:** account metadata/read behavior only.

**Combined:** `PARTIAL`

---

## FE-040 — Create Account Review step

**Current:** canonical review primitive `NOT PROVEN`.

**Donor:** UI not authority.

**Combined:** `RESIDUAL / EXISTING-FIRST CHECK REQUIRED`

Before creating new shared primitive, implementation preflight must search Current.

---

## FE-041 — Account Detail

**Current:** generic detail UI.

**Donor:** balance/list behavior.

**Combined:** `PARTIAL`

---

## FE-042 — Credit Card debt presentation

**Current:** no Finance card UI.

**Donor:** negative balance behavior.

**Combined:** `PARTIAL`

---

## FE-043 — Categories surface

**Current:** generic form/list patterns.

**Donor:** nullable/history reference only.

**Combined:** `PARTIAL`

---

## FE-044 — Papelera surface

**Current:** trash/restore/Undo precedent.

**Donor:** Actual history reference only.

**Combined:** `PARTIAL`

---

## FE-045 — No global Archivados surface

**Current:** no Finance screen.

**Donor:** none.

**Combined:** `NON-TARGET ALIGNMENT`

---

# 23. FRONTEND MATRIX — RELIABILITY / STATES

## FE-046 — Pending/offline/retrying/uncertain/conflicted/confirmed UX

**Current:** `PARTIAL / strong`

Reliability runtime and server state precedents exist.

**Donor:** not authority.

**Combined:** `PARTIAL / strong`

Residual Finance adapter/state mapping.

---

## FE-047 — Double submit cannot duplicate money

**Current:** `PARTIAL / strong`

Mutation IDs/idempotency/reliability primitives.

**Donor:** budget-adjustment idempotency reference may inform tests.

**Combined:** `PARTIAL / strong`

Residual canonical Finance mutation integration.

---

## FE-048 — Error/empty/loading states

**Current:** `PRESENT generic primitives`

```text
EmptyState
ErrorState
Skeleton
PlannerStateView partial
```

**Donor:** not needed.

**Combined:** `COVERED BY CURRENT` for generic primitives.

Finance copy/mapping remains.

---

## FE-049 — Finance-specific tests

**Current:** Finance tests absent; shared harness strong.

**Donor:** donor tests can inform behavior but cannot replace HomePlus tests.

**Combined:** `PARTIAL`

---

# 24. DONOR ADAPT CANDIDATE → V1.1 TARGET CROSSWALK

| Donor candidate | New disposition | Main V1.1 consumers | What it reduces | What remains HomePlus |
|---|---|---|---|---|
| DC-ADAPT-001 Ledger movement representation | KEEP | C-015, C-018, C-022, C-067 | movement semantics | canonical Finance ledger/history/privacy |
| DC-ADAPT-002 Derived account balances | KEEP | C-006, C-010, FE-036/041 | balance arithmetic | persistent Account/Anchor/Unknown |
| DC-ADAPT-003 Account metadata sidecar | NARROW | C-007, FE-039 | metadata separation idea | Account type/ownership model |
| DC-ADAPT-004 Transaction kind validation/filtering | KEEP | C-015, FE-015/021/022 | type/filter semantics | Account optionality + Finance authority |
| DC-ADAPT-005 Grouped Transfer representation | KEEP | C-018/020/022, FE-018/019 | paired effects | atomic operation, same-account validation |
| DC-ADAPT-006 Nullable category | NARROW | C-036, FE-016/043 | optional category | native/custom category authority |
| DC-ADAPT-007 Monthly/category Budget plan | KEEP + REBOUND | C-041/042/048, FE-031/034 | plan/read-model ideas | V1.1 history/future applicability |
| DC-ADAPT-008 Budget adjustments | REFERENCE ONLY | C-048/049 | history/idempotency ideas | do not assume subsystem |
| DC-ADAPT-009 Budget actual derivation | KEEP | C-043, C-070, FE-009/031 | actual aggregation | Refund/Transfer/Correction exclusions |
| DC-ADAPT-010 Reports and aggregation | KEEP + REBOUND | C-067–072, FE-008/010/031/033 | aggregation/filter logic | V1.1 IA/privacy/context |
| DC-ADAPT-011 Native currency + warnings | KEEP | C-021, C-072, FE-037 | currency-safe aggregation | Account currency lifecycle/cross-currency transfer |
| DC-ADAPT-012 Account status/suggestions | REFERENCE ONLY | FE-036/039 | selection/list ideas | Archive lifecycle |
| DC-ADAPT-013 Business/personal transfer analogue | REFERENCE ONLY | C-023–026 | context/report analogue | HomePlus privacy/ownership |

---

# 25. DONOR CODE EXTRACTION WHITELIST FOR FUTURE IMPLEMENTATION

Future implementation may inspect/adapt only capability-specific behavior such as:

```text
ledger movement representation
transaction kind validation
balance arithmetic
paired Transfer effects
Budget month/category read models
Budget actual derivation
report aggregation
native Currency grouping/warnings
specific transfer invariant tests from Actual Budget
specific tombstone/history edge-case tests from Actual Budget
```

It must NOT import as authority:

```text
workspace
donor RLS
donor Auth
Cognito
AWS
Next.js shell
donor navigation
web dashboards
SQL agent
direct SQL correctness authority
FX worker requirement
derived Account view
hard-edit/hard-delete transaction lifecycle
donor Category catalog
business/personal privacy semantics
```

---

# 26. V1.1 RESIDUAL TARGET LEDGER — INPUT TO REAL GAP MAP

This section is NOT yet the final Real Gap Map.

It groups residual target behavior by coherent future ownership/lifecycle.

## R-01 — Financial Context + Privacy

Residual:

```text
Finance Personal/Household scope authority
Finance-specific ownership
scope selector semantics
cross-scope privacy
Source vs Context privacy
RLS/projections
```

Current foundation: strong.

Donor: not authority.

---

## R-02 — Account Authority + Balance Lifecycle

Residual:

```text
persistent Account
ACCOUNT/CREDIT_CARD type
Unknown Balance
Anchor
Balance Correction
fixed Currency
Archive/Unarchive
```

Donor reduces:

```text
balance arithmetic
negative balance
read models
```

---

## R-03 — Transaction Authority

Residual:

```text
canonical Income/Expense/Transfer authority
Expense/Income without Account
history/provenance
Source vs Context
```

Donor reduces classification/ledger/filtering.

---

## R-04 — Canonical Transfer

Residual:

```text
one logical atomic operation
source != destination
cross-currency two-side amounts
commission composition if used
privacy-safe source/context semantics
```

Donor + Actual significantly reduce semantic uncertainty.

---

## R-05 — Correction / History / Trash / Restore

Residual:

```text
financial effect replay/exclusion
history-safe correction
Trash
Restore
dependency validation
```

Current reduces reliability/audit work.

Actual gives reference edge cases.

---

## R-06 — Refund

Residual nearly complete:

```text
Refund authority
link
cap
orphan prevention
Net Expense
Budget Spent
history interactions
```

---

## R-07 — Category Authority V1.1

Residual:

```text
native baseline
custom create/edit/delete
optional classification
history preservation after delete
```

Donor only reduces nullable/filtering behavior.

---

## R-08 — Budget V1.1

Residual:

```text
Budget authority
scope/currency/period
historical target
future applicability
no-blocking
no carry-over
Refund/Transfer/Correction rules
```

Donor substantially reduces read/calculation behavior.

---

## R-09 — Expected Payments / Recurrence

Residual:

```text
Payment definition
expected amount unknown
one-time/recurring
occurrences
states
overdue derivation
debt accumulation
pause/end
history
```

Current recurrence primitives are precedent, not Finance authority.

---

## R-10 — Register Payment + Reconciliation

Residual:

```text
actual Payment mutation
Expense creation
occurrence PAID
Trash recalculation
```

No Planner dependency.

---

## R-11 — Reports / Multicurrency Read Models

Residual:

```text
HomePlus scope/privacy
Refund/Transfer/Adjustment exact handling
period comparison
currency-safe projections
```

Donor covers much aggregation behavior.

---

## R-12 — Finance Signals to Attention/Home/Notifications/Search

Residual:

```text
Finance-owned candidate signals/projections
privacy-safe payload
dedupe/relevance contract
routing to Finance detail
```

Shared systems remain owners.

Exact global relevance/delivery behavior remains outside Finance authority where globally deferred.

---

## R-13 — Finance Frontend Core

Residual:

```text
More → Finanzas
Financial Context selector
Resumen
Movimientos
Pagos
canonical Money Flow
forms/details
MoneyInput
filters
Payment UI
```

Current provides many shared primitives.

Donor does not own IA/UX.

---

## R-14 — Finance Frontend Secondary Surfaces

Residual:

```text
Análisis
Cuentas
Create Account Review
Account Detail
Categorías
Papelera
```

---

## R-15 — Finance Reliability Integration + Tests

Residual:

```text
Finance canonical mutation adapters
idempotency integration
uncertain operation UX
Finance-specific tests
```

Must extend Current, never parallel it.

---

# 27. DEFERRED CROSS-MODULE REGISTER

The following are explicitly NOT Finance Core residuals:

| Capability | Current evidence | V1.1 treatment |
|---|---|---|
| Finance ↔ Planner | Planner origin seam PRESENT | DEFER CROSS-MODULE |
| Inventory Purchase ↔ Expense | Inventory owner exists | DEFER CROSS-MODULE |
| Asset Service/Repair ↔ Expense | old audit did not prove active Assets authority | DEFER until both cores stable |
| HomeCloud proof/invoice relation | old audit did not prove active HomeCloud authority | DEFER until both cores stable |
| Generic Connected Task framework | no need in Finance Core | DEFER |
| User-defined cross-domain Tasks | no need in Finance Core | DEFER |
| Connected presets | no need in Finance Core | DEFER |
| Generalized connected resolution | direction only | DEFER |
| Global role packages | external Product pass | DEFER GLOBAL PERMISSIONS |
| Permanent delete rules | external lifecycle pass | DEFER GLOBAL DATA LIFECYCLE |

These must not inflate the upcoming Finance Core Real Gap Map.

---

# 28. OLD MATRIX DECISIONS INVALIDATED BY V1.1

The V1.0 matrix must not remain execution authority in these areas:

## 28.1 Planner

Old:

```text
Planner task composition
→ EXTEND CURRENT
→ Finance Core candidate
```

V1.1:

```text
Planner seam remains
but
Finance ↔ Planner = DEFERRED
```

---

## 28.2 Categories

Old:

```text
optional category
+
Archive/history
```

V1.1:

```text
native baseline
+
custom create/edit/delete
+
historical meaning preservation
```

---

## 28.3 Budget

Old planning could assume repeatable lifecycle with Archive-like semantics.

V1.1:

```text
period history
+
future applicability
+
NO generic Archive
```

Donor Budget Adjustment subsystem loses default adaptation status.

---

## 28.4 Frontend

Old:

```text
frontend detail pending
```

V1.1:

```text
frontend Product Truth frozen
```

Therefore:

```text
FIN-GAP-015 old meaning:
obsolete
```

The next Real Gap must model implementation of the frozen surface, not specification design.

---

## 28.5 Reports

Old language may imply Reports as logical/product surface.

V1.1:

```text
Reports = logical internal concept
Frontend:
Resumen + Análisis + scoped Movimientos
```

Do not create Reports tab.

---

## 28.6 Archived

Old generic archive assumptions are invalid.

V1.1:

```text
Account → Archive
Category → Delete
Payment → status/lifecycle
Budget → period history/future applicability
Transaction → Trash/Restore
```

---

# 29. NON-TARGET / PROHIBITED SCOPE

Current + donor evidence does NOT justify adding:

```text
Bank Sync
Open Banking
Trading
Investments
Crypto
Tax engine
Payroll
Invoicing
Credit score
Splitwise settlement
advanced Credit Card statements
automatic FX conversion engine
Finance-specific App Shell
FinanceReliability
FinanceSearch
FinanceAttention
FinancePermissions
generic Finance Archived screen
automatic Planner Task for every expected Payment
SQL agent
AI dependency for correctness
```

---

# 30. COMBINED COVERAGE SUMMARY

This matrix intentionally does not claim a simple percentage, because:

```text
Current foundation coverage
+
donor behavior coverage
≠
implemented Finance capability
```

Qualitative summary:

## Strongly reduced by Current

```text
identity
household/membership foundation
RLS patterns
audit/outbox
mutation contracts
reliability foundations
shared mobile UI
Home/Attention/Search precedent
test harness
```

## Strongly reduced by donor

```text
balance arithmetic
transaction classes
paired transfer effects
Budget monthly/category models
Budget actual calculation
report aggregation
native currency safety
```

## Still substantially residual

```text
Finance authority itself
Financial Context/privacy
Account lifecycle
Unknown/Anchor/Correction
Expense without Account
Source vs Context
Refund
Category authority
Payment/occurrence lifecycle
frontend implementation
Finance-specific read-model adaptation
Finance reliability adapters/tests
```

## Explicitly deferred

```text
Planner composition
Inventory connected resolution
Assets connected resolution
HomeCloud connected resolution
general orchestration
global permission packages
global permanent delete rules
```

---

# 31. REAL GAP CONVERSION RULES FOR NEXT GATE

The next `FINANCE_REAL_GAP_MAP_V1_1` must obey:

```text
1.
Do not make one gap per matrix row.

2.
Deduplicate by canonical owner + lifecycle.

3.
If Current owns a platform authority:
gap = Finance integration
not recreation.

4.
If donor covers behavior:
gap = adaptation under HomePlus
not donor port.

5.
If V1.1 capability has neither Current nor donor:
gap = new Finance capability.

6.
Deferred cross-module targets:
do not enter Finance Core gap count.

7.
Frontend:
group by coherent product surface/capability,
not every visual component.

8.
No implementation design yet:
no final table names,
no migration names,
no endpoint list,
no wave execution.
```

Candidate gap families may use the residual ledger R-01..R-15 as input, but their final identity/classification must be decided in the Real Gap gate.

---

# 32. TRACEABILITY CHECK

```text
CORE TARGET ROWS:
C-001 → C-076

FRONTEND TARGET ROWS:
FE-001 → FE-049

DONOR REBASE CANDIDATES:
13 / 13 traced

CURRENT AUTHORITIES:
preserved

V1.1 MAJOR TARGET DELTAS:
traced

DEFERRED CROSS-MODULE:
explicitly separated

NON-TARGETS:
explicitly guarded
```

No old V1.0 Planner/Core, Category Archive, Budget Archive or Frontend-pending assumption is allowed to silently pass into the next gate.

---

# 33. FINAL VERDICT

```text
FINANCE_CURRENT_DONOR_MATRIX_V1_1_COMPLETE

TARGET:
FINANCE PRODUCT FREEZE V1.1

CURRENT:
REBASed / unchanged code evidence

DONOR:
REBASed / pinned accepted evidence

CORE TARGET MATRIX:
COMPLETE

FRONTEND TARGET MATRIX:
COMPLETE

DONOR CROSSWALK:
13 / 13

CURRENT AUTHORITIES PRESERVED:
YES

DIRECT DONOR PORT:
NO

PLANNER AS FINANCE CORE DEPENDENCY:
NO

CATEGORY ARCHIVE TARGET:
REMOVED

GENERIC BUDGET ARCHIVE TARGET:
REMOVED

FRONTEND SPECIFICATION PENDING:
NO — PRODUCT TRUTH FROZEN

FRONTEND IMPLEMENTATION COMPLETE:
NO

CROSS-MODULE RELATIONS:
DEFERRED

IMPLEMENTATION AUTHORIZED:
NO

NEXT GATE:
FINANCE_REAL_GAP_MAP_V1_1
```

# END OF DOCUMENT
