# HOMePLUS Finance - Current + Donor vs Target

Status: FINANCE_CURRENT_DONOR_MATRIX_COMPLETE
Date: 2026-08-10
Mode: DECISION MATRIX, NO IMPLEMENTATION

This document cross-checks the accepted Finance Product Freeze target against the accepted Current audit and accepted Donor audit. It does not define tables, migrations, services, routes, screens, waves, or FAST/STANDARD/STRUCTURAL gap classes.

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

## 2. Input Authorities

| Authority | Path / repo | Accepted status | Role in this phase |
|---|---|---|---|
| Target | `C:\Users\thega\Downloads\HOMePLUS_FINANCE_PRODUCT_FREEZE_V1.0.md` | Product authority | Defines target behavior and FIN-INV-001..074. |
| Current | `docs\implementation\FINANCE_CURRENT_CAPABILITY_AUDIT.md` | `CURRENT_AUDIT_ACCEPTED` | Defines what HOMePLUS already owns and what is absent. |
| Primary donor | `docs\implementation\FINANCE_DONOR_CAPABILITY_AUDIT.md` | `DONOR_AUDIT_ACCEPTED` | Defines donor behavior and ADAPT/REFERENCE/REJECT material. |
| Primary donor repo | `kirill-markin/expense-budget-tracker` at `93d6ed1f8174a8f39551642391484dd87b4a045b` | MIT | Main donor behavior source. |
| Mature reference | `actualbudget/actual` at `d67ca574673fef386115fa5ebe26b62f0d6216e3` | MIT-style / REFERENCE ONLY | Transfer invariant and tombstone/history reference only. |
| Firefly III | `firefly-iii/firefly-iii` | AGPL / not consulted | Not used. No code copy. |

No new broad audit was performed. The only source reads in this phase were the accepted audit documents and baseline checks.

## 3. Executive Coverage Result

What Current already owns:

- Auth, person ownership, household, membership, RLS foundations, audit/outbox, mutation/idempotency reliability, Planner task/event composition primitives, Home/Attention/Search surfaces, Inventory partial integration, shared UI/testing foundations.
- Current does not own active Finance accounts, transactions, balances, budgets, obligations, payments, reports, refunds, or Finance-specific privacy projections.

What donor materially contributes:

- Ledger movement semantics, transaction kind classification, paired transfer representation, derived balances, negative-balance behavior, optional categories, monthly/category budget read models, budget actual derivation, report aggregation, native-currency storage, and conversion-warning patterns.

What donor does not solve:

- HOMePLUS account authority, unknown balance, balance anchor, fixed historical account currency, account archive/history, canonical atomic transfer operation, same-account transfer rejection in primary donor service, expense without account, refund semantics, balance adjustment semantics, obligations/payments/recurrence, HOMePLUS privacy, Planner integration, mobile UI, and HOMePLUS reliability authority.

What remains HOMePLUS-specific:

- Personal vs Household Financial Context, Source vs Financial Context, cross-scope privacy/disclosure, Balance Adjustment, Refund, Obligation/Payment/Occurrence lifecycle, Planner composition rules, Search/Attention/Home privacy, Inventory/Assets/HomeCloud relations, Geni/Automation canonical boundaries, and mobile integration.

Counts over 62 acceptance targets:

```text
COVERED BY CURRENT:
0

COVERED BY CURRENT + DONOR BEHAVIOR:
7

PARTIALLY COVERED:
35

RESIDUAL GAP:
18

NON-GOAL:
2
```

## 4. 62-Row Target Decision Matrix

