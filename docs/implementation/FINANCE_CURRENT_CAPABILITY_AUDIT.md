# HOMePLUS Finance - Current Capability Audit

Status: FINANCE_CURRENT_AUDIT_COMPLETE
Date: 2026-08-10
Mode: READ ONLY, except this documentation deliverable

## Baseline

- Repo: `C:\Users\thega\Desktop\HomePlus`
- Branch: `pulido-medio-inventario-planner`
- HEAD: `3282907c0b0e2fe3b963e33cf4f0afc10909424f`
- Worktree: `C:\Users\thega\Desktop\HomePlus`
- Initial status: clean (`git status --short --branch` returned only `## pulido-medio-inventario-planner`)
- Supabase local runtime: unavailable because Docker Desktop Linux engine pipe is unavailable

## Product Authority

The requested exact Product Freeze file was not present in the repo. It was found outside the repo at:

`C:\Users\thega\Downloads\HOMePLUS_FINANCE_PRODUCT_FREEZE_V1.0.md`

This audit uses that file only as Target authority. Current implementation evidence is taken only from the baseline repo/worktree above.

Product authority provenance:

- Product authority path: `C:\Users\thega\Downloads\HOMePLUS_FINANCE_PRODUCT_FREEZE_V1.0.md`
- File size: 52,403 bytes
- SHA-256: `D1DDDC2166DBFA4FB7B3940F4C5A3BA37E92CBD403BFE8983D0D16CD4B9A87A2`
- `FINAL ACCEPTANCE DEFINITION`: 62 entries present in the final acceptance section
- `PRODUCT INVARIANTS`: `FIN-INV-001` through `FIN-INV-074` present and continuous

The Product Freeze file was not modified or copied into this repo.

## Documentation Path Decision

Canonical implementation documentation exists under `docs\implementation`, with both root-level implementation reports and module subdirectories. No `docs\implementation\finance` folder exists. To avoid arbitrary folder creation, this deliverable was created at:

`C:\Users\thega\Desktop\HomePlus\docs\implementation\FINANCE_CURRENT_CAPABILITY_AUDIT.md`

## Evidence Read

Primary current evidence inspected:

- Auth and household RLS: `supabase\migrations\202606210009_auth_onboarding_final.sql`
- Planner MVP tasks/events: `supabase\migrations\202606230001_planner_mvp.sql`
- Planner task origin fields: `supabase\migrations\202607080003_planner_tasks_origin_fields.sql`
- Planner goals: `supabase\migrations\202607080004_planner_goals.sql`
- Planner trash/restore: `supabase\migrations\20260713003000_add_planner_trash_restore.sql`
- Core audit/outbox: `supabase\migrations\20260714010000_homeplus_g0_4_operation_rollout.sql`
- Legacy Finance RPC removal: `supabase\migrations\20260715010000_remove_broken_legacy_rpcs.sql`
- Shared mutation/idempotency foundation: `supabase\migrations\20260722090000_m11_int_01_shared_mutation_authority_foundation.sql`
- Planner V2 idempotency dedupe: `supabase\migrations\20260803120000_planner_v2_reserve_idempotency_mutation_dedupe.sql`
- Planner services/controllers/screens/reliability modules under `backend\src` and `front\mi-front-limpio`
- Tests and scripts under `tests` and `scripts`

Negative searches were run against `backend/src`, `front/mi-front-limpio`, `supabase/migrations`, `tests`, and `scripts` for Finance domain terms including account, balance, transaction, income, expense, transfer, budget, obligation, reimbursement, refund, currency, bank sync, open banking, investment, trading, and crypto. No active Finance module tables, routes, services, screens, or tests were found. The only direct Finance traces are Planner/general placeholders, `finance` as an allowed Planner origin/category/prefs token, and tests/migration confirming a broken legacy `get_expense_balance(uuid)` RPC is absent.

## Summary Counts

- Target capabilities audited: 62
- Positive target capabilities fully implemented: 0
- Partial target capabilities: 15
- Absent target capabilities: 45
- Non-goal alignments by absence: 2

The two `EXISTS` rows in the acceptance matrix are non-goal alignments by absence: Bank Sync/Open Banking is not present, and investments/trading/enterprise accounting/Splitwise-like settlement scope is not present. They are not counted as implemented Finance capabilities.

## Overall Verdict

Current HOMePLUS has strong reusable foundations for auth/household membership, RLS patterns, Planner composition, append-only audit/outbox, idempotency, optimistic mutation contracts, trash/restore patterns, Home/Attention/Search surfaces, and frontend primitives.

Current HOMePLUS does not have an active Finance domain implementation. There are no Finance accounts, balances, transactions, budgets, obligations, payments, reports, account archives, transaction history, Finance UI, Finance APIs, Finance tables, or Finance tests in the baseline repo.

## Target Capability Matrix

Reuse values:

- YES: current primitive can likely be reused directly.
- PARTIAL: current primitive helps but is module-specific or incomplete for Finance.
- NO: no current reusable evidence found.

