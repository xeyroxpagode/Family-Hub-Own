# HOMePLUS Finance - Real Gap Map

Status: FINANCE_REAL_GAP_MAP_COMPLETE
Date: 2026-08-10
Mode: DEDUPLICATION + CLASSIFICATION, NO IMPLEMENTATION DESIGN
Revision: PHASE 4R dependency correction + PRE-FZ-01 CONTROL CORRECTION PASS applied; 15-gap identity preserved.

This document converts the accepted Current, Donor, and Current+Donor-vs-Target evidence into a deduplicated set of real Finance capability gaps. It does not define schema, migrations, services, RPCs, endpoints, screens, hooks, folders, tests, or implementation waves.

## 1. Baseline

```text
HOMEPLUS REPO:
C:\Users\thega\Desktop\HomePlus

HOMEPLUS BRANCH:
pulido-medio-inventario-planner

HOMEPLUS HEAD:
3282907c0b0e2fe3b963e33cf4f0afc10909424f

PRODUCT FREEZE:
C:\Users\thega\Downloads\HOMePLUS_FINANCE_PRODUCT_FREEZE_V1.0.md

PRODUCT FREEZE SHA-256:
D1DDDC2166DBFA4FB7B3940F4C5A3BA37E92CBD403BFE8983D0D16CD4B9A87A2
```

## 2. Accepted Inputs

| Input | Path / authority | Accepted gate | Used for |
|---|---|---|---|
| TARGET | `C:\Users\thega\Downloads\HOMePLUS_FINANCE_PRODUCT_FREEZE_V1.0.md` | Product authority | Acceptance rows and FIN-INV target behavior. |
| CURRENT | `docs\implementation\FINANCE_CURRENT_CAPABILITY_AUDIT.md` | `CURRENT_AUDIT_ACCEPTED` | HOMePLUS reusable authorities and absent Finance behavior. |
| DONOR | `docs\implementation\FINANCE_DONOR_CAPABILITY_AUDIT.md` | `DONOR_AUDIT_ACCEPTED` | Primary donor behavior, rejected architecture, Actual reference. |
| MATRIX | `docs\implementation\FINANCE_CURRENT_DONOR_VS_TARGET_MATRIX.md` | `CURRENT_DONOR_MATRIX_ACCEPTED` | Residual behavior and donor candidate dispositions. |

No Product Freeze, Current audit, Donor audit, or Matrix document was modified.

## 3. How Acceptance Coverage Was Converted To Real Gaps

Phase 3 coverage counts are not implementation work items:

```text
18 uncovered rows != 18 gaps
35 partial rows also contain residual work
7 donor-covered behaviors still require adaptation into HOMePLUS authority
```

This map deduplicates by capability owner and lifecycle. A gap is larger than one acceptance row, smaller than all of Finance, and has a coherent future freeze/test boundary.

Conversion rules used:

- If HOMePLUS already owns the authority, the gap is Finance integration with that authority, not recreating it.
- If donor behavior is useful, the gap is donor adaptation under HOMePLUS architecture, not code copy.
- If Product Freeze requires behavior neither Current nor donor supports, the gap is a new Finance capability.
- If a behavior depends on persistent financial truth, RLS/privacy, atomicity, historical lifecycle, recurrence, or cross-module contracts, it is classified STRUCTURAL.

## 4. Real Gap Executive Map

| Gap ID | Plain name | Technical name | Type | Classification | Owner | Main dependencies | Blocked? |
|---|---|---|---|---|---|---|---|
| FIN-GAP-001 | Contexto financiero y privacidad | Financial Context and Privacy Boundary | MIXED | STRUCTURAL | Finance + Household/Auth | Current Auth/Household/RLS | NO |
| FIN-GAP-002 | Cuentas y saldo verdadero | Account Authority and Balance Lifecycle | MIXED | STRUCTURAL | Finance | FIN-GAP-001; donor balance behavior | NO |
| FIN-GAP-003 | Ingresos, gastos y transacciones | Transaction Classification and Expense/Income Authority | MIXED | STRUCTURAL | Finance | FIN-GAP-001, FIN-GAP-002; donor ledger/classification | NO |
| FIN-GAP-004 | Transferencias atomicas | Canonical Transfer and Cross-Scope Movement | MIXED | STRUCTURAL | Finance | FIN-GAP-001, FIN-GAP-002, FIN-GAP-003; donor paired transfer | NO |
| FIN-GAP-005 | Historial, correccion y papelera | Financial History, Correction, Trash, Restore | CURRENT AUTHORITY INTEGRATION | STRUCTURAL | Finance + Audit/Reliability | Current audit/trash primitives; FIN-GAP-003/004 | NO |
| FIN-GAP-006 | Reembolsos | Refund Lifecycle | NEW FINANCE CAPABILITY | STRUCTURAL | Finance | FIN-GAP-003, FIN-GAP-005 | NO |
| FIN-GAP-007 | Categorias financieras | Finance Category Authority and History | MIXED | STRUCTURAL | Finance | FIN-GAP-003; donor optional category | NO |
| FIN-GAP-008 | Presupuestos y ahorro | Budget and Savings Semantics | MIXED | STRUCTURAL | Finance | FIN-GAP-002/003/004/006/007; donor budget behavior | NO |
| FIN-GAP-009 | Obligaciones, pagos y recurrencia | Obligation, Payment, Occurrence, Recurrence Lifecycle | NEW FINANCE CAPABILITY | STRUCTURAL | Finance | FIN-GAP-001, FIN-GAP-003, FIN-GAP-005 | NO |
| FIN-GAP-010 | Finance compone con Planner | Planner Composition and Payment Reconciliation | CURRENT AUTHORITY INTEGRATION | STRUCTURAL | Planner; Finance as composer/consumer | FIN-GAP-009; Current Planner origin/task authority | NO |
| FIN-GAP-011 | Reportes y moneda | Reporting, Multicurrency and Upcoming Obligations Read Models | DONOR ADAPTATION | STANDARD | Finance | FIN-GAP-001 through FIN-GAP-009; donor report/currency behavior | NO |
| FIN-GAP-012 | Home, Attention, notificaciones y Search | Home, Attention, Notifications, Search Integration | CURRENT AUTHORITY INTEGRATION | STRUCTURAL | Home/Attention/Search/Notifications; Finance as producer | FIN-GAP-001, FIN-GAP-008/009/011 | NO |
| FIN-GAP-013 | Relaciones con Inventory, Assets y HomeCloud | Inventory, Assets, HomeCloud Relationship Boundary | CURRENT AUTHORITY INTEGRATION | STRUCTURAL | Inventory/Assets/HomeCloud; Finance as linker | Current Inventory partial; Assets/HomeCloud authority | PARTIAL |
| FIN-GAP-014 | Consumidores externos sin autoridad financiera | External Canonical Consumer Boundary | DEFERRED EXTERNAL CAPABILITY BOUNDARY | STANDARD | Finance owns contract; Geni/Automations are future consumers | FIN-GAP-001/003/004/009; mutation authority | DEFERRED EXTERNAL INTEGRATION |
| FIN-GAP-015 | Superficie movil Finance | Mobile Finance Surface and Interaction Specification | CURRENT AUTHORITY INTEGRATION | STANDARD | Finance + mobile UI | All product-facing Finance gaps; frontend detail pending | NO |

## 5. Detailed FIN-GAP Records

### FIN-GAP-001 - Financial Context and Privacy Boundary

