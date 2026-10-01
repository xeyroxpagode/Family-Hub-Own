# HOMePLUS FINANCE V1.1 — STAGE 8B RECON R5
# SPENDING LIMIT MANAGEMENT + ATTENTION LIFECYCLE
## READ-ONLY ANALYSIS REPORT

---

## 1. EXECUTIVE SUMMARY

**Verdict: R5 SPENDING LIMIT TRUTH BLOCKED — Attention/Home/Notification integration is NOT IMPLEMENTED**

The Spending Limit feature has complete backend/frontend for CRUD (create, read, edit, cancel) and progress calculation. However, the **real-world lifecycle** (awareness → near limit → exceed → attention → continue spending) is **incomplete**:

| Lifecycle Stage | Status |
|----------------|--------|
| Create/Manage limits | ✅ IMPLEMENTED |
| See progress | ✅ IMPLEMENTED |
| Approach limit (80%/90%) | ❌ NOT IMPLEMENTED |
| Exceed limit | ✅ Visual only (red state, >100%) |
| Be informed (Attention/Home/Push) | ❌ NOT IMPLEMENTED |
| Continue spending | ✅ Allowed (no blocking) |

**Critical Gap:** Empty state in Resumen provides **no CTA** to create first limit. Management screen access is only via "Administrar" button when limits exist.

---

## 2. MANAGEMENT ACCESS MAP

### Navigation Entry Points to `FinanceSpendingLimitsManagementScreen`

| From | Condition | CTA | Route |
|------|-----------|-----|-------|
| **Resumen (FinanceScreen)** | Has limits (≥1) | "Administrar" button in `FinanceSpendingLimitSummary` header | `FinanceSpendingLimitsManagement` with `contextType`, `currency`, `period` |
| **Resumen** | No limits | **NONE** — empty state shows only text "Todavía no configuraste límites de gasto" | — |
| **Management Screen itself** | Always | "+" icon buttons in "General" and "Categorías" section headers | Opens `SpendingLimitSheet` (create mode) |
| **Overflow Menu (FinanceScreen)** | Always | **NO** — only "Cuentas" and "Papelera" | — |

### Navigation Owner
- **Route:** `FinanceSpendingLimitsManagement` in `MoreStackParamList`
- **Params:** `{ contextType, currency, period }`
- **Called from:** `FinanceScreen.tsx:809-813` (onManage callback)

### Key Findings
1. **Empty state has NO "Crear límite" button** — user must navigate blindly or discover management screen through other means
2. **No "Ver todos" CTA** — "Administrar" only appears when limits exist
3. **Hidden in overflow menu?** NO — Finance overflow only shows Cuentas/Papelera
4. **Management screen exposes create?** YES — two "+" buttons (General / Categoría)

---

## 3. CREATE TRUTH

### Flow: `SpendingLimitSheet` (mode="create")

#### Defaults (from `SpendingLimitSheet.tsx:146-156`)
| Field | Default |
|-------|---------|
| `scopeType` | `OVERALL` (or `CATEGORY` if passed via `initialScopeType`) |
| `periodType` | `MONTHLY` (or passed via `initialPeriodType`) |
| `period` | `basePeriod` (current month `YYYY-MM`) or year `YYYY` for YEARLY |
| `recurrenceType` | `RECURRING` |
| `amount` | Empty (required) |
| `categoryId` | `null` (required for CATEGORY) |

#### Required Fields (validated in `SpendingLimitSheet.tsx:199-216`)
1. `amount` > 0 (numeric)
2. `categoryId` if `scopeType === 'CATEGORY'`

#### Validation (Frontend)
- Amount must be > 0
- Category required for CATEGORY scope
- Period format: `YYYY-MM` or `YYYY`

#### Backend Constraints (from `finance_spending_limit_foundation_v1_1.sql`)
| Constraint | Error Code |
|------------|------------|
| Past period forbidden | `finance_spending_limit_past_period_forbidden` |
| Slot exists (duplicate effective limit) | `finance_spending_limit_slot_exists` |
| Category deleted | `finance_spending_limit_category_deleted` |
| Amount ≤ 0 | `invalid_finance_spending_limit_amount` |
| Owner authority | `finance_spending_limit_owner_authority_forbidden` |
| Context forbidden | `finance_spending_limit_context_forbidden` |