| # | Group | Target capability from Freeze | Status | Reuse | Current evidence |
|---:|---|---|---|---|---|
| 1 | A | Personal Finance and Household Finance are distinct scopes | PARTIAL | PARTIAL | Auth has `people`, `households`, `household_members`; Planner has household visibility and personal visibility for goals. No Finance scope/entity exists. |
| 2 | A | Personal Finance is owner-only by default | PARTIAL | PARTIAL | `people_select_self` and Planner personal visibility patterns exist. No personal Finance records exist. |
| 3 | A | Household Finance cannot access private personal account detail | PARTIAL | PARTIAL | Household RLS and membership helpers exist; no account-detail privacy model exists. |
| 4 | B | Manual account can exist without opening balance | ABSENT | NO | No Finance account table/API/UI found. |
| 5 | B | Unknown opening balance is not treated as zero | ABSENT | NO | No balance/opening-balance model found. |
| 6 | B | Balance anchor/correction exists | ABSENT | NO | No Finance account balance anchor/correction entity found. |
| 7 | B | Balance adjustment does not contaminate income/expense reports | ABSENT | NO | No adjustment/reporting model found. |
| 8 | B | Negative balances are allowed | ABSENT | NO | No account balance schema or validation found. |
| 9 | B | Account currency is fixed historically once account has movements | ABSENT | NO | No account currency or movement history model found. |
| 10 | C | Income, Expense, and Transfer are distinct transaction classes | ABSENT | NO | No Finance transaction schema/API found. |
| 11 | C | Expense can be registered without an Account | ABSENT | NO | No Expense model or quick expense path found. |
| 12 | C | Transfer requires source and destination when accounts are known | ABSENT | NO | No Transfer model found. |
| 13 | C | Transfer does not count as income or expense | ABSENT | NO | No Finance reports or transfer classification found. |
| 14 | C | Cross-currency Transfer stores both amounts and no FX engine | ABSENT | NO | No multicurrency transfer structure found. |
| 15 | C | Personal account can fund Household Expense | ABSENT | NO | No Finance account/expense/shared context model found. |
| 16 | C | Household-funded personal expense counts once in Household Finance | ABSENT | NO | No source-vs-context transaction semantics found. |
| 17 | C | Household-funded expense does not become personal spending | ABSENT | NO | No spending attribution model found. |
| 18 | C | Household Finance cannot expose private personal account internals | ABSENT | PARTIAL | RLS primitives exist, but no Finance projection enforcing this exists. |
| 19 | C | Household money cannot be hidden inside personal Finance | ABSENT | NO | No shared funding/contribution controls found. |
| 20 | C | Contribution is represented as a Transfer | ABSENT | NO | No Contribution or Transfer entity found. |
| 21 | C | Reimbursement is represented as a Transfer | ABSENT | NO | No Reimbursement or Transfer entity found. |
| 22 | C | Credit card behaves as negative-balance account | ABSENT | NO | No account type/balance behavior found. |
| 23 | C | Credit card payment is a Transfer | ABSENT | NO | No card payment or transfer model found. |
| 24 | D | Transaction correction is append-only or history-preserving | PARTIAL | PARTIAL | Generic append-only `audit_events`, Planner versions, and mutation correlation exist. No Finance transaction history exists. |
| 25 | D | Transaction trash removes current effects without deleting history | PARTIAL | PARTIAL | Planner trash/restore patterns exist for tasks/events/goals. No financial effect recalculation exists. |
| 26 | D | Restore reapplies current effects | PARTIAL | PARTIAL | Planner restore RPCs exist. No Finance transaction restore/effect replay exists. |
| 27 | D | Refund is not Income | ABSENT | NO | No Refund model found. |
| 28 | D | Refund reduces net expense/budget consumption | ABSENT | NO | No budget/reporting calculation found. |
| 29 | E | Category is optional on Expense | PARTIAL | PARTIAL | Planner goals/tasks allow categories; no Expense category model exists. |
| 30 | E | Category archive preserves history | ABSENT | NO | No Finance category/archive/history model found. |
| 31 | F | Monthly total budget exists per scope/currency | ABSENT | NO | No Finance budget model found. |
| 32 | F | Category budget exists inside monthly total | ABSENT | NO | No category budget model found. |
| 33 | F | Expense without category still affects total budget | ABSENT | NO | No Expense or budget calculation found. |
| 34 | F | Budget never blocks expense registration | ABSENT | NO | No Expense/budget enforcement found. |
| 35 | F | Budget has no automatic carry-over | ABSENT | NO | No budget period/carry-over model found. |
| 36 | F | Budget leftover is not money saved | ABSENT | NO | No savings/budget separation found. |
| 37 | F | Savings are represented through accounts/transfers | ABSENT | NO | No savings/account/transfer model found. |
| 38 | F | Reports never mix currencies silently | ABSENT | NO | No report currency grouping found. |
| 39 | G | Obligation existence does not create an Expense | ABSENT | NO | No Finance obligation or Expense model found. |
| 40 | G | Obligation can have unknown expected amount | ABSENT | NO | No Finance obligation amount model found. |
| 41 | G | Obligation occurrence statuses include pending, paid, skipped, cancelled, overdue | PARTIAL | PARTIAL | Planner tasks/events have pending/completed/cancelled and temporal surfaces; no paid/skipped/Finance occurrence model exists. |
| 42 | G | Overdue is derived, not manually set | PARTIAL | PARTIAL | Planner due-date/attention projections derive temporal attention. No Finance overdue model exists. |
| 43 | G | Recurring obligation creates occurrence history | PARTIAL | PARTIAL | Planner events support recurrence and history-like audit patterns. No Finance obligation occurrence ledger exists. |
| 44 | G | Debt occurrences can accumulate independently | ABSENT | NO | No debt/obligation accumulation model found. |
| 45 | G | Pause/end recurrence does not rewrite past occurrences | ABSENT | NO | No Finance recurrence lifecycle found. |
| 46 | H | Planner task completion is not payment | ABSENT | PARTIAL | Planner completion exists, but no Finance payment/obligation separation is implemented. |
| 47 | H | Only real payment marks obligation paid | ABSENT | NO | No Finance payment model found. |
| 48 | H | Payment can manually reconcile Planner task | ABSENT | PARTIAL | Planner origin fields can link external modules, but no Finance payment reconciliation exists. |
| 49 | H | Cancelling Planner task does not cancel obligation | ABSENT | NO | No Finance obligation/task handoff exists. |
| 50 | H | Personal obligation does not create private Planner task unless user chooses | ABSENT | NO | No personal Finance obligation planner-composition rule found. |
| 51 | H | Household obligation can compose Planner reminders/tasks | PARTIAL | PARTIAL | Planner `origin_module` explicitly allows `finance`; no Finance emitter/contract exists. |
| 52 | H | Trashing payment recalculates obligation state | ABSENT | NO | No Finance payment or obligation state found. |
| 53 | I | Reports count each real expense once | ABSENT | NO | No Finance reporting model found. |
| 54 | I | Transfers/adjustments are excluded from income/expense reports | ABSENT | NO | No transaction class/report rules found. |
| 55 | I | Refunds reduce expense, not increase income | ABSENT | NO | No refund/report model found. |
| 56 | J | Home surfaces only relevant Finance summaries/attention | PARTIAL | PARTIAL | Home Planner summary authority exists. No Finance Home summary projection exists. |
| 57 | J | Attention surfaces payment due/overdue/budget exceeded only where relevant | PARTIAL | PARTIAL | Planner attention authority exists. No Finance attention projection exists. |
| 58 | K | Inventory/Assets/HomeCloud ownership remains preserved when linked | PARTIAL | PARTIAL | Inventory-to-Planner origin links and Inventory exclusions exist. Assets/HomeCloud/Finance links were not found as active implementations. |
| 59 | L | Search/Geni respect Finance privacy boundaries | PARTIAL | PARTIAL | Planner search checks capabilities and household context. No Finance search/Geni integration exists. |
| 60 | L | Finance V1 does not depend on AI/Geni automation for correctness | ABSENT | PARTIAL | Existing Planner/core operations do not require Geni; no Finance core exists to validate this invariant. |
| 61 | M | Bank Sync/Open Banking is out of scope for V1 | EXISTS | NO | Negative search found no bank sync/open banking integration, aligning with the non-target. |
| 62 | N | Investments/trading/crypto taxes/asset allocation are out of scope for V1 | EXISTS | NO | Negative search found no investment/trading/crypto-tax/asset-allocation module, aligning with the non-target. |

## Product Invariant Coverage

Invariant coverage: 74/74.

Additional Current observations required: 23. These are marked in the `Covered by acceptance row` column as `ADDITIONAL AUDIT REQUIRED`; the added checks were limited to Current source searches for the specific invariant.

