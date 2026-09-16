# HOMePLUS FINANCE V1.1 — STAGE 7A AUDIT REPORT
## DAILY EXPERIENCE / UNIFIED MOVEMENTS AUDIT

**Branch verified:** `finance-v1-unified` ✅
**Mode:** READ / AUDIT / MAP ONLY — NO IMPLEMENTATION

---

## 1. PRECHECK

- **Current branch:** `finance-v1-unified` (matches expected)
- **Git status:** Clean except `package-lock.json` modification and `backup-before-presence.sql` untracked
- **No pre-existing changes** in scope of Stage 7A

---

## 2. CURRENT MOVIMIENTOS OWNER

**Screen/Component Owner:** `FinanceScreen.tsx` → `FinanceMovementsSurface` (internal function, lines 1195-1294)

**Data Service/Hook:** `listFinanceMovements` from `services/finance/financeMovements.ts` (line 232)

**Endpoint Called:** `GET /api/finance/movements?contextType={type}&period={YYYY-MM}`

**Query Params:**
- `contextType`: `personal` | `household` (derived server-side via `resolveFinanceContext`)
- `period`: `YYYY-MM` calendar month (required)

**Pagination Behavior:** **NONE** — Returns full month array. No cursor, no limit, no offset. Frontend receives all movements for the period.

**Period/Context/Currency Behavior:**
- Period: Calendar month aligned to `transaction_date` (financial occurrence date), half-open `[start, endExclusive)` via `Date.UTC`
- Context: Personal (owner_person_id = current person, household_id = null) OR Household (household_id = active household, owner_person_id = null)
- Currency: No filtering — all currencies returned; frontend groups by currency in Summary, but Movimientos shows mixed-currency rows

**Loading/Error/Empty States:**
- Loading: `FinanceSurfaceLoading` skeleton while `loading && movements.length === 0`
- Error: `ErrorState` with retry button when `error && movements.length === 0`
- Empty: `EmptyState` "Sin movimientos en este periodo" when `groups.length === 0`

**Refresh Behavior:** `readRefreshNonce` increment triggers full re-fetch via `useEffect` dependency

**Row Component:** `InteractivePressable` with `financeMovementTitle` (Expense → "Gasto: {description}", Income → "Ingreso: {description}"), category label, refund summary if applicable, signed amount (red for expense, green for income)

**Detail Navigation:** `handleMovementPress` → sets `selectedMovement` + `movementDetailVisible=true` → opens `MovementDetailSheet` with prefetch of `getFinanceTransactionDetail`

**Movement Types Currently Rendered:**
| Type | Rendered? | Evidence |
|------|-----------|----------|
| Expense | ✅ | `transactionType === 'expense'` in `FinanceMovementDto` |
| Income | ✅ | `transactionType === 'income'` in `FinanceMovementDto` |
| Transfer | ❌ | `FinanceMovementDto` has `transferId` field but `listFinanceMovements` queries `finance_transactions` only (excludes transfers) |
| Payment-derived Expense | ✅ | Created as canonical Expense via `finance_payment_register_normal_v1`; appears in `finance_transactions` |
| Card-payment Transfer | ❌ | Created as canonical Transfer via `finance_payment_register_credit_card_v1`; stored in `finance_transfers`, NOT in `finance_transactions` |
| Refund representation | ✅ | Embedded in Expense row via `totalRefunded`/`netAmount`/`refundEvents`; NOT a separate row |
| Corrected rows | ✅ | Correction creates new version with `root_transaction_id` linking; current `listFinanceMovements` returns latest ACTIVE version per root |
| Trashed rows | ❌ | Excluded by `.eq('status', 'ACTIVE')` in `listFinanceMovements`; separate `listFinanceTrash` endpoint |

---

## 3. CURRENT MOVIMIENTOS READ CONTRACT

**Route:** `GET /api/finance/movements` → `finance.read.controller.js:getMovements` → `finance.read.service.js:listFinanceMovements`

**Controller:** `finance.read.controller.js:getMovements`

**Service:** `finance.read.service.js:listFinanceMovements`

**RPC/Query/View:** Direct Supabase query on `public.finance_transactions` (no RPC, no view)

**DTO:** `FinanceMovementDto` (frontend) ← `movementToDto` (backend)

**Ordering:**
```sql
ORDER BY transaction_date DESC, created_at DESC, id DESC
```
Deterministic tie-breaker: `created_at DESC, id DESC`

