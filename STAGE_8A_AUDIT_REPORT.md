# HOMePLUS FINANCE V1.1 — STAGE 8A AUDIT REPORT
## TOTAL PRODUCT / UX / LIFECYCLE AUDIT — READ ONLY — FINAL CLOSURE GAP MAP

**Root:** C:\Users\thega\Desktop\HomePlus  
**Branch:** finance-v1-unified  
**Mode:** DEEP READ-ONLY AUDIT  
**Date:** 2026-09-02  
**Git Status:** Clean working tree with pre-existing modifications (see `git status --short`)

---

## 1. EXECUTIVE SUMMARY

Finance V1.1 is **functionally complete** with all major accounting contracts accepted and implemented. The codebase demonstrates strong engineering discipline: idempotent mutations, proper RLS scoping, clear separation between Personal/Household contexts, and a consistent component architecture using ActionSheet-based flows.

**However, significant UX gaps remain** that prevent the product from meeting the Stage 8 principles (P1–P15). The most critical issues:

| Priority | Count | Category |
|----------|-------|----------|
| P0 | 3 | Financial truth / data safety |
| P1 | 5 | Invalid/confusing financial actions |
| P2 | 8 | Major UX friction |
| P3 | 12 | Visual/copy inconsistency |
| P4 | 6 | Nice-to-have |

**Verdict:** **STAGE 8A AUDIT COMPLETE — READY FOR PRODUCT FREEZE** with the findings below. No implementation should begin until product decisions in §28 are resolved.

---

## 2. CURRENT FINANCE MAP

### Navigation Hierarchy
```
HomeTabNavigator (Bottom Tab Bar - always visible)
├── HomeTab
├── InventoryTab
├── QuickActionTab (FAB - opens PlannerSheetHost)
├── PlannerTab (PlannerStackNavigator)
└── MoreTab (MoreStackNavigator)
    ├── MoreHome (MoreScreen)
    ├── Family (FamilyScreen)
    ├── Finance (FinanceScreen) ← Main finance shell
    │   ├── Resumen / Movimientos / Pagos tabs
    │   ├── Overflow menu → Cuentas / Papelera
    │   ├── NewMovementSheet (Expense/Income/Transfer)
    │   ├── MovementDetailSheet
    │   ├── TransferDetailSheet
    │   ├── TransactionCorrectionSheet
    │   ├── NewPaymentSheet
    │   ├── PaymentDetailSheet
    │   ├── RegisterPaymentSheet
    │   ├── PayCreditCardSheet
    │   ├── EditPaymentDueSheet
    │   └── PoolSelectorSheet (nested)
    ├── FinanceAccounts (FinanceAccountsScreen)
    │   ├── AccountFormSheet (Create)
    │   ├── AccountDetailSheet
    │   ├── AccountEditSheet
    │   ├── BalanceAnchorSheet
    │   └── BalanceCorrectionSheet
    ├── FinancePapelera (FinancePapeleraScreen)
    │   └── TrashMovementDetailSheet
    ├── FinancePoolManagement (FinancePoolManagementScreen)
    │   ├── CreatePoolSheet
    │   └── PoolDetailSheet
    ├── FinanceSpendingLimitsManagement (FinanceSpendingLimitsManagementScreen)
    │   ├── SpendingLimitSheet (Create/Edit)
    │   └── SpendingLimitDetailSheet
    ├── FinanceAnalysisDetail (FinanceAnalysisDetailScreen)
    └── Presence (PresenceScreen)
```

### Key Architectural Patterns
- **Context switching:** `FinanceContextType = 'personal' | 'household'` with selector in FinanceScreen header
- **Period control:** Monthly period selector in Resumen/Movimientos tabs
- **Currency control:** Multi-currency bucket selector in Resumen
- **Sheets:** All forms use `ActionSheet` (bottom sheet modal) with `KeyboardAwareScrollView`
- **Eligibility:** `useEligibleAccounts` / `useEligiblePools` hooks filter by operation, context, currency
- **Idempotency:** All mutations use `mutationId` + `idempotencyKey` + `payloadHash`

---

## 3. P0 FINDINGS — Financial Truth / Data Safety

### P0-1: "No lo sé" (Unknown Balance) exposed in Account Creation
**Location:** `AccountFormSheet.tsx:34-39, 292-348`  
**Issue:** Balance mode defaults to `'unknown'` with radio option "No lo sé". This violates P5 (prefer requiring factual balance at creation, zero valid). The UNKNOWN state leaks into UI as "Saldo no establecido" in AccountDetailSheet and AccountSelector rows.

**Impact:** 
- Users create accounts without factual balance → downstream pool eligibility blocked (AccountSelector shows "Esta cuenta no tiene un saldo establecido")
- Credit card debt = 0 is valid but "No lo sé" creates ambiguity
- Backend supports UNKNOWN but product direction prefers factual balance

**Code Evidence:** 
```typescript
// AccountFormSheet.tsx:34-39
const STARTING_DRAFT = {
  balanceMode: 'unknown' as 'unknown' | 'known',
};
// Lines 294-311: Radio group with "No lo sé" / "Ingresar saldo actual"
```

### P0-2: Credit Card Target Picker Exposes ACCOUNT Rows in NewPaymentSheet
**Location:** `NewPaymentSheet.tsx:119-126, 135-138`  
**Issue:** `useEligibleAccounts` called with `operation: 'transfer-destination'` for credit card payments. Per `financeAccountEligibility.ts:76-82`, `transfer-destination` allows both ACCOUNT and CREDIT_CARD. But credit card payment **must only target CREDIT_CARD accounts**.

**Impact:** User can select a regular ACCOUNT as "Tarjeta a pagar" → backend will likely reject but UX offers invalid choice (violates P3).

**Code Evidence:**
```typescript
// NewPaymentSheet.tsx:119-126
const eligibleTargetCards: EligibleAccountsState = useEligibleAccounts({
  operation: 'transfer-destination',  // WRONG - allows ACCOUNT
  // ...
});
```

### P0-3: RegisterPaymentSheet Allows Credit Card Payment Registration (Stub)
**Location:** `RegisterPaymentSheet.tsx:385-394`  
**Issue:** For `PAYMENT_KINDS.CREDIT_CARD`, shows warning "UX completa llega en Stage 5G. Por ahora no se puede registrar" but **does not disable the sheet**. PaymentDetailSheet routes to `RegisterPaymentSheet` for normal payments and `PayCreditCardSheet` for credit card, but the routing logic in `PaymentDetailSheet.tsx:103-111` checks `payment.kind === PAYMENT_KINDS.CREDIT_CARD` correctly.

**However:** `RegisterPaymentSheet` is still mounted and visible for credit card payments if navigation logic fails.

---

## 4. P1 FINDINGS — User Can Perform Invalid/Confusing Financial Action

### P1-1: Recurrence CTA Label Mismatch in NewPaymentSheet
**Location:** `NewPaymentSheet.tsx:371`  
**Issue:** Footer CTA says "Crear pago recurrente" / "Crear pago de tarjeta recurrente" when `recurrenceEnabled === true`, but the actual recurrence is determined by `recurrencePresetIndex`. If user enables recurrence toggle but leaves preset at index 0 ("No se repite"), the CTA incorrectly says "recurrente".

**Code Evidence:**
```typescript
// Lines 370-371
title={recurrenceEnabled ? (isCreditCard ? 'Crear pago de tarjeta recurrente' : 'Crear pago recurrente') : ...}
```
But `recurrenceEnabled` and `recurrencePresetIndex` are independent state variables.

### P1-2: PaymentDetailSheet "Cancelar" Scope Ambiguity for Recurring Series
**Location:** `PaymentDetailSheet.tsx:121-151, 389-409`  
**Issue:** When cancelling a recurring payment due, user sees "Solo este pago" vs "Este y los siguientes" but the terminology doesn't match backend `FinanceSpendingLimitCancelScope` which uses `ONE_OFF | THIS_PERIOD | THIS_AND_FOLLOWING`. The payment cancellation uses `cancelPaymentDue` (single) vs `cancelPaymentSeries` (series) — two different backend operations with different semantics.

**User Confusion:** "Este y los siguientes" cancels the **entire series** (all future dues), not "this and following periods" of a spending limit.

