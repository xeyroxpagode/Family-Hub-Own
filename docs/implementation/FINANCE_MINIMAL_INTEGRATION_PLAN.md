# HOMePLUS Finance - Minimal Integration Plan

Status: FINANCE_MINIMAL_INTEGRATION_PLAN_COMPLETE
Revision: PRE-FZ-01 CONTROL CORRECTION PASS applied.
Date: 2026-08-10
Mode: CAPABILITY ORDER + FREEZE STRATEGY + TEST STRATEGY, NO IMPLEMENTATION

This plan converts the accepted 15 Real Gaps into a minimal execution strategy. It does not define schema, table names, migration files, RPC names, endpoints, services, hooks, screens, components, folder structure, exact tests, branches, commits, or implementation prompts.

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

## 2. Accepted Authorities

| Authority | Path | Planning use |
|---|---|---|
| Current audit | `docs\implementation\FINANCE_CURRENT_CAPABILITY_AUDIT.md` | Current authorities to preserve. |
| Donor audit | `docs\implementation\FINANCE_DONOR_CAPABILITY_AUDIT.md` | Donor behavior/provenance and rejected architecture. |
| Current + Donor matrix | `docs\implementation\FINANCE_CURRENT_DONOR_VS_TARGET_MATRIX.md` | Target coverage and donor candidate disposition. |
| Real Gap Map R1 | `docs\implementation\FINANCE_REAL_GAP_MAP.md` | 15 gaps, 49 dependency edges, DAG PASS, topological tiers, blockers, traceability. |

Current Finance documents are untracked. This plan does not add, commit, or stage them. Before implementation begins, Control should decide how these artifacts are preserved in Git.

## 3. Planning Principles

- Use the Real Gap Map DAG as a constraint, not as a wave plan.
- Freeze capability boundaries before implementation.
- Do not create parallel Auth, Household, Planner, Home, Attention, Notifications, Search, Inventory, reliability, or shared UI authorities.
- Donor candidates are placed inside HOMePLUS-owned gaps; there is no donor wave.
- **Local Supabase is a hard pre-code gate:** no prompt may modify Finance code until `LOCAL SUPABASE STATUS PASS`. It must then remain available for migrations, RLS, constraints, atomicity, history and DB-behavior gates. Remote Supabase remains prohibited without explicit Control authorization.
- Frontend detail is a specification dependency, not an architectural blocker.
- Assets and HomeCloud are external canonical-authority dependencies for their FIN-GAP-013 subparts only; they do not block all Finance.

## 4. Implementation Units

| Unit | FIN-GAP(s) | Freeze boundary | Classification | Prerequisites | Parallelism | DB requirement |
|---|---|---|---|---|---|---|
| FIU-01 Financial Context and Privacy | FIN-GAP-001 | Individual freeze | STRUCTURAL | Existing Auth/Household/RLS authority | SERIAL | Static freeze possible: YES. Local DB before any Finance code: HARD GATE. Local DB for test gate: YES. |
| FIU-02 Account and Balance Authority | FIN-GAP-002 | Individual freeze | STRUCTURAL | FIU-01 freeze; donor balance behavior | SERIAL | Static freeze possible: YES. Local DB before any Finance code: HARD GATE. Local DB for test gate: YES. |
| FIU-03 Transaction and Category Foundation | FIN-GAP-003, FIN-GAP-007 | Shared implementation unit; separate `FZ-03A Transaction Authority` and `FZ-03B Category Authority` | STRUCTURAL | FIU-01 and FIU-02 freezes; donor ledger/category behavior | SERIAL | Static freezes possible: YES. Local DB before any Finance code: HARD GATE. Local DB for test gate: YES. |
| FIU-04 Canonical Transfer | FIN-GAP-004 | Individual freeze after accepted Financial History Policy gate | STRUCTURAL | FIU-01, FIU-02, FIU-03A freezes; stable transaction/account contracts; Financial History Policy accepted | SERIAL | Static freeze possible: YES. Local DB before any code: HARD GATE. Local DB for test gate: YES. |
| FIU-05 Financial History and Trash | FIN-GAP-005 | Individual freeze | STRUCTURAL | FIU-03 and FIU-04 freezes; stable financial-effect contracts | SERIAL | Static freeze possible: YES. Local DB before any Finance code: HARD GATE. Local DB for test gate: YES. |
| FIU-06 Refund Lifecycle | FIN-GAP-006 | Individual freeze | STRUCTURAL | FIU-03 and FIU-05 freezes; implementation may wait for stable history contract | SERIAL | Static freeze possible: YES. Local DB before any Finance code: HARD GATE. Local DB for test gate: YES. |
| FIU-07 Budget and Savings | FIN-GAP-008 | Individual freeze | STRUCTURAL | FIU-01-06 and FIU-03 category sub-freeze | SERIAL on core path | Static freeze possible: YES. Local DB before any Finance code: HARD GATE. Local DB for test gate: YES. |
| FIU-08 Obligations, Payments, Recurrence | FIN-GAP-009 | Individual freeze | STRUCTURAL | FIU-01, FIU-03, FIU-05 freezes; does not require Budget or Reports | PARALLEL AFTER CONTRACT | Static freeze possible: YES. Local DB before any Finance code: HARD GATE. Local DB for test gate: YES. |
| FIU-09 Planner Composition | FIN-GAP-010 | Individual integration freeze | STRUCTURAL | FIU-08 freeze; Current Planner authority | PARALLEL AFTER CONTRACT | Static freeze possible: YES. Local DB before any Finance code: HARD GATE. Local DB for test gate: YES. |
| FIU-10 Reports, Multicurrency and Upcoming Obligations | FIN-GAP-011 | Individual freeze | STANDARD | FIU-01-08 freezes; FIN-GAP-009 Obligation/Occurrence contract is required for Upcoming Obligations | SERIAL after financial truth | Static freeze possible: YES. Local DB before any code: HARD GATE. Local DB for test gate: YES. |
| FIU-11 Home, Attention, Notifications, Search | FIN-GAP-012 | Shared cross-module integration freeze with authority-specific sections | STRUCTURAL | FIU-01, FIU-07, FIU-08, FIU-10 freezes | SERIAL after projections stabilize | Static freeze possible: YES. Local DB before any Finance code: HARD GATE. Local DB for test gate: YES. |
| FIU-12 Inventory, Assets, HomeCloud Boundary | FIN-GAP-013 | Split freeze: Inventory subpart planable; Assets/HomeCloud subparts deferred | STRUCTURAL | FIU-01; Current Inventory; Assets/HomeCloud canonical authorities for those subparts | DEFERRED/BLOCKED for external subparts | Static freeze possible: PARTIAL. Local DB before any Finance code: HARD GATE for Inventory subpart; external subparts blocked. Local DB for test gate: YES. |
| FIU-14 Mobile Finance Surface | FIN-GAP-015 | Deferred freeze after Frontend Detail Pass | STANDARD | Product-facing Finance contracts stable; Frontend Detail Pass | SPECIFICATION REQUIRED | Static freeze possible: NO until detail pass. Local DB before any Finance code, including UI: HARD GATE. Local DB for completion/integration gate: YES. |

