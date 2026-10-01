# HOMePLUS — FINANCE CURRENT CAPABILITY REBASE V1.1

**Documento:** `FINANCE_CURRENT_CAPABILITY_REBASE_V1_1.md`  
**Módulo:** Finance  
**Fecha:** 2026-08-12  
**Estado:** `FINANCE_CURRENT_CAPABILITY_REBASE_V1_1_COMPLETE`  
**Modo:** `CURRENT-REBASE / EXISTING-FIRST / NO IMPLEMENTATION`

---

# 00. PURPOSE

Este documento rebasa el `CURRENT` ya auditado de HOMePLUS Finance contra:

```text
HOMePLUS_FINANCE_PRODUCT_FREEZE_V1.1
```

sin repetir una inspección completa del repositorio.

La razón operativa es explícita:

```text
CURRENT CODE:
UNCHANGED SINCE ACCEPTED CURRENT AUDIT

TARGET:
CHANGED FROM V1.0 TO V1.1
```

Por lo tanto:

```text
OLD CURRENT EVIDENCE
→ remains evidence of CURRENT

OLD TARGET FIT
→ must be recalculated

OLD REAL GAP
→ cannot be assumed valid
```

Este documento NO:

- vuelve a inspeccionar físicamente el repo;
- afirma un HEAD nuevo;
- afirma un `git status` nuevo;
- ejecuta tests;
- ejecuta Supabase;
- toca remoto;
- implementa Finance;
- diseña tablas, migrations, RPCs, endpoints o services;
- extrae código donor;
- declara todavía el nuevo Real Gap definitivo.

Su pregunta es:

```text
DADO EL MISMO CURRENT YA AUDITADO,
¿CÓMO CAMBIA SU COBERTURA
CUANDO EL TARGET PASA DE V1.0 A V1.1?
```

---

# 01. BASELINE AUTHORITY

## 01.1 Accepted Current audit

Fuente:

```text
FINANCE_CURRENT_CAPABILITY_AUDIT.md
```

Estado original:

```text
FINANCE_CURRENT_AUDIT_COMPLETE
READ ONLY
2026-08-10
```

Baseline auditado:

```text
Repo:
C:\Users\thega\Desktop\HomePlus

Branch:
pulido-medio-inventario-planner

HEAD:
3282907c0b0e2fe3b963e33cf4f0afc10909424f
```

La evidencia del Current Audit original se conserva como autoridad de implementación actual **bajo la premisa controlada de que el código no cambió desde ese audit**.

Este rebase NO pretende haber vuelto a verificar ese baseline.

## 01.2 New Product authority

```text
HOMePLUS_FINANCE_PRODUCT_FREEZE_V1.1
```

V1.1:

```text
PRODUCT TRUTH                 FROZEN
FUNCTIONAL BEHAVIOR           FROZEN
EXPERIENCE MODEL              FROZEN
INFORMATION ARCHITECTURE      FROZEN
FRONTEND SURFACE MODEL        FROZEN

PERMISSION ROLE PACKAGES
→ DEFERRED TO GLOBAL PERMISSIONS PASS

CROSS-MODULE COMPOSITION
→ DEFERRED TO CROSS-MODULE INTEGRATION PASS
```

V1.1 reemplaza V1.0 cuando existe contradicción.

## 01.3 Accepted donor rebase

Fuente:

```text
FINANCE_DONOR_CAPABILITY_REBASE_V1_1.md
```

Este documento no recalcula donor.

Se utilizará en el gate siguiente:

```text
CURRENT + DONOR vs TARGET V1.1
```

---

# 02. REBASE RULES

## RULE-01 — Current evidence does not change because Target changed

Si el audit anterior demostró:

```text
No Finance Account authority
```

y no cambió el código:

```text
Current remains:
No Finance Account authority
```

aunque V1.1 cambie cómo debe verse o comportarse Account.

## RULE-02 — Target wording can change the meaning of the gap

Ejemplo:

```text
V1.0:
Category archive preserving history

V1.1:
Native baseline
+
Custom CREATE / EDIT / DELETE
+
historical meaning preserved
```

El Current sigue siendo el mismo.

El déficit contra Target no.

## RULE-03 — Existing shared authority remains canonical

No recrear:

```text
Auth
Household
Membership
RLS foundations
Audit / Outbox
Mutation contracts
Reliability foundations
Home
Attention
Notifications
Search
App Shell
shared UI primitives
```

cuando Current ya demuestra una authority o primitive reutilizable.

## RULE-04 — Module-specific primitive ≠ implemented Finance capability

Ejemplo:

```text
Planner recurrence exists
```

NO significa:

```text
Finance recurring Payment exists
```

## RULE-05 — No unsearched primitive is invented

Cuando el old Current Audit no probó explícitamente una primitive genérica nueva requerida por V1.1:

```text
REUSE:
NOT PROVEN
```

No se afirma automáticamente que exista o no exista.

## RULE-06 — Deferred cross-module target is not a Finance Core blocker

Si V1.1 dice:

```text
DEFERRED TO CROSS-MODULE INTEGRATION PASS
```

su ausencia actual no se trata como gap ejecutable de Finance Core.

---

# 03. CURRENT — UNCHANGED EXECUTIVE TRUTH

El accepted Current Audit demostró:

```text
ACTIVE FINANCE DOMAIN:
ABSENT
```

No encontró:

```text
Finance Accounts
Finance Balances
Finance Transactions
Finance Income
Finance Expenses
Finance Transfers
Finance Refunds
Finance Budgets
Finance expected Payments
Finance Payment occurrences
Finance Reports
Finance APIs
Finance routes/services/controllers
Finance tables
Finance screens/navigation
Finance tests
```

Sí encontró fuerte capacidad reutilizable en:

```text
Auth / person
Household
Membership
RLS
Audit
Outbox
Mutation contracts
idempotency/reliability
Planner recurrence/task/event primitives
Planner origin composition
Home projection pattern
Attention projection pattern
notification preference primitive
Search capability-gated pattern
Inventory ownership/integration precedent
shared mobile UI primitives
test infrastructure
```

Por tanto el resultado general de Current contra V1.1 es:

```text
FINANCE CORE IMPLEMENTED:
NO

SHARED HOMePLUS FOUNDATION REUSABLE:
YES

V1.1 TARGET SATISFIED BY CURRENT:
NO
```

---

# 04. CURRENT AUTHORITIES TO PRESERVE — V1.1 REBASE

| Current authority | Accepted evidence | V1.1 disposition |
|---|---|---|
| Auth | `public.people`, auth policies | KEEP CURRENT |
| User/person ownership | `current_person_id()`, self-only patterns | EXTEND CURRENT |
| Household | `public.households` | EXTEND CURRENT |
| Membership | `public.household_members`, helpers | EXTEND CURRENT |
| RLS foundations | person/household helpers and policies | EXTEND CURRENT |
| Audit | `audit_events`, append-only guard | EXTEND CURRENT |
| Outbox | `outbox_events`, worker lifecycle | EXTEND CURRENT |
| Mutation contract | `mutationContracts.js`, headers/version semantics | EXTEND CURRENT |
| Idempotency/reliability | current core/Planner foundations | EXTEND CURRENT, DO NOT DUPLICATE |
| App Shell/shared navigation | current app shell/UI foundation | KEEP CURRENT |
| Home | current Planner/Home projection precedent | EXTEND CURRENT, Finance producer needed |
| Attention | current Planner/global attention precedent | EXTEND CURRENT, Finance signals needed |
| Notifications | preference/adaptor partial foundation | EXTEND CURRENT, delivery authority remains external |
| Search | capability-gated Planner search precedent | EXTEND CURRENT, Finance projection needed |
| Inventory | current Inventory owner | KEEP OWNER; relation deferred |
| Planner | current Planner task/event authority | KEEP OWNER; Finance composition DEFERRED |
| Shared UI | `components/ui/*` primitives | REUSE |
| Test infrastructure | `scripts`, `tests` | REUSE |

Important V1.1 change:

```text
Planner origin composition
```

remains a real Current capability, but its disposition changes from:

```text
Finance Core integration candidate
```

to:

```text
PRESERVE FOR FUTURE CROSS-MODULE PASS
```

It must not drive Finance Core implementation.

---

# 05. V1.1 CORE DOMAIN REBASE

# 05.1 Financial Context — Personal / Household

## Target V1.1

```text
PERSONAL
→ belongs to User
→ owner-only by default

HOUSEHOLD
→ belongs to active Household
→ authorized Household members

Financial Context selector
→ independent from global Household switch
```

## Old Current evidence

Current has:

```text
public.people
public.households
public.household_members
public.current_person_id()
public.is_active_household_member()
self-only people RLS
household membership RLS
Planner personal/shared visibility precedents
```

No Finance entity or Finance privacy projection exists.

## Current V1.1 result

```text
TARGET STATUS:
PARTIAL

REUSABLE CURRENT:
STRONG FOUNDATION

FINANCE-SPECIFIC BEHAVIOR:
ABSENT
```

Reuse:

```text
Auth identity
User/person identity
Household identity
Membership
RLS helper patterns
self-only/private precedent
```

Still missing against V1.1:

```text
Financial Context authority
Personal Finance owner binding
Household Finance scope binding
scope selector semantics
scope inheritance during create
cross-scope Source vs Context privacy
Finance-specific RLS/projections
```

No new identity/household subsystem may be created.

---

# 05.2 Accounts

## Target V1.1

Account is persistent and optional infrastructure.

Types:

```text
ACCOUNT
CREDIT_CARD
```

Supports:

```text
Known / Unknown Balance
Balance Anchor
Balance Correction
negative balance
fixed historical Currency
Archive / Unarchive
```

## Old Current evidence

No active:

```text
Finance account
account archive
account balance
opening balance
balance anchor
balance correction
credit-card behavior
```

was found.

## Current V1.1 result

```text
TARGET STATUS:
ABSENT

REUSABLE DOMAIN AUTHORITY:
NO

REUSABLE SHARED FOUNDATION:
PARTIAL
```

Reusable shared foundations:

```text
Auth/Household ownership
audit/outbox
mutation contracts
generic UI/form primitives
```

Not reusable as Account behavior:

```text
Planner amount fields
Planner visibility fields
```

They are only precedents.

---

# 05.3 Credit Card

## Target V1.1 delta

Credit Card is now explicitly:

```text
Account type/presentation
```

not a subsystem.

Semantics:

```text
purchase
→ Expense

card payment
→ Transfer
```

## Old Current evidence

No Account type/balance/card domain found.

## Current V1.1 result

```text
TARGET STATUS:
ABSENT

NEW SUBSYSTEM REQUIRED:
NO
```

This is an important narrowing of implementation scope.

Current does NOT justify:

```text
card statement engine
card closing engine
minimum payment system
credit-card-specific ledger
```

because V1.1 leaves those Future.

---

# 05.4 Income / Expense / Transfer

## Target V1.1

```text
INCOME
EXPENSE
TRANSFER
```

Income/Expense can exist without Account.

Transfer requires Source + Destination Accounts.

## Old Current evidence

No active:

```text
Finance transaction schema/API
Income
Expense
Transfer
transaction-class reporting
```

found.

## Current V1.1 result

```text
TARGET STATUS:
ABSENT

REUSABLE CURRENT:
mutation/audit/idempotency foundations only
```

No Planner or Inventory movement may be relabeled as Finance transaction truth.

---

# 05.5 Source vs Financial Context

## Target V1.1

```text
SOURCE
→ where money came from

FINANCIAL CONTEXT
→ which economy owns the Expense
```

Personal Account may fund Household Expense without exposing Personal Account internals.

## Old Current evidence

No:

```text
source/context transaction semantics
shared funding model
financial attribution model
private Account projection
```

found.

## Current V1.1 result

```text
TARGET STATUS:
ABSENT

PRIVACY FOUNDATION:
PARTIAL
```

Current RLS is reusable.

Finance source/context behavior is not.

---

# 05.6 Contribution / Reimbursement

## Target V1.1

```text
Personal → Household
= Transfer

Household → Personal
= Transfer
```

not external Income.

## Current evidence

No Contribution/Reimbursement/Transfer entity.

## Current V1.1 result

