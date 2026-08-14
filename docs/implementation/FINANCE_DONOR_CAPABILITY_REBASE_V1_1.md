# HOMePLUS — FINANCE DONOR CAPABILITY REBASE V1.1

**Documento:** `FINANCE_DONOR_CAPABILITY_REBASE_V1_1.md`  
**Módulo:** Finance  
**Fecha:** 2026-08-12  
**Estado:** `FINANCE_DONOR_CAPABILITY_REBASE_V1_1_COMPLETE`  
**Modo:** `DONOR-AWARE / TARGET-REBASE / NO IMPLEMENTATION`

---

# 00. PURPOSE

Este documento recalcula la utilidad de la evidencia donor de Finance después de que:

```text
HOMePLUS_FINANCE_PRODUCT_FREEZE_V1.0
```

fuera reemplazado por:

```text
HOMePLUS_FINANCE_PRODUCT_FREEZE_V1.1
```

V1.1 es ahora la autoridad de Product Truth de Finance.

Este documento NO:

- implementa Finance;
- autoriza migrations;
- define tablas finales;
- define RPCs;
- define services;
- modifica repositorios donor;
- reemplaza el Current Capability Audit;
- declara Real Gaps sin volver a contrastar contra CURRENT;
- autoriza composición cross-module diferida.

Su única pregunta es:

```text
DADA LA EVIDENCIA DONOR YA AUDITADA,
¿QUÉ SIGUE SIENDO ÚTIL PARA TARGET V1.1,
QUÉ CAMBIÓ,
QUÉ DEBE DESCARTARSE
Y QUÉ DEBE VOLVER A PROBARSE CONTRA CURRENT?
```

---

# 01. AUTHORITIES

## 01.1 Product authority

```text
HOMePLUS_FINANCE_PRODUCT_FREEZE_V1.1
Status:
MODULE_PRODUCT_AND_FRONTEND_DEFINITION_CLOSED
```

V1.1 congela:

```text
PRODUCT TRUTH
FUNCTIONAL BEHAVIOR
EXPERIENCE MODEL
INFORMATION ARCHITECTURE
FRONTEND SURFACE MODEL
```

y deja diferidos:

```text
PERMISSION ROLE PACKAGES
→ Global Permissions Pass

CROSS-MODULE COMPOSITION
→ Cross-Module Integration Pass
```

## 01.2 Historical target

```text
HOMePLUS_FINANCE_PRODUCT_FREEZE_V1.0
```

Se conserva únicamente para explicar el delta.

No puede gobernar implementación nueva donde contradiga V1.1.

## 01.3 Accepted donor evidence

```text
FINANCE_DONOR_CAPABILITY_AUDIT.md
```

Snapshot aceptado:

```text
PRIMARY DONOR
kirill-markin/expense-budget-tracker
commit:
93d6ed1f8174a8f39551642391484dd87b4a045b
license:
MIT

MATURE REFERENCE
actualbudget/actual
commit:
d67ca574673fef386115fa5ebe26b62f0d6216e3
role:
REFERENCE ONLY

EDGE REFERENCE
firefly-iii/firefly-iii
role:
NOT CONSULTED / NO CODE COPY
```

La auditoría original inspeccionó:

```text
PRIMARY DONOR CAPABILITIES AUDITED: 30

REUSE DIRECTLY / PORT: 0
ADAPT:                 13
REFERENCE ONLY:         5
REJECT:                10
NOT NEEDED:             2
```

Regla preservada:

```text
PORT BEHAVIOR,
NOT ACCIDENTAL ARCHITECTURE.
```

No existe ningún permiso general para copiar subsistemas donor completos.

## 01.4 Historical decision artifacts

```text
FINANCE_CURRENT_DONOR_VS_TARGET_MATRIX
FINANCE_REAL_GAP_MAP
FINANCE_MINIMAL_INTEGRATION_PLAN
HOMePLUS_FINANCE_IMPLEMENTATION_HANDOFF
```

Todos fueron calculados contra V1.0.

Por lo tanto:

```text
HISTORICAL EVIDENCE:
KEEP

EXECUTION AUTHORITY FOR V1.1:
NO
```

---

# 02. REBASE CLASSIFICATION

Las nuevas disposiciones son:

```text
KEEP
→ La capacidad donor sigue sirviendo con prácticamente
  el mismo límite de extracción.

KEEP + REBOUND
→ La lógica sigue sirviendo,
  pero cambió la frontera HomePlus que la rodea.

NARROW
→ Sólo queda autorizada una parte menor de la evidencia anterior.

REFERENCE ONLY
→ Sirve para invariantes, tests, edge cases o ideas.
  No justifica portar su implementación como authority.

DROP FROM FINANCE CORE
→ V1.0 la necesitaba dentro del Core,
  pero V1.1 la elimina o la difiere.

DEFER CROSS-MODULE
→ La relación existe conceptualmente,
  pero no debe implementarse como parte de Finance Core.

DONOR NOT NEEDED
→ HOMePLUS ya posee la authority correspondiente
  o el donor no aporta valor canónico.

REJECT
→ La semántica donor contradice V1.1
  o introduce arquitectura paralela.
```