Executable implementation units in the current Finance lane: 13 (`FIU-01` through `FIU-12`, plus `FIU-14`). `FIU-13` is retired as an executable unit: FIN-GAP-014 is handled by `FZ-10` as a Finance-side contract freeze, while runtime Geni/Automations integrations are deferred. All 15 FIN-GAPs remain accounted for.

## 5. Freeze Queue

| Order | Freeze Unit | FIN-GAP(s) | Why now | Needs previous implementation or only previous freeze? |
|---:|---|---|---|---|
| 1 | FZ-01 Financial Context and Privacy | FIN-GAP-001 | Tier 0; every persistent/private Finance behavior depends on this boundary. | Existing Current authority only; no previous Finance implementation. |
| 2 | FZ-02 Account and Balance Authority | FIN-GAP-002 | Establishes account/balance truth before transactions and transfers. | Previous freeze required; implementation of FZ-01 may be needed before completion. |
| 3 | FZ-03A Transaction Authority | FIN-GAP-003 | Transaction authority must be frozen independently; Transaction does not conceptually depend on Category. | FZ-01/FZ-02 required; previous implementation likely needed before completion. |
| 4 | FZ-03B Category Authority | FIN-GAP-007 | Category is optional classification extending Expense semantics and must not become a prerequisite for Transaction existence. | FZ-03A contract required; no separate wave required. |
| 5 | FZ-04 Canonical Transfer | FIN-GAP-004 | Transfer atomicity depends on stable account/transaction contracts and an accepted Financial History Policy. | FZ-01/FZ-02/FZ-03A + Financial History Policy required; implementation likely needed for atomicity tests. |
| 6 | FZ-05 Financial History and Trash | FIN-GAP-005 | Completes effect-specific correction/trash/restore once transaction/transfer effects are defined. | FZ-03A/FZ-04 required; transaction/transfer implementation likely needed before completion. |
| 7 | FZ-06 Refund Lifecycle | FIN-GAP-006 | Refund depends on transaction authority and history lifecycle; Budget/Reports consume it downstream. | FZ-03A/FZ-05 required; previous implementation likely needed before completion. |
| 8 | FZ-07 Obligations, Payments, Recurrence | FIN-GAP-009 | Can start after context, transaction and history contracts; need not wait for Budget/Reports. | FZ-01/FZ-03A/FZ-05 required; implementation can proceed parallel after core contracts stabilize. |
| 9 | FZ-08 Budget and Savings | FIN-GAP-008 | Consumes accounts, transactions, transfers, refunds and categories. | Prior freezes required; prior implementations likely needed for capability tests. |
| 10 | FZ-09 Planner Composition | FIN-GAP-010 | Planner integration depends on Obligation/Payment lifecycle boundary. | FZ-07 required; prior implementation of Obligations likely needed before completion. |
| 11 | FZ-10 External Canonical Consumer Boundary | FIN-GAP-014 | Freeze Finance-side write/read/privacy/authority principles only. Geni implementation is deferred; Automations integration is deferred pending a future canonical-authority capability check. | Canonical Finance operation freezes required; no external implementation is authorized. |
| 12 | FZ-11 Reports, Multicurrency and Upcoming Obligations | FIN-GAP-011 | Reports consume financial truth, refunds, budgets, currency and FIN-GAP-009 Obligation/Occurrence truth for Upcoming Obligations. | FZ-02–FZ-08 plus FZ-07 Obligation contract; substantial prior implementation required for completion. |
| 13 | FZ-12 Home, Attention, Notifications, Search | FIN-GAP-012 | Consumes reporting, budget, obligation and privacy projections. | FZ-01/FZ-07/FZ-08/FZ-11 required; prior implementations likely needed for integration tests. |
| 14 | FZ-13 Inventory Relationship | FIN-GAP-013 Inventory subpart | Inventory authority exists enough to plan relationship boundary. | FZ-01 context/privacy required; implementation may run independently after contract. |
| 15 | FZ-14 Assets/HomeCloud Relationship | FIN-GAP-013 Assets/HomeCloud subparts | External canonical authorities are not demonstrated. | Deferred; requires external canonical authority first. |
| 16 | FZ-15 Mobile Finance Surface | FIN-GAP-015 | Requires Frontend Detail Pass and stable product-facing Finance contracts. | Specification dependency and prior freezes required; not every backend implementation must be complete to begin detail pass. |