#### Period Handling
- **Current period:** Allowed (default)
- **Future period:** Allowed
- **Past period:** **FORBIDDEN** (backend raises `finance_spending_limit_past_period_forbidden`)

#### Duplicate/Conflict Rules
- **ONE_OFF:** Only one per period per scope+category
- **RECURRING:** Only one recurring series per scope+category+currency+periodType
- Backend enforces via `finance_spending_limit_has_effective_slot_v1` and series uniqueness check

---

## 4. PROGRESS CALCULATION TRUTH

### Authoritative RPC: `finance_analysis_v1` (called via `/api/finance/spending-limits/progress` → analysis endpoint)

**File:** `supabase/migrations/20260828040000_finance_analysis_progress_v1_1.sql:578-651`

### Computation Logic
```sql
-- 1. Get effective limits for period (from finance_spending_limit_effective_rows_v1)
-- 2. Compute spent:
--    OVERALL: SUM of ALL expense net amounts (amount - refunded) in period
--    CATEGORY: SUM of expense net amounts WHERE category_id matches
-- 3. Refunds: SUBTRACTED (only ACTIVE refund_events)
-- 4. Transfers: EXCLUDED (only transaction_type='expense')
-- 5. Card purchases: INCLUDED (they are expenses with category)
```

### Returned Fields (`FinanceSpendingLimitProgressDto`)
| Field | Source | Notes |
|-------|--------|-------|
| `id` | series_id | Stable series identity |
| `scopeType` | `OVERALL` \| `CATEGORY` | |
| `categoryId` | uuid \| null | null for OVERALL |
| `categoryLabelSnapshot` | text | Denormalized label |
| `periodType` | `MONTHLY` \| `YEARLY` | |
| `period` | `YYYY-MM` \| `YYYY` | Formatted key |
| `recurrenceType` | `ONE_OFF` \| `RECURRING` | |
| `amount` | numeric string | Limit amount |
| `spent` | numeric string | Net expense (gross - refunds) |
| `remaining` | amount - spent | Can be negative |
| `percentUsed` | round((spent/amount)*100, 4) | String |
| `status` | `UNDER` \| `AT` \| `OVER` | `spent < amount`, `=`, `>` |
| `overBy` | greatest(spent - amount, 0) | 0 if under |
| `sourceKind` | `VERSION` \| `EXCEPTION` | |
| `sourceId` | uuid | Version or exception ID |
| `currency` | string | ISO 4217 |

### Refund Treatment
- **Subtracted from spent** (net expense = gross - refunded)
- Only `status = 'ACTIVE'` refund_events count
- Partial refunds reduce spent proportionally

### Transfers
- **Excluded** — only `transaction_type = 'expense'` included
- Transfer commission (expense) IS included if categorized as expense

### Card Purchases
- **Included** — they are regular expenses with category

---

## 5. BEFORE-EXPENSE TRUTH

### NewMovementSheet Expense Submission (`NewMovementSheet.tsx:625-758`)

| Question | Answer | Evidence |
|----------|--------|----------|
| **1. Frontend queries limits before submit?** | **NO** | No call to spending limits API in submit flow |
| **2. Backend rejects expense if limit exceeded?** | **NO** | Expense creation (`createFinanceExpense`) has no limit check |
| **3. Warning displayed before confirmation?** | **NO** | No pre-submit limit check or warning UI |
| **4. Category limit affects eligibility?** | **NO** | No validation against category limits |
| **5. Overall limit affects eligibility?** | **NO** | No validation against overall limits |

### Product Direction Compliance
✅ **Spending remains allowed** — expense creation never blocked by limits

---

## 6. AFTER-EXPENSE TRUTH

### What Updates After Expense Creation

| Trigger | Updates |
|---------|---------|
| Expense created (success) | `setReadRefreshNonce(n+1)` → re-fetches `getFinanceSpendingLimitProgress` |
| Refund created | Same — refresh triggers progress recalculation |
| Correction/Trash/Restore | Same — refresh triggers progress recalculation |

