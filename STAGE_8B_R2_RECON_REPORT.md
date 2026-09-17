# HOMePLUS FINANCE V1.1
# STAGE 8B — RECON R2
# PAYMENTS / OBLIGATION / SETTLEMENT TRUTH
# READ ONLY

**ROOT:** C:\Users\thega\Desktop\HomePlus  
**BRANCH:** finance-v1-unified  
**AUTHORITIES:** Stage 5 PASS, Stage 7 PASS, Stage 8A AUDIT COMPLETE  
**MODE:** DEEP FACTUAL RECON — READ ONLY  
**DATE:** 2026-09-03  

---

## 1. EXECUTIVE SUMMARY

This report traces the **exact current implementation** of Payment Dues, Payment Series, and their settlement flows (Normal → Expense, Credit Card → Transfer) across backend (Supabase RPCs) and frontend (React Native sheets). No modifications are made.

**Key Findings:**
- Payment Dues are **obligation reminders** (PENDING) that do NOT affect balances until settled
- Normal settlement creates an **Expense** with optional account effect
- Credit Card settlement creates a **Transfer** (source ACCOUNT → destination CREDIT_CARD)
- Recurrence: only the **next PENDING occurrence is materialized**; future dues generated on completion of current
- Attention rules: PENDING dues with due_date ≤ today+3 days surface as Attention (overdue, today, +1, +2, +3)
- **Confirmed UX confusion sources:** "Crear pago" / "Registrar pago" / "Pagar tarjeta" / "Vencimiento" / "Monto esperado" vs "Monto real" create ambiguity between *scheduling* vs *recording payment now*
- **Picker bug confirmed:** Credit card target picker uses `transfer-destination` operation which allows ACCOUNT types (should be CREDIT_CARD only)

**Verdict:** R2 PAYMENTS TRUTH COMPLETE — READY FOR PRODUCT FREEZE

---

## 2. PAYMENT DOMAIN MODEL

### 2.1 Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `finance_payment_series` | Recurrence instructions + defaults | `id`, `kind` (NORMAL\|CREDIT_CARD), `title`, `currency`, `default_expected_amount_known`, `default_expected_amount`, `default_category_id`, `target_credit_card_account_id`, `recurrence_interval_unit` (DAY/WEEK/MONTH/YEAR), `recurrence_interval_count`, `recurrence_anchor_date`, `status` (ACTIVE\|CANCELLED) |
| `finance_payment_dues` | Concrete obligation occurrence | `id`, `kind`, `title`, `currency`, `expected_amount_known`, `expected_amount`, `due_date`, `category_id`, `target_credit_card_account_id`, `status` (PENDING\|CANCELLED\|PAID), `payment_series_id`, `expense_root_transaction_id`, `transfer_id`, `actual_amount`, `actual_date`, `paid_at`, `actual_category_id`, `actual_account_id` |

### 2.2 States

| Entity | States | User-Facing Meaning |
|--------|--------|---------------------|
| **PaymentDue** | PENDING | Obligation exists, not yet settled. Appears in "Próximos" or "Necesitan atención" (if overdue/today/+3) |
| | PAID | Settlement recorded. Shows actual amount/date. Links to Expense (NORMAL) or Transfer (CREDIT_CARD). Appears in "Pagados" |
| | CANCELLED | Obligation voided. No financial effect. "Este pago fue cancelado y no genera obligación" |
| **PaymentSeries** | ACTIVE | Recurrence active. Current PENDING due materialized. Future dues generated on completion |
| | CANCELLED | Series stopped. All PENDING dues cancelled. Historical PAID dues unaffected |

### 2.3 Kind Semantics

| Kind | Creation Requires | Settlement Creates | Amount Semantics |
|------|-------------------|---------------------|------------------|
| **NORMAL** | `category_id` optional, `target_credit_card_account_id` = NULL | Expense (canonical) + optional account effect | `expected_amount` = expected expense amount; `actual_amount` at settlement can differ |
| **CREDIT_CARD** | `target_credit_card_account_id` required (must be ACTIVE CREDIT_CARD, same currency/context), `category_id` = NULL | Transfer (source ACCOUNT → target CREDIT_CARD) | `expected_amount` = expected payment to card; `actual_amount` = source amount paid; `destination_amount` = amount credited to card (same currency = equal) |

### 2.4 Constraints (Backend Enforced)

- `finance_payment_dues_expected_amount_check`: `expected_amount_known=true` → `expected_amount > 0`; `false` → `expected_amount IS NULL`
- `finance_payment_dues_target_card_shape_check`: CREDIT_CARD kind requires target card; NORMAL forbids it
- `finance_payment_dues_paid_integrity_check`: PAID requires `actual_amount > 0`, `actual_date`, `paid_at`, and (`expense_root_transaction_id` for NORMAL OR `transfer_id` for CREDIT_CARD)
- Unique indexes on `expense_root_transaction_id` and `transfer_id` prevent duplicate settlement