| # | Target | Current | Primary donor | Actual ref | Decision | Covered after Current+Donor? | Residual Gap |
|---:|---|---|---|---|---|---|---|
| 1 | Personal Finance and Household Finance are distinct scopes | PARTIAL: Auth/household and Planner personal/shared patterns exist; no Finance scope. | Partial analogue only: donor business/personal account type is not HOMePLUS personal/household. | N/A | EXTEND CURRENT | PARTIAL | HOMePLUS Finance context model and privacy projection. |
| 2 | Personal Finance is owner-only by default | PARTIAL: self-only people policy and Planner personal visibility. | No useful authority; workspace is shared context. | N/A | EXTEND CURRENT | PARTIAL | Finance owner-only records and policies. |
| 3 | Household Finance cannot access private personal account detail | PARTIAL: household RLS helpers exist. | No private account projection. | N/A | EXTEND CURRENT | PARTIAL | Finance projection that hides personal account internals. |
| 4 | Manual account can exist without opening balance | ABSENT. | REJECT: donor account is derived from ledger rows. | N/A | IMPLEMENT GAP | NO | Account authority independent of movements. |
| 5 | Unknown opening balance is not treated as zero | ABSENT. | REJECT: no unknown balance; derived accounts imply movement-backed state. | N/A | IMPLEMENT GAP | NO | Unknown balance state and downstream balance behavior. |
| 6 | Balance anchor/correction exists | ABSENT. | No anchor behavior. | N/A | IMPLEMENT GAP | NO | Balance Anchor and correction behavior. |
| 7 | Balance adjustment does not contaminate income/expense reports | ABSENT. | No Balance Adjustment. Donor Budget Adjustment is not equivalent. | N/A | IMPLEMENT GAP | NO | Balance Adjustment with no income/expense/budget impact. |
| 8 | Negative balances are allowed | ABSENT. | SUPPORTED: derived balance sums allow negative and account status treats negative as active. | N/A | ADAPT DONOR | YES | None at behavior level; HOMePLUS must preserve this in its account authority later. |
| 9 | Account currency is fixed historically once account has movements | ABSENT. | REJECT: account currency is `MODE()` over ledger entries. | N/A | IMPLEMENT GAP | NO | Historical currency immutability. |
| 10 | Income, Expense, and Transfer are distinct transaction classes | ABSENT. | SUPPORTED: `kind` constrained to income/spend/transfer. | N/A | ADAPT DONOR | YES | Naming/account optionality must remain HOMePLUS-owned. |
| 11 | Expense can be registered without an Account | ABSENT. | REJECT: `account_id` required for all ledger entries. | N/A | IMPLEMENT GAP | NO | Account-optional expense behavior. |
| 12 | Transfer requires source and destination when accounts are known | ABSENT. | PARTIAL: paired rows with shared `event_id`; no primary canonical atomic service proven. | Transfer pair invariant requires different accounts and zero-sum. | CURRENT + ADAPT DONOR | PARTIAL | HOMePLUS-owned atomic transfer operation and validation. |
| 13 | Transfer does not count as income or expense | ABSENT. | SUPPORTED: transfer is distinct kind/direction and category null by convention. | Transfer invariant supports separation. | ADAPT DONOR | YES | Must also exclude Balance Adjustments and refunds under HOMePLUS rules. |
| 14 | Cross-currency Transfer stores both amounts and no FX engine | ABSENT. | PARTIAL: two rows can hold different native amounts; donor also has FX subsystem. | N/A | REFERENCE ONLY | PARTIAL | Source/destination amount behavior without requiring FX engine. |
| 15 | Personal account can fund Household Expense | ABSENT. | Partial cross-context transfer/report analogue; no HOMePLUS ownership/privacy. | N/A | CURRENT + ADAPT DONOR | PARTIAL | Source vs Financial Context rules. |
| 16 | Household-funded personal expense counts once in Household Finance | ABSENT. | Partial reporting analogue only. | N/A | CURRENT + ADAPT DONOR | PARTIAL | Deduped context analytics. |
| 17 | Household-funded expense does not become personal spending | ABSENT. | Partial analogue only. | N/A | CURRENT + ADAPT DONOR | PARTIAL | Personal/household attribution rules. |
| 18 | Household Finance cannot expose private personal account internals | ABSENT with reusable RLS primitives. | No useful privacy model. | N/A | EXTEND CURRENT | PARTIAL | Finance-specific disclosure boundary. |
| 19 | Household money cannot be hidden inside personal Finance | ABSENT. | No contribution/source-context authority. | N/A | IMPLEMENT GAP | NO | Shared funding/contribution controls. |
| 20 | Contribution is represented as a Transfer | ABSENT. | PARTIAL: transfer representation exists; no contribution semantics. | Transfer invariant reference. | CURRENT + ADAPT DONOR | PARTIAL | Contribution classification and context rules. |
| 21 | Reimbursement is represented as a Transfer | ABSENT. | PARTIAL/REFERENCE: donor transfer exists but cautions debt repayment is not always transfer. | N/A | REFERENCE ONLY | PARTIAL | Reimbursement semantics and correct classification. |
| 22 | Credit card behaves as negative-balance account | ABSENT. | PARTIAL: negative balance works; no card-specific behavior. | N/A | ADAPT DONOR | PARTIAL | Credit-card account semantics. |
| 23 | Credit card payment is a Transfer | ABSENT. | PARTIAL: transfer behavior exists; no card payment model. | Transfer invariant reference. | CURRENT + ADAPT DONOR | PARTIAL | Card-payment classification and validation. |
| 24 | Transaction correction is append-only or history-preserving | PARTIAL: audit/versioning primitives exist; no Finance history. | REJECT: donor updates rows in place. | Tombstone/history reference only. | EXTEND CURRENT | PARTIAL | Finance correction history preserving current effects. |
| 25 | Transaction trash removes current effects without deleting history | PARTIAL: Planner trash/restore patterns; no financial effects. | REJECT: hard delete. | Tombstone balance exclusion reference. | EXTEND CURRENT | PARTIAL | Finance trash effect removal and history retention. |
| 26 | Restore reapplies current effects | PARTIAL: Planner restore patterns; no Finance restore. | Not solved. | Tombstone/history reference only. | EXTEND CURRENT | PARTIAL | Finance restore and effect recomputation. |
| 27 | Refund is not Income | ABSENT. | No refund model. | N/A | IMPLEMENT GAP | NO | Refund class linked to expense. |
| 28 | Refund reduces net expense/budget consumption | ABSENT. | No refund model. | N/A | IMPLEMENT GAP | NO | Refund report/budget impact. |
| 29 | Category is optional on Expense | PARTIAL: generic category patterns; no Expense. | SUPPORTED: nullable transaction category. | N/A | ADAPT DONOR | YES | HOMePLUS Expense must preserve optionality. |
| 30 | Category archive preserves history | ABSENT. | REJECT: no category table/lifecycle. | N/A | IMPLEMENT GAP | NO | Category archive/delete/history behavior. |
| 31 | Monthly total budget exists per scope/currency | ABSENT. | PARTIAL: monthly category/direction/currency plan rows; no HOMePLUS scope. | N/A | CURRENT + ADAPT DONOR | PARTIAL | Scope/currency budget authority. |
| 32 | Category budget exists inside monthly total | ABSENT. | SUPPORTED: month/direction/category plan and actual rows. | N/A | ADAPT DONOR | YES | Fit to HOMePLUS monthly total remains. |
| 33 | Expense without category still affects total budget | ABSENT. | PARTIAL: null category maps to blank category in actuals; donor requires account. | N/A | ADAPT DONOR | PARTIAL | Total-budget consumption for uncategorized account-optional expenses. |
| 34 | Budget never blocks expense registration | ABSENT. | SUPPORTED: ledger entry operations are independent from budget tables. | N/A | ADAPT DONOR | YES | None at behavior level; must be preserved later. |
| 35 | Budget has no automatic carry-over | ABSENT. | PARTIAL: no automatic carry-over found; not formally proven as invariant. | N/A | REFERENCE ONLY | PARTIAL | Explicit no-carry-over rule. |
| 36 | Budget leftover is not money saved | ABSENT. | PARTIAL: plans/actuals separate from balance rows. | N/A | REFERENCE ONLY | PARTIAL | Savings distinction in HOMePLUS product behavior. |
| 37 | Savings are represented through accounts/transfers | ABSENT. | PARTIAL: accounts/transfers exist; no savings semantics. | N/A | CURRENT + ADAPT DONOR | PARTIAL | Savings account/transfer semantics without savings-goal scope. |
| 38 | Reports never mix currencies silently | ABSENT. | SUPPORTED behavior: native currency stored; missing conversion flagged. | N/A | ADAPT DONOR | YES | Must avoid importing automatic FX engine as V1 requirement. |
| 39 | Obligation existence does not create an Expense | ABSENT. | No obligation model. | N/A | IMPLEMENT GAP | NO | Obligation/Expense separation. |
| 40 | Obligation can have unknown expected amount | ABSENT. | No obligation model. | N/A | IMPLEMENT GAP | NO | Unknown obligation amount behavior. |
| 41 | Obligation occurrence statuses include pending, paid, skipped, cancelled, overdue | PARTIAL: Planner statuses/temporal surfaces; no paid/skipped Finance occurrence. | No obligation model. | N/A | EXTEND CURRENT | PARTIAL | Finance occurrence statuses and payment relation. |
| 42 | Overdue is derived, not manually set | PARTIAL: Planner attention derives temporal state. | No obligation overdue model. | N/A | EXTEND CURRENT | PARTIAL | Finance overdue derivation. |
| 43 | Recurring obligation creates occurrence history | PARTIAL: Planner recurrence/occurrence patterns. | No obligation occurrence ledger. | N/A | EXTEND CURRENT | PARTIAL | Finance occurrence history. |
| 44 | Debt occurrences can accumulate independently | ABSENT. | No debt/obligation accumulation. | N/A | IMPLEMENT GAP | NO | Debt occurrence accumulation. |
| 45 | Pause/end recurrence does not rewrite past occurrences | ABSENT for Finance; Planner recurrence patterns partial. | No obligation recurrence. | N/A | EXTEND CURRENT | PARTIAL | Finance recurrence lifecycle preserving past occurrences. |
| 46 | Planner task completion is not payment | ABSENT for Finance; Planner completion exists. | No Planner/payment model. | N/A | EXTEND CURRENT | PARTIAL | Payment boundary and Planner separation. |
| 47 | Only real payment marks obligation paid | ABSENT. | No payment model. | N/A | IMPLEMENT GAP | NO | Payment authority. |
| 48 | Payment can manually reconcile Planner task | ABSENT but Planner origin fields exist. | No payment model. | N/A | EXTEND CURRENT | PARTIAL | Manual payment-to-Planner reconciliation. |
| 49 | Cancelling Planner task does not cancel obligation | ABSENT. | No obligation/task handoff. | N/A | IMPLEMENT GAP | NO | Task/obligation independent lifecycle. |
| 50 | Personal obligation does not create private Planner task unless user chooses | ABSENT. | No personal obligation. | N/A | IMPLEMENT GAP | NO | Opt-in personal Planner composition. |
| 51 | Household obligation can compose Planner reminders/tasks | PARTIAL: Planner `origin_module` allows finance. | No obligation emitter. | N/A | EXTEND CURRENT | PARTIAL | Finance-to-Planner composition contract. |
| 52 | Trashing payment recalculates obligation state | ABSENT. | No payment/obligation state. | N/A | IMPLEMENT GAP | NO | Payment trash and obligation recalculation. |
| 53 | Reports count each real expense once | ABSENT. | PARTIAL: ledger/report aggregation exists; no HOMePLUS source/context/refund rules. | N/A | CURRENT + ADAPT DONOR | PARTIAL | Real-expense dedupe across contexts/refunds. |
| 54 | Transfers/adjustments are excluded from income/expense reports | ABSENT. | PARTIAL: transfers are separate; Balance Adjustment absent. | Transfer invariant reference. | CURRENT + ADAPT DONOR | PARTIAL | Exclusion for transfers plus Balance Adjustments. |
| 55 | Refunds reduce expense, not increase income | ABSENT. | No refund model. | N/A | IMPLEMENT GAP | NO | Refund reporting rule. |
| 56 | Home surfaces only relevant Finance summaries/attention | PARTIAL: Home summary authority exists. | No HOMePLUS Home. | N/A | EXTEND CURRENT | PARTIAL | Finance Home projection. |
| 57 | Attention surfaces payment due/overdue/budget exceeded only where relevant | PARTIAL: Planner attention authority exists. | No HOMePLUS Attention. | N/A | EXTEND CURRENT | PARTIAL | Finance attention rules and dedupe. |
| 58 | Inventory/Assets/HomeCloud ownership remains preserved when linked | PARTIAL: Inventory/Planner links; Assets/HomeCloud active links absent. | No useful integration. | N/A | EXTEND CURRENT | PARTIAL | Finance links without ownership takeover. |
| 59 | Search/Geni respect Finance privacy boundaries | PARTIAL: Planner search/capability gates; no Finance projection. | Donor search/chat rejected. | N/A | EXTEND CURRENT | PARTIAL | Finance search privacy and Geni/Automation boundary. |
| 60 | Finance V1 does not depend on AI/Geni automation for correctness | PARTIAL: Current core/Planner no-AI precedent; no Finance core. | Ledger operations can exist outside SQL agent; SQL agent rejected. | N/A | CURRENT + ADAPT DONOR | PARTIAL | Finance canonical operations independent from AI. |
| 61 | Bank Sync/Open Banking is out of scope for V1 | EXISTS by absence. | No useful needed donor scope. | N/A | NOT NEEDED | NON-GOAL | Preserve exclusion. |
| 62 | Investments/trading/crypto taxes/asset allocation are out of scope for V1 | EXISTS by absence. | Donor `account_group=investment` is rejected as scope expansion. | N/A | NOT NEEDED | NON-GOAL | Preserve exclusion. |

## 5. FIN-INV-001..074 Crosscheck

| FIN-INV | Acceptance row | Current contribution | Donor contribution | Result | Residual behavior |
|---|---|---|---|---|---|
| FIN-INV-001 | #61, #62 | Non-goal absence. | Donor extras rejected. | NOT APPLICABLE / NON-GOAL | Preserve V1 exclusions. |
| FIN-INV-002 | #1, #2 | Person/Planner personal patterns. | No useful authority. | PARTIAL | Personal Finance scope. |
| FIN-INV-003 | #1 | Household/membership authority. | Workspace rejected. | PARTIAL | Household Finance scope. |
| FIN-INV-004 | #2 | Self-only primitive. | None. | PARTIAL | Owner-only Finance records. |
| FIN-INV-005 | #3 | Household RLS helpers. | None. | PARTIAL | Hide personal account detail. |
| FIN-INV-006 | #56, #57, #59 | Home/Search/Attention primitives. | Donor surfaces rejected. | PARTIAL | Finance privacy-safe projections. |
| FIN-INV-007 | #19 | No Finance funding controls. | Partial transfer/report analogue. | GAP | Shared money controls. |
| FIN-INV-008 | #5 | None. | Derived account rejects unknown opening state. | GAP | Unknown opening balance. |
| FIN-INV-009 | #6 | None. | None. | GAP | Balance Anchor. |
| FIN-INV-010 | #7 | None. | Donor Budget Adjustment is not Balance Adjustment. | GAP | Balance Adjustment report exclusion. |
| FIN-INV-011 | #8 | None. | Negative balances supported. | COVERED | Preserve negative balance behavior. |
| FIN-INV-012 | #9 | None. | Donor violates fixed account currency. | GAP | Fixed historical account currency. |
| FIN-INV-013 | #4, #30 | Planner trash patterns only. | Account view cannot archive. | GAP | Account archive with history. |
| FIN-INV-014 | #10 | None. | Income kind exists. | PARTIAL | HOMePLUS Income semantics. |
| FIN-INV-015 | #10, #11 | None. | Spend kind exists; account required. | PARTIAL | Expense semantics and account optionality. |
| FIN-INV-016 | #10, #13 | None. | Transfer distinct kind. | COVERED | Preserve transfer separation. |
| FIN-INV-017 | #12, #13 | Mutation foundations only. | Paired rows; no atomic service. | PARTIAL | Atomic transfer operation. |
| FIN-INV-018 | #12 | None. | Primary lacks same-account validation; Actual confirms invariant. | GAP | Source != destination validation. |
| FIN-INV-019 | #14 | None. | Native amount/currency per row; FX subsystem extra. | PARTIAL | Both transfer amounts without FX dependency. |
| FIN-INV-020 | #11, #12 | None. | All donor ledger rows require account. | GAP | Expense account optionality. |
| FIN-INV-021 | #15, #16, #17 | Household/RLS primitives. | Business/personal analogue only. | PARTIAL | Source vs context analytics. |
| FIN-INV-022 | #16, #17 | None. | Event grouping partial. | PARTIAL | Deduped funding attribution. |
| FIN-INV-023 | #18 | RLS primitives. | No donor privacy projection. | PARTIAL | Private-account disclosure rules. |
| FIN-INV-024 | #20 | None. | Transfer representation. | PARTIAL | Contribution semantics. |
| FIN-INV-025 | #21 | None. | Reference only; donor cautions debt repayment semantics. | PARTIAL | Reimbursement semantics. |
| FIN-INV-026 | #24 | Audit/versioning primitives. | Direct update rejected; Actual tombstone reference. | PARTIAL | Transaction correction history. |
| FIN-INV-027 | #24 | Audit primitives. | No reversal behavior. | GAP | Reversal/correction model. |
| FIN-INV-028 | #25, #26 | Planner trash/restore patterns. | Hard delete rejected; Actual tombstone reference. | PARTIAL | Finance trash/restore effect replay. |
| FIN-INV-029 | #27 | None. | None. | GAP | Refund not Income. |
| FIN-INV-030 | #27, #28 | None. | None. | GAP | Refund linked to expense. |
| FIN-INV-031 | #28, #55 | None. | None. | GAP | Refund reduces net expense/budget. |
| FIN-INV-032 | #28 | None. | None. | GAP | Refund cap. |
| FIN-INV-033 | #25, #27, #28 | Trash primitives only. | None. | GAP | Refund lifecycle with trashed expense. |
| FIN-INV-034 | #34 | None. | Ledger independent from budgets. | COVERED | Preserve non-blocking budget rule. |
| FIN-INV-035 | #31, #32, #33 | None. | Budget actuals derive from ledger. | PARTIAL | HOMePLUS expense/refund/context semantics. |
| FIN-INV-036 | #13, #54 | None. | Transfer separate direction. | PARTIAL | Exclude transfer from budget consumption. |
| FIN-INV-037 | #7, #54 | None. | No Balance Adjustment. | GAP | Adjustment excluded from budget. |
| FIN-INV-038 | #28, #55 | None. | No refund. | GAP | Refund affects spent. |
| FIN-INV-039 | #36 | None. | Plans/actuals separate from balance. | PARTIAL | Product rule that leftover is not money. |
| FIN-INV-040 | #35 | None. | No carry-over found, not proven. | PARTIAL | Explicit no-carry-over behavior. |
| FIN-INV-041 | #37 | None. | Account/transfer analogue only. | PARTIAL | Savings as account behavior. |
| FIN-INV-042 | #37 | None. | Transfer representation. | PARTIAL | Savings transfer semantics. |
| FIN-INV-043 | #38 | None. | Native currency and unconvertible flags. | COVERED | Preserve no silent mixing without requiring FX engine. |
| FIN-INV-044 | #31, #35 | None. | Month-scoped budget rows. | PARTIAL | Future budget edits must not rewrite history. |
| FIN-INV-045 | #39 | None. | No obligation. | GAP | Obligation separate from expense. |
| FIN-INV-046 | #46 | Planner completion exists. | No payment. | PARTIAL | Task completion not payment. |
| FIN-INV-047 | #47 | None. | No payment. | GAP | Payment authority. |
| FIN-INV-048 | #42 | Planner derived attention. | No obligation overdue. | PARTIAL | Finance overdue derivation. |
| FIN-INV-049 | #43 | Planner recurrence partial. | No occurrence ledger. | PARTIAL | Obligation occurrence history. |
| FIN-INV-050 | #44 | None. | No debt occurrence. | GAP | Debt accumulation. |
| FIN-INV-051 | #45 | Planner recurrence partial. | No obligation recurrence. | PARTIAL | Pause/end recurrence behavior. |
| FIN-INV-052 | #45 | Planner event edit partial. | No obligation occurrence edits. | PARTIAL | Past occurrence preservation. |
| FIN-INV-053 | #47 | None. | No partial payments. | NOT APPLICABLE / NON-GOAL | Preserve V1 non-support. |
| FIN-INV-054 | #47 | None. | No payment occurrence constraint. | GAP | Payment per occurrence. |
| FIN-INV-055 | #52 | None. | No payment trash. | GAP | Obligation recalculation. |
| FIN-INV-056 | #49 | Planner cancellation exists. | None. | PARTIAL | Obligation independent from task cancel. |
| FIN-INV-057 | #51 | Planner origin supports `finance`. | None. | PARTIAL | Finance emitter/composition contract. |
| FIN-INV-058 | #50 | None. | None. | GAP | Personal obligation Planner opt-in. |
| FIN-INV-059 | #53 | None. | Report aggregation partial. | PARTIAL | Count real expense once across contexts. |
| FIN-INV-060 | #54 | None. | Transfer separation. | COVERED | Preserve exclusion from income/expense. |
| FIN-INV-061 | #54 | None. | No Balance Adjustment. | GAP | Adjustment exclusion. |
| FIN-INV-062 | #55 | None. | No refund. | GAP | Refund reporting. |
| FIN-INV-063 | #20, #53, #55 | None. | Business/personal transfer reporting analogue. | PARTIAL | Contribution/report semantics. |
| FIN-INV-064 | #38 | None. | Conversion warnings. | COVERED | No silent currency mixing. |
| FIN-INV-065 | #10, #24, #53 | Core audit primitives. | Ledger ownership idea. | PARTIAL | HOMePLUS Finance authority. |
| FIN-INV-066 | #46, #51 | Planner authority. | None. | PARTIAL | Task/Finance boundary. |
| FIN-INV-067 | #58 | Inventory partial. | None. | PARTIAL | Finance/Inventory relation. |
| FIN-INV-068 | #58 | Assets not active in Current evidence. | None. | GAP | Assets relation. |
| FIN-INV-069 | #58 | HomeCloud not active in Current evidence. | None. | GAP | HomeCloud relation. |
| FIN-INV-070 | #57 | Planner attention authority. | None. | PARTIAL | Finance relevance/dedupe. |
| FIN-INV-071 | #57 | Notification prefs/adapter partial. | None. | PARTIAL | Finance notifications. |
| FIN-INV-072 | #59 | Search capability gates. | Donor search rejected. | PARTIAL | Finance privacy-safe search. |
| FIN-INV-073 | #59, #60 | Mutation/idempotency patterns. | SQL agent rejected; ledger can exist without AI. | PARTIAL | Canonical Finance operations for consumers. |
| FIN-INV-074 | #60 | Current no-AI precedent. | Ledger core not inherently AI-dependent. | PARTIAL | Finance correctness independent from Geni/Automations. |