| Invariant | Covered by acceptance row | Current status | Reusable current primitive | Evidence | Constraint |
|---|---|---|---|---|---|
| FIN-INV-001 | #61, #62 | NON-GOAL ALIGNMENT BY ABSENCE | NO | Negative searches found no bank sync, open banking, investment, trading, crypto tax, enterprise accounting, or settlement module. | This is not a positive Finance capability. |
| FIN-INV-002 | #1, #2 | PARTIAL | Auth person and Planner personal visibility | `people_select_self`; `planner_goals.visibility='personal'`. | No Personal Finance entity exists. |
| FIN-INV-003 | #1 | PARTIAL | Household membership/RLS | `households`, `household_members`, `is_active_household_member`. | No Household Finance entity exists. |
| FIN-INV-004 | #2 | PARTIAL | Self-only people policy, Planner personal creator rule | `people_select_self`; `planner_goals_select_visible`. | No Finance private-record policy exists. |
| FIN-INV-005 | #3 | PARTIAL | Household RLS helpers | `household_members_select_allowed`, `is_active_household_coordinator`. | No Finance personal-account denial projection exists. |
| FIN-INV-006 | #56, #57, #59 | PARTIAL | Planner Home/Search/Attention gates | `planner.search` capability and Planner attention projection exist. | No Personal Finance data exists to prove non-leakage. |
| FIN-INV-007 | #19 | ABSENT | NO | No shared funding/contribution edit model found. | Finance source/context semantics absent. |
| FIN-INV-008 | #5 | ABSENT | NO | No account opening-balance model found. | Account domain absent. |
| FIN-INV-009 | #6 | ABSENT | NO | No Balance Anchor model found. | Balance authority absent. |
| FIN-INV-010 | #7 | ABSENT | NO | No Balance Adjustment/report model found. | Finance reports absent. |
| FIN-INV-011 | #8 | ABSENT | NO | No balance schema/validation found. | Account domain absent. |
| FIN-INV-012 | #9 | ABSENT | NO | No account currency or financial history schema found. | Currency history absent. |
| FIN-INV-013 | ADDITIONAL AUDIT REQUIRED | ABSENT | NO | Target requires archived Account preserving Balance and History; search found no Finance account/archive/balance/history model. | Not covered by the 62-row matrix except indirectly by account/history absence. |
| FIN-INV-014 | #10 | ABSENT | NO | No Income transaction class found. | Transaction domain absent. |
| FIN-INV-015 | #10 | ABSENT | NO | No Expense transaction class found. | Transaction domain absent. |
| FIN-INV-016 | #10, #13 | ABSENT | NO | No Transfer class/report exclusion found. | Transaction/report domain absent. |
| FIN-INV-017 | ADDITIONAL AUDIT REQUIRED; #12, #13, #14 | ABSENT | NO | No Transfer ledger or two-ended atomic operation found. | Transfer domain absent. |
| FIN-INV-018 | ADDITIONAL AUDIT REQUIRED; #12 | ABSENT | NO | Search found no source/destination account validation for Finance transfers. | Transfer domain absent. |
| FIN-INV-019 | #14 | ABSENT | NO | No source amount/destination amount structure found. | Multicurrency transfer absent. |
| FIN-INV-020 | #11, #12 | ABSENT | NO | No Income/Expense/Transfer account optionality model found. | Transaction domain absent. |
| FIN-INV-021 | #15, #16, #17 | ABSENT | NO | No financial context/source attribution model found. | Analytics domain absent. |
| FIN-INV-022 | #16, #17 | ABSENT | NO | No funding-source dedupe model found. | Transaction analytics absent. |
| FIN-INV-023 | #18 | ABSENT | Auth/RLS only | Household RLS exists; no Finance projection hides personal account internals. | Privacy primitive is not Finance behavior. |
| FIN-INV-024 | #20 | ABSENT | NO | No Contribution or Transfer entity found. | Contributions absent. |
| FIN-INV-025 | #21 | ABSENT | NO | No Reimbursement or Transfer entity found. | Reimbursements absent. |
| FIN-INV-026 | #24 | PARTIAL | audit/versioning primitives | `audit_events`, Planner version columns and mutation correlation exist. | No Finance transaction history exists. |
| FIN-INV-027 | ADDITIONAL AUDIT REQUIRED; #24, #25 | ABSENT | audit/trash primitives partial | Search found no reversal/reversal-of transaction concept. | Real reversal semantics absent. |
| FIN-INV-028 | #25, #26 | PARTIAL | Planner trash/restore patterns | `trashed_at`; `restore_goal_rpc`; Planner restore clients. | No financial effects exist to remove/reapply. |
| FIN-INV-029 | #27 | ABSENT | NO | No Refund model found. | Refund domain absent. |
| FIN-INV-030 | ADDITIONAL AUDIT REQUIRED; #27, #28 | ABSENT | NO | Search found no Refund entity referencing an Expense. | Refund domain absent. |
| FIN-INV-031 | #28, #55 | ABSENT | NO | No refund budget/report calculation found. | Budget/report domain absent. |
| FIN-INV-032 | ADDITIONAL AUDIT REQUIRED; #28 | ABSENT | NO | Search found no Refund total cap against original Expense. | Refund validation absent. |
| FIN-INV-033 | ADDITIONAL AUDIT REQUIRED; #25, #27, #28 | ABSENT | NO | Search found no active Refund orphan prevention around Expense trash/edit. | Refund lifecycle absent. |
| FIN-INV-034 | #34 | ABSENT | NO | No Expense/budget enforcement found. | Budget domain absent. |
| FIN-INV-035 | #31, #32, #33 | ABSENT | NO | No Budget Spent derivation from transactions found. | Budget reports absent. |
| FIN-INV-036 | #13, #54 | ABSENT | NO | No Transfer or Budget consumption rule found. | Transaction/report domain absent. |
| FIN-INV-037 | #7, #54 | ABSENT | NO | No Balance Adjustment or Budget consumption rule found. | Adjustment/report domain absent. |
| FIN-INV-038 | #28, #55 | ABSENT | NO | No Refund or Budget Spent rule found. | Refund/report domain absent. |
| FIN-INV-039 | #36 | ABSENT | NO | No budget leftover/savings separation found. | Budget domain absent. |
| FIN-INV-040 | #35 | ABSENT | NO | No budget carry-over model found. | Budget domain absent. |
| FIN-INV-041 | #37 | ABSENT | NO | No Finance savings account model found. | Account domain absent. |
| FIN-INV-042 | #37 | ABSENT | NO | No savings Transfer model found. | Transfer domain absent. |
| FIN-INV-043 | #38, #64 | ABSENT | NO | No budget/report currency grouping found. | Reports absent. |
| FIN-INV-044 | ADDITIONAL AUDIT REQUIRED; #31, #35 | ABSENT | NO | Search found no historical budget target/version model. | Budget lifecycle absent. |
| FIN-INV-045 | #39 | ABSENT | NO | No Finance obligation or Expense model found. | Obligation domain absent. |
| FIN-INV-046 | #46 | ABSENT | Planner task completion exists | Planner completion exists, but no Finance payment boundary exists. | Separation cannot be enforced without Finance payment. |
| FIN-INV-047 | #47 | ABSENT | NO | No Payment model found. | Obligation payment absent. |
| FIN-INV-048 | #42 | PARTIAL | Planner temporal attention | Planner attention derives reasons from Planner entities. | No Finance overdue projection. |
| FIN-INV-049 | #43 | PARTIAL | Planner event recurrence | Planner events have recurrence and occurrence identity. | No Finance obligation occurrence ledger. |
| FIN-INV-050 | #44 | ABSENT | NO | No debt/obligation accumulation model found. | Obligation domain absent. |
| FIN-INV-051 | ADDITIONAL AUDIT REQUIRED; #45 | ABSENT | Planner recurrence partial | Planner recurrence exists; no Finance pause/no-occurrence rule found. | Finance recurrence absent. |
| FIN-INV-052 | ADDITIONAL AUDIT REQUIRED; #45 | ABSENT | Planner recurrence partial | Planner event series edits preserve/split occurrences; no Finance recurrence editing exists. | Finance recurrence absent. |
| FIN-INV-053 | ADDITIONAL AUDIT REQUIRED; #47 | ABSENT | NO | Search found no partial-payment lifecycle, because no Payment lifecycle exists. | Absence aligns with V1 non-support but Payment domain is absent. |
| FIN-INV-054 | ADDITIONAL AUDIT REQUIRED; #47 | ABSENT | NO | Search found no canonical Payment per occurrence constraint. | Payment domain absent. |
| FIN-INV-055 | #52 | ABSENT | NO | No payment trash or obligation recalculation found. | Payment/obligation domain absent. |
| FIN-INV-056 | #49 | ABSENT | Planner task cancel exists | Planner task cancel exists; no Finance obligation link exists. | Cross-domain invariant absent. |
| FIN-INV-057 | #51 | PARTIAL | Planner origin composition | `origin_module` allows `finance`; backend validates origin fields. | No Finance obligation emitter exists. |
| FIN-INV-058 | #50 | ABSENT | NO | No Personal Finance obligation model found. | Cannot prove opt-in Planner composition. |
| FIN-INV-059 | #53 | ABSENT | NO | No Finance report aggregation found. | Reports absent. |
| FIN-INV-060 | #54 | ABSENT | NO | No Transfer/report rule found. | Reports absent. |
| FIN-INV-061 | #54 | ABSENT | NO | No Adjustment/report rule found. | Reports absent. |
| FIN-INV-062 | #55 | ABSENT | NO | No Refund/report rule found. | Reports absent. |
| FIN-INV-063 | ADDITIONAL AUDIT REQUIRED; #20, #53, #55 | ABSENT | NO | No Contribution/report external-income model found. | Contribution/report domain absent. |
| FIN-INV-064 | #38 | ABSENT | NO | No reports currency compatibility rule found. | Reports absent. |
| FIN-INV-065 | ADDITIONAL AUDIT REQUIRED; #10, #24, #53 | ABSENT | NO | No Finance authority exists to own financial truth. | Active Finance domain absent. |
| FIN-INV-066 | ADDITIONAL AUDIT REQUIRED; #46, #51 | PARTIAL | Planner tasks/events authority | Planner owns task/event temporal action surfaces. | Finance/Planner boundary not implemented. |
| FIN-INV-067 | ADDITIONAL AUDIT REQUIRED; #58 | PARTIAL | Inventory service/schema | Inventory owns item quantity/movements and composes Planner tasks through origin fields. | Finance relationships absent. |
| FIN-INV-068 | ADDITIONAL AUDIT REQUIRED; #58 | ABSENT | NO | No active Assets service/schema found in inspected evidence. | Asset truth owner not active in Current evidence. |
| FIN-INV-069 | ADDITIONAL AUDIT REQUIRED; #58 | ABSENT | NO | No active HomeCloud file authority found in inspected evidence. | File ownership integration absent. |
| FIN-INV-070 | ADDITIONAL AUDIT REQUIRED; #57 | PARTIAL | Planner attention service | `planner.global_attention.v1` exists. | No Finance attention relevance authority exists. |
| FIN-INV-071 | ADDITIONAL AUDIT REQUIRED; #57 | PARTIAL | Notification prefs and Planner adapter | User prefs include `finanzas`; Planner notification adapter explicitly lacks push transport. | Delivery authority not implemented. |
| FIN-INV-072 | ADDITIONAL AUDIT REQUIRED; #59 | PARTIAL | Planner search capability gate | `planner.search.controller` checks `planner.view` then `planner.search`. | No Finance search projection exists. |
| FIN-INV-073 | ADDITIONAL AUDIT REQUIRED; #59, #60 | PARTIAL | Planner origin/canonical mutation patterns | Origin fields allow `geni` and `automation`; idempotent mutation authority exists for Planner/core. | No Finance canonical operations exist for consumers. |
| FIN-INV-074 | ADDITIONAL AUDIT REQUIRED; #60 | ABSENT | Core/Planner no-AI precedent partial | Current core/Planner code does not depend on Geni for correctness. | No Finance Core exists to prove no-AI Finance operation. |