---

## 3. NORMAL CREATE TRUTH (One-Off)

**RPC:** `finance_payment_due_create_oneoff_v1`  
**Frontend:** `NewPaymentSheet` → `createOneOffPaymentDue` service

| # | Question | Answer |
|---|----------|--------|
| 1 | Required fields | `kind` (NORMAL), `title` (non-empty), `currency` (ISO 3-letter), `expected_amount_known` (boolean), `due_date` (YYYY-MM-DD), `financial_context_type` (personal/household), `owner_person_id`/`household_id` per context, `created_by_person_id` |
| 2 | Optional fields | `expected_amount` (required if known=true), `category_id` (must be expense-type, selectable, correct context), `target_credit_card_account_id` (MUST be null for NORMAL) |
| 3 | `expectedAmountKnown` behavior | `true` → `expected_amount` required > 0; `false` → `expected_amount` must be null, UI shows "A confirmar" |
| 4 | Can amount be unknown? | **Yes.** `expected_amount_known=false` creates due with "A confirmar". Amount provided at settlement |
| 5 | `dueDate` requirement | Required. Format YYYY-MM-DD. Validated as real calendar date |
| 6 | Can dueDate be today? | **Yes.** `due_date = current_date` allowed |
| 7 | Can dueDate be future? | **Yes.** Any future date allowed |
| 8 | Can dueDate be past? | **Yes.** Past dates allowed (creates overdue immediately) |
| 9 | Does creation create Expense? | **No.** Only creates PaymentDue (PENDING). Expense created at settlement |
| 10 | Does creation affect account balance? | **No.** No account effects until settlement |
| 11 | Does it appear immediately in Pagos? | **Yes.** Listed in `listPaymentDues` → PaymentsList groups as "Próximos" (if future/today) or "Necesitan atención" (if overdue) |
| 12 | Where exactly does it appear? | FinanceScreen → Pagos tab → PaymentsList → grouped by status: overdue → "Necesitan atención", upcoming → "Próximos", paid → "Pagados" |

---

## 4. CREDIT_CARD CREATE TRUTH (One-Off)

**RPC:** `finance_payment_due_create_oneoff_v1` (kind=CREDIT_CARD)  
**Frontend:** `NewPaymentSheet` (kind=CREDIT_CARD)

| # | Question | Answer |
|---|----------|--------|
| 1 | Target card rules | Required. Must be ACTIVE CREDIT_CARD, same currency as due, same financial_context_type, same owner/household. Validated in trigger `finance_payment_validate_row_v1` and service `validateTargetCreditCard` |
| 2 | Currency source | **Inherited from target card.** Frontend forces currency = targetCard.currency when card selected (NewPaymentSheet line 140-143). Backend validates card.currency = due.currency |
| 3 | Amount semantics | `expected_amount` = expected payment to card. At settlement: `actual_amount` = source account amount; `destination_amount` = amount credited to card (same currency → equal) |
| 4 | DueDate semantics | Same as NORMAL: any valid date (past/today/future). Determines when obligation appears in Attention |
| 5 | Does creation modify card debt? | **No.** PaymentDue is reminder only. Card debt (`finance_accounts.currentBalance`) unchanged until settlement |
| 6 | Does creation generate Transfer? | **No.** Transfer created at settlement via `registerCreditCardPayment` |
| 7 | Appears differently from normal due? | **Yes.** PaymentRow shows "Tarjeta de crédito" badge. PaymentDetailSheet shows "Tarjeta" row with card name. Settlement action = "Pagar tarjeta" (not "Registrar pago") |

---

## 5. RECURRENCE TRUTH

**RPCs:** `finance_payment_series_create_v1`, `finance_payment_advance_series_v1` (called on cancel/settlement)  
**Frontend:** `NewPaymentSheet` (recurrenceEnabled + presets), `EditPaymentDueSheet` (scope: single / series)

### 5.1 Series Creation

