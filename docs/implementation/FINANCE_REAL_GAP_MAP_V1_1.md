# HOMePLUS — FINANCE REAL GAP MAP V1.1

**Documento:** `FINANCE_REAL_GAP_MAP_V1_1.md`  
**Módulo:** Finance  
**Fecha:** 2026-08-12  
**Estado:** `FINANCE_REAL_GAP_MAP_V1_1_COMPLETE`  
**Modo:** `DEDUPLICATION + CLASSIFICATION / NO IMPLEMENTATION DESIGN`

---

# 00. PURPOSE

Este documento convierte:

```text
FINANCE PRODUCT FREEZE V1.1
+
FINANCE CURRENT CAPABILITY REBASE V1.1
+
FINANCE DONOR CAPABILITY REBASE V1.1
+
FINANCE CURRENT + DONOR vs TARGET MATRIX V1.1
```

en una lista deduplicada de **Real Gaps**.

La pregunta de este gate es:

```text
DADO LO QUE HOMePLUS YA TIENE,
DADO LO QUE LOS DONORS REALMENTE APORTAN,
Y DADO EL TARGET V1.1,

¿QUÉ CAPACIDADES REALES FALTAN
PARA QUE FINANCE CORE EXISTA
SIN DUPLICAR AUTHORITIES,
SIN PORTAR ARQUITECTURA ACCIDENTAL
Y SIN ADELANTAR INTEGRACIONES DIFERIDAS?
```

Este documento NO:

- diseña tablas;
- define migrations;
- define RPCs;
- define endpoints;
- define nombres finales de services/hooks/components;
- define waves de implementación;
- autoriza implementación;
- autoriza copiar código donor;
- reabre Product Truth;
- implementa permisos globales;
- implementa relaciones cross-module diferidas.

El próximo gate es:

```text
FINANCE_MINIMAL_INTEGRATION_PLAN_V1_1
```

---

# 01. AUTHORITIES

## 01.1 Product authority

```text
HOMePLUS_FINANCE_PRODUCT_FREEZE_V1.1
```

V1.1 es la autoridad de:

```text
Product Truth
Functional Behavior
Experience Model
Information Architecture
Frontend Surface Model
```

## 01.2 Current authority

```text
FINANCE_CURRENT_CAPABILITY_AUDIT.md
FINANCE_CURRENT_CAPABILITY_REBASE_V1_1.md
```

Baseline aceptado:

```text
Repo:
C:\Users\thega\Desktop\HomePlus

Branch:
pulido-medio-inventario-planner

HEAD:
3282907c0b0e2fe3b963e33cf4f0afc10909424f
```

Control confirmó que el código no cambió desde el audit original.

## 01.3 Donor authority

```text
FINANCE_DONOR_CAPABILITY_AUDIT.md
FINANCE_DONOR_CAPABILITY_REBASE_V1_1.md
```

Primary donor:

```text
kirill-markin/expense-budget-tracker
93d6ed1f8174a8f39551642391484dd87b4a045b
MIT
```

Mature reference:

```text
actualbudget/actual
d67ca574673fef386115fa5ebe26b62f0d6216e3
REFERENCE ONLY
```

## 01.4 Decision matrix

```text
FINANCE_CURRENT_DONOR_VS_TARGET_MATRIX_V1_1.md
```

Matrix coverage:

```text
CORE:
C-001 → C-076

FRONTEND:
FE-001 → FE-049

TOTAL TARGET ROWS:
125
```

---

# 02. REAL GAP CONVERSION RULES

A **Real Gap** debe cumplir simultáneamente:

```text
1.
Representar una capability coherente,
no una sola acceptance row.

2.
Tener owner/lifecycle reconocible.

3.
No recrear una authority que Current ya posee.

4.
No confundir donor behavior con HomePlus authority.

5.
No incluir trabajo explícitamente diferido por V1.1.

6.
Ser suficientemente pequeño
para poder congelarse, validarse e implementarse
sin reconstruir todo Finance.

7.
Ser suficientemente grande
para evitar micro-gaps por pantalla,
campo o cálculo.

8.
No contener diseño de implementación prematuro.
```

---

# 03. IMPORTANT DEDUPLICATION DECISIONS

## 03.1 Expected Payment + Register Payment are ONE lifecycle gap

La matriz separaba:

```text
R-09
Expected Payments / Recurrence

R-10
Register Payment + Reconciliation
```

Pero ambos pertenecen al mismo lifecycle financiero:

```text
Expected Payment
→ occurrence
→ due/overdue
→ actual Payment
→ Expense
→ PAID
→ possible Trash
→ recalculated occurrence
```

Por lo tanto se convierten en un solo Real Gap.

---

## 03.2 Attention / Notifications / Home / Search are NOT a new Finance subsystem

La matriz tenía:

```text
R-12
Finance Signals to Attention/Home/Notifications/Search
```

V1.1 establece:

```text
Finance owns financial state.
Attention owns relevance.
Notifications owns delivery.
Home owns Home projection.
Search owns discovery.
```

Además, la composición cross-module se difiere al Integration Pass.

Por lo tanto:

```text
NO standalone Finance Core gap
for rebuilding those systems.
```

Los estados Finance necesarios para futuras proyecciones pertenecen a sus gaps financieros de origen:

```text
Payment Due / Overdue
→ FIN-GAP-009

Budget Exceeded
→ FIN-GAP-008

financial read models
→ FIN-GAP-010
```

La composición externa queda en `DEFERRED CROSS-MODULE REGISTER`.

---

## 03.3 Reliability is mandatory, but not FinanceReliability

La matriz tenía:

```text
R-15
Finance Reliability Integration + Tests
```

Current ya posee:

```text
audit/outbox
mutation contracts
idempotency foundations
frontend mutation identity
server-state reconciliation
reliability precedents
test infrastructure
```

V1.1 prohíbe crear:

```text
FinanceReliability
```

Por lo tanto no se crea un Real Gap separado que pueda transformarse en sistema paralelo.

Reliability y tests pasan a ser:

```text
MANDATORY CROSS-CUTTING OBLIGATION
```

de todos los gaps que mutan o proyectan financial truth.

---

## 03.4 Frontend is split into TWO coherent gaps

No se hace:

```text
one gap per screen
```

pero tampoco se deja todo el frontend como un bloque gigante.

Se separa en:

```text
FIN-GAP-011
Daily Finance Experience
→ Resumen
→ Movimientos
→ Pagos
→ Money Flow

FIN-GAP-012
Finance Management & Analysis Surfaces
→ Análisis
→ Cuentas
→ Categorías
→ Papelera
```

La separación sigue:

```text
high-frequency daily use
vs
lower-frequency management/deep analysis
```

---

# 04. EXECUTIVE REAL GAP MAP

| Gap ID | Plain name | Technical name | Type | Classification | Primary owner | Blocked? |
|---|---|---|---|---|---|---|
| FIN-GAP-001 | Contexto financiero y privacidad | Financial Context & Privacy Boundary | CURRENT AUTHORITY INTEGRATION | STRUCTURAL | Finance + Auth/Household foundations | NO |
| FIN-GAP-002 | Cuentas y saldo verdadero | Account Authority & Balance Lifecycle | MIXED | STRUCTURAL | Finance | NO |
| FIN-GAP-003 | Ingresos, gastos y autoridad transaccional | Transaction Authority & Financial Attribution | MIXED | STRUCTURAL | Finance | NO |
| FIN-GAP-004 | Transferencias canónicas | Canonical Transfer & Cross-Currency Movement | MIXED | STRUCTURAL | Finance | NO |
| FIN-GAP-005 | Corrección, historial y papelera | Financial Correction, History, Trash & Restore | CURRENT AUTHORITY INTEGRATION | STRUCTURAL | Finance + Core reliability/audit | NO |
| FIN-GAP-006 | Reembolsos | Refund Lifecycle | NEW FINANCE CAPABILITY | STRUCTURAL | Finance | NO |
| FIN-GAP-007 | Categorías | Finance Category Authority V1.1 | MIXED | STRUCTURAL | Finance | NO |
| FIN-GAP-008 | Presupuestos | Budget Authority, Actuals & Period History | MIXED | STRUCTURAL | Finance | NO |
| FIN-GAP-009 | Pagos esperados y pagos reales | Expected Payment, Recurrence & Settlement Lifecycle | NEW FINANCE CAPABILITY | STRUCTURAL | Finance | NO |
| FIN-GAP-010 | Análisis financiero y monedas | Financial Read Models & Multicurrency Integrity | DONOR ADAPTATION | STANDARD | Finance | NO |
| FIN-GAP-011 | Experiencia diaria de Finanzas | Daily Finance Mobile Experience | CURRENT AUTHORITY INTEGRATION | STANDARD | Finance + shared mobile UI | DEPENDENCY-ORDERED |
| FIN-GAP-012 | Gestión y análisis de Finanzas | Finance Management & Analysis Surfaces | CURRENT AUTHORITY INTEGRATION | STANDARD | Finance + shared mobile UI | DEPENDENCY-ORDERED |