```text
ABSENT
```

No separate settlement subsystem should be introduced.

---

# 05.7 Balance Correction

## Target V1.1

```text
Account Balance   YES
Account History   YES
Income            NO
Expense           NO
Budget            NO
```

## Current evidence

No balance correction authority.

Generic audit exists.

## Current V1.1 result

```text
FINANCE BEHAVIOR:
ABSENT

HISTORY FOUNDATION:
PARTIAL
```

---

# 05.8 Transaction Correction / History / Trash / Restore

## Target V1.1

```text
Correction
→ current truth corrected
→ history preserved

Trash
→ removes current financial effects
→ retains recoverability

Restore
→ reapplies when valid
```

## Current evidence

Current already has:

```text
audit_events
append-only audit protection
request_id / mutation_id correlation
Planner versioning
Planner trashed_at
Planner restore RPC patterns
```

No Finance financial-effect replay exists.

## Current V1.1 result

```text
TARGET STATUS:
PARTIAL

SHARED HISTORY FOUNDATION:
STRONG

FINANCE EFFECT SEMANTICS:
ABSENT
```

Do not create parallel audit/reliability systems.

---

# 05.9 Refund

## Target V1.1

Refund:

```text
references Expense
is not Income
reduces Net Expense
reduces Budget Spent
cannot exceed original Expense
must not become orphaned
```

## Current evidence

No Refund/reversal lifecycle.

## Current V1.1 result

```text
ABSENT
```

Generic audit/trash is not Refund behavior.

---

# 05.10 Categories — V1.1 CHANGED TARGET

## Old V1.0 target

```text
Category optional
ACTIVE ↔ ARCHIVED
history preserved
```

## New V1.1 target

```text
NATIVE BASELINE REQUIRED
+
CUSTOM
CREATE
EDIT
DELETE

NO visible Archive Category
```

Deletion must not erase historical meaning.

## Old Current evidence

No Finance category lifecycle found.

Planner categories exist only as unrelated/module-specific patterns.

Filter/category-like UI patterns exist.

## Current V1.1 result

```text
FINANCE CATEGORY AUTHORITY:
ABSENT

OPTIONAL FIELD / FILTER UI PRECEDENT:
PARTIAL

NATIVE CATEGORY CONTENT:
NOT PROVEN

HISTORY-SAFE DELETE:
ABSENT
```

## Rebase consequence

Old Current conclusion:

```text
"No category archive/history model"
```

is no longer the right Target comparison.

New comparison:

```text
Does Current already provide:
- canonical Finance category identity? NO
- native Finance baseline? NOT PROVEN / no Finance category authority
- custom create/edit/delete? NO
- historical classification preservation after delete? NO
```

`Archive Category` is removed from Finance Core target.

---

# 05.11 Budget — V1.1 CHANGED LIFECYCLE

## Target V1.1

```text
Monthly Total Budget
Category Budget
Currency-aware
Expense-derived spent
Refund reduces spent
Transfer no effect
Balance Correction no effect
No automatic carry-over
Budget never blocks Expense
```

Lifecycle:

```text
period-scoped
historical target preserved
future applicability may change/stop
NO generic Budget Archive
```

## Current evidence

No Finance:

```text
monthly budget
category budget
budget-vs-actual
carry-over model
budget history
report aggregation
```

found.

Planner has only generic `budget` placeholder vocabulary.

## Current V1.1 result

```text
FINANCE BUDGET AUTHORITY:
ABSENT

GENERIC NUMERIC/FORM VOCABULARY:
PARTIAL

HISTORICAL BUDGET TARGET MODEL:
ABSENT
```

## Rebase consequence

Do NOT implement a generic Budget Archive lifecycle.

Do NOT infer a generalized budget-adjustment engine from Current.

---

# 05.12 Savings

## Target V1.1

No Finance Savings Goal.

Savings is:

```text
normal Account
+
Transfer
```

## Current evidence

No Finance Account/Transfer behavior.

## Current V1.1 result

```text
TARGET IMPLEMENTATION:
ABSENT

SEPARATE SAVINGS SUBSYSTEM:
NOT REQUIRED
```

---

# 05.13 Expected Payments / Obligations

## Target V1.1

User language:

```text
PAGOS
```

Domain supports:

```text
one-time expected Payment
recurring expected Payment
Expected Amount can be UNKNOWN
occurrence history
PENDING
PAID
SKIPPED
CANCELLED
OVERDUE derived
```

## Current evidence

Planner has:

```text
task/event scheduling
event recurrence
occurrence identity
series editing patterns
temporal Attention
```

No Finance:

```text
expected Payment
Payment occurrence ledger
PAID marker
SKIPPED state
debt accumulation
payment reconciliation
```

## Current V1.1 result

```text
FINANCE PAYMENT DOMAIN:
ABSENT

REUSABLE RECURRENCE/SCHEDULING PRECEDENT:
PARTIAL
```

Planner recurrence must not become Finance payment truth.

---

# 05.14 Register Payment

## Target V1.1

```text
Register Payment
→ actual Amount
→ actual Currency
→ optional Account
→ Expense
→ occurrence PAID
```

## Current evidence

No Finance Payment or Expense model.

## Current V1.1 result

```text
ABSENT
```

No task completion can substitute for this capability.

---

# 05.15 Payment Trash / Recalculation

## Target V1.1

If the financial truth that made occurrence PAID is trashed:

```text
→ PENDING
or
→ OVERDUE
```

as appropriate.

## Current evidence

Planner trash/restore exists, but no Finance payment state.

## Current V1.1 result

```text
TARGET STATUS:
PARTIAL FOUNDATION

FINANCE STATE RECONCILIATION:
ABSENT
```

---

# 05.16 Reports / Analytics

## Target V1.1

Read models answer:

```text
Income
Expense
Net
Spending by Category
Period vs Previous Period
Budget vs Actual
```

with currency integrity and exact counting.

Frontend presentation is NOT a `Reports` tab.

## Current evidence

No Finance report aggregation authority.

Current has generic Home summary/projection patterns.

## Current V1.1 result

```text
FINANCE READ MODELS:
ABSENT

PROJECTION INFRASTRUCTURE PRECEDENT:
PARTIAL
```