`NEW V1.1 GAP` no se usa como Real Gap.

Primero debe existir:

```text
V1.1 TARGET
→ CURRENT RECHECK
→ PROVEN REAL GAP
```

---

# 03. EXECUTIVE VERDICT

La conclusión general es:

```text
DONOR DISCOVERY FROM ZERO:
NOT REQUIRED

ACCEPTED DONOR EVIDENCE:
STILL USEFUL

OLD TARGET-FIT DECISIONS:
REBASING REQUIRED

OLD REAL GAP MAP:
NOT EXECUTION-SAFE FOR V1.1

OLD MINIMAL INTEGRATION PLAN:
NOT EXECUTION-SAFE FOR V1.1
```

La mayor parte de la lógica donor útil continúa concentrada en:

```text
ledger semantics
transaction classification
balance derivation
negative balances
transfer grouping
monthly/category budget read models
budget actual derivation
report aggregation
native-currency safety
```

Las áreas con cambio material de Target son:

```text
Planner payment composition
Category lifecycle
native Categories
Budget lifecycle
Credit Card formalization
frontend Product Truth
Analysis/Budget surface merge
generic Archived surface removal
Account create Review
Payment resolution path
```

---

# 04. 30/30 DONOR CAPABILITY REBASE

## CAP-01 — Personal vs Household Financial Context

**Old donor classification:** `REJECT`

**V1.1 target delta:** strengthened, not weakened.

V1.1 freezes:

```text
PERSONAL
→ belongs to User
→ owner-only by default

HOUSEHOLD
→ belongs to active Household
→ authorized Household members

Financial Context selector
≠ global App Shell Household switch
```

**V1.1 donor disposition:** `REJECT`

**May extract:**

```text
nothing as context authority
```

A weak business/personal reporting analogue may remain reference-only elsewhere.

**Must not extract:**

```text
donor workspace
business/personal labels as privacy
donor RLS
workspace membership
```

**Residual V1.1 target requiring CURRENT recheck:**

```text
Personal/Household scope authority
selector behavior
scope inheritance
cross-scope disclosure
owner-only Personal privacy
```

**Cross-module:** `NO — Finance/Household/Auth composition only`

---

## CAP-02 — Accounts

**Old donor classification:** `ADAPT`

Donor behavior:

```text
accounts derived from ledger activity
```

V1.1 instead requires persistent Accounts that may exist before movements.

**V1.1 target delta:**

```text
Account remains persistent authority
+
explicit ACCOUNT / CREDIT_CARD type
+
Account create Review
+
Account archive/unarchive
```

**V1.1 donor disposition:** `KEEP + REBOUND`

**May extract:**

```text
account-related read-model ideas
balance/list aggregation patterns
non-authoritative presentation concepts
```

**Must not extract:**

```text
derived account existence
account view as source of truth
MODE-derived currency
donor account lifecycle
web account UX
```

**Residual V1.1 target requiring CURRENT recheck:**

```text
canonical Account authority
Account creation before movement
Account type
Credit Card presentation
unknown balance
anchor
archive/unarchive
review-before-create UX
```

**Cross-module:** `NO`

---

## CAP-03 — Account Metadata

**Old donor classification:** `ADAPT`

Donor uses optional metadata sidecar.

V1.1 now freezes:

```text
Type
Name
Currency
Scope
```

as Account product properties.

**V1.1 donor disposition:** `NARROW`

**May extract:**

```text
idea that presentation/report metadata
does not have to redefine financial movement truth
```

**Must not extract:**

```text
business/personal classification
investment grouping
workspace metadata semantics
schema shape as canonical target
```

Because V1.1 already defines its own Account type/presentation.

**Residual target:**

```text
technical placement of ACCOUNT/CREDIT_CARD
and other non-authoritative metadata
```

is an implementation decision, not donor Product Truth.

---

## CAP-04 — Unknown Balance / Balance Anchor

**Old donor classification:** `REJECT`

Donor lacks both.

V1.1 preserves:

```text
UNKNOWN ≠ 0

Balance Anchor
+ effects after anchor
= Current Known Balance
```

**V1.1 donor disposition:** `REJECT`

**May extract:** none.

**Must not extract:**

```text
missing opening value = zero
account only exists after movement
```

**Residual target:** fully HomePlus-specific unless CURRENT already contains reusable primitives.

---

## CAP-05 — Balance Derivation

**Old donor classification:** `ADAPT`

**V1.1 target delta:** none material.

**V1.1 donor disposition:** `KEEP`

**May extract:**

```text
ledger-sum arithmetic
derived balance query ideas
negative/positive balance handling
tests around derived totals
```

**Must not extract:**

```text
derived account existence
MODE currency
FX requirement
donor RLS/workspace
```

**Residual target:**

```text
Anchor-aware derivation
Unknown-aware derivation
Balance Correction effects
Account archive semantics
```

---

## CAP-06 — Negative Balances

**Old donor classification:** `ADAPT`

V1.1 explicitly keeps negative balance valid and formalizes Credit Card as an Account type/presentation.

**V1.1 donor disposition:** `KEEP + REBOUND`

**May extract:**

```text
negative-balance arithmetic
tests proving negative balances remain valid
```