| # | Question | Answer |
|---|----------|--------|
| 1 | What is materialized immediately? | **Series row** (ACTIVE) + **first PaymentDue** (PENDING) with `due_date = recurrence_anchor_date`, all defaults copied from series |
| 2 | What creates future occurrences? | `finance_payment_advance_series_v1` called when current PENDING due is **settled (PAID)** or **cancelled (CANCELLED)** |
| 3 | Is only next occurrence materialized? | **Yes.** Unique index `finance_payment_dues_one_pending_per_series_uidx` enforces at most one PENDING due per series |
| 4 | What happens when current occurrence completed? | On PAID: `registerNormalPayment` / `registerCreditCardPayment` calls `advance_series` → creates next due. On CANCEL: `cancelPaymentDue` calls `advance_series` → creates next due |
| 5 | How future due dates generated? | `finance_payment_next_due_date(anchor_date, unit, count, previous_due_date)`: DAY/WEEK add days; MONTH/YEAR preserve anchor day (clamped to month end) |
| 7 | Can one occurrence differ from defaults? | **No (current).** `advance_series` copies all series defaults. No per-occurrence override mechanism exists. Edit of current due via `editPaymentDue` affects only that due |
| 8 | What state owns recurrence truth? | **`finance_payment_series`** (ACTIVE/CANCELLED). The series row is the source of truth for recurrence parameters. Current due is materialized copy |

### 5.2 Frontend Recurrence State (NewPaymentSheet)

| State Variable | Purpose | Conflict/Duplication |
|----------------|---------|----------------------|
| `recurrenceEnabled` (boolean) | Toggle on/off | Independent of `recurrencePresetIndex` — can be true while preset="No se repite" (P1-1 bug) |
| `recurrencePresetIndex` (0-8) | Preset selection (0="No se repite") | When 0, recurrence effectively disabled but `recurrenceEnabled` may be true |
| `customRecurrenceUnit` / `customRecurrenceCount` | Custom recurrence when preset=last | Only used when `recurrencePresetIndex === RECURRENCE_PRESETS.length - 1` |
| `recurrenceAnchorDate` | Base date for series | Independent of first due `date` — can differ |

**Duplicated/Conflicting State:** `recurrenceEnabled` + `recurrencePresetIndex=0` = "enabled but no recurrence" — CTA incorrectly says "Crear pago recurrente" (NewPaymentSheet line 371). No single source of truth for "is this actually recurring?"

### 5.3 Recurrence Presets (Frontend)

| Index | Label | Value |
|-------|-------|-------|
| 0 | No se repite | `null` |
| 1 | Cada semana | `{unit: WEEK, count: 1}` |
| 2 | Cada 2 semanas | `{unit: WEEK, count: 2}` |
| 3 | Cada mes | `{unit: MONTH, count: 1}` |
| 4 | Cada 2 meses | `{unit: MONTH, count: 2}` |
| 5 | Cada 3 meses | `{unit: MONTH, count: 3}` |
| 6 | Cada 6 meses | `{unit: MONTH, count: 6}` |
| 7 | Cada año | `{unit: YEAR, count: 1}` |
| 8 | Personalizado | `null` (uses custom unit/count) |

---

## 6. NORMAL SETTLEMENT TRUTH

**RPC:** `finance_payment_register_normal_v1`  
**Frontend:** `RegisterPaymentSheet` → `registerNormalPayment` service

| # | Question | Answer |
|---|----------|--------|
| 1 | When is Expense created? | **At settlement** (RPC execution). New Expense transaction with `root_transaction_id = new uuid` (self-root) |
| 2 | Which amount is used? | `p_actual_amount` (provided by user). Can differ from `expected_amount` |
| 3 | Can actual amount differ from expected? | **Yes.** No validation against expected. User enters "Monto real" freely |
| 4 | Which date is used? | `p_actual_date` (user-selected). Validated: not future (`actual_date ≤ current_date`) |
| 5 | Category behavior | Optional `p_actual_category_id`. If provided, validated as expense-type, selectable, correct context. If omitted, Expense created without category. Due's `category_id` NOT auto-used |
| 6 | Account behavior | Optional `p_actual_account_id`. If provided, validated: ACTIVE ACCOUNT (not CREDIT_CARD), same currency, same context, user has read access. Creates `finance_account_effect` (expense, PRIMARY, -amount) |
| 7 | Does due become PAID atomically with Expense creation? | **Yes.** Single RPC transaction: INSERT Expense → INSERT account_effect (if account) → UPDATE due SET status=PAID, expense_root_transaction_id, actual_amount, actual_date, paid_at, actual_category_id, actual_account_id |
| 8 | What IDs link due ↔ Expense? | `finance_payment_dues.expense_root_transaction_id` = `finance_transactions.root_transaction_id` (Expense root) |
| 9 | What if Expense creation fails? | Entire RPC rolls back (PostgreSQL transaction). Due remains PENDING. Idempotency reservation replay returns existing result |
| 10 | What if marking PAID fails? | Same — atomic. If UPDATE due fails, Expense/account_effect rolled back |
| 11 | Idempotency behavior | `planner_v2_reserve_idempotency` with operation `finance.payment.register.normal`. Replay returns existing due with linkage. Unique index on `expense_root_transaction_id` prevents duplicate settlement |

---

## 7. CREDIT CARD SETTLEMENT TRUTH

**RPC:** `finance_payment_register_credit_card_v1`  
**Frontend:** `PayCreditCardSheet` → `registerCreditCardPayment` service