---

# 05.17 Multicurrency

## Target V1.1

```text
Account Currency stable
Budget has Currency
reports do not mix incompatible currencies
cross-currency Transfer stores both amounts
NO required FX engine
```

## Current evidence

No durable Finance money type, account currency rule, FX exclusion rule, multicurrency transaction semantics or report currency grouping.

## Current V1.1 result

```text
ABSENT
```

Planner `amount` and placeholder `{amount,currency}` are only generic vocabulary.

---

# 06. PAYMENT REMINDER / PLANNER REBASE — MAJOR CHANGE

# 06.1 Old Current finding

Current proved a real Planner integration seam:

```text
planner_tasks.origin_module
allows:
finance

backend validation accepts:
finance

Inventory demonstrates:
origin_module composition
```

Under V1.0 that supported the target:

```text
Household Obligation
→ Planner Task composition
```

## 06.2 V1.1 target

Normal payment resolution becomes:

```text
Finance Due / Overdue
→ Attention
→ Notifications delivery if applicable
→ Payment Detail
→ Register Payment
```

No automatic Planner Task.

## 06.3 Current V1.1 result

The Current capability still exists:

```text
Planner origin integration seam:
PRESENT
```

But its V1.1 disposition is:

```text
NOT NEEDED FOR FINANCE CORE
DEFER CROSS-MODULE
```

Therefore:

```text
DO NOT REMOVE Planner origin support.

DO NOT USE it to implement default payment reminders.

DO NOT make Planner a dependency of Finance Core.
```

This is a Target reclassification, not a Current-code change.

---

# 07. ATTENTION / NOTIFICATIONS / HOME / SEARCH REBASE

# 07.1 Attention

## Target V1.1

Finance may produce:

```text
PAYMENT DUE
PAYMENT OVERDUE
BUDGET EXCEEDED
```

Attention owns relevance.

## Current evidence

```text
planner.global_attention.v1
Planner attention backend/frontend
```

No Finance attention source.

## Current result

```text
ATTENTION AUTHORITY:
PARTIAL / EXISTING

FINANCE SIGNAL PRODUCER:
ABSENT
```

Do not create `FinanceAttention`.

---

# 07.2 Notifications

## Target V1.1

Notifications owns delivery.

Finance only produces relevant signals/state.

## Current evidence

```text
NOTIFICATION_PREF_KEYS includes "finanzas"
Planner notification adapter exists
push transport explicitly not present in that adapter
```

## Current result

```text
PREFERENCE FOUNDATION:
PARTIAL

FINANCE DELIVERY:
ABSENT

GENERIC DELIVERY AUTHORITY:
NOT PROVEN COMPLETE BY OLD AUDIT
```

Do not create Finance-specific delivery infrastructure.

---

# 07.3 Home

## Target V1.1

Home projects Finance only when relevant:

```text
payment due
payment overdue
Budget exceeded
```

## Current evidence

Planner Home summary backend/frontend precedent exists.

No Finance Home projection.

## Current result

```text
HOME AUTHORITY/PATTERN:
PARTIAL / EXISTING

FINANCE PROJECTION:
ABSENT
```

---

# 07.4 Search

## Target V1.1

Search may discover authorized Finance data and must never widen permissions.

## Current evidence

Planner search:

```text
controller
service
frontend screen
capability gate planner.search
```

No Finance indexing/search.

## Current result

```text
SEARCH AUTHORITY/PATTERN:
PARTIAL / EXISTING

FINANCE SEARCH PROJECTION:
ABSENT
```

No `FinanceSearch` subsystem.

---

# 08. RELIABILITY REBASE

## Target V1.1

Finance does not create `FinanceReliability`.

UX must distinguish:

```text
pending
offline
retrying
uncertain
conflicted
confirmed
```

Double submit must not duplicate financial operations.

## Current evidence

Current has:

```text
mutationContracts.js
request mutation IDs
idempotency keys
If-Match support
audit/outbox
serverState pending/reconcile/rollback
Planner reliability runtime
operationQueue
operationStore
retryPolicy
reconciliation
restore adapters
```

## Current V1.1 result

```text
GLOBAL/SHARED MUTATION FOUNDATION:
STRONG / PARTIAL

FINANCE ADAPTER / FINANCE CANONICAL MUTATIONS:
ABSENT
```

Important boundary:

```text
REUSE / GENERALIZE EXISTING AUTHORITY WHERE APPROPRIATE
DO NOT BUILD FinanceReliability
```

The old audit explicitly notes that some strongest reliability primitives are still Planner-named, so generic reuse must be proven during implementation design rather than assumed.

---

# 09. FRONTEND PRODUCT TRUTH REBASE

V1.0 left frontend detail pending.

V1.1 freezes it.

Therefore the old Current frontend evidence must now be compared against a real surface target.

---

# 09.1 Current frontend primitives proven by old audit

## Generic — reusable YES

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

## Shared / partial

```text
QuickActionSheet
HouseholdSwitcherSheet
numeric/decimal input usage
Inventory filter pattern
Planner filters
progress display
calendar projection
modal/sheet pattern
PlannerStateView
frontend serverState mutation tracking
Planner reliability UI/runtime patterns
```

## Explicitly absent in old audit

```text
dedicated money input
currency selector
account selector
transaction-type segmented control
budget bars/charts
obligation-tuned recurrence editor
payment status controls
transaction history/trash views
Finance screen/navigation/service
Finance tests
```

---

# 09.2 APP SHELL → MORE → FINANZAS

## Target

```text
APP SHELL
→ MORE
→ FINANZAS
```

No Finance-specific shell/navbar/design system.

## Current evidence

Global App Shell/shared top-bar/action-sheet/navigation foundations exist.

No active Finance screen/navigation/service found.

## Current result

```text
HOST SHELL:
PRESENT / REUSABLE

FINANCE ENTRY:
ABSENT
```

Implementation must extend host navigation only.

---

# 09.3 Finance Financial Context Selector

## Target

```text
Personal ▾
or
Familia García ▾
```

Switch changes Finance scope, not global Household shell.

## Current evidence

```text
HouseholdSwitcherSheet
Household/member identity
personal/shared Planner precedents
```