Freeze units: 16 because `FZ-03` is now explicitly split into `FZ-03A` and `FZ-03B`; FIN-GAP-013 remains split into Inventory and Assets/HomeCloud freezes. `FZ-10` is freeze-only and does not create an executable Geni/Automations FIU.

Recommended next freeze: FZ-01 Financial Context and Privacy.

Why: it is Tier 0, has no Finance prerequisite, preserves Current Auth/Household/RLS, and blocks safe design of account, transaction, transfer, reports, Home/Search, and mobile privacy.


### Financial History Policy — hard design precondition before FZ-04

Before `FZ-04 Canonical Transfer` may be accepted, Control must accept a minimal **Financial History Policy**. This is a policy gate, not a new subsystem and not a separate FIN-GAP. It freezes:

- no silent rewrite of financial truth;
- no hard delete as normal financial-history strategy;
- corrections preserve history;
- Trash removes current financial effects without destroying recoverability;
- Restore principle;
- paired Transfer effects remain coherent through correction/trash/restore;
- audit/request/mutation correlation principle.

`FZ-04` may then design Transfer against that policy. `FZ-05` remains responsible for completing effect-specific correction/trash/restore behavior.

## 6. Donor Adaptation Placement

| Donor candidate | Phase 3 likelihood | Expected donor use | HOMePLUS owner | Adaptation boundary | Used by unit |
|---|---|---|---|---|---|
| DC-ADAPT-001 Ledger movement representation | MEDIUM | DATA SEMANTIC, VALIDATION/READ MODEL IDEA | Finance | Reinterpret movement behavior under HOMePLUS transaction/history authority. | FIU-03, FIU-10 |
| DC-ADAPT-002 Derived account balances | LOW | ALGORITHM ADAPTATION, SQL PATTERN, TEST IDEA | Finance | Use derived-balance arithmetic; reject donor derived-account authority. | FIU-02, FIU-10 |
| DC-ADAPT-003 Account metadata sidecar | LOW | DATA SEMANTIC / REFERENCE | Finance + Household/Auth | Preserve idea of optional metadata; reject business/personal privacy semantics. | FIU-01, FIU-02 |
| DC-ADAPT-004 Transaction kind validation/filtering | MEDIUM | VALIDATION PATTERN, DATA SEMANTIC | Finance | Keep income/expense/transfer separation; reject account-required assumption. | FIU-03, FIU-10 |
| DC-ADAPT-005 Grouped transfer representation | LOW | DATA SEMANTIC, INVARIANT, TEST IDEA | Finance | Keep paired effects; add HOMePLUS atomicity and source/destination validation later. | FIU-04 |
| DC-ADAPT-006 Nullable transaction category | MEDIUM | VALIDATION PATTERN, DATA SEMANTIC | Finance | Preserve nullable category; add category authority/archive in HOMePLUS. | FIU-03 |
| DC-ADAPT-007 Monthly base/category budget plan | LOW | SQL/READ-MODEL PATTERN | Finance | Use period/category planning behavior; reject donor workspace/reporting architecture. | FIU-07 |
| DC-ADAPT-008 Budget adjustments | LOW | VALIDATION PATTERN, TEST IDEA | Finance | Use budget-plan adjustment ideas only; do not confuse with Balance Adjustment. | FIU-07 |
| DC-ADAPT-009 Budget actual derivation | LOW | ALGORITHM / READ-MODEL PATTERN | Finance | Use transaction-derived actuals; adapt refund/transfer/adjustment exclusions. | FIU-07, FIU-10 |
| DC-ADAPT-010 Reports and aggregation | LOW | SQL/READ-MODEL PATTERN | Finance | Use aggregation concepts; enforce HOMePLUS privacy/context and no FX scope expansion. | FIU-10 |
| DC-ADAPT-011 Native currency with warnings | LOW | INVARIANT, DATA SEMANTIC | Finance | Preserve native currency and no-silent-mix rule; reject automatic FX engine requirement. | FIU-04, FIU-10 |
| DC-ADAPT-012 Account status/suggestions | NONE | REFERENCE ONLY, TEST IDEA | Finance + mobile UI | Do not build archive/status lifecycle from donor; possible UX reference only. | FIU-02, FIU-14 |
| DC-ADAPT-013 Business/personal transfer reporting analogue | NONE | REFERENCE ONLY | Finance + Household/Auth | Reference that cross-context reporting must be explicit; reject as privacy model. | FIU-01, FIU-10 |

Units using donor adaptation: FIU-02, FIU-03, FIU-04, FIU-07, FIU-10.

## 7. Current Authority Composition