**Must not extract:**

```text
donor account status as Credit Card subsystem
investment/business metadata
```

**New boundary:**

```text
negative balance
may support simple internal credit semantics

but

CREDIT_CARD
is a HomePlus Account type/presentation
```

---

## CAP-07 — Account Archival / Deletion

**Old donor classification:** `REJECT`

Donor has no persistent Account lifecycle.

V1.1 strengthens the need:

```text
Account is the principal Finance entity
with ACTIVE ↔ ARCHIVED
```

and removes generic Archive from other Finance entities.

**V1.1 donor disposition:** `REJECT`

**May extract:** none as lifecycle authority.

**Residual target:**

```text
archive/unarchive
hide from normal new-movement selection
preserve balances/history/relations
reactivation
```

must come from HomePlus Current or be implemented as proven gap.

---

## CAP-08 — Income / Expense / Transfer Classes

**Old donor classification:** `ADAPT`

**V1.1 target delta:** none material.

Canonical Finance primitives remain:

```text
INCOME
EXPENSE
TRANSFER
```

**V1.1 donor disposition:** `KEEP`

**May extract:**

```text
kind validation pattern
filtering pattern
report grouping semantics
```

**Must not extract:**

```text
account_id required for every operation
donor naming as frontend language
direct edit/delete lifecycle
```

---

## CAP-09 — Expense Without Account

**Old donor classification:** `REJECT`

Donor requires `account_id`.

V1.1 preserves:

```text
Expense
Account: none
→ Reports/Budget YES
→ Account Balance no effect
```

**V1.1 donor disposition:** `REJECT`

**Residual target:** HomePlus-specific.

This is especially important for:

```text
Quick Expense
```

and must not be compromised to fit donor schema.

---

## CAP-10 — Ledger Event Grouping

**Old donor classification:** `ADAPT`

Donor can group related ledger effects through `event_id`.

**V1.1 target delta:** none material.

**V1.1 donor disposition:** `KEEP`

**May extract:**

```text
correlation/grouping idea
multi-effect provenance
read-model grouping tests
```

**Must not extract:**

```text
SQL-agent as mutation authority
one-row create API as canonical multi-effect operation
missing transaction atomicity
```

Useful for:

```text
Transfer
Payment → Expense relation
cross-effect history
```

without dictating final schema.

---

## CAP-11 — Transfer Representation

**Old donor classification:** `ADAPT`

Donor evidence:

```text
paired rows
same event_id
source negative
destination positive
```

**V1.1 target delta:** none material.

**V1.1 donor disposition:** `KEEP`

**May extract:**

```text
paired financial-effect semantics
double-count prevention
transfer-exclusion reporting ideas
```

**Must not extract:**

```text
missing atomic validation
SQL-agent protocol
donor workspace
```

HomePlus still requires one canonical logical Transfer.

---

## CAP-12 — Transfer Source != Destination Validation

**Old donor classification:** `REFERENCE ONLY`

Primary donor did not prove the invariant.

Actual Budget was used as mature reference.

**V1.1 target delta:** none.

**V1.1 donor disposition:** `REFERENCE ONLY`

**May use:**

```text
Actual transfer invariant/test ideas:
different accounts
coherent pair
no already-linked invalid pair
```

**May not:**

```text
transplant Actual architecture wholesale
```

---

## CAP-13 — Cross-Currency Transfer

**Old donor classification:** `REFERENCE ONLY`

V1.1 still supports:

```text
Source Amount
Destination Amount
```

without requiring an FX engine.

**V1.1 donor disposition:** `REFERENCE ONLY`

**May use:**

```text
native amount per side
currency-preserving storage ideas
```

**Must not extract:**

```text
FX worker
market-rate dependency
automatic conversion
```

---

## CAP-14 — Categories

**Old donor classification:** `ADAPT`

Old useful donor behavior:

```text
Category optional
free-form value
historical ledger stores category text
```

V1.1 changes the target materially:

```text
native useful baseline REQUIRED
+
custom CREATE / EDIT / DELETE
+
Category optional in quick entry
```

**V1.1 donor disposition:** `NARROW`

**May extract:**

```text
nullable category behavior
query/filter/category reporting ideas
historical value preservation as reference
```

**Must not extract:**

```text
history-derived category list as canonical catalog
free-form text as full category authority
lack of category ownership/lifecycle
```

**Residual V1.1 target requiring CURRENT recheck:**

```text
native Categories
custom Category authority
create/edit/delete
selector behavior
historical meaning after delete
```

---

## CAP-15 — Category Archive / Delete / History

**Old donor classification:** `REJECT`

Old Target expected archive semantics.

V1.1 changes the product lifecycle to:

```text
Native baseline
+
Custom CREATE / EDIT / DELETE

NO visible Archive Category
```

while requiring:

```text
deleted Category
→ unavailable for future selection
→ historical Transactions keep meaning
```

**V1.1 donor disposition:** `REFERENCE ONLY`

This is a genuine target-fit change.

**Why it changes:**

The donor still does not provide canonical delete authority, but its transaction-stored category text demonstrates one possible historical-preservation property.

**May use:**

```text
historical label/value preservation idea
test idea:
deleting current category authority
must not erase historical classification
```