```text
REAL GAPS:
12

STRUCTURAL:
9

STANDARD:
3

FAST:
0
```

No gap se clasifica FAST porque todos tocan:

```text
financial truth
privacy
lifecycle
aggregation
or frozen multi-surface UX
```

---

# 05. FIN-GAP-001 — FINANCIAL CONTEXT & PRIVACY BOUNDARY

```text
GAP ID:
FIN-GAP-001

PLAIN NAME:
Contexto financiero y privacidad

TYPE:
CURRENT AUTHORITY INTEGRATION

CLASSIFICATION:
STRUCTURAL

PRIMARY OWNER:
Finance

FOUNDATIONS OWNED BY:
Auth
Household
Membership
Core RLS foundations
```

## 05.1 Product Target

Finance debe distinguir:

```text
PERSONAL
HOUSEHOLD
```

con reglas:

```text
Personal
→ belongs to User
→ owner-only by default

Household
→ belongs to active Household
→ visible according to Household authority
```

Financial Context:

```text
≠ global App Shell Household selection
```

y Source puede diferir del Financial Context sin filtrar información privada.

## 05.2 Target rows

```text
C-001
C-002
C-003
C-004
C-005
C-023
C-024
```

Shared impact on:

```text
C-025
C-026
C-067..C-072
FE-003
```

## 05.3 Current

Current already owns:

```text
public.people
public.households
public.household_members
public.current_person_id()
public.is_active_household_member()
membership visibility helpers
self-only person RLS
household RLS patterns
Planner personal/shared visibility precedent
```

Current does NOT own:

```text
Finance scope entity/authority
Personal Finance owner policy
Household Finance projection
cross-context financial privacy
Finance Financial Context selector semantics
```

## 05.4 Donor

```text
DONOR AUTHORITY:
REJECT
```

Donor workspace/business-personal semantics must not become:

```text
HomePlus Personal/Household
```

Reference analogue `DC-ADAPT-013` is allowed only for read-model thinking.

## 05.5 Real Gap

Implementable capability missing:

```text
canonical Finance financial scope
+
Finance ownership rules
+
privacy boundary
+
safe Source vs Context semantics
```

without recreating Auth or Household.

## 05.6 Current to preserve

```text
Auth identity
person identity
household identity
membership
RLS helper foundations
```

## 05.7 Donor behavior to preserve

```text
none as ownership authority
```

Optional reference:

```text
cross-context reporting analogue
```

## 05.8 Donor architecture to reject

```text
workspace
workspace membership
business/personal privacy labels
donor RLS
```

## 05.9 Dependencies

```text
NONE inside Finance
```

This is a foundational gap.

## 05.10 Downstream consumers

```text
FIN-GAP-002
FIN-GAP-003
FIN-GAP-004
FIN-GAP-007
FIN-GAP-008
FIN-GAP-009
FIN-GAP-010
FIN-GAP-011
FIN-GAP-012
```

## 05.11 Permissions impact

```text
HIGH
```

Exact role packages remain deferred to Global Permissions Pass.

Scope ownership and deny-safe privacy cannot be deferred.

## 05.12 History impact

```text
HIGH
```

Historical financial truth cannot silently move between Personal/Household.

## 05.13 Not part of this gap

```text
Auth redesign
Household redesign
global role package design
Search implementation
Attention implementation
Planner integration
```

---

# 06. FIN-GAP-002 — ACCOUNT AUTHORITY & BALANCE LIFECYCLE

```text
GAP ID:
FIN-GAP-002

PLAIN NAME:
Cuentas y saldo verdadero

TYPE:
MIXED

CLASSIFICATION:
STRUCTURAL

PRIMARY OWNER:
Finance
```

## 06.1 Product Target

Finance needs persistent Account authority:

```text
Account can exist before movements.
```

Types:

```text
ACCOUNT
CREDIT_CARD
```

Balance model:

```text
UNKNOWN != 0

Balance Anchor
+ later financial effects
= known Current Balance
```

Supports:

```text
negative Balance
Balance Correction
stable Currency
Archive
Unarchive
```

Credit Card is:

```text
Account type/presentation
NOT separate subsystem
```

## 06.2 Target rows

```text
C-006
C-007
C-008
C-009
C-010
C-011
C-012
C-013
C-014
C-074
C-075
C-076 boundary
```

Frontend consumers:

```text
FE-036
FE-037
FE-038
FE-039
FE-040
FE-041
FE-042
```

## 06.3 Current

Absent:

```text
Finance Account
balance authority
opening/unknown Balance
Anchor
Balance Correction
Account Currency
Account archive
Credit Card behavior
```

Reusable Current foundations:

```text
FIN-GAP-001 ownership
audit/outbox
mutation contracts
shared forms/lists/empty states
```

## 06.4 Donor

Useful:

```text
DC-ADAPT-002
Derived account balances

DC-ADAPT-003
Account metadata sidecar — NARROW

DC-ADAPT-011
Native currency behavior

DC-ADAPT-012
Account status/suggestions — REFERENCE ONLY
```

Also:

```text
negative balance behavior
```

## 06.5 Real Gap

Missing canonical authority for:

```text
persistent Account
Account type
Unknown Balance
Anchor
Balance Correction
fixed Currency
Archive/Unarchive
Credit Card presentation
```

while adapting donor arithmetic instead of donor account architecture.

## 06.6 Donor behavior to preserve

```text
balance sum arithmetic
negative balance support
currency-aware reads
account read-model ideas
```

## 06.7 Donor architecture to reject

```text
Account existence derived from ledger
MODE-derived Currency
donor Account lifecycle
business/personal metadata semantics
investment/account grouping scope
```

## 06.8 Dependencies

```text
FIN-GAP-001
```

## 06.9 Downstream consumers

```text
FIN-GAP-004
FIN-GAP-008 indirectly
FIN-GAP-009 optionally
FIN-GAP-010
FIN-GAP-011
FIN-GAP-012
```

## 06.10 History impact

```text
VERY HIGH
```

Anchor, correction and archive must preserve historical truth.

## 06.11 Runtime validation later

```text
Unknown vs zero
Anchor arithmetic
negative balances
Balance Correction exclusions
Currency immutability
archive/unarchive
Credit Card purchase/payment effects
```

## 06.12 Not part of this gap

```text
bank sync
card statement closing
minimum payment
advanced credit tracking
investment accounts
automatic FX
```

---

# 07. FIN-GAP-003 — TRANSACTION AUTHORITY & FINANCIAL ATTRIBUTION

```text
GAP ID:
FIN-GAP-003

PLAIN NAME:
Ingresos, gastos y autoridad transaccional

TYPE:
MIXED

CLASSIFICATION:
STRUCTURAL

PRIMARY OWNER:
Finance
```

## 07.1 Product Target

Canonical primitives:

```text
INCOME
EXPENSE
TRANSFER
```

This gap owns Income/Expense authority and common transaction semantics.

Key invariants:

```text
Expense may exist without Account.
Income may exist without Account.
Category may be optional.
Financial Context is explicit.
Source and Context are separate concepts.
```

## 07.2 Target rows

```text
C-015
C-016
C-017
C-023
C-024
C-025 partial
C-026 partial
C-074 partial
```

Related frontend:

```text
FE-013
FE-014
FE-015
FE-016
FE-017
FE-020
FE-021
FE-022
FE-023
```

## 07.3 Current

Absent:

```text
Finance transaction schema/API
Income
Expense
transaction classification
source/context semantics
```