```text
GAP ID:
FIN-GAP-001
NAME:
Financial Context and Privacy Boundary
PLAIN-SPANISH NAME:
Contexto financiero y privacidad
TYPE:
MIXED
CLASSIFICATION:
STRUCTURAL
PRODUCT TARGET:
Personal Finance and Household Finance are distinct; source vs financial context is explicit; private personal details are not exposed through household views.
ACCEPTANCE ROWS:
1, 2, 3, 15, 16, 17, 18, 19
FIN-INVS:
FIN-INV-002, 003, 004, 005, 007, 021, 022, 023
CURRENT:
Auth, person ownership, household, membership, and RLS foundations exist; no Finance context projection exists.
DONOR:
Business/personal account metadata and cross-context transfer reporting are partial analogues only.
REAL GAP:
HOMePLUS-owned Finance context, source/context attribution, privacy, disclosure, and permission composition.
CAPABILITY OWNER:
Finance, composed with Household/Auth.
CURRENT AUTHORITY TO PRESERVE:
Auth, User/person ownership, Household, Membership, RLS foundations.
DONOR BEHAVIOR TO PRESERVE:
Reference behavior that cross-context reporting must be explicit.
DONOR ARCHITECTURE TO REJECT:
Donor workspace, donor RLS, donor business/personal labels as privacy model.
DEPENDENCIES:
Current household/person identity and RLS foundations.
AFFECTED MODULES:
Finance, Household/Auth, Search/Home/Attention later.
PERMISSIONS IMPACT:
High; defines private vs household disclosure boundaries.
HISTORY IMPACT:
Medium; attribution must remain historically correct.
CROSS-MODULE IMPACT:
High; affects reports, Home, Search, Attention, Planner.
RUNTIME/DB VALIDATION NEEDED LATER:
Privacy and cross-scope access checks.
BLOCKED BY:
None.
NOT PART OF THIS GAP:
Account balance math, transfer atomicity, Planner task behavior.
```

### FIN-GAP-002 - Account Authority and Balance Lifecycle

```text
GAP ID:
FIN-GAP-002
NAME:
Account Authority and Balance Lifecycle
PLAIN-SPANISH NAME:
Cuentas y saldo verdadero
TYPE:
MIXED
CLASSIFICATION:
STRUCTURAL
PRODUCT TARGET:
Manual accounts, unknown balance, balance anchor, balance adjustment, negative balances, fixed historical currency, account archive/history.
ACCEPTANCE ROWS:
4, 5, 6, 7, 8, 9, 22, 37
FIN-INVS:
FIN-INV-008, 009, 010, 011, 012, 013, 037, 041, 061
CURRENT:
No Finance account authority; generic audit/trash foundations only.
DONOR:
Derived balances and negative-balance behavior are useful; donor account view is rejected as account authority.
REAL GAP:
Persistent Finance account authority and balance lifecycle that can preserve unknown/anchored/adjusted/historical balance semantics.
CAPABILITY OWNER:
Finance.
CURRENT AUTHORITY TO PRESERVE:
Audit/outbox, mutation contracts, idempotency/reliability, RLS foundations.
DONOR BEHAVIOR TO PRESERVE:
Derived balance arithmetic, negative-balance preservation, native movement currency as reporting input.
DONOR ARCHITECTURE TO REJECT:
Derived account as source of truth, MODE-derived account currency, FX worker as V1 requirement.
DEPENDENCIES:
FIN-GAP-001.
AFFECTED MODULES:
Finance, Reports, Home/Attention/Search later.
PERMISSIONS IMPACT:
High; accounts can be personal/private or household.
HISTORY IMPACT:
High; account archive and balance history are persistent truth.
CROSS-MODULE IMPACT:
Medium; supports budgets, transfers, reports.
RUNTIME/DB VALIDATION NEEDED LATER:
Financial balance correctness, historical currency, privacy checks.
BLOCKED BY:
None.
NOT PART OF THIS GAP:
Canonical transfer operation, refund lifecycle, budget planning.
```

### FIN-GAP-003 - Transaction Classification and Expense/Income Authority

```text
GAP ID:
FIN-GAP-003
NAME:
Transaction Classification and Expense/Income Authority
PLAIN-SPANISH NAME:
Ingresos, gastos y transacciones
TYPE:
MIXED
CLASSIFICATION:
STRUCTURAL
PRODUCT TARGET:
Income, Expense, and Transfer are distinct classes; Expense can exist without account; budgets do not block expense registration; optional category is supported.
ACCEPTANCE ROWS:
10, 11, 29, 33, 34, 60
FIN-INVS:
FIN-INV-014, 015, 016, 020, 034, 065, 074
CURRENT:
No Finance transactions; mutation/idempotency and audit foundations exist.
DONOR:
Ledger movement semantics, kind validation, and optional category behavior are useful; account-required model is rejected.
REAL GAP:
Canonical Finance transaction authority for income/expense classes, account optionality, and non-blocking registration.
CAPABILITY OWNER:
Finance.
CURRENT AUTHORITY TO PRESERVE:
Mutation contracts, idempotency/reliability, audit/outbox.
DONOR BEHAVIOR TO PRESERVE:
Transaction class separation, ledger movement data semantic, validation pattern.
DONOR ARCHITECTURE TO REJECT:
All rows requiring account, direct SQL/AI agent authority, direct edit/delete lifecycle.
DEPENDENCIES:
FIN-GAP-001, FIN-GAP-002.
AFFECTED MODULES:
Finance, Budgets, Reports, Home/Attention/Search later.
PERMISSIONS IMPACT:
High; transaction visibility follows context/privacy.
HISTORY IMPACT:
High; transactions are financial truth.
CROSS-MODULE IMPACT:
High; feeds budgets, reports, obligations, Planner reconciliation.
RUNTIME/DB VALIDATION NEEDED LATER:
Classification, account optionality, privacy, idempotency.
BLOCKED BY:
None.
NOT PART OF THIS GAP:
Transfer atomicity, refund lifecycle, category archive.
```

### FIN-GAP-004 - Canonical Transfer and Cross-Scope Movement

```text
GAP ID:
FIN-GAP-004
NAME:
Canonical Transfer and Cross-Scope Movement
PLAIN-SPANISH NAME:
Transferencias atomicas
TYPE:
MIXED
CLASSIFICATION:
STRUCTURAL
PRODUCT TARGET:
Transfers require source and destination when accounts are known; transfer is not income/expense; cross-currency transfer stores both amounts; contribution/reimbursement/card payment are transfer-shaped when applicable.
ACCEPTANCE ROWS:
12, 13, 14, 15, 20, 21, 23, 37, 54
FIN-INVS:
FIN-INV-016, 017, 018, 019, 024, 025, 036, 042, 060, 063
CURRENT:
Mutation/idempotency/audit foundations exist; no Finance transfer.
DONOR:
Paired transfer rows with same event_id, source negative, destination positive, category null; Actual confirms zero-sum/different-account invariant.
REAL GAP:
HOMePLUS-owned canonical atomic transfer behavior with validation, dual amount handling, and context-aware classification.
CAPABILITY OWNER:
Finance.
CURRENT AUTHORITY TO PRESERVE:
Mutation contracts, idempotency/reliability, audit/outbox, RLS foundations.
DONOR BEHAVIOR TO PRESERVE:
Paired financial effects, transfer != income/expense, native amount per side.
DONOR ARCHITECTURE TO REJECT:
Chat/SQL-agent as transfer authority, donor workspace, unproven same-account validation, FX worker requirement.
DEPENDENCIES:
FIN-GAP-001, FIN-GAP-002, FIN-GAP-003.
AFFECTED MODULES:
Finance, Reports, Budgets, Planner payment reconciliation later.
PERMISSIONS IMPACT:
High; source and context may cross personal/household boundaries.
HISTORY IMPACT:
High; paired effects require coherent correction/trash behavior.
CROSS-MODULE IMPACT:
High; contributions, reimbursements, card payments, reports.
RUNTIME/DB VALIDATION NEEDED LATER:
Atomicity, source != destination, paired effects, cross-currency amounts.
BLOCKED BY:
None.
NOT PART OF THIS GAP:
Refund lifecycle, obligation recurrence, detailed UI.
```

### FIN-GAP-005 - Financial History, Correction, Trash, Restore

