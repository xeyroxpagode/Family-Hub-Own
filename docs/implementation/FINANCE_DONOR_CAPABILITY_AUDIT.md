# HOMePLUS Finance - Technical Donor Capability Audit

Status: FINANCE_DONOR_AUDIT_COMPLETE
Date: 2026-08-10
Mode: DONOR-AWARE, NO IMPLEMENTATION

This audit answers only: which missing HOMePLUS Finance target capabilities have real behavior in local donor repositories that may be reused as technical evidence. It does not define implementation scope, migrations, tables, services, screens, waves, or final real gap.

## 1. Audit Baseline

```text
HOMEPLUS REPO:
C:\Users\thega\Desktop\HomePlus

HOMEPLUS BRANCH:
pulido-medio-inventario-planner

HOMEPLUS HEAD:
3282907c0b0e2fe3b963e33cf4f0afc10909424f

CURRENT AUDIT:
docs\implementation\FINANCE_CURRENT_CAPABILITY_AUDIT.md

PRODUCT FREEZE:
C:\Users\thega\Downloads\HOMePLUS_FINANCE_PRODUCT_FREEZE_V1.0.md

PRODUCT FREEZE SHA-256:
D1DDDC2166DBFA4FB7B3940F4C5A3BA37E92CBD403BFE8983D0D16CD4B9A87A2
```

Inputs used:

- Finance Product Freeze V1.0, hash verified locally.
- Accepted Current audit, used as the source for `Current status`.
- Local donor repositories only. No clone, fetch, pull, checkout, install, migration, database startup, application startup, or donor write was performed.

Baseline note: `git status --short` in HOMePLUS showed `?? docs/implementation/FINANCE_CURRENT_CAPABILITY_AUDIT.md` before this deliverable was created. That file was treated as the accepted pre-existing input and was not modified.

## 2. Donor Provenance

### Donor Preflight

| Donor | Local path | Git repository | Remote origin | Expected repository | Remote match | Branch / detached | HEAD | HEAD subject | HEAD date | Git status | License file | License detected | Result |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Primary | `C:\Users\thega\Desktop\HomePlus-donors\expense-budget-tracker` | YES | `https://github.com/kirill-markin/expense-budget-tracker.git` | `github.com/kirill-markin/expense-budget-tracker` | YES | `main` | `93d6ed1f8174a8f39551642391484dd87b4a045b` | `Merge pull request #198 from kirill-markin/codex/pr-quality-gate` | `2026-08-10T18:06:35+02:00` | CLEAN | `LICENSE` | MIT License | PASS |
| Mature reference | `C:\Users\thega\Desktop\HomePlus-donors\actual` | YES | `https://github.com/actualbudget/actual.git` | `github.com/actualbudget/actual` | YES | `master` | `d67ca574673fef386115fa5ebe26b62f0d6216e3` | `tour: add initial tour framework (#8656)` | `2026-08-10T19:00:01Z` | CLEAN | `LICENSE.txt` | MIT-style / MIT License text | PASS |
| Edge reference | `C:\Users\thega\Desktop\HomePlus-donors\firefly-iii` | YES | `https://github.com/firefly-iii/firefly-iii.git` | `github.com/firefly-iii/firefly-iii` | YES | `main` | `fd8791d08d4d9e6467519a78048cd038e26b8878` | `No longer build v1, remove some old code.` | `2026-08-10T06:00:43+02:00` | CLEAN | `LICENSE`, `COPYING` | GNU AGPL v3 | NOT REQUIRED |

### Provenance By Repository

```text
SOURCE REPO:
kirill-markin/expense-budget-tracker
LOCAL PATH:
C:\Users\thega\Desktop\HomePlus-donors\expense-budget-tracker
SOURCE REMOTE:
https://github.com/kirill-markin/expense-budget-tracker.git
SOURCE COMMIT:
93d6ed1f8174a8f39551642391484dd87b4a045b
SOURCE LICENSE:
MIT License
DIRTY:
NO
ROLE:
PRIMARY DONOR - principal candidate for PORT / ADAPT
```

```text
SOURCE REPO:
actualbudget/actual
LOCAL PATH:
C:\Users\thega\Desktop\HomePlus-donors\actual
SOURCE REMOTE:
https://github.com/actualbudget/actual.git
SOURCE COMMIT:
d67ca574673fef386115fa5ebe26b62f0d6216e3
SOURCE LICENSE:
MIT-style / MIT License text
DIRTY:
NO
ROLE:
MATURE LOGIC REFERENCE ONLY
```

```text
SOURCE REPO:
firefly-iii/firefly-iii
LOCAL PATH:
C:\Users\thega\Desktop\HomePlus-donors\firefly-iii
SOURCE REMOTE:
https://github.com/firefly-iii/firefly-iii.git
SOURCE COMMIT:
fd8791d08d4d9e6467519a78048cd038e26b8878
SOURCE LICENSE:
GNU AGPL v3
DIRTY:
NO
ROLE:
REFERENCE ONLY, NOT CONSULTED
```

## 3. Primary Donor Architecture Boundary

Useful Finance core:

- Postgres schema and SQL read models for ledger entries, derived accounts, balances, budget grid, FX conversion, and budget adjustments.
- TypeScript services for transactions, balances, account suggestions/status, budget grid, budget adjustments, and validation.
- Tests around account status/suggestions, transaction mapping/filtering, budget adjustment idempotency, safe integer bounds, deterministic detail scans, and UI model aggregation.

Accidental donor architecture:

- `workspaces` and `workspace_members`, donor RLS helpers, web session context, and SQL execution roles.
- Next.js web application, web tables, chart presentation, demo mode, chat SQL-agent workflow, and app-specific state.
- AWS/Cognito/auth app, Docker/infra/deployment stack, worker-owned FX ingestion/build system.

Rejected infrastructure for HOMePLUS:

- Donor Auth/Workspace/Membership/Permissions as a parallel authority.
- Donor web UI/navigation/app shell.
- Donor SQL agent and AI chat as a correctness dependency.
- Donor FX worker as a HOMePLUS V1 requirement.

Principle applied: port behavior, not accidental architecture.

## 4. Target x Current x Primary Donor Matrix