Current provides:

```text
mutation contract
audit/outbox
idempotency foundations
shared form/list primitives
```

## 07.4 Donor

Useful:

```text
DC-ADAPT-001
ledger movement representation

DC-ADAPT-004
transaction kind validation/filtering

DC-ADAPT-006
nullable Category — NARROW
```

## 07.5 Real Gap

Missing HomePlus Finance authority for:

```text
Income
Expense
common transaction identity/provenance
optional Account
Financial Context attribution
source/context semantics
```

## 07.6 Donor behavior to preserve

```text
movement classification
kind validation
filter semantics
ledger/read-model ideas
```

## 07.7 Donor behavior to reject

```text
required account_id
direct update/delete as lifecycle
donor workspace ownership
```

## 07.8 Dependencies

```text
FIN-GAP-001
```

Account is NOT a hard prerequisite because V1.1 permits:

```text
Expense without Account
Income without Account
```

## 07.9 Downstream consumers

```text
FIN-GAP-004
FIN-GAP-005
FIN-GAP-006
FIN-GAP-008
FIN-GAP-009
FIN-GAP-010
FIN-GAP-011
FIN-GAP-012
```

## 07.10 Runtime validation later

```text
Expense without Account
Income without Account
single-count attribution
Source vs Context privacy
classification stability
```

---

# 08. FIN-GAP-004 — CANONICAL TRANSFER & CROSS-CURRENCY MOVEMENT

```text
GAP ID:
FIN-GAP-004

PLAIN NAME:
Transferencias canónicas

TYPE:
MIXED

CLASSIFICATION:
STRUCTURAL

PRIMARY OWNER:
Finance
```

## 08.1 Product Target

Transfer:

```text
requires Source Account
requires Destination Account
Source != Destination
does not count as Income
does not count as Expense
is one logical financial operation
```

Cross-currency:

```text
Source Amount
Destination Amount
```

No required FX engine.

Contribution and Reimbursement are Transfer compositions, not separate financial classes.

## 08.2 Target rows

```text
C-018
C-019
C-020
C-021
C-022
C-025
C-026
C-075
```

Frontend:

```text
FE-018
FE-019
```

## 08.3 Current

No Finance Transfer authority.

Current does provide:

```text
mutation correlation
idempotency foundations
audit/outbox
```

## 08.4 Donor

Strongest donor contribution:

```text
DC-ADAPT-005
Grouped Transfer representation
```

Useful behavior:

```text
paired effects
same event grouping
source negative
destination positive
transfer report separation
```

Actual Budget reference:

```text
source != destination
coherent transfer pair
validation tests
```

Cross-currency donor evidence remains reference only.

## 08.5 Real Gap

Missing canonical HomePlus operation for:

```text
atomic logical Transfer
paired financial effects
same-account rejection
cross-currency two-side amounts
Contribution/Reimbursement composition
```

## 08.6 Donor behavior to preserve

```text
paired movement semantics
event grouping
report exclusion
validation edge-case ideas
```

## 08.7 Donor architecture to reject

```text
SQL-agent mutation protocol
workspace
missing atomic boundary
automatic FX subsystem
```

## 08.8 Dependencies

```text
FIN-GAP-001
FIN-GAP-002
FIN-GAP-003
```

## 08.9 Downstream consumers

```text
FIN-GAP-005
FIN-GAP-008
FIN-GAP-010
FIN-GAP-011
FIN-GAP-012
```

## 08.10 Runtime validation later

```text
atomicity
same-account rejection
double counting
cross-currency
retry/idempotency
Contribution/Reimbursement reporting
```

---

# 09. FIN-GAP-005 — FINANCIAL CORRECTION, HISTORY, TRASH & RESTORE

```text
GAP ID:
FIN-GAP-005

PLAIN NAME:
Corrección, historial y papelera

TYPE:
CURRENT AUTHORITY INTEGRATION

CLASSIFICATION:
STRUCTURAL

PRIMARY OWNER:
Finance

SHARED FOUNDATIONS:
Core audit
Core outbox
Current mutation/reliability
```

## 09.1 Product Target

Financial truth must be correctable without silent history rewrite.

```text
Correction
→ changes current truth
→ preserves history

Trash
→ removes current financial effects
→ remains recoverable

Restore
→ safely reapplies effects
```

Permanent delete:

```text
DEFERRED
→ Global Data Lifecycle Pass
```

## 09.2 Target rows

```text
C-027
C-028
C-029
C-030 deferred boundary
```

Frontend:

```text
FE-023
FE-024
FE-044 partial
FE-046
FE-047
```

## 09.3 Current

Strong reusable foundations:

```text
audit_events
append-only audit guard
request_id
mutation_id
outbox_events
Planner versioning
Planner trash/restore
frontend pending/reconcile/rollback
```

Absent:

```text
financial effect replay
Finance correction lifecycle
Finance Trash semantics
```

## 09.4 Donor

Primary donor:

```text
REJECT
```

because it uses direct mutation/hard delete.

Actual Budget:

```text
REFERENCE ONLY
```

for tombstone/history and transfer deletion edge cases.

## 09.5 Real Gap

Missing Finance-specific lifecycle that composes with Current:

```text
financial correction
current-effect recalculation
Trash exclusion
Restore reapplication
history inspection
```

## 09.6 Current to preserve

```text
Core audit
outbox
mutation IDs
idempotency
shared reliability
```

## 09.7 Donor architecture to reject

```text
in-place correction as only truth
hard delete
donor transaction lifecycle
```

## 09.8 Dependencies

```text
FIN-GAP-003
FIN-GAP-004
```

## 09.9 Downstream consumers

```text
FIN-GAP-006
FIN-GAP-008
FIN-GAP-009
FIN-GAP-010
FIN-GAP-011
FIN-GAP-012
```

## 09.10 Runtime validation later

```text
correction history
Trash current-effect exclusion
Restore
Transfer-linked history
retries
no duplicate financial effects
```

---

# 10. FIN-GAP-006 — REFUND LIFECYCLE

```text
GAP ID:
FIN-GAP-006

PLAIN NAME:
Reembolsos

TYPE:
NEW FINANCE CAPABILITY

CLASSIFICATION:
STRUCTURAL

PRIMARY OWNER:
Finance
```

## 10.1 Product Target

Refund:

```text
references original Expense
is NOT Income
reduces Net Expense
reduces Budget Spent
cannot exceed original Expense
must not become invalid orphan silently
```

## 10.2 Target rows

```text
C-031
C-032
C-033
C-034
C-035
```

Frontend entry:

```text
FE-024
"Me devolvieron dinero"
```

## 10.3 Current

No Refund/reversal financial lifecycle.

Generic audit/history foundation exists.

## 10.4 Donor

Primary donor:

```text
NO canonical Refund model
```

No direct donor implementation candidate.

## 10.5 Real Gap

Almost entirely new Finance behavior:

```text
Refund identity
Expense relation
amount cap
history lifecycle
Budget impact
report impact
orphan prevention
```

## 10.6 Dependencies

```text
FIN-GAP-003
FIN-GAP-005
```

## 10.7 Downstream consumers

```text
FIN-GAP-008
FIN-GAP-010
FIN-GAP-011
```

## 10.8 Runtime validation later

```text
partial refund
multiple refunds total cap
Expense correction interaction
Expense Trash interaction
Refund Trash/Restore
report/budget effects
```

Partial Payment remains Future; partial Refund is not automatically excluded by that rule.

---

# 11. FIN-GAP-007 — FINANCE CATEGORY AUTHORITY V1.1

```text
GAP ID:
FIN-GAP-007

PLAIN NAME:
Categorías

TYPE:
MIXED

CLASSIFICATION:
STRUCTURAL

PRIMARY OWNER:
Finance
```

## 11.1 Product Target

V1.1 requires:

```text
useful native baseline
+
custom Category
CREATE
EDIT
DELETE
```

Category is optional on Expense.

Delete:

```text
removes future selection
does not erase historical classification meaning
```

No visible Category Archive lifecycle.

## 11.2 Target rows

```text
C-036
C-037
C-038
C-039
C-040 non-target boundary
```

Frontend:

```text
FE-016 partial
FE-021/022 filters
FE-043
```

## 11.3 Current

No Finance Category authority.