```text
GAP ID:
FIN-GAP-005
NAME:
Financial History, Correction, Trash, Restore
PLAIN-SPANISH NAME:
Historial, correccion y papelera
TYPE:
CURRENT AUTHORITY INTEGRATION
CLASSIFICATION:
STRUCTURAL
PRODUCT TARGET:
Transaction correction preserves history; trash removes current effects without deleting history; restore reapplies effects.
ACCEPTANCE ROWS:
24, 25, 26, 52
FIN-INVS:
FIN-INV-026, 027, 028, 033, 055, 065
CURRENT:
Generic audit/outbox, Planner versions, and Planner trash/restore patterns exist.
DONOR:
Primary donor direct update/delete is rejected; Actual tombstone behavior is reference only.
REAL GAP:
Finance-specific historical lifecycle that composes with current audit/reliability primitives.
CAPABILITY OWNER:
Finance + Audit/Reliability.
CURRENT AUTHORITY TO PRESERVE:
Audit/outbox, mutation contracts, idempotency/reliability, Planner trash pattern as reference.
DONOR BEHAVIOR TO PRESERVE:
None as implementation candidate; Actual tombstone is reference behavior.
DONOR ARCHITECTURE TO REJECT:
Direct update/delete of financial truth.
DEPENDENCIES:
FIN-GAP-003 and FIN-GAP-004.
AFFECTED MODULES:
Finance, Audit/Reliability, Reports, Budgets, Obligations.
PERMISSIONS IMPACT:
Medium; history must respect original privacy.
HISTORY IMPACT:
High; this gap owns financial history behavior.
CROSS-MODULE IMPACT:
High; recalculates balances, reports, budgets, payment state.
RUNTIME/DB VALIDATION NEEDED LATER:
Correction/trash/restore recomputation and audit trail integrity.
BLOCKED BY:
None.
NOT PART OF THIS GAP:
Refund-specific rules, account archive rules.
```

### FIN-GAP-006 - Refund Lifecycle

```text
GAP ID:
FIN-GAP-006
NAME:
Refund Lifecycle
PLAIN-SPANISH NAME:
Reembolsos
TYPE:
NEW FINANCE CAPABILITY
CLASSIFICATION:
STRUCTURAL
PRODUCT TARGET:
Refund is not Income; refund links to expense; refund reduces net expense and budget consumption; refund cap/orphan prevention.
ACCEPTANCE ROWS:
27, 28, 55
FIN-INVS:
FIN-INV-029, 030, 031, 032, 033, 038, 062
CURRENT:
No Refund model.
DONOR:
No useful refund behavior.
REAL GAP:
Refund authority and lifecycle across transaction history, budget consumption, and reports.
CAPABILITY OWNER:
Finance.
CURRENT AUTHORITY TO PRESERVE:
Audit/outbox and history/reliability foundations.
DONOR BEHAVIOR TO PRESERVE:
None.
DONOR ARCHITECTURE TO REJECT:
Classifying refund as generic income.
DEPENDENCIES:
FIN-GAP-003, FIN-GAP-005.
DOWNSTREAM CONSUMERS:
FIN-GAP-008, FIN-GAP-011, FIN-GAP-012.
AFFECTED MODULES:
Finance, Budgets, Reports, History.
PERMISSIONS IMPACT:
Medium; refund visibility follows original expense context.
HISTORY IMPACT:
High; refund lifecycle must survive edits/trash.
CROSS-MODULE IMPACT:
Medium; affects budget and report projections.
RUNTIME/DB VALIDATION NEEDED LATER:
Refund link, cap, orphan prevention, report/budget impact.
BLOCKED BY:
None.
NOT PART OF THIS GAP:
General transfer/reimbursement behavior.
```

### FIN-GAP-007 - Finance Category Authority and History

```text
GAP ID:
FIN-GAP-007
NAME:
Finance Category Authority and History
PLAIN-SPANISH NAME:
Categorias financieras
TYPE:
MIXED
CLASSIFICATION:
STRUCTURAL
PRODUCT TARGET:
Category is optional on Expense; category archive preserves history.
ACCEPTANCE ROWS:
29, 30
FIN-INVS:
FIN-INV-015, 035
CURRENT:
Generic category-like Planner patterns only; no Finance category authority.
DONOR:
Nullable/free-form transaction category and history-derived category lists are useful; no category lifecycle.
REAL GAP:
Finance category authority and archive/history behavior while preserving optional category.
CAPABILITY OWNER:
Finance.
CURRENT AUTHORITY TO PRESERVE:
Audit/reliability and shared UI/testing primitives.
DONOR BEHAVIOR TO PRESERVE:
Optional category and category nullability on transactions.
DONOR ARCHITECTURE TO REJECT:
No category source-of-truth/lifecycle.
DEPENDENCIES:
FIN-GAP-003.
AFFECTED MODULES:
Finance, Budgets, Reports, Search.
PERMISSIONS IMPACT:
Low to medium; category visibility follows transaction context.
HISTORY IMPACT:
High; archived categories must preserve historical records.
CROSS-MODULE IMPACT:
Medium; budget/report/search grouping.
RUNTIME/DB VALIDATION NEEDED LATER:
Category archive and historical display behavior.
BLOCKED BY:
None.
NOT PART OF THIS GAP:
Budget plan semantics and refund behavior.
```

### FIN-GAP-008 - Budget and Savings Semantics

```text
GAP ID:
FIN-GAP-008
NAME:
Budget and Savings Semantics
PLAIN-SPANISH NAME:
Presupuestos y ahorro
TYPE:
MIXED
CLASSIFICATION:
STRUCTURAL
PRODUCT TARGET:
Monthly total budget per scope/currency, category budgets, spent derivation, no blocking, no carry-over, leftover is not savings, savings through accounts/transfers.
ACCEPTANCE ROWS:
28, 31, 32, 33, 34, 35, 36, 37
FIN-INVS:
FIN-INV-031, 034, 035, 036, 038, 039, 040, 041, 042, 044
CURRENT:
No Finance budget model.
DONOR:
Monthly/category budget plan, budget adjustment, spent derivation, and no-blocking behavior are useful; donor Budget Adjustment is not Balance Adjustment.
REAL GAP:
HOMePLUS budget and savings behavior that composes with account, transaction, transfer, refund, and category authorities.
CAPABILITY OWNER:
Finance.
CURRENT AUTHORITY TO PRESERVE:
Mutation/idempotency/reliability and privacy foundations.
DONOR BEHAVIOR TO PRESERVE:
Monthly/category budget read-model pattern, spent derivation, budget adjustment validation ideas, no-blocking behavior.
DONOR ARCHITECTURE TO REJECT:
Donor workspace/RLS, confusing budget adjustment with balance adjustment, automatic FX engine scope.
DEPENDENCIES:
FIN-GAP-001, FIN-GAP-002, FIN-GAP-003, FIN-GAP-004, FIN-GAP-006, FIN-GAP-007.
AFFECTED MODULES:
Finance, Reports, Home/Attention.
PERMISSIONS IMPACT:
High; budgets are scoped personal/household and currency-aware.
HISTORY IMPACT:
High; historical budget targets and actuals must stay correct.
CROSS-MODULE IMPACT:
Medium; attention/home/reporting.
RUNTIME/DB VALIDATION NEEDED LATER:
Spent derivation, no-blocking rule, no carry-over, refund/transfer/adjustment impact.
BLOCKED BY:
None.
NOT PART OF THIS GAP:
Payment/obligation recurrence.
```

### FIN-GAP-009 - Obligation, Payment, Occurrence, Recurrence Lifecycle