| Target capability | Current status | Donor evidence | Donor behavior | Dependencies | Classification | License | HomePlus fit |
|---|---|---|---|---|---|---|---|
| Personal vs Household Financial Context | PARTIAL | `account_metadata.account_type`, `BUSINESS_PERSONAL_TRANSFER_QUERY`, `workspaces` | Partial business/personal account labels inside a donor workspace; not owner-only personal finance or HOMePLUS household privacy. | Donor workspace/RLS/account metadata. | REJECT | MIT, compatible evidence | Do not import as context model. At most it warns that source/context reporting needs explicit semantics. |
| Accounts | ABSENT | `db/views/accounts.sql` / `accounts` view | Accounts are derived from `ledger_entries` by `account_id`; no physical account authority. | Postgres view, ledger rows. | ADAPT | MIT, license compatible: YES | Useful only as derived-read behavior; HOMePLUS needs its own account authority. |
| Account metadata | ABSENT | `db/migrations/0006_account_metadata.sql`, `0044`, `0045` / `account_metadata` | Sidecar metadata for liquidity, personal/business, regular/investment. No FK to account view. | Donor workspace and account_id strings. | ADAPT | MIT, license compatible: YES | Metadata-sidecar pattern is useful; exact account types do not define HOMePLUS. |
| Unknown Balance / Balance Anchor | ABSENT | `accounts` view; `ledger_entries` only | No account without movements; no unknown opening state; no explicit anchor. | Ledger-derived accounts. | REJECT | MIT | Does not fit target; cannot treat missing opening balance as zero. |
| Balance derivation | ABSENT | `apps/web/src/server/balances/getBalancesSummary.ts` / `ACCOUNTS_QUERY`, `TOTALS_QUERY` | Balances are derived by summing ledger amounts, with positive/negative totals and nullable report conversion. | Ledger entries, accounts view, FX rates, metadata. | ADAPT | MIT, license compatible: YES | Strong behavior reference for derived balances, but must compose with HOMePLUS account model. |
| Negative balances | ABSENT | `getBalancesSummary.ts`, `accountStatus.ts`, `accountStatus.test.ts` | Negative balances are allowed and treated as active/non-zero. | Numeric ledger sum. | ADAPT | MIT, license compatible: YES | Useful invariant for accounts and credit-like balances. |
| Account archival/deletion | ABSENT | No archive/delete lifecycle for accounts; `accounts` is a view | No account archive preserving history was found. | N/A | REJECT | MIT | Does not meet HOMePLUS archive/history target. |
| Income / Expense / Transfer classes | ABSENT | `ledger_entries.kind`, `transactionKindSchema`, `TRANSACTION_KINDS` | `kind` is constrained to `income`, `spend`, `transfer`. | Ledger schema and validation. | ADAPT | MIT, license compatible: YES | Good classification primitive; naming and account optionality differ. |
| Expense without Account | ABSENT | `ledger_entries.account_id NOT NULL`; create/update APIs require `accountId` | All ledger entries require an account. | Ledger schema. | REJECT | MIT | Does not fit HOMePLUS quick expense target. |
| Ledger event grouping | ABSENT | `ledger_entries.event_id`, `idx_ledger_entries_event`, `chat/shared.ts` | Related rows can share `event_id`; create API generates a new event per row. | DB event_id plus API/SQL-agent convention. | ADAPT | MIT, license compatible: YES | Useful provenance/grouping behavior; atomic creation is not proven in primary API. |
| Transfer representation | ABSENT | `chat/shared.ts` internal transfer protocol; `budget_grid.sql`; demo data | Transfer convention is two rows with same `event_id`, source negative, destination positive, `category=NULL`. | Ledger rows and convention; direct API does not expose canonical transfer command. | ADAPT | MIT, license compatible: YES | Good target behavior evidence, but needs HOMePLUS operation authority and validation. |
| Transfer source != destination validation | ABSENT | Primary: no hard DB/API validation found; Actual Q1 confirms mature invariant. | Primary relies on convention; no same-account prohibition found. | N/A | REFERENCE ONLY | MIT | Actual confirms target invariant; primary is insufficient. |
| Cross-currency transfer | ABSENT | `chat/shared.ts` protocol; `fx_rates_daily` joins | Cross-currency transfer records actual amount on each row; FX converts for reporting. No explicit source/destination amount object. | FX tables and worker for report currency. | REFERENCE ONLY | MIT | Useful behavior reference; donor FX subsystem is not V1 requirement. |
| Categories | PARTIAL | `ledger_entries.category`, `getCategories`, `categorySchema` | Category is nullable on transactions, free-form text, derived from history. | Ledger rows, validation. | ADAPT | MIT, license compatible: YES | Useful optional-category behavior; category authority/lifecycle absent. |
| Category archive/delete/history | ABSENT | No category table found; categories are literal text | No archive/delete lifecycle; history persists only as stored text. | N/A | REJECT | MIT | Does not fit category archive target. |
| Monthly/category budgets | ABSENT | `budget_lines`, `insertBudgetPlan.ts`, `getBudgetGrid.ts` | Monthly base plan by `budget_month`, direction, category, currency; latest base wins by `inserted_at`. | Postgres, workspace, report currency. | ADAPT | MIT, license compatible: YES | Useful budget-period/category behavior, but not final HOMePLUS schema. |
| Budget adjustments | ABSENT | `budget_adjustments`, migrations `0053`-`0057`, `budgetAdjustments.ts/test.ts` | Normalized additive adjustments with client IDs, conflict behavior, safe integer/category/note bounds, deterministic detail scans. | Postgres constraints/RLS/workspace. | ADAPT | MIT, license compatible: YES | Strong candidate behavior for budget adjustment semantics; must not import RLS/workspace architecture. |
| Budget spent derivation | ABSENT | `getBudgetGrid.ts` / `QUERY` | Actuals are derived from ledger by month/direction/category; spend is sign-normalized, income positive. | Ledger entries, FX rates. | ADAPT | MIT, license compatible: YES | Useful aggregation behavior, but transfer/refund semantics need HOMePLUS adjustment. |
| Transfer impact in budget/balance | ABSENT | `getBudgetGrid.ts` / `CUMULATIVE_BALANCE_QUERY`, `transferSubtotals` UI model | Transfers are a separate direction and included in cumulative balance math; transfer rows have no planned values. | Ledger entries, budget UI model, FX. | REFERENCE ONLY | MIT | Confirms separation from spend/income, but HOMePLUS V1 must avoid budget consumption double counting. |
| Reports / aggregation | ABSENT | `getBudgetGrid.ts`, `db/queries/budget_grid.sql`, `getTransactions.ts` filters | Month, category, direction, totals, business/personal transfer and conversion-warning aggregations exist. | SQL read models, FX, account metadata. | ADAPT | MIT, license compatible: YES | Useful report behavior; must compose with HOMePLUS privacy and transaction classes. |
| Currency model | ABSENT | `ledger_entries.currency`, `workspace_settings.reporting_currency`, `0034_fx_rates_cutover.sql` | Native currency per movement; report currency conversion via exact-date all-pairs `fx_rates_daily`; missing conversion can be reported. | FX worker/tables/settings. | ADAPT | MIT, license compatible: YES | Native-currency primitive is useful; FX worker is not V1 requirement. |
| Account currency immutability | ABSENT | `accounts` view uses `MODE() WITHIN GROUP (ORDER BY currency)` | Account currency is derived statistically, not fixed historically. | Ledger view. | REJECT | MIT | Does not satisfy fixed account currency invariant. |
| History / correction / deletion | PARTIAL | `updateLedgerEntry.ts`, `deleteLedgerEntry.ts` | Transactions are edited in place and hard-deleted by entry_id. | Ledger table, RLS. | REJECT | MIT | Does not meet HOMePLUS history-preserving/trash requirements. |
| Refund semantics | ABSENT | No refund model or refund-to-expense relation found | No direct useful refund behavior. | N/A | REJECT | MIT | Must not infer refund from income/spend names. |
| Savings via account + transfer | ABSENT | `account_group='investment'`, transfer direction rows | Partial analogue only; no HOMePLUS savings semantics. | Account metadata and ledger. | REFERENCE ONLY | MIT | Useful caution: savings should remain account/transfer behavior, not budget leftover. |
| Obligation / recurrence / payment | ABSENT | No obligation/payment/occurrence domain found | Donor does not implement HOMePLUS obligations/payments. | N/A | REJECT | MIT | No useful direct donor capability. |
| Planner composition / Attention / Search / Inventory / Assets / HomeCloud / Geni | PARTIAL | Donor has no HOMePLUS app surfaces | Not relevant to donor finance core. | HOMePLUS owns these authorities. | NOT NEEDED | MIT | Current HOMePLUS authorities remain source of truth. |
| Auth / Household / membership / permissions | PARTIAL | `workspaces`, `workspace_members`, RLS policies | Donor workspace auth is parallel architecture. | Donor Auth/RLS/session. | NOT NEEDED | MIT | HOMePLUS already has these foundations. |
| Web UI workflow | ABSENT for Finance UI | `apps/web/src/ui/tables`, budget dashboard components, e2e tests | Web workflow reveals form/filter/report concepts only. | Next.js/web UI. | REFERENCE ONLY | MIT | No frontend port; React Native/Expo authority remains HOMePLUS. |
| SQL agent / AWS / Cognito / worker / deployment | NOT NEEDED | `apps/sql-api`, `apps/auth`, `apps/worker`, `infra/aws`, `infra/docker` | Infrastructure and AI SQL tooling around the finance core. | Donor stack. | REJECT | MIT | Do not import parallel infra or correctness dependency. |