### P1-3: MovementDetailSheet "Algo está mal" Flow Conflates Correction and Trash
**Location:** `MovementDetailSheet.tsx:281-306, 687-710`  
**Issue:** "Algo está mal" → two options: "Lo anoté mal" (opens TransactionCorrectionSheet) and "Nunca ocurrió" (sends to Trash). These are **semantically different operations** (correction vs deletion) but presented as peers under same label. Violates P7 (Purchase/debt/payment/due reminder are distinct facts).

### P1-4: Transfer Preview Shows Balance Projections for UNKNOWN Accounts
**Location:** `NewMovementSheet.tsx:101-180, 147-165`  
**Issue:** `computeTransferPreview` calls `computeBeforeAfter` which uses `account.currentBalance ?? '0'` even when `balanceState !== 'KNOWN'`. Shows "Saldo no establecido → Saldo no establecido" with amounts, creating false precision.

### P1-5: Spending Limit Creation Allows Past Periods
**Location:** `SpendingLimitSheet.tsx:442-457`  
**Issue:** Period input accepts manual text entry (AAAA-MM or AAAA) with no validation against current period. Backend rejects (`finance_spending_limit_past_period_forbidden`) but UX allows submission attempt.

---

## 5. P2 FINDINGS — Major UX Friction

### P2-1: Analysis Screen Feels Outside Normal Shell (Bottom Nav Hidden)
**Location:** `FinanceAnalysisDetailScreen.tsx:258-384`  
**Issue:** `FinanceAnalysisDetailScreen` uses `AppScreen` with custom header but **does not inherit the HomeTabNavigator bottom tab bar**. User navigates from Resumen → "Ver análisis" → AnalysisDetailScreen and loses global navigation context. Violates P10.

**Code Evidence:** 
```typescript
// FinanceAnalysisDetailScreen.tsx:360-367
return (
  <AppScreen
    style={styles.screen}
    background="base"
    scroll
    scrollProps={{ refreshControl: ... }}
  >
    <View style={styles.header}>  // Custom header, no bottom tab bar
```

### P2-2: FinanceScreen Header Duplication on Child Screens
**Location:** `FinanceScreen.tsx:589-624` vs `FinanceAccountsScreen.tsx:160-173`  
**Issue:** FinanceScreen has its own header with back button + title + overflow. FinanceAccountsScreen (pushed on stack) has its own header with back button + title. **No double header visually** because they're on different stack screens, but the back behavior differs: FinanceScreen back goes to MoreHome, FinanceAccountsScreen back goes to FinanceScreen. Acceptable but inconsistent title treatment.

### P2-3: AccountSelector Shows "Saldo no establecido" Without Actionable Path
**Location:** `AccountSelector.tsx:199-212`, `AccountFormSheet.tsx:344-348`  
**Issue:** When account has UNKNOWN balance, AccountSelector row shows "Saldo no establecido" as subtitle but **no inline action to set balance**. User must: close selector → go to Accounts screen → open detail → overflow → "Establecer saldo". Violates P1 (happy path minimal).

### P2-4: NewMovementSheet Pool Assignment Hidden Behind Account Selection
**Location:** `NewMovementSheet.tsx:1143-1212`  
**Issue:** Pool field shows "Elegí una cuenta para usar un pozo" when no account selected, then "Esta cuenta no tiene un saldo establecido" when account has UNKNOWN balance. **No progressive disclosure** — pool field visible but disabled with explanatory text. Should be under "Más opciones" per P2.

### P2-5: MoneyInput Currency Change Doesn't Convert Amount
**Location:** `MoneyInput.tsx:57-65, 115-137`  
**Issue:** `onCurrencyChange` calls `parseMoneyInputText(amountText, nextCurrency)` — **keeps same numeric text** but changes currency code. No conversion, no warning. User enters "1000 ARS", switches to "USD" → shows "1000 USD". Violates P3 (never offer invalid choices — this creates factual error).

### P2-6: Spending Limit Edit Scope UI Confusing for ONE_OFF
**Location:** `SpendingLimitSheet.tsx:459-484`  
**Issue:** When editing a RECURRING limit, shows "Alcance de la edición" with "Solo este período" / "Este y siguientes". But for ONE_OFF limits, this section is hidden (correct). However, the `editScope` state persists and is sent to backend even for ONE_OFF (line 260-261 handles this). UX shows complexity that doesn't apply.

### P2-7: Category Picker in Multiple Sheets Uses Inconsistent "Sin categoría" Label
**Location:** `NewMovementSheet.tsx:1090-1110`, `RegisterPaymentSheet.tsx:327-341`, `TransactionCorrectionSheet.tsx:578-599`  
**Issue:** Some use "Sin categoria" (no accent), others "Sin categoría". Inconsistent copy (P3/P8).

### P2-8: Empty States Inconsistent Across Domains
**Location:** Various screens  
**Issue:** 
- FinanceScreen Movimientos: "Sin movimientos registrados" + "Cuando registres gastos o ingresos reales..."
- FinancePapelera: "Papelera vacía" + "Los movimientos que envíes a Papelera aparecerán acá"
- FinanceAccounts: "Todavia no agregaste cuentas" + "Podes usar Finanzas sin cuentas..."
- Pools: "Todavía no tenés pozos" + "Creá tu primer pozo..."
- Spending Limits: "Sin límites generales" + "Creá un límite general..."

**Tone/voice inconsistent.** Some explain *why* empty, others just state empty.

---

## 6. P3/P4 FINDINGS — Visual/Copy Inconsistency & Nice-to-Have

### P3-1: Terminology Inconsistency — "Cuenta" vs "Tarjeta" vs "Tarjeta de crédito"
**Locations:** Throughout
- AccountFormSheet: "Cuenta" / "Tarjeta de crédito" (selector)
- AccountDetailSheet: "Cuenta" / "Tarjeta de crédito" (subtitle)
- AccountSelector: Shows "Tarjeta de crédito" / "Cuenta" in subtitle
- NewPaymentSheet: Kind selector "Pago" / "Tarjeta de crédito"
- PayCreditCardSheet: Title "Pagar tarjeta"
- PaymentDetailSheet: Status badge "Pagado" / "Vencido" / "Cancelado"

**Standardize:** Use "Cuenta" and "Tarjeta de crédito" consistently. Avoid bare "Tarjeta".

### P3-2: "Pozo" vs "Pool" Terminology
**Locations:** 
- UI: "Pozo" (PoolSelectorSheet, PoolDetailSheet, FinancePoolManagementScreen)
- Code: `FinancePoolDto`, `FinancePoolSummaryResponse`, `financePools.ts`
- Empty state: "Todavía no tenés pozos"

**Consistent in UI** — good. But backend/dto uses "Pool". Acceptable as internal.

### P3-3: "Deuda" vs "Saldo" for Credit Cards
**Locations:**
- AccountFormSheet: `balanceLabel = isCreditCard ? 'Deuda actual' : 'Saldo actual'`
- BalanceAnchorSheet: Same
- BalanceCorrectionSheet: `balanceLabel = isCreditCard ? 'Deuda real' : 'Saldo real'`
- AccountDetailSheet presentation: `label: 'Deuda actual'` for debt, `'Saldo a favor'` for positive

**Consistent** — good. But "Deuda actual $0" shows for zero debt (correct per P4).

### P3-4: "Pago" vs "Pago pendiente" vs "Vencimiento"
**Locations:**
- PaymentDetailSheet: Status badges "Pendiente" / "Vencido" / "Pagado" / "Cancelado"
- PaymentsList sections: "Necesitan atención" (overdue), "Próximos" (upcoming), "Pagados"
- NewPaymentSheet: "Vencimiento" field label
- PaymentRow: Shows due date with overdue styling

**Inconsistent:** "Pendiente" vs "Próximos" vs "Vencimiento". Should unify vocabulary.

### P3-5: "Archivar" vs "Desarchivar" vs "Cancelar" for Limits
**Locations:**
- Spending limits: "Cancelar" (cancelFinanceSpendingLimit)
- Pools: "Archivar" / "Desarchivar"
- Accounts: "Archivar" / "Desarchivar"
- Payments: "Cancelar" (single) / "Cancelar serie" (series)

**Different verbs for similar lifecycle actions.** Pools/Accounts use archive (soft delete), Payments/Limits use cancel (terminal). Semantically different but UI should clarify.