| # | Question | Answer |
|---|----------|--------|
| 1 | Which Transfer is created? | Canonical Transfer (`finance_transfers`): source=selected ACCOUNT, destination=due.target_credit_card_account_id |
| 2 | Source ACCOUNT requirements | ACTIVE, type=ACCOUNT (not CREDIT_CARD), same currency as due, same financial_context_type, same owner/household, user has read access. Validated in RPC lines 414-432 |
| 3 | Destination CREDIT_CARD requirements | From due.target_credit_card_account_id. Must be ACTIVE, type=CREDIT_CARD, same currency, same context. Validated lines 434-448 |
| 4 | Same/cross currency | **Same currency enforced by 5C constraint** (target card currency = due currency). Cross-currency path exists in code (lines 455-461) but should not occur. If source.currency ≠ dest.currency, requires explicit `p_destination_amount` |
| 5 | Expected vs actual amount | `p_actual_amount` = source amount (user input). Can differ from expected. `destination_amount` = actual_amount (same currency) or explicit override |
| 6 | Must payment be full? | **No.** Any positive amount allowed. Partial payment marks due PAID but card debt reduced only by paid amount |
| 7 | Is partial payment possible? | **Yes.** User can enter any amount > 0. Due marked PAID. No "remaining balance" tracking on due |
| 8 | Is overpayment possible? | **Yes.** Can pay more than expected_amount. Card debt becomes positive (credit balance) |
| 9 | Due PAID semantics | Due status=PAID, `transfer_id` set, `actual_amount`=`source_amount`, `actual_date`, `paid_at`, `actual_account_id`=`source_account_id`. Series advanced if recurring |
| 10 | Atomicity/idempotency | Single RPC transaction: INSERT Transfer → INSERT 2 account_effects → UPDATE due. Idempotency via `finance.payment.register.credit_card`. Unique index on `transfer_id` prevents duplicate |

**Critical Note:** Creating the PaymentDue does NOT modify card debt. Only settlement (Transfer) affects the credit card's `currentBalance` via account effects.

---

## 8. EDIT TRUTH

### 8.1 One-Off Due Edit

**RPC:** `finance_payment_due_edit_v1`  
**Frontend:** `EditPaymentDueSheet` (scope=single)

| Field | Editable? | Constraints |
|-------|-----------|-------------|
| `title` | Yes | Non-empty |
| `expected_amount_known` / `expected_amount` | Yes | If known=true, amount > 0 required; if false, amount=null |
| `due_date` | Yes | Valid YYYY-MM-DD |
| `category_id` | Yes | Must be valid expense category in context; `clear_category=true` to remove |
| `target_credit_card_account_id` | **No** | Protected field (PROTECTED_DUE_UPDATE_FIELDS). Cannot change kind |
| `status` | **No** | Only PENDING dues editable (PAID/CANCELLED rejected) |

### 8.2 Recurring Occurrence Edit (scope=single)

Same as one-off. Edits **only current PENDING due**. Does not affect series defaults or future occurrences.

### 8.3 Series Edit (scope=series)

**RPC:** `finance_payment_series_edit_v1`  
**Frontend:** `EditPaymentDueSheet` (scope=series)

| Field | Editable? | Effect |
|-------|-----------|--------|
| `title` | Yes | Updates series + current PENDING due |
| `default_expected_amount_known/amount` | Yes | Updates series + current PENDING due |
| `default_category_id` | Yes | Updates series + current PENDING due |
| `recurrence_interval_unit/count` | Yes | Updates series (affects future due dates) |
| `recurrence_anchor_date` | Yes | Updates series + current PENDING due's due_date |
| `target_credit_card_account_id` | Yes (CREDIT_CARD only) | Updates series + current PENDING due. Validated as ACTIVE CREDIT_CARD same currency/context |
| `status` | **No** | Series must be ACTIVE |

**Already PAID dues:** Unaffected by series edit.  
**Cancelled occurrences:** Unaffected (already CANCELLED).  
**Target card changes:** Constrained to valid CREDIT_CARD accounts. Cannot change kind (NORMAL↔CREDIT_CARD) via edit.

---

## 9. CANCEL TRUTH

### 9.1 Cancel Single Occurrence

**RPC:** `finance_payment_due_cancel_v1`  
**Frontend:** `PaymentDetailSheet` → "Cancelar" → scope="single"