```text
GAP ID:
FIN-GAP-009
NAME:
Obligation, Payment, Occurrence, Recurrence Lifecycle
PLAIN-SPANISH NAME:
Obligaciones, pagos y recurrencia
TYPE:
NEW FINANCE CAPABILITY
CLASSIFICATION:
STRUCTURAL
PRODUCT TARGET:
Obligations do not create expenses; expected amount may be unknown; occurrence statuses, derived overdue, recurrence history, debt accumulation, payments, payment trash recalculation.
ACCEPTANCE ROWS:
39, 40, 41, 42, 43, 44, 45, 47, 52
FIN-INVS:
FIN-INV-045, 047, 048, 049, 050, 051, 052, 054, 055
CURRENT:
Planner temporal and recurrence primitives exist but no Finance obligation/payment authority.
DONOR:
No useful obligation/payment capability.
REAL GAP:
Finance-owned obligation, occurrence, recurrence, payment, overdue, and recalculation lifecycle.
CAPABILITY OWNER:
Finance.
CURRENT AUTHORITY TO PRESERVE:
Planner remains Planner; audit/outbox and mutation reliability remain shared foundations.
DONOR BEHAVIOR TO PRESERVE:
None.
DONOR ARCHITECTURE TO REJECT:
None relevant.
DEPENDENCIES:
FIN-GAP-001, FIN-GAP-003, FIN-GAP-005.
AFFECTED MODULES:
Finance, Planner integration later, Attention, Notifications, Home.
PERMISSIONS IMPACT:
High; personal/household obligations differ.
HISTORY IMPACT:
High; occurrences and payment history must be persistent and non-rewriting.
CROSS-MODULE IMPACT:
High; Planner, Attention, Notifications.
RUNTIME/DB VALIDATION NEEDED LATER:
Occurrence status, overdue derivation, recurrence history, payment state recalculation.
BLOCKED BY:
None.
NOT PART OF THIS GAP:
Planner task creation/reconciliation contract, detailed reminders UI.
```

### FIN-GAP-010 - Planner Composition and Payment Reconciliation

```text
GAP ID:
FIN-GAP-010
NAME:
Planner Composition and Payment Reconciliation
PLAIN-SPANISH NAME:
Finance compone con Planner
TYPE:
CURRENT AUTHORITY INTEGRATION
CLASSIFICATION:
STRUCTURAL
PRODUCT TARGET:
Planner task completion is not payment; payment can reconcile Planner task; task cancel does not cancel obligation; personal obligation tasks are opt-in; household obligation can compose Planner reminders/tasks.
ACCEPTANCE ROWS:
46, 48, 49, 50, 51
FIN-INVS:
FIN-INV-046, 056, 057, 058, 066
CURRENT:
Planner tasks/events/origin fields and composition patterns exist.
DONOR:
No useful Planner/payment behavior.
REAL GAP:
Finance-to-Planner composition and reconciliation boundary without transferring ownership to Planner.
CAPABILITY OWNER:
Planner owns tasks; Finance composes/consumes.
CURRENT AUTHORITY TO PRESERVE:
Planner task/event authority and origin composition.
DONOR BEHAVIOR TO PRESERVE:
None.
DONOR ARCHITECTURE TO REJECT:
Donor web workflow as Planner equivalent.
DEPENDENCIES:
FIN-GAP-009 and Current Planner authority.
AFFECTED MODULES:
Finance, Planner, Notifications/Attention later.
PERMISSIONS IMPACT:
High; personal obligation task creation is opt-in.
HISTORY IMPACT:
Medium; reconciliation must not rewrite payment truth.
CROSS-MODULE IMPACT:
High; this is a cross-module contract.
RUNTIME/DB VALIDATION NEEDED LATER:
Ownership boundaries and lifecycle independence.
BLOCKED BY:
None.
NOT PART OF THIS GAP:
Obligation/payment authority itself.
```

### FIN-GAP-011 - Reporting, Multicurrency and Upcoming Obligations Read Models

```text
GAP ID:
FIN-GAP-011
NAME:
Reporting, Multicurrency and Upcoming Obligations Read Models
PLAIN-SPANISH NAME:
Reportes, moneda y próximas obligaciones
TYPE:
DONOR ADAPTATION
CLASSIFICATION:
STANDARD
PRODUCT TARGET:
Reports count each real expense once; transfers/adjustments are excluded from Income/Expense; refunds reduce expense; currencies are never mixed silently; Core Reports include Income, Expense, Net, Spending by Category, Month vs Previous Month, Budget vs Actual, and Upcoming Obligations.
ACCEPTANCE ROWS:
7, 13, 14, 16, 17, 28, 38, 53, 54, 55
PRODUCT RULE ADDITION:
Product Freeze #56 explicitly requires Upcoming Obligations as a Core Report even though the 62-row Final Acceptance summary does not name it separately.
FIN-INVS:
FIN-INV-021, 022, 031, 036, 037, 043, 059, 060, 061, 062, 063, 064, 065
CURRENT:
No Finance reports; Search/Home/Attention projection authorities exist separately.
DONOR:
Month/category/direction aggregation, transfer separation, native currency, and unconvertible warnings are useful. Donor does not provide HOMePLUS Obligation truth.
REAL GAP:
HOMePLUS report/read behavior over Finance truth, privacy, refunds, balance adjustments, transfers, budgets, currency safety, and Finance-owned upcoming Obligation/Occurrence truth.
CAPABILITY OWNER:
Finance. FIN-GAP-009 remains owner of Obligation/Payment/Occurrence truth; FIN-GAP-011 only reads/projects it.
CURRENT AUTHORITY TO PRESERVE:
Search/Home/Attention authorities are consumers/projections, not report source of truth.
DONOR BEHAVIOR TO PRESERVE:
Aggregation/read-model patterns, transfer separation, no silent currency mixing.
DONOR ARCHITECTURE TO REJECT:
Donor FX worker as V1 requirement, donor web UI, donor privacy model.
DEPENDENCIES:
FIN-GAP-001, FIN-GAP-002, FIN-GAP-003, FIN-GAP-004, FIN-GAP-005, FIN-GAP-006, FIN-GAP-007, FIN-GAP-008, FIN-GAP-009.
AFFECTED MODULES:
Finance, Home, Search, Attention.
PERMISSIONS IMPACT:
High; reports and Upcoming Obligations must respect Financial Context and privacy.
HISTORY IMPACT:
Medium; reports must recompute historical truth correctly while upcoming obligations consume current occurrence truth.
CROSS-MODULE IMPACT:
Medium; feeds Home/Attention/Search without owning those surfaces.
RUNTIME/DB VALIDATION NEEDED LATER:
Double counting, currency safety, refund/adjustment/transfer exclusion, and Upcoming Obligations read-model correctness.
BLOCKED BY:
None.
NOT PART OF THIS GAP:
Canonical transaction/account/obligation authority.
```

### FIN-GAP-012 - Home, Attention, Notifications, Search Integration

```text
GAP ID:
FIN-GAP-012
NAME:
Home, Attention, Notifications, Search Integration
PLAIN-SPANISH NAME:
Home, Attention, notificaciones y Search
TYPE:
CURRENT AUTHORITY INTEGRATION
CLASSIFICATION:
STRUCTURAL
PRODUCT TARGET:
Home surfaces relevant Finance summaries; Attention surfaces payment due/overdue/budget exceeded; Search/Geni respect Finance privacy.
ACCEPTANCE ROWS:
56, 57, 59
FIN-INVS:
FIN-INV-006, 048, 070, 071, 072
CURRENT:
Home, Planner attention, notification preferences/adapter, and Search capability gates exist.
DONOR:
No useful HOMePLUS projection authority; donor search/chat rejected.
REAL GAP:
Finance projections into existing Home/Attention/Notifications/Search without duplicating those authorities.
CAPABILITY OWNER:
Home, Attention, Notifications, Search; Finance as producer.
CURRENT AUTHORITY TO PRESERVE:
Home, Attention, Notifications, Search.
DONOR BEHAVIOR TO PRESERVE:
None as implementation candidate.
DONOR ARCHITECTURE TO REJECT:
Donor web search/chat/SQL agent.
DEPENDENCIES:
FIN-GAP-001, FIN-GAP-008, FIN-GAP-009, FIN-GAP-011.
AFFECTED MODULES:
Finance, Home, Attention, Notifications, Search.
PERMISSIONS IMPACT:
High; search/home/attention must not leak private Finance data.
HISTORY IMPACT:
Low to medium; projections depend on current financial state and due dates.
CROSS-MODULE IMPACT:
High.
RUNTIME/DB VALIDATION NEEDED LATER:
Projection relevance, dedupe, privacy, capability checks.
BLOCKED BY:
None.
NOT PART OF THIS GAP:
Building new Home/Search/Attention authorities.
```

