# FINANCE STAGE 5 — LIMITS + CATEGORIES AUDIT

## 1. PREFLIGHT
- Repo: C:\Users\thega\Desktop\HomePlus
- Branch: finance-v1-unified (confirmed)
- HEAD: 51488cd7ae6a93b5b5cc861fe5871d679ce9ba5f
- Worktree: Dirty with legitimate Stage 4 changes (preserved)
- Local Supabase only: API 127.0.0.1:56221, DB 127.0.0.1:56222

---

## 2. CURRENT AUDIT

### LIMITS CURRENT

**Backend Domain (finance.spending-limit.service.js + migrations):**
- Tables: `finance_spending_limit_series`, `finance_spending_limit_versions`, `finance_spending_limit_exceptions`
- Scope types: `OVERALL` (general), `CATEGORY` (por categoría)
- Period types: `MONTHLY` (YYYY-MM), `YEARLY` (YYYY)
- Recurrence: `ONE_OFF` (una vez), `RECURRING` (recurrente)
- CRUD: list, create, edit (THIS_PERIOD / THIS_AND_FOLLOWING), cancel (THIS_PERIOD / THIS_AND_FOLLOWING / ONE_OFF)
- Category validation: only expense categories, native/custom both supported, deleted categories blocked for new limits
- Category deletion: triggers `finance_stop_future_category_spending_limits_v1` — cancels future recurring periods via version with `change_scope='CATEGORY_DELETED'`
- Spending calculation: backend RPC `finance_list_spending_limits_v1` returns limits; `finance_spending_limit_effective_rows_v1` resolves effective amount per period; progress (spent/remaining/percent/overBy) comes from separate `getFinanceSpendingLimitProgress` RPC (not inspected here but used by frontend)
- Context isolation: Personal vs Household enforced via RLS and scope_id locking
- No hard delete — cancel creates CANCELLED version/exception; history preserved

**Frontend (FinanceSpendingLimitsManagementScreen.tsx):**
- Entry: Resumen → "Administrar" → FinanceSpendingLimitsManagementScreen
- Period selector: segmented MONTHLY / YEARLY tabs (not human month nav)
- Sections: "General" + "Categorías" each with + icon button
- Limits rendered as cards with:
  - Label + scope badge (General/Categoría)
  - Period + recurrence meta
  - Progress bar + spent/limit + % + over text
  - Chevron to detail
- Empty states: separate "Sin límites generales" / "Sin límites por categoría" cards with EmptyState
- Create sheet (SpendingLimitSheet.tsx):
  - Segmented scope: General / Categoría
  - If Categoría: category picker sheet (radio grid, no search)
  - Segmented recurrence: Una vez / Recurrente
  - Period input: raw YYYY-MM or YYYY (no human label)
  - Edit scope for recurring: Solo este período / Este y siguientes
  - Amount input
- Detail sheet (SpendingLimitDetailSheet.tsx):
  - Header: label + status badge
  - Metadata rows: Alcance, Categoría, Período, Repetición
  - Progress section: Gastado/Límite, Disponible/Excedido, Uso %
  - Actions: Editar límite (secondary), Cancelar límite (danger)
- Summary widget (FinanceSpendingLimitSummary.tsx):
  - Shows up to 3 limits sorted by status (OVER→AT→UNDER) then % desc
  - Compact rows with progress bar
  - "Administrar" link at bottom

**Gaps vs Target:**
| Target | Current | Gap |
|--------|---------|-----|
| Human period "SEPTIEMBRE 2026" | Raw YYYY-MM tabs | Period nav redesign |
| General = strong semantic surface | Card in section | New General surface design |
| Category limits = flat rows with icons | Cards with badges | Flat row redesign |
| Single compact empty state | Two separate EmptyState cards | Unified empty state |
| Create: "Aplica a >" selector | Segmented control | New progressive form |
| Create: category selector = shared primitive | Local radio grid | Reuse getQuickFinanceCategories + full picker |
| Limit Detail: simplified grammar | Many metadata rows | Simplify to identity→period→limit→spent→remaining→progress→actions |
| Category Management entry | Not present | Add "Administrar categorías >" at bottom |

---

### CATEGORIES CURRENT

**Backend (finance.category.service.js + migrations):**
- Table: `finance_categories`
- Kinds: `native` (system catalog), `custom` (user-created)
- Types: `expense`, `income`
- Native: 13 expense (food, housing, utilities, transport, health, education, shopping, leisure, subscriptions, pets, taxes, financial_costs) + 4 income (salary, independent_work, sales, returns)
- Custom: scoped to Personal (owner_person_id) or Household (household_id)
- Soft delete: `deleted_at` — makes `selectable=false`, historical facts keep `category_id` + `category_label_snapshot`
- Native immutable: create/update/delete blocked by RLS and service assertions
- Custom CRUD: create (label + type), update (label only — type immutable), delete (soft delete via deleted_at)
- Ordering: native first by sort_order, then custom by label
- RLS: native readable by all; custom readable by owner (personal) or household members

**Frontend (financeCategories.ts + NewMovementSheet/NewPaymentSheet):**
- Presentation mapping: nativeKey → icon + tonal family (terracotta/sage/sand/info/neutral)
- Label fallback for native (slugified Spanish labels)
- Quick categories: `getQuickFinanceCategories()` — prioritized native expense keys (food, transport, housing, utilities, health, shopping, financial_costs, education) up to 8 items
- Category selector in NewMovementSheet/NewPaymentSheet:
  - Quick mode: 3×2 grid of quick categories (up to 6)
  - "Ver todas" → Full mode: searchable list + "Nueva categoría"
  - Contextual creation: creates category, selects it, closes picker, retains form input