## Shared Capability Provenance

This table documents Current primitives only. A reusable primitive does not mean the corresponding Finance capability exists.

| Capability | Path | Symbol/Object | Owner today | What it proves | Reusable? | Constraint |
|---|---|---|---|---|---|---|
| Auth people table | `supabase/migrations/202606210009_auth_onboarding_final.sql` | `public.people` | Auth/Core | User/person identity exists. | YES | Not a Finance record. |
| Households table | `supabase/migrations/202606210009_auth_onboarding_final.sql` | `public.households` | Auth/Core | Household identity exists. | YES | Not Household Finance. |
| Household memberships | `supabase/migrations/202606210009_auth_onboarding_final.sql` | `public.household_members` | Auth/Core | Household membership and role membership exist. | YES | No Finance permission layer. |
| Current person helper | `supabase/migrations/202606210009_auth_onboarding_final.sql` | `public.current_person_id()` | Auth/Core | Auth user can resolve to person. | YES | Finance must call/use explicitly. |
| Active household member helper | `supabase/migrations/202606210009_auth_onboarding_final.sql` | `public.is_active_household_member(uuid)` | Auth/Core | Household access can be scoped to active members. | YES | No Finance RLS policy uses it. |
| Active coordinator helper | `supabase/migrations/202606210009_auth_onboarding_final.sql` | `public.is_active_household_coordinator(uuid)` | Auth/Core | Coordinator authority exists. | PARTIAL | Finance roles/capabilities absent. |
| Membership visibility helper | `supabase/migrations/202606210009_auth_onboarding_final.sql` | `public.can_view_membership(uuid, uuid)` | Auth/Core | Membership visibility can be constrained. | PARTIAL | Does not model Finance privacy. |
| Self-only people RLS | `supabase/migrations/202606210009_auth_onboarding_final.sql` | `people_select_self` | Auth/Core | Private self policy exists. | YES | Not applied to Finance data. |
| Household select RLS | `supabase/migrations/202606210009_auth_onboarding_final.sql` | `households_select_active_members` | Auth/Core | Household records are visible to active members. | YES | Household Finance authority absent. |
| Membership select RLS | `supabase/migrations/202606210009_auth_onboarding_final.sql` | `household_members_select_allowed` | Auth/Core | Membership visibility is policy-controlled. | PARTIAL | No financial-account projection. |
| Planner personal/shared field | `supabase/migrations/202607080004_planner_goals.sql` | `planner_goals.visibility` | Planner | Existing personal vs household visibility pattern. | PARTIAL | Goals only. |
| Planner owner field | `supabase/migrations/202607080004_planner_goals.sql` | `created_by_member_id` | Planner | Personal Planner records can bind to creator membership. | PARTIAL | Not Finance owner. |
| Planner member helper | `supabase/migrations/202607080004_planner_goals.sql` | `public.current_household_member_id(uuid)` | Planner | Member identity can be resolved per household. | PARTIAL | Planner-specific helper. |
| Planner goal visibility policy | `supabase/migrations/202607080004_planner_goals.sql` | `planner_goals_select_visible` | Planner | Personal/shared record visibility is policy-enforced. | PARTIAL | Goals only. |
| Planner goal write policy | `supabase/migrations/202607080004_planner_goals.sql` | `planner_goals_insert_active_household` | Planner | Writes can require active membership and creator match. | PARTIAL | Goals only. |
| Planner tasks table | `supabase/migrations/202606230001_planner_mvp.sql` | `public.planner_tasks` | Planner | Temporal task/action surface exists. | PARTIAL | Not a Finance payment. |
| Planner events table | `supabase/migrations/202606230001_planner_mvp.sql` | `public.planner_events` | Planner | Calendar/event scheduling exists. | PARTIAL | Not Finance recurrence. |
| Planner recurrence enum | `supabase/migrations/202606230001_planner_mvp.sql` | `planner_events.recurrence` | Planner | Basic recurrence exists. | PARTIAL | Not obligation occurrence ledger. |
| Planner event occurrence identity | `supabase/migrations/20260722030000_m11_2a_event_domain_foundation.sql` | `occurrence_key`, `series_id` | Planner | Occurrence identity and series split patterns exist. | PARTIAL | Planner events only. |
| Planner event edit scopes | `supabase/migrations/20260722030000_m11_2a_event_domain_foundation.sql` | `this_occurrence`, `this_and_following`, `whole_series` | Planner | Recurring-event edit semantics exist. | PARTIAL | Not Finance obligation recurrence. |
| Audit table | `supabase/migrations/20260714010000_homeplus_g0_4_operation_rollout.sql` | `public.audit_events` | Core | Durable audit records exist. | YES | Generic, not transaction ledger. |
| Append-only audit trigger | `supabase/migrations/20260714010000_homeplus_g0_4_operation_rollout.sql` | `prevent_audit_event_mutation()` | Core | Audit update/delete can be blocked. | YES | Finance history must use/extend it. |
| Audit correlation fields | `supabase/migrations/20260714010000_homeplus_g0_4_operation_rollout.sql` | `request_id`, `mutation_id` | Core | Mutations can be correlated to audit. | YES | Finance actions absent. |
| Outbox table | `supabase/migrations/20260714010000_homeplus_g0_4_operation_rollout.sql` | `public.outbox_events` | Core | Transactional outbox exists. | YES | Not notification delivery itself. |
| Outbox dedupe | `supabase/migrations/20260714010000_homeplus_g0_4_operation_rollout.sql` | `outbox_events_dedupe_uidx` | Core | Duplicate delivery rows can be prevented. | YES | Finance producer absent. |
| Audit/outbox RPC | `supabase/migrations/20260714010000_homeplus_g0_4_operation_rollout.sql` | `record_audit_and_enqueue_outbox()` | Core | Audit and outbox can be recorded together. | YES | Service-role helper, not Finance domain. |
| Outbox worker RPCs | `supabase/migrations/20260714010000_homeplus_g0_4_operation_rollout.sql` | `claim_outbox_events`, `complete_outbox_event`, `fail_outbox_event` | Core | Worker lease/complete/fail lifecycle exists. | YES | No Finance event type. |
| Outbox processor | `backend/src/services/outboxProcessor.service.js` | `processOutboxBatch` | Core | Backend processor uses claim/complete/fail RPCs. | YES | Requires registered handlers. |
| Trash column pattern | `supabase/migrations/20260713003000_add_planner_trash_restore.sql` | `planner_tasks.trashed_at`, `planner_events.trashed_at`, `planner_goals.trashed_at` | Planner | Soft-trash pattern exists. | PARTIAL | Financial effects absent. |
| Restore RPC pattern | `supabase/migrations/20260713003000_add_planner_trash_restore.sql` | `restore_goal_rpc`, `restore_milestone_rpc` | Planner | Restore operation pattern exists. | PARTIAL | Planner goals/milestones only. |
| Planner origin fields | `supabase/migrations/202607080003_planner_tasks_origin_fields.sql` | `origin_module`, `origin_entity_type`, `origin_entity_id` | Planner | Cross-module provenance can be stored on tasks. | YES | Finance producer absent. |
| Finance origin allowance | `supabase/migrations/202607080003_planner_tasks_origin_fields.sql` | `planner_tasks_origin_module_check` | Planner | `finance` is an allowed origin module. | YES | Allowance is not Finance implementation. |
| Planner origin validation | `backend/src/services/planner.tasks.service.js` | `ALLOWED_ORIGIN_MODULES`, `validateOriginModule` | Planner | Backend validates origin modules including `finance`. | YES | No Finance service calls it. |
| Inventory origin lookup | `backend/src/services/inventory.service.js` | `findActiveInventoryTask` | Inventory/Planner | Existing module can find a task by origin metadata. | PARTIAL | Inventory-specific. |
| Inventory origin producer | `backend/src/services/inventory.service.js` | `origin_module: 'inventory'`, `origin_entity_type: 'inventory_item'` | Inventory/Planner | Inventory composes Planner tasks using origin fields. | PARTIAL | Finance producer absent. |
| Mutation contracts | `backend/src/lib/mutationContracts.js` | `requireMutationContract`, `OPERATION_KINDS` | Core | Request mutation headers and expected versions are standardized. | YES | Finance endpoints absent. |
| Core mutation tests | `scripts/homeplus_core_contract_tests.js` | `mutation_id_required`, `idempotency_key_required` assertions | Core tests | Mutation contract is tested. | YES | No Finance tests. |
| Planner idempotency table | `supabase/migrations/20260713000000_planner_idempotency_keys.sql` | `public.planner_idempotency_keys` | Planner/Core integration | Durable idempotency storage exists. | PARTIAL | Table remains Planner-named. |
| Shared idempotency reserve | `supabase/migrations/20260722090000_m11_int_01_shared_mutation_authority_foundation.sql` | `planner_v2_reserve_idempotency()` | Planner/Core integration | V2 scoped idempotency reservation exists. | PARTIAL | Not executable by app roles; Finance authority absent. |
| Shared idempotency complete | `supabase/migrations/20260722090000_m11_int_01_shared_mutation_authority_foundation.sql` | `planner_v2_complete_idempotency()` | Planner/Core integration | Canonical response completion exists. | PARTIAL | No Finance RPC uses it. |
| Mutation dedupe fix | `supabase/migrations/20260803120000_planner_v2_reserve_idempotency_mutation_dedupe.sql` | `planner_idempotency_keys_mutation_uidx` handling | Planner/Core integration | `mutation_id` duplicate conflict path is handled. | PARTIAL | Planner-named helper. |
| Frontend request identity | `front/mi-front-limpio/services/api.ts` | `mutationId`, `idempotencyKey`, `If-Match` | Frontend core | Client can send mutation/idempotency/version headers. | YES | No Finance client exists. |
| Frontend server state | `front/mi-front-limpio/services/core/serverState.ts` | `registerPendingMutation`, `reconcileMutation`, `rollbackMutation` | Frontend core | Pending mutation tracking exists. | YES | Finance adapter absent. |
| Reliability runtime | `front/mi-front-limpio/services/planner/reliability/runtime.ts` | reliability runtime module | Planner frontend | Runtime reliability layer exists. | PARTIAL | Planner-specific. |
| Operation queue | `front/mi-front-limpio/services/planner/reliability/operationQueue.ts` | operation queue module | Planner frontend | Queued operation primitive exists. | PARTIAL | Planner-specific. |
| Operation store | `front/mi-front-limpio/services/planner/reliability/operationStore.ts` | operation store module | Planner frontend | Local operation persistence pattern exists. | PARTIAL | Planner-specific. |
| Retry policy | `front/mi-front-limpio/services/planner/reliability/retryPolicy.ts` | retry policy module | Planner frontend | Retry behavior exists. | PARTIAL | Planner-specific. |
| Reconciliation | `front/mi-front-limpio/services/planner/reliability/reconciliation.ts` | reconciliation module | Planner frontend | Server/local reconciliation pattern exists. | PARTIAL | Planner-specific. |
| Restore adapters | `front/mi-front-limpio/services/planner/reliability/restoreAdapters.ts` | restore adapters module | Planner frontend | Restore-specific reliability adapters exist. | PARTIAL | Planner-specific. |
| Home backend authority | `backend/src/services/planner.summary.service.js` | `PROJECTION_VERSION = 'planner.home_summary.v1'` | Planner/Home | Home Planner summary projection is versioned. | PARTIAL | No Finance Home projection. |
| Home frontend authority | `front/mi-front-limpio/services/planner/homeSummaryTypes.ts` | `HOME_SUMMARY_PROJECTION_VERSION` | Planner/Home frontend | Frontend validates Planner Home summary shape. | PARTIAL | Planner only. |
| Home surface | `front/mi-front-limpio/screens/home/HomePlannerSections.tsx` | `HomePlannerSections` | Home/Planner | Home renders Planner summary sections. | PARTIAL | No Finance section. |
| Attention backend authority | `backend/src/services/planner.attention.service.js` | `ATTENTION_PROJECTION_VERSION = 'planner.global_attention.v1'` | Planner/Attention | Attention projection exists. | PARTIAL | Planner reasons only. |
| Attention frontend screen | `front/mi-front-limpio/screens/planner/PlannerAttentionActivityScreen.tsx` | `PlannerAttentionActivityScreen` | Planner/Attention frontend | Attention/activity UI exists. | PARTIAL | No Finance attention source. |
| Notification preferences | `backend/src/controllers/users.controller.js` | `NOTIFICATION_PREF_KEYS` includes `finanzas` | Users/Core | User prefs reserve Finance notification key. | PARTIAL | Preference is not delivery. |
| Notification adapter | `front/mi-front-limpio/services/planner/plannerNotificationAdapter.ts` | `createNotificationAdapter` | Planner frontend | Planner notification payload adapter exists and says push transport is not present. | PARTIAL | Delivery authority absent. |
| Search controller | `backend/src/controllers/planner.search.controller.js` | `assertCapability(capabilities, 'planner.search')` | Planner/Search | Search is capability-gated server-side. | PARTIAL | Planner only. |
| Search service | `backend/src/services/planner.search.service.js` | `searchActive` | Planner/Search | Active Planner search implementation exists. | PARTIAL | No Finance indexing/search. |
| Search feature flag | `backend/src/constants/plannerFeatureFlags.js` | `planner.search_entry` | Core/Planner | Search entry can be deny-safe behind flag. | PARTIAL | Planner only. |
| Inventory stock owner | `backend/src/services/inventory.service.js` | `inventory_items`, `inventory_item_movements` usage | Inventory | Inventory owns quantity and movements. | PARTIAL | No Finance relation. |
| Global surface inventory exclusions | `front/mi-front-limpio/services/planner/globalSurfaceTypes.ts` | `SURFACE_EXCLUDED_INVENTORY` | Planner surfaces | Some cross-domain global-surface exclusions are modeled. | PARTIAL | Finance not modeled. |
| Test infrastructure | `scripts` and `tests` | `homeplus_core_*`, `planner_*`, `tests/db/run.js` | Core/Planner tests | Contract/database/runtime/frontend tests exist. | YES | Finance tests absent. |

