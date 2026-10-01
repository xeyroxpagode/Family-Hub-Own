# HOMePLUS FINANCE V1.1
# STAGE 7B — UNIFIED MOVEMENTS CONTRACT FREEZE

**Branch:** `finance-v1-unified`
**Mode:** CONTRACT FREEZE ONLY — NO IMPLEMENTATION, NO SOURCE CHANGES, NO MIGRATION CREATION, NO DB MUTATION, NO REMOTE SUPABASE, NO COMMIT, NO PUSH
**Status:** 7A AUDIT PASS — READY FOR CONTRACT FREEZE

---

## 1. CONTRACT STATUS

**FROZEN** — This document constitutes the authoritative contract for Stage 7B. All 23 sections below are binding. Implementation (7C/7D/7E) must conform exactly to this contract.

---

## 2. FINAL ARCHITECTURE

**Decision:** Option B — Dedicated Unified Read RPC (`finance_list_unified_movements_v1`) backing the existing public endpoint `GET /api/finance/movements`.

**Rationale:**
- Single authoritative backend read for unified daily history (Expense + Income + Transfer)
- Existing endpoint remains the owner of Finance → Movimientos (no second frontend-facing endpoint)
- RPC normalizes `finance_transactions` + `finance_transfers` into one discriminated result
- Frontend MUST NOT reconstruct financial semantics
- Pagination NOT introduced in Stage 7 (keeps current full-month load behavior)
- RPC provides safe server-authoritative read using existing authorization helpers

**Data Flow:**
```
GET /api/finance/movements
  → finance.read.controller.getMovements
  → finance_list_unified_movements_v1 (RPC)
  → finance_transactions (Expense/Income) + finance_transfers (Transfer)
  → FinanceUnifiedMovementDto[]
```

---

## 3. PUBLIC API CONTRACT

### Endpoint
```
GET /api/finance/movements?contextType={personal|household}&period={YYYY-MM}
```

### Response Shape
```json
{
  "period": "2026-09",
  "contextType": "personal",
  "movements": [
    // FinanceUnifiedMovementDto (discriminated by 'kind')
  ]
}
```

### Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| period | string | ✅ | Calendar month YYYY-MM |
| contextType | 'personal' \| 'household' | ✅ | Resolved server-side |
| movements | FinanceUnifiedMovementDto[] | ✅ | Ordered array, full month |

### Errors
- 400: Invalid period format (must be YYYY-MM)
- 400: Caller-supplied owner IDs forbidden
- 403: RLS / authorization failure
- 500: Internal error

---

## 4. EXPENSE DTO

```typescript
type FinanceExpenseDto = {
  kind: 'EXPENSE';
  id: string;                              // transaction version id
  rootTransactionId: string;               // root_transaction_id
  amount: string;                          // signed negative for display
  grossAmount: string;                     // original factual expense amount
  totalRefunded: string;                   // sum of ACTIVE refund events
  netAmount: string;                       // backend-authoritative net (gross - refunded)
  currency: string;                        // ISO 4217
  date: string;                            // transaction_date (YYYY-MM-DD)
  description: string | null;
  categoryId: string | null;
  categoryLabel: string | null;            // category_label_snapshot
  transferId: string | null;               // provenance link to Transfer (commission)
  createdAt: string;                       // created_at
};
```

**Semantics:**
- Latest ACTIVE version per `root_transaction_id` only
- `grossAmount` = original factual Expense
- `totalRefunded` = composition of Expense (refund events)
- `netAmount` = backend-authoritative net result
- Full refund = one Expense row with `netAmount = '0'`
- Refund events are NEVER separate Income rows
- `transferId` indicates commission provenance only — does NOT mean the transaction itself is a Transfer

---

## 5. INCOME DTO

```typescript
type FinanceIncomeDto = {
  kind: 'INCOME';
  id: string;                              // transaction version id
  rootTransactionId: string;               // root_transaction_id
  amount: string;                          // signed positive for display
  currency: string;                        // ISO 4217
  date: string;                            // transaction_date (YYYY-MM-DD)
  description: string | null;
  categoryId: string | null;
  categoryLabel: string | null;            // category_label_snapshot
  createdAt: string;                       // created_at
};
```