**Must not extract:**

```text
free-form category storage as final schema
history-derived catalog as canonical authority
```

**Residual target:** category identity/history strategy remains HomePlus-owned.

---

## CAP-16 — Monthly / Category Budgets

**Old donor classification:** `ADAPT`

V1.1 preserves:

```text
monthly total Budget
category Budget
currency-specific Budget
period-scoped truth
```

but changes lifecycle semantics.

**V1.1 donor disposition:** `KEEP + REBOUND`

**May extract:**

```text
month/category planning read models
period/category aggregation patterns
latest-plan/history concepts as reference
```

**Must not extract:**

```text
workspace/reporting architecture
generic Budget Archive
donor final table shape
FX requirement
```

**New boundary:**

HomePlus must preserve historical period target while independently controlling future applicability.

---

## CAP-17 — Budget Adjustments

**Old donor classification:** `ADAPT`

Donor contains a relatively rich additive adjustment subsystem with idempotency/conflict behavior.

V1.1 now freezes product behavior more narrowly:

```text
edit this period
edit this period + future
stop applying forward
never silently rewrite past target
```

No product requirement says that these must be represented by a generalized additive adjustment subsystem.

**V1.1 donor disposition:** `REFERENCE ONLY`

**May extract:**

```text
immutability/history ideas
idempotency tests
conflict handling ideas
safe numeric validation
```

**Do not port by default:**

```text
budget_adjustments subsystem
origin/backfill machinery
donor RLS
donor data shape
```

A new Current-vs-Target audit must prove whether any such machinery is actually required.

---

## CAP-18 — Budget Spent Derivation

**Old donor classification:** `ADAPT`

V1.1 preserves:

```text
Expense  → spent increases
Refund   → spent decreases
Transfer → no effect
Balance Correction → no effect
```

**V1.1 donor disposition:** `KEEP`

**May extract:**

```text
transaction-derived actuals
monthly/category aggregation
sign normalization concepts
```

**Must adapt:**

```text
exclude Transfer
include Refund as reduction
exclude Balance Correction
respect Financial Context
respect Currency
```

---

## CAP-19 — Transfer Impact in Budget / Balance

**Old donor classification:** `REFERENCE ONLY`

**V1.1 target delta:** none material.

**V1.1 donor disposition:** `REFERENCE ONLY`

Use only to reinforce:

```text
Transfer is separate from spend/income
```

HomePlus target remains authoritative for exact budget/balance effects.

---

## CAP-20 — Reports / Aggregation

**Old donor classification:** `ADAPT`

V1.1 keeps read-model needs but radically freezes their presentation:

```text
NO Reports tab

Resumen
→ high-level state

Análisis
→ merged analytics + Budget detail

Movimientos
→ scoped drill-down
```

**V1.1 donor disposition:** `KEEP + REBOUND`

**May extract:**

```text
month aggregation
category aggregation
direction filters
account filters
currency-safe read models
transaction pagination/filtering
```

**Must not extract:**

```text
donor reporting IA
web dashboard
tables/charts as HomePlus frontend
workspace privacy model
```

**Important:**

Donor report logic can support:

```text
Resumen
Análisis
Movimientos
```

without creating a `Reports` subsystem or tab.

---

## CAP-21 — Currency Model

**Old donor classification:** `ADAPT`

V1.1 preserves:

```text
native currency
no silent incompatible summation
no required FX engine
```

**V1.1 donor disposition:** `KEEP`

**May extract:**

```text
native-currency storage concepts
unconvertible-state/warning concepts
currency-aware aggregation tests
```

**Must not extract:**

```text
FX worker
reporting currency conversion as V1 dependency
```

---

## CAP-22 — Account Currency Immutability

**Old donor classification:** `REJECT`

Donor derives account currency statistically.

V1.1 requires:

```text
Account with financial history
→ Currency does not change
```

**V1.1 donor disposition:** `REJECT`

No change.

---

## CAP-23 — History / Correction / Deletion

**Old donor classification:** `REJECT`

Primary donor mutates in place and hard-deletes.

V1.1 remains explicit:

```text
Correction preserves history
Trash removes current effects
Restore may reapply
Permanent delete → Global Data Lifecycle Pass
```

**V1.1 donor disposition:**

```text
PRIMARY DONOR:
REJECT

ACTUAL BUDGET:
REFERENCE ONLY
```

**May use from Actual:**

```text
tombstone/history edge-case ideas
balance exclusion tests
transfer-link deletion considerations
```

**Must not import:**

```text
primary donor direct update/delete lifecycle
```

---

## CAP-24 — Refund Semantics

**Old donor classification:** `REJECT`

Donor has no refund model.

V1.1 preserves:

```text
Refund != Income
Refund reduces Net Expense
Refund reduces Budget Spent
Refund linked to original Expense
Refund cannot exceed original Expense
```

**V1.1 donor disposition:** `REJECT`

Residual target remains HomePlus-specific.

---

## CAP-25 — Savings via Account + Transfer

**Old donor classification:** `REFERENCE ONLY`

V1.1 preserves:

```text
NO Finance Savings Goal

Operational Account
→ Transfer
→ Savings Account
```