| Current authority | Must be consumed by | Preservation rule |
|---|---|---|
| Auth | FIU-01 and all private Finance units | No parallel auth. |
| User/person ownership | FIU-01, FIU-02, FIU-03, FIU-012, FIU-014 | Personal Finance composes with current person ownership. |
| Household | FIU-01 and household-scoped Finance units | Household remains canonical. |
| Membership | FIU-01 and permissioned Finance records | Membership remains canonical. |
| RLS foundations | FIU-01 through FIU-12 | Finance policies compose with current foundations. |
| Planner | FIU-09 | Planner owns tasks/events; Finance composes. |
| Audit/outbox | FIU-02 through FIU-09 | Financial truth and cross-module effects use current reliability foundations. |
| Mutation contracts | FIU-03, FIU-04, FIU-05 | No direct donor SQL authority. |
| Idempotency/reliability | FIU-03, FIU-04, FIU-05 | Finance follows current mutation discipline. |
| Home | FIU-11, FIU-14 | Home consumes Finance projections. |
| Attention | FIU-11, FIU-14 | Attention consumes relevant Finance signals. |
| Notifications | FIU-11 | Notifications consume due/overdue/payment signals. |
| Search | FIU-11 | Search/Geni respect Finance privacy. |
| Inventory | FIU-12 Inventory subpart | Inventory remains owner of Inventory truth. |
| Shared UI/testing | FIU-14 and all test gates | Mobile and tests reuse existing foundations. |

Current authority duplication count: 0 planned.

## 8. Supabase / Runtime Gates

Current audit established local Supabase as unavailable because Docker Desktop Linux engine was unavailable. This plan does not start or fix runtime.

Supabase local required before first implementation: YES — HARD PRE-CODE GATE.

First point where local Supabase is required: **before the first prompt that modifies Finance code**. No Finance code may be written while local Supabase status is unavailable. FIU-01 RLS/privacy implementation begins only after `LOCAL SUPABASE STATUS PASS`; remote Supabase remains prohibited without explicit Control authorization.

| Unit | Local DB required before implementation completion | Local DB required for test gate | Why |
|---|---|---|---|
| FIU-01 | YES | YES | RLS/privacy composition. |
| FIU-02 | YES | YES | Persistent account/balance truth. |
| FIU-03 | YES | YES | Transaction/category authority and permissions. |
| FIU-04 | YES | YES | Transfer atomicity and validation. |
| FIU-05 | YES | YES | DB history/trash/restore behavior. |
| FIU-06 | YES | YES | Refund links/history/report impacts. |
| FIU-07 | YES | YES | Budget calculations and persistence. |
| FIU-08 | YES | YES | Obligation/payment/recurrence lifecycle. |
| FIU-09 | YES | YES | Planner composition with persisted Finance state. |
| FIU-10 | YES | YES | Reporting and currency-safe read models. |
| FIU-11 | YES | YES | Privacy-safe projections and search/attention gates. |
| FIU-12 | YES for Inventory subpart; external subparts deferred | YES | Cross-module ownership/privacy. |
| FIU-14 | YES — hard gate before any Finance code | YES | Frontend Detail Pass may be document-only without DB; UI code starts only after Local Supabase PASS. |

Units requiring local Supabase for completion or test gate: 14.

## 9. Test Strategy

Test levels:

```text
N1 - LOCAL CHECK
Syntax, type, lint, focused unit-level checks where useful.

N2 - CAPABILITY GATE
Capability-specific tests proving the FIN-GAP invariants.

N3 - WAVE GATE
Regression over grouped units in a wave candidate.

N4 - MILESTONE / INTEGRATION GATE
Cross-module and financial invariant regression after a milestone.

N5 - FINAL FINANCE QA
Full Finance acceptance and privacy/history/reporting QA.
```

| Unit | Minimum future test level | Test emphasis |
|---|---|---|
| FIU-01 | N2, N4 | Privacy, RLS, personal/household boundaries. |
| FIU-02 | N2, N3 | Unknown balance, anchor, adjustment, negative balance, historical currency. |
| FIU-03 | N2, N3 | Income/expense/transfer class separation, expense without account, optional category. |
| FIU-04 | N2, N3 | Atomic transfer, source != destination, no double count, dual amounts. |
| FIU-05 | N2, N3 | Correction, trash, restore, history retention. |
| FIU-06 | N2, N3 | Refund != income, cap, orphan prevention, net expense impact. |
| FIU-07 | N2, N3 | Budget advisory, spent derivation, no carry-over, leftover != money. |
| FIU-08 | N2, N3 | Obligation/payment/occurrence/recurrence lifecycle. |
| FIU-09 | N2, N4 | Planner completion != payment, reconciliation, task/obligation independence. |
| FIU-10 | N2, N4 | Reports count once, currency safety, transfer/refund/adjustment exclusions. |
| FIU-11 | N2, N4 | Home/Attention/Search/Notification privacy, dedupe, relevance. |
| FIU-12 | N2, N4 | Ownership boundary for Inventory; Assets/HomeCloud deferred tests later. |
| FIU-14 | N3, N5 | Mobile workflows, privacy rendering, integrated Finance QA. |

Testing is attached to capability units, not planned as a separate product gap.

## 10. Invariant -> Test Owner