**Semantics:**
- Latest ACTIVE version per `root_transaction_id` only
- Refund semantics do NOT apply to Income
- No `transferId` field (Income never has commission provenance)

---

## 6. TRANSFER DTO

```typescript
type FinanceTransferDto = {
  kind: 'TRANSFER';
  id: string;                              // finance_transfers.id
  date: string;                            // transfer_date (YYYY-MM-DD)
  description: string | null;
  notes: string | null;
  sourceAccount: {
    id: string;
    name: string;
    accountType: 'ACCOUNT' | 'CREDIT_CARD';
    currency: string;
  };
  destinationAccount: {
    id: string;
    name: string;
    accountType: 'ACCOUNT' | 'CREDIT_CARD';
    currency: string;
  };
  sourceAmount: string;                    // negative for display (outflow)
  sourceCurrency: string;
  destinationAmount: string;               // positive for display (inflow)
  destinationCurrency: string;
  commission: {
    expenseRootTransactionId: string | null;
    amount: string | null;
    currency: string | null;
  } | null;
  createdAt: string;                       // created_at
};
```

**Semantics:**
- A Transfer is NOT Expense, NOT Income, NOT negative/positive net worth
- Row UI must NOT visually present it as a red expense
- Same currency: `sourceAmount === destinationAmount`, `sourceCurrency === destinationCurrency`
- Cross currency: both factual amounts displayed explicitly
- NO FX rate calculation, NO normalization to single currency
- Commission remains a canonical Expense (separate row in unified list)

**Display Examples:**
```
Same currency:
  Transferencia
  Cuenta origen → Cuenta destino
  -50.000 ARS

Cross currency:
  Transferencia
  Cuenta ARS → Cuenta USD
  -100.000 ARS → +80 USD

Card payment:
  Pago de tarjeta
  Cuenta origen → Tarjeta
  -50.000 ARS
```

---

## 7. TRANSFER DETAIL CONTRACT

### Endpoint Decision
```
GET /api/finance/transfers/:transferId
```
**Rationale:** Consistent with existing `GET /api/finance/transactions/:transactionId` pattern.

### Response Shape
```json
{
  "id": "uuid",
  "date": "2026-09-15",
  "description": "Pago tarjeta",
  "notes": "Vencimiento septiembre",
  "sourceAccount": {
    "id": "uuid",
    "name": "Cuenta Sueldo",
    "accountType": "ACCOUNT",
    "currency": "ARS"
  },
  "destinationAccount": {
    "id": "uuid",
    "name": "Tarjeta Visa",
    "accountType": "CREDIT_CARD",
    "currency": "ARS"
  },
  "sourceAmount": "-50000.0000",
  "sourceCurrency": "ARS",
  "destinationAmount": "50000.0000",
  "destinationCurrency": "ARS",
  "commission": {
    "expenseRootTransactionId": "uuid",
    "amount": "500.0000",
    "currency": "ARS"
  } | null,
  "createdAt": "2026-09-15T10:30:00.000Z"
}
```

### Frontend Surface
**New Component:** `TransferDetailSheet`

**Minimum Factual Content:**
```
Transferencia
Fecha: 15 sep 2026

Desde
  Cuenta Sueldo
  -50.000 ARS

Hacia
  Tarjeta Visa
  +50.000 ARS

Descripción: Pago tarjeta
Notas: Vencimiento septiembre

Comisión (si existe):
  Comisiones e intereses
  -500 ARS
```

**Rules:**
- Same currency: avoid redundant visual noise (show amount once with direction)
- Cross currency: display both factual amounts explicitly
- NO FX rate, NO recommendation
- NO editing/correction/trash actions in Stage 7
- Transfer lifecycle redesign OUT OF SCOPE

---

## 8. ORDERING CONTRACT