**V1.1 donor disposition:** `REFERENCE ONLY`

Useful only to confirm that existing account/transfer primitives can represent savings.

No savings subsystem should be imported.

---

## CAP-26 — Obligation / Recurrence / Payment

**Old donor classification:** `REJECT`

Primary donor has no HomePlus-style expected Payment domain.

V1.1 keeps Finance-owned:

```text
one-time expected Payment
recurring expected Payment
occurrences
PENDING / PAID / SKIPPED / CANCELLED
OVERDUE derived
Register Payment
Payment → Expense
```

but changes the normal resolution path.

**V1.1 donor disposition:** `REJECT`

**Residual target:** remains a HomePlus Finance capability unless CURRENT already contains reusable generic recurrence/history primitives.

**Important V1.1 boundary:**

```text
Payment Due / Overdue
→ Attention / Notifications
→ Payment Detail
→ Register Payment

NOT
→ automatic Planner Task
```

---

## CAP-27 — Planner / Attention / Search / Inventory / Assets / HomeCloud / Geni

**Old donor classification:** `NOT NEEDED`

The old row grouped too many HOMePLUS authorities together.

V1.1 requires that this row be decomposed.

### Finance Core/shared authority path

```text
Attention
Notifications
Home
Search
```

Donor status:

```text
DONOR NOT NEEDED
```

HomePlus owns these authorities.

Finance may produce authorized signals/projections but must not recreate the systems.

### Deferred cross-module path

```text
Planner
Inventory
Assets
HomeCloud
Geni
Automations
generic connected resolution
```

V1.1 status:

```text
DEFER CROSS-MODULE
```

for composition work where explicitly deferred.

Especially:

```text
Finance ↔ Planner
→ DROP FROM FINANCE CORE
→ later Cross-Module Integration Pass
```

**V1.1 donor disposition:** `DONOR NOT NEEDED + DEFER CROSS-MODULE`

This row MUST NOT remain a single execution item in the next Real Gap Map.

---

## CAP-28 — Auth / Household / Membership / Permissions

**Old donor classification:** `NOT NEEDED`

V1.1 preserves HomePlus ownership.

**V1.1 donor disposition:** `DONOR NOT NEEDED`

**Preserve Current:**

```text
Auth
User/person identity
Household
Membership
RLS foundations
```

**Do not import:**

```text
donor workspace
workspace_members
donor Auth
donor permissions
Cognito
```

Final Finance role packages remain deferred to the Global Permissions Pass.

---

## CAP-29 — Web UI Workflow

**Old donor classification:** `REFERENCE ONLY`

V1.1 now freezes the actual Finance frontend Product Truth.

Therefore donor UI authority becomes even weaker.

**V1.1 donor disposition:** `NARROW`

**Allowed reference use only for underlying behavior:**

```text
filter/query semantics
validation examples
read-model expectations
edge-case tests
pagination behavior
```

**Explicitly not allowed:**

```text
donor navigation
dashboard hierarchy
tables as product architecture
chart hierarchy
donor forms
donor shell
donor workspace UX
```

HomePlus V1.1 owns:

```text
Resumen
Movimientos
Pagos
Análisis
Cuentas
Categorías
Papelera
```

and all defined surface hierarchy.

---

## CAP-30 — SQL Agent / AWS / Cognito / Worker / Deployment

**Old donor classification:** `REJECT`

V1.1 changes nothing here.

**V1.1 donor disposition:** `REJECT`

Do not import:

```text
SQL agent
direct SQL correctness authority
AWS
Cognito
donor worker
donor deployment stack
FX worker as V1 requirement
AI chat architecture
```

---

# 05. 30-CAPABILITY SUMMARY MATRIX