### UI Updates (Automatic via Refresh)
| Component | Updates |
|-----------|---------|
| `FinanceSpendingLimitSummary` (Resumen) | ✅ Yes — re-fetches progress |
| `FinanceSpendingLimitsManagementScreen` | ✅ Yes — re-fetches on refreshNonce change |
| `SpendingLimitDetailSheet` | ✅ Yes — listens to `progress` prop changes |

### Attention/Notification Generation
| Event | Generated? |
|-------|------------|
| **Attention record** | ❌ NO |
| **Home affected** | ❌ NO (Home shows Planner attention only) |
| **Push/Local notification** | ❌ NO (transport not implemented) |
| **Only on refresh?** | ✅ YES — all updates require refresh/re-fetch |

---

## 7. CURRENT ATTENTION/HOME INTEGRATION

### Planner Attention System (`plannerAttention.ts`, `plannerAttentionClient.ts`)

**Entity Types:** `task` | `event` | `plan` | `payment`
**NO `spending_limit` entity type exists**

### Home Screen (`HomePlannerSections.tsx:327-328`)
```tsx
// Shows attention from useHomeDailySignals (planner only)
daily.attention.map((item) => ...)
// NO spending limit attention items
```

### Classification
| Integration | Status |
|-------------|--------|
| Planner Attention API | ❌ NOT IMPLEMENTED for spending limits |
| Home "Necesita atención" card | ❌ NO spending limit items |
| Finance-specific attention | ❌ DOES NOT EXIST |

---

## 8. CURRENT NOTIFICATION INTEGRATION

### Notification Infrastructure
- **Planner Notification Adapter:** Exists (`plannerNotificationAdapter.ts`) — allowlists only Planner kinds
- **Push Transport (FCM/APNS/expo-notifications):** **NOT IMPLEMENTED** (explicitly documented as noop)
- **Spending Limit Notification Kinds:** **NONE DEFINED**

### Classification
| Integration | Status |
|-------------|--------|
| Local notification on exceed | ❌ NOT IMPLEMENTED |
| Push notification on exceed | ❌ NOT IMPLEMENTED (no transport) |
| Notification kinds for limits | ❌ NOT DEFINED |

---

## 9. THRESHOLD TRUTH

### Current Threshold Semantics
| Threshold | Exists? | Where |
|-----------|---------|-------|
| **80%** (near limit) | ❌ ABSENT | Nowhere |
| **90%** (warning) | ❌ ABSENT | Nowhere |
| **100%** (at limit) | ✅ IMPLICIT | `status === 'AT'` in progress DTO |
| **>100%** (over) | ✅ IMPLICIT | `status === 'OVER'`, `overBy > 0` |

### Frontend Visual Thresholds
- **Progress bar:** Clamped at 100% (`Math.min(percentUsed, 100)`)
- **Color coding:**
  - `UNDER` → terracotta
  - `AT` → warning (yellow)
  - `OVER` → danger (red)
- **Over text:** "Te pasaste X" shown when `isOver && overBy !== '0'`

**No proactive thresholds (80%, 90%) exist in backend or frontend.**

---

## 10. EXCEEDED-STATE TRUTH

### Frontend Representation (`FinanceSpendingLimitSummary.tsx`, `FinanceSpendingLimitsManagementScreen.tsx`, `SpendingLimitDetailSheet.tsx`)

| Representation | Implemented? | Details |
|----------------|--------------|---------|
| Remaining negative | ✅ | `remaining = amount - spent` (negative when over) |
| Over amount | ✅ | `overBy` field displayed as "Te pasaste X" |
| Red state | ✅ | `status === 'OVER'` → danger tone, red progress fill |
| Percentage >100% | ✅ | `percentUsed` shows actual (e.g., 125%) |
| Clamped progress bar | ✅ | Visual bar clamped at 100% (`Math.min(percent, 100)`) |

### Misleading Output?
- **Progress bar clamped at 100%** while percentage shows 125% → visual/number mismatch
- **No "exceeded by" in summary card** — only in detail sheet and management screen
- **Resumen summary shows max 3 limits** (sorted OVER first) — user may not see all exceeded limits

---

## 11. REFUND/CORRECTION/TRASH INTERACTIONS