| Operation | Detail |
|-----------|--------|
| Backend | UPDATE due SET status=CANCELLED. If series-linked, call `advance_series` to materialize next |
| Historical PAID dues | **Unaffected** (only PENDING can be cancelled; PAID rejected with `finance_payment_due_paid_cannot_cancel`) |
| Deletes anything? | **No.** Row remains with status=CANCELLED |
| Alters financial transactions? | **No.** No Expense/Transfer created or modified |
| CREDIT_CARD due cancel | Does not alter card debt (no settlement occurred) |
| Can cancelled due reopen? | **No RPC exists.** Status=CANCELLED is terminal. No reopen operation implemented |
| Can cancelled series reactivate? | **No.** Series status=CANCELLED is terminal. No reactivate RPC |

### 9.2 Cancel Series (Current + Future)

**RPC:** `finance_payment_series_cancel_v1`  
**Frontend:** `PaymentDetailSheet` → "Cancelar" → scope="series" (label: "Este y los siguientes")

| Operation | Detail |
|-----------|--------|
| Backend | UPDATE series SET status=CANCELLED. UPDATE all PENDING dues in series SET status=CANCELLED |
| Historical PAID dues | **Unaffected** (only PENDING dues cancelled) |
| Deletes anything? | **No.** Rows remain with status=CANCELLED |
| Alters financial transactions? | **No.** |
| CREDIT_CARD series cancel | Does not alter card debt for any occurrence |
| Terminology note | "Este y los siguientes" = cancel series (all future). Different from Spending Limits "THIS_AND_FOLLOWING" |

---

## 10. REOPEN TRUTH

| # | Question | Answer |
|---|----------|--------|
| 1 | Which states can reopen? | **None.** No reopen RPC or frontend action exists |
| 2 | Does reopening PAID due undo Expense/Transfer? | N/A — not supported |
| 3 | Does it only reopen workflow state? | N/A |
| 4 | What safeguards exist? | Idempotency prevents duplicate settlement. PAID integrity constraint prevents invalid PAID state |
| 5 | Any risk of duplicate settlement? | **No.** Unique indexes on `expense_root_transaction_id` and `transfer_id` + idempotency keys prevent double registration |

---

## 11. ATTENTION TRUTH (Stage 5F)

**Service:** `loadPaymentAttention` in `finance.payment.attention.service.js`  
**Integration:** `planner.attention.service.js` → `listAttention` includes payment attention

| # | Question | Answer |
|---|----------|--------|
| 1 | Endpoint/service | `GET /api/planner/attention` → `plannerAttentionController.getAttention` → `attentionService.listAttention` → `loadPaymentAttention` |
| 2 | Home integration | Yes. AppTopBar shows Attention badge (count). PlannerAttentionActivityScreen shows payment items with reason |
| 3 | Finance Pagos integration | Yes. Attention item `destination.initialTab = 'pagos'`, `paymentDueId` set. Opens FinanceScreen → Pagos tab → PaymentDetailSheet |
| 4 | Ordering | Global Attention: severity rank (critical > high > medium) then recency. Payment reasons: OVERDUE (critical) > DUE_TODAY (high) > DUE_SOON (medium) |
| 5 | Recurrence interaction | Only **current PENDING due** evaluated. Series not directly surfaced. When current due paid/cancelled → next due materialized → may enter Attention window |
| 6 | Card vs Normal same? | **Yes.** Both use same `loadPaymentAttention` query (filters: status=PENDING, due_date ≤ today+3). Kind not differentiated in attention logic |

### 11.1 Attention Window Matrix

| Due Date Relative to Today | Diff Days | Reason | Severity | Surfaces in Attention? |
|----------------------------|-----------|--------|----------|------------------------|
| Past (overdue) | < 0 | `payment_overdue` | critical | **Yes** |
| Today | 0 | `payment_due_today` | high | **Yes** |
| Tomorrow | +1 | `payment_due_soon` | medium | **Yes** |
| +2 days | +2 | `payment_due_soon` | medium | **Yes** |
| +3 days | +3 | `payment_due_soon` | medium | **Yes** |
| +4 days or more | ≥ +4 | — | — | **No** |
| PAID / CANCELLED | — | — | — | **No** |

---

## 12. TODAY / FUTURE / PAST MATRIX

| Scenario | Backend Behavior | Frontend Behavior |
|----------|------------------|-------------------|
| Create due today | Allowed. due_date = today. Appears in "Necesitan atención" (DUE_TODAY) | NewPaymentSheet defaults date=today. Shows "Vence hoy" |
| Create due tomorrow | Allowed. Appears in "Próximos" (not Attention until tomorrow) | Shows "Vence mañana" |
| Create due +30 days | Allowed. Appears in "Próximos" | Shows "Vence en 30 días" |
| Create due in past | Allowed. Immediately overdue. Appears in "Necesitan atención" | DatePicker allows past dates. Shows "Venció hace X días" |
| Pay due before due date | Allowed. actual_date ≤ today. Due marked PAID. Series advances | RegisterPaymentSheet/PayCreditCardSheet default date=today. DatePicker blocks future dates (line 410) |
| Pay on due date | Allowed. actual_date = due_date. Normal settlement | Default date=today matches due_date |
| Pay after due date | Allowed. actual_date ≤ today (cannot be future). Overdue due becomes PAID | User can register payment for overdue due. DatePicker allows today/past only |