| # | Capability | Old | V1.1 disposition | Main reason |
|---:|---|---|---|---|
| 01 | Personal vs Household Context | REJECT | REJECT | Donor workspace/business-personal is not HomePlus privacy/context |
| 02 | Accounts | ADAPT | KEEP + REBOUND | Read/balance ideas survive; persistent Account/type/review remain HomePlus |
| 03 | Account metadata | ADAPT | NARROW | V1.1 now owns explicit Account type/presentation |
| 04 | Unknown Balance / Anchor | REJECT | REJECT | Donor lacks semantics |
| 05 | Balance derivation | ADAPT | KEEP | Core arithmetic remains applicable |
| 06 | Negative balance | ADAPT | KEEP + REBOUND | Still valid; now also sits under explicit Credit Card presentation |
| 07 | Account archive/delete | REJECT | REJECT | Donor lacks persistent lifecycle |
| 08 | Income/Expense/Transfer classes | ADAPT | KEEP | Canonical classes unchanged |
| 09 | Expense without Account | REJECT | REJECT | Donor requires Account |
| 10 | Ledger event grouping | ADAPT | KEEP | Correlation remains useful |
| 11 | Transfer representation | ADAPT | KEEP | Paired-effect semantic still useful |
| 12 | Different-account validation | REFERENCE | REFERENCE ONLY | Actual remains mature reference |
| 13 | Cross-currency transfer | REFERENCE | REFERENCE ONLY | Native-side amounts useful; FX engine rejected |
| 14 | Categories | ADAPT | NARROW | Optionality survives; canonical category model changed |
| 15 | Category archive/delete/history | REJECT | REFERENCE ONLY | Archive removed; stored historical meaning now partially informative |
| 16 | Monthly/category Budgets | ADAPT | KEEP + REBOUND | Period/category model survives; lifecycle changed |
| 17 | Budget adjustments | ADAPT | REFERENCE ONLY | V1.1 does not require donor adjustment subsystem |
| 18 | Budget spent derivation | ADAPT | KEEP | Transaction-derived actuals remain core |
| 19 | Transfer budget/balance impact | REFERENCE | REFERENCE ONLY | Separation remains reference |
| 20 | Reports/aggregation | ADAPT | KEEP + REBOUND | Read logic survives; Reports frontend architecture rejected |
| 21 | Currency model | ADAPT | KEEP | Native currency/no silent mix remains |
| 22 | Account currency immutability | REJECT | REJECT | Donor MODE currency conflicts |
| 23 | History/correction/deletion | REJECT | REJECT primary / REFERENCE Actual | Primary hard-delete still invalid |
| 24 | Refund | REJECT | REJECT | No donor model |
| 25 | Savings via Account+Transfer | REFERENCE | REFERENCE ONLY | No savings subsystem needed |
| 26 | Obligation/Payment/Recurrence | REJECT | REJECT | No donor model; V1.1 resolution path changed |
| 27 | Cross-module authorities | NOT NEEDED | DONOR NOT NEEDED + DEFER | Split Core shared authorities from deferred integrations |
| 28 | Auth/Household/Permissions | NOT NEEDED | DONOR NOT NEEDED | HomePlus remains authority |
| 29 | Donor web UI | REFERENCE | NARROW | Only logic/test clues survive; V1.1 frontend is frozen |
| 30 | SQL agent/infra | REJECT | REJECT | Parallel architecture |

Traceability:

```text
30 / 30 capabilities rebaselined
```

---

# 06. REBASE OF THE 13 OLD DC-ADAPT CANDIDATES

The old Real Gap process retained or referenced thirteen named donor candidates.

V1.1 disposition:

| Candidate | V1.1 disposition | Authorized extraction boundary |
|---|---|---|
| DC-ADAPT-001 Ledger movement representation | KEEP | movement data semantic, classification/read-model ideas, tests |
| DC-ADAPT-002 Derived account balances | KEEP | arithmetic/SQL/test ideas; no derived Account authority |
| DC-ADAPT-003 Account metadata sidecar | NARROW | metadata-vs-financial-truth separation only |
| DC-ADAPT-004 Transaction kind validation/filtering | KEEP | validation/filter semantic; Account remains optional where V1.1 says so |
| DC-ADAPT-005 Grouped transfer representation | KEEP | paired-effect/grouping semantic; HomePlus adds atomic operation |
| DC-ADAPT-006 Nullable transaction category | NARROW | Category optionality/filtering only; not category authority |
| DC-ADAPT-007 Monthly base/category budget plan | KEEP + REBOUND | period/category read-model concepts; HomePlus owns future/history semantics |
| DC-ADAPT-008 Budget adjustments | REFERENCE ONLY | history/idempotency/conflict/test ideas only unless Current proves need |
| DC-ADAPT-009 Budget actual derivation | KEEP | transaction-derived actuals with HomePlus exclusions |
| DC-ADAPT-010 Reports and aggregation | KEEP + REBOUND | aggregation/filter SQL; no Reports IA/tab |
| DC-ADAPT-011 Native currency with warnings | KEEP | native currency/no-silent-mix behavior; no FX subsystem |
| DC-ADAPT-012 Account status/suggestions | REFERENCE ONLY | account-selection/test ideas only; inactivity != archive |
| DC-ADAPT-013 Business/personal transfer reporting analogue | REFERENCE ONLY | cross-context read behavior idea only; no privacy authority |

Counts:

```text
KEEP:               6
KEEP + REBOUND:     2
NARROW:              2
REFERENCE ONLY:      3
DROP/REJECT:         0

TOTAL:              13
```

Interpretation:

```text
The useful donor core was not destroyed by V1.1.

But 7/13 candidates now require
either a changed boundary, narrowing,
or reference-only treatment.
```

---

# 07. V1.1 TARGET DELTAS THAT REQUIRE CURRENT RECHECK

These are NOT yet `REAL GAP`.

They are:

```text
TARGET DELTAS
→ must be compared against CURRENT
```

## DELTA-01 — Payment resolution without default Planner Task

```text
OLD:
Household Obligation
→ Planner Task composition as Core

NEW:
Finance Due/Overdue
→ Attention / Notifications
→ Payment Detail
→ Register Payment
```

Required consequence:

```text
old FIN-GAP-010
cannot remain a Finance Core gap
```

Finance ↔ Planner moves to the Cross-Module Integration Pass.

---

## DELTA-02 — Category lifecycle

```text
OLD:
ACTIVE ↔ ARCHIVED

NEW:
Native baseline
+
Custom CREATE / EDIT / DELETE
+
historical meaning preserved
```

Required consequence:

`FIN-GAP-007` must be rewritten.

---