### Refund Interaction
- **Refund reduces spent** (net expense = gross - refunded)
- **Partial refund:** Proportionally reduces spent
- **Full refund:** Spent returns to pre-expense level
- **Confirmed:** Analysis progress query subtracts `refunded_amount` from `gross_expense`

### Correction (`correctFinanceTransaction`)
- Changes to amount/category/date → reflected on next progress fetch
- Category change: moves spent between category limits
- Amount change: adjusts spent accordingly

### Trash (`trashFinanceTransaction`)
- Trashed expense: status ≠ ACTIVE → excluded from progress calculation
- **Progress decreases** immediately on refresh

### Restore (`restoreFinanceTransaction`)
- Restored expense: status = ACTIVE → included in progress
- **Progress increases** immediately on refresh

### Financial Truth Tracking
✅ **Progress follows ACTIVE financial truth** — all mutations trigger refresh nonce → re-fetch

---

## 12. RECURRING LIFECYCLE

### Series Model (`finance_spending_limit_series` + `versions` + `exceptions`)

| Action | Current Period | Following Periods | Backend Behavior |
|--------|----------------|-------------------|------------------|
| **Create RECURRING** | Creates series + version at `start_period` | Auto-applies to all future periods via `effective_period_start` | Single series, versions with `change_scope='THIS_AND_FOLLOWING'` |
| **Edit current (THIS_PERIOD)** | Creates exception | Unaffected | `finance_spending_limit_exceptions` insert |
| **Edit current (THIS_AND_FOLLOWING)** | Updates version at period | New version for future | `finance_spending_limit_versions` insert with `THIS_AND_FOLLOWING` |
| **Edit following only** | Unaffected | New version from next period | `effective_period_start = next_period` |
| **Cancel current (THIS_PERIOD)** | Creates CANCELLED exception | Unaffected | Exception with `status='CANCELLED', amount=null` |
| **Cancel following (THIS_AND_FOLLOWING)** | Unaffected | CANCELLED version from next period | Version with `status='CANCELLED', change_scope='THIS_AND_FOLLOWING'` |

### Can User Accidentally Lose Future Limits?
- **YES** — Editing with `THIS_AND_FOLLOWING` overwrites future defaults
- **YES** — Cancelling with `THIS_AND_FOLLOWING` cancels all future periods
- **NO UNDO** for future periods (no "restore future" operation)
- Category deletion auto-cancels future recurring limits (trigger: `finance_stop_future_category_spending_limits_v1`)

### Scope Copy vs Backend Behavior
| UI Label (`SpendingLimitSheet.tsx:479`) | Backend Scope |
|------------------------------------------|---------------|
| "Solo este período" | `THIS_PERIOD` → exception |
| "Este y siguientes" | `THIS_AND_FOLLOWING` → version |

**Matches correctly.**

---

## 13. EMPTY-STATE GAP

### Current Empty State (`FinanceSpendingLimitSummary.tsx:124-134`)
```tsx
<AppCard variant="quiet" padding="generous">
  <View style={styles.emptyState}>
    <AppText variant="body" weight="700" style={styles.emptyTitle}>
      Todavía no configuraste límites de gasto.
    </AppText>
  </View>
</AppCard>
```

### Missing Elements
| Missing | Impact |
|---------|--------|
| **"Crear límite" button** | User cannot create first limit from Resumen |
| **Explanation of value** | User doesn't know why limits matter |
| **Link to management** | No navigation path when empty |

### Management Screen Empty State (`FinanceSpendingLimitsManagementScreen.tsx:391-398`, `421-428`)
- **Has "Crear" buttons** (+ icons in section headers)
- **But unreachable from Resumen** when no limits exist

---

## 14. REQUIRED PRODUCT DECISIONS

| Decision | Current State | Required? |
|----------|---------------|-----------|
| **Threshold definitions (80%/90%)** | Absent | YES — for attention/notification triggers |
| **Attention entity type for spending limits** | Not in `AttentionEntityType` | YES — if Home integration desired |
| **Notification kinds for limits** | Not in allowlist | YES — if push desired |
| **Pre-submit passive hint** | Not implemented | PRODUCT CHOICE — direction says "awareness not blocking" |
| **Empty state CTA** | Missing | YES — critical UX gap |
| **Progress bar >100% visual** | Clamped at 100% | PRODUCT CHOICE — current shows actual % but clamped bar |