Current has only:

```text
generic category-like fields
filter/list/form patterns
```

Planner categories are not Finance categories.

## 11.4 Donor

`DC-ADAPT-006` becomes `NARROW`.

Useful:

```text
nullable Category
filtering/reporting by Category
historical stored value as reference
```

Rejected as authority:

```text
history-derived free-form category catalog
```

## 11.5 Real Gap

Missing:

```text
canonical Finance Category identity
native baseline
custom create/edit/delete
selector lifecycle
history-safe deletion
```

## 11.6 Dependencies

```text
FIN-GAP-001
```

Transaction authority is a consumer, not a hard prerequisite to define Category authority.

## 11.7 Downstream consumers

```text
FIN-GAP-003
FIN-GAP-008
FIN-GAP-010
FIN-GAP-011
FIN-GAP-012
```

## 11.8 Runtime validation later

```text
deleted Category no longer selectable
historical transaction remains understandable
native/custom coexistence
filter/report stability
```

## 11.9 Not part of this gap

```text
Category Archive
global taxonomy engine
AI auto-categorization
```

---

# 12. FIN-GAP-008 — BUDGET AUTHORITY, ACTUALS & PERIOD HISTORY

```text
GAP ID:
FIN-GAP-008

PLAIN NAME:
Presupuestos

TYPE:
MIXED

CLASSIFICATION:
STRUCTURAL

PRIMARY OWNER:
Finance
```

## 12.1 Product Target

Budget:

```text
monthly
Financial Context scoped
Currency scoped
total or Category-specific
```

Effects:

```text
Expense
→ spent increases

Refund
→ spent decreases

Transfer
→ no effect

Balance Correction
→ no effect
```

Rules:

```text
never blocks Expense
no automatic carry-over
leftover != Savings
historical target preserved
future applicability can change/stop
NO generic Budget Archive
```

## 12.2 Target rows

```text
C-041
C-042
C-043
C-044
C-045
C-046
C-047
C-048
C-049
C-050 non-target boundary
```

Frontend:

```text
FE-009
FE-031
FE-032
FE-034
```

## 12.3 Current

No Finance Budget authority or read model.

Only generic:

```text
numeric/form vocabulary
progress-display precedent
```

## 12.4 Donor

Strong useful evidence:

```text
DC-ADAPT-007
monthly/category Budget plans

DC-ADAPT-009
Budget actual derivation

DC-ADAPT-010
aggregation

DC-ADAPT-011
Currency-safe behavior
```

`DC-ADAPT-008 Budget adjustments` is now:

```text
REFERENCE ONLY
```

## 12.5 Real Gap

Missing HomePlus Budget authority/lifecycle while donor already reduces calculation uncertainty.

The gap includes:

```text
Budget identity
scope/currency/period
historical target
future applicability
Budget Actual rules
no-blocking
no carry-over
```

## 12.6 Donor behavior to preserve

```text
month/category plan concepts
actual aggregation
sign normalization
history/idempotency ideas
```

## 12.7 Donor architecture to reject

```text
workspace/RLS
automatic FX requirement
generic donor Budget Adjustment subsystem as presumed design
generic Budget Archive
```

## 12.8 Dependencies

```text
FIN-GAP-001
FIN-GAP-003
FIN-GAP-006
FIN-GAP-007
```

`FIN-GAP-002` is not a strict prerequisite because Expense/Budget work without Accounts.

## 12.9 Downstream consumers

```text
FIN-GAP-010
FIN-GAP-011
FIN-GAP-012
```

## 12.10 Runtime validation later

```text
uncategorized Expense affects total
Refund reduces spent
Transfer excluded
Balance Correction excluded
Budget never blocks
no carry-over
historical target unchanged by future edit
```

---

# 13. FIN-GAP-009 — EXPECTED PAYMENT, RECURRENCE & SETTLEMENT LIFECYCLE

```text
GAP ID:
FIN-GAP-009

PLAIN NAME:
Pagos esperados y pagos reales

TYPE:
NEW FINANCE CAPABILITY

CLASSIFICATION:
STRUCTURAL

PRIMARY OWNER:
Finance
```

## 13.1 Product Target

Finance supports human-language `Pagos`.

Expected Payment:

```text
one-time or recurring
expected Amount may be UNKNOWN
does NOT itself create Expense
```

Occurrence lifecycle:

```text
PENDING
PAID
SKIPPED
CANCELLED

OVERDUE
→ derived
```

History:

```text
recurrence creates occurrence history
debt occurrences may accumulate
pause/end does not rewrite past
```

Settlement:

```text
Register Payment
→ actual Payment
→ actual Expense
→ occurrence PAID
```

If actual Payment financial truth is trashed:

```text
occurrence recalculates
→ PENDING
or
→ OVERDUE
```

## 13.2 Target rows

```text
C-051
C-052
C-053
C-054
C-055
C-056
C-057
C-058
C-059
C-060
C-061
C-062
C-063 financial-state portion
```

Frontend:

```text
FE-025
FE-026
FE-027
FE-028
FE-029
FE-030
```

## 13.3 Current

Useful precedents:

```text
Planner scheduling
Planner recurrence
occurrence identity
series edit semantics
temporal Attention derivation
mutation/audit/reliability
```

Absent:

```text
Finance expected Payment
Finance occurrence ledger
actual Payment
PAID/SKIPPED semantics
debt accumulation
settlement
```

## 13.4 Donor

No meaningful donor Payment/obligation capability.

```text
DONOR:
NONE / REJECT
```

## 13.5 Real Gap

New Finance lifecycle:

```text
Expected Payment
recurrence
occurrences
due/overdue derivation
actual settlement
Expense creation
PAID reconciliation
Trash recalculation
```

## 13.6 Current behavior to preserve

```text
generic scheduling ideas
occurrence identity precedents
audit/outbox
mutation safety
```

Planner semantics are not copied as Payment truth.

## 13.7 Dependencies

```text
FIN-GAP-001
FIN-GAP-003
FIN-GAP-005
```

Account is optional for actual Payment.

## 13.8 Downstream consumers

```text
FIN-GAP-011
```

Future cross-module consumers:

```text
Attention
Notifications
Home
Search
Planner — only if separately designed later
```

## 13.9 Runtime validation later

```text
expected Payment does not create Expense
unknown expected amount
occurrence identity
overdue derivation
debt accumulation
pause/end history
actual Payment required for PAID
Payment Trash recalculation
double submit
```

## 13.10 Explicit V1.1 boundary

Normal resolution:

```text
Due/Overdue
→ future Attention/Notifications composition
→ Payment Detail
→ Register Payment
```

NOT:

```text
automatic Planner Task
```

---

# 14. FIN-GAP-010 — FINANCIAL READ MODELS & MULTICURRENCY INTEGRITY

```text
GAP ID:
FIN-GAP-010

PLAIN NAME:
Análisis financiero y monedas

TYPE:
DONOR ADAPTATION

CLASSIFICATION:
STANDARD

PRIMARY OWNER:
Finance
```

## 14.1 Product Target

Finance must derive trustworthy read models for:

```text
Income
Expense
Net
Spending by Category
Period vs Previous Period
Budget vs Actual
Account balance presentation
```

Integrity:

```text
real Expense counted once
Transfer excluded from Income/Expense
Balance Correction excluded
Refund reduces Expense
Currencies not silently mixed
no required FX engine
```

`Reports` is a logical internal concept.

Frontend uses:

```text
Resumen
Análisis
scoped Movimientos
```

not a Reports tab.

## 14.2 Target rows

```text
C-067
C-068
C-069
C-070
C-071
C-072
C-073 boundary
```

Also consumes financial truths from:

```text
C-010
C-020
C-033
C-034
C-043
```

Frontend:

```text
FE-007
FE-008
FE-009
FE-010
FE-031
FE-032
FE-033
FE-037
```

## 14.3 Current

No Finance reporting/read model authority.

Reusable:

```text
Home projection pattern
shared cards/progress
Search/filter precedents
```

## 14.4 Donor

Strongest donor-covered area:

```text
DC-ADAPT-002
balance derivation

DC-ADAPT-009
Budget actual

DC-ADAPT-010
reports/aggregation

DC-ADAPT-011
native Currency/warnings
```

## 14.5 Real Gap