- CategoryPoolDefaultSheet: separate feature for pool suggestions

**Gaps vs Target:**
| Target | Current | Gap |
|--------|---------|-----|
| Category Management screen | Not present (only pool defaults) | New screen needed |
| Gastos / Ingresos segmented control | Not present | New segmented control |
| Native vs Custom grouping | Mixed in selectors | Group in management screen |
| Native = read-only (no edit/delete) | Enforced by backend | UI must not offer actions |
| Custom = full CRUD | Backend supports | UI for create/edit/delete |
| Archive/delete: preserve history | Backend soft delete | UI confirmation with human copy |
| Shared selector primitive | Duplicated in NewMovementSheet, NewPaymentSheet, SpendingLimitSheet | Extract reusable component |
| No "Otros" catch-all | Not present | Ensure not added |

---

## 3. TARGET (from Stage 5 spec)

### Limits Main IA
```
TopBar
Límites de gasto                         +

Period nav (if monthly): ‹ SEPTIEMBRE 2026 ›

General
  [semantic surface with Gastaste/Te quedan/progress]

Por categoría
  [icon] Alimentación
         118.000 de 150.000 ARS
         [thin progress]
         Te quedan 32.000                    >

Administrar categorías >
```

### General Limit States
- **Has limit**: Gastaste X de Y + progress + Te quedan Z
- **Exceeded**: Gastaste X / Límite Y / Superaste por Z (muted danger)
- **Absent**: "Todavía no definiste un límite general" + "Definir límite >"

### Category Limit Row
- Flat row (no card), inset divider
- Icon + label
- "X de Y ARS" + thin progress
- "Te quedan Z" or "Superaste por Z" + chevron

### Create Limit (progressive)
```
Nuevo límite
Aplica a        General >          (or category name >)
Monto           [ 500.000    ARS ]
Período         Septiembre 2026 >  (human, not raw)
[ Crear límite ]
```

### Category Management IA
```
Categorías                              +

[ Gastos | Ingresos ]

Del sistema
[icon] Alimentación           >
[icon] Vivienda               >
...

Personalizadas
[icon] Mascotas               >
[icon] Colegio chicos         >
```

### Category Selector (shared)
- Quick: up to 6, 3×2, icons + tonal surfaces, "Ver todas"
- Full: searchable compact list, all categories, "+ Nueva categoría"
- Contextual create: creates → selects → closes → parent retains input

---

## 4. REAL GAP SUMMARY

| Area | Current | Target | Effort |
|------|---------|--------|--------|
| Period navigation | MONTHLY/YEARLY tabs | Human month ‹ SEPTIEMBRE 2026 › | Medium |
| General limit surface | Card in section | Strong semantic surface | Medium |
| Category limit rows | Cards with badges | Flat rows with icons | Medium |
| Empty state | Two EmptyState cards | Single compact | Low |
| Create Limit form | Segmented controls | Progressive "Aplica a >" form | Medium |
| Category selector in Create | Local radio grid | Shared primitive (quick+full) | Medium |
| Limit Detail | Verbose metadata | Simplified grammar | Low |
| Category Management screen | Missing | New screen with Gastos/Ingresos, native/custom groups | High |
| "Administrar categorías" entry | Missing | Link at bottom of Limits | Low |
| Category CRUD UI | Only in pool defaults | Full create/edit/delete in management | Medium |
| Shared category selector | 3 implementations | 1 reusable component | Medium |

---

## 5. PRODUCT DECISIONS

1. **Period navigation**: Keep MONTHLY/YEARLY as internal; display human "SEPTIEMBRE 2026" with ‹ › nav for monthly. Yearly shows "2026". Reuse `financePeriod` utilities.

2. **General limit**: Single limit per context/currency/period. Render as prominent surface (not card). If absent, compact CTA.

3. **Category limits**: Flat rows, sorted by current ordering (scope_type, category_label_snapshot, series_id from backend). No re-sorting.

4. **Create Limit**: Reuse `getQuickFinanceCategories` + full picker from financeCategories.ts. Extract `CategorySelectorSheet` component shared by NewMovementSheet, NewPaymentSheet, SpendingLimitSheet.

5. **Category Management**: New screen `FinanceCategoryManagementScreen`. Segmented Gastos/Ingresos. Two sections: "Del sistema" (native), "Personalizadas" (custom, selectable only). Native rows: no actions (or read-only detail). Custom rows: edit (label only), delete (soft delete with confirmation).

6. **Delete/Archive limits**: Use existing `cancelSpendingLimit` with `THIS_AND_FOLLOWING` — no new delete API. Label "Cancelar límite" (not "Eliminar").

7. **Spending calculation**: Trust backend progress RPC. No frontend computation.

8. **Light/Dark**: Use existing theme tokens (terracotta, semantic colors, tonal families). Verify both modes.

9. **No new tabs**: Entry remains Resumen → Administrar. Category Management only via "Administrar categorías >" from Limits.

---

## 6. IMPLEMENTATION ORDER

1. Extract shared `CategorySelectorSheet` component (quick + full + create)
2. Update `FinanceSpendingLimitsManagementScreen` → new IA (period nav, general surface, flat category rows, empty state, "Administrar categorías" link)
3. Update `SpendingLimitSheet` → progressive form with shared category selector
4. Update `SpendingLimitDetailSheet` → simplified grammar
5. Create `FinanceCategoryManagementScreen` (Gastos/Ingresos, native/custom, CRUD)
6. Update `FinanceSpendingLimitSummary` → match new design language
7. Wire navigation: Limits Main → Category Management
8. Run QA seed with Stage 5 data
9. Static verification (typecheck, lint, focused tests)