### FIN-GAP-013 - Inventory, Assets, HomeCloud Relationship Boundary

```text
GAP ID:
FIN-GAP-013
NAME:
Inventory, Assets, HomeCloud Relationship Boundary
PLAIN-SPANISH NAME:
Relaciones con Inventory, Assets y HomeCloud
TYPE:
CURRENT AUTHORITY INTEGRATION
CLASSIFICATION:
STRUCTURAL
PRODUCT TARGET:
Inventory/Assets/HomeCloud ownership remains preserved when linked to Finance.
ACCEPTANCE ROWS:
58
FIN-INVS:
FIN-INV-067, 068, 069
CURRENT:
Inventory ownership and Planner links are partially evidenced; active Assets/HomeCloud authorities were not demonstrated.
DONOR:
No useful relationship behavior.
REAL GAP:
Finance relationship boundary that links without taking ownership of Inventory, Assets, or HomeCloud truth.
CAPABILITY OWNER:
Inventory, Assets, HomeCloud own their truth; Finance is linker/consumer.
CURRENT AUTHORITY TO PRESERVE:
Inventory; future Assets/HomeCloud canonical authorities.
DONOR BEHAVIOR TO PRESERVE:
None.
DONOR ARCHITECTURE TO REJECT:
None relevant.
DEPENDENCIES:
FIN-GAP-001; Current Inventory authority; Assets canonical authority; HomeCloud canonical authority.
AFFECTED MODULES:
Finance, Inventory, Assets, HomeCloud.
PERMISSIONS IMPACT:
High; linked records/files/assets must preserve original visibility.
HISTORY IMPACT:
Medium; links should not rewrite owner module history.
CROSS-MODULE IMPACT:
High.
RUNTIME/DB VALIDATION NEEDED LATER:
Ownership boundary and privacy checks.
BLOCKED BY:
ASSETS CANONICAL AUTHORITY and HOMECLOUD CANONICAL AUTHORITY for those subparts.
NOT PART OF THIS GAP:
Redesigning Assets or HomeCloud.
```

### FIN-GAP-014 - External Canonical Consumer Boundary

```text
GAP ID:
FIN-GAP-014
NAME:
External Canonical Consumer Boundary
PLAIN-SPANISH NAME:
Consumidores externos sin autoridad financiera
TYPE:
DEFERRED EXTERNAL CAPABILITY BOUNDARY
CLASSIFICATION:
STANDARD
PRODUCT TARGET:
Finance owns financial truth, exposes canonical deterministic operations/read behavior, works completely without AI, and future external consumers can never widen privacy/permissions or become a second financial authority.
ACCEPTANCE ROWS:
59, 60
FIN-INVS:
FIN-INV-073, 074
CURRENT:
Core/Planner mutation/idempotency and no-AI precedent exist. Accepted Current evidence does NOT demonstrate a canonical Geni authority or a canonical Automations authority. The `geni` / `automation` Planner origin tokens are provenance primitives, not external-system authorities.
DONOR:
Primary donor SQL agent is rejected; ledger behavior can exist without AI workflow.
REAL GAP:
Finance-side canonical consumer contract: canonical writes, canonical reads, privacy, idempotency, auditability, and no AI dependency. Runtime Geni/Automations integrations are not part of current Finance implementation scope.
CAPABILITY OWNER:
Finance owns the contract and financial truth. Future Geni/Automations may consume it only after their own canonical authorities exist.
CURRENT AUTHORITY TO PRESERVE:
Mutation contracts, idempotency/reliability, privacy/RLS, Search capability boundaries.
DONOR BEHAVIOR TO PRESERVE:
Only the principle that financial core behavior does not depend on AI.
DONOR ARCHITECTURE TO REJECT:
SQL agent/direct SQL as correctness authority.
DEPENDENCIES:
FIN-GAP-001, FIN-GAP-003, FIN-GAP-004, FIN-GAP-009.
CURRENT GENI AUTHORITY CHECK:
ABSENT / NOT DEMONSTRATED AS CANONICAL AUTHORITY. DEFER runtime integration.
CURRENT AUTOMATIONS AUTHORITY CHECK:
ABSENT AS CANONICAL AUTHORITY IN ACCEPTED CURRENT EVIDENCE. Planner `origin_module='automation'` is insufficient. DEFER runtime integration and repeat targeted capability check when Automations work is authorized.
FINANCE-SIDE FREEZEABLE NOW:
Canonical consumer principles only: writes call canonical Finance mutations; reads use canonical Finance read models; consumers never widen privacy; consumers never own financial truth.
DEFERRED:
Geni queries, commands, adapters, services, routes, prompts, tools, parsers, orchestration, read models, mutation consumers, UI, and runtime integration. Automations runtime integration is also deferred until a canonical Automations authority is demonstrated.
AFFECTED MODULES:
Finance now; Geni/Automations only in a future external lane.
PERMISSIONS IMPACT:
High at contract level; future consumers inherit caller authorization and never widen access.
HISTORY IMPACT:
Medium; any future external call must use auditable canonical operations.
CROSS-MODULE IMPACT:
Deferred.
RUNTIME/DB VALIDATION NEEDED LATER:
Finance canonical operation tests are owned by the relevant Finance FIUs. No Geni runtime test is required to complete Finance Core.
BLOCKED BY:
Future Geni canonical authority for Geni integration; future Automations canonical authority for Automations integration. These do NOT block Finance Core.
NOT PART OF THIS GAP:
Implementing Geni, implementing Automations, AI feature design, SQL agent port, temporary external-consumer systems.
```

### FIN-GAP-015 - Mobile Finance Surface and Interaction Specification

```text
GAP ID:
FIN-GAP-015
NAME:
Mobile Finance Surface and Interaction Specification
PLAIN-SPANISH NAME:
Superficie movil Finance
TYPE:
CURRENT AUTHORITY INTEGRATION
CLASSIFICATION:
STANDARD
PRODUCT TARGET:
Finance must be usable through HOMePLUS mobile UI while preserving current app shell, shared UI, and pending frontend-detail constraint.
ACCEPTANCE ROWS:
56, 57
FIN-INVS:
FIN-INV-006, 070, 071
CURRENT:
Shared UI/mobile primitives exist; frontend detail is pending.
DONOR:
Web UI is reference only and not a port candidate.
REAL GAP:
Finance mobile surface and interaction specification after capability boundaries are accepted.
CAPABILITY OWNER:
Finance + mobile UI.
CURRENT AUTHORITY TO PRESERVE:
Shared UI/testing, app shell, mobile design authority.
DONOR BEHAVIOR TO PRESERVE:
Workflow/read-model presentation ideas only where useful.
DONOR ARCHITECTURE TO REJECT:
Next.js web navigation/components/layout.
DEPENDENCIES:
Product-facing Finance capabilities.
SPECIFICATION DEPENDENCY:
Frontend detail / design pass required before Implementation Freeze.
AFFECTED MODULES:
Finance mobile UI, Home/Attention/Search entry points.
PERMISSIONS IMPACT:
Medium; UI must not expose private data.
HISTORY IMPACT:
Low; UI consumes canonical state.
CROSS-MODULE IMPACT:
Medium.
RUNTIME/DB VALIDATION NEEDED LATER:
Mobile behavior and privacy QA after design specification.
BLOCKED BY:
None.
NOT PART OF THIS GAP:
Specific screens, components, navigation, or visual design in Phase 4.
```

## 6. Acceptance -> Gap Traceability