**Key Constraint:** `actual_date` cannot be future (validated in both RPCs: `if p_actual_date > current_date then raise future_finance_payment_actual_date`)

---

## 13. EXPECTED VS ACTUAL AMOUNT TRUTH

| Aspect | Normal Payment | Credit Card Payment |
|--------|----------------|---------------------|
| **Expected amount** | Set at creation (`expected_amount_known` + `expected_amount`). Can be "A confirmar" | Same. Currency inherited from target card |
| **Actual amount** | Provided at settlement (`actual_amount`). Can differ from expected. No validation against expected | Provided at settlement (`actual_amount` = source amount). Can differ from expected |
| **Amount linkage** | Expense.amount = actual_amount. Due.expected_amount unchanged | Transfer.source_amount = actual_amount. Transfer.destination_amount = actual_amount (same currency) |
| **UI Labels** | Creation: "Monto esperado" / "A confirmar". Settlement: "Monto real" | Creation: "Monto esperado". Settlement: "Monto a acreditar en la tarjeta" / "Monto que sale de la cuenta" (cross-currency) |
| **Can user leave unknown at creation?** | Yes (`expected_amount_known=false`) | Yes (same) |
| **Must actual be provided at settlement?** | Yes (validation: > 0) | Yes (validation: > 0) |

---

## 14. PARTIAL / FULL PAYMENT TRUTH

| Scenario | Normal Payment | Credit Card Payment |
|----------|----------------|---------------------|
| **Partial payment allowed?** | Yes. Any amount > 0 marks due PAID | Yes. Any amount > 0 marks due PAID |
| **Overpayment allowed?** | Yes. Expense created for actual amount | Yes. Transfer created for actual amount; card debt reduced by destination_amount |
| **Remaining balance tracked?** | **No.** Due becomes PAID regardless. No "remaining" field | **No.** Due becomes PAID. Card debt reflects actual payment via account effects |
| **Multiple partial payments?** | **No.** Due can only be settled once (unique index on expense_root_transaction_id/transfer_id). To pay remainder, user must create new due |
| **UI warning for partial?** | **No.** No comparison shown between expected vs actual in RegisterPaymentSheet | **No.** PayCreditCardSheet shows expected but no warning if actual ≠ expected |

---

## 15. PICKER ELIGIBILITY GAPS

### 15.1 Current Eligibility (financeAccountEligibility.ts)

| Operation | Allowed Account Types | Context Rules |
|-----------|----------------------|---------------|
| `expense` | ACCOUNT + CREDIT_CARD | Personal: own Personal only. Household: active Household + own Personal |
| `income` | ACCOUNT only | Personal: own Personal ACCOUNT. Household: active Household ACCOUNT |
| `transfer-source` | ACCOUNT only | Personal + active Household |
| `transfer-destination` | ACCOUNT + CREDIT_CARD | Personal + active Household |

### 15.2 Confirmed Bug: Credit Card Target Picker

**Location:** `NewPaymentSheet.tsx:119-126`  
**Code:** `useEligibleAccounts({ operation: 'transfer-destination', ... })`  
**Problem:** `transfer-destination` allows both ACCOUNT and CREDIT_CARD. But Credit Card payment **must target CREDIT_CARD only**.  
**Impact:** User sees regular ACCOUNTs in "Tarjeta a pagar" selector. Backend will reject (trigger validates account_type=CREDIT_CARD) but UX offers invalid choice.

### 15.3 Safest Correction Point

**Backend-first:** Add new operation `'credit-card-payment'` in `financeAccountEligibility.ts`:
```typescript
case 'credit-card-payment':
  return accountTypeAllowed && account.accountType === FINANCE_ACCOUNT_TYPES.CREDIT_CARD
```

**Frontend:** Change NewPaymentSheet line 122 to `operation: 'credit-card-payment'`

---

## 16. UX WORDING → ACTUAL SEMANTICS MAP