## DELTA-03 — Native Categories required

Old target allowed a useful native baseline.

V1.1 requires one.

Required CURRENT questions:

```text
Does Current already contain reusable category seed/content infrastructure?
Does Current have stable identifiers/content seeding?
Does Current have generic history-safe category deletion semantics?
```

Do not assume absence until audited.

---

## DELTA-04 — Budget lifecycle

```text
NO generic Budget Archive
```

Instead:

```text
historical period target preserved
future applicability can be changed/stopped
```

Required consequence:

`FIN-GAP-008` must be rewritten.

Donor `budget_adjustments` is no longer presumed an implementation candidate.

---

## DELTA-05 — Credit Card formalized

```text
CREDIT_CARD
→ Account type/presentation
```

No new card subsystem.

Required CURRENT questions:

```text
Does current Account-like infrastructure support typed presentation?
Can shared detail primitives render balance vs debt language?
```

No donor search for a credit-card subsystem is justified.

---

## DELTA-06 — Frontend Product Truth frozen

Old:

```text
FRONTEND DETAIL PENDING
```

New:

```text
Resumen
Movimientos
Pagos
Análisis
Cuentas
Categorías
Papelera
```

plus defined forms, detail surfaces and navigation hierarchy.

Required consequence:

`FIN-GAP-015` is no longer:

```text
"write the frontend specification"
```

It becomes:

```text
CURRENT MOBILE CAPABILITY
vs
FROZEN V1.1 SURFACE TARGET
→ REAL IMPLEMENTATION GAP
```

---

## DELTA-07 — Analysis + Budget Detail merged

Read-model math stays reusable.

Frontend architecture changes:

```text
NO Reports tab
NO Budget tab
NO separate Budget Detail + Analysis duplication
```

Required CURRENT recheck:

```text
existing charts/read models
existing period selector
existing drill-down primitives
existing filter/navigation primitives
```

---

## DELTA-08 — Generic Archived surface removed

V1.1:

```text
Account → Archive
Category → Delete
Payment → status / recurrence lifecycle
Budget → period history + future applicability
Transaction → Trash
```

Required consequence:

No generic Finance Archive implementation should survive from old plans.

---

## DELTA-09 — Create Account Review

V1.1 freezes proportional confirmation:

```text
persistent low-frequency Account
→ edit
→ review
→ commit

daily Expense
→ no unnecessary confirmation
```

Required CURRENT recheck:

```text
existing review/confirmation sheet primitives
existing form-state preservation
existing submit/idempotency UX
```

---

## DELTA-10 — Money-aware frontend primitives

V1.1 now explicitly requires:

```text
numeric keyboard
locale-aware money formatting
Currency visibility
easy correction
unknown != zero
sign derived from operation
```

and Transfer impact preview.

Required CURRENT recheck:

```text
money input primitive
currency formatter
safe amount parser
preview primitives
validation/error surfaces
```

---

# 08. IMPACT ON OLD REAL GAP MAP

The old Real Gap Map contained:

```text
FIN-GAP-001 ... FIN-GAP-015
```

It must not be used unchanged.

## 08.1 Likely structurally preserved, subject to CURRENT revalidation

```text
FIN-GAP-001
Financial Context and Privacy Boundary

FIN-GAP-002
Account Authority and Balance Lifecycle

FIN-GAP-003
Transaction Classification and Expense/Income Authority

FIN-GAP-004
Canonical Transfer and Cross-Scope Movement

FIN-GAP-005
Financial History, Correction, Trash, Restore

FIN-GAP-006
Refund Lifecycle

FIN-GAP-009
Obligation, Payment, Occurrence, Recurrence Lifecycle

FIN-GAP-011
Reporting and Multicurrency Read Models

FIN-GAP-014
Geni/Automations Canonical Operation Boundary
```

Their exact acceptance criteria still need V1.1 rebase.

## 08.2 Must be materially rewritten

```text
FIN-GAP-007
Finance Category Authority and History
```

Old target included category archive.

V1.1 requires native + custom CRUD/delete + historical meaning.

```text
FIN-GAP-008
Budget and Savings Semantics
```

Old plan included the previous Budget lifecycle.

V1.1 removes generic archive and freezes period-history/future-applicability semantics.

```text
FIN-GAP-010
Planner Composition and Payment Reconciliation
```

Must be removed from Finance Core execution planning.

Replacement:

```text
DEFERRED CROSS-MODULE TARGET
Finance ↔ Planner
```

```text
FIN-GAP-015
Mobile Finance Surface and Interaction Specification
```

The specification gap is closed by V1.1.

It must be replaced with an implementation capability comparison.

## 08.3 Must be decomposed / rebound

```text
FIN-GAP-012
Home, Attention, Notifications, Search Integration
```

V1.1 makes Payment Due/Overdue/Budget Exceeded Finance signals explicit.

The next pass must distinguish:

```text
Finance-owned signal/state
from
Attention-owned relevance
from
Notifications-owned delivery
from
Home-owned projection
from
Search-owned discovery
```

No donor authority is needed.

```text
FIN-GAP-013
Inventory, Assets, HomeCloud Relationship Boundary
```

V1.1 explicitly defers connected implementation until involved cores are ready.