| Invariant family | Future test owner unit |
|---|---|
| Personal vs Household privacy never widens | FIU-01 |
| Source vs Financial Context attribution | FIU-01 with FIU-04/FIU-10 coverage |
| Unknown Balance is not zero | FIU-02 |
| Balance Anchor and Balance Adjustment | FIU-02 |
| Balance Adjustment does not contaminate income/expense/budget | FIU-02, with FIU-07/FIU-10 regression |
| Negative balance valid | FIU-02 |
| Account currency immutable historically | FIU-02 |
| Income != Expense != Transfer | FIU-03 |
| Expense may have no Account | FIU-03 |
| Optional category | FIU-03 |
| Category archive preserves history | FIU-03 |
| Transfer atomic | FIU-04 |
| Source != Destination | FIU-04 |
| Transfer no double count | FIU-04, with FIU-10 regression |
| Cross-currency dual amounts | FIU-04, with FIU-10 regression |
| Transaction correction/history | FIU-05 |
| Trash removes current effects, restore reapplies | FIU-05 |
| Refund != Income | FIU-06 |
| Refund cap and orphan prevention | FIU-06 |
| Refund affects net Expense/Budget | FIU-06, with FIU-07/FIU-10 regression |
| Budget advisory and never blocks expense | FIU-07 |
| Budget spent derives from transactions | FIU-07 |
| No automatic carry-over | FIU-07 |
| Budget leftover is not money | FIU-07 |
| Savings via accounts/transfers | FIU-07 with FIU-02/FIU-04 support |
| Obligation != Expense | FIU-08 |
| Overdue derived, recurrence preserves history | FIU-08 |
| Real Payment -> PAID | FIU-08 |
| Payment trash recalculates state | FIU-08 |
| Planner Complete != Payment | FIU-09 |
| Task cancel does not cancel obligation | FIU-09 |
| Reports count each real expense once | FIU-10 |
| Reports do not silently mix currencies | FIU-10 |
| Upcoming Obligations read model consumes FIN-GAP-009 occurrence truth | FIU-10 with FIU-08 source-truth regression |
| Transfer/refund/adjustment report exclusions | FIU-10 |
| Home/Attention/Search privacy and relevance | FIU-11 |
| Notifications consume Finance without owning truth | FIU-11 |
| Inventory/Assets/HomeCloud ownership preserved | FIU-12 |
| Finance canonical operations work without AI and external consumers never own truth | FIU-03 primary; FIU-04/FIU-08 N4 regression under FZ-10 contract |
| Mobile privacy and workflow completeness | FIU-14 |

## 11. Wave Candidates

### WAVE-01 - Finance Authority Foundation

```text
PURPOSE:
Establish privacy, account/balance truth, transaction classification, and category foundation.
FIN-GAPS INCLUDED:
FIN-GAP-001, FIN-GAP-002, FIN-GAP-003, FIN-GAP-007
PREREQUISITES:
Accepted FZ-01, FZ-02, FZ-03A, FZ-03B; local Supabase PASS before any Finance code.
IMPLEMENTATION FREEZES REQUIRED:
FZ-01, FZ-02, FZ-03A, FZ-03B.
CURRENT AUTHORITIES USED:
Auth, user/person ownership, Household, Membership, RLS, audit/outbox, mutation contracts, idempotency/reliability.
DONOR MATERIAL USED:
DC-ADAPT-001, 002, 003, 004, 006, 012 reference, 013 reference.
PARALLELIZATION:
Mostly serial inside wave; category sub-freeze can prepare once transaction contract is stable.
SUPABASE REQUIREMENT:
YES before implementation completion and capability gates.
CAPABILITY TEST GATES:
N2 for each included unit.
WAVE REGRESSION GATE:
N3 foundation regression.
STOP CONDITIONS:
Parallel Auth/Household/RLS, donor workspace import, remote Supabase.
DONE WHEN:
Foundation capability gates pass and no Current authority is duplicated.
```

### WAVE-02 - Movement Integrity

```text
PURPOSE:
Add canonical transfers and financial history/trash lifecycle.
FIN-GAPS INCLUDED:
FIN-GAP-004, FIN-GAP-005
PREREQUISITES:
Stable WAVE-01 contracts; Financial History Policy accepted before FZ-04; FZ-04 and FZ-05 accepted.
IMPLEMENTATION FREEZES REQUIRED:
FZ-04, FZ-05.
CURRENT AUTHORITIES USED:
Audit/outbox, mutation contracts, idempotency/reliability, RLS.
DONOR MATERIAL USED:
DC-ADAPT-005, DC-ADAPT-011; Actual reference for transfer invariant and tombstone/history.
PARALLELIZATION:
Serial; history must understand transfer financial effects.
SUPABASE REQUIREMENT:
YES.
CAPABILITY TEST GATES:
N2 transfer atomicity and history/trash.
WAVE REGRESSION GATE:
N3 movement/history regression.
STOP CONDITIONS:
Non-atomic transfer, direct hard delete as history, donor SQL-agent authority.
DONE WHEN:
Movement and history invariants are proven without duplicate mutation authority.
```

### WAVE-03 - Money Planning

```text
PURPOSE:
Complete refund and budget/savings behavior over financial truth.
FIN-GAPS INCLUDED:
FIN-GAP-006, FIN-GAP-008
PREREQUISITES:
WAVE-02 contracts; FZ-06 and FZ-08 accepted.
IMPLEMENTATION FREEZES REQUIRED:
FZ-06, FZ-08.
CURRENT AUTHORITIES USED:
Audit/outbox, mutation contracts, RLS.
DONOR MATERIAL USED:
DC-ADAPT-007, 008, 009; no donor refund behavior.
PARALLELIZATION:
Refund before budget calculations; budget freeze can prepare from refund contract.
SUPABASE REQUIREMENT:
YES.
CAPABILITY TEST GATES:
N2 refund lifecycle and budget semantics.
WAVE REGRESSION GATE:
N3 money planning regression.
STOP CONDITIONS:
Budget Adjustment confused with Balance Adjustment, refund treated as income, automatic carry-over introduced.
DONE WHEN:
Refund and budget invariants pass and downstream report requirements are stable.
```

### WAVE-04 - Obligations and Planner