---

## 15. REQUIRED V1.1 GAPS

| Gap | Classification | Rationale |
|-----|----------------|-----------|
| **EMPTY CTA** | **REQUIRED V1.1** | User cannot create first limit from Resumen |
| **MANAGEMENT ACCESS** | **REQUIRED V1.1** | No entry point when empty; hidden when limits exist |
| **NEAR-LIMIT VISUAL STATE** | **OPTIONAL** | 80%/90% thresholds not defined; could enhance awareness |
| **EXCEEDED VISUAL STATE** | **PARTIAL** | Red state exists but progress bar clamped; over amount shown only in detail |
| **HOME ATTENTION** | **REQUIRED V1.1** | Core "be informed" lifecycle missing |
| **PUSH/LOCAL NOTIFICATION** | **TOO NOISY / NOT RECOMMENDED** | No transport; would need threshold design first |
| **PRE-SUBMIT PASSIVE HINT** | **OPTIONAL** | Aligns with "awareness" direction; low effort |

---

## 16. FILE/RPC/COMPONENT OWNERS

| Area | Owner |
|------|-------|
| **Backend: Limits CRUD** | `finance_spending_limit_foundation_v1_1.sql` — `finance_create_spending_limit_v1`, `finance_edit_spending_limit_v1`, `finance_cancel_spending_limit_v1`, `finance_list_spending_limits_v1` |
| **Backend: Progress Calculation** | `finance_analysis_progress_v1_1.sql` — `finance_analysis_v1` (includes `spendingLimitProgress`) |
| **Backend: Effective Rows** | `finance_spending_limit_foundation_v1_1.sql` — `finance_spending_limit_effective_rows_v1` |
| **Frontend: Service** | `services/finance/financeSpendingLimits.ts` — `listFinanceSpendingLimits`, `getFinanceSpendingLimitProgress`, `createFinanceSpendingLimit`, `editFinanceSpendingLimit`, `cancelFinanceSpendingLimit` |
| **Frontend: Management Screen** | `components/finance/FinanceSpendingLimitsManagementScreen.tsx` |
| **Frontend: Create/Edit Sheet** | `components/finance/SpendingLimitSheet.tsx` |
| **Frontend: Detail Sheet** | `components/finance/SpendingLimitDetailSheet.tsx` |
| **Frontend: Resumen Summary** | `components/finance/FinanceSpendingLimitSummary.tsx` |
| **Frontend: Expense Creation** | `components/finance/NewMovementSheet.tsx` — `submitExpenseOrIncome` |
| **Frontend: Home Attention** | `screens/home/HomePlannerSections.tsx` — uses `useHomeDailySignals` (planner only) |
| **Attention Infrastructure** | `services/planner/plannerAttention.ts`, `plannerAttentionClient.ts` |

---

## 17. NO-IMPLEMENTATION CONFIRMATION

✅ **NO SOURCE MODIFIED**
✅ **NO DATABASE CHANGES**
✅ **NO MIGRATIONS CREATED**
✅ **NO COMMITS**
✅ **NO PUSH**
✅ **REMOTE SUPABASE NOT USED**

---

## 18. VERDICT

### R5 SPENDING LIMIT TRUTH BLOCKED — Specific Blockers:

1. **BLOCKER-1:** Empty state in Resumen has **zero CTA** to create first limit — user trapped
2. **BLOCKER-2:** **No Attention integration** — limit exceed generates no Home/Planner attention item
3. **BLOCKER-3:** **No threshold semantics** — 80%/90% near-limit states undefined
4. **BLOCKER-4:** **Management screen unreachable** when no limits exist

### Ready for Product Freeze?
**NO** — The above blockers prevent the complete real-world lifecycle from functioning. Product must decide:
- Threshold values for attention/notification triggers
- Whether pre-submit hint is desired (passive awareness)
- Empty state CTA design
- Attention entity type addition for spending limits

---

**Analysis Complete.** All findings based on code inspection only. No runtime testing performed.