**Deterministic Order:**
```
occurrence_date DESC
created_at DESC
id DESC
```

**Where:**
- Expense/Income: `occurrence_date = transaction_date`
- Transfer: `occurrence_date = transfer_date`

**Tie-breaker Note:** If a source discriminator is technically required as final SQL tie-breaker (e.g., `source_table` = 'transactions' | 'transfers'), document it but do NOT expose to frontend.

---

## 9. PERIOD CONTRACT

**Calendar Month:** `YYYY-MM`

**Half-Open Factual Range:** `[start, endExclusive)`

| Source | Filter Column |
|--------|---------------|
| Expense/Income | `transaction_date` |
| Transfer | `transfer_date` |

**No daily/yearly/custom ranges in Stage 7.**

---

## 10. CONTEXT / AUTH CONTRACT

### Current Authority (Preserved)
| Context | Owner | Household |
|---------|-------|-----------|
| Personal | `owner_person_id` = authenticated person | `household_id` IS NULL |
| Household | `owner_person_id` IS NULL | `household_id` = active household |

### Rules
- Caller CANNOT provide arbitrary person/household ownership IDs
- Unified RPC must enforce identical context isolation for both `finance_transactions` AND `finance_transfers`
- Transfer readability requires authorization to BOTH source AND destination accounts (via existing `finance_current_user_can_read_transfer`)
- NO Personal ↔ Household leakage

---

## 11. CURRENCY CONTRACT

**Current Behavior Preserved:**
- Movimientos may display multiple currencies in the same month
- NO currency filtering introduced in Stage 7
- Each row owns its factual currency data
- Cross-currency Transfer owns: `sourceCurrency`, `destinationCurrency`
- NO FX conversion

---

## 12. COMMISSION CONTRACT

**FREEZE:** Commission remains a canonical Expense.

**Unified Movimientos MAY contain BOTH:**
- TRANSFER row (movement of money)
- EXPENSE row with category "Comisiones e intereses" (cost)

**This is NOT duplication** — they represent different financial facts.

**Rules:**
- Transfer Detail MAY display commission as associated factual context
- DO NOT suppress the Expense row
- DO NOT count Transfer itself in Analysis

---

## 13. CARD PAYMENT CONTRACT

**FREEZE:** Payment Due CREDIT_CARD settlement (ACCOUNT → CREDIT_CARD) is a Transfer.

**Requirements:**
- MUST appear in Movimientos after Stage 7
- MUST NOT generate or display an Expense for the card payment itself
- Existing card purchases remain Expenses

**Mapping:**
| Action | Type | Counted in Analysis |
|--------|------|---------------------|
| Credit-card purchase | Expense | ✅ |
| Credit-card bill payment | Transfer | ❌ |
| Commission (if applicable) | Expense | ✅ |

---

## 14. REFUND / CORRECTION / TRASH CONTRACT

### Preserve Stage 4 Exactly

| Scenario | Representation |
|----------|----------------|
| Expense partial refund | One Expense row, `totalRefunded` > 0, `netAmount` = gross - refunded |
| Expense full refund | One Expense row, `netAmount` = '0' |
| Refund | NEVER an Income row |
| Corrected Expense/Income | Latest ACTIVE version per root |
| SUPERSEDED | Not shown |
| TRASHED | Not shown in Movimientos |
| RESTORED | Shown again when ACTIVE |

### Transfer (Stage 7 Guard)
- NO correction lifecycle added
- NO trash lifecycle added
- NO restore lifecycle added
- Stage 7 MUST NOT invent one

---

## 15. ACCOUNT NAME / SNAPSHOT DECISION

**DECISION: A — Use current account names dynamically.**

**Justification:**
- Transfer currently stores account IDs, NOT historical account-name snapshots
- `finance_transfers` has no snapshot columns for account names
- Account names in `finance_accounts` are the current authoritative display names
- Adding snapshot columns in Stage 7 would require schema migration with no proven correctness requirement

**Implementation:** Join to `finance_accounts` at read time to get current `name`, `account_type`, `currency`.