No Finance-specific context selector.

## Current result

```text
TARGET:
ABSENT

REUSABLE UX/IDENTITY FOUNDATION:
PARTIAL
```

Important:

`HouseholdSwitcherSheet` is not automatically the Finance selector because V1.1 explicitly says the Finance context switch does not change global App Shell Household.

---

# 09.4 Primary Tabs — Resumen / Movimientos / Pagos

## Target

Exactly:

```text
Resumen
Movimientos
Pagos
```

## Current evidence

No active Finance UI.

Old audit did not prove a generic segmented-tab primitive matching this contract.

## Current result

```text
FINANCE TABS:
ABSENT

GENERIC SEGMENTED CONTROL REUSE:
NOT PROVEN BY OLD AUDIT
```

Do not invent a new global component solely because reuse was not proven; implementation phase must Existing-first inspect local UI before deciding.

---

# 09.5 Resumen

## Target

Shows:

```text
period
Expense
Income
Net
Budget state
spending composition
relevant Finance Attention
Analysis entry
```

## Current evidence

Reusable:

```text
AppCard
AppText
AppScreen
progress display precedent
Home projection precedent
EmptyState
ErrorState
Skeleton
```

No Finance data/read models.

## Current result

```text
SURFACE FRAMEWORK:
PARTIAL

FINANCE CONTENT/DATA:
ABSENT
```

---

# 09.6 Period Navigation

## Target

```text
‹ AGOSTO 2026 ›
```

month navigation in Resumen/Movimientos/Análisis.

## Current evidence

Planner calendar projection and DatePickerSheet exist.

No Finance month-period navigator was demonstrated.

## Current result

```text
FINANCE PERIOD NAVIGATION:
ABSENT

REUSABLE DATE/CALENDAR PRIMITIVE:
PARTIAL
```

---

# 09.7 Movimientos List

## Target

```text
Movimientos
+
quick filters
detailed filters
grouped chronology
Movement Detail
```

## Current evidence

Reusable generic/list patterns:

```text
AppScreen
AppText
AppCard
Inventory filter usage
Planner filters
EmptyState
ErrorState
Skeleton
```

No Finance transaction service/list.

## Current result

```text
FINANCE MOVEMENTS:
ABSENT

LIST/FILTER UX FOUNDATION:
PARTIAL
```

---

# 09.8 Canonical Money Flow

## Target

```text
[ Gasto | Ingreso | Transferir ]
```

same canonical flow reusable from local and future global entry points.

## Current evidence

No Finance flow.

Old audit explicitly says transaction-type segmented control is missing for Finance.

## Current result

```text
ABSENT
```

Do not create separate Gasto/Ingreso/Transfer systems.

---

# 09.9 Expense Form

## Target

Fast, minimum friction.

Account and Category optional.

Context visible.

## Current evidence

Reusable:

```text
AppInput
AppButton
ActionSheet
DatePickerSheet
numeric/decimal input usage
generic modal/sheet pattern
```

No Finance validation/data model.

## Current result

```text
FINANCE FORM:
ABSENT

GENERIC FORM PRIMITIVES:
PARTIAL/YES
```

---

# 09.10 Income Form

Same Current result as Expense form:

```text
FINANCE BEHAVIOR:
ABSENT

FORM PRIMITIVES:
REUSABLE
```

Account remains optional under Target; no Current Finance Account selector exists.

---

# 09.11 Transfer Form + Impact Preview

## Target

Shows Source, Destination, amount, optional commission and projected before/after effect.

## Current evidence

No Finance Transfer or preview.

Generic numeric inputs/cards exist.

## Current result

```text
TRANSFER FORM:
ABSENT

FINANCIAL IMPACT PREVIEW:
ABSENT

GENERIC PRESENTATION PRIMITIVES:
PARTIAL
```

---

# 09.12 Money-Aware Input

## Target

Requires:

```text
numeric keyboard
locale-aware formatting
Currency visible
derived sign
easy correction
unknown != zero
zero validation
```

## Current evidence

Old audit demonstrated:

```text
AppInput
keyboardType="decimal-pad"
generic numeric fields
```

and explicitly said:

```text
dedicated money input:
missing
```

No durable Finance money type/currency semantics exist.

## Current result

```text
TARGET STATUS:
PARTIAL

NUMERIC KEYBOARD:
PRESENT

MONEY FORMATTER/PRIMITIVE:
ABSENT / NOT PROVEN

FINANCE MONEY SEMANTICS:
ABSENT
```

This is a real V1.1 frontend delta candidate, but not yet named a Real Gap until the next matrix.

---

# 09.13 Movement Filters

## Target

Quick:

```text
Todos
Gastos
Ingresos
Transferencias
```

Detailed:

```text
Category
Account
Currency
```

## Current evidence

Inventory and Planner filtering patterns exist.

No Finance filters.

## Current result

```text
FILTERING PATTERN:
PARTIAL / REUSABLE

FINANCE FILTER MODEL:
ABSENT
```

---

# 09.14 Movement Detail / “Algo está mal”

## Target

Detail exposes contextual correction entry:

```text
Lo anoté mal
Me devolvieron dinero
Esto nunca ocurrió
```

## Current evidence

Generic detail/sheet/action UI patterns and Planner trash/undo exist.

No Finance correction/refund/trash flow.

## Current result

```text
UI SHELL/PATTERNS:
PARTIAL

FINANCE ACTION SEMANTICS:
ABSENT
```

---

# 09.15 Pagos Primary Surface

## Target

Urgency order:

```text
VENCIDOS
PRÓXIMOS
MÁS ADELANTE
PAGADOS / RESUELTOS RECIENTEMENTE
```

## Current evidence

No Finance Payment domain/UI.

Planner temporal/attention list patterns exist.

## Current result

```text
PAGOS SURFACE:
ABSENT

TEMPORAL/ATTENTION PATTERN:
PARTIAL
```

---

# 09.16 Create Expected Payment

## Target

Human form for:

```text
name
expected amount optional
due date
recurrence
Financial Context
```

## Current evidence

Reusable:

```text
AppInput
DatePickerSheet
ActionSheet
Planner recurrence precedent
```