| Acceptance # | FIN-GAP(s) |
|---:|---|
| 1 | FIN-GAP-001 |
| 2 | FIN-GAP-001 |
| 3 | FIN-GAP-001 |
| 4 | FIN-GAP-002 |
| 5 | FIN-GAP-002 |
| 6 | FIN-GAP-002 |
| 7 | FIN-GAP-002, FIN-GAP-011 |
| 8 | FIN-GAP-002 |
| 9 | FIN-GAP-002 |
| 10 | FIN-GAP-003 |
| 11 | FIN-GAP-003 |
| 12 | FIN-GAP-004 |
| 13 | FIN-GAP-004, FIN-GAP-011 |
| 14 | FIN-GAP-004, FIN-GAP-011 |
| 15 | FIN-GAP-001, FIN-GAP-004 |
| 16 | FIN-GAP-001, FIN-GAP-011 |
| 17 | FIN-GAP-001, FIN-GAP-011 |
| 18 | FIN-GAP-001 |
| 19 | FIN-GAP-001, FIN-GAP-004 |
| 20 | FIN-GAP-004 |
| 21 | FIN-GAP-004 |
| 22 | FIN-GAP-002 |
| 23 | FIN-GAP-004 |
| 24 | FIN-GAP-005 |
| 25 | FIN-GAP-005 |
| 26 | FIN-GAP-005 |
| 27 | FIN-GAP-006 |
| 28 | FIN-GAP-006, FIN-GAP-008, FIN-GAP-011 |
| 29 | FIN-GAP-003, FIN-GAP-007 |
| 30 | FIN-GAP-007 |
| 31 | FIN-GAP-008 |
| 32 | FIN-GAP-008 |
| 33 | FIN-GAP-003, FIN-GAP-008 |
| 34 | FIN-GAP-003, FIN-GAP-008 |
| 35 | FIN-GAP-008 |
| 36 | FIN-GAP-008 |
| 37 | FIN-GAP-002, FIN-GAP-004, FIN-GAP-008 |
| 38 | FIN-GAP-011 |
| 39 | FIN-GAP-009 |
| 40 | FIN-GAP-009 |
| 41 | FIN-GAP-009 |
| 42 | FIN-GAP-009, FIN-GAP-012 |
| 43 | FIN-GAP-009 |
| 44 | FIN-GAP-009 |
| 45 | FIN-GAP-009 |
| 46 | FIN-GAP-010 |
| 47 | FIN-GAP-009 |
| 48 | FIN-GAP-010 |
| 49 | FIN-GAP-010 |
| 50 | FIN-GAP-010 |
| 51 | FIN-GAP-010 |
| 52 | FIN-GAP-005, FIN-GAP-009 |
| 53 | FIN-GAP-011 |
| 54 | FIN-GAP-002, FIN-GAP-004, FIN-GAP-011 |
| 55 | FIN-GAP-006, FIN-GAP-011 |
| 56 | FIN-GAP-012, FIN-GAP-015 |
| 57 | FIN-GAP-009, FIN-GAP-012, FIN-GAP-015 |
| 58 | FIN-GAP-013 |
| 59 | FIN-GAP-012, FIN-GAP-014 |
| 60 | FIN-GAP-014 |
| 61 | NO GAP - NON-GOAL |
| 62 | NO GAP - NON-GOAL |

Acceptance traceability: 60/60 positive targets, 2/2 non-goals.

## 7. FIN-INV -> Gap Traceability

| FIN-INV | FIN-GAP(s) |
|---|---|
| FIN-INV-001 | NO GAP - NON-GOAL |
| FIN-INV-002 | FIN-GAP-001 |
| FIN-INV-003 | FIN-GAP-001 |
| FIN-INV-004 | FIN-GAP-001 |
| FIN-INV-005 | FIN-GAP-001 |
| FIN-INV-006 | FIN-GAP-012, FIN-GAP-015 |
| FIN-INV-007 | FIN-GAP-001 |
| FIN-INV-008 | FIN-GAP-002 |
| FIN-INV-009 | FIN-GAP-002 |
| FIN-INV-010 | FIN-GAP-002 |
| FIN-INV-011 | FIN-GAP-002 |
| FIN-INV-012 | FIN-GAP-002 |
| FIN-INV-013 | FIN-GAP-002, FIN-GAP-005 |
| FIN-INV-014 | FIN-GAP-003 |
| FIN-INV-015 | FIN-GAP-003, FIN-GAP-007 |
| FIN-INV-016 | FIN-GAP-003, FIN-GAP-004 |
| FIN-INV-017 | FIN-GAP-004 |
| FIN-INV-018 | FIN-GAP-004 |
| FIN-INV-019 | FIN-GAP-004 |
| FIN-INV-020 | FIN-GAP-003, FIN-GAP-004 |
| FIN-INV-021 | FIN-GAP-001, FIN-GAP-011 |
| FIN-INV-022 | FIN-GAP-001, FIN-GAP-011 |
| FIN-INV-023 | FIN-GAP-001 |
| FIN-INV-024 | FIN-GAP-004 |
| FIN-INV-025 | FIN-GAP-004 |
| FIN-INV-026 | FIN-GAP-005 |
| FIN-INV-027 | FIN-GAP-005 |
| FIN-INV-028 | FIN-GAP-005 |
| FIN-INV-029 | FIN-GAP-006 |
| FIN-INV-030 | FIN-GAP-006 |
| FIN-INV-031 | FIN-GAP-006, FIN-GAP-008, FIN-GAP-011 |
| FIN-INV-032 | FIN-GAP-006 |
| FIN-INV-033 | FIN-GAP-005, FIN-GAP-006 |
| FIN-INV-034 | FIN-GAP-003, FIN-GAP-008 |
| FIN-INV-035 | FIN-GAP-008 |
| FIN-INV-036 | FIN-GAP-004, FIN-GAP-008, FIN-GAP-011 |
| FIN-INV-037 | FIN-GAP-002, FIN-GAP-011 |
| FIN-INV-038 | FIN-GAP-006, FIN-GAP-008 |
| FIN-INV-039 | FIN-GAP-008 |
| FIN-INV-040 | FIN-GAP-008 |
| FIN-INV-041 | FIN-GAP-002, FIN-GAP-008 |
| FIN-INV-042 | FIN-GAP-004, FIN-GAP-008 |
| FIN-INV-043 | FIN-GAP-011 |
| FIN-INV-044 | FIN-GAP-008 |
| FIN-INV-045 | FIN-GAP-009 |
| FIN-INV-046 | FIN-GAP-010 |
| FIN-INV-047 | FIN-GAP-009 |
| FIN-INV-048 | FIN-GAP-009, FIN-GAP-012 |
| FIN-INV-049 | FIN-GAP-009 |
| FIN-INV-050 | FIN-GAP-009 |
| FIN-INV-051 | FIN-GAP-009 |
| FIN-INV-052 | FIN-GAP-009 |
| FIN-INV-053 | NO GAP - NON-GOAL |
| FIN-INV-054 | FIN-GAP-009 |
| FIN-INV-055 | FIN-GAP-005, FIN-GAP-009 |
| FIN-INV-056 | FIN-GAP-010 |
| FIN-INV-057 | FIN-GAP-010 |
| FIN-INV-058 | FIN-GAP-010 |
| FIN-INV-059 | FIN-GAP-011 |
| FIN-INV-060 | FIN-GAP-004, FIN-GAP-011 |
| FIN-INV-061 | FIN-GAP-002, FIN-GAP-011 |
| FIN-INV-062 | FIN-GAP-006, FIN-GAP-011 |
| FIN-INV-063 | FIN-GAP-004, FIN-GAP-011 |
| FIN-INV-064 | FIN-GAP-011 |
| FIN-INV-065 | FIN-GAP-003, FIN-GAP-005, FIN-GAP-011 |
| FIN-INV-066 | FIN-GAP-010 |
| FIN-INV-067 | FIN-GAP-013 |
| FIN-INV-068 | FIN-GAP-013 |
| FIN-INV-069 | FIN-GAP-013 |
| FIN-INV-070 | FIN-GAP-012, FIN-GAP-015 |
| FIN-INV-071 | FIN-GAP-012, FIN-GAP-015 |
| FIN-INV-072 | FIN-GAP-012 |
| FIN-INV-073 | FIN-GAP-014 |
| FIN-INV-074 | FIN-GAP-014 |