**Pagination/Cursor Contract:** **NONE** — Full month result set returned. No `limit`, `offset`, or cursor.

**Filters:** Only `contextType` (server-derived) + `period` (month). No type filter, no currency filter, no account filter.

**Context Resolution:** `resolveFinanceContext(req, contextType)` → derives `personId`/`householdId`/`membershipId` from authenticated user. No caller-supplied owner IDs honored.

**Currency Filtering:** None — all currencies mixed in result.

**Fields in Current Read Source (`finance_transactions`):**
| Field | Present? | Notes |
|-------|----------|-------|
| transaction root id | ✅ | `root_transaction_id` |
| transaction id/version id | ✅ | `id` (version), `root_transaction_id` (root) |
| type | ✅ | `transaction_type` ('expense'/'income') |
| amount | ✅ | `amount::text` |
| currency | ✅ | `currency` |
| date | ✅ | `transaction_date` |
| description | ✅ | `description` |
| category | ✅ | `category_id` + `category_label_snapshot` (historical) |
| account | ✅ | Via `finance_account_effects` join in detail; NOT in list |
| notes | ❌ | NOT in list SELECT; only in detail |
| trashed state | ❌ | Filtered out (`.eq('status', 'ACTIVE')`) |
| correction state | ⚠️ | Implicit via `root_transaction_id` + `corrected_from_transaction_id` in detail |
| refund aggregate/detail | ✅ | Computed via `attachRefundCompositions` join to `finance_refund_events` |
| related payment information | ❌ | NOT in list; PaymentDue links via `expense_root_transaction_id`/`transfer_id` on payment_dues |
| related transfer information | ⚠️ | `transfer_id` column exists on `finance_transactions` (for commission Expense provenance) but transfers themselves are in separate `finance_transfers` table |

---

## 4. CURRENT TRANSFER CONTRACT

**Tables:**
- `public.finance_transfers` — Canonical transfer authority (id, source_account_id, destination_account_id, source_amount, destination_amount, currency, source_currency, destination_currency, transfer_date, description, notes, request_id, mutation_id, idempotency_key, payload_hash, created_by_person_id, created_at)
- `public.finance_account_effects` — Paired effects (`TRANSFER_SOURCE` negative, `TRANSFER_DESTINATION` positive) linked via `transfer_id`

**RPCs:**
- `finance_create_transfer_v1` — Create (same-currency + cross-currency + commission)
- `finance_transfer_to_json` — Serialization
- `finance_current_user_can_read_transfer` — RLS helper
- `finance_validate_transfer_effect_v1` — Trigger validation

**Routes:** `POST /api/finance/transfers` only. **NO READ/LIST endpoint exists.**

**Controller/Service:** `finance.transfers.controller.js:createTransfer` → `finance.transfer.service.js:createTransfer`

**Create Mutation:** `createFinanceTransfer` (frontend) → `finance_create_transfer_v1` (RPC)

**Read/Detail Mutation:** **NONE** — No frontend service, no backend endpoint, no RPC for reading transfers.

**Source Effect:** `finance_account_effects` row: `effect_type='transfer'`, `effect_role='TRANSFER_SOURCE'`, `effect_amount = -source_amount`, `currency = source_currency`

**Destination Effect:** `finance_account_effects` row: `effect_type='transfer'`, `effect_role='TRANSFER_DESTINATION'`, `effect_amount = +destination_amount`, `currency = destination_currency`

**Commission Expense Relationship:**
- When `p_commission_amount > 0` supplied to `finance_create_transfer_v1`:
  1. Creates canonical Expense in `finance_transactions` with `transfer_id` = transfer's id (provenance link)
  2. Category = native `financial_costs` (server-derived)
  3. Account = Source Account
  4. Date = Transfer date
  5. Amount = commission amount (negative effect on source account)
  6. Returned in RPC response as `commission` object with `expenseId`, `amount`, `currency`, `categoryId`, etc.

**Same-Currency Fields:** `source_amount = destination_amount`, `currency = source_currency = destination_currency`

**Cross-Currency Fields:** `source_amount` ≠ `destination_amount`, `source_currency` ≠ `destination_currency`, `currency` = `source_currency` (legacy projection)

**Source Account:** `source_account_id` (must be `ACCOUNT` type, ACTIVE, authorized)

**Destination Account:** `destination_account_id` (must be `ACCOUNT` or `CREDIT_CARD`, ACTIVE, authorized)