No Finance expected Payment model.

## Current result

```text
FINANCE FORM/DOMAIN:
ABSENT

UI/SCHEDULING PRIMITIVES:
PARTIAL
```

---

# 09.17 Payment Detail / Register Payment

## Target

Payment Detail exposes:

```text
pending/paid state
Register Payment
recurrence history
skip/pause/end actions when applicable
```

Register Payment creates Finance truth.

## Current evidence

No Finance Payment UI/model.

Planner detail/state/action patterns exist.

## Current result

```text
ABSENT

GENERIC DETAIL/ACTION PRIMITIVES:
PARTIAL
```

---

# 09.18 Análisis

## Target

Single merged surface for:

```text
spending analytics
Budget state
category composition
period comparison
Budget management entry
```

No separate Reports tab and no duplicated Budget Detail.

## Current evidence

No Finance reports/budget.

Generic cards/progress surfaces exist.

## Current result

```text
ANALYTICS DATA:
ABSENT

PRESENTATION FOUNDATION:
PARTIAL
```

Do not create a `Reports` navigation subsystem.

---

# 09.19 Manage Budget

## Target

Contextual action from Análisis.

## Current evidence

Generic inputs/buttons/sheets exist.

No Finance Budget domain.

## Current result

```text
FINANCE BUDGET UI:
ABSENT

GENERIC FORM PRIMITIVES:
REUSABLE
```

---

# 09.20 Finance Root Overflow

## Target

Only:

```text
Cuentas
Categorías
Papelera
```

No generic `Administrar finanzas`.

## Current evidence

ActionSheet/overflow-like interaction primitives exist.

No Finance root.

## Current result

```text
GENERIC ACTION CONTAINER:
PRESENT

FINANCE MENU:
ABSENT
```

---

# 09.21 Accounts Surface

## Target

Account list by Currency, current Financial Context, archived-account entry.

## Current evidence

No Finance Account UI.

List/card/empty-state primitives exist.

## Current result

```text
ABSENT

GENERIC LIST/EMPTY UI:
REUSABLE
```

---

# 09.22 Account Empty State

## Target

Must explicitly communicate:

```text
Finance works without Accounts.
```

## Current evidence

Generic `EmptyState` exists and is reusable.

## Current result

```text
EMPTY STATE PRIMITIVE:
PRESENT

FINANCE COPY/BEHAVIOR:
ABSENT
```

---

# 09.23 Create Account — Edit + Review

## Target

Low-frequency persistent entity:

```text
Edit
→ Review
→ Commit
```

Daily Expense does not use the same confirmation burden.

## Current evidence

Generic:

```text
AppInput
AppButton
ActionSheet/modal
```

Old audit did not identify a canonical generic review-before-commit primitive.

## Current result

```text
FINANCE CREATE ACCOUNT:
ABSENT

FORM PRIMITIVES:
PRESENT

CANONICAL REVIEW STEP PRIMITIVE:
NOT PROVEN BY OLD AUDIT
```

This must be inspected Existing-first at implementation time before creating a new shared review pattern.

---

# 09.24 Account Detail

## Target

Standard Account:

```text
Saldo actual
latest Movements
Edit
Correct Balance
Archive
```

Credit Card:

```text
Deuda actual
```

## Current evidence

No Finance detail surface.

Generic AppScreen/Card/Text patterns exist.

## Current result

```text
ABSENT

GENERIC DETAIL PRIMITIVES:
PARTIAL
```

---

# 09.25 Categories Surface

## Target

```text
native + custom
custom create/edit/delete
```

## Current evidence

No Finance Category UI/domain.

Generic filters/forms exist.

## Current result

```text
ABSENT

GENERIC FORM/LIST:
REUSABLE
```

---

# 09.26 Papelera

## Target

Finance Trash contains Transactions and Restore.

Not Archive.

## Current evidence

Planner trash/restore patterns and UndoToast exist.

No Finance transaction trash view/effect replay.

## Current result

```text
TRASH/RESTORE PRECEDENT:
PARTIAL

FINANCE PAPELERA:
ABSENT
```

---

# 09.27 Generic Archived Surface

## V1.1 target

```text
DOES NOT EXIST
```

## Current evidence

No active Finance UI exists.

## Current V1.1 result

```text
NON-TARGET ALIGNMENT BY ABSENCE:
YES
```

This does NOT count as implemented Finance capability.

---

# 09.28 Error Prevention / Recovery

## Target

Includes:

```text
money-aware input
Context visibility
Source visibility
Transfer preview
proportional confirmation
history-safe correction
double-submit protection
```

## Current evidence

Reusable:

```text
ErrorState
mutation contracts
idempotency keys
serverState pending/reconcile/rollback
Planner reliability patterns
numeric input
```

Missing:

```text
Finance error mapping
money input
Finance mutation adapter
Finance transfer preview
Finance Context/Source UI
```

## Current result

```text
FOUNDATION:
PARTIAL / STRONG

FINANCE-SPECIFIC UX:
ABSENT
```

---

# 09.29 Empty States

## Target

Finance remains useful without:

```text
Budget
Accounts
Payments
Transactions
```

and shows context-appropriate empty states.

## Current evidence

Generic `EmptyState` exists.

## Current result

```text
GENERIC PRIMITIVE:
PRESENT

FINANCE EMPTY-STATE CONTRACTS:
ABSENT
```

---

# 09.30 Frontend Tests

## Target implication

V1.1 frontend behavior must be verifiable.

## Current evidence

Strong shared/core/Planner test infrastructure exists.

Finance-specific tests absent.

## Current result

```text
TEST INFRASTRUCTURE:
PRESENT / REUSABLE

FINANCE TESTS:
ABSENT
```

---

# 10. OLD 62 ACCEPTANCE ROWS — V1.1 DISPOSITION

The old Current audit covered 62 V1.0 acceptance rows.

They are not all discarded.

## 10.1 Rows whose Current evidence remains materially usable

```text
1–29
31–45
52–60
61–62
```

subject to V1.1 wording updates.

## 10.2 Row requiring direct rewrite

Old row:

```text
30
Category archive preserves history
```

V1.1 replacement:

```text
Native categories required
Custom create/edit/delete
Delete removes future selection
Historical Transactions preserve meaning
```

Current result remains:

```text
Finance category authority absent
generic category/filter precedent partial
```

but the target is different.

## 10.3 Credit Card row requires reframing

Old:

```text
22
Credit card behaves as negative-balance account
```

New:

```text
Credit Card is explicit Account type/presentation
purchase = Expense
payment = Transfer
advanced card tracking Future
```

Current remains absent.

## 10.4 Planner composition rows leave Finance Core

Old rows:

```text
46
48
49
50
51
```

covered Finance↔Planner behavior.

V1.1 moves Finance↔Planner to:

```text
DEFERRED CROSS-MODULE TARGET
```

Their Current evidence is preserved for future integration, but they must not drive Finance Core Real Gaps.

Row 46 principle:

```text
Task completion ≠ Payment
```

remains a global invariant if/when integration exists.

It is not a reason to build the integration now.

## 10.5 Row 57 increases in Core relevance

Old:

```text
Attention surfaces payment due/overdue/budget exceeded
```

V1.1 makes this the normal payment reminder path.

Current remains:

```text
Attention authority precedent:
PARTIAL

Finance Attention producer:
ABSENT
```

## 10.6 Frontend acceptance expands beyond old 62-row matrix

V1.1 now freezes many frontend contracts that were not fully represented as individual V1.0 acceptance rows.

Therefore the next `CURRENT + DONOR vs TARGET V1.1` matrix must include a separate frontend capability section rather than pretending the old 62 rows are sufficient.

---

# 11. V1.1 DELTA REGISTER — CURRENT RESULT

| Delta | New V1.1 target | Current evidence result | Rebase consequence |
|---|---|---|---|
| D-01 | Payment reminder defaults to Attention/Notifications, not Planner | Attention partial; Finance source absent; Planner seam present | Remove Planner from Finance Core dependency |
| D-02 | Category native + custom CRUD/delete | No Finance category authority | Rewrite category target/gap |
| D-03 | Native category baseline required | No Finance category system; content seed infrastructure not proven | New Target coverage item |
| D-04 | Budget no generic Archive | No Finance Budget | Remove Archive requirement |
| D-05 | Historical Budget target + future applicability | No Budget history model | Recalculate Budget residual |
| D-06 | Credit Card explicit Account type/presentation | No Account/Card authority | Add small Account type target, not subsystem |
| D-07 | Frontend Product Truth frozen | No Finance UI; many shared primitives exist | Replace "frontend specification gap" with implementation-gap comparison |
| D-08 | Analysis + Budget Detail merged | No Finance analytics; cards/progress partial | No Reports/Budget duplicate surface |
| D-09 | Generic Archived surface removed | No Finance UI | Aligns by absence; not positive capability |
| D-10 | Account create Review | Generic forms/modal exist; canonical review primitive not proven | Implementation-time Existing-first check |
| D-11 | Money-aware input explicitly required | decimal input exists; dedicated money primitive absent | Candidate frontend/shared primitive gap |
| D-12 | Transfer impact preview explicitly required | generic cards/input only; no Finance preview | Candidate Finance UX gap |
| D-13 | Finance scope selector separated from global Household switch | Household switcher exists; Finance selector absent | Extend current identity/shell, do not reuse semantics blindly |
| D-14 | Root hierarchy Resumen/Movimientos/Pagos + secondary Cuentas/Categorías/Papelera | No Finance route/surface | Full Finance surface implementation remains absent |

---

# 12. WHAT CURRENT CAN NOW BE TREATED AS REUSABLE WITH HIGH CONFIDENCE

```text
IDENTITY / SCOPE FOUNDATION
- public.people
- public.households
- public.household_members
- current_person_id()
- active household helpers
- self/household RLS patterns

MUTATION / HISTORY FOUNDATION
- mutationContracts.js
- audit_events
- append-only audit protection
- outbox_events
- request_id / mutation_id
- outbox processing
- frontend mutation IDs / idempotency / If-Match
- serverState pending/reconcile/rollback

UI FOUNDATION
- AppButton
- AppInput
- AppCard
- AppScreen
- AppText
- ActionSheet
- DatePickerSheet
- TimePickerSheet
- UndoToast
- EmptyState
- ErrorState
- Skeleton
- AppTopBar
- InteractivePressable

CROSS-SYSTEM PRECEDENTS
- Home projection
- Attention projection
- Search capability gates
- notification preference key
- Inventory ownership precedent
- Planner origin metadata
```

These are reusable capabilities, not permission to duplicate them.

---

# 13. WHAT CURRENT STILL DOES NOT PROVIDE

After V1.1 rebase, Current still does not provide an active Finance implementation for:

```text
Financial Context authority
Finance privacy projections
Accounts
Credit Card Account type
Unknown Balance
Balance Anchor
Balance Correction
Income
Expense
Transfer
Source vs Financial Context
Contribution / reimbursement semantics
financial transaction history
Refund
Finance Categories
native category baseline
Budget
Budget history/future applicability
Finance Reports/read models
multicurrency Finance behavior
expected Payments
recurring Payment occurrences
Register Payment
Payment state reconciliation
Finance Attention signals
Finance Home projection
Finance Search projection
Finance routes/services/controllers
Finance navigation
Finance screens
Finance tests
Money-aware input
Account selector
Currency selector
transaction-type segmented flow
Finance filter model
Transfer effect preview
Finance Trash surface
```

Important:

Some lines above may compose with shared primitives.

They are still not implemented Finance capabilities.

---

# 14. WHAT MUST NOT BECOME A FINANCE CORE GAP

Because V1.1 explicitly defers these:

```text
Finance ↔ Planner composition
Inventory connected purchase resolution
Assets connected service/repair resolution
HomeCloud document implementation
generic Connected Task framework
user-defined cross-domain Task composition
connected presets
generalized orchestration
```

Current may already contain partial seams for some of them.

That does not make them Finance Core work.

---

# 15. FRONTEND REUSE CONFIDENCE MAP

## CONFIRMED REUSABLE

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

## CONFIRMED PARTIAL / MODULE-SPECIFIC PRECEDENT