FIN-INV traceability: 74/74.

## 8. Donor Candidate -> Gap Traceability

| Donor candidate | Disposition in Phase 4 | Used by FIN-GAP |
|---|---|---|
| DC-ADAPT-001 Ledger movement representation | Retained | FIN-GAP-003, FIN-GAP-011 |
| DC-ADAPT-002 Derived account balances | Retained | FIN-GAP-002, FIN-GAP-011 |
| DC-ADAPT-003 Account metadata sidecar | Retained | FIN-GAP-001, FIN-GAP-002 |
| DC-ADAPT-004 Transaction kind validation/filtering | Retained | FIN-GAP-003, FIN-GAP-011 |
| DC-ADAPT-005 Grouped transfer representation | Retained | FIN-GAP-004 |
| DC-ADAPT-006 Nullable transaction category | Retained | FIN-GAP-003, FIN-GAP-007 |
| DC-ADAPT-007 Monthly base/category budget plan | Retained | FIN-GAP-008 |
| DC-ADAPT-008 Budget adjustments | Retained | FIN-GAP-008 |
| DC-ADAPT-009 Budget actual derivation | Retained | FIN-GAP-008, FIN-GAP-011 |
| DC-ADAPT-010 Reports and aggregation | Retained | FIN-GAP-011 |
| DC-ADAPT-011 Native currency with warnings | Retained | FIN-GAP-011, FIN-GAP-004 |
| DC-ADAPT-012 Account status/suggestions | Downgraded to reference | FIN-GAP-002, FIN-GAP-015 |
| DC-ADAPT-013 Business/personal transfer reporting analogue | Downgraded to reference | FIN-GAP-001, FIN-GAP-011 |

Donor candidate traceability: 13/13.

## 9. Current Authority Preservation Map

| Current authority | Preserve as | Related FIN-GAP(s) |
|---|---|---|
| Auth | Canonical identity/auth authority | FIN-GAP-001 |
| User/person ownership | Canonical personal ownership authority | FIN-GAP-001 |
| Household | Canonical household authority | FIN-GAP-001 |
| Membership | Canonical membership authority | FIN-GAP-001 |
| RLS foundations | Privacy and access-control foundation | FIN-GAP-001, 002, 003, 004, 011, 012 |
| Planner composition | Canonical Planner task/event authority | FIN-GAP-010 |
| Audit/outbox | Shared reliability/audit foundation | FIN-GAP-002, 003, 004, 005, 006, 009, 014 |
| Mutation contracts | Canonical mutation discipline | FIN-GAP-003, 004, 005, 014 |
| Idempotency/reliability | Canonical reliability foundation | FIN-GAP-003, 004, 005, 014 |
| Home | Existing Home authority | FIN-GAP-012, 015 |
| Attention | Existing Attention authority | FIN-GAP-012 |
| Notifications | Existing notification authority/foundation | FIN-GAP-012 |
| Search | Existing Search authority/capability gates | FIN-GAP-012, 014 |
| Inventory | Existing Inventory authority | FIN-GAP-013 |
| Shared UI/testing | Existing UI/test foundation | FIN-GAP-015 |

No new gap recreates these authorities.

## 10. External Dependencies

| Dependency | Related gap | Classification | Handling |
|---|---|---|---|
| Assets canonical authority | FIN-GAP-013 | EXTERNAL DEPENDENCY / PARTIAL BLOCKER | Finance can define relationship intent but cannot redesign Assets. |
| HomeCloud canonical authority | FIN-GAP-013 | EXTERNAL DEPENDENCY / PARTIAL BLOCKER | Finance can define relationship intent but cannot redesign HomeCloud. |
| Frontend detail / design pass | FIN-GAP-015 | SPECIFICATION DEPENDENCY | Detailed Finance screens/interactions are pending before implementation freeze. |

External dependency count used in summary: 2 canonical-authority dependencies. The frontend detail/design pass is a specification dependency, not an architectural blocker.

## 11. Gap Dependency Graph

Dependency rule: an edge means "prerequisite capability needed for the dependent capability to exist." Downstream consumers are not modeled as prerequisites merely because they display or aggregate another gap's output.

Direct prerequisite edge list:

| From prerequisite | To dependent |
|---|---|
| FIN-GAP-001 | FIN-GAP-002 |
| FIN-GAP-001 | FIN-GAP-003 |
| FIN-GAP-002 | FIN-GAP-003 |
| FIN-GAP-001 | FIN-GAP-004 |
| FIN-GAP-002 | FIN-GAP-004 |
| FIN-GAP-003 | FIN-GAP-004 |
| FIN-GAP-003 | FIN-GAP-005 |
| FIN-GAP-004 | FIN-GAP-005 |
| FIN-GAP-003 | FIN-GAP-006 |
| FIN-GAP-005 | FIN-GAP-006 |
| FIN-GAP-003 | FIN-GAP-007 |
| FIN-GAP-001 | FIN-GAP-008 |
| FIN-GAP-002 | FIN-GAP-008 |
| FIN-GAP-003 | FIN-GAP-008 |
| FIN-GAP-004 | FIN-GAP-008 |
| FIN-GAP-006 | FIN-GAP-008 |
| FIN-GAP-007 | FIN-GAP-008 |
| FIN-GAP-001 | FIN-GAP-009 |
| FIN-GAP-003 | FIN-GAP-009 |
| FIN-GAP-005 | FIN-GAP-009 |
| FIN-GAP-009 | FIN-GAP-010 |
| FIN-GAP-001 | FIN-GAP-011 |
| FIN-GAP-002 | FIN-GAP-011 |
| FIN-GAP-003 | FIN-GAP-011 |
| FIN-GAP-004 | FIN-GAP-011 |
| FIN-GAP-005 | FIN-GAP-011 |
| FIN-GAP-006 | FIN-GAP-011 |
| FIN-GAP-007 | FIN-GAP-011 |
| FIN-GAP-008 | FIN-GAP-011 |
| FIN-GAP-009 | FIN-GAP-011 |
| FIN-GAP-001 | FIN-GAP-012 |
| FIN-GAP-008 | FIN-GAP-012 |
| FIN-GAP-009 | FIN-GAP-012 |
| FIN-GAP-011 | FIN-GAP-012 |
| FIN-GAP-001 | FIN-GAP-013 |
| FIN-GAP-001 | FIN-GAP-014 |
| FIN-GAP-003 | FIN-GAP-014 |
| FIN-GAP-004 | FIN-GAP-014 |
| FIN-GAP-009 | FIN-GAP-014 |
| FIN-GAP-001 | FIN-GAP-015 |
| FIN-GAP-002 | FIN-GAP-015 |
| FIN-GAP-003 | FIN-GAP-015 |
| FIN-GAP-004 | FIN-GAP-015 |
| FIN-GAP-006 | FIN-GAP-015 |
| FIN-GAP-008 | FIN-GAP-015 |
| FIN-GAP-009 | FIN-GAP-015 |
| FIN-GAP-010 | FIN-GAP-015 |
| FIN-GAP-011 | FIN-GAP-015 |
| FIN-GAP-012 | FIN-GAP-015 |

```text
REFUND DIRECTION CORRECTION:

FIN-GAP-003 Transaction authority
FIN-GAP-005 Financial history lifecycle
  -> FIN-GAP-006 Refund Lifecycle
     -> FIN-GAP-008 Budget calculations
     -> FIN-GAP-011 Reporting/read models

Budget and Reports consume Refund behavior. Refund does not depend on Budget
or Reports merely because it affects them.
```