```text
PURPOSE:
Add obligations/payments/recurrence and compose them with Planner without moving Planner ownership.
FIN-GAPS INCLUDED:
FIN-GAP-009, FIN-GAP-010
PREREQUISITES:
Context, transaction, and history contracts; FZ-07 and FZ-09 accepted.
IMPLEMENTATION FREEZES REQUIRED:
FZ-07, FZ-09.
CURRENT AUTHORITIES USED:
Planner, audit/outbox, mutation contracts, RLS, notifications later.
DONOR MATERIAL USED:
None.
PARALLELIZATION:
Can run parallel after WAVE-02 contracts; does not need Budget or Reports.
SUPABASE REQUIREMENT:
YES.
CAPABILITY TEST GATES:
N2 obligation/payment and Planner boundary.
WAVE REGRESSION GATE:
N3 obligation/planner regression.
STOP CONDITIONS:
Planner completion becoming payment, Finance replacing Planner authority.
DONE WHEN:
Payment and Planner composition boundaries are proven.
```

### WAVE-05 - Reports and Projections

```text
PURPOSE:
Build report/read behavior — including Upcoming Obligations from FIN-GAP-009 truth — and project Finance safely into Home, Attention, Notifications, and Search.
FIN-GAPS INCLUDED:
FIN-GAP-011, FIN-GAP-012
PREREQUISITES:
Financial truth, refunds, budgets, obligations, and reporting freeze accepted.
IMPLEMENTATION FREEZES REQUIRED:
FZ-11, FZ-12.
CURRENT AUTHORITIES USED:
Home, Attention, Notifications, Search, RLS.
DONOR MATERIAL USED:
DC-ADAPT-001, 002, 004, 009, 010, 011, 013 reference.
PARALLELIZATION:
Reports before projections; projection freeze can prepare once report/obligation signals are stable.
SUPABASE REQUIREMENT:
YES.
CAPABILITY TEST GATES:
N2 reports and projection privacy.
WAVE REGRESSION GATE:
N4 milestone integration gate.
STOP CONDITIONS:
Parallel Search/Home/Attention, silent currency mixing, privacy widening.
DONE WHEN:
Read models and projections pass privacy and financial correctness gates.
```

### WAVE-06 - External Relationships and Consumer Contract

```text
PURPOSE:
Close non-blocked external ownership boundaries and freeze the Finance-side canonical consumer contract without implementing Geni or Automations.
FIN-GAPS INCLUDED:
FIN-GAP-013; FIN-GAP-014 as freeze-only contract boundary.
PREREQUISITES:
Context/privacy and canonical Finance operation contracts. Assets/HomeCloud canonical authority for those subparts.
IMPLEMENTATION FREEZES REQUIRED:
FZ-13 Inventory Relationship; FZ-14 Assets/HomeCloud deferred; FZ-10 External Canonical Consumer Boundary is a documentation/contract freeze only.
CURRENT AUTHORITIES USED:
Inventory, mutation contracts, idempotency/reliability, RLS. Accepted Current evidence does not demonstrate canonical Geni/Automations authorities.
DONOR MATERIAL USED:
None; donor SQL-agent rejected.
PARALLELIZATION:
Inventory subpart can run after context contract. Assets/HomeCloud wait. FZ-10 can be frozen after canonical Finance operations stabilize. Geni/Automations runtime work is DEFERRED outside the current Finance lane.
SUPABASE REQUIREMENT:
YES for Inventory relationship implementation completion. No external Geni/Automations runtime gate exists in this Finance milestone.
CAPABILITY TEST GATES:
N2/N4 for Inventory ownership/privacy; Finance core units prove canonical-operation/idempotency/no-AI invariants without Geni runtime.
WAVE REGRESSION GATE:
N4 cross-module gate for non-blocked implemented boundaries.
STOP CONDITIONS:
Assets/HomeCloud redesign, creation of temporary Geni/Automations, AI owning financial correctness, donor SQL-agent authority.
DONE WHEN:
Inventory non-blocked relationship is proven where implemented and FZ-10 contract is accepted; deferred external integrations are explicitly not required for Finance Core completion.
```

### WAVE-07 - Mobile Finance Surface

```text
PURPOSE:
Deliver mobile Finance experience once backend contracts and frontend detail are stable.
FIN-GAPS INCLUDED:
FIN-GAP-015
PREREQUISITES:
Frontend Detail Pass; stable product-facing contracts from core, planning, obligation, reporting, and projection freezes.
IMPLEMENTATION FREEZES REQUIRED:
FZ-15 after frontend detail pass.
CURRENT AUTHORITIES USED:
Shared UI/testing, app shell, Home/Attention/Search entry points.
DONOR MATERIAL USED:
DC-ADAPT-012 reference only; donor web UI is not ported.
PARALLELIZATION:
Design pass can start after stable contracts; final UI implementation should wait for accepted FZ-15.
SUPABASE REQUIREMENT:
No before UI implementation start; YES for completion and final integration QA.
CAPABILITY TEST GATES:
N3 mobile regression and N5 final Finance QA.
WAVE REGRESSION GATE:
N5 final Finance QA.
STOP CONDITIONS:
Frontend implementation before detail pass, UI against unstable contracts, donor web UI port.
DONE WHEN:
Mobile Finance satisfies accepted product behavior without leaking private data.
```

Wave candidates: 7.

## 12. Milestone Gates