| UI Wording | Component | Actual Semantic Action | Confusion Risk |
|------------|-----------|------------------------|----------------|
| **"Agregar pago"** | NewPaymentSheet title | Create PaymentDue (obligation reminder) | Sounds like "add payment record" but creates future obligation |
| **"Crear pago"** | NewPaymentSheet CTA (one-off normal) | Create PENDING Normal PaymentDue | Same as above |
| **"Crear pago de tarjeta"** | NewPaymentSheet CTA (one-off card) | Create PENDING Credit Card PaymentDue | Same |
| **"Crear pago recurrente"** | NewPaymentSheet CTA (recurrenceEnabled) | Create PaymentSeries + first due | CTA says "recurrente" even if preset="No se repite" (P1-1) |
| **"Registrar pago"** | PaymentDetailSheet action (Normal) / RegisterPaymentSheet title | Settle Normal due → create Expense | "Registrar" implies recording past event, but actual_date defaults to today (can be past) |
| **"Pagar tarjeta"** | PaymentDetailSheet action (Card) / PayCreditCardSheet title | Settle Card due → create Transfer (ACCOUNT→CARD) | Clearer: implies money movement now |
| **"Vencimiento"** | NewPaymentSheet field label / PaymentRow | `due_date` of obligation | "Vencimiento" = due date, not payment date |
| **"Monto esperado"** | Creation forms | `expected_amount` (can be unknown) | "Esperado" suggests estimate, but used as default for settlement |
| **"Monto real"** | RegisterPaymentSheet | `actual_amount` for Expense | Clear: actual amount paid |
| **"Monto a acreditar en la tarjeta"** | PayCreditCardSheet | `destination_amount` (card credit) | Clear for card payments |
| **"Monto que sale de la cuenta"** | PayCreditCardSheet (cross-currency) | `source_amount` (account debit) | Clear distinction |
| **"Pagado"** | PaymentDetailSheet badge / PaymentRow | status=PAID with settlement linkage | Clear final state |
| **"Cancelar"** | PaymentDetailSheet action | Cancel PENDING due (or series) → status=CANCELLED | "Cancelar" vs "Archivar" (accounts/pools) — different verbs for similar lifecycle |
| **"Editar"** | PaymentDetailSheet action | Modify PENDING due fields (not kind, not status) | Only for PENDING; PAID/CANCELLED not editable |

**Core Confusion:** The same "Pago" concept spans **two distinct moments**: (1) scheduling an obligation ("Agregar/Crear pago"), and (2) recording settlement ("Registrar pago"/"Pagar tarjeta"). UI uses similar verbs for both.

---

## 17. DUPLICATED / CONFLICTING FRONTEND STATE

| State | Locations | Conflict |
|-------|-----------|----------|
| `recurrenceEnabled` + `recurrencePresetIndex` | NewPaymentSheet, EditPaymentDueSheet | Independent: can have `enabled=true` + `preset="No se repite"` → CTA lies |
| `recurrencePresetIndex=0` ("No se repite") | NewPaymentSheet, EditPaymentDueSheet | Semantically = no recurrence, but `recurrenceEnabled` may be true |
| `customRecurrenceUnit/Count` | NewPaymentSheet, EditPaymentDueSheet | Only active when preset=last (index 8). No validation that count≥1 when custom |
| `recurrenceAnchorDate` vs first `dueDate` | NewPaymentSheet | Independent. Anchor date drives future occurrences; first due date can differ |
| `selectedCategoryId` + `categories` loading | NewPaymentSheet, RegisterPaymentSheet, EditPaymentDueSheet | Each sheet loads categories independently. No shared cache |
| `PaymentDueDto.category` vs `actualCategory` | PaymentDetailSheet (paid view) | Shows both expected category (from due) and actual category (from settlement) — correct but potentially confusing |
| `eligibleTargetCards` (NewPaymentSheet) | Uses `transfer-destination` operation | Allows ACCOUNT types — should be CREDIT_CARD only (P0-2) |

---

## 18. PRODUCT DECISIONS REQUIRED

| # | Decision | Context |
|---|----------|---------|
| 1 | **Reopen capability:** Should PAID/CANCELLED dues be reopenable? If yes, must undo Expense/Transfer or just reopen workflow? | Currently not supported. Risk of duplicate settlement if not careful |
| 2 | **Partial payment UX:** Should UI warn when actual ≠ expected? Track remaining balance on due? | Currently silent. Due becomes PAID regardless of amount |
| 3 | **Recurrence per-occurrence override:** Allow one occurrence to differ from series defaults? | Not supported. Series edit only affects future; current due editable singly |
| 4 | **Terminology unification:** "Pago pendiente" vs "Pago" vs "Vencimiento" vs "Obligación" | Stage 8A found inconsistent vocabulary (P3-4) |
| 5 | **Credit Card target picker fix:** Add `credit-card-payment` operation or filter in frontend? | Backend-first fix recommended (operation in eligibility service) |
| 6 | **Attention window:** Keep ±3 days or adjust? | Current: overdue, today, +1, +2, +3 |
| 7 | **Recurrence CTA logic:** Fix "Crear pago recurrente" when preset="No se repite" | P1-1: CTA should check actual recurrence config, not just toggle |
| 8 | **Cancel scope labels:** "Solo este pago" / "Este y los siguientes" vs backend operations | Different from Spending Limits (THIS_PERIOD/THIS_AND_FOLLOWING) |