Topological sanity tiers:

| Tier | Gaps | Dependency note |
|---|---|---|
| Tier 0 | FIN-GAP-001 | No Finance prerequisite; composes with existing Auth/Household/RLS. |
| Tier 1 | FIN-GAP-002, FIN-GAP-013 | Depend on FIN-GAP-001 or existing external/canonical authorities. |
| Tier 2 | FIN-GAP-003 | Depends on context and accounts. |
| Tier 3 | FIN-GAP-004, FIN-GAP-007 | Depend on transaction authority. |
| Tier 4 | FIN-GAP-005 | Depends on transaction and transfer truth. |
| Tier 5 | FIN-GAP-006, FIN-GAP-009 | Refund depends on transactions/history; obligations depend on context/transactions/history. |
| Tier 6 | FIN-GAP-008, FIN-GAP-010, FIN-GAP-014 | Budget consumes refund/categories/transfers; Planner consumes obligations; FIN-GAP-014 freezes only the Finance-side external-consumer contract while runtime Geni/Automations remain deferred. |
| Tier 7 | FIN-GAP-011 | Reports consume financial truth, budget, refund, categories, currency behavior, and FIN-GAP-009 Obligation/Occurrence truth for Upcoming Obligations. |
| Tier 8 | FIN-GAP-012 | Home/Attention/Notifications/Search consume budget, obligation, and reporting projections. |
| Tier 9 | FIN-GAP-015 | Mobile surface consumes product-facing Finance capability boundaries and needs later UI specification; it does not depend on Geni/Automations implementation. |

Foundation gaps:

- FIN-GAP-001
- FIN-GAP-002
- FIN-GAP-003
- FIN-GAP-004
- FIN-GAP-005
- FIN-GAP-009

Parallel/external integration gaps:

- FIN-GAP-013
- FIN-GAP-014 (Finance-side contract freeze only; runtime external integrations deferred)
- FIN-GAP-015

Dependency check:

```text
TOTAL GAPS:
15

DIRECT DEPENDENCY EDGES:
49

SELF DEPENDENCIES:
0

DIRECT CYCLES:
0

INDIRECT CYCLES:
0

DAG CHECK:
PASS
```

This graph is not a wave plan and does not assign implementation order.

## 12. FAST / STANDARD / STRUCTURAL Summary

| Classification | Gaps | Count |
|---|---|---:|
| FAST | None | 0 |
| STANDARD | FIN-GAP-011, FIN-GAP-014, FIN-GAP-015 | 3 |
| STRUCTURAL | FIN-GAP-001, FIN-GAP-002, FIN-GAP-003, FIN-GAP-004, FIN-GAP-005, FIN-GAP-006, FIN-GAP-007, FIN-GAP-008, FIN-GAP-009, FIN-GAP-010, FIN-GAP-012, FIN-GAP-013 | 12 |

| Type | Gaps | Count |
|---|---|---:|
| NEW FINANCE CAPABILITY | FIN-GAP-006, FIN-GAP-009 | 2 |
| CURRENT AUTHORITY INTEGRATION | FIN-GAP-005, FIN-GAP-010, FIN-GAP-012, FIN-GAP-013, FIN-GAP-015 | 5 |
| DEFERRED EXTERNAL CAPABILITY BOUNDARY | FIN-GAP-014 | 1 |
| DONOR ADAPTATION | FIN-GAP-011 | 1 |
| MIXED | FIN-GAP-001, FIN-GAP-002, FIN-GAP-003, FIN-GAP-004, FIN-GAP-007, FIN-GAP-008 | 6 |

```text
TOTAL REAL GAPS:
15

FAST:
0

STANDARD:
3

STRUCTURAL:
12

NEW FINANCE CAPABILITY:
2

CURRENT AUTHORITY INTEGRATION:
5

DEFERRED EXTERNAL CAPABILITY BOUNDARY:
1

DONOR ADAPTATION:
1

MIXED:
6

BLOCKED:
1 partial blocker gap

EXTERNAL DEPENDENCY:
2 canonical-authority dependencies

SPECIFICATION DEPENDENCY:
1 gap
```

## 13. Blockers / Stop Conditions

Blocked gaps:

- FIN-GAP-013 is partially blocked for Assets/HomeCloud subparts until canonical authorities are available or accepted by Control.

Specification dependency gaps:

- FIN-GAP-015 requires frontend detail / design pass before Implementation Freeze. This is not an architectural blocker and is not counted as evidence-blocked.

Open evidence questions classified:

| Question | Classification | Related gap |
|---|---|---|
| Transfer atomicity / same-account validation | RESOLVED ENOUGH TO BE A REAL GAP | FIN-GAP-004 |
| Cross-currency policy without donor FX | RESOLVED ENOUGH TO BE A REAL GAP | FIN-GAP-004, FIN-GAP-011 |
| Budget carry-over proof | RESOLVED ENOUGH TO BE A REAL GAP | FIN-GAP-008 |
| Refund | RESOLVED ENOUGH TO BE A REAL GAP | FIN-GAP-006 |
| Balance Adjustment | RESOLVED ENOUGH TO BE A REAL GAP | FIN-GAP-002 |
| Category/account lifecycle | RESOLVED ENOUGH TO BE A REAL GAP | FIN-GAP-002, FIN-GAP-007 |
| Obligations/payments | RESOLVED ENOUGH TO BE A REAL GAP | FIN-GAP-009 |
| Assets/HomeCloud authority | EXTERNAL DEPENDENCY | FIN-GAP-013 |

Stop conditions observed:

- No Product Freeze contradiction found.
- No Current authority ownership contradiction found.
- No donor adaptation requires donor Auth/workspace.
- No AGPL code is needed.
- Assets/HomeCloud redesign is not attempted.
- No scope expansion outside Freeze.


## 13A. Pre-FZ-01 Control Corrections

- `Upcoming Obligations` is explicitly part of FIN-GAP-011 reporting/read-model scope and adds prerequisite edge `FIN-GAP-009 -> FIN-GAP-011`.
- `FIN-GAP-014` is a Finance-side **External Canonical Consumer Boundary**, not authorization to implement Geni/Automations.
- Accepted Current evidence does not demonstrate canonical Geni or Automations authorities; both runtime integrations are deferred and do not block Finance Core.
- `FIN-GAP-015` no longer depends on FIN-GAP-014, so Mobile Finance is not blocked by deferred AI/automation capabilities.
- Gap identity remains 15/15; dependency graph remains acyclic.

## 14. Changes Performed

```text
CREATED:
docs\implementation\FINANCE_REAL_GAP_MAP.md

PHASE 4R + PRE-FZ-01 CONTROL CORRECTED:
Refund prerequisites now point only to Transaction authority and Financial History lifecycle.
Budget and Reports are recorded as downstream consumers of Refund.
Dependency graph now includes explicit direct prerequisite edges, topological tiers, and DAG check.
FIN-GAP-015 frontend detail/design pass is recorded as a specification dependency, not an architectural blocker.
Upcoming Obligations is now explicit in FIN-GAP-011 with FIN-GAP-009 as prerequisite.
FIN-GAP-014 is freeze-only on the Finance side; Geni/Automations runtime integration is deferred.

MODIFIED:
docs\implementation\FINANCE_REAL_GAP_MAP.md

NOT MODIFIED:
docs\implementation\FINANCE_CURRENT_CAPABILITY_AUDIT.md
docs\implementation\FINANCE_DONOR_CAPABILITY_AUDIT.md
docs\implementation\FINANCE_CURRENT_DONOR_VS_TARGET_MATRIX.md
C:\Users\thega\Downloads\HOMePLUS_FINANCE_PRODUCT_FREEZE_V1.0.md

CODE CHANGES:
none

IMPLEMENTATION FREEZES:
none

SCHEMA / MIGRATIONS / WAVES:
none
```