```text
QuickActionSheet
HouseholdSwitcherSheet
numeric decimal-pad input
Inventory filtering
Planner filtering
progress displays
calendar projection
modal/sheet usage
PlannerStateView
Planner reliability runtime
```

## EXPLICITLY MISSING FOR FINANCE IN OLD AUDIT

```text
dedicated money input
currency selector
account selector
transaction-type segmented control
budget bars/charts
obligation recurrence editor
payment status controls
transaction history/trash views
Finance screen/navigation/service
```

## NOT PROVEN EITHER WAY BY OLD AUDIT

Examples that V1.1 now makes worth checking during implementation preflight:

```text
generic review-before-commit primitive
generic three-mode segmented-tab primitive
generic month-period navigator
generic financial effect preview component
```

This document does NOT invent their absence.

---

# 16. CURRENT REBASE IMPACT ON OLD REAL GAP MAP

This is not yet the new Real Gap Map.

It only determines what must change next.

## Likely preserved capability families

Subject to donor/target recombination:

```text
Financial Context / privacy
Account authority / balance lifecycle
Transactions
Canonical Transfer
Financial history / correction / trash / restore
Refund
Payment/recurrence Finance domain
Reports / multicurrency
Geni/Automations canonical operation boundary
```

## Must be rewritten

```text
Category gap
Budget lifecycle gap
Frontend gap
Attention/Notifications composition wording
```

## Must leave Finance Core

```text
Planner Composition and Payment Reconciliation
```

## Must be deferred instead of treated as blockers

```text
Inventory relation
Assets relation
HomeCloud relation
generic connected resolution
```

where V1.1 explicitly defers implementation.

---

# 17. CURRENT REBASE STATUS BY MAJOR V1.1 AREA

| V1.1 area | Current target status | Reuse status |
|---|---|---|
| Personal/Household identity foundation | PARTIAL | HIGH |
| Finance scope/privacy | PARTIAL | PARTIAL |
| Accounts | ABSENT | shared foundations only |
| Credit Card type | ABSENT | account/negative behavior not Current |
| Balances/Anchor/Correction | ABSENT | audit partial |
| Income/Expense/Transfer | ABSENT | mutation/audit partial |
| Source vs Context | ABSENT | privacy foundation partial |
| Contributions/Reimbursements | ABSENT | none domain-specific |
| History/Trash/Restore | PARTIAL | HIGH shared precedent |
| Refund | ABSENT | audit/history foundation partial |
| Categories | ABSENT | generic field/filter precedent partial |
| Budgets | ABSENT | generic numeric/form precedent partial |
| Reports/Analytics | ABSENT | projection/UI precedent partial |
| Multicurrency | ABSENT | generic amount/currency vocabulary partial |
| Expected Payments | ABSENT | scheduling/recurrence precedent partial |
| Payment occurrences | ABSENT | Planner occurrence precedent partial |
| Register Payment | ABSENT | mutation foundation partial |
| Payment Attention path | PARTIAL | Attention authority partial |
| Notifications | PARTIAL | prefs/adapter partial |
| Home projection | PARTIAL | Home precedent partial |
| Search projection | PARTIAL | Search authority precedent partial |
| Reliability | PARTIAL | strong existing foundation |
| Finance App entry | ABSENT | host shell present |
| Resumen | ABSENT | UI primitives partial |
| Movimientos | ABSENT | list/filter primitives partial |
| Pagos | ABSENT | list/temporal primitives partial |
| Análisis | ABSENT | cards/progress partial |
| Cuentas UI | ABSENT | list/form/empty primitives partial |
| Categorías UI | ABSENT | list/form primitives partial |
| Papelera | ABSENT | trash/undo precedent partial |
| Money input | PARTIAL | numeric keyboard present; finance primitive absent |
| Account Review | ABSENT target | generic review primitive not proven |
| Finance tests | ABSENT | test harness present |
| Planner composition | DEFERRED | existing seam preserved |
| Inventory/Assets/HomeCloud connected resolution | DEFERRED | partial/absent Current evidence, non-blocking for Core |

---

# 18. FINAL CURRENT REBASE VERDICT

```text
FINANCE_CURRENT_CAPABILITY_REBASE_V1_1

OLD CURRENT AUDIT:
REUSED

REPOSITORY RE-AUDIT:
NOT PERFORMED

REASON:
CONTROL CONFIRMS CURRENT CODE UNCHANGED

OLD CURRENT EVIDENCE:
STILL AUTHORITATIVE FOR THIS REBASE

ACTIVE FINANCE DOMAIN IN CURRENT:
NO

SHARED HOMePLUS FOUNDATIONS:
STRONG / REUSABLE

V1.1 CORE:
NOT IMPLEMENTED

V1.1 FRONTEND:
NOT IMPLEMENTED

PLANNER COMPOSITION:
CURRENT SEAM EXISTS
BUT REMOVED FROM FINANCE CORE TARGET

CATEGORY TARGET:
REBASed TO NATIVE + CUSTOM CRUD/DELETE + HISTORY

BUDGET TARGET:
REBASed TO PERIOD HISTORY + FUTURE APPLICABILITY
NO GENERIC ARCHIVE

FRONTEND SPECIFICATION GAP:
CLOSED AT PRODUCT LEVEL

FRONTEND IMPLEMENTATION GAP:
STILL TO BE CALCULATED AGAINST V1.1

DIRECT IMPLEMENTATION AUTHORIZED:
NO

NEXT GATE:
CURRENT + DONOR vs TARGET V1.1
```

---

# 19. NEXT REQUIRED SEQUENCE

```text
FINANCE PRODUCT FREEZE V1.1
        ✅

DONOR CAPABILITY REBASE V1.1
        ✅

CURRENT CAPABILITY REBASE V1.1
        ✅

CURRENT + DONOR vs TARGET V1.1
        ← NEXT

REAL GAP MAP V1.1
        ↓

MINIMAL INTEGRATION PLAN V1.1
        ↓

IMPLEMENT FINANCE CORE
```

Before actual code changes, implementation Control should still perform a minimal safety preflight:

```text
branch
HEAD
git status
diff
```

That preflight confirms repository state.

It is not another full Current capability audit.

# END OF DOCUMENT