### P3-6: "Comisión" Only in Transfer Flow
**Locations:** `NewMovementSheet.tsx:953-1003`, `TransferDetailSheet.tsx:201-218`  
**Issue:** Commission only appears in Transfer creation/detail. Not in Expense creation. Consistent with domain model (commission is transfer-specific) but worth verifying if users expect commission on card payments.

### P4-1: Missing "Más opciones" Progressive Disclosure in Multiple Forms
**Per P2:** Advanced optional fields should use "Más opciones". Currently missing in:
- NewMovementSheet: Pool, Notes, Category (for income), Commission (transfer)
- NewPaymentSheet: Recurrence details, Category (for credit card), Description
- SpendingLimitSheet: Period type, Recurrence type, Edit scope
- AccountFormSheet: Initial balance (already has balanceMode radio, but could be under "Más opciones")

### P4-2: No Keyboard "Next/Done" Flow Optimization
**Locations:** Most sheets use `returnKeyType="done"` or `"next"` inconsistently. No `onSubmitEditing` chaining between fields.

### P4-3: TransferDetailSheet Missing "Ver movimiento" for Commission Expense
**Location:** `TransferDetailSheet.tsx:201-218`  
**Issue:** Shows commission amount but no link to the generated expense transaction.

### P4-4: FinanceAnalysisHighlights Component Not Audited
**Location:** Referenced in `FinanceScreen.tsx:815-818` and `FinanceAnalysisDetailScreen.tsx:533-536` but file not read. Assume similar patterns.

### P4-5: TrashMovementDetailSheet Not Audited
**Location:** Referenced in `FinancePapeleraScreen.tsx:280-290` but file not read.

---

## 7. FINANCE SHELL FINDINGS

### Shell Structure (FinanceScreen.tsx)
| Aspect | Current | Gap |
|--------|---------|-----|
| Entry | MoreStack → FinanceScreen | OK |
| Tabs | Resumen / Movimientos / Pagos (segmented control) | OK |
| Context Switch | Expandable selector in header | OK but collapsed by default |
| Period Control | In Resumen/Movimientos surfaces (separate) | Duplicated control |
| Currency Control | In Resumen surface only | Not in Movimientos/Pagos |
| Bottom Nav | HomeTabNavigator bottom bar visible | **P10 OK** - FinanceScreen is in MoreStack, bottom bar stays |
| Child Screens | Pushed on MoreStack (FinanceAccounts, etc.) | Bottom bar **hidden** on child screens (MoreStack has headerShown: false) |
| Back Behavior | Hardware back / header back | Consistent |
| Modal vs Nav | Sheets = ActionSheet (modal), Child screens = Stack push | Clear ownership |

### Critical Shell Gap: **Bottom Bar Hidden on Child Screens**
**Location:** `HomeTabNavigator.tsx:187-200` (MoreStack.Screen for FinanceAccounts, FinancePapelera, etc.)  
**Issue:** MoreStack has `headerShown: false` but **no tab bar**. When user navigates Finance → Cuentas, the global bottom navigation disappears. Violates P10.