Shared primitives with path/symbol evidence: 62.

## Frontend Primitive Map

| Primitive | Path | Current usage example | Generic / Module-specific | Reusable? | Constraint |
|---|---|---|---|---|---|
| AppButton | `front/mi-front-limpio/components/ui/AppButton.tsx` | `FamilyPendingSheet.tsx` uses approve/reject buttons; `InventarioScreen.tsx` uses create/save buttons. | Generic | YES | No Finance-specific variants. |
| AppInput | `front/mi-front-limpio/components/ui/AppInput.tsx` | `InventarioScreen.tsx` uses search and numeric form inputs. | Generic | YES | Not a money input. |
| AppCard | `front/mi-front-limpio/components/ui/AppCard.tsx` | `HomePlannerSections.tsx` renders Planner summary cards. | Generic | YES | Finance cards absent. |
| AppScreen | `front/mi-front-limpio/components/ui/AppScreen.tsx` | `HomeAdulto.tsx`, `FamilyScreen.tsx`, and `InventarioScreen.tsx` use app screen layout. | Generic | YES | No Finance route/screen. |
| AppText | `front/mi-front-limpio/components/ui/AppText.tsx` | Used broadly in Home, Inventory, Family, Planner. | Generic | YES | No Finance typography semantics. |
| ActionSheet | `front/mi-front-limpio/components/ui/ActionSheet.tsx` | Provides modal sheet container and picker host. | Generic | YES | No Finance sheet composition. |
| DatePickerSheet | `front/mi-front-limpio/components/ui/ActionSheet.tsx` | `TaskForm.tsx` uses `DatePickerSheet` for task due date. | Generic | YES | Date picker exists; Finance obligation recurrence editor absent. |
| TimePickerSheet | `front/mi-front-limpio/components/ui/ActionSheet.tsx` | `TaskForm.tsx` uses `TimePickerSheet` for due time. | Generic | YES | Time picker exists; Finance payment scheduling absent. |
| QuickActionSheet | `front/mi-front-limpio/components/ui/QuickActionSheet.tsx` | Quick action UI includes calendar actions. | Generic shell / Planner-adjacent | PARTIAL | Finance quick actions absent. |
| UndoToast | `front/mi-front-limpio/components/ui/UndoToast.tsx` | Component exposes `onUndo` and auto-dismiss behavior. | Generic | YES | No Finance undo/trash flow. |
| EmptyState | `front/mi-front-limpio/components/ui/EmptyState.tsx` | `InventarioScreen.tsx` and Family cards use empty states. | Generic | YES | No Finance empty states. |
| ErrorState | `front/mi-front-limpio/components/ui/ErrorState.tsx` | `HomePlannerSections.tsx`, `InventarioScreen.tsx`, `TaskDetailScreen.tsx` use retry/error display. | Generic | YES | No Finance error mapping. |
| Skeleton | `front/mi-front-limpio/components/ui/Skeleton.tsx` | `HomePlannerSections.tsx` and `FamilyMembersCard.tsx` use loading skeletons. | Generic | YES | No Finance loading states. |
| AppTopBar | `front/mi-front-limpio/components/ui/AppTopBar.tsx` | `HomeTabNavigator.tsx` renders top bar. | Generic shell | YES | No Finance top-bar actions. |
| HouseholdSwitcherSheet | `front/mi-front-limpio/components/ui/HouseholdSwitcherSheet.tsx` | `HomeTabNavigator.tsx` mounts household switcher. | Generic shell | YES | Finance must still preserve personal scope. |
| InteractivePressable | `front/mi-front-limpio/components/ui/InteractivePressable.tsx` | `HomeTabNavigator.tsx` and `ActionPill.tsx` use interactive press states. | Generic | YES | No Finance interaction semantics. |
| Numeric/decimal input usage | `front/mi-front-limpio/screens/inventory/InventarioScreen.tsx` | `keyboardType="decimal-pad"` for quantity/threshold inputs. | Module-specific usage of generic input | PARTIAL | Numeric exists; money formatting/currency absent. |
| Filter primitive usage | `front/mi-front-limpio/screens/inventory/InventarioScreen.tsx` | `FILTER_CATEGORIES` and `filteredItems`. | Module-specific | PARTIAL | No Finance transaction filters. |
| Planner list filters | `front/mi-front-limpio/services/plannerTasks.ts` | `PlannerTaskFilters` and `toQueryString`. | Planner-specific | PARTIAL | No Finance filters. |
| Planner event filters | `front/mi-front-limpio/services/plannerEventsV1.ts` | `PlannerEventsV1Filters`. | Planner-specific | PARTIAL | No Finance date/status filters. |
| Progress primitive usage | `front/mi-front-limpio/screens/home/HomePlannerSections.tsx` | `progress_percentage`, `progressPct`. | Planner/Home-specific | PARTIAL | Not budget progress. |
| Calendar projection | `front/mi-front-limpio/services/planner/plannerCalendarProjection.ts` | `PlannerCalendarProjection`, grouping/count helpers. | Planner-specific | PARTIAL | No Finance obligation calendar projection. |
| Modal/sheet pattern | `front/mi-front-limpio/screens/inventory/InventarioScreen.tsx` | `Modal visible={modalVisible}` for create/edit item sheet. | Generic pattern | PARTIAL | No Finance modal. |
| List-state primitive | `front/mi-front-limpio/components/planner/PlannerStateView.tsx` | Skeleton/offline/forbidden/error states. | Planner-specific | PARTIAL | No Finance list state. |