---

## 16. RPC EXECUTION SECURITY DECISION

**DECISION: SECURITY DEFINER with explicit authorization**

**Justification based on CURRENT patterns:**
- Existing Finance RPCs (`finance_create_transfer_v1`, `finance_create_transaction_with_optional_account_effect_v1`, etc.) use `SECURITY DEFINER` with fixed `search_path`
- `finance_current_user_can_read_transfer` already exists and enforces authorization on BOTH accounts
- `SECURITY INVOKER` would require direct SELECT policy on `finance_transfers`, which is explicitly prohibited ("Do NOT add a broad direct SELECT policy on finance_transfers merely to make frontend reads easier")

**Required Guards in RPC:**
- Fixed `search_path = public, pg_catalog`
- Explicit `auth.uid()` / `current_person_id()` validation
- Context type derived server-side (no caller-supplied owner IDs)
- Transfer authorization via `finance_current_user_can_read_transfer` on both source and destination accounts
- Period validation (YYYY-MM calendar month)

---

## 17. TRANSFER DETAIL ENDPOINT DECISION

**CHOSEN:** `GET /api/finance/transfers/:transferId`

**Rationale:**
- Most consistent with existing `GET /api/finance/transactions/:transactionId`
- Enforces same authorization as list (via `finance_current_user_can_read_transfer`)
- Frontend MUST NOT query Supabase directly

---

## 18. DB MIGRATION PLAN

**Expected:** YES

**Objects to Create:**
1. **RPC:** `finance_list_unified_movements_v1(p_context_type text, p_period text)` 
   - Returns `SETOF jsonb` (or typed rows matching current Finance RPC conventions)
   - Normalizes `finance_transactions` + `finance_transfers` into discriminated union
   - Ordering: `occurrence_date DESC, created_at DESC, id DESC`
   - Full month result (no pagination in Stage 7)
   - `SECURITY DEFINER` with fixed `search_path`, explicit auth validation

2. **RPC:** `finance_get_transfer_detail_v1(p_transfer_id uuid)`
   - Returns single transfer detail with account names joined
   - `SECURITY DEFINER` with fixed `search_path`
   - Enforces `finance_current_user_can_read_transfer`

3. **Indexes** (only if justified by query plan/current scale):
   - `finance_transfers (transfer_date DESC, created_at DESC, id DESC)` for ordering
   - Composite index supporting context filtering + date range

**NO Schema Changes To:**
- `finance_transactions`
- `finance_transfers`
- `finance_account_effects`

---

## 19. BACKEND FILE PLAN

**New Files:**
- `backend/src/services/finance.unified.read.service.js` — RPC wrapper + DTO mapping
- `backend/src/controllers/finance.unified.read.controller.js` — endpoint handlers

**Modified Files:**
- `backend/src/routes/finance.js` — ensure `/movements` routes to unified controller (already does)
- `backend/src/controllers/finance.read.controller.js` — replace `getMovements` to call unified service

**RPC Implementation (Migration):**
- `supabase/migrations/XXX_finance_list_unified_movements_v1.sql`
- `supabase/migrations/XXX_finance_get_transfer_detail_v1.sql`

---

## 20. FRONTEND FILE PLAN

**Modified Files:**
- `front/mi-front-limpio/services/finance/financeMovements.ts` — extend `FinanceMovementDto` to discriminated union `FinanceUnifiedMovementDto`, keep `listFinanceMovements` as canonical client
- `front/mi-front-limpio/screens/finance/FinanceScreen.tsx` — adapt `FinanceMovementsSurface` to handle `kind === 'TRANSFER'`
- `front/mi-front-limpio/components/finance/FinanceMovementsSurface.tsx` (extract from inline) — render unified rows
- `front/mi-front-limpio/components/finance/UnifiedMovementRow.tsx` (new) — row component with kind discrimination
- `front/mi-front-limpio/components/finance/TransferDetailSheet.tsx` (new) — Transfer detail surface
- `front/mi-front-limpio/components/finance/MovementDetailSheet.tsx` — route Transfer to `TransferDetailSheet`