FIN-INV coverage: 74/74.

## 6. Current Authority Preservation Map

| Authority | Current canonical evidence | Finance future relationship | Decision |
|---|---|---|---|
| Auth | `people`, auth onboarding policies | Finance must use current identity. | KEEP CURRENT |
| User/person ownership | `current_person_id()`, self policies | Finance personal scope extends this. | EXTEND CURRENT |
| Household | `households` | Household Finance extends, not replaces. | EXTEND CURRENT |
| Membership | `household_members`, member helpers | Finance permissions compose with membership. | EXTEND CURRENT |
| RLS foundations | Household/person RLS helpers | Finance-specific RLS should compose with these. | EXTEND CURRENT |
| Planner task composition | Planner tasks/events/goals and origin fields | Finance obligations/payments may compose with Planner. | EXTEND CURRENT |
| Audit/outbox | `audit_events`, `outbox_events` | Finance mutations/history should compose with current reliability primitives. | EXTEND CURRENT |
| Mutation contracts | shared mutation/idempotency foundations | Finance canonical operations should use current mutation discipline. | EXTEND CURRENT |
| Idempotency/reliability | Planner V2 dedupe and mutation correlation | Finance should not invent parallel reliability. | EXTEND CURRENT |
| Home | Home Planner summary authority | Finance projections extend Home. | EXTEND CURRENT |
| Attention | Planner/global attention patterns | Finance relevance and dedupe extend Attention. | EXTEND CURRENT |
| Notifications | Notification prefs/adapters partial | Finance notification delivery extends existing authority when available. | EXTEND CURRENT |
| Search | Planner search capability gates | Finance search must preserve privacy gates. | EXTEND CURRENT |
| Inventory | Inventory-to-Planner origin links, Inventory ownership | Finance links must not take ownership of Inventory truth. | EXTEND CURRENT |
| Shared UI/testing infrastructure | Existing frontend primitives and test harnesses | Finance mobile UI should use current design/testing patterns. | EXTEND CURRENT |

Current authorities to preserve: 15.

## 7. Donor Adapt Candidate Disposition

| Candidate | Target served | Current primitive it composes with | Keep from donor | Reject from donor | Code reuse likelihood | Decision |
|---|---|---|---|---|---|---|
| DC-ADAPT-001 Ledger movement representation | Transactions, reports, balances | Mutation/audit foundations | DATA SEMANTIC, INVARIANT, READ-MODEL PATTERN | Workspace/RLS and direct edit/delete lifecycle | MEDIUM | ADAPT DONOR |
| DC-ADAPT-002 Derived account balances | Balances, negative balances | Future account authority, audit | SQL PATTERN, ALGORITHM, TEST IDEA | Derived account as source of truth, MODE currency | LOW | ADAPT DONOR |
| DC-ADAPT-003 Account metadata sidecar | Account metadata/context hints | Household/privacy authority | DATA SEMANTIC | Business/personal as HOMePLUS privacy | LOW | ADAPT DONOR |
| DC-ADAPT-004 Transaction kind validation/filtering | Income/Expense/Transfer classes | Mutation/API validation patterns | VALIDATION PATTERN, DATA SEMANTIC | Account required for every class | MEDIUM | ADAPT DONOR |
| DC-ADAPT-005 Grouped transfer representation | Transfers/contributions/payments | Mutation/idempotency/audit | DATA SEMANTIC, INVARIANT, TEST IDEA | Chat/SQL-agent authority, missing atomic validation | LOW | ADAPT DONOR |
| DC-ADAPT-006 Nullable transaction category | Optional Expense category | Future Finance category authority | DATA SEMANTIC, VALIDATION PATTERN | No category lifecycle | MEDIUM | ADAPT DONOR |
| DC-ADAPT-007 Monthly base/category budget plan | Monthly/category budgets | Future Finance budget authority | SQL PATTERN, DATA SEMANTIC | Workspace/reporting architecture | LOW | ADAPT DONOR |
| DC-ADAPT-008 Budget adjustments | Budget plan modification only | Mutation/idempotency foundations | VALIDATION PATTERN, TEST IDEA | Confusing with Balance Adjustment; legacy backfill/RLS | LOW | ADAPT DONOR |
| DC-ADAPT-009 Budget actual derivation | Budget spent derivation | Future transaction authority | ALGORITHM, READ-MODEL PATTERN | Transfer/balance adjustment/refund semantics as-is | LOW | ADAPT DONOR |
| DC-ADAPT-010 Reports and aggregation | Reports/month/category/net | Search/Home/Attention projections later | SQL PATTERN, READ-MODEL PATTERN | Web UI, donor privacy model | LOW | ADAPT DONOR |
| DC-ADAPT-011 Native currency with warnings | Multicurrency reporting | Future report authority | DATA SEMANTIC, INVARIANT | FX worker as V1 requirement | LOW | ADAPT DONOR |
| DC-ADAPT-012 Account status/suggestions | Account selection UX | Shared UI/future account model | TEST IDEA, REFERENCE BEHAVIOR | Treating inactivity as archive/history | NONE | REFERENCE ONLY |
| DC-ADAPT-013 Business/personal transfer reporting analogue | Source/context reporting | Household/privacy authority | REFERENCE BEHAVIOR | Business/personal as personal/household privacy | NONE | REFERENCE ONLY |

```text
DONOR ADAPT CANDIDATES RETAINED:
11

DONOR ADAPT CANDIDATES DOWNGRADED TO REFERENCE:
2

DONOR ADAPT CANDIDATES REJECTED / NOT NEEDED:
0
```

## 8. Finance Core Groups

### Scope / Privacy

- Current contributes Auth, Household, Membership, and RLS foundations.
- Donor contributes only a weak business/personal reporting analogue.
- Decision: `EXTEND CURRENT` plus limited reference to donor reporting patterns.
- Residual: Personal vs Household Financial Context, Source vs Financial Context, and cross-scope disclosure.

### Accounts / Balances

- Current has no Finance accounts.
- Donor contributes derived balances and negative-balance behavior.
- Decision: `ADAPT DONOR` for balance derivation and negative balances; `IMPLEMENT GAP` for account authority, unknown balance, anchor, archive, fixed currency.

### Transactions

- Current has no Finance transactions.
- Donor contributes ledger movement and distinct kind classification.
- Decision: `ADAPT DONOR` for movement/classification; `IMPLEMENT GAP` for expense without account and HOMePLUS history.

### Transfers

- Current has mutation/idempotency foundations only.
- Donor contributes paired transfer rows and reporting; Actual confirms mature zero-sum/different-account invariant.
- Decision: `CURRENT + ADAPT DONOR`.
- Residual: atomic canonical transfer operation and same-account validation.

### Corrections / Refunds / History

- Current contributes audit/trash patterns outside Finance.
- Donor primary is rejected for direct update/delete; Actual is reference only for tombstones.
- Decision: `EXTEND CURRENT` for history/trash, `IMPLEMENT GAP` for refunds.

### Categories

- Current has generic category-like patterns but no Finance category.
- Donor supports nullable/free-form transaction category.
- Decision: `ADAPT DONOR` for optional category; `IMPLEMENT GAP` for category archive/history.

### Budgets / Savings

- Current has no Finance budgets.
- Donor contributes monthly/category plans, budget actual derivation, and budget adjustment patterns.
- Decision: `ADAPT DONOR` for budget behavior; `REFERENCE ONLY` for no carry-over/leftover/savings distinction where donor is not authoritative.

### Obligations / Payments / Recurrence

- Current has Planner recurrence/tasks/attention primitives.
- Donor contributes no obligation/payment model.
- Decision: `EXTEND CURRENT` for Planner composition patterns, `IMPLEMENT GAP` for Finance obligation/payment behavior.

### Reports / Multicurrency

- Current has no Finance reports.
- Donor contributes read-model aggregation, transfer separation, native currency, and unconvertible warnings.
- Decision: `ADAPT DONOR`, with HOMePLUS privacy/source/context/refund residuals.

### Cross-Module

- Current owns Planner, Home, Attention, Search, Inventory partial patterns, and shared app foundations.
- Donor is not useful as app authority.
- Decision: `EXTEND CURRENT`.

### Reliability / History

- Current owns audit/outbox/idempotency foundations.
- Donor contributes no acceptable history lifecycle for transactions.
- Decision: `EXTEND CURRENT`; Actual remains reference only for tombstone behavior.

### Frontend

- Current mobile/Expo/shared UI authority remains.
- Donor web UI is reference only for workflow/read-model presentation.
- Decision: `EXTEND CURRENT`, no frontend port.

## 9. HOMePLUS-Specific Residuals

| Residual | Current contribution | Donor contribution | Residual Gap |
|---|---|---|---|
| Personal vs Household Financial Context | Auth/household/RLS foundations | Business/personal analogue only | HOMePLUS Finance context authority. |
| Source vs Financial Context | None directly | Transfer/report analogue | Source/context attribution and dedupe. |
| Personal privacy / cross-scope disclosure | Person/household policies | No useful privacy | Finance-specific projections and denial rules. |
| Unknown Balance | None | Donor rejects by derived account model | Unknown opening balance semantics. |
| Balance Anchor | None | None | Anchor behavior. |
| Balance Adjustment | None | Donor Budget Adjustment is not equivalent | Balance correction with no income/expense/budget impact. |
| Refund | None | None | Refund class, link, cap, and report/budget impact. |
| Savings Account behavior | None | Account/transfer analogue | Savings via accounts/transfers without savings-goal subsystem. |
| Obligation | Planner temporal primitives only | None | Obligation authority and states. |
| Recurring Obligation | Planner recurrence partial | None | Finance occurrence generation/history. |
| Obligation Occurrence | Planner occurrence patterns partial | None | Paid/skipped/cancelled/overdue occurrence behavior. |
| Payment | None | None | Payment authority and reconciliation. |
| Household Obligation -> Planner | Planner origin fields | None | Finance emitter/composition boundary. |
| Personal Finance x Planner | Planner personal visibility partial | None | Opt-in personal task composition. |
| Attention deduplication | Planner attention authority | None | Finance relevance/dedupe rules. |
| Inventory relation | Inventory ownership partial | None | Link without ownership takeover. |
| Assets relation | No active Assets evidence in Current audit | None | Asset link and ownership boundary. |
| HomeCloud relation | No active HomeCloud evidence in Current audit | None | File/link ownership boundary. |
| Home projection | Home summary authority | None | Privacy-safe Finance summary. |
| Search privacy | Planner search gates | Donor search rejected | Finance search projection and privacy. |
| Geni / Automations canonical operations | Mutation/idempotency patterns; no Finance core | SQL agent rejected | Canonical Finance operations independent from AI. |
| Permissions | Household/RLS foundations | Donor permissions rejected | Finance permission layer composed with Current. |
| Mobile UI integration | Shared UI/mobile authority | Donor web UI reference only | Finance mobile workflows. |

## 10. Non-Goals Preserved

| Non-goal | Current | Donor | Decision |
|---|---|---|---|
| Bank Sync | Absent, aligned with V1 | Not needed | NOT NEEDED |
| Open Banking | Absent, aligned with V1 | Not needed | NOT NEEDED |
| Investments/stocks/crypto/tax | Absent in Current; donor `account_group=investment` rejected | Not needed / reject scope expansion | NOT NEEDED |
| Enterprise accounting / invoicing / payroll | Absent | Not needed | NOT NEEDED |
| Loan/mortgage subsystem | Absent | Not used | NOT NEEDED |
| Credit score | Absent | Not used | NOT NEEDED |
| Automatic FX engine | Absent | Donor FX worker rejected as V1 requirement | NOT NEEDED |
| Splitwise-like debt settlement | Absent | Donor transfer/report analogue not settlement | NOT NEEDED |
| Private Planner subsystem | Current Planner remains canonical | Donor irrelevant | NOT NEEDED |
| Finance savings-goal subsystem | Absent | Donor savings analogue insufficient | NOT NEEDED |

## 11. Contradictions / Open Evidence

```text
MATRIX CONTRADICTIONS:
none
```

Open evidence questions retained from accepted audits:

- Primary donor transfer atomicity is not proven by a canonical service/API.
- Primary donor same-account transfer rejection is not proven; Actual confirms the invariant as reference only.
- Cross-currency transfer behavior needs HOMePLUS policy without importing donor FX worker.
- Budget carry-over absence in donor is observed but not a formal invariant proof.
- Refund, Balance Adjustment, category lifecycle, account lifecycle, and obligation/payment behavior remain unsupported by donor.
- Assets and HomeCloud current authorities were not active in accepted Current evidence.

## 12. Changes Performed

```text
CREATED:
docs\implementation\FINANCE_CURRENT_DONOR_VS_TARGET_MATRIX.md

MODIFIED:
none

NOT MODIFIED:
docs\implementation\FINANCE_CURRENT_CAPABILITY_AUDIT.md
docs\implementation\FINANCE_DONOR_CAPABILITY_AUDIT.md
C:\Users\thega\Downloads\HOMePLUS_FINANCE_PRODUCT_FREEZE_V1.0.md

CODE CHANGES:
none

DONOR REPOS:
not modified

FIREFLY III:
not consulted
```

Final coverage counts:

```text
TARGET ACCEPTANCE ROWS:
62/62

FIN-INV COVERAGE:
74/74

COVERED BY CURRENT:
0

COVERED BY CURRENT + DONOR:
7

PARTIAL:
35

RESIDUAL GAP:
18

NON-GOAL:
2

DONOR ADAPT CANDIDATES RETAINED:
11

DONOR ADAPT CANDIDATES DOWNGRADED TO REFERENCE:
2

DONOR ADAPT CANDIDATES REJECTED / NOT NEEDED:
0

CURRENT AUTHORITIES TO PRESERVE:
15
```