**Transfer Date:** `transfer_date` (DATE, not timestamp)

**Description/Notes:** Optional `description`, `notes` on `finance_transfers`

**Root/Idempotency Identity:** `mutation_id` (unique), `idempotency_key` + `payload_hash` for replay protection

**Can Frontend Fetch Enough Data for Display?**

| Display Requirement | Currently Possible? | Evidence |
|---------------------|---------------------|----------|
| Transfer row: "Transferencia / Cuenta origen → Cuenta destino / -50.000 ARS / 25 ago" | **NO** | No read endpoint; no frontend service; `FinanceMovementDto` has no transfer fields beyond `transferId` (which is only for commission provenance) |
| Cross-currency: "Transferencia / ARS Account → USD Account / -100.000 ARS / +80 USD" | **NO** | Same — no read path exists |

**Conclusion:** Frontend **cannot** currently display Transfer rows. Backend has zero read capability for transfers.

---

## 5. CREDIT CARD PAYMENT PROJECTION

**Stage 5 Settlement Trace (`finance_payment_register_credit_card_v1`):**

1. **Payment Due Kind:** `CREDIT_CARD` (has `target_credit_card_account_id`)
2. **Source Account:** User-selected `ACCOUNT` type (validated: ACTIVE, same context, same currency as due)
3. **Destination Account:** `target_credit_card_account_id` from Payment Due (CREDIT_CARD, ACTIVE, same context/currency)
4. **Transfer Created:** Direct `INSERT INTO finance_transfers` with:
   - `source_account_id` = selected source account
   - `destination_account_id` = target credit card
   - `source_amount` = `p_actual_amount`
   - `destination_amount` = `p_actual_amount` (same-currency) or `p_destination_amount` (cross-currency)
   - `currency` = source currency
   - `source_currency` = source currency
   - `destination_currency` = destination currency
   - `transfer_date` = `p_actual_date`
   - `description` = Payment Due `title`
   - `mutation_id`/`idempotency_key`/`payload_hash` from payment registration
5. **Relationship to Payment Due:** `finance_payment_dues.transfer_id` = created transfer id (unique index prevents double-settlement)
6. **Expense Also Created?** **NO** — Only Transfer is created. Payment Due `consequenceType = 'TRANSFER'`.

**Product Authority Compliance:**
- ✅ Card payment = Transfer only (ACCOUNT → CREDIT_CARD)
- ✅ No Expense row created for the payment itself
- ⚠️ **GAP:** This Transfer is **invisible in Movimientos** (no read path)

**Current Violation:** Card payments settle as Transfers but Movimientos only reads `finance_transactions`. Card payment Transfers are **missing from daily history**.

---

## 6. COMMISSION PROJECTION

**How Commission Expense Links to Transfer:**
- `finance_transactions.transfer_id` → `finance_transfers.id` (nullable FK, ON DELETE SET NULL)
- Commission Expense has `transaction_type = 'expense'`, category = native `financial_costs`
- Commission Expense appears in `finance_transactions` with `status = 'ACTIVE'`
- Commission Expense has its own `finance_account_effects` row (PRIMARY expense on source account)