**New Files:**
- `front/mi-front-limpio/services/finance/financeTransfers.read.ts` — `getTransferDetail` client
- `front/mi-front-limpio/hooks/useFinanceUnifiedMovements.ts` (optional, if hook extraction needed)

**Preserved:**
- `services/finance/financeMovements.ts` remains canonical Movimientos read client
- Existing `FinanceScreen` refresh mechanics (`readRefreshNonce`)
- `MovementDetailSheet` for Expense/Income only

---

## 21. TEST PLAN FOR 7C/7D/7E

### 7C — Backend Implementation Tests
| Test | Scope |
|------|-------|
| RPC returns Expense rows with correct kind/amount/refund composition | Unit |
| RPC returns Income rows with correct kind/amount | Unit |
| RPC returns Transfer rows with correct kind, source/dest accounts, amounts, currencies | Unit |
| RPC orders by occurrence_date DESC, created_at DESC, id DESC across both tables | Unit |
| RPC enforces Personal context isolation (owner_person_id, household_id=null) | Unit |
| RPC enforces Household context isolation (owner_person_id=null, household_id=active) | Unit |
| RPC rejects caller-supplied owner IDs | Unit |
| RPC Transfer authorization requires BOTH accounts readable | Unit |
| RPC Transfer detail returns correct account names, amounts, commission link | Unit |
| RPC Transfer detail enforces same authorization as list | Unit |
| Migration applies cleanly on clean DB | Integration |
| Migration applies cleanly on existing 7A DB | Integration |

### 7D — Frontend Service/Hook Tests
| Test | Scope |
|------|-------|
| `listFinanceMovements` returns `FinanceUnifiedMovementDto[]` with `kind` discriminator | Unit |
| `FinanceUnifiedMovementDto` type discriminates correctly (EXPENSE/INCOME/TRANSFER) | Type |
| `getTransferDetail` calls correct endpoint, returns typed DTO | Unit |
| Service preserves existing `FinanceReadOptions` signature | Unit |

### 7E — UI/Integration Tests
| Test | Scope |
|------|-------|
| Movimientos surface renders Expense rows (red amount, category, refund summary) | E2E |
| Movimientos surface renders Income rows (green amount, category) | E2E |
| Movimientos surface renders Transfer rows (neutral style, source→dest, both amounts) | E2E |
| Same-currency Transfer displays single amount with direction | E2E |
| Cross-currency Transfer displays both factual amounts | E2E |
| Card payment (ACCOUNT→CREDIT_CARD) appears as Transfer, not Expense | E2E |
| Commission Expense appears as separate row alongside Transfer | E2E |
| Row press: Expense/Income → MovementDetailSheet | E2E |
| Row press: Transfer → TransferDetailSheet | E2E |
| TransferDetailSheet shows source/dest accounts, amounts, commission link | E2E |
| Empty state: "Sin movimientos en este periodo" when no rows (month with only Transfers is NOT empty) | E2E |
| Loading/error/retry states preserved | E2E |
| Period navigation (prev/next month) refetches correctly | E2E |
| Context switch (Personal↔Household) refetches correctly | E2E |
| Analysis/Resumen/Pools/Spending Limits unchanged (Transfers excluded) | Regression |

---

## 22. OUT OF SCOPE

Explicitly OUT OF SCOPE for Stage 7 (per product authority):
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
- ❌ Pagination / cursor / infinite scroll
- ❌ Transfer correction/trash/restore lifecycle
- ❌ FX rate display or calculation

---

## 23. OPEN QUESTIONS

**NONE** — No blocking contradictions identified. All decisions resolved from current codebase evidence and product authority.

---

## 24. VERDICT

**STAGE 7B CONTRACT FROZEN — READY FOR BACKEND IMPLEMENTATION**

---

*Contract frozen: 2026-09-01*
*Authority: Stage 7A Audit Report + Product Authority*
*Next: Stage 7C — Backend Implementation*