It must not block Finance Core where only the relationship intent is relevant.

---

# 09. IMPACT ON OLD MINIMAL INTEGRATION PLAN

Status:

```text
HISTORICAL:
VALID

V1.1 EXECUTION AUTHORITY:
INVALID / MUST BE REBASED
```

Reasons:

1. It was generated from V1.0.
2. It assumed frontend detail was pending.
3. It included Planner composition as an execution unit.
4. Category lifecycle changed.
5. Budget lifecycle changed.
6. Account/Credit Card presentation is now explicit.
7. Finance surface hierarchy is now frozen.
8. Account create Review is now frozen.
9. Payment reminder path changed.
10. Generic Archived surface was removed.

No implementation wave from the old plan should be launched blindly.

---

# 10. AUTHORIZED DONOR EXTRACTION MAP V1.1

This is the practical whitelist for future implementation audits.

## HIGH-VALUE DONOR MATERIAL TO INSPECT

```text
PRIMARY DONOR

ledger_entries
→ movement semantics

transactionKindSchema / TRANSACTION_KINDS
→ classification + validation

getBalancesSummary
→ balance arithmetic

transfer grouping/event_id behavior
→ paired financial effects

budget_lines / getBudgetGrid
→ period/category planning + actual derivation

transaction/report queries
→ filtering + aggregation

native-currency behavior
→ no silent currency mixing
```

## TARGETED MATURE REFERENCE

```text
ACTUAL BUDGET

transfer validation/tests
→ different-account / coherent-pair invariant

tombstone/history behavior
→ deletion/history edge-case reference
```

## REFERENCE ONLY / LOW PRIORITY

```text
account status/suggestions
account metadata sidecar
business/personal transfer reporting analogue
budget adjustment subsystem
donor web workflow
```

## PROHIBITED AS AUTHORITY

```text
donor Auth
donor workspace
donor membership
donor RLS
donor App Shell
donor navigation
donor Next.js UI
donor SQL agent
donor direct-SQL authority
donor AI chat
Cognito
AWS
deployment stack
FX worker as V1 requirement
derived account view as Account authority
hard delete/update lifecycle
business/personal labels as HomePlus privacy
```

---

# 11. IMPLEMENTATION-SPECIFIC EXTRACTION RULE

Future implementation prompts must never say:

```text
"Use expense-budget-tracker for Finance."
```

They must say:

```text
TARGET CAPABILITY:
<one V1.1 capability>

CURRENT:
<proven HomePlus evidence>

DONOR ALLOWED:
<specific candidate>
<specific source path/symbol>
<specific behavior>

DONOR PROHIBITED:
<specific accidental architecture>

REAL GAP:
<proven delta only>

IMPLEMENT:
<minimal gap only>
```

Example:

```text
TARGET:
Canonical Transfer V1.1

PRIMARY DONOR ALLOWED:
DC-ADAPT-005
paired-effect semantic
event grouping
transfer reporting separation

ACTUAL REFERENCE ALLOWED:
different-account validation
transfer-pair test ideas

DO NOT PORT:
SQL agent
workspace
RLS
web UI
FX subsystem
derived account authority

HOMEPLUS MUST OWN:
canonical atomic operation
idempotency
history
privacy
source/context semantics
```

---

# 12. NEXT REQUIRED GATE

This rebase does NOT authorize implementation.

The next mandatory sequence is:

```text
FINANCE PRODUCT FREEZE V1.1
        ↓
DONOR CAPABILITY REBASE V1.1
        ↓
CURRENT HOMePLUS REBASE
        ↓
CURRENT + DONOR vs TARGET V1.1
        ↓
REAL GAP MAP V1.1
        ↓
MINIMAL INTEGRATION PLAN V1.1
        ↓
IMPLEMENT FINANCE CORE
```

Cross-module work remains separate:

```text
FINANCE CORE STABLE
+
OTHER MODULE CORE STABLE
        ↓
CROSS-MODULE INTEGRATION PASS
        ↓
Planner / Inventory / Assets / HomeCloud / etc.
```

---

# 13. FINAL VERDICT

```text
FINANCE_DONOR_CAPABILITY_REBASE_V1_1

30 / 30 OLD DONOR CAPABILITIES:
REBASED

13 / 13 OLD DC-ADAPT CANDIDATES:
REBASED

DONOR DISCOVERY FROM ZERO:
NOT REQUIRED

PRIMARY DONOR STILL USEFUL:
YES

DIRECT PORT AUTHORIZED:
NO

OLD CURRENT+DONOR MATRIX AS V1.1 AUTHORITY:
NO

OLD REAL GAP MAP AS V1.1 AUTHORITY:
NO

OLD MINIMAL INTEGRATION PLAN AS V1.1 AUTHORITY:
NO

PLANNER COMPOSITION IN FINANCE CORE:
REMOVED / DEFERRED

CATEGORY TARGET:
REWRITTEN

BUDGET LIFECYCLE TARGET:
REWRITTEN

FRONTEND PRODUCT TRUTH:
NOW FROZEN

NEXT GATE:
CURRENT HOMePLUS REBASE AGAINST V1.1
```

# END OF DOCUMENT