---

## 19. OWNERS / FILES / RPCS

### 19.1 Backend (Supabase / Node)

| Component | File | Key Functions |
|-----------|------|---------------|
| **Tables** | `supabase/migrations/20260825000000_finance_payment_foundation_v1_1.sql` | `finance_payment_series`, `finance_payment_dues` |
| **Settlement Columns** | `supabase/migrations/20260826000000_finance_payment_register_v1_1.sql` | `expense_root_transaction_id`, `transfer_id`, `actual_amount`, `actual_date`, `paid_at`, `actual_category_id`, `actual_account_id` |
| **Validation Trigger** | Same as foundation | `finance_payment_validate_row_v1` |
| **Next Due Date** | Same | `finance_payment_next_due_date` |
| **Create One-Off** | Same | `finance_payment_due_create_oneoff_v1` |
| **Create Series** | Same | `finance_payment_series_create_v1` |
| **Cancel Due** | Same | `finance_payment_due_cancel_v1` |
| **Cancel Series** | Same | `finance_payment_series_cancel_v1` |
| **Edit Due** | Same | `finance_payment_due_edit_v1` |
| **Edit Series** | Same | `finance_payment_series_edit_v1` |
| **Register Normal** | Same (register migration) | `finance_payment_register_normal_v1` |
| **Register Credit Card** | Same | `finance_payment_register_credit_card_v1` |
| **Advance Series** | Same (foundation) | `finance_payment_advance_series_v1` |
| **Service Layer** | `backend/src/services/finance.payment.service.js` | All RPC wrappers, validation, DTO mapping |
| **Controller** | `backend/src/controllers/finance.payment.controller.js` | HTTP handlers for all endpoints |
| **Routes** | `backend/src/routes/finance.js` | `/payments/dues`, `/payments/series`, `/payments/dues/:dueId/register` |
| **Attention Service** | `backend/src/services/finance.payment.attention.service.js` | `loadPaymentAttention` |
| **Attention Integration** | `backend/src/services/planner.attention.service.js` | `listAttention` includes payment attention |

### 19.2 Frontend (React Native)

| Component | File | Purpose |
|-----------|------|---------|
| **Service Types/Client** | `front/mi-front-limpio/services/finance/financePayments.ts` | DTOs, API clients, formatting helpers |
| **Eligibility Hook** | `front/mi-front-limpio/services/finance/financeAccountEligibility.ts` | `useEligibleAccounts`, `filterEligibleAccounts` |
| **New Payment** | `front/mi-front-limpio/components/finance/NewPaymentSheet.tsx` | Create one-off / series (Normal + Credit Card) |
| **Payment Detail** | `front/mi-front-limpio/components/finance/PaymentDetailSheet.tsx` | View due, register/edit/cancel actions |
| **Register Normal** | `front/mi-front-limpio/components/finance/RegisterPaymentSheet.tsx` | Settle Normal due → Expense |
| **Pay Credit Card** | `front/mi-front-limpio/components/finance/PayCreditCardSheet.tsx` | Settle Card due → Transfer |
| **Edit Due/Series** | `front/mi-front-limpio/components/finance/EditPaymentDueSheet.tsx` | Edit single due or series (scope selector) |
| **Payments List** | `front/mi-front-limpio/components/finance/PaymentsList.tsx` | Pagos tab: grouped list (overdue/upcoming/paid) |
| **Payment Row** | `front/mi-front-limpio/components/finance/PaymentRow.tsx` | Row display with badges |
| **Finance Screen** | `front/mi-front-limpio/screens/finance/FinanceScreen.tsx` | Main shell, tab navigation, sheet orchestration |
| **Money Input** | `front/mi-front-limpio/components/finance/MoneyInput.tsx` | Amount entry with currency |
| **Account Selector** | `front/mi-front-limpio/components/finance/AccountSelector.tsx` | Account picking with eligibility |

---

## 20. NO-IMPLEMENTATION CONFIRMATION

- ✅ No source code modified
- ✅ No tests modified
- ✅ No migrations created
- ✅ No database reset/mutation
- ✅ No remote Supabase used
- ✅ No commits made
- ✅ No pushes made
- ✅ Read-only analysis only

---

## 21. VERDICT

**R2 PAYMENTS TRUTH COMPLETE — READY FOR PRODUCT FREEZE**

All domains traced from database constraints through RPCs, services, controllers, routes, frontend services, and UI components. No implementation gaps found that block product decisions. The identified UX confusion sources and picker bug are documented for resolution in subsequent stages.

---
*Report generated: 2026-09-03*  
*Branch: finance-v1-unified*  
*Mode: READ ONLY — DEEP FACTUAL RECON*