## 5. FIN-INV-001..074 Donor Coverage

| FIN-INV | Primary donor | Evidence | Actual reference if needed | Observation |
|---|---|---|---|---|
| FIN-INV-001 | PARTIAL | Negative evidence: no bank sync/open-banking found in primary core; donor has FX/investment group concepts. | N/A | V1 non-goal mostly aligns by absence, but FX/investment metadata must not expand HOMePLUS scope. |
| FIN-INV-002 | NOT SUPPORTED | `workspaces`, `workspace_members`, `account_metadata.account_type` | N/A | No owner-only Personal Finance authority. |
| FIN-INV-003 | NOT SUPPORTED | `workspaces`, `workspace_members` | N/A | Workspace is not Household. |
| FIN-INV-004 | NOT SUPPORTED | Donor RLS is workspace-based. | N/A | No private personal finance semantics. |
| FIN-INV-005 | NOT SUPPORTED | No private account projection found. | N/A | Household cannot be inferred from donor workspace. |
| FIN-INV-006 | NOT APPLICABLE | Donor has web/search/chat surfaces, not HOMePLUS Home/Search privacy. | N/A | Use HOMePLUS authorities. |
| FIN-INV-007 | PARTIAL | `BUSINESS_PERSONAL_TRANSFER_QUERY` and `account_type` | N/A | Partial analogue for cross-context transfer reporting only. |
| FIN-INV-008 | NOT SUPPORTED | `accounts` view derived from `ledger_entries` | N/A | No manual account without movement; unknown opening balance absent. |
| FIN-INV-009 | NOT SUPPORTED | No balance anchor object found. | N/A | No anchor behavior. |
| FIN-INV-010 | NOT SUPPORTED | No balance adjustment object found. | N/A | Budget/report contamination cannot be prevented by donor behavior. |
| FIN-INV-011 | SUPPORTED | `getBalancesSummary.ts`, `accountStatus.test.ts` | N/A | Negative balances are preserved and active. |
| FIN-INV-012 | NOT SUPPORTED | `accounts` view derives currency via `MODE()` | N/A | Account currency is not fixed historically. |
| FIN-INV-013 | NOT SUPPORTED | `accounts` is a view; no account archive lifecycle. | N/A | Archive-with-history absent. |
| FIN-INV-014 | PARTIAL | `ledger_entries.kind='income'` | N/A | Income class exists, but account/context semantics differ. |
| FIN-INV-015 | PARTIAL | `ledger_entries.kind='spend'` | N/A | Expense/spend class exists, but expense-without-account absent. |
| FIN-INV-016 | SUPPORTED | `ledger_entries.kind IN ('income','spend','transfer')` | Actual Q1: `validForTransfer` distinguishes transfer pairs. | Transfer is a distinct class. |
| FIN-INV-017 | PARTIAL | `chat/shared.ts` two-row same-event protocol | Actual Q1 confirms zero-sum paired transfer invariant. | Primary has convention/read behavior, but no canonical atomic transfer API found. |
| FIN-INV-018 | NOT SUPPORTED | No primary same-account validation found. | Actual Q1 rejects same-account transfers. | Primary evidence insufficient for target invariant. |
| FIN-INV-019 | PARTIAL | `chat/shared.ts` says cross-currency amounts differ; ledger stores per-row amount/currency. | N/A | Stores native amounts per row, not a first-class transfer operation. |
| FIN-INV-020 | NOT SUPPORTED | `ledger_entries.account_id NOT NULL` | N/A | Income/spend/transfer all require account in primary. |
| FIN-INV-021 | PARTIAL | `account_type`, business/personal transfer query | N/A | Partial analogue; not HOMePLUS source/context semantics. |
| FIN-INV-022 | PARTIAL | `event_id`, transfer grouping | N/A | Can group source/funding movements, but no household/private attribution model. |
| FIN-INV-023 | NOT SUPPORTED | No account privacy projection found. | N/A | Donor workspace RLS does not satisfy household/private separation. |
| FIN-INV-024 | PARTIAL | Transfer two-row protocol | Actual Q1 | Contribution as transfer could be represented, but donor has no contribution concept. |
| FIN-INV-025 | PARTIAL | `chat/shared.ts` cautions "Debt repayment" is not transfer when reimbursement of shared spending. | N/A | Useful reference only; no reimbursement model. |
| FIN-INV-026 | NOT SUPPORTED | `updateLedgerEntry.ts` mutates rows in place. | Actual Q2: transactions/account types include `tombstone`. | Primary does not preserve edit history. |
| FIN-INV-027 | NOT SUPPORTED | No reversal/reversal-of behavior found. | N/A | Correction pattern absent. |
| FIN-INV-028 | NOT SUPPORTED | `deleteLedgerEntry.ts` hard-deletes by `entry_id`. | Actual Q2 excludes `tombstone=0` in balances. | Primary has no trash/restore for financial effects. |
| FIN-INV-029 | NOT SUPPORTED | No refund model found. | N/A | Refund is absent. |
| FIN-INV-030 | NOT SUPPORTED | No refund-to-expense relation found. | N/A | Refund link absent. |
| FIN-INV-031 | NOT SUPPORTED | No refund budget handling found. | N/A | Refund budget reduction absent. |
| FIN-INV-032 | NOT SUPPORTED | No refund cap validation found. | N/A | Refund validation absent. |
| FIN-INV-033 | NOT SUPPORTED | No refund lifecycle found. | N/A | Refund orphan prevention absent. |
| FIN-INV-034 | SUPPORTED | Ledger insert/update services are independent of budget plan tables. | N/A | Budget does not appear to block transaction entry. |
| FIN-INV-035 | PARTIAL | `getBudgetGrid.ts` derives actuals from ledger. | N/A | Spent/actual is ledger-derived; exact HOMePLUS categories/refunds absent. |
| FIN-INV-036 | PARTIAL | Transfers are separate `direction='transfer'` rows in budget grid. | Actual Q1 supports transfer separation. | Transfer is not spend/income, but donor includes transfer in balance rows. |
| FIN-INV-037 | NOT SUPPORTED | No balance adjustment model found. | N/A | Cannot prove exclusion from budget. |
| FIN-INV-038 | NOT SUPPORTED | No refund model found. | N/A | Cannot prove refund budget behavior. |
| FIN-INV-039 | PARTIAL | Budget grid separates planned/actual from account balances. | N/A | Supports the distinction, but no HOMePLUS savings target. |
| FIN-INV-040 | PARTIAL | Budget plans are month-scoped; no automatic carry-over behavior found in core queries. | N/A | Absence of carry-over found, but not proven as invariant. |
| FIN-INV-041 | PARTIAL | Accounts plus transfers exist; `account_group` includes investment. | N/A | Savings can be represented as account behavior only by analogy. |
| FIN-INV-042 | PARTIAL | Transfer two-row protocol. | Actual Q1 | Savings transfer analogue exists, not a savings feature. |
| FIN-INV-043 | PARTIAL | `fx_rates_daily`, `has_unconvertible`, report currency warnings. | N/A | Donor converts or flags missing FX; HOMePLUS V1 may avoid FX subsystem. |
| FIN-INV-044 | PARTIAL | `budget_lines` latest base by `inserted_at`; `budget_adjustments` rows have timestamps. | N/A | Month-scoped plan history exists, but future-edit invariant not directly proven. |
| FIN-INV-045 | NOT APPLICABLE | No obligation model found. | N/A | Donor cannot create expense from obligation. |
| FIN-INV-046 | NOT APPLICABLE | No Planner/payment model found. | N/A | Cross-module invariant outside donor. |
| FIN-INV-047 | NOT SUPPORTED | No payment model found. | N/A | Obligation payment absent. |
| FIN-INV-048 | NOT SUPPORTED | No obligation overdue model found. | N/A | Derived overdue absent. |
| FIN-INV-049 | NOT SUPPORTED | No recurring obligation occurrence model found. | N/A | Occurrence history absent. |
| FIN-INV-050 | NOT SUPPORTED | No debt occurrence model found. | N/A | Debt accumulation absent. |
| FIN-INV-051 | NOT SUPPORTED | No obligation recurrence lifecycle found. | N/A | Pause/end behavior absent. |
| FIN-INV-052 | NOT SUPPORTED | No obligation occurrence edit behavior found. | N/A | Past occurrences not represented. |
| FIN-INV-053 | NOT APPLICABLE | No partial payment model found. | N/A | V1 non-support cannot be reused. |
| FIN-INV-054 | NOT SUPPORTED | No payment occurrence constraint found. | N/A | Payment relation absent. |
| FIN-INV-055 | NOT SUPPORTED | No payment trash/obligation recalculation found. | N/A | Payment lifecycle absent. |
| FIN-INV-056 | NOT APPLICABLE | No Planner task model in donor. | N/A | HOMePLUS Planner owns this. |
| FIN-INV-057 | NOT APPLICABLE | No HOMePLUS Planner composition. | N/A | Use Current Planner authority. |
| FIN-INV-058 | NOT APPLICABLE | No personal obligation planner composition. | N/A | Donor irrelevant. |
| FIN-INV-059 | PARTIAL | `getBudgetGrid.ts`, `getTransactions.ts` aggregations. | N/A | Expense counting can be derived from ledger, but HOMePLUS real-expense rules absent. |
| FIN-INV-060 | SUPPORTED | Transfer distinct kind/direction. | Actual Q1 | Transfers are separated from spend/income. |
| FIN-INV-061 | NOT SUPPORTED | No balance adjustment model found. | N/A | Adjustment exclusion absent. |
| FIN-INV-062 | NOT SUPPORTED | No refund model found. | N/A | Refund reporting absent. |
| FIN-INV-063 | PARTIAL | `BUSINESS_PERSONAL_TRANSFER_QUERY` | N/A | Can report net transfer across account types, not contribution income semantics. |
| FIN-INV-064 | PARTIAL | `fx_rates_daily`, `has_unconvertible`, `conversionWarnings` | N/A | Donor avoids silent missing conversion but depends on FX subsystem. |
| FIN-INV-065 | PARTIAL | Ledger services own donor financial truth. | N/A | Good boundary idea; not HOMePLUS authority. |
| FIN-INV-066 | NOT APPLICABLE | No Planner. | N/A | Donor cannot define task authority. |
| FIN-INV-067 | NOT APPLICABLE | No Inventory integration. | N/A | Donor irrelevant. |
| FIN-INV-068 | NOT APPLICABLE | No Assets integration. | N/A | Donor irrelevant. |
| FIN-INV-069 | NOT APPLICABLE | No HomeCloud integration. | N/A | Donor irrelevant. |
| FIN-INV-070 | NOT APPLICABLE | No HOMePLUS Attention surface. | N/A | Donor irrelevant. |
| FIN-INV-071 | NOT APPLICABLE | No HOMePLUS notification authority. | N/A | Donor irrelevant. |
| FIN-INV-072 | NOT APPLICABLE | Donor search/chat is not HOMePLUS Search. | N/A | Reject donor search authority. |
| FIN-INV-073 | NOT APPLICABLE | Donor SQL agent/chat instructions. | N/A | Reject as correctness dependency. |
| FIN-INV-074 | PARTIAL | Core ledger operations exist without requiring AI; SQL-agent is optional surrounding workflow. | N/A | Useful non-AI precedent; do not import SQL agent. |