| Milestone | After wave(s) | Gate level | Purpose |
|---|---|---|---|
| MG-01 Finance Foundation | WAVE-01 | N3 | Prove context, account, transaction, and category foundation. |
| MG-02 Financial Integrity | WAVE-02 | N3 | Prove transfers, history, correction, trash, and restore. |
| MG-03 Money Planning | WAVE-03 | N4 | Prove refund, budget, savings, and report-input invariants. |
| MG-04 Obligations and Planner Boundary | WAVE-04 | N4 | Prove payment/obligation lifecycle and Planner ownership separation. |
| MG-05 Cross-Module Readiness | WAVE-05 and non-blocked WAVE-06 | N4 | Prove reports (including Upcoming Obligations), projections, search/attention/privacy, Inventory non-blocked boundary, and Finance-side external-consumer contract. No Geni/Automations runtime required. |
| MG-06 Mobile and Final Finance QA | WAVE-07 | N5 | Prove mobile workflows and full Finance acceptance. |

Milestone gates: 6.

## 13. Parallelization Map

| Unit | Parallelization decision | Notes |
|---|---|---|
| FIU-01 | SERIAL | Tier 0 foundation. |
| FIU-02 | SERIAL | Depends on context/privacy. |
| FIU-03 | SERIAL | Depends on context/account contracts. |
| FIU-04 | SERIAL | Depends on transaction/account contracts. |
| FIU-05 | SERIAL | Depends on transaction/transfer effects. |
| FIU-06 | SERIAL | Depends on transaction/history lifecycle. |
| FIU-07 | SERIAL | Depends on refund, transfer, category, account, transaction behavior. |
| FIU-08 | PARALLEL AFTER CONTRACT | Can begin after context, transaction, history contracts; no need to wait for Budget/Reports. |
| FIU-09 | PARALLEL AFTER CONTRACT | Can follow obligation freeze while budget/report path continues. |
| FIU-10 | SERIAL | Downstream of financial truth and budget/refund behavior. |
| FIU-11 | SERIAL | Downstream of reports/obligations/projections. |
| FIU-12 | DEFERRED/BLOCKED | Inventory subpart planable; Assets/HomeCloud wait. |
| FIU-14 | SPECIFICATION REQUIRED | Frontend Detail Pass before FZ-15; not an architectural blocker. |

```text
SERIAL UNITS:
9

PARALLEL-AFTER-CONTRACT UNITS:
2

INDEPENDENT/PARALLEL UNITS:
0

DEFERRED/BLOCKED OR SPECIFICATION-DEPENDENT EXECUTION UNITS:
2

DEFERRED EXTERNAL CAPABILITIES (NO FIU):
2 — Geni, Automations
```

## 14. Blocked / Deferred Work

| Work | Status | Handling |
|---|---|---|
| FIN-GAP-013 Inventory subpart | Planable | Can freeze after context/privacy boundary and Current Inventory authority review. |
| FIN-GAP-013 Assets subpart | BLOCKED | Wait for Assets canonical authority. Do not redesign Assets. |
| FIN-GAP-013 HomeCloud subpart | BLOCKED | Wait for HomeCloud canonical authority. Do not redesign HomeCloud. |
| FIN-GAP-015 Frontend Detail Pass | SPECIFICATION REQUIRED | Must occur before FZ-15; do not design screens in Phase 5. |
| Geni runtime integration | DEFERRED EXTERNAL CAPABILITY | No canonical Geni authority is available; Finance must not build temporary Geni. |
| Automations runtime integration | DEFERRED EXTERNAL CAPABILITY | Accepted Current evidence does not demonstrate a canonical Automations authority; repeat targeted capability check when external integration is authorized. |
| Finance documents untracked | PRECONDITION | Control should decide preservation/staging before implementation work begins. |

## 15. Rollback Risk Map

| Unit | Rollback complexity | Reason |
|---|---|---|
| FIU-01 | HIGH | Privacy/RLS/ownership boundary. |
| FIU-02 | HIGH | Persistent account/balance truth and history. |
| FIU-03 | HIGH | Persistent transaction/category truth. |
| FIU-04 | HIGH | Atomic financial effects. |
| FIU-05 | HIGH | Historical lifecycle and restore semantics. |
| FIU-06 | HIGH | Refund lifecycle affects history, budget, reports. |
| FIU-07 | HIGH | Budget/savings semantics over persistent financial truth. |
| FIU-08 | HIGH | Obligation/payment/recurrence lifecycle. |
| FIU-09 | HIGH | Cross-module Planner contract. |
| FIU-10 | MEDIUM | Read models and currency behavior over existing truth. |
| FIU-11 | HIGH | Cross-module projections with privacy impact. |
| FIU-12 | HIGH | Cross-module ownership boundaries; external subparts blocked. |
| FIU-14 | MEDIUM | UI surface consumes contracts; privacy rendering and final QA matter. |

Rollback SQL or technical rollback design is out of scope for Phase 5. FZ-10 is contract-only in the current lane and has no external-runtime rollback until a future Geni/Automations authority exists.


## 15A. Donor Characterization Test Rule

For every donor behavior finally used:

```text
DONOR EVIDENCE
→ HOMePLUS-owned characterization test
→ HOMePLUS implementation
```

A donor test is provenance/evidence only; it never proves HOMePLUS correctness. The HOMePLUS test must encode the Product invariant under HOMePLUS ownership, privacy, history and mutation rules.

Example: donor negative-balance behavior may inform FIU-02, but HOMePLUS must own a test proving negative balance remains valid under the HOMePLUS Account authority.

## 16. Completion Evidence Contract

Every future implementation unit should report:

```text
OBJECTIVE
FIN-GAP CLOSED
FILES CHANGED
DONOR CODE USED / NOT USED
PROVENANCE
MIGRATIONS
TESTS RUN
PASS / FAIL
KNOWN RISKS
DIFF STATUS
NEXT DEPENDENCY
```

Additional evidence rules:

- Any donor-adapted logic must state donor repo, commit, path/symbol, and whether code was copied, adapted, or only used as behavior reference.
- Any DB/RLS/history/atomicity unit must report local Supabase availability and test gate status.
- Any cross-module unit must state which Current authority was preserved and how duplicate authority was avoided.


## 16A. Hard Pre-Code Gates

No prompt may modify Finance code until all applicable items are satisfied:

- accepted relevant FZ;
- `FINANCE_PRODUCT_TO_IMPLEMENTATION_TRACEABILITY.md` passes with zero orphan requirements and zero unexplained duplicate primary owners;
- canonical Finance planning documents are preserved/versioned in the repo under an existing documentation convention;
- a known `FINANCE_IMPLEMENTATION_BASELINE` exists with branch, HEAD, document-authority commit and clean/known status;
- `LOCAL SUPABASE STATUS PASS`;
- CURRENT evidence for the unit is confirmed;
- Real Gap remains demonstrated;
- donor provenance is pinned when used;
- expected diff is defined;
- test gate is defined;
- rollback/recovery strategy is defined;
- OUT OF SCOPE is explicit;
- no missing external authority is required by the unit.

Current Finance documents are untracked. Before code, Control must first propose/approve their canonical repo location and Git preservation action. No commit/push is automatic.

## 17. Recommended Next Freeze

```text
NEXT RECOMMENDED FREEZE:
FZ-01 Financial Context and Privacy

RELATED GAP:
FIN-GAP-001

WHY:
It is the only Tier 0 Finance gap, has no Finance prerequisite, and defines the privacy/ownership boundary required by accounts, transactions, transfers, reports, Home/Search/Attention, future external consumers, and mobile UI.

NEEDS PREVIOUS IMPLEMENTATION:
NO

NEEDS CURRENT AUTHORITY REVIEW:
YES - Auth, user/person ownership, Household, Membership, RLS foundations.

SUPABASE LOCAL REQUIRED BEFORE IMPLEMENTATION:
YES - before implementation completion and RLS/privacy test gate.

DO NOT CREATE NOW:
Implementation Freeze text, schema, migrations, tests, screens, or implementation prompts.
```

Branch/commit strategy:

```text
RECOMMENDATION:
Use a simple controlled Finance implementation branch unless Control later chooses a worktree split for parallel agents.

WHY:
The dependency graph has a strong serial foundation path and the Finance documents are currently untracked. Multiple lanes before FZ-01/FZ-03 contracts would increase duplicate-authority risk.

DO NOW:
Nothing. No branch, commit, push, or staging in Phase 5.
```

## 17A. Correction Pass Summary

- Product→Implementation traceability is now a hard pre-code authority.
- Upcoming Obligations is explicit in FIU-10/FZ-11 and depends on FIU-08/FIN-GAP-009 truth.
- `FZ-10` is now `External Canonical Consumer Boundary`; it does not authorize Geni/Automations implementation.
- `FIU-13` is retired as an executable current-lane unit.
- Automations capability check from accepted Current evidence: no canonical authority demonstrated; runtime integration deferred.
- Financial History Policy is a hard design precondition before FZ-04.
- Local Supabase is a hard gate before the first Finance code change.
- FZ-03 is split internally into FZ-03A Transaction and FZ-03B Category without creating another wave.
- Donor behavior must receive HOMePLUS-owned characterization tests before/with implementation.
- Finance planning corpus must be versioned under an existing canonical repo convention before code.

## 18. Changes Performed

```text
CORRECTION PASS TARGET:
docs\implementation\FINANCE_MINIMAL_INTEGRATION_PLAN.md

MODIFIED BY THIS CORRECTION PASS:
planning semantics only; no product/code implementation

NOT MODIFIED BY THIS PLAN FILE:
docs\implementation\FINANCE_CURRENT_CAPABILITY_AUDIT.md
docs\implementation\FINANCE_DONOR_CAPABILITY_AUDIT.md
docs\implementation\FINANCE_CURRENT_DONOR_VS_TARGET_MATRIX.md

CORRELATED CORRECTION PASS FILE:
docs\implementation\FINANCE_REAL_GAP_MAP.md
C:\Users\thega\Downloads\HOMePLUS_FINANCE_PRODUCT_FREEZE_V1.0.md

CODE CHANGES:
none

BRANCH / COMMIT / PUSH:
none

IMPLEMENTATION FREEZES:
none

IMPLEMENTATION PROMPTS:
none
```

Final counts:

```text
REAL GAPS ACCOUNTED:
15/15

IMPLEMENTATION UNITS (EXECUTABLE CURRENT FINANCE LANE):
13

FREEZE UNITS:
16

WAVE CANDIDATES:
7

MILESTONE GATES:
6

SERIAL UNITS:
9

PARALLEL-AFTER-CONTRACT UNITS:
2

INDEPENDENT/PARALLEL UNITS:
0

DEFERRED/BLOCKED OR SPECIFICATION-DEPENDENT EXECUTION UNITS:
2

DEFERRED EXTERNAL CAPABILITIES (NO FIU):
2 — Geni, Automations

UNITS REQUIRING LOCAL SUPABASE FOR COMPLETION/QA:
13

UNITS USING DONOR ADAPTATION:
5

DONOR CANDIDATE TRACEABILITY:
13/13

CURRENT AUTHORITIES PRESERVED:
15/15

DAG VIOLATIONS:
0

DEFERRED EXTERNAL RUNTIME INTEGRATIONS:
Geni, Automations

CURRENT AUTHORITY DUPLICATION:
0
```