Not “build Reports from zero”.

Instead:

```text
adapt proven donor aggregation
under HomePlus:
- financial ownership
- privacy
- correction/refund semantics
- Currency integrity
- V1.1 frontend consumers
```

## 14.6 Donor behavior to preserve

```text
month/category aggregation
transaction filtering
balance arithmetic
native-Currency grouping
conversion-missing warnings
```

## 14.7 Donor architecture to reject

```text
donor Reports IA
web dashboard
FX worker as V1 dependency
workspace privacy model
```

## 14.8 Dependencies

```text
FIN-GAP-001
FIN-GAP-003
FIN-GAP-004
FIN-GAP-005
FIN-GAP-006
FIN-GAP-007
FIN-GAP-008
```

Payment status read models remain within FIN-GAP-009.

## 14.9 Runtime validation later

```text
double counting
source/context attribution
Refund
Transfer exclusion
Balance Correction exclusion
period comparison
Currency incompatibility
```

---

# 15. FIN-GAP-011 — DAILY FINANCE MOBILE EXPERIENCE

```text
GAP ID:
FIN-GAP-011

PLAIN NAME:
Experiencia diaria de Finanzas

TYPE:
CURRENT AUTHORITY INTEGRATION

CLASSIFICATION:
STANDARD

PRIMARY OWNER:
Finance frontend

HOST OWNER:
Global App Shell / shared mobile UI
```

## 15.1 Product Target

Entry:

```text
More
→ Finanzas
```

Finance root:

```text
Financial Context selector

[ Resumen | Movimientos | Pagos ]
```

Daily experience includes:

```text
Resumen
period navigation
Movimientos
Money Flow
Expense
Income
Transfer
MoneyInput
filters
Movement Detail
"Algo está mal"
Pagos
Expected Payment create
Payment Detail
Register Payment
daily empty/error/reliability states
```

## 15.2 Target rows

```text
FE-001
FE-002
FE-003
FE-004
FE-005 boundary
FE-006 boundary

FE-007
FE-008
FE-009
FE-010
FE-011
FE-012

FE-013
FE-014
FE-015
FE-016
FE-017
FE-018
FE-019
FE-020
FE-021
FE-022
FE-023
FE-024

FE-025
FE-026
FE-027
FE-028
FE-029
FE-030
```

Also frontend portions of:

```text
C-063
C-065 deferred integration boundary
```

## 15.3 Current

Confirmed reusable generic primitives:

```text
AppButton
AppInput
AppCard
AppScreen
AppText
ActionSheet
DatePickerSheet
TimePickerSheet
UndoToast
EmptyState
ErrorState
Skeleton
AppTopBar
InteractivePressable
```

Partial precedents:

```text
QuickActionSheet
HouseholdSwitcherSheet
decimal-pad input
Inventory filters
Planner filters
progress displays
modal/sheet pattern
Planner reliability UX
```

Explicitly absent:

```text
Finance screen/navigation/service
dedicated MoneyInput
Currency selector
Account selector
transaction-type segmented control
Payment status controls
Finance transaction history/trash UX
```

Not proven either way:

```text
generic exact segmented-tab primitive
generic month navigator
```

## 15.4 Donor

Donor frontend has no Product authority.

Only underlying behavior may inform:

```text
filter logic
validation
read-model shape
calculations
tests
```

## 15.5 Real Gap

Implement frozen daily Finance UX by composing:

```text
existing HomePlus UI
+
Finance canonical operations
+
Finance read models
```

without:

```text
FinanceAppShell
FinanceNavbar
FinanceDesignSystem
donor dashboard port
```

## 15.6 Dependencies

Primary:

```text
FIN-GAP-001
FIN-GAP-003
FIN-GAP-004
FIN-GAP-008
FIN-GAP-009
FIN-GAP-010
```

Account UI portions consume `FIN-GAP-002` only when Account is used.

Correction flow consumes:

```text
FIN-GAP-005
FIN-GAP-006
```

## 15.7 Existing-first implementation checks later

Before creating new generic UI primitives, verify Current for:

```text
three-mode segmented controls
month-period navigator
money formatting helpers
financial effect preview primitives
```

The old audit did not prove all of these either way.

## 15.8 Runtime/UX validation later

```text
Account optional
Category optional
Context visible
MoneyInput editing
Transfer impact preview
quick filters
deep filters
direct navigation
Payment urgency ordering
uncertain/double-submit UX
```

---

# 16. FIN-GAP-012 — FINANCE MANAGEMENT & ANALYSIS SURFACES

```text
GAP ID:
FIN-GAP-012

PLAIN NAME:
Gestión y análisis de Finanzas

TYPE:
CURRENT AUTHORITY INTEGRATION

CLASSIFICATION:
STANDARD

PRIMARY OWNER:
Finance frontend

HOST OWNER:
Global App Shell / shared mobile UI
```

## 16.1 Product Target

Finance overflow:

```text
Cuentas
Categorías
Papelera
```

Deep/management surfaces:

```text
Análisis
Manage Budget
Cuentas
Accounts Empty State
Create Account
Account Review
Account Detail
Archived Accounts inside Accounts
Categorías
Papelera
```

Rules:

```text
NO generic "Administrar finanzas"
NO global "Archivados"
NO Reports tab
NO Accounts tab
NO separate Budget tab/detail duplication
```

## 16.2 Target rows

```text
FE-031
FE-032
FE-033
FE-034

FE-035
FE-036
FE-037
FE-038
FE-039
FE-040
FE-041
FE-042
FE-043
FE-044
FE-045 boundary
```

## 16.3 Current

Reusable:

```text
ActionSheet
AppScreen
AppCard
AppInput
AppButton
EmptyState
UndoToast
list/filter patterns
progress displays
modal/sheet patterns
```

Not present:

```text
Finance management surfaces
Account UI
Category UI
Budget UI
Finance Trash
```

Not proven:

```text
canonical generic Review-before-Commit primitive
```

## 16.4 Donor

Underlying data/read logic may be used.

Donor UI/IA is rejected as product source.

## 16.5 Real Gap

Compose V1.1 lower-frequency/deep surfaces using Current shared UI and upstream Finance authorities.

Key UX-specific capability:

```text
Create Account
→ Edit
→ Review
→ Commit
```

without imposing the same confirmation friction on daily Expenses.

## 16.6 Dependencies

```text
FIN-GAP-002
FIN-GAP-005
FIN-GAP-007
FIN-GAP-008
FIN-GAP-010
FIN-GAP-011 routing foundation
```

## 16.7 Existing-first check later

Before adding a generic Review component:

```text
search Current for reusable review/confirmation pattern
```

Old audit did not prove it absent.

## 16.8 Runtime/UX validation later

```text
Accounts grouped safely by Currency
Unknown Balance display
Credit Card debt language
Account Archive/Unarchive
Category delete/history behavior
Budget history/applicability
Trash/Restore
Analysis drill-down to scoped Movimientos
```

---

# 17. MANDATORY CROSS-CUTTING OBLIGATIONS

These are NOT independent gaps.

Every relevant Real Gap must satisfy them.

## X-CUT-001 — Existing-first

Before implementing any gap:

```text
CURRENT
→ TARGET
→ REAL GAP
→ MINIMAL CHANGE
```

No capability already present may be duplicated.

---

## X-CUT-002 — Mutation safety

Financial mutations must compose with existing:

```text
mutation_id
idempotency_key
If-Match/version discipline
audit
outbox
reconciliation
```

No double submit may duplicate money.

No user should be told to blindly retry an uncertain financial operation if it can duplicate truth.

Applies especially to:

```text
FIN-GAP-002
FIN-GAP-003
FIN-GAP-004
FIN-GAP-005
FIN-GAP-006
FIN-GAP-007
FIN-GAP-008
FIN-GAP-009
```

---

## X-CUT-003 — Audit/history

Reuse current canonical audit/outbox foundations.

Do not create:

```text
FinanceAudit
FinanceOutbox
```

as parallel systems.

---

## X-CUT-004 — Reliability UX

Finance consumes the global/shared reliability authority.

Frontend must be able to represent as applicable:

```text
pending
offline
retrying
uncertain
conflicted
confirmed
```

No `FinanceReliability` subsystem.

---

## X-CUT-005 — Test discipline