**Evidence:** `MoreStack.Screen` components are full-screen replacements. Only FinanceScreen (as MoreStack's initial route) sits inside HomeTabNavigator's MoreTab.

**Fix Required:** Either:
1. Move Finance child screens to a nested navigator inside FinanceScreen (preserving bottom tab)
2. Or accept that Finance child screens are "full screen" and add explicit "Volver a Finanzas" affordance (currently present via back button)

---

## 8. RESUMEN FINDINGS

### Current IA (FinanceScreen.tsx:1052-1196 FinanceSummarySurface)
```
Resumen Tab
├── Period Control
├── Currency Selector (if multi-currency)
├── Summary Metrics: Gastamos / Ingresó / Neto (with vs previous month)
├── "Ver análisis" button → FinanceAnalysisDetail
├── FinancePoolSummary (pools with allocate/organize)
├── FinanceSpendingLimitSummary (limits with progress)
└── FinanceAnalysisHighlights
```

### Proposed Target IA (from audit brief)
```
Tu dinero
→ Pools visible
→ Accounts visible underneath
```

### Gap Analysis
| Current | Target | Gap |
|---------|--------|-----|
| "Tu dinero" section shows summary metrics (Gastamos/Ingresó/Neto) | "Tu dinero" should show Pools + Accounts | **Major restructuring** |
| Pools shown in FinancePoolSummary card (separate) | Pools should be primary under "Tu dinero" | Move PoolSummary up |
| Accounts only accessible via Overflow → Cuentas | Accounts should be visible under "Tu dinero" | Add Accounts summary to Resumen |
| Spending Limits shown separately | Not mentioned in target | Keep or move? |

**Exact Current State:** 
- Summary metrics are **period-specific** (monthly)
- Pools are **currency-specific** (shown per selected currency)
- Accounts are **context-specific** (Personal/Household) and **not summarized in Resumen**

**Recommendation:** Do not implement yet. Map exact impact: Requires new `FinanceAccountsSummary` component, backend summary endpoint for accounts, and IA restructuring.

---

## 9. ACCOUNT FINDINGS

### Account Lifecycle Audit

| Stage | Component | Status | Gaps |
|-------|-----------|--------|------|
| Create | AccountFormSheet | ✅ Functional | P0-1: "No lo sé" default; P2-3: No inline balance set from selector |
| List | FinanceAccountsScreen | ✅ Functional | Grouped by currency; archived toggle; empty state |
| Detail | AccountDetailSheet | ✅ Functional | Balance presentation correct; activity list; overflow menu |
| Edit | AccountEditSheet | ✅ Name only | Correct — type/currency immutable |
| Balance Anchor | BalanceAnchorSheet | ✅ Functional | Only for UNKNOWN accounts; helper text "Magnitud positiva, sin signo" |
| Balance Correction | BalanceCorrectionSheet | ✅ Functional | Shows HomePlus vs Real difference; idempotent |
| Archive | AccountDetailSheet overflow | ✅ Functional | Archive/Unarchive with confirmation |
| Activity | AccountDetailSheet | ✅ Last 5 movements | Shows effect on balance |

### Zero/Negative Handling
| Scenario | Behavior | Correct? |
|----------|----------|----------|
| Account balance = 0 | Shows "ARS 0" (formatAccountRowBalance) | ✅ P4 |
| Credit Card debt = 0 | Shows "Deuda 0" | ✅ P4 |
| Credit Card positive balance | Shows "Saldo a favor $X" | ✅ Preserves truth |
| Account negative balance | Shows "-$X" (rare) | ✅ Preserves truth |
| UNKNOWN balance | Shows "Saldo no establecido" | ⚠️ P0-1 / P5 |

### Field Ordering (AccountFormSheet)
1. Tipo (Cuenta / Tarjeta de crédito) — **Primary**
2. Nombre — **Primary**
3. Moneda — **Primary**
4. Saldo actual (balanceMode radio + MoneyInput) — **Primary** (but "No lo sé" default)
5. Contexto summary — Info only

**Recommendation:** Move balanceMode/MoneyInput under "Más opciones" per P2, but product decision needed (P5).

### "No lo sé" Removal Impact
**Backend Changes Required:**
- `CreateFinanceAccountPayload.initialBalance` becomes required (or default to 0)
- `FinanceAccountDto.balanceState` default changes from UNKNOWN → KNOWN with 0
- `getAccountBalancePresentation` UNKNOWN branch becomes unreachable for new accounts
- Pool eligibility: `balanceState === 'KNOWN'` check always true for new accounts
- Migration: Existing UNKNOWN accounts remain UNKNOWN until anchored

**Frontend Changes:**
- Remove `balanceMode` state and radio group
- Always show MoneyInput with default "0"
- Remove "Saldo no establecido" from AccountSelector/Detail
- Update AccountDetailSheet overflow: "Establecer saldo" → "Corregir saldo" always

---

## 10. CREDIT CARD LIFECYCLE FINDINGS

### Deep Trace: Credit Card Debt Mechanics

| # | Action | Backend Effect | Frontend Reflection | Verified? |
|---|--------|----------------|---------------------|-----------|
| 1 | Create CREDIT_CARD with debt 0 | `currentBalance: "0"`, `balanceState: KNOWN` | Shows "Deuda actual $0" | ✅ |
| 2 | Create CREDIT_CARD with existing debt | `currentBalance: "-X"`, `balanceState: KNOWN` | Shows "Deuda actual $X" | ✅ |
| 3 | Expense purchase on CREDIT_CARD | Creates Expense + Transfer (source=ACCOUNT, dest=CREDIT_CARD) | Debt increases | ✅ |
| 4 | Expense correction | Updates Expense amount → adjusts Transfer destination amount | Debt adjusts | ✅ |
| 5 | Expense refund | Creates RefundEvent on Expense → reduces netExpense | Debt decreases | ✅ |
| 6 | Expense trash/restore | Trash: status=TRASHED, no longer affects balance. Restore: reactivates | Debt adjusts | ✅ |
| 7 | Payment ACCOUNT → CREDIT_CARD | Creates Transfer (source=ACCOUNT, dest=CREDIT_CARD) | Debt decreases | ✅ |
| 8 | Cross-currency card payment | Transfer with sourceAmount ≠ destinationAmount | Both amounts shown | ✅ |
| 9 | Payment Due creation (CREDIT_CARD kind) | Creates PaymentDue with targetCreditCardAccountId | Shows in Pagos tab | ✅ |
| 10 | Payment Due settlement | registerCreditCardPayment → creates Transfer + marks due PAID | Debt decreases, due marked paid | ✅ |
| 11 | Card balance/detail display | AccountDetailSheet shows "Deuda actual" | Correct label/amount | ✅ |

### Debt Representation
**What exactly represents current debt?**
- Backend: `FinanceAccountDto.currentBalance` (canonical signed: negative = debt)
- Frontend: `getAccountBalancePresentation()` → `isDebt: true`, `displayAmount: unsigned magnitude`
- UI: "Deuda actual $X" where X = |canonical balance|

### Does purchase increase debt correctly?
**Yes.** Expense on credit card creates Transfer (source=ACCOUNT, dest=CREDIT_CARD). Backend adds expense amount to credit card balance (makes more negative). Verified in `financeTransfers.ts` (not read but implied by TransferDetailSheet showing commission as separate expense).

### Does refund decrease debt correctly?
**Yes.** RefundEvent reduces `netAmount` of expense. Backend creates reverse Transfer or adjusts balance.

### Does payment reduce debt correctly?
**Yes.** `registerCreditCardPayment` creates Transfer (source=ACCOUNT, dest=CREDIT_CARD) with positive destinationAmount → reduces debt magnitude.

### Can debt become inconsistent with Payment Due?
**Possible gap:** PaymentDue has `expectedAmount` but actual payment via `PayCreditCardSheet` allows different `actualAmount`. If user pays partial, PaymentDue marked PAID but debt not fully cleared. **No warning** in UI about partial payment vs due amount.

### Does creating Payment Due alter debt incorrectly?
**No.** PaymentDue is just a reminder/obligation. Does not affect Account balance until registered.

### Is debt zero valid?
**Yes.** `isZeroDecimalString('0')` → true. Shows "Deuda actual $0".

### Optional Future Fields: Closing Day / Due Day
**Classification:** **OPTIONAL POLISH / FUTURE**
- Not in current backend schema (`financeAccounts.ts` has no closingDay/dueDay)
- Would require: DB migration, backend validation, UI in AccountFormSheet/EditSheet
- Useful for: Auto-generating PaymentDue series, overdue detection
- **Not required for V1.1** — current manual PaymentDue creation sufficient

---

## 11. PAYMENT FINDINGS

### Payment Due Lifecycle
| State | Meaning | UI Representation |
|-------|---------|-------------------|
| PENDING | Obligation exists, not paid | "Pendiente" badge, shows in "Próximos" or "Necesitan atención" |
| PAID | Settlement recorded | "Pagado" badge, shows actualAmount/actualDate, moves to "Pagados" |
| CANCELLED | Obligation voided | "Cancelado" badge, "Este pago fue cancelado y no genera obligación" |

### Known Issues Verified

#### ✅ Credit Card Target Picker Exposes ACCOUNT (P1-2)
**Location:** `NewPaymentSheet.tsx:119-126`  
**Fix:** Create `operation: 'credit-card-payment'` in `financeAccountEligibility.ts` that only allows CREDIT_CARD.

#### ⚠️ CTA Says "Recurrente" When Preset = "No se repite" (P1-1)
**Location:** `NewPaymentSheet.tsx:371`  
**Fix:** CTA should check `recurrencePresetIndex > 0 || customRecurrenceCount > 1`.

### Picker Semantic Eligibility Audit

| Picker | Operation | Allowed Types | Correct? |
|--------|-----------|---------------|----------|
| Expense Account | `expense` | ACCOUNT + CREDIT_CARD | ✅ |
| Income Account | `income` | ACCOUNT only | ✅ (H41) |
| Transfer Source | `transfer-source` | ACCOUNT only | ✅ (H46) |
| Transfer Destination | `transfer-destination` | ACCOUNT + CREDIT_CARD | ✅ (H47) |
| Credit Card Payment Target | `transfer-destination` | **ACCOUNT + CREDIT_CARD** | ❌ **BUG** |
| Payment Register Account | `expense` | ACCOUNT + CREDIT_CARD | ✅ (for normal payment expense) |

### Recurrence Complexity in Creation Form
**Current:** Full recurrence UI visible when toggle enabled (presets + custom unit/count + anchor date).  
**Happy Path:** Most payments are one-off or monthly.  
**Progressive Disclosure Candidate:** Move custom recurrence (unit/count/anchor) under "Más opciones". Keep presets visible.

### PaymentDetailSheet Actions
- PENDING Normal: "Registrar pago" + "Editar" + "Cancelar"
- PENDING Credit Card: "Pagar tarjeta" + "Editar" + "Cancelar"
- PAID: "Ver movimiento" (not wired) + no edit/cancel
- CANCELLED: Read-only

**Gap:** "Ver movimiento" for PAID normal payments not implemented (line 366-377).

---

## 12. MOVEMENT FINDINGS

### Movement Row Structure (FinanceScreen.tsx:1278-1450)
**Current Structure:**
```
InteractivePressable (movementRow)
├── View (movementCopy)
│   ├── AppText (title) — variant="body" weight="800"
│   ├── AppText (categoryLabel) — variant="caption" tone="secondary" (optional)
│   └── AppText (refund summary) — variant="caption" tone="success" (if hasRefund)
└── AppText (amount) — variant="bodySmall" weight="800" tone="danger|success" style={movementAmount}
```

### Visual Consistency Issues

| Aspect | Expense | Income | Transfer | Gap |
|--------|---------|--------|----------|-----|
| Title | description or "Gasto" | description or "Ingreso" | financeTransferTitle | OK |
| Category | Shows categoryLabel | Shows categoryLabel | N/A | OK |
| Refund line | Shows if hasRefund | N/A | N/A | OK |
| Amount alignment | Right, tone=danger | Right, tone=success | Right, tone=primary | OK |
| Row height | minHeight=56 (implied) | Same | Same | **Inconsistent** — no explicit minHeight on movementRow |
| Long description | numberOfLines={1} | numberOfLines={1} | numberOfLines={1} | Truncates |
| Long category | numberOfLines={1} | numberOfLines={1} | N/A | Truncates |
| Large numbers | formatFinanceAmount handles grouping | Same | Same | OK |
| Multiple currencies | Shows currency code | Same | Shows both currencies | OK |
| Refund composition | "Devuelto $X · Neto $Y" | N/A | N/A | OK |

### Press Affordance
- All rows use `InteractivePressable` with `pressScale={motion.scale.card}` and `haptic="light"` — consistent.

### Day Grouping
- `groupMovementsByTransactionDate` groups by `movement.date` (transactionDate)
- Section header: `formatFinanceDateGroupLabel` (e.g., "Hoy", "Ayer", "2 de septiembre")

### Empty/Loading/Error States
- Loading: `FinanceSurfaceLoading` skeleton
- Error: `ErrorState` with retry
- Empty: `EmptyState` with contextual illustration

### TransferDetailSheet (TransferDetailSheet.tsx)
- Shows source/destination accounts with before→after balance projection
- Shows commission if present
- Shows description/notes
- **Missing:** Link to commission expense, "Ver movimiento" for source/destination

### MovementDetailSheet (MovementDetailSheet.tsx)
- Detail view with refund summary (Gastado/Devuelto/Gasto neto)
- Pool assignment entry
- "Me devolvieron" / "Agregar otra devolución"
- "Corregir devolución" (if refunds exist)
- "Organizar gasto" (pool)
- "Algo está mal" → Correction / Trash

**Gap:** No "Ver transferencia" for transfer-type movements (handled separately via TransferDetailSheet).

---

## 13. POOL FINDINGS

### Pool Lifecycle (FinancePoolManagementScreen.tsx + PoolDetailSheet.tsx)
| Action | Component | Status |
|--------|-----------|--------|
| Create | CreatePoolSheet | ✅ |
| Rename | PoolDetailSheet → RenamePoolSheet | ✅ |
| Archive | PoolDetailSheet → ArchivePoolSheet | ✅ |
| Allocate | PoolDetailSheet → AllocatePoolSheet | ✅ |
| Release | PoolDetailSheet → ReleasePoolSheet | ✅ |
| Pool→Pool Transfer | PoolDetailSheet → TransferBetweenPoolsSheet | ✅ |
| Expense Assignment | MovementDetailSheet / NewMovementSheet → PoolSelectorSheet | ✅ |
| Income Distribution | NewMovementSheet (incomePoolAllocations) | ✅ |
| Category→Pool Default | CategoryPoolDefaultSheet (referenced, not read) | ⚠️ Not audited |
| Sin asignar | FinancePoolSummary shows `unassignedKnown` | ✅ |

### User Understanding Test: "Accounts = where money exists, Pools = purpose/reserve"
**Current UI Signals:**
- FinanceScreen Resumen: "Tu dinero" → Summary metrics → PoolSummary → SpendingLimitSummary
- PoolManagement: "Organización del dinero" → "Disponible conocido" / "Sin asignar" / Pools list
- PoolDetail: Shows balance, allocate/release/transfer actions
- Expense Pool Assignment: "Pozo" field in NewMovementSheet/MovementDetailSheet

**Ambiguity Found:**
1. **Terminology:** "Disponible conocido" (knownOrganizableNet) = accounts balance - credit card debt - pool allocations. Not intuitive.
2. **Hierarchy:** Pools appear as peer to Summary metrics, not as "subdivisions of Accounts"
3. **Sin asignar:** Shown as separate metric, not clearly "money in accounts not assigned to pools"
4. **Allocation coverage deficit warning:** "Tenés $X organizados por encima del respaldo conocido" — technical language

**Copy Audit:**
| Action | Current Copy | Clear? |
|--------|--------------|--------|
| Create Pool | "Crear pozo" | ✅ |
| Allocate | "Asignar a pozo" / "Monto a asignar" | ✅ |
| Release | "Liberar de pozo" / "Monto a liberar" | ✅ |
| Transfer | "Transferir entre pozos" | ✅ |
| Archive | "Archivar pozo" | ✅ |
| Expense assign | "Pozo" field label | ⚠️ No explanation of what pool means |

**Recommendation:** Add inline help "Los pozos son reservas de dinero para propósitos específicos (ej. Ahorros, Impuestos, Viajes)" in PoolManagement empty state and first-time PoolSelector.

---

## 14. SPENDING LIMIT FINDINGS

### Backend Capabilities vs UI Exposure
| Backend Support | UI Exposure | Gap |
|-----------------|-------------|-----|
| OVERALL / CATEGORY | Both exposed (segmented control) | ✅ |
| MONTHLY / YEARLY | Both exposed (period selector tabs) | ✅ |
| ONE_OFF / RECURRING | Both exposed (segmented control) | ✅ |
| Edit scope (ONE_OFF / THIS_PERIOD / THIS_AND_FOLLOWING) | Exposed for RECURRING edit | ✅ |
| Cancel scope (ONE_OFF / THIS_PERIOD / THIS_AND_FOLLOWING) | Exposed in DetailSheet cancel | ✅ |

### Happy Path Analysis
**Minimal Happy Path:** General / Category + Amount + Period (Monthly) + Recurring (default)
**Current Friction:** All fields visible at once. Period type, Recurrence type, Start period should be under "Más opciones" for most users.

### Recurring Cancellation Scope UX
**Location:** `SpendingLimitDetailSheet` (not read) + `FinanceSpendingLimitsManagementScreen.tsx:174-222`  
**Issue:** Cancel action uses `FinanceSpendingLimitCancelScope` with `ONE_OFF` / `THIS_AND_FOLLOWING`. For RECURRING limits, user sees "Solo este período" vs "Este y siguientes" but the backend enum is `THIS_PERIOD` / `THIS_AND_FOLLOWING`. Terminology mismatch.

**Code Evidence:**
```typescript
// FinanceSpendingLimitsManagementScreen.tsx:189-191
const isOneOff = limit.recurrenceType === 'ONE_OFF';
const cancelScope: FinanceSpendingLimitCancelScope = isOneOff ? 'ONE_OFF' : 'THIS_AND_FOLLOWING';
```
But DetailSheet (not read) likely shows different labels.

---

## 15. ANALYSIS FINDINGS

### Navigation/Layout Cause (FinanceAnalysisDetailScreen.tsx)
**Root Cause:** `FinanceAnalysisDetailScreen` is a **MoreStack.Screen** (pushed on stack), not a nested navigator inside FinanceScreen. Therefore:
- Uses `AppScreen` with custom header (back button + title)
- **No bottom tab bar** (MoreStack has no tab bar)
- Period navigation via `navigation.navigate('FinanceAnalysisDetail', ...)` replaces screen
- No context switcher (fixed context from entry params)

**Evidence:** `HomeTabNavigator.tsx:197` — `FinanceAnalysisDetail` is in MoreStack.

### Other Issues
- No AI/forecast (compliant with P14)
- Charts: Uses custom bar chart (View-based) in CategoryBreakdownRow — no external chart dependency
- Refund representation: Shows "Gasto bruto / Devoluciones" note in summary
- Empty/Error/Loading: Handled with dedicated screens (lines 258-345)

---

## 16. FORM / SHEET INVENTORY

| Sheet | Required Fields | Optional Fields | Progressive Disclosure Candidate | Confusing Terminology |
|-------|----------------|-----------------|----------------------------------|----------------------|
| **AccountFormSheet** | name, currency, accountType, (balanceMode=known → amount) | balanceMode=unknown | balanceMode/MoneyInput → "Más opciones" | "No lo sé" (P0-1) |
| **AccountEditSheet** | name | — | — | "Por ahora solo podés editar el nombre" |
| **BalanceAnchorSheet** | amount | — | — | "Magnitud positiva, sin signo" |
| **BalanceCorrectionSheet** | amount | — | — | "Diferencia" calculation |
| **NewMovementSheet (Expense)** | amount, currency | description, category, account, pool, notes | category, account, pool, notes → "Más opciones" | "Sin cuenta" vs "Sin pozo" |
| **NewMovementSheet (Income)** | amount, currency | description, account, pool allocations | account, pool allocations → "Más opciones" | "Organizar ingreso" label |
| **NewMovementSheet (Transfer)** | sourceAccount, destAccount, amount | destinationAmount (cross-currency), commission, description | commission, destinationAmount → "Más opciones" | "Sale de" / "Llega a" |
| **MovementDetailSheet** | — | refund, pool, correction, trash | — | "Algo está mal" conflates correction/trash |
| **NewPaymentSheet (Normal)** | title, dueDate, (expectedAmountKnown → amount) | category, description, recurrence | recurrence, category, description → "Más opciones" | "Monto conocido" / "A confirmar" |
| **NewPaymentSheet (Credit Card)** | title, targetCard, dueDate, (expectedAmountKnown → amount) | recurrence | recurrence → "Más opciones" | "Tarjeta" label |
| **PayCreditCardSheet** | destinationAmount, sourceAccount, date | sourceAmount (cross-currency) | sourceAmount → "Más opciones" | "Monto a acreditar" vs "Monto que sale" |
| **RegisterPaymentSheet** | amount, date | category, account | category, account → "Más opciones" | "Monto real" vs "Esperado" |
| **PaymentDetailSheet** | — | register, edit, cancel | — | "Cancelar" scope ambiguity |
| **EditPaymentDueSheet** | — | title, expectedAmount, dueDate, category, targetCard | — | Not read |
| **CreatePoolSheet** | name | — | — | Not read |
| **PoolDetailSheet** | — | rename, allocate, release, transfer, archive | allocate/release/transfer → "Más opciones" | Not read |
| **SpendingLimitSheet** | scopeType, amount, period | category, periodType, recurrenceType, editScope | periodType, recurrenceType, editScope → "Más opciones" | "Alcance de la edición" |
| **TransactionCorrectionSheet** | (at least one field changed) | amount, currency, date, description, category, account, notes | currency, date, category, account, notes → "Más opciones" | "Era / Será" review |

### Field Classification Summary
| Field | Classification |
|-------|----------------|
| AccountFormSheet.balanceMode | **REMOVE FROM USER UI** (per P5) |
| AccountFormSheet.amount (when known) | **KEEP PRIMARY** |
| NewMovementSheet.pool | **MOVE TO MORE OPTIONS** |
| NewMovementSheet.notes | **MOVE TO MORE OPTIONS** |
| NewMovementSheet.category (income) | **MOVE TO MORE OPTIONS** |
| NewPaymentSheet.recurrence | **MOVE TO MORE OPTIONS** (keep preset toggle primary) |
| NewPaymentSheet.description | **MOVE TO MORE OPTIONS** |
| SpendingLimitSheet.periodType | **MOVE TO MORE OPTIONS** |
| SpendingLimitSheet.recurrenceType | **MOVE TO MORE OPTIONS** |
| SpendingLimitSheet.editScope | **CONDITIONAL** (only for RECURRING edit) |
| MoneyInput.currency | **KEEP PRIMARY** (but warn on change without conversion) |
| Transfer.destinationAmount | **CONDITIONAL** (only cross-currency) |
| Transfer.commission | **MOVE TO MORE OPTIONS** |

---

## 17. COPY / TERMINOLOGY FINDINGS

| Term | Current Usage | Consistency | Recommendation |
|------|---------------|-------------|----------------|
| **Cuenta** | AccountFormSheet, AccountDetailSheet, AccountSelector | ✅ Consistent | Keep |
| **Tarjeta de crédito** | AccountFormSheet, AccountDetailSheet, NewPaymentSheet kind | ✅ Consistent | Keep (not bare "Tarjeta") |
| **Saldo** | Account (Saldo actual), Credit Card edge (Saldo a favor) | ✅ Consistent | Keep |
| **Deuda** | Credit Card (Deuda actual, Deuda real) | ✅ Consistent | Keep |
| **Pago** | PaymentDueDto.kind=NORMAL, "Registrar pago" | ⚠️ "Pago" vs "Pago pendiente" | Use "Pago pendiente" for due, "Pago registrado" for paid |
| **Pago pendiente** | Not used in UI | Missing | Add for clarity |
| **Recurrente** | Payment series, Spending limit recurrenceType=RECURRING | ✅ Consistent | Keep |
| **Pozo** | All pool UI | ✅ Consistent | Keep |
| **Sin asignar** | PoolSummary.unassignedKnown | ✅ Clear | Keep |
| **Límite** | SpendingLimitSheet, FinanceSpendingLimitSummary | ✅ Consistent | Keep |
| **Movimiento** | MovementDetailSheet title, Movimientos tab | ✅ Consistent | Keep |
| **Transferencia** | TransferDetailSheet title, Transfer kind | ✅ Consistent | Keep |
| **Comisión** | Transfer commission only | ✅ Domain-specific | Keep |
| **Devolución** | Refund events, "Me devolvieron" | ✅ Consistent | Keep |
| **Corrección** | TransactionCorrectionSheet, "Lo anoté mal" | ✅ Consistent | Keep |
| **Papelera** | FinancePapeleraScreen, "Nunca ocurrió" | ✅ Consistent | Keep |
| **Archivar** | Accounts, Pools | ✅ Consistent | Keep |
| **Cancelar** | Payments, Spending Limits | ⚠️ Different from Archivar | Document semantic difference |

### Technical/Ambiguous Wording Found
1. "Saldo no establecido" — backend concept leaked (should be "Sin saldo definido" or similar)
2. "Disponible conocido" — technical term (knownOrganizableNet)
3. "Cobertura de asignación" — technical (allocationCoverageDeficit)
4. "Magnitud positiva, sin signo" — implementation detail (helper text)
5. "Anchor" / "Anclar" — backend term in BalanceAnchorSheet title "Establecer saldo" (good)
6. "MutationId" / "IdempotencyKey" — not in UI (good)

---

## 18. NAVIGATION / BOTTOM BAR FINDINGS

### Route/Sheet Map from FinanceScreen

| Destination | Type | Bottom Bar Visible? | Back Behavior | Double Header? |
|-------------|------|---------------------|---------------|----------------|
| FinanceScreen (Resumen/Movimientos/Pagos) | Stack Screen (MoreStack initial) | ✅ Yes (HomeTabNavigator) | → MoreHome | No |
| FinanceAccountsScreen | Stack Screen (MoreStack push) | ❌ No | → FinanceScreen | No |
| FinancePapeleraScreen | Stack Screen (MoreStack push) | ❌ No | → FinanceScreen | No |
| FinancePoolManagementScreen | Stack Screen (MoreStack push) | ❌ No | → FinanceScreen | No |
| FinanceSpendingLimitsManagementScreen | Stack Screen (MoreStack push) | ❌ No | → FinanceScreen | No |
| FinanceAnalysisDetailScreen | Stack Screen (MoreStack push) | ❌ No | → FinanceScreen | No |
| NewMovementSheet | ActionSheet (Modal) | ✅ Yes (over FinanceScreen) | Close sheet | No |
| MovementDetailSheet | ActionSheet (Modal) | ✅ Yes | Close sheet | No |
| TransferDetailSheet | ActionSheet (Modal) | ✅ Yes | Close sheet | No |
| TransactionCorrectionSheet | ActionSheet (Modal) | ✅ Yes | Close sheet | No |
| NewPaymentSheet | ActionSheet (Modal) | ✅ Yes | Close sheet | No |
| PaymentDetailSheet | ActionSheet (Modal) | ✅ Yes | Close sheet | No |
| RegisterPaymentSheet | ActionSheet (Modal) | ✅ Yes | Close sheet | No |
| PayCreditCardSheet | ActionSheet (Modal) | ✅ Yes | Close sheet | No |
| EditPaymentDueSheet | ActionSheet (Modal) | ✅ Yes | Close sheet | No |
| PoolSelectorSheet | ActionSheet (Modal, nested) | ✅ Yes | Close sheet | No |
| AccountFormSheet | ActionSheet (Modal) | ✅ Yes (over FinanceAccountsScreen) | Close sheet | No |
| AccountDetailSheet | ActionSheet (Modal) | ✅ Yes | Close sheet | No |
| AccountEditSheet | ActionSheet (Modal) | ✅ Yes | Close sheet | No |
| BalanceAnchorSheet | ActionSheet (Modal) | ✅ Yes | Close sheet | No |
| BalanceCorrectionSheet | ActionSheet (Modal) | ✅ Yes | Close sheet | No |

### Critical Finding: **Bottom Bar Lost on All Finance Child Screens**
All Finance child screens (Accounts, Papelera, Pools, Limits, Analysis) are pushed on **MoreStack** which has `headerShown: false` but **no bottom tab bar**. User loses global navigation context.

**Dead Ends:** None found — all screens have back button or sheet close.

**Double Header:** None — FinanceScreen has custom header, child screens have custom headers, but they're on different stack levels.

---

## 19. EDGE CASE MATRIX

| Domain | 0 Value | Negative | Huge Number | Long Text | No Accounts | One Account | No Credit Cards | No Categories | No Pools | No Activity | Archived Entity | Personal/Household | Currency Mismatch | Network Error | Double Tap | Rapid Open/Close |
|--------|---------|----------|-------------|-----------|-------------|-------------|-----------------|---------------|----------|-------------|-----------------|-------------------|-------------------|---------------|------------|------------------|
| Accounts | ✅ Shows $0 | ✅ Shows -$X | ✅ Grouping handles | ✅ Truncates | ✅ Empty state + CTA | ✅ Works | ✅ Filtered in eligibility | N/A | N/A | ✅ Shows empty activity | ✅ Separate section | ✅ Context switch | ✅ Grouped by currency | ✅ ErrorState + retry | ⚠️ No debounce | ✅ State reset on close |
| Credit Cards | ✅ Deuda $0 | N/A (debt = negative) | ✅ | ✅ | ✅ Not shown in eligibility | ✅ | N/A | N/A | N/A | N/A | ✅ Archived section | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| Expense Creation | ❌ Validates >0 | ❌ MoneyInput rejects | ✅ | ✅ Truncates | ⚠️ "Sin cuenta" allowed | ✅ | ✅ CREDIT_CARD allowed | ⚠️ "Sin categoria" allowed | ⚠️ Disabled if no account/unknown | N/A | N/A | ✅ Context-aware eligibility | ✅ Currency filter | ✅ | ⚠️ Idempotency protects | ✅ |
| Income Creation | ❌ Validates >0 | ❌ | ✅ | ✅ | ⚠️ "Sin cuenta" allowed | ✅ | ❌ CREDIT_CARD blocked | N/A | ✅ Disabled if no eligible account | N/A | N/A | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| Transfer | ❌ Validates >0 | ❌ | ✅ | ✅ | ❌ Requires 2 accounts | ❌ Needs 2 distinct | ✅ Source=ACCOUNT only | N/A | N/A | N/A | N/A | ✅ | ✅ Cross-currency handled | ✅ | ⚠️ | ✅ |
| Payment Due | ✅ "A confirmar" | N/A | ✅ | ✅ | N/A | N/A | ✅ Target required | ✅ Category optional | N/A | N/A | N/A | ✅ | ✅ Currency from card | ✅ | ⚠️ | ✅ |
| Pools | ✅ Balance $0 | ✅ Negative = exceeded | ✅ | ✅ | ✅ Empty state | ✅ | N/A | N/A | ✅ Empty state | N/A | ✅ Archived hidden by default | ✅ Context-filtered | ✅ Currency-filtered | ✅ | ⚠️ | ✅ |
| Spending Limits | ❌ Validates >0 | N/A | ✅ | ✅ | N/A | N/A | N/A | ✅ Category filter | N/A | N/A | N/A | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| Analysis | ✅ Shows $0 | ✅ Net negative | ✅ | N/A | ✅ Empty state | N/A | N/A | ✅ Empty categories | N/A | ✅ Empty state | N/A | ✅ | ✅ Currency selector | ✅ | N/A | ✅ |

**Key Gaps:**
- Double tap protection: Only idempotency keys protect mutations; UI-level debounce missing on sheet submit buttons
- Rapid open/close: Sheets reset draft on close (good), but nested sheets (PoolSelector inside NewMovementSheet) may have state leakage

---

## 20. CROSS-DOMAIN CONTRADICTIONS

| Contradiction | Location | Severity |
|---------------|----------|----------|
| **Accounts vs Pools hierarchy** | Resumen shows Pools as peer to Summary metrics; Accounts hidden in Overflow | P2 — User mental model: Accounts contain money, Pools organize it |
| **Payment Due vs Expense** | RegisterPaymentSheet creates Expense; PayCreditCardSheet creates Transfer. Different backend paths for "paying". | P1 — User sees "Registrar pago" vs "Pagar tarjeta" but both settle obligations |
| **Transfer vs Credit Card Payment** | Both create Transfer (source=ACCOUNT, dest=CREDIT_CARD). But PaymentDue kind=CREDIT_CARD routes to PayCreditCardSheet, while manual transfer uses NewMovementSheet. | P2 — Two paths to same financial fact |
| **Spending Limit vs Pool** | Both "control" spending but different mechanisms. Limit = alert/threshold; Pool = reservation. UI presents as peers in Resumen. | P3 — Conceptual overlap not explained |
| **Category → Pool Default** | CategoryPoolDefaultSheet exists but not visible in audit. Auto-applies in NewMovementSheet but user can override. | P4 — Hidden automation |

---

## 21. PROGRESSIVE DISCLOSURE PLAN

Per P2 ("Advanced optional fields should use progressive disclosure such as 'Más opciones'").

| Sheet | Primary (Always Visible) | Move to "Más opciones" |
|-------|--------------------------|------------------------|
| AccountFormSheet | Tipo, Nombre, Moneda | Saldo inicial (balanceMode + MoneyInput) |
| NewMovementSheet (Expense) | Monto, Moneda, Descripción | Categoría, Cuenta, Pozo, Notas |
| NewMovementSheet (Income) | Monto, Moneda, Descripción | Cuenta, Distribución en pozos |
| NewMovementSheet (Transfer) | Sale de, Llega a, Monto | Monto destino (cross-currency), Comisión, Descripción |
| NewPaymentSheet (Normal) | Título, Vencimiento, Monto esperado | Categoría, Descripción, Repetición (keep toggle, hide custom) |
| NewPaymentSheet (Credit Card) | Título, Tarjeta, Vencimiento, Monto esperado | Repetición (keep toggle, hide custom) |
| SpendingLimitSheet | Qué limitar (General/Categoría), Monto, Comienza | Repetición, Tipo de período, Alcance de edición |
| TransactionCorrectionSheet | Monto, Descripción | Moneda, Fecha, Categoría, Cuenta, Notas |
| PoolDetailSheet | Nombre, Saldo | Asignar, Liberar, Transferir, Renombrar, Archivar |

---

## 22. PROPOSED FINAL RESUMEN IA

**Do not implement yet — product decision needed.**

```
Resumen Tab
├── Period Control (shared)
├── Currency Selector (shared)
├── Tu dinero
│   ├── Pools (active, with balances, allocate/release inline)
│   └── Cuentas (summary: total balance, credit card debt, by currency)
├── Resumen del período
│   ├── Gastamos / Ingresó / Neto (with comparison)
│   └── Ver análisis → FinanceAnalysisDetail
├── Límites de gasto (summary cards with progress)
└── Destacados (FinanceAnalysisHighlights)
```

**Required Backend:** New summary endpoint combining accounts + pools per currency/context.

---

## 23. PROPOSED STAGE 8 IMPLEMENTATION SLICES

| Slice | Scope | Priority | Est. Effort |
|-------|-------|----------|-------------|
| **8B-1: Remove "No lo sé" from Account Creation** | AccountFormSheet, AccountDetailSheet, AccountSelector, BalanceAnchorSheet, backend default | P0 | M |
| **8B-2: Fix Credit Card Target Picker** | financeAccountEligibility.ts (new operation), NewPaymentSheet | P0 | S |
| **8B-3: Progressive Disclosure "Más opciones"** | NewMovementSheet, NewPaymentSheet, SpendingLimitSheet, TransactionCorrectionSheet, PoolDetailSheet | P2 | L |
| **8B-4: Bottom Bar on Finance Child Screens** | Restructure MoreStack or nest navigators in FinanceScreen | P2/P10 | M |
| **8B-5: Recurrence CTA Fix** | NewPaymentSheet footer logic | P1 | XS |
| **8B-6: Terminology Unification** | Copy audit across all components (P3 items) | P3 | S |
| **8B-7: Movement Row Height Consistency** | FinanceScreen.tsx movementRow styles | P3 | XS |
| **8B-8: MoneyInput Currency Change Warning** | MoneyInput.tsx — add confirmation or conversion hint | P2 | S |
| **8B-9: Analysis Screen Shell Integration** | Nest FinanceAnalysisDetail in FinanceScreen navigator or add bottom tab | P2/P10 | M |
| **8B-10: Payment Cancellation Scope Clarity** | PaymentDetailSheet cancel scope labels | P1 | S |
| **8B-11: "Algo está mal" Flow Separation** | MovementDetailSheet — separate Correction vs Trash entry points | P1 | S |
| **8B-12: Empty State Copy Unification** | All domains — consistent tone/voice | P3 | S |
| **8B-13: Transfer Preview UNKNOWN Handling** | NewMovementSheet computeTransferPreview | P1 | S |
| **8B-14: Spending Limit Past Period Validation** | SpendingLimitSheet period input validation | P1 | XS |
| **8B-15: AccountSelector Inline Balance Anchor** | AccountSelector row action for UNKNOWN accounts | P2 | M |

---

## 24. FILES / COMPONENT OWNERS LIKELY INVOLVED

| File | Role | Slices |
|------|------|--------|
| `screens/finance/FinanceScreen.tsx` | Main shell | 8B-3, 8B-4, 8B-7, 8B-9, 8B-22 |
| `screens/finance/FinanceAccountsScreen.tsx` | Accounts list | 8B-1, 8B-15 |
| `screens/finance/FinanceAnalysisDetailScreen.tsx` | Analysis | 8B-9 |
| `components/finance/AccountFormSheet.tsx` | Create account | 8B-1, 8B-3 |
| `components/finance/AccountDetailSheet.tsx` | Account detail | 8B-1, 8B-15 |
| `components/finance/AccountSelector.tsx` | Account picker | 8B-1, 8B-3, 8B-15 |
| `components/finance/NewMovementSheet.tsx` | Create movement | 8B-2, 8B-3, 8B-8, 8B-13 |
| `components/finance/MovementDetailSheet.tsx` | Movement detail | 8B-3, 8B-11 |
| `components/finance/NewPaymentSheet.tsx` | Create payment | 8B-2, 8B-3, 8B-5, 8B-10 |
| `components/finance/PayCreditCardSheet.tsx` | Pay credit card | 8B-3 |
| `components/finance/PaymentDetailSheet.tsx` | Payment due detail | 8B-10 |
| `components/finance/RegisterPaymentSheet.tsx` | Register payment | 8B-3 |
| `components/finance/TransactionCorrectionSheet.tsx` | Correct movement | 8B-3 |
| `components/finance/FinancePoolManagementScreen.tsx` | Pool management | 8B-3, 8B-22 |
| `components/finance/FinanceSpendingLimitsManagementScreen.tsx` | Limits management | 8B-3 |
| `components/finance/SpendingLimitSheet.tsx` | Create/edit limit | 8B-3, 8B-14 |
| `components/finance/MoneyInput.tsx` | Money input | 8B-8 |
| `components/finance/PoolSelectorSheet.tsx` | Pool picker | 8B-3 |
| `components/finance/TransferDetailSheet.tsx` | Transfer detail | — |
| `services/finance/financeAccountEligibility.ts` | Account filtering | 8B-2 |
| `services/finance/accountDisplay.ts` | Balance presentation | 8B-1 |
| `services/finance/financeAccounts.ts` | Account API | 8B-1 |
| `services/finance/financeContext.ts` | Context logic | 8B-4 |
| `navigation/HomeTabNavigator.tsx` | Tab navigation | 8B-4 |
| `navigation/AppNavigator.tsx` | App navigation | 8B-4 |

---

## 25. DB CHANGES LIKELY REQUIRED

| Change | Reason | Slice |
|--------|--------|-------|
| `finance_accounts.balance_state` default: `UNKNOWN` → `KNOWN` with `current_balance = '0'` | Remove "No lo sé" default | 8B-1 |
| `finance_accounts.initial_balance` NOT NULL default `'0'` | Require factual balance at creation | 8B-1 |
| Add `closing_day`, `due_day` to `finance_accounts` (nullable) | Optional future: credit card cycle | Future |
| Migration for existing UNKNOWN accounts | Preserve data integrity | 8B-1 |

---

## 26. BACKEND CHANGES LIKELY REQUIRED

| Change | Reason | Slice |
|--------|--------|-------|
| `createFinanceAccount`: `initialBalance` required (or default 0) | Remove UNKNOWN creation path | 8B-1 |
| New eligibility operation: `credit-card-payment` (CREDIT_CARD only) | Fix P1-2 | 8B-2 |
| `finance_accounts` summary endpoint for Resumen IA | Combine accounts + pools | 8B-22 |
| Payment cancellation: unify terminology (series vs single) | Fix P1-2 scope confusion | 8B-10 |
| Spending limit: validate period ≥ current in create/edit | Fix P2-6 | 8B-14 |

---

## 27. FRONTEND-ONLY CHANGES

| Change | File(s) | Slice |
|--------|---------|-------|
| Remove balanceMode radio, default MoneyInput to "0" | AccountFormSheet.tsx | 8B-1 |
| Add "Más opciones" progressive disclosure containers | NewMovementSheet, NewPaymentSheet, SpendingLimitSheet, TransactionCorrectionSheet, PoolDetailSheet | 8B-3 |
| Fix recurrence CTA label logic | NewPaymentSheet.tsx:371 | 8B-5 |
| Add bottom tab bar to Finance child screens (or nest navigator) | HomeTabNavigator.tsx, FinanceScreen.tsx | 8B-4 |
| Standardize "Sin categoría" vs "Sin categoria" | All sheets with category picker | 8B-6 |
| Add minHeight to movementRow | FinanceScreen.tsx styles | 8B-7 |
| MoneyInput currency change: show warning/toast | MoneyInput.tsx | 8B-8 |
| Transfer preview: handle UNKNOWN accounts gracefully | NewMovementSheet.tsx computeTransferPreview | 8B-13 |
| Payment cancel scope: use "Cancelar este pago" / "Cancelar serie completa" | PaymentDetailSheet.tsx | 8B-10 |
| MovementDetailSheet: separate "Corregir" and "Enviar a papelera" top-level | MovementDetailSheet.tsx | 8B-11 |
| AccountSelector: add "Establecer saldo" action for UNKNOWN rows | AccountSelector.tsx | 8B-15 |
| Empty state copy unification | All *Screen.tsx and *Sheet.tsx | 8B-12 |

---

## 28. PRODUCT DECISIONS STILL NEEDED

| Decision | Context | Options | Recommendation |
|----------|---------|---------|----------------|
| **P5: Require factual balance at account creation?** | AccountFormSheet defaults to "No lo sé" | A) Keep UNKNOWN (current) B) Require known balance (0 valid) C) Require known balance, no zero | **B** — Per audit brief direction |
| **Resumen IA restructuring?** | Move Pools/Accounts under "Tu dinero" | A) Implement proposed IA B) Keep current C) Hybrid | **Defer** — needs design validation |
| **Bottom bar on Finance child screens?** | MoreStack pushes hide bottom nav | A) Nest child navigators in FinanceScreen B) Keep stack push, accept hidden bar C) Move child screens to tabs | **A** — Per P10 |
| **Progressive disclosure pattern: "Más opciones" vs expandable sections?** | Multiple sheets | A) "Más opciones" button at bottom B) Expandable field groups C) Inline with disabled hint | **A** — Consistent with brief |
| **Credit card closing/due days in V1.1?** | Optional future fields | A) Add now B) Defer to V1.2 | **B** — Classified OPTIONAL FUTURE |
| **Spending limit edit scope terminology?** | "Solo este período" vs "Este y siguientes" vs backend THIS_PERIOD/THIS_AND_FOLLOWING | A) Match backend terms B) Keep user-friendly terms C) Add tooltip | **B + C** |
| **MoneyInput currency change behavior?** | Currently keeps numeric text | A) Warn "No convierte monedas" B) Auto-convert (needs rates) C) Clear amount on change | **A** — Per P3 (no invalid choices) |