## Important Absence Evidence

These are compact absence checks across the Current repo. They are evidence of `ABSENT AFTER REASONABLE SEARCH`, not proof that a specific filename is missing.

| Capability group | Areas searched | Representative terms/symbols | Result |
|---|---|---|---|
| Finance Account / Balance | `supabase/migrations`, `backend/src`, `front/mi-front-limpio`, `tests`, `scripts` | `financial_account`, `finance_account`, `account_balance`, `balance_anchor`, `balance_correction`, `opening_balance` | No active account/balance schema, API, UI, or tests found. |
| Finance Transaction / Ledger | Same areas | `finance_transaction`, `ledger`, `transaction_history`, `transaction_class`, `entry`, `movement` | No Finance transaction ledger found; only generic/Planner test wording and Inventory movements. |
| Income | Same areas | `income`, `external income`, `incoming money` | No Finance Income entity/API/UI found. |
| Expense | Same areas | `expense`, `spending`, `get_expense_balance` | No active Expense domain found; legacy broken `get_expense_balance(uuid)` is asserted absent/removed. |
| Transfer | Same areas | `transfer`, `source_account`, `destination_account`, `cross_currency` | No Finance Transfer entity or validation found. |
| Refund | Same areas | `refund`, `reversal`, `original_expense`, `orphan` | No Refund/reversal lifecycle found. |
| Finance Category lifecycle | Same areas | `finance_category`, `category_archive`, `category history` | No Finance category lifecycle found; Planner categories are unrelated. |
| Budget | Same areas | `budget`, `monthly_total_budget`, `category_budget`, `carry_over`, `budget_spent` | No Finance budget model found; Planner preset placeholders mention budget only as draft/placeholder vocabulary. |
| Finance Reports | Same areas | `finance_report`, `budget_vs_actual`, `net_expense`, `currency report`, `aggregation` | No Finance reporting/aggregation authority found. |
| Obligation | Same areas | `finance_obligation`, `obligation`, `expected_amount`, `debt` | No Finance obligation found; Planner fulfillment uses obligation terminology for task fulfillment only. |
| Obligation Occurrence | Same areas | `occurrence`, `occurrence_key`, `paid`, `skipped`, `overdue` | Planner event occurrence identity exists; no Finance obligation occurrence ledger found. |
| Payment | Same areas | `payment`, `paid`, `partial_payment`, `canonical payment` | Planner has payment-like template labels; no Finance Payment lifecycle found. |
| Finance recurrence semantics | Same areas | `pause`, `recurrence`, `this_occurrence`, `this_and_following`, `whole_series` | Planner recurrence semantics found; no Finance obligation recurrence semantics found. |
| Finance API | `backend/src/controllers`, `backend/src/routes`, `backend/src/services`, `backend/src/contracts` | `finance`, `accounts`, `transactions`, `budgets`, `obligations`, `payments` | No Finance controller/route/service/contract found. |
| Finance frontend/navigation | `front/mi-front-limpio/screens`, `front/mi-front-limpio/navigation`, `front/mi-front-limpio/services` | `FinanceScreen`, `finanzas`, `wallet`, `finance route`, `account selector` | No active Finance screen/navigation/service found; only icon/label/category tokens. |
| Finance tests | `tests`, `scripts` | `finance`, `expense`, `budget`, `payment`, `get_expense_balance` | No Finance test suite found; DB tests only assert broken legacy Finance RPC absence. |

Important absence groups evidenced: 16.

## Current Reusable Capabilities Found

### A. Ownership and Privacy

- Auth/household foundation exists with `people`, `households`, `household_members`, active household membership, coordinator checks, blocked direct writes for sensitive membership tables, and self-only `people` RLS.
- Planner goals include personal/shared visibility and creator-based access helpers.
- Reuse for Finance is PARTIAL because no Finance-specific personal vs household scope, private-account projection, or shared-expense privacy boundary exists.

### B. Money and Currency

- Planner goals can use numeric `amount` target type and a UI hint defaults amount goals to ARS.
- Placeholder resolution has a `budget` placeholder with `{ amount, currency }`.
- Reuse is PARTIAL only as generic numeric/form vocabulary. There is no durable Finance money type, account currency rule, FX exclusion rule, or multicurrency transaction semantics.

### C. Accounts and Balances

- No active Finance account, account archive, account balance, opening balance, balance anchor, balance correction, or credit-card negative-balance behavior was found.
- Reuse is NO for actual account/balance domain behavior.

### D. Transactions

- No active Finance income, expense, transfer, refund, contribution, reimbursement, source/context attribution, or transaction-class report logic was found.
- Reuse is NO for transaction behavior.

### E. History, Trash, Archive

- Generic append-only `audit_events` exists with mutation/request correlation and an update/delete prevention trigger.
- Planner entities have versioning and trash/restore patterns.
- Reuse is PARTIAL because Finance needs transaction ledger/history/effect replay semantics, not only generic audit and Planner trash.

### F. Recurrence and Scheduling

- Planner events support recurrence values and Planner task/event scheduling fields.
- Planner fulfillment work has "obligation" terminology for task fulfillment, but it is Planner domain behavior, not Finance debt/payment obligation behavior.
- Reuse is PARTIAL for scheduling primitives and NO for Finance obligation semantics.

### G. Budgets, Reports, Aggregation

- No Finance monthly budgets, category budgets, budget-vs-actual reports, currency-separated reports, or report aggregation authorities were found.
- Planner presets contain a generic `budget` placeholder/draft concept, but it is not Finance budgeting.

### H. Obligations and Payments

- Planner task fulfillment has assignment/completion/cancellation reliability and audit behavior.
- No Finance obligations, occurrence ledger, payments, real-payment marker, manual reconciliation, skipped/paid status, or debt accumulation was found.
- Reuse is PARTIAL only for Planner task composition and mutation reliability.

### I. Planner Composition

- `planner_tasks.origin_module` allows `finance`, `inventory`, `assets`, `geni`, and `automation`.
- Backend validation in `planner.tasks.service.js` accepts `finance` origin metadata.
- Inventory already uses the origin primitive to create/find Planner tasks tied to Inventory items.
- Reuse is PARTIAL because Finance can likely compose Planner tasks through the existing origin shape, but no Finance producer exists.

### J. Reliability and Mutation Safety

- Shared request mutation contracts exist in `backend\src\lib\mutationContracts.js`.
- Planner/core idempotency, optimistic concurrency, audit/outbox, retry, and frontend reliability modules exist.
- Reuse is PARTIAL because the strongest idempotency functions are currently Planner-named/integration-owned and no Finance mutation authority uses them.

### K. Relationships

- Inventory ownership and Inventory-to-Planner links exist.
- Global surface exclusion rules mention Inventory exclusions from search/attention/activity/trash/archive.
- No active Assets/HomeCloud/Finance relationship model was found in this audit evidence.

### L. Home, Attention, Notifications, Search

- Home Planner Summary has a backend authority and frontend consumer.
- Planner Search has controller/service/frontend screen and capability gate `planner.search`.
- Planner Attention/Activity has backend/frontend surfaces.
- User notification preference keys include `finanzas`, but no Finance notification delivery or Finance attention source exists.
- Reuse is PARTIAL for surface patterns, not Finance behavior.

### M. Frontend Primitives

- Existing UI primitives include `AppButton`, `AppInput`, `AppCard`, `AppScreen`, `AppText`, `ActionSheet`, `QuickActionSheet`, `UndoToast`, `EmptyState`, `ErrorState`, `Skeleton`, `AppTopBar`, `HouseholdSwitcherSheet`, and `InteractivePressable`.
- Existing screens demonstrate modals/sheets, filters, decimal-pad inputs, list states, undo toasts, search screens, progress displays, and household switching.
- Missing for Finance: dedicated money input, currency selector, account selector, transaction-type segmented control, budget bars/charts, recurrence editor tuned to obligations, payment status controls, and transaction history/trash views.

### N. Tests

- Strong core/Planner tests exist under `scripts` and `tests`, including contract, database, runtime, reliability, search, attention, and shared idempotency tests.
- Finance-specific tests are absent. Existing DB tests explicitly assert the broken legacy Finance `get_expense_balance(uuid)` overload is absent.

## Most Important Current Capabilities Found

1. Household/auth/RLS foundation is substantial and reusable as the privacy skeleton for Finance.
2. Planner origin composition already reserves `finance` as an origin module, so Finance-to-Planner reminders/tasks have a natural integration point.
3. Generic audit/outbox and request/mutation correlation exist and are tested.
4. Planner/idempotency/reliability work provides patterns for exactly-once-style mutations and conflict handling.
5. Home, Search, Attention, and common frontend UI primitives already exist as reusable surface patterns.

## Most Important Current Constraints

1. There is no active Finance domain surface in CURRENT: no Finance DB schema, backend route/service/controller, frontend navigation/screen, or test suite.
2. Money, account, balance, transaction, budget, obligation, payment, and report semantics are absent.
3. Current reusable primitives are mostly Planner/core-specific and need explicit Finance authority before they can be treated as Finance behavior.
4. The only direct legacy Finance database evidence is removal/absence of a broken `get_expense_balance(uuid)` RPC.
5. Supabase could not be run locally, so this is a static/source audit with no live schema/runtime confirmation.

## Runtime Limitations

- `supabase status` cannot run because Docker Desktop Linux engine is unavailable.
- No migrations were applied.
- No backend, frontend, Supabase, Docker, or external service was started.
- No tests were executed in this phase, because the directive is read-only audit and the local Supabase runtime is unavailable.

## Files Changed

- `docs\implementation\FINANCE_CURRENT_CAPABILITY_AUDIT.md`

## Unexpected Changes

- None observed before writing this deliverable.

## Next Action

RETURN RESULT TO CONTROL CHAT FOR REVIEW.
DO NOT AUDIT DONOR.
DO NOT CALCULATE FINAL REAL GAP.
DO NOT IMPLEMENT.