Current shared test harness is reused.

Each gap must eventually prove:

```text
positive behavior
negative behavior
privacy
history
idempotency
edge cases
```

where semantically relevant.

No separate Real Gap exists merely called “tests”.

---

## X-CUT-006 — Currency integrity

Any gap touching Money must preserve:

```text
native Currency
no silent incompatible summation
no automatic FX invention
```

---

## X-CUT-007 — Privacy

Personal Finance remains private by default through all:

```text
mutation
read model
frontend
future projection
```

---

## X-CUT-008 — Progressive complexity

Core Finance must work without:

```text
Accounts
Budget
Payments
AI
cross-module integrations
```

where V1.1 explicitly permits optional configuration.

---

# 18. DEFERRED CROSS-MODULE REGISTER

These are valid future targets but NOT Finance Core Real Gaps in this map.

## DCM-001 — Finance ↔ Planner

Current seam:

```text
planner_tasks.origin_module allows finance
```

V1.1:

```text
NOT default Payment reminder path
```

Status:

```text
DEFER CROSS-MODULE
```

Future invariant:

```text
Planner owns Task
Finance owns Payment/Expense
Task completion never invents Payment
```

---

## DCM-002 — Finance ↔ Inventory

Future:

```text
Inventory purchase truth
↔ Finance Expense
```

Inventory keeps item/stock ownership.

Status:

```text
DEFER
```

---

## DCM-003 — Finance ↔ Assets

Future:

```text
Asset Service / Repair
↔ Finance Expense
```

Status:

```text
DEFER UNTIL BOTH CORES STABLE
```

---

## DCM-004 — Finance ↔ HomeCloud

Future relation:

```text
invoice
receipt
ticket
proof of payment
obligation document
```

HomeCloud owns file.

Finance owns relation only.

Status:

```text
DEFER
```

---

## DCM-005 — Finance → Attention

Finance can own:

```text
Due
Overdue
Budget Exceeded
```

Attention owns:

```text
final relevance
dedupe
global attention presentation
```

Final composition:

```text
DEFER TO SYSTEM/CROSS-MODULE PASS
```

The underlying Finance states remain owned by:

```text
FIN-GAP-008
FIN-GAP-009
```

---

## DCM-006 — Finance → Notifications

Notifications owns delivery.

Finance must not build notification transport.

Status:

```text
DEFER FINAL COMPOSITION
```

---

## DCM-007 — Finance → Home

Home owns Home.

Finance may later provide relevant projection data.

Status:

```text
DEFER FINAL COMPOSITION
```

---

## DCM-008 — Finance → Search

Search owns discovery.

Finance privacy cannot be widened.

Status:

```text
DEFER FINAL COMPOSITION
```

---

## DCM-009 — Finance ↔ Geni / Automations

Geni/Automations may consume canonical operations later.

They cannot own financial truth.

Status:

```text
DEFER
```

---

# 19. GLOBAL PASSES — NOT FINANCE CORE GAPS

## GLOBAL-001 — Permissions

Exact Finance role packages:

```text
DEFERRED TO GLOBAL PERMISSIONS PASS
```

Finance Core still must model correct owner/scope boundaries.

---

## GLOBAL-002 — Permanent Delete

Permanent deletion rules:

```text
DEFERRED TO GLOBAL DATA LIFECYCLE PASS
```

Finance Core needs Trash/Restore, not an invented permanent-delete policy.

---

## GLOBAL-003 — Cross-module composition

Generic connected resolution:

```text
ONE REAL-WORLD SITUATION
→ ONE USER RESOLUTION
→ MULTIPLE CANONICAL EFFECTS
```

is deferred.

Do not build a generic orchestration framework inside Finance.

---

# 20. NON-TARGET GUARDRAILS

No Real Gap authorizes:

```text
Bank Sync
Open Banking
Trading
Investments
Crypto
Taxes
Payroll
Invoicing
Credit score
Splitwise-like settlement
advanced Credit Card statement engine
automatic FX engine
FinanceNavbar
FinanceAppShell
FinanceDesignSystem
FinanceSearch
FinanceAttention
FinanceReliability
FinancePermissions
generic Finance Archived screen
automatic Planner Task per Payment
SQL agent
AI dependency for Finance correctness
```

---

# 21. CORE TARGET ROW → REAL GAP TRACEABILITY

| Matrix row | Real Gap / disposition |
|---|---|
| C-001 | FIN-GAP-001 |
| C-002 | FIN-GAP-001 |
| C-003 | FIN-GAP-001 |
| C-004 | FIN-GAP-001 |
| C-005 | FIN-GAP-001 |
| C-006 | FIN-GAP-002 |
| C-007 | FIN-GAP-002 |
| C-008 | FIN-GAP-002 |
| C-009 | FIN-GAP-002 |
| C-010 | FIN-GAP-002, FIN-GAP-010 |
| C-011 | FIN-GAP-002 |
| C-012 | FIN-GAP-002, FIN-GAP-005 |
| C-013 | FIN-GAP-002 |
| C-014 | FIN-GAP-002 |
| C-015 | FIN-GAP-003 |
| C-016 | FIN-GAP-003 |
| C-017 | FIN-GAP-003 |
| C-018 | FIN-GAP-004 |
| C-019 | FIN-GAP-004 |
| C-020 | FIN-GAP-004, FIN-GAP-010 |
| C-021 | FIN-GAP-004, FIN-GAP-010 |
| C-022 | FIN-GAP-004 |
| C-023 | FIN-GAP-001, FIN-GAP-003 |
| C-024 | FIN-GAP-001, FIN-GAP-003 |
| C-025 | FIN-GAP-004 |
| C-026 | FIN-GAP-004 |
| C-027 | FIN-GAP-005 |
| C-028 | FIN-GAP-005 |
| C-029 | FIN-GAP-005 |
| C-030 | GLOBAL-002 |
| C-031 | FIN-GAP-006 |
| C-032 | FIN-GAP-006 |
| C-033 | FIN-GAP-006, FIN-GAP-010 |
| C-034 | FIN-GAP-006, FIN-GAP-008 |
| C-035 | FIN-GAP-006 |
| C-036 | FIN-GAP-007 |
| C-037 | FIN-GAP-007 |
| C-038 | FIN-GAP-007 |
| C-039 | FIN-GAP-007 |
| C-040 | NON-TARGET — no Category Archive |
| C-041 | FIN-GAP-008 |
| C-042 | FIN-GAP-008 |
| C-043 | FIN-GAP-008 |
| C-044 | FIN-GAP-008 |
| C-045 | FIN-GAP-008 |
| C-046 | FIN-GAP-008 |
| C-047 | FIN-GAP-002, FIN-GAP-004 |
| C-048 | FIN-GAP-008 |
| C-049 | FIN-GAP-008 |
| C-050 | NON-TARGET — no generic Budget Archive |
| C-051 | FIN-GAP-009 |
| C-052 | FIN-GAP-009 |
| C-053 | FIN-GAP-009 |
| C-054 | FIN-GAP-009 |
| C-055 | FIN-GAP-009 |
| C-056 | FIN-GAP-009 |
| C-057 | FIN-GAP-009 |
| C-058 | FIN-GAP-009 |
| C-059 | FIN-GAP-009 |
| C-060 | FIN-GAP-009, FIN-GAP-003 |
| C-061 | FIN-GAP-009 |
| C-062 | FIN-GAP-009, FIN-GAP-005 |
| C-063 | FIN-GAP-009 + DCM-005 |
| C-064 | DCM-006 |
| C-065 | DCM-005 / DCM-006 |
| C-066 | DCM-001 boundary |
| C-067 | FIN-GAP-010 |
| C-068 | FIN-GAP-010 |
| C-069 | FIN-GAP-010 |
| C-070 | FIN-GAP-008, FIN-GAP-010 |
| C-071 | FIN-GAP-003, FIN-GAP-004, FIN-GAP-006, FIN-GAP-010 |
| C-072 | FIN-GAP-010 |
| C-073 | NON-TARGET — no required FX engine |
| C-074 | FIN-GAP-002, FIN-GAP-003 |
| C-075 | FIN-GAP-002, FIN-GAP-004 |
| C-076 | NON-TARGET — advanced Credit Card tracking Future |