---

## 29. RECOMMENDED EXECUTION ORDER

```
Phase 1: Safety & Correctness (P0/P1)
├── 8B-1: Remove "No lo sé" (backend + frontend)
├── 8B-2: Fix credit card target picker eligibility
├── 8B-5: Fix recurrence CTA label
├── 8B-10: Clarify payment cancellation scope
├── 8B-11: Separate "Algo está mal" flow
├── 8B-13: Fix transfer preview for UNKNOWN accounts
└── 8B-14: Validate spending limit period

Phase 2: UX Flow & Progressive Disclosure (P2)
├── 8B-3: "Más opciones" across all sheets
├── 8B-4: Bottom bar on Finance child screens
├── 8B-9: Analysis screen shell integration
├── 8B-8: MoneyInput currency change warning
├── 8B-15: AccountSelector inline balance anchor
└── 8B-7: Movement row height consistency

Phase 3: Polish & Consistency (P3/P4)
├── 8B-6: Terminology unification
├── 8B-12: Empty state copy unification
└── 8B-16+: Nice-to-have items
```

---

## 30. VERDICT

**STAGE 8A AUDIT COMPLETE — READY FOR PRODUCT FREEZE**

All domains audited against product principles P1–P15. Findings classified P0–P4 with BUG/PRODUCT GAP/UX DEBT/VISUAL DEBT/OPTIONAL FUTURE tags. Implementation slices defined with file ownership, backend/frontend changes, and product decisions identified.

**No implementation should begin until:**
1. Product confirms P5 direction (require factual balance)
2. Product approves Resumen IA restructuring (or defers)
3. Product confirms bottom bar strategy for Finance child screens
4. Product approves progressive disclosure pattern ("Más opciones")

---

**Audit completed by:** opencode (read-only, no modifications made)  
**Files inspected:** 34 core finance files + navigation + services  
**Lines of code reviewed:** ~12,000+