Coverage: 74/74 invariants classified.

## 6. Primary Donor Capability Findings

### Accounts

Evidence:

- Source repo: `kirill-markin/expense-budget-tracker`
- Source commit: `93d6ed1f8174a8f39551642391484dd87b4a045b`
- Source license: MIT
- Path/symbol: `db/views/accounts.sql` / `accounts`
- Path/symbol: `db/migrations/0006_account_metadata.sql` / `account_metadata`
- Path/symbol: `apps/web/src/server/balances/accountStatus.ts` / `computeAccountStatus`
- Test: `apps/web/src/server/balances/accountStatus.test.ts`

Behavior:

- Account identity is derived from ledger rows, grouped by `account_id`.
- Account currency is derived with `MODE() WITHIN GROUP (ORDER BY currency)`.
- Metadata is a sidecar keyed by workspace/account_id, not the source of account existence.
- Negative balances are valid and keep an account active.
- Zero balances with no or stale non-transfer movement can be inactive.

Dependencies:

- Postgres view, ledger entries, workspace-scoped RLS, FX/reporting joins for balances.

Invariants:

- Supports negative balances.
- Does not support unknown balance, balance anchor, account existence without movement, fixed account currency, or archive/history lifecycle.

Classification:

- `ADAPT` for derived balance and metadata sidecar behavior.
- `REJECT` for using donor accounts as HOMePLUS account authority.

### Transactions

Evidence:

- Path/symbol: `db/migrations/0001_initial_schema.sql` / `ledger_entries`
- Path/symbol: `apps/web/src/server/api/validation.ts` / `transactionKindSchema`
- Path/symbol: `apps/web/src/server/transactions/getTransactions.ts` / `TRANSACTION_KINDS`, `getTransactionsPage`
- Path/symbol: `apps/web/src/server/transactions/createLedgerEntry.ts` / `createLedgerEntry`
- Path/symbol: `apps/web/src/server/transactions/updateLedgerEntry.ts` / `updateLedgerEntry`
- Path/symbol: `apps/web/src/server/transactions/deleteLedgerEntry.ts` / `deleteLedgerEntry`
- Test: `apps/web/src/server/transactions/getTransactions.test.ts`

Behavior:

- Ledger entries are one account movement per row.
- `kind` is constrained to `income`, `spend`, or `transfer`.
- `amount`, `currency`, `account_id`, `ts`, and `event_id` are required.
- Create inserts one row and generates a fresh `event_id`.
- Update mutates one row in place.
- Delete hard-deletes one row.

Dependencies:

- Postgres table/RLS, report currency, FX exact-date join for returned `amount_report`.

Invariants:

- Supports distinct transaction classes.
- Does not support expense without account.
- Does not support history-preserving correction or trash/restore.

Classification:

- `ADAPT` for ledger movement/classification behavior.
- `REJECT` for edit/delete lifecycle as HOMePLUS historical model.

### Transfers

Evidence:

- Path/symbol: `apps/web/src/server/chat/shared.ts` / Internal transfer protocol
- Path/symbol: `db/queries/budget_grid.sql` / `BUSINESS_PERSONAL_TRANSFER_QUERY`
- Path/symbol: `apps/web/src/server/budget/getBudgetGrid.ts` / `BUSINESS_PERSONAL_TRANSFER_QUERY`
- Path/symbol: `apps/web/src/server/demo/data.ts` / two-row transfer demo entries

Behavior:

- Donor convention: internal transfer is two rows with the same `event_id`.
- Source row is negative; destination row is positive.
- Both rows have `kind='transfer'` and `category=NULL`.
- Cross-currency transfers use actual amount in each row/currency.
- Business/personal transfer reporting groups rows by event_id and account type.

Dependencies:

- Ledger event_id convention, account metadata, SQL queries, optional chat plan protocol.

Invariants:

- Transfer is distinct from income/spend.
- Same-account validation and atomic transfer creation were not proven in primary donor service/API.

Classification:

- `ADAPT` for two-row transfer representation and grouped reporting.
- `REFERENCE ONLY` for cross-currency/Fx behavior.

### Balances

Evidence:

- Path/symbol: `apps/web/src/server/balances/getBalancesSummary.ts` / `ACCOUNTS_QUERY`, `TOTALS_QUERY`
- Path/symbol: `db/queries/balances.sql`
- Test: `apps/web/src/server/accounts/getAccountSuggestions.test.ts`

Behavior:

- Per-account balances are derived from ledger sums.
- Totals are grouped by currency and split into positive/negative balances.
- Last transaction excludes transfers for account status/staleness.
- Account suggestions use latest operation ordering while filtering inactive accounts.

Dependencies:

- Ledger rows, derived accounts view, FX read model, account metadata.

Invariants:

- Negative balances are supported.
- Transfer-only zero accounts can be inactive depending on non-transfer history.

Classification:

- `ADAPT`.

### Budgets

Evidence:

- Path/symbol: `db/migrations/0001_initial_schema.sql` / `budget_lines`
- Path/symbol: `db/migrations/0053_budget_adjustments_additive.sql` / `budget_adjustments`
- Path/symbol: `db/migrations/0054_budget_adjustments_backfill_and_freeze.sql`
- Path/symbol: `db/migrations/0055_budget_adjustments_browser_contract.sql`
- Path/symbol: `db/migrations/0057_drop_legacy_budget_model.sql`
- Path/symbol: `apps/web/src/server/budget/getBudgetGrid.ts` / `QUERY`
- Path/symbol: `apps/web/src/server/budget/budgetAdjustments.ts`
- Tests: `apps/web/src/server/budget/budgetAdjustments.test.ts`

Behavior:

- Monthly plan rows are keyed by month/direction/category.
- Base plans use latest-write-wins by `inserted_at`.
- Adjustments are additive, normalized rows with client-generated IDs.
- Adjustment create is idempotent for exact retry and explicitly conflicts for changed rows.
- Browser contract hides workspace/origin and enforces safe integers and string bounds.
- Actuals are derived from ledger entries by month/direction/category.

Dependencies:

- Postgres constraints, workspace/RLS policies, report currency, FX joins.

Invariants:

- Budget does not appear to block ledger entry.
- Budget actuals are transaction-derived.
- Transfer is modeled separately, but donor budget rows include transfer actuals for balance math.

Classification:

- `ADAPT`.

### Categories

Evidence:

- Path/symbol: `ledger_entries.category`
- Path/symbol: `apps/web/src/server/transactions/getTransactions.ts` / `getCategories`
- Path/symbol: `apps/web/src/server/api/validation.ts` / `nullableCategorySchema`, `categorySchema`
- Path/symbol: `apps/web/src/server/chat/shared.ts` / category discovery and transfer convention

Behavior:

- Categories are free-form text values.
- Transaction category can be null.
- Transfers conventionally use `category=NULL`.
- Category lists are derived from ledger history.

Dependencies:

- Ledger row text fields and validation.

Invariants:

- Optional category supported.
- Archive/delete/category authority not supported.

Classification:

- `ADAPT` for optional/free-form category on transactions.
- `REJECT` for category lifecycle.

### Reports

Evidence:

- Path/symbol: `apps/web/src/server/budget/getBudgetGrid.ts` / `QUERY`, `CUMULATIVE_BALANCE_QUERY`, `MONTH_END_BALANCES_QUERY`, `BUSINESS_PERSONAL_TRANSFER_QUERY`
- Path/symbol: `apps/web/src/server/transactions/getTransactions.ts` / filters and sorting
- Path/symbol: `db/queries/budget_grid.sql`

Behavior:

- Aggregates actuals by month/direction/category.
- Spend is sign-normalized for display/actual.
- Income stays positive.
- Transfer has separate direction and participates in cumulative balance math.
- Missing FX conversion yields unconvertible flags/warnings.
- Business/personal transfer row computes personal-side net amount.

Dependencies:

- SQL read models, FX daily rates, account metadata.

Invariants:

- Strong evidence for double-count prevention by explicit transfer direction.
- No refund/adjustment report exclusion because those entities do not exist.

Classification:

- `ADAPT` for reporting/aggregation behavior.

### Currency

Evidence:

- Path/symbol: `ledger_entries.currency`
- Path/symbol: `workspace_settings.reporting_currency`
- Path/symbol: `db/migrations/0034_fx_rates_cutover.sql` / `fx_rates_raw`, `fx_rates_daily`
- Path/symbol: `getBudgetGrid.ts`, `getBalancesSummary.ts`, `getTransactions.ts` exact-date FX joins

Behavior:

- Every movement has native currency.
- Reporting uses configurable report currency.
- FX read model is exact-date all-pairs daily.
- Missing FX can be surfaced through null report amounts/warnings.

Dependencies:

- Worker-owned FX ingestion and build tables.

Invariants:

- Useful for native-currency preservation and avoiding silent conversion failure.
- Does not satisfy HOMePLUS V1 "no FX engine required" by itself.
- Does not fix account currency historically.

Classification:

- `ADAPT` for native currency and warning primitives.
- `REJECT` for importing FX worker as V1 requirement.

### History

Evidence:

- Path/symbol: `updateLedgerEntry.ts` / `UPDATE ledger_entries`
- Path/symbol: `deleteLedgerEntry.ts` / `DELETE FROM ledger_entries`
- Actual reference: `TransactionEntity.tombstone`; `getAccountBalance` excludes tombstoned transactions.

Behavior:

- Primary donor edits and deletes ledger rows directly.
- No append-only correction or trash/restore mechanism for financial effect was found.
- Actual Budget shows a mature reference pattern using tombstones for financial rows, but it is not a port candidate here.

Classification:

- Primary donor: `REJECT` for HOMePLUS historical correction/trash semantics.
- Actual: `REFERENCE ONLY`.

### Other Relevant Capabilities

- Obligations, recurring obligations, occurrences, payments, refund semantics, Planner composition, Inventory/Assets/HomeCloud relation, Attention, Search privacy, Geni/Automations, and mobile integration: no direct useful primary donor capability found.
- Donor web UI may inform workflow language only; no frontend port.

## 7. Port / Adapt Candidate Register

No `REUSE DIRECTLY / PORT` candidate is registered. Every useful primary donor behavior requires adaptation to HOMePLUS authorities, privacy model, history semantics, and mobile architecture.

### DC-ADAPT-001

```text
CAPABILITY:
Ledger movement representation
SOURCE REPO:
kirill-markin/expense-budget-tracker
SOURCE COMMIT:
93d6ed1f8174a8f39551642391484dd87b4a045b
SOURCE LICENSE:
MIT
SOURCE PATH:
db/migrations/0001_initial_schema.sql
SOURCE SYMBOL:
ledger_entries
BEHAVIOR EXTRACTED:
One row per account movement with event_id, ts, account_id, amount, currency, kind, category, counterparty, note.
DEPENDENCIES:
Postgres, workspace_id, donor RLS.
CLASSIFICATION:
ADAPT
WHY IT FITS HOMePLUS:
Provides concrete financial movement primitives for income/spend/transfer classification.
WHAT MUST NOT BE IMPORTED:
Donor workspace/RLS/auth model and direct edit/delete lifecycle.
CURRENT HOMePLUS CAPABILITY IT WOULD COMPOSE WITH:
Auth/household membership, mutation contracts, audit/outbox primitives.
OPEN QUESTIONS:
How HOMePLUS records expense-without-account and history-preserving corrections.
```

### DC-ADAPT-002

```text
CAPABILITY:
Derived account balances
SOURCE REPO:
kirill-markin/expense-budget-tracker
SOURCE COMMIT:
93d6ed1f8174a8f39551642391484dd87b4a045b
SOURCE LICENSE:
MIT
SOURCE PATH:
apps/web/src/server/balances/getBalancesSummary.ts
SOURCE SYMBOL:
ACCOUNTS_QUERY, TOTALS_QUERY
BEHAVIOR EXTRACTED:
Balance is derived from ledger sums; totals split positive and negative balances; report conversion is nullable when FX is missing.
DEPENDENCIES:
ledger_entries, accounts view, account_metadata, fx_rates_daily.
CLASSIFICATION:
ADAPT
WHY IT FITS HOMePLUS:
Balances should be derived from financial effects and allow negative balances.
WHAT MUST NOT BE IMPORTED:
Derived account existence and MODE-derived account currency.
CURRENT HOMePLUS CAPABILITY IT WOULD COMPOSE WITH:
Future Finance account authority plus Current audit/outbox foundations.
OPEN QUESTIONS:
Balance Anchor and Unknown Balance semantics remain unsupported by donor.
```

### DC-ADAPT-003

```text
CAPABILITY:
Account metadata sidecar
SOURCE REPO:
kirill-markin/expense-budget-tracker
SOURCE COMMIT:
93d6ed1f8174a8f39551642391484dd87b4a045b
SOURCE LICENSE:
MIT
SOURCE PATH:
db/migrations/0006_account_metadata.sql, 0044_account_metadata_account_type.sql, 0045_account_metadata_account_group.sql
SOURCE SYMBOL:
account_metadata
BEHAVIOR EXTRACTED:
Optional metadata can classify accounts without becoming the account existence authority.
DEPENDENCIES:
workspace_id and account_id string key.
CLASSIFICATION:
ADAPT
WHY IT FITS HOMePLUS:
Useful distinction between financial account truth and optional presentation/reporting metadata.
WHAT MUST NOT BE IMPORTED:
personal/business labels as HOMePLUS privacy semantics.
CURRENT HOMePLUS CAPABILITY IT WOULD COMPOSE WITH:
Current auth/household permissions and future account model.
OPEN QUESTIONS:
Which metadata belongs in HOMePLUS V1 remains undecided.
```

### DC-ADAPT-004

```text
CAPABILITY:
Transaction kind validation and filtering
SOURCE REPO:
kirill-markin/expense-budget-tracker
SOURCE COMMIT:
93d6ed1f8174a8f39551642391484dd87b4a045b
SOURCE LICENSE:
MIT
SOURCE PATH:
apps/web/src/server/api/validation.ts; apps/web/src/server/transactions/getTransactions.ts
SOURCE SYMBOL:
transactionKindSchema; TRANSACTION_KINDS
BEHAVIOR EXTRACTED:
Canonical kind set is income/spend/transfer and can drive filters/reports.
DEPENDENCIES:
Donor API validation and ledger schema.
CLASSIFICATION:
ADAPT
WHY IT FITS HOMePLUS:
Matches target need for distinct Income, Expense, and Transfer classes.
WHAT MUST NOT BE IMPORTED:
Assumption that every class requires account_id.
CURRENT HOMePLUS CAPABILITY IT WOULD COMPOSE WITH:
Mutation/idempotency patterns and future Finance APIs.
OPEN QUESTIONS:
HOMePLUS naming and account optionality rules.
```

### DC-ADAPT-005

```text
CAPABILITY:
Grouped transfer representation
SOURCE REPO:
kirill-markin/expense-budget-tracker
SOURCE COMMIT:
93d6ed1f8174a8f39551642391484dd87b4a045b
SOURCE LICENSE:
MIT
SOURCE PATH:
apps/web/src/server/chat/shared.ts; db/queries/budget_grid.sql
SOURCE SYMBOL:
Internal transfer protocol; BUSINESS_PERSONAL_TRANSFER_QUERY
BEHAVIOR EXTRACTED:
Transfer can be represented as paired ledger rows sharing event_id, source negative, destination positive, category null.
DEPENDENCIES:
event_id convention, ledger entries, account metadata for special reports.
CLASSIFICATION:
ADAPT
WHY IT FITS HOMePLUS:
Directly informs transfer != income/expense and double-count prevention.
WHAT MUST NOT BE IMPORTED:
Chat/SQL-agent plan execution as the authority; absence of same-account/atomic validation.
CURRENT HOMePLUS CAPABILITY IT WOULD COMPOSE WITH:
Core mutation contracts, audit/outbox, household/privacy foundations.
OPEN QUESTIONS:
Canonical transfer operation and failure atomicity need HOMePLUS design in a later phase.
```

### DC-ADAPT-006

```text
CAPABILITY:
Nullable/free-form transaction category
SOURCE REPO:
kirill-markin/expense-budget-tracker
SOURCE COMMIT:
93d6ed1f8174a8f39551642391484dd87b4a045b
SOURCE LICENSE:
MIT
SOURCE PATH:
db/migrations/0001_initial_schema.sql; apps/web/src/server/transactions/getTransactions.ts
SOURCE SYMBOL:
ledger_entries.category; getCategories
BEHAVIOR EXTRACTED:
Category can be null and category lists can be derived from transaction history.
DEPENDENCIES:
Ledger text field and validation.
CLASSIFICATION:
ADAPT
WHY IT FITS HOMePLUS:
Supports optional category on Expense.
WHAT MUST NOT BE IMPORTED:
Lack of category archive/delete authority.
CURRENT HOMePLUS CAPABILITY IT WOULD COMPOSE WITH:
Future Finance category behavior plus Current audit foundations.
OPEN QUESTIONS:
Category lifecycle/history remains unresolved by donor.
```

### DC-ADAPT-007

```text
CAPABILITY:
Monthly base/category budget plan
SOURCE REPO:
kirill-markin/expense-budget-tracker
SOURCE COMMIT:
93d6ed1f8174a8f39551642391484dd87b4a045b
SOURCE LICENSE:
MIT
SOURCE PATH:
db/migrations/0001_initial_schema.sql; apps/web/src/server/budget/getBudgetGrid.ts
SOURCE SYMBOL:
budget_lines; latest_base_plans
BEHAVIOR EXTRACTED:
Month/direction/category planned values, latest base plan selected by inserted_at.
DEPENDENCIES:
Postgres, workspace_id, report currency.
CLASSIFICATION:
ADAPT
WHY IT FITS HOMePLUS:
Concrete budget period/category behavior exists.
WHAT MUST NOT BE IMPORTED:
Donor workspace model and final table shape.
CURRENT HOMePLUS CAPABILITY IT WOULD COMPOSE WITH:
Future Finance budget authority.
OPEN QUESTIONS:
Historical/future budget edit invariants need final target reconciliation.
```

### DC-ADAPT-008

```text
CAPABILITY:
Budget adjustments
SOURCE REPO:
kirill-markin/expense-budget-tracker
SOURCE COMMIT:
93d6ed1f8174a8f39551642391484dd87b4a045b
SOURCE LICENSE:
MIT
SOURCE PATH:
db/migrations/0053_budget_adjustments_additive.sql; apps/web/src/server/budget/budgetAdjustments.ts
SOURCE SYMBOL:
budget_adjustments; createBudgetAdjustmentWithQuery
BEHAVIOR EXTRACTED:
Additive budget adjustment rows, client IDs, exact retry idempotency, explicit conflicts, safe integer/string bounds.
DEPENDENCIES:
Postgres constraints, RLS policies, workspace_id.
CLASSIFICATION:
ADAPT
WHY IT FITS HOMePLUS:
Provides mature behavior for budget modification without mutating base plan implicitly.
WHAT MUST NOT BE IMPORTED:
Donor RLS, origin exposure model, and legacy backfill mechanics unless independently needed.
CURRENT HOMePLUS CAPABILITY IT WOULD COMPOSE WITH:
Current idempotency and mutation reliability primitives.
OPEN QUESTIONS:
Whether HOMePLUS V1 has Balance Adjustment vs Budget Adjustment naming/behavior overlap.
```

### DC-ADAPT-009

```text
CAPABILITY:
Budget actual derivation
SOURCE REPO:
kirill-markin/expense-budget-tracker
SOURCE COMMIT:
93d6ed1f8174a8f39551642391484dd87b4a045b
SOURCE LICENSE:
MIT
SOURCE PATH:
apps/web/src/server/budget/getBudgetGrid.ts
SOURCE SYMBOL:
QUERY
BEHAVIOR EXTRACTED:
Actuals derive from ledger entries by month/direction/category; spend is sign-normalized.
DEPENDENCIES:
ledger_entries, fx_rates_daily, report currency.
CLASSIFICATION:
ADAPT
WHY IT FITS HOMePLUS:
Matches target principle that budget spent is derived from transactions.
WHAT MUST NOT BE IMPORTED:
Transfer handling as budget consumption and FX subsystem as required architecture.
CURRENT HOMePLUS CAPABILITY IT WOULD COMPOSE WITH:
Future Finance reports and Current audit/outbox.
OPEN QUESTIONS:
Refund and adjustment exclusion behavior absent in donor.
```

### DC-ADAPT-010

```text
CAPABILITY:
Reports and aggregation
SOURCE REPO:
kirill-markin/expense-budget-tracker
SOURCE COMMIT:
93d6ed1f8174a8f39551642391484dd87b4a045b
SOURCE LICENSE:
MIT
SOURCE PATH:
db/queries/budget_grid.sql; apps/web/src/server/transactions/getTransactions.ts
SOURCE SYMBOL:
QUERY; CUMULATIVE_BALANCE_QUERY; getTransactionsPage
BEHAVIOR EXTRACTED:
Month, category, direction, currency, account, counterparty, and transfer filters/aggregations.
DEPENDENCIES:
Postgres SQL, ledger_entries, FX, account_metadata.
CLASSIFICATION:
ADAPT
WHY IT FITS HOMePLUS:
Concrete read-model evidence for Finance reports.
WHAT MUST NOT BE IMPORTED:
Web UI and donor privacy model.
CURRENT HOMePLUS CAPABILITY IT WOULD COMPOSE WITH:
Search/Home/Attention only via future HOMePLUS Finance projections.
OPEN QUESTIONS:
Privacy-filtered reporting shape remains a later-phase decision.
```

### DC-ADAPT-011

```text
CAPABILITY:
Native currency per movement with conversion warnings
SOURCE REPO:
kirill-markin/expense-budget-tracker
SOURCE COMMIT:
93d6ed1f8174a8f39551642391484dd87b4a045b
SOURCE LICENSE:
MIT
SOURCE PATH:
db/migrations/0034_fx_rates_cutover.sql; apps/web/src/server/budget/getBudgetGrid.ts
SOURCE SYMBOL:
fx_rates_daily; has_unconvertible; conversionWarnings
BEHAVIOR EXTRACTED:
Store native transaction currency and surface missing conversion instead of silently mixing report values.
DEPENDENCIES:
FX daily tables and worker build.
CLASSIFICATION:
ADAPT
WHY IT FITS HOMePLUS:
Useful for "reports never mix currencies silently".
WHAT MUST NOT BE IMPORTED:
Full donor FX ingestion subsystem as V1 requirement.
CURRENT HOMePLUS CAPABILITY IT WOULD COMPOSE WITH:
Future reporting currency behavior.
OPEN QUESTIONS:
HOMePLUS V1 multicurrency reporting policy remains for Phase 3.
```

### DC-ADAPT-012

```text
CAPABILITY:
Account status and suggestions
SOURCE REPO:
kirill-markin/expense-budget-tracker
SOURCE COMMIT:
93d6ed1f8174a8f39551642391484dd87b4a045b
SOURCE LICENSE:
MIT
SOURCE PATH:
apps/web/src/server/accounts/getAccountSuggestions.ts; apps/web/src/server/balances/accountStatus.ts
SOURCE SYMBOL:
getAccountSuggestionsWithQuery; computeAccountStatus
BEHAVIOR EXTRACTED:
Non-zero accounts are active; zero accounts depend on non-transfer recency; suggestions are ordered by latest operation.
DEPENDENCIES:
ledger_entries, derived accounts view.
CLASSIFICATION:
ADAPT
WHY IT FITS HOMePLUS:
Useful behavior for finance account selection without creating archive semantics.
WHAT MUST NOT BE IMPORTED:
Treating inactivity as archive/delete/history.
CURRENT HOMePLUS CAPABILITY IT WOULD COMPOSE WITH:
Future account UX and Current shared UI patterns.
OPEN QUESTIONS:
HOMePLUS account archive and visibility rules.
```

### DC-ADAPT-013

```text
CAPABILITY:
Business/personal transfer reporting analogue
SOURCE REPO:
kirill-markin/expense-budget-tracker
SOURCE COMMIT:
93d6ed1f8174a8f39551642391484dd87b4a045b
SOURCE LICENSE:
MIT
SOURCE PATH:
apps/web/src/server/budget/getBudgetGrid.ts
SOURCE SYMBOL:
BUSINESS_PERSONAL_TRANSFER_QUERY
BEHAVIOR EXTRACTED:
Rows grouped by event_id can be classified as crossing two account contexts and reported by the destination/source side.
DEPENDENCIES:
account_metadata.account_type, transfer rows, FX.
CLASSIFICATION:
ADAPT
WHY IT FITS HOMePLUS:
Useful only as evidence that source/context transfer reporting needs explicit read behavior.
WHAT MUST NOT BE IMPORTED:
Business/personal labels as HOMePLUS personal/household privacy model.
CURRENT HOMePLUS CAPABILITY IT WOULD COMPOSE WITH:
Auth/household privacy foundations.
OPEN QUESTIONS:
Exact Source vs Financial Context rules remain Phase 3 material.
```

## 8. Actual Budget Mature Reference Findings

Actual Budget was consulted only for two targeted questions.

| Question | Actual evidence | What it confirms / challenges | Classification |
|---|---|---|---|
| How does a mature implementation validate a transfer pair and prevent double counting/same-account links? | `packages/loot-core/src/shared/transfer.ts` / `validForTransfer`; `packages/loot-core/src/shared/transfer.test.ts` | Valid transfer requires neither row already has `transfer_id`, accounts differ, and amounts sum to zero. Tests cover happy path, same-sign, mismatched amount, same account, and already-transfer failure. This confirms the primary donor is weak where it only has convention/read evidence. | REFERENCE ONLY |
| How does a mature implementation avoid hard-delete financial effects in balance/history-sensitive paths? | `packages/loot-core/src/types/models/transaction.ts` / `tombstone`; `packages/loot-core/src/types/models/account.ts` / `tombstone`; `packages/loot-core/src/server/accounts/app.ts` balance queries exclude `tombstone=0`; account deletion code coordinates transfer links and delete/tombstone flows. | Actual uses explicit tombstone fields and balance queries exclude tombstoned transactions. This challenges the primary donor's hard `DELETE FROM ledger_entries` as inadequate for HOMePLUS trash/restore semantics. | REFERENCE ONLY |

Actual was not audited as a second primary donor.

## 9. Firefly III Findings

```text
FIREFLY CONSULTED:
NO

RESULT:
NOT CONSULTED - NOT REQUIRED

REASON:
Primary donor plus two targeted Actual Budget references were sufficient for the Phase 2 evidence questions. No unresolved Finance behavior required additional AGPL edge-case reference.
```

## 10. Rejected / Not Needed Donor Architecture

| Capability | Classification | Reason |
|---|---|---|
| Donor Auth | NOT NEEDED | HOMePLUS already owns Auth. |
| Donor workspace shell | REJECT | Workspace is not Household and would introduce parallel context authority. |
| Donor membership/RLS model | NOT NEEDED | HOMePLUS already has household membership/RLS foundations. |
| Cognito / AWS auth app | REJECT | External donor infra is accidental architecture. |
| AWS / Docker deployment | REJECT | Deployment stack is not Finance behavior. |
| Next.js navigation/app shell | REJECT | HOMePLUS mobile/Expo UI authority remains current. |
| Donor web tables/forms/charts | REFERENCE ONLY | Useful for workflow/read-model understanding only; no frontend port. |
| SQL agent / AI chat import protocol | REJECT | Finance correctness must not depend on AI/Geni/SQL-agent behavior. |
| API SQL executor role | REJECT | Parallel direct-SQL mutation authority would violate HOMePLUS boundaries. |
| FX worker as required V1 subsystem | REJECT | Native-currency warning primitives are useful; full FX worker is extra architecture. |
| Donor workspace deletion policies | NOT NEEDED | Current HOMePLUS owns deletion/trash/reliability boundaries. |
| Donor business/personal labels as privacy | REJECT | Not equivalent to HOMePLUS personal vs household financial context. |
| Account view as source-of-truth account model | REJECT | HOMePLUS needs accounts that can exist before movement and preserve unknown balance/anchors. |
| Direct transaction update/delete lifecycle | REJECT | Conflicts with history-preserving correction/trash requirements. |
| Firefly III code | REJECT | AGPL repository is reference-only by rule and was not consulted. |

## 11. License / Provenance Summary

- Primary donor license: MIT License, verified from `C:\Users\thega\Desktop\HomePlus-donors\expense-budget-tracker\LICENSE`.
- Primary donor commit audited: `93d6ed1f8174a8f39551642391484dd87b4a045b`.
- Primary donor dirty state: NO.
- License compatibility for `ADAPT` candidates: evidence recorded as `YES`, subject to normal legal review before any future code copy.
- `REUSE DIRECTLY / PORT` candidates: 0.
- Actual Budget license: MIT-style / MIT License text, verified from local `LICENSE.txt`; used as `REFERENCE ONLY`.
- Firefly III license: GNU AGPL v3, verified from local `LICENSE`/`COPYING`; not consulted and no code-copy candidate.
- License conflicts found: none in primary donor evidence.
- License blockers: none for primary donor evidence. Firefly remains operationally `REFERENCE ONLY / NO CODE COPY`.

## 12. Open Evidence Questions

- Primary donor transfer atomicity: no canonical service/API was found that creates both sides of a transfer atomically; evidence is schema/read/convention driven.
- Primary donor same-account transfer validation: no hard validation was found in schema/API/service.
- Primary donor cross-currency transfer: donor records native amounts per row and uses FX for reporting, but no first-class source amount/destination amount operation was found.
- Primary donor budget carry-over: no automatic carry-over behavior was found in core budget queries; absence is not a formal invariant proof.
- Primary donor refund behavior: no refund model found.
- Primary donor category lifecycle: no category archive/delete/history authority found.
- Primary donor account lifecycle: no account archive/delete preserving history found because accounts are a derived view.
- HOMePLUS Current audit contradiction: none found. Current audit remains the accepted input.

## 13. Changes Performed

```text
CREATED:
docs\implementation\FINANCE_DONOR_CAPABILITY_AUDIT.md

MODIFIED:
none

DONOR REPOS:
read-only preflight and static inspection only

TESTS EXECUTED:
none

DONOR TEST EXECUTION:
none

STATIC DONOR TESTS READ:
apps/web/src/server/balances/accountStatus.test.ts
apps/web/src/server/accounts/getAccountSuggestions.test.ts
apps/web/src/server/budget/budgetAdjustments.test.ts
apps/web/src/server/transactions/getTransactions.test.ts
packages/loot-core/src/shared/transfer.test.ts
```

Primary donor capability counts:

```text
PRIMARY DONOR CAPABILITIES AUDITED:
30

REUSE DIRECTLY / PORT:
0

ADAPT:
13

REFERENCE ONLY:
5

REJECT:
10

NOT NEEDED:
2

FIN-INV COVERAGE:
74/74

ACTUAL BUDGET CONSULTED:
YES
specific questions: 2

FIREFLY III CONSULTED:
NO
```