**Current Appearance in Movimientos:**
- Commission Expense **IS** returned by `listFinanceMovements` (it's a regular Expense in `finance_transactions`)
- It appears as an ordinary Expense row with category "Comisiones e intereses"
- No visual indication it belongs to a Transfer (frontend `MovementDetailSheet` checks `current.transferId === null` to enable refund/pool organization — commission expenses have `transferId` set, so those actions are disabled)

**Duplicate Semantics Risk:**
- Transfer row (missing) + Commission Expense row (present) = **orphan commission** without parent Transfer context
- User sees "Comisiones e intereses -500 ARS" but no "Transferencia -50.000 ARS" row

**Transfer Detail Resolution:** No Transfer detail surface exists. Commission Expense detail shows `transferId` but no navigation to Transfer.

**Authority Compliance:** Commission remains an Expense ✅. Unified Movimientos may show both Transfer row + Commission Expense row (per product authority).

---

## 7. REFUND / CORRECTION / TRASH SAFETY

**Current Movimientos Representation:**

| Scenario | Representation | Code Safeguards |
|----------|----------------|-----------------|
| Expense with partial refund | Single row, `totalRefunded` > 0, `netAmount` = gross - refunded, `refundEvents` array | `attachRefundCompositions` joins `finance_refund_events` by `expense_root_transaction_id` |
| Expense with full refund | Single row, `netAmount` = 0, `totalRefunded` = gross | Same; refund events sum to gross amount |
| Corrected Expense | Latest ACTIVE version per `root_transaction_id` (correction creates new transaction with same root) | `listFinanceMovements` returns ACTIVE rows; correction creates new version, old version status = 'SUPERSEDED' (excluded) |
| Corrected Income | Same as Expense | Same |
| Trashed transaction | **Excluded** from Movimientos (status = 'TRASHED') | `.eq('status', 'ACTIVE')` filter; separate `listFinanceTrash` endpoint |
| Restored transaction | Reappears in Movimientos (status → 'ACTIVE') | `restoreFinanceTransaction` sets status = 'ACTIVE' |

**Stage 7 Transfer Projection Risks:**

| Risk | Current Safeguard | Gap |
|------|-------------------|-----|
| Duplicate historical rows | `root_transaction_id` groups corrections; only ACTIVE versions | Transfers have no `root_transaction_id` concept; each Transfer is independent |
| Superseded versions appearing | `status = 'SUPERSEDED'` excluded by `.eq('status', 'ACTIVE')` | Transfers have no correction mechanism yet (Stage 7 scope guard) |
| Refund emitted as Income | Refunds are child events of Expense, never separate Income row | N/A — refunds stay in Expense composition |
| Trashed transactions appearing as active | `.eq('status', 'ACTIVE')` filter | Transfers have no trash status (not in `finance_transactions`) |
| Corrected versions duplicating root identity | `root_transaction_id` stable across corrections | Transfers lack root identity; each create = new row |

**Code Safeguards Already Present:**
- `finance_transactions.transfer_id` FK prevents commission Expense from being trashed independently (checks in trash/restore controllers)
- `finance_payment_dues` unique indexes on `expense_root_transaction_id` and `transfer_id` prevent double-settlement
- `finance_current_user_can_read_transfer` requires authorization on BOTH source and destination accounts

---

## 8. CURRENT DETAIL SURFACES

| Surface | Exists? | Handles Transfer? | Data Source |
|---------|---------|-------------------|-------------|
| `MovementDetailSheet` | ✅ | ❌ (checks `transferId === null` for refund/pool actions) | `getFinanceTransactionDetail` → `finance_transactions` + `finance_account_effects` join |
| Transaction Detail (generic) | ✅ (same as above) | ❌ | Same |
| Transfer Detail | ❌ | N/A | **NO READ ENDPOINT** |
| Payment Detail | ✅ (`PaymentDetailSheet`) | Shows `consequenceType: 'TRANSFER'` + `transferId` | `getPaymentDueDetail` → `finance_payment_dues` + joins |

**Missing Data for Transfer Detail:**
- Source account name/currency
- Destination account name/currency
- Source amount + currency
- Destination amount + currency (cross-currency)
- Commission Expense link (available via `finance_transactions.transfer_id` reverse lookup)
- Transfer date (`transfer_date` vs `transaction_date`)

**Stage 7 Needs New `TransferDetailSheet`?** **YES** — No existing surface can represent Transfer with source/destination/amounts/currencies/commission.

---

## 9. CURRENT NAVIGATION

**Movimientos Row → Detail:**
```tsx
// FinanceScreen.tsx:469-473
const handleMovementPress = (movement: FinanceMovementDto) => {
  setSelectedMovement(movement);
  setMovementDetailVisible(true);
  prefetchMovementDetail(movement); // calls getFinanceTransactionDetail
};
```
→ Opens `MovementDetailSheet` with `FinanceMovementDto`

**Discrimination for Unified Row:**
Current `FinanceMovementDto` has:
- `transactionType: 'expense' | 'income'`
- `transferId: string | null` (only for commission provenance)

**Extension Point:** Minimal — add `kind: 'EXPENSE' | 'INCOME' | 'TRANSFER'` discriminator to DTO and row component. `MovementDetailSheet` would need to route to `TransferDetailSheet` when `kind === 'TRANSFER'`.

**Current Navigation Types:**
- Expense/Income → `MovementDetailSheet` (supports refund, correction, trash, pool)
- Payment Due → `PaymentDetailSheet` (shows consequence: Expense or Transfer)
- **Transfer → NOWHERE** (no read, no detail)

---

## 10. PAGINATION / ORDERING

**Current Ordering:**
```sql
ORDER BY transaction_date DESC, created_at DESC, id DESC
```
- Primary: `transaction_date` (financial occurrence date, DATE)
- Tie-breaker 1: `created_at` (insertion timestamp)
- Tie-breaker 2: `id` (UUID v4, effectively random but deterministic)

**Current Cursor/Page Mechanism:** **NONE** — Full period result set.

**What Breaks When Transfer Rows Introduced:**
1. Transfers have `transfer_date` (DATE) not `transaction_date`
2. Transfers have `created_at` on `finance_transfers`
3. Transfers have no `root_transaction_id` / `corrected_from_transaction_id`
4. Mixed ordering requires unified sort key across two tables
5. Pagination (if added later) must merge two independent ordered streams

**Minimal Authoritative Unified Pagination Design:**
- **Option A (Extend endpoint):** Backend UNION ALL with normalized sort columns (`occurrence_date`, `created_at`, `id`, `source_table`) → single cursor
- **Option B (New endpoint):** Dedicated view/RPC returning discriminated union with same sort contract
- **Option C (Client merge):** Frontend fetches both, merges by `occurrence_date DESC, created_at DESC, id DESC` — ONLY acceptable if both sources expose complete authoritative rows (they do: `finance_transactions` + `finance_transfers`)

**Recommendation:** Option A or B for deterministic server-side ordering; Option C acceptable for Stage 7A if backend adds Transfer list endpoint with identical sort contract.

---

## 11. OPTION A ANALYSIS — Extend Current Movimientos Endpoint

**Approach:** Modify `listFinanceMovements` to UNION `finance_transactions` (Expense/Income) + `finance_transfers` (Transfer) into single discriminated response.

| Criterion | Assessment |
|-----------|------------|
| Minimality | Medium — touches core read service, requires DTO union, careful column alignment |
| Correctness | High — single source of truth, server-side ordering, atomic context/currency filtering |
| Pagination Impact | Low — can add cursor/limit to UNION result |
| Sorting Impact | Low — unified `ORDER BY occurrence_date DESC, created_at DESC, id DESC` |
| Context/Currency Isolation | High — single query respects RLS on both tables via `finance_current_user_can_read_account` |
| Duplicate Risk | Low — Transfer rows have distinct `type='transfer'`, no overlap with Expense/Income |
| Frontend Complexity | Low — single fetch, discriminated union in `FinanceMovementDto` |

**Blocker:** `finance_transfers` has no RLS policy for direct SELECT (only `finance_current_user_can_read_transfer` function). Would need `SELECT` policy or RPC wrapper.

---

## 12. OPTION B ANALYSIS — Dedicated Unified Read Endpoint/View/RPC

**Approach:** Create new `GET /api/finance/unified-movements` (or RPC `finance_list_unified_movements_v1`) returning `TRANSACTION | TRANSFER` union.

| Criterion | Assessment |
|-----------|------------|
| Minimality | Medium — new endpoint/RPC, but isolates from existing `movements` contract |
| Correctness | High — purpose-built for Stage 7, can include all needed fields upfront |
| Pagination Impact | Low — designed with cursor from start |
| Sorting Impact | Low — unified sort in SQL |
| Context/Currency Isolation | High — single authority |
| Duplicate Risk | Low — explicit discriminator |
| Frontend Complexity | Low — single fetch, new hook/service |

**Advantage:** Clean separation; existing `movements` endpoint unchanged for backward compatibility.

---

## 13. OPTION C ANALYSIS — Client-Side Merge

**Approach:** Frontend calls `listFinanceMovements` + new `listFinanceTransfers` (to be created), merges/sorts in memory.

| Criterion | Assessment |
|-----------|------------|
| Minimality | High for backend (just add Transfer list), Medium for frontend (merge logic) |
| Correctness | **Conditional** — Only if both sources expose fully authoritative rows without client-side financial reconstruction |
| Pagination Impact | High — two independent cursors, complex merge for infinite scroll |
| Sorting Impact | Medium — client must merge by `date DESC, created_at DESC, id DESC` |
| Context/Currency Isolation | Medium — two separate RLS evaluations |
| Duplicate Risk | Low — distinct types |
| Frontend Complexity | High — merge logic, dual loading/error/empty states, dual refresh |

**Product Preference Check:** "Avoid client-side financial reconstruction" — Option C **violates** this if merge requires any computation. But if purely chronological merge of authoritative rows, **acceptable per exception clause**.

**Verdict:** Option C acceptable ONLY if backend provides `listFinanceTransfers` with identical sort contract and all display fields. Otherwise rejected.

---

## 14. RECOMMENDED ARCHITECTURE

**RECOMMENDATION: OPTION B — Dedicated Unified Read Endpoint/RPC**

**Rationale:**
1. **Correctness:** Single authoritative source for unified daily history
2. **Pagination Ready:** Can implement cursor-based pagination from day 1
3. **Isolation:** Does not risk regressing existing `movements` endpoint (used by Summary, Analysis)
4. **Extensibility:** Can include Transfer-specific fields (source/destination accounts, cross-currency amounts, commission link) without polluting Expense/Income DTO
5. **RLS Safety:** RPC can enforce `finance_current_user_can_read_transfer` + transaction RLS atomically
6. **Minimal Frontend Change:** New hook `useFinanceUnifiedMovements` → single `FinanceUnifiedMovementDto[]`

**Implementation Sketch (for 7B):**
```sql
-- RPC: finance_list_unified_movements_v1(p_context_type, p_period, p_cursor, p_limit)
-- Returns: SETOF unified_movement_row (discriminated union)
-- Order: occurrence_date DESC, created_at DESC, id DESC
-- Cursor: (occurrence_date, created_at, id, source_table)
```

---

## 15. PROPOSED MINIMAL ROW UNION

**Expense Row:**
```ts
type FinanceExpenseRow = {
  kind: 'EXPENSE';
  id: string;                    // transaction id (version)
  rootTransactionId: string;     // root_transaction_id
  transactionType: 'expense';
  amount: string;                // signed negative for display
  grossAmount: string;
  totalRefunded: string;
  netAmount: string;
  currency: string;
  transactionDate: string;       // YYYY-MM-DD
  description: string | null;
  categoryLabelSnapshot: string | null;
  accountId: string | null;      // from account_effects join
  accountName: string | null;
  accountCurrency: string | null;
  hasRefund: boolean;
  refundEvents: FinanceRefundEventDto[];
  createdAt: string;
  updatedAt: string;
};
```

**Income Row:**
```ts
type FinanceIncomeRow = {
  kind: 'INCOME';
  id: string;
  rootTransactionId: string;
  transactionType: 'income';
  amount: string;                // signed positive
  currency: string;
  transactionDate: string;
  description: string | null;
  categoryLabelSnapshot: string | null;
  accountId: string | null;
  accountName: string | null;
  accountCurrency: string | null;
  createdAt: string;
  updatedAt: string;
};
```

**Transfer Row:**
```ts
type FinanceTransferRow = {
  kind: 'TRANSFER';
  id: string;                    // transfer id
  transferDate: string;          // YYYY-MM-DD
  description: string | null;
  notes: string | null;
  sourceAccountId: string;
  sourceAccountName: string;
  sourceAccountCurrency: string;
  sourceAmount: string;          // negative for display (outflow)
  sourceCurrency: string;
  destinationAccountId: string;
  destinationAccountName: string;
  destinationAccountCurrency: string;
  destinationAmount: string;     // positive for display (inflow)
  destinationCurrency: string;
  commissionExpenseId: string | null;  // if commission > 0
  commissionAmount: string | null;
  commissionCurrency: string | null;
  createdAt: string;
};
```

**Discriminated Union:**
```ts
type FinanceUnifiedMovementRow = FinanceExpenseRow | FinanceIncomeRow | FinanceTransferRow;
```

---

## 16. REAL GAP

| Gap | Location | Severity |
|-----|----------|----------|
| **No Transfer read endpoint** | Backend: missing controller/service/RPC/route | **P0** — Blocking |
| **No Transfer list/query in frontend** | Frontend: missing `listFinanceTransfers` service, hook | **P0** — Blocking |
| **No Transfer detail surface** | Frontend: missing `TransferDetailSheet` component | **P1** — Required for detail navigation |
| **Movimientos DTO lacks Transfer fields** | Frontend: `FinanceMovementDto` only has `transferId` (provenance) | **P0** — Blocking |
| **No unified pagination/cursor** | Both: current full-month fetch doesn't scale | **P1** — Needed for Stage 7 |
| **Card payment Transfers invisible** | Backend: Transfer created but not readable | **P0** — Data loss in daily history |
| **Commission Expense orphaned** | Frontend: shows commission Expense without parent Transfer context | **P1** — UX confusion |

---

## 17. FILES LIKELY TO CHANGE IN 7B/7C/7D/7E

**Backend (7B — Read Endpoint):**
- `backend/src/routes/finance.js` — add `GET /movements/unified` or `/transfers`
- `backend/src/controllers/finance.read.controller.js` — add `getUnifiedMovements` / `getTransfers`
- `backend/src/services/finance.read.service.js` — add `listFinanceTransfers`, `listUnifiedMovements`
- **NEW:** `backend/src/services/finance.transfer.read.service.js` (or extend read service)
- **NEW:** RPC `finance_list_unified_movements_v1` or `finance_list_transfers_v1` (migration)

**Frontend (7C — Service/Hook):**
- `services/finance/financeMovements.ts` — add `listFinanceTransfers`, `listUnifiedMovements`, unified DTO
- `services/finance/financeTransfers.ts` — add read functions (currently only create)
- `hooks/useFinanceUnifiedMovements.ts` (new)

**Frontend (7D — UI):**
- `screens/finance/FinanceScreen.tsx` — replace `FinanceMovementsSurface` with unified version
- `components/finance/FinanceMovementsSurface.tsx` (new extracted component)
- `components/finance/UnifiedMovementRow.tsx` (new row component with kind discrimination)
- `components/finance/TransferDetailSheet.tsx` (new)
- `components/finance/MovementDetailSheet.tsx` — route Transfer to TransferDetailSheet

**Frontend (7E — Navigation):**
- `navigation/financeNavigation.ts` — add Transfer detail route

---

## 18. DB MIGRATION EXPECTED: **YES**

**Required Migrations:**
1. **RPC `finance_list_unified_movements_v1`** — Unified read with cursor pagination
2. **RPC `finance_list_transfers_v1`** (alternative if Option A chosen) — Transfer list with same sort contract
3. **RLS Policy on `finance_transfers` for SELECT** — Or rely on RPC `security definer` with `finance_current_user_can_read_transfer`
4. **Index on `finance_transfers(transfer_date, created_at, id)`** — For efficient cursor pagination

**No Schema Changes to Tables** — Existing `finance_transfers`, `finance_transactions`, `finance_account_effects` sufficient.

---

## 19. RISKS

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| RLS policy gap on `finance_transfers` SELECT | High | Data leak / empty results | Use RPC `security definer` with `finance_current_user_can_read_transfer` |
| Sort mismatch between tables | Medium | Non-deterministic order | Normalize sort keys: `occurrence_date` (transaction_date/transfer_date), `created_at`, `id`, `source` |
| Commission Expense double-count in Summary | Low | Analysis corruption | Summary already uses `finance_transactions` only; Transfers excluded from Analysis per product authority |
| Migration complexity for cursor pagination | Medium | Delay | Start with full-month fetch (like current), add cursor in 7D |
| Frontend merge bugs (if Option C) | High | Wrong order, duplicates | **Avoid Option C** — Use Option B |

---

## 20. OUT OF SCOPE

The following are **explicitly OUT OF SCOPE** for Stage 7 (per product authority):
- ❌ New Transfer creation flow redesign
- ❌ New accounting model
- ❌ New refund UX
- ❌ New payment architecture
- ❌ Analysis changes (Transfers excluded from Analysis)
- ❌ Pool changes
- ❌ Spending Limit changes
- ❌ Forecasts
- ❌ Geni
- ❌ Merchant analytics
- ❌ Search redesign
- ❌ Bulk operations
- ❌ Statement import
- ❌ Bank synchronization

**Temptations Noted (DO NOT ACT ON):**
- "Add Transfer correction flow" → Stage 7 scope guard
- "Unify Transfer/Expense correction" → Stage 7 scope guard
- "Add FX rate display" → Product authority: No FX inference
- "Merge Payment Due + Transfer detail" → Separate concerns

---

## 21. VERDICT

**STAGE 7A AUDIT COMPLETE — READY FOR CONTRACT FREEZE**

All current implementation mapped. Real gaps identified. Recommended architecture (Option B) selected. No blockers preventing Stage 7B contract definition.

**Next Step:** Define Stage 7B contract (RPC spec, DTO, pagination cursor, frontend hook signature) and proceed to implementation.

---

**Audit Completed:** 2026-09-01
**Auditor:** opencode agent
**Mode:** Read-only — No source modifications made