```text
CORE TRACEABILITY:
76 / 76
```

---

# 22. FRONTEND TARGET ROW → REAL GAP TRACEABILITY

| Matrix row | Real Gap / disposition |
|---|---|
| FE-001 | FIN-GAP-011 |
| FE-002 | FIN-GAP-011 boundary |
| FE-003 | FIN-GAP-001, FIN-GAP-011 |
| FE-004 | FIN-GAP-011 |
| FE-005 | NON-TARGET — no Reports tab |
| FE-006 | NON-TARGET — no Accounts tab |
| FE-007 | FIN-GAP-011 |
| FE-008 | FIN-GAP-010, FIN-GAP-011 |
| FE-009 | FIN-GAP-008, FIN-GAP-011 |
| FE-010 | FIN-GAP-010, FIN-GAP-011 |
| FE-011 | FIN-GAP-009 + DCM-005 + FIN-GAP-011 |
| FE-012 | FIN-GAP-011, FIN-GAP-012 |
| FE-013 | FIN-GAP-003, FIN-GAP-011 |
| FE-014 | FIN-GAP-011 |
| FE-015 | FIN-GAP-003, FIN-GAP-004, FIN-GAP-011 |
| FE-016 | FIN-GAP-003, FIN-GAP-007, FIN-GAP-011 |
| FE-017 | FIN-GAP-003, FIN-GAP-011 |
| FE-018 | FIN-GAP-004, FIN-GAP-011 |
| FE-019 | FIN-GAP-002, FIN-GAP-004, FIN-GAP-011 |
| FE-020 | FIN-GAP-011 + X-CUT-006 |
| FE-021 | FIN-GAP-003, FIN-GAP-011 |
| FE-022 | FIN-GAP-002, FIN-GAP-007, FIN-GAP-010, FIN-GAP-011 |
| FE-023 | FIN-GAP-003, FIN-GAP-005, FIN-GAP-011 |
| FE-024 | FIN-GAP-005, FIN-GAP-006, FIN-GAP-011 |
| FE-025 | FIN-GAP-009, FIN-GAP-011 |
| FE-026 | FIN-GAP-009, FIN-GAP-011 |
| FE-027 | FIN-GAP-009, FIN-GAP-011 |
| FE-028 | FIN-GAP-009, FIN-GAP-011 |
| FE-029 | FIN-GAP-003, FIN-GAP-009, FIN-GAP-011 |
| FE-030 | FIN-GAP-009, FIN-GAP-011 |
| FE-031 | FIN-GAP-008, FIN-GAP-010, FIN-GAP-012 |
| FE-032 | FIN-GAP-008, FIN-GAP-010, FIN-GAP-012 |
| FE-033 | FIN-GAP-007, FIN-GAP-010, FIN-GAP-012 |
| FE-034 | FIN-GAP-008, FIN-GAP-012 |
| FE-035 | FIN-GAP-012 |
| FE-036 | FIN-GAP-002, FIN-GAP-012 |
| FE-037 | FIN-GAP-002, FIN-GAP-010, FIN-GAP-012 |
| FE-038 | FIN-GAP-002, FIN-GAP-012 |
| FE-039 | FIN-GAP-002, FIN-GAP-012 |
| FE-040 | FIN-GAP-002, FIN-GAP-012 |
| FE-041 | FIN-GAP-002, FIN-GAP-010, FIN-GAP-012 |
| FE-042 | FIN-GAP-002, FIN-GAP-012 |
| FE-043 | FIN-GAP-007, FIN-GAP-012 |
| FE-044 | FIN-GAP-005, FIN-GAP-012 |
| FE-045 | NON-TARGET — no global Archivados |
| FE-046 | X-CUT-004 |
| FE-047 | X-CUT-002 |
| FE-048 | X-CUT-004 / shared UI |
| FE-049 | X-CUT-005 |

```text
FRONTEND TRACEABILITY:
49 / 49
```

---

# 23. DONOR CANDIDATE → REAL GAP TRACEABILITY

| Donor candidate | V1.1 disposition | Real Gap usage |
|---|---|---|
| DC-ADAPT-001 Ledger movement representation | KEEP | FIN-GAP-003, FIN-GAP-004, FIN-GAP-010 |
| DC-ADAPT-002 Derived account balances | KEEP | FIN-GAP-002, FIN-GAP-010 |
| DC-ADAPT-003 Account metadata sidecar | NARROW | FIN-GAP-002 |
| DC-ADAPT-004 Transaction kind validation/filtering | KEEP | FIN-GAP-003, FIN-GAP-010, FIN-GAP-011 |
| DC-ADAPT-005 Grouped Transfer representation | KEEP | FIN-GAP-004, FIN-GAP-010, FIN-GAP-011 |
| DC-ADAPT-006 Nullable transaction Category | NARROW | FIN-GAP-007, FIN-GAP-011 |
| DC-ADAPT-007 Monthly base/category Budget plan | KEEP + REBOUND | FIN-GAP-008, FIN-GAP-010, FIN-GAP-012 |
| DC-ADAPT-008 Budget adjustments | REFERENCE ONLY | FIN-GAP-008 |
| DC-ADAPT-009 Budget actual derivation | KEEP | FIN-GAP-008, FIN-GAP-010, FIN-GAP-011, FIN-GAP-012 |
| DC-ADAPT-010 Reports and aggregation | KEEP + REBOUND | FIN-GAP-010, FIN-GAP-011, FIN-GAP-012 |
| DC-ADAPT-011 Native Currency with warnings | KEEP | FIN-GAP-002, FIN-GAP-004, FIN-GAP-008, FIN-GAP-010 |
| DC-ADAPT-012 Account status/suggestions | REFERENCE ONLY | FIN-GAP-002, FIN-GAP-012 |
| DC-ADAPT-013 Business/personal transfer analogue | REFERENCE ONLY | FIN-GAP-001, FIN-GAP-003, FIN-GAP-010 |

```text
DONOR TRACEABILITY:
13 / 13
```

---

# 24. CURRENT AUTHORITY PRESERVATION MAP

| Current authority | Preserve as | Used by |
|---|---|---|
| Auth | canonical identity authority | FIN-GAP-001 |
| Person ownership | canonical user/person foundation | FIN-GAP-001 |
| Household | canonical Household authority | FIN-GAP-001 |
| Membership | canonical Household membership | FIN-GAP-001 |
| RLS helpers | shared privacy foundation | FIN-GAP-001 and all scoped Finance gaps |
| Audit events | canonical shared audit | FIN-GAP-002..009 |
| Outbox | canonical event/outbox foundation | mutation gaps |
| Mutation contracts | canonical request mutation discipline | FIN-GAP-002..009 |
| Idempotency foundations | shared mutation safety | FIN-GAP-002..009 |
| Frontend server state | shared pending/reconcile/rollback | FIN-GAP-011/012 |
| App Shell | canonical shell/navigation host | FIN-GAP-011/012 |
| Shared UI components | canonical UI foundation | FIN-GAP-011/012 |
| Home | canonical Home owner | DCM-007 |
| Attention | canonical Attention owner | DCM-005 |
| Notifications | canonical delivery owner | DCM-006 |
| Search | canonical Search owner | DCM-008 |
| Planner | canonical Task/Event owner | DCM-001 |
| Inventory | canonical Inventory owner | DCM-002 |
| Test harness | shared validation foundation | X-CUT-005 |

No Real Gap recreates these authorities.

---

# 25. GAP DEPENDENCY GRAPH

Dependency rule:

```text
A → B
means:
A must provide canonical capability
before B can be considered complete.
```

It does NOT mean all implementation work must be sequential.

## 25.1 Direct prerequisite edges

```text
FIN-GAP-001 → FIN-GAP-002
FIN-GAP-001 → FIN-GAP-003
FIN-GAP-001 → FIN-GAP-004
FIN-GAP-001 → FIN-GAP-007
FIN-GAP-001 → FIN-GAP-008
FIN-GAP-001 → FIN-GAP-009
FIN-GAP-001 → FIN-GAP-010
FIN-GAP-001 → FIN-GAP-011
FIN-GAP-001 → FIN-GAP-012

FIN-GAP-002 → FIN-GAP-004
FIN-GAP-002 → FIN-GAP-012

FIN-GAP-003 → FIN-GAP-004
FIN-GAP-003 → FIN-GAP-005
FIN-GAP-003 → FIN-GAP-006
FIN-GAP-003 → FIN-GAP-008
FIN-GAP-003 → FIN-GAP-009
FIN-GAP-003 → FIN-GAP-010
FIN-GAP-003 → FIN-GAP-011

FIN-GAP-004 → FIN-GAP-005
FIN-GAP-004 → FIN-GAP-010
FIN-GAP-004 → FIN-GAP-011

FIN-GAP-005 → FIN-GAP-006
FIN-GAP-005 → FIN-GAP-009
FIN-GAP-005 → FIN-GAP-012

FIN-GAP-006 → FIN-GAP-008
FIN-GAP-006 → FIN-GAP-010
FIN-GAP-006 → FIN-GAP-011

FIN-GAP-007 → FIN-GAP-008
FIN-GAP-007 → FIN-GAP-010
FIN-GAP-007 → FIN-GAP-011
FIN-GAP-007 → FIN-GAP-012

FIN-GAP-008 → FIN-GAP-010
FIN-GAP-008 → FIN-GAP-011
FIN-GAP-008 → FIN-GAP-012

FIN-GAP-009 → FIN-GAP-011

FIN-GAP-010 → FIN-GAP-011
FIN-GAP-010 → FIN-GAP-012

FIN-GAP-011 → FIN-GAP-012
```

## 25.2 Important non-dependencies

```text
FIN-GAP-003
DOES NOT REQUIRE FIN-GAP-002
```

because Income/Expense may exist without Account.

```text
FIN-GAP-008
DOES NOT REQUIRE FIN-GAP-002
```

because Budget works without Accounts.

```text
FIN-GAP-009
DOES NOT REQUIRE FIN-GAP-002
```

because actual Payment Account is optional.

```text
FINANCE CORE
DOES NOT REQUIRE DCM-001 Planner
```

This is a critical V1.1 correction.

---

# 26. GAP EXECUTION PRIORITY LOGIC — NOT YET A PLAN

This is not the Minimal Integration Plan.

It only identifies architectural precedence.

## Foundation-first candidates

```text
FIN-GAP-001
Financial Context & Privacy

FIN-GAP-003
Transaction Authority
```

## Finance truth built on top

```text
FIN-GAP-002
Accounts

FIN-GAP-004
Transfer

FIN-GAP-005
History/Trash

FIN-GAP-007
Categories
```

## Derived/lifecycle capabilities

```text
FIN-GAP-006
Refund

FIN-GAP-008
Budget

FIN-GAP-009
Payments

FIN-GAP-010
Read Models
```

## User-facing surfaces

```text
FIN-GAP-011
Daily Finance Experience

FIN-GAP-012
Management & Analysis
```

Exact implementation waves/order remain for the next gate.

---

# 27. GAP FREEZE BOUNDARY

Each Real Gap must eventually receive its own capability freeze/check before implementation if required by Control.

For STRUCTURAL gaps, at minimum:

```text
MISSION
TARGET
CURRENT
DONOR ALLOWED
DONOR PROHIBITED
REAL GAP
OWNER
LIFECYCLE
INVARIANTS
DEPENDENCIES
OUT OF SCOPE
ACCEPTANCE
```

For frontend STANDARD gaps:

```text
FROZEN PRODUCT SURFACES
CURRENT UI PRIMITIVES
REAL UI GAP
REUSE BOUNDARY
DATA DEPENDENCIES
ERROR/EMPTY/RELIABILITY STATES
ACCEPTANCE
```

No freeze may silently reintroduce V1.0 behavior rejected by V1.1.

---

# 28. OLD V1.0 GAP MAP REBASE RESULT

Old V1.0 map had 15 gaps.

V1.1 does NOT preserve that identity blindly.

## Preserved/reframed families

```text
old FIN-GAP-001
→ new FIN-GAP-001

old FIN-GAP-002
→ new FIN-GAP-002

old FIN-GAP-003
→ new FIN-GAP-003

old FIN-GAP-004
→ new FIN-GAP-004

old FIN-GAP-005
→ new FIN-GAP-005

old FIN-GAP-006
→ new FIN-GAP-006

old FIN-GAP-007
→ new FIN-GAP-007
but target rewritten

old FIN-GAP-008
→ new FIN-GAP-008
but lifecycle rewritten

old FIN-GAP-009
→ new FIN-GAP-009
with settlement unified
```

## Removed from Finance Core

```text
old FIN-GAP-010
Planner Composition and Payment Reconciliation

→ DCM-001
DEFERRED CROSS-MODULE
```

## Reframed

```text
old FIN-GAP-011
Reports / Multicurrency

→ new FIN-GAP-010
```

## Cross-module/system integration moved out of Core

```text
old FIN-GAP-012
Home / Attention / Notifications / Search

→ DCM-005..008
```

## Connected relations moved out of Core

```text
old FIN-GAP-013
Inventory / Assets / HomeCloud

→ DCM-002..004
```

## Geni/Automations boundary moved out of Core

```text
old FIN-GAP-014
Geni / Automations

→ DCM-009
```

## Frontend old single specification gap replaced

```text
old FIN-GAP-015
Mobile Finance Surface and Interaction Specification

V1.1:
specification is closed.

Replaced by:

FIN-GAP-011
Daily Finance Mobile Experience

FIN-GAP-012
Finance Management & Analysis Surfaces
```

---

# 29. REAL GAP COUNT INTERPRETATION

```text
OLD V1.0 REAL GAPS:
15

NEW V1.1 FINANCE CORE REAL GAPS:
12
```

This does NOT mean V1.1 has less product.

The reduction comes from better ownership boundaries:

```text
Planner
Attention
Notifications
Home
Search
Inventory
Assets
HomeCloud
Geni
Automations
```

are no longer counted as Finance Core implementation gaps.

At the same time:

```text
frontend Product Truth
Category lifecycle
Budget lifecycle
Credit Card presentation
Payment resolution
```

are now more precisely defined inside the remaining gaps.

---

# 30. IMPLEMENTATION AUTHORIZATION STATUS

```text
FINANCE PRODUCT FREEZE V1.1
✅ COMPLETE

DONOR REBASE V1.1
✅ COMPLETE

CURRENT REBASE V1.1
✅ COMPLETE

CURRENT + DONOR vs TARGET V1.1
✅ COMPLETE

REAL GAP MAP V1.1
✅ COMPLETE

MINIMAL INTEGRATION PLAN V1.1
⏭ NEXT

IMPLEMENTATION
⛔ NOT AUTHORIZED BY THIS DOCUMENT
```

---

# 31. NEXT GATE INPUT

The next document must be:

```text
FINANCE_MINIMAL_INTEGRATION_PLAN_V1_1.md
```

It should consume only:

```text
12 Real Gaps
Current authority preservation map
Donor candidate map
Dependency graph
Cross-cutting obligations
Deferred cross-module register
V1.1 Product Freeze
```

It must determine:

```text
what existing capability is reused
what donor behavior is adapted
what genuinely new Finance authority is added
minimal implementation units
safe dependency order
validation gates
```

without adding product scope.

---

# 32. FINAL VERDICT

```text
FINANCE_REAL_GAP_MAP_V1_1_COMPLETE

TARGET ROW TRACEABILITY:
CORE       76 / 76
FRONTEND   49 / 49
TOTAL     125 / 125

DONOR TRACEABILITY:
13 / 13

FINANCE CORE REAL GAPS:
12

STRUCTURAL:
9

STANDARD:
3

FAST:
0

CURRENT AUTHORITIES RECREATED:
0

PLANNER CORE DEPENDENCY:
0

ATTENTION/NOTIFICATIONS/HOME/SEARCH
REBUILT INSIDE FINANCE:
0

GENERIC CROSS-MODULE ORCHESTRATOR:
0

V1.0 CATEGORY ARCHIVE RETAINED:
NO

V1.0 GENERIC BUDGET ARCHIVE RETAINED:
NO

OLD FRONTEND-SPECIFICATION GAP RETAINED:
NO

IMPLEMENTATION AUTHORIZED:
NO

NEXT:
FINANCE_MINIMAL_INTEGRATION_PLAN_V1_1
```

# END OF DOCUMENT
