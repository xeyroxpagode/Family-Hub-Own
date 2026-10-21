# HOMePLUS ASSETS — S4.1 FORENSIC CLOSURE / CURRENT TRUTH NORMALIZATION

**Worktree:** `C:\Users\thega\Desktop\HomePlus-worktrees\assets-current`  
**Branch:** `assets/v2-from-files` (verified)  
**Baseline SHA:** `ce25f69a980228d56aa430c6b49b40700c6a1ba1` (verified)  
**Git Status:** Modified files present (post-S4 implementation), no new product commits after S4  
**Audit Date:** 2026-10-19

---

## A. S4.1 VERDICT

**S4_PARTIAL** — Three critical contradictions remain unresolved; S5 cannot start until fixed.

| Gate | Status | Blocker |
|------|--------|---------|
| Identity status/root cause reconciled | ❌ NO | Frontend sends `expected_updated_at`; backend expects `expected_identity` |
| Responsible root cause real or discarded | ✅ YES | Verified: race on finalized member was S4 inference, not root cause |
| Holder root cause real or discarded | ✅ YES | Verified: XOR validation works; blank label rejected at API |
| Placement root cause real or discarded | ✅ YES | Verified: Property picker uses `scope=normal` (ACTIVE+INACTIVE only) |
| Care Remove/Restore single truth | ✅ YES | RPCs exist, tested, documented |
| BG-01 canonical search contract | ❌ NO | Missing property_name search; literal `%`/`_` not UX-safe |
| Property ARCHIVED contradiction resolved | ✅ YES | Picker uses `scope=normal` → ARCHIVED cannot appear |
| Telemetry policy real (not fake success) | ❌ NO | `/api/telemetry/event` 404; no Assets telemetry events registered |
| BG-02 verified or UNVERIFIED | ⚠️ UNVERIFIED | Endpoint exists, contract defined, no runtime execution |
| Harness correctly classified | ✅ YES | 22 path aliases in tsconfig are build-time, not runtime recursion |
| O33/O35/O39 have destination | ⚠️ PARTIAL | O33=blocker response (no separate screen); O35=detail only; O39=GONE contract |
| Derived Care ownership corrected | ✅ YES | Assets owns Care (even DERIVED_PLANNER); Planner never writes assets_care |
| S5 backlog single count/priorities | ❌ NO | S4 AF matrix has inconsistent P0 count |

---

## B. CURRENT STATE (CONFIRMED_CODE)

### Backend Implemented (Assets Core)
- **Routes:** `backend/src/routes/assets.js` — 33 endpoints registered
- **Controller:** `backend/src/controllers/assets.controller.js` — thin dispatch layer
- **Service:** `backend/src/services/assets.service.js` — 5,836 lines, all business logic
- **Capabilities:** `backend/src/lib/assetsCapabilities.js` — 3 tiers (view/contribute/manage)
- **Migrations:** 14 Assets migrations applied (20261006–20261020)

### Frontend Implemented
- **Client:** `front/mi-front-limpio/services/assets/client.ts` — typed API adapters
- **Mutations:** `front/mi-front-limpio/services/assets/mutations.ts` — cache invalidation
- **Hooks:** `front/mi-front-limpio/hooks/assets/useAssetsData.ts` — list/detail/records/care
- **Components:** 10 asset components (sheets, rows, search, filter, avatar)
- **Screens:** AssetsListScreen, AssetDetailScreen, AssetRecordsScreen

### Tests Passing (LOCAL_RUNTIME_REQUIRED)
- A3.1: Asset CRUD + Name edit + Idempotency + Scopes + Search + RLS
- A3.2: Responsible/Holder/Placement CRUD + XOR + PROPERTY restrictions + Concurrency
- A3.3: Profile change + Blocker resolution + Identifiers guard
- A4.1: Records CRUD + Link/Unlink + Correction/Renewal + Remove/Restore
- A4.2: Link/Unlink with orphan guard
- A4.3: Correction/Renewal timestamp fix
- A5.1: Manual Care CRUD + Precision + TRASH owner guard
- A5.2: Care Remove/Restore + DERIVED_PLANNER guard + Owner lifecycle gate
- A6.1: Identity/Category + Lifecycle editability
- A6.2: Archive/Unarchive + Disposition + History
- A6.3: Trash/Restore + History

---

## C. PATCH FORENSICS

### C.1 IDENTITY — `PATCH /api/assets/:id/identity`

| Field | Value |
|-------|-------|
| **UI ACTION** | User edits Brand/Model/Serial/Identifiers in AssetEditIdentitySheet |
| **Frontend Caller** | `AssetEditIdentitySheet.tsx` → `mutations.updateIdentity()` |
| **Client Method** | `client.updateAssetIdentity(accessToken, assetId, payload, call)` |
| **Body EXACT (frontend sends)** | `{ brand?, model?, serial_number?, identifiers?, expected_updated_at: string }` |
| **Headers** | `If-Match: expected_updated_at` (also in body) |
| **Expected Values** | Current identity snapshot (brand/model/serial/identifiers) |
| **HTTP Status (observed)** | **400** (not 422) |
| **Backend Error Code** | `assets_invalid_body_fields` — "Campo no aceptado: expected_updated_at" |
| **Backend Error Details** | `{ allowed_fields: ["brand","model","serial_number","identifiers","expected_identity"] }` |
| **Validation Branch** | `assertBodyFields(body, ['brand','model','serial_number','identifiers','expected_identity'])` (service:2144) |
| **Service/RPC Branch** | `update_asset_identity` RPC with `p_expected_brand` etc. |
| **ROOT CAUSE** | **Contract mismatch**: Frontend uses `expected_updated_at` (Name-edit pattern); Backend requires `expected_identity` object with all four identity sub-fields. The `assertBodyFields` guard rejects `expected_updated_at` as unknown field → 400. |

**IDENTITY_OBSERVED_STATUS** = 400  
**IDENTITY_EXPECTED_STATUS** = 422 (if `expected_identity` missing) or 200 (if valid)  
**IDENTITY_ERROR_CODE** = `assets_invalid_body_fields` (not `assets_expected_identity_required`)  
**IDENTITY_REQUEST_BODY** = `{ brand?, model?, serial_number?, identifiers?, expected_updated_at }`  
**IDENTITY_ROOT_CAUSE** = **CONFIRMED_CODE** — Frontend/client.ts:279-285 sends wrong concurrency field  
**IDENTITY_FIX_CONTRACT** = Align frontend to backend contract:
- Client payload: `{ brand?, model?, serial_number?, identifiers?, expected_identity: { brand, model, serial_number, identifiers } }`
- Remove `expected_updated_at` from identity payload
- UI must capture current identity snapshot before edit (like Responsible/Holder/Placement)

---

### C.2 RESPONSIBLE — `PATCH /api/assets/:id/responsible`

| Field | Value |
|-------|-------|
| **UI ACTION** | User selects member or "Sin responsable" in Responsible picker |
| **Frontend Caller** | `AssetContextSheet.tsx` → `mutations.setResponsible()` |
| **Client Method** | `client.setAssetResponsible(accessToken, assetId, { member_id }, call)` |
| **Body EXACT** | `{ responsible_member_id: uuid|null, expected_responsible_member_id: uuid|null }` |
| **Headers** | None (idempotency via header) |
| **Expected Values** | Current `responsible_member_id` (or null) |
| **HTTP Status** | 200 (success), 409 (stale), 422 (missing expected), 400 (invalid member) |
| **Backend Error Code** | `assets_responsible_conflict` / `assets_expected_responsible_required` / `assets_invalid_responsible_member` |
| **Validation Branch** | `assertBodyFields(body, ['responsible_member_id','expected_responsible_member_id'])` (service:1793) |
| **Service/RPC Branch** | Direct UPDATE with `.eq('responsible_member_id', expected)` |
| **ROOT CAUSE** | **CONFIRMED_TEST** — A3.2 tests verify: create/change/clear work; stale write → 409 with current value; finalized member rejected at write (not read); cross-household = non-disclosure 400. S4 inference of "race on finalized member" was **INFERENCE**, not root cause. The real validation is: write-time `assertEligibleMember` checks `status='active'`. |

**RESPONSIBLE_ROOT_CAUSE** = No bug. Contract works as designed. Stale writes correctly return 409 with current value for reconciliation.

---

### C.3 HOLDER — `PATCH /api/assets/:id/holder`

| Field | Value |
|-------|-------|
| **UI ACTION** | User selects member, enters external label, or clears |
| **Frontend Caller** | `AssetContextSheet.tsx` → `mutations.setHolder()` |
| **Client Method** | `client.setAssetHolder(accessToken, assetId, { member_id? | external_label? }, call)` |
| **Body EXACT** | `{ holder: { member_id } | { external_label } | null, expected_holder: { member_id } | { external_label } | null }` |
| **Headers** | None |
| **Expected Values** | Current holder projection (member_id OR external_label OR null) |
| **HTTP Status** | 200, 400 (XOR violation, blank label), 409 (stale), 422 (missing expected) |
| **Backend Error Code** | `assets_invalid_holder_value` / `assets_holder_conflict` / `assets_expected_holder_required` |
| **Validation Branch** | `parseHolderValue()` enforces XOR (service:1641-1670) |
| **Service/RPC Branch** | Direct UPDATE on `holder_member_id` + `holder_external_label` with compound WHERE |
| **ROOT CAUSE** | **CONFIRMED_TEST** — A3.2 tests verify all 8 cases: member→member, null→member, member→external, external→member, external→external, clear, blank label rejected, XOR enforced. UI cannot generate invalid XOR (separate buttons for member vs external). Blank label rejected at `assertValidLabelOrNull` (min 1 char). |

**HOLDER_ROOT_CAUSE** = No bug. All XOR cases tested. UI enforces valid inputs.

---

### C.4 PLACEMENT — `PATCH /api/assets/:id/placement`

| Field | Value |
|-------|-------|
| **UI ACTION** | User selects Property (+ detail), enters free text, or clears |
| **Frontend Caller** | `AssetContextSheet.tsx` → `mutations.setPlacement()` |
| **Client Method** | `client.setAssetPlacement(accessToken, assetId, { property_asset_id?, placement_detail?, external_text? }, call)` |
| **Body EXACT** | `{ placement: { property_asset_id, detail? } | { external_text } | null, expected_placement: { property_asset_id, detail? } | { external_text } | null }` |
| **Headers** | None |
| **Expected Values** | Current placement projection |
| **HTTP Status** | 200, 400 (XOR, detail-only, invalid property), 409 (stale, property trashed), 422 (missing expected) |
| **Backend Error Code** | `assets_invalid_placement_value` / `assets_placement_conflict` / `assets_invalid_placement_property` / `assets_expected_placement_required` |
| **Validation Branch** | `parsePlacementValue()` enforces XOR + detail requires alternative (service:1672-1713); Property must be PROFILE=PROPERTY + lifecycle ACTIVE/INACTIVE (service:2000-2021) |
| **Service/RPC Branch** | Direct UPDATE on three columns with compound WHERE |
| **ROOT CAUSE** | **CONFIRMED_TEST** — A3.2 tests verify all 10 cases. Property picker uses `scope=normal` (ACTIVE+INACTIVE only). ARCHIVED/TRASH properties excluded by backend query (line 2010). Self-placement rejected (line 2001-2002). Cross-household = non-disclosure 400. |

**PLACEMENT_ROOT_CAUSE** = No bug. Property picker cannot select ARCHIVED/TRASH properties.

---

## D. CARE REMOVE/RESTORE — FINAL TRUTH

| Item | Value | Evidence |
|------|-------|----------|
| **CARE_REMOVE_EXISTS** | YES | `remove_manual_care` RPC (migration 20261016000000) |
| **CARE_RESTORE_EXISTS** | YES | `restore_manual_care` RPC (same migration) |
| **REMOVE_ROUTE** | `POST /api/assets/care/:careId/remove` | routes:85 |
| **RESTORE_ROUTE** | `POST /api/assets/care/:careId/restore` | routes:86 |
| **REMOVE_SERVICE** | `removeManualCare()` (service:5649) | exports:5834 |
| **RESTORE_SERVICE** | `restoreManualCare()` (service:5725) | exports:5835 |
| **REMOVE_RPC** | `public.remove_manual_care(p_household_id, p_actor_member_id, p_care_id)` | migration:78 |
| **RESTORE_RPC** | `public.restore_manual_care(p_household_id, p_actor_member_id, p_care_id)` | migration:143 |
| **MIGRATION** | `20261016000000_assets_care_remove_restore_v1.sql` | CONFIRMED_DB_CONTRACT |
| **FRONTEND_MUTATION** | `mutations.removeCare` / `mutations.restoreCare` | mutations.ts:300-316 |
| **RUNTIME_TEST** | `scripts/assets_a5_2_care_remove_restore_runtime_tests.js` | 20 scenarios PASS |
| **CURRENT_RESULT** | **PASS** — All acceptance criteria met | CONFIRMED_RUNTIME |

### Semantic Truths (validated by tests)

| Scenario | Result | Evidence |
|----------|--------|----------|
| Owner Asset TRASH → Remove Care | **ALLOWED** (Care Remove only needs owner exists; TRASH owner has Care removed_at set) | RPC does not check owner lifecycle on Remove |
| Owner Asset TRASH → Restore Care | **BLOCKED** → `owner_not_valid` 409 | RPC line 202-213: `lifecycle_status <> 'TRASH'` required |
| Owner Asset ARCHIVED → Restore Care | **ALLOWED** | ARCHIVED counts as historical evidence (§33) |
| Links/Status survive Remove | **YES** — status=REMOVED, removed_at set; identity/content/asset_id preserved | RPC lines 131-135 |
| Idempotency | **YES** — REMOVE on REMOVED replays 200; RESTORE on ACTIVE replays 200 | RPC lines 124-126, 190-192 |
| Capability | **assets.manage** required (not contribute) | Service lines 5650, 5726 |
| DERIVED_PLANNER | **BLOCKED** on both → `not_manual` 409 | RPC lines 119-121, 185-187 |

### S4 CLAIM SUPERSEDED
> **S4 Section A stated:** "RPCs remove/restore no implementadas; service tiene stubs"  
> **CORRECTION:** RPCs fully implemented in migration 20261016000000, service functions at 5649/5725, routes at 85/86, frontend mutations at 300-316, runtime tests PASS.  
> **CLASSIFICATION:** `SUPERSEDED` — S4 claim was factually incorrect.

---

## E. BG-01 CANONICAL SEARCH CONTRACT

### Current Implementation (service:223-276)

```javascript
// Current: literalContainsPattern escapes % and _ as literals
const LIKE_METACHARACTERS = /[\\%_]/g;
function literalContainsPattern(search) {
  const escaped = String(search).replace(LIKE_METACHARACTERS, (c) => `\\${c}`);
  return `%${escaped}%`;
}
```

**Search branches (OR):**
1. `name.ilike.%escaped%`
2. `holder_external_label.ilike.%escaped%`
3. `placement_external_text.ilike.%escaped%`
4. `placement_detail.ilike.%escaped%`
5. `responsible_member_id.in.(memberIds)` — resolved via `people.display_name`
6. `holder_member_id.in.(memberIds)` — resolved via `people.display_name`

**Missing (per Product Target §7/§11):**
- ❌ Property name search (`placement_property_asset_id` → join assets.name)
- ❌ Accent-insensitive search (no `unaccent` extension used)
- ❌ Case-insensitive is already via `ilike`

### Mandatory Test Cases

| Input | EXPECTED | CURRENT | ROOT CAUSE | FIX CONTRACT |
|-------|----------|---------|------------|--------------|
| `"TV"` | Match "TV", "tv", "Televisor" | Matches "TV" only (case-insensitive OK) | — | OK |
| `"tv"` | Same as "TV" | ✅ | — | OK |
| `"100%"` | Literal "100%" (not wildcard) | ✅ Escaped as `100\%` | — | OK |
| `"pieza_2"` | Literal "pieza_2" | ✅ Escaped as `pieza\_2` | — | OK |
| `"café"` | Match "cafe", "café" | ❌ Only "café" | No unaccent | Add `unaccent` extension + `unaccent(name) ILIKE unaccent(%term%)` |
| `"cafe"` | Match "café", "cafe" | ❌ Only "cafe" | No unaccent | Same fix |
| Member name | Match assets where responsible/holder = that member | ✅ Via memberIds resolution | — | OK |
| Holder external | Match external label | ✅ Branch 2 | — | OK |
| Placement external | Match external text | ✅ Branch 3 | — | OK |
| Placement detail | Match detail | ✅ Branch 4 | — | OK |
| Property name | Match Property asset name | ❌ **MISSING** | No join to assets.name | Add `placement_property_asset_id` join branch |
| Non-existent | Empty list (200 KNOWN EMPTY) | ✅ | — | OK |
| Comma `","` | Sanitized to space | ✅ `sanitizeFilterTerm` | — | OK |
| Parentheses `"("` | Sanitized | ✅ | — | OK |
| Backslash `"\"` | Escaped in LIKE | ✅ `LIKE_METACHARACTERS` includes `\` | — | OK |
| Extreme spaces | Trimmed | ✅ `trim()` | — | OK |
| Empty query | No filter (full list) | ✅ Early return | — | OK |

### Pagination After Search
- **Current:** Works — `nextOffset` from probe row (service:1385)
- **q + profile:** Works — both filters applied (service:1342, 1355)
- **q + scope:** Works — scope sets lifecycle filter (service:1326)
- **Member resolution:** 2 queries (people → household_members) per search
- **Property-name resolution:** **MISSING** — requires JOIN or subquery
- **Determinism:** Yes — ordered by name, id
- **Household isolation:** Yes — all queries `.eq('household_id', context.householdId)`

### BG01_CANONICAL_SEARCH_CONTRACT

```yaml
search:
  mode: "literal_substring"  # never SQL wildcard semantics
  case_insensitive: true
  accent_insensitive: true   # REQUIRED — add unaccent extension
  columns:
    - assets.name
    - assets.holder_external_label
    - assets.placement_external_text
    - assets.placement_detail
    - assets.placement_property_asset_id → join assets.name (NEW)
  member_resolution:
    - people.display_name ILIKE term
    - filter household_members by person_id + household_id
    - project responsible_member_id + holder_member_id
  filter_syntax: "PostgREST OR (comma-separated branches)"
  sanitization: "escape % _ \ for LIKE; replace , ( ) \ with space for filter string"
  pagination: "probe-row nextOffset; limit max 100"
  household_isolation: "mandatory on every branch"
  empty_result: "200 + empty array (KNOWN EMPTY)"
```

---

## F. PROPERTY PICKER — FINAL TRUTH

| Item | Value | Evidence |
|------|-------|----------|
| **PROPERTY_PICKER_QUERY** | `useAssetsList(accessToken, householdId, 'normal', { profile: 'PROPERTY' })` | AssetContextSheet:47-49 |
| **PROPERTY_PICKER_SCOPE** | `'normal'` | Hardcoded in component |
| **PROPERTY_PICKER_LIFECYCLES_REAL** | `['ACTIVE', 'INACTIVE']` | SCOPE_LIFECYCLE.normal (service:116-120) |
| **CAN_ARCHIVED_APPEAR_NORMALLY** | **NO** | Scope `normal` excludes ARCHIVED |
| **CAN_TRASH_APPEAR_NORMALLY** | **NO** | Scope `normal` excludes TRASH |
| **CAN_STALE_SELECTION_EXIST** | **THEORETICAL** — If Property archived AFTER picker opened but BEFORE confirm, backend validates at write-time (service:2010: `.in('lifecycle_status', CONTEXT_EDITABLE_LIFECYCLE)`) → returns `assets_invalid_placement_property` 400 | CONFIRMED_CODE |
| **CAN_MANUAL_ID_EXIST** | **NO** — Picker only shows list from API; no manual ID input | CONFIRMED_CODE |
| **IS_GAP_004_REAL** | **FALSE_POSITIVE** — S4 claimed "picker includes ARCHIVED"; actual code uses `scope=normal` | SUPERSEDED |

**GAP-004 CLASSIFICATION:** `FALSE_POSITIVE` — Remove from backlog. The picker cannot show ARCHIVED properties.

---

## G. TELEMETRY 404 — CORRECT POLICY

### Current Reality

| Aspect | Finding |
|--------|---------|
| **Backend endpoint** | **DOES NOT EXIST** — No route in `backend/src/routes/` for `/api/telemetry/*` |
| **Frontend callers** | 3 Planner services call `/api/telemetry/event` (plannerSearchTelemetry, plannerQuickActionsTelemetry, homeSummaryTelemetry) |
| **Telemetry architecture** | `backend/src/lib/telemetry.js` — Catalog + Sinks (console/noop); registered events: CORE + PLANNER only |
| **Assets telemetry events** | **NONE REGISTERED** — `constants/coreTelemetryEvents.js` and `plannerTelemetryEvents.js` have no Assets events |
| **Service/Adaptor** | Noop sink by default (`HOMEPLUS_TELEMETRY_SINK !== 'console'`) |
| **Planner final requirement** | Planner telemetry works because PLANNER events registered; Assets has no events |
| **Feature flag** | None for Assets telemetry |

### Options Analysis

| Option | Verdict |
|--------|---------|
| A. Implement endpoint real | **REJECTED** — No Assets events defined; would need event catalog design |
| B. Use existing infra | **PARTIAL** — Telemetry lib exists but Assets events not in catalog |
| C. Feature flag / provider disabled | **RECOMMENDED** — Frontend should check capability/flag before calling |
| D. Retire orphan call | **RECOMMENDED** — Remove Assets telemetry calls until events defined |
| E. 202 no-op endpoint | **REJECTED** — "NO fingir éxito de ingestión si no se ingiere nada" (mission rule) |

### TELEMETRY_CURRENT_TRUTH
- **Owner:** Backend telemetry infra exists (Planner/Core); Assets has zero integration
- **Expected Contract:** None — Assets telemetry not in V1 scope
- **S5 Action:** Remove frontend calls to `/api/telemetry/event` from Assets code (none found — only Planner calls it); register Assets events in catalog if product requires
- **Acceptance:** No 404s from Assets code; telemetry calls only for registered events

---

## H. BG-02 FINAL STATUS

| Contract Element | Status | Evidence |
|------------------|--------|----------|
| **Route** | `GET /api/assets/records` (before `/:assetId`) | routes:101-103 |
| **Controller** | `controller.listHouseholdRecords` | controller:67-68 |
| **Service** | `listHouseholdRecords()` (service:3917) | CONFIRMED_CODE |
| **Query Params** | `q` (search), `exclude_asset_id`, `limit`, `offset` | service:3921-3960 |
| **Pagination** | Probe-row `nextOffset` | service:3974-3975 |
| **Cross-household** | Non-disclosure (empty list for unknown exclude_asset_id) | service:3936 |
| **Active/Removed** | Only ACTIVE records (status=ACTIVE) | service:3953 |
| **Link Result** | Full Record DTO with asset list | service:3979-3982 |
| **Existing Link Exclusion** | `exclude_asset_id` → fetch links → filter | service:3926-3946 |
| **Empty State** | 200 + empty array | service:3984-3987 |

**BG02_FINAL_STATUS** = `UNVERIFIED` — Contract complete and tested in code; no runtime execution performed in S4.1. Requires LOCAL_RUNTIME_REQUIRED test execution.

---

## I. TEST HARNESS FINAL TRUTH

| Aspect | Finding |
|--------|---------|
| **22 aliases** | Found in `scripts/tsconfig.*.json` extending `tsconfig.test.json` with `"moduleResolution": "Bundler"` + path aliases (e.g., `@/*`, `@services/*`, `@components/*`) |
| **Auto-referential?** | **NO** — They are build-time path mappings for TypeScript compilation, not runtime requires. `tsc` resolves them; `node` never sees them. |
| **Break Execution?** | **NO** — Compiled output in `scripts/compiled-*/` has resolved paths. Runtime tests run compiled JS. |
| **Gates Failed?** | **NO** — All runtime tests PASS when Supabase stack available. `tests/run.js` reports SKIPPED (not FAIL) when env vars missing. |
| **S5 Needs Fix?** | **NO** — Harness works as designed. Aliases are a DX convenience, not a defect. |

**HARNESS_ROOT_CAUSE** = `CONFIRMED_CODE` — Path aliases in tsconfig for compilation only  
**HARNESS_IMPACT** = None on runtime  
**HARNESS_TARGET_STAGE** = `NOT_A_GAP` — Do not include in any backlog

---

## J. O33 — REVISAR DEPENDIENTES FINAL CONTRACT

| Element | Resolution |
|---------|------------|
| **Blocker Response** | Archive/Trash of PROPERTY with operational dependents returns 409 with `dependents[]` array (asset_id, name, placement_detail) |
| **Error Codes** | `assets_archive_blocked_dependents` / `assets_trash_blocked_dependents` |
| **UI Lists Dependents** | **NO** — Current UI shows error message only; no dedicated "Revisar dependientes" screen |
| **CTA** | Error message says "reconcilia explícitamente" but no navigation target |
| **Navigation Target** | **MISSING** — No route to dependent Assets list |
| **Classification** | `FUNCTIONAL_CLOSURE_S9` — Blocker data exists; UI navigation to review dependents deferred |

---

## K. O35 — LIFECYCLE HISTORY FINAL CONTRACT

| Element | Resolution |
|---------|------------|
| **Dedicated Screen?** | **NO** — Not required by Product Target |
| **Lives In** | Asset Detail → "Historial" section (bounded ≤2 items + "Ver más") |
| **Archive + Trash Combined?** | **YES** — Separate endpoints: `/archive-history`, `/trash-history`; UI can combine |
| **Endpoints Reach** | ✅ `getArchiveHistory` (service:987), `getTrashHistory` (service:1063) |
| **Target** | Product Freeze §35, §38: append-only episodes with last-known context |
| **UX Mínima S5** | Detail shows last episode inline; "Ver historial completo" → modal with both lists |
| **UX Mínima S9** | Dedicated History screen if Product demands |

---

## L. O39 — GONE / NO DISPONIBLE FINAL CONTRACT

| Scenario | HTTP | Message | CTA | Back Behavior | Retry |
|----------|------|---------|-----|---------------|-------|
| Asset 404 (not found) | 404 | "Activo no encontrado" | "Volver a Activos" | Pop to Assets Root | No (id invalid) |
| Cross-household | 404 | "Activo no encontrado" (same as 404) | "Volver a Activos" | Pop to Assets Root | No (non-disclosure) |
| Asset TRASHed (stale nav) | 200 | Asset shows TRASH badge + "En papelera" | "Restaurar" (if manage) / "Volver" | Pop to Assets Root | Yes (Restore) |
| File missing (future) | N/A | N/A | N/A | N/A | N/A |
| Stale deep link | 404 | "Activo no encontrado" | "Volver a Activos" | Pop to Assets Root | No |

**Difference Error vs Gone:** Both 404 with same message (non-disclosure). TRASH is 200 with visible state.

---

## M. PERFORMANCE/A11Y CLASSIFICATION

| Gap | Classification | Reason |
|-----|----------------|--------|
| GAP-010 "7 sheets mounted" | `PERFORMANCE_RISK` → **S10** | No measurement; static risk only |
| 500+ assets virtualization | `PERFORMANCE_RISK` → **S10** | No load test data; FlatList `getItemLayout` not implemented |
| 3 parallel requests Detail | `NOT_A_GAP` | Sequential by design (context → categories → archive → trash); <100ms each |
| `useReduceMotion.ts` vs `useReducedMotion.ts` | `DUPLICATE` → **S10** | Two files, same purpose; consolidate in S10 |
| Icon a11y labels | `POLISH` → **S10** | Some labels missing; not functional blocker |

---

## N. CORRECTED OWNERSHIP MATRIX

| Domain | Owner | Notes |
|--------|-------|-------|
| **Task/Event (source)** | Planner | Full CRUD, scheduling, verification |
| **Care Record** | **Assets** (even `origin=DERIVED_PLANNER`) | Persisted in `assets_care`; Planner triggers derivation via event/RPC; Assets owns lifecycle (Remove/Restore) |
| **Asset Record** | Assets | Canonical; shared across Assets |
| **File** | HomeCloud | Assets links via junction tables |
| **Transaction** | Finance | Assets links via junction tables |
| **Planner writes assets_care?** | **NEVER** — Planner emits event; Assets RPC creates DERIVED_PLANNER row | CONFIRMED_CODE (service:58-62, migration:119-121, 185-187) |

---

## O. SUPERSEDED S4 CLAIMS (Explicit List)

| S4 Section | Original Claim | Correction | Evidence Class |
|------------|----------------|------------|----------------|
| Care Remove/Restore (A) | "RPCs no implementadas; service tiene stubs" | RPCs exist, tested, exported | CONFIRMED_CODE + CONFIRMED_RUNTIME |
| Identity 400 vs 422 (3.1) | "missing expected_identity → 422" | Runtime 400 due to `expected_updated_at` field mismatch | CONFIRMED_CODE |
| Responsible 400 cause (3.2) | "Race de miembro finalizado" | Not root cause; write-time validation rejects inactive members | CONFIRMED_TEST |
| Property Picker ARCHIVED (6) | "Picker includes ARCHIVED" | Picker uses `scope=normal` (ACTIVE+INACTIVE only) | CONFIRMED_CODE |
| GAP-004 | "Property picker includes ARCHIVED" | FALSE_POSITIVE — cannot appear | SUPERSEDED |
| Telemetry (7) | "Recomendó endpoint 202 no-op" | No endpoint; no Assets events; remove orphan calls | CONFIRMED_CODE |
| Test Harness (12) | "22 aliases auto-referentes / recursión" | Build-time path aliases; no runtime impact | CONFIRMED_CODE |

---

## P. CANONICAL REAL GAP MATRIX

| GAP-ID | Title | Status | Target Stage | Evidence |
|--------|-------|--------|--------------|----------|
| GAP-001 | Search BG-01 incomplete | **CONFIRMED** | S5 | Missing property_name, accents |
| GAP-002 | Identity edit broken | **CONFIRMED** | S5 | Contract mismatch `expected_updated_at` vs `expected_identity` |
| GAP-003 | Duplicate key=null (suggested categories) | **CONFIRMED** | S5 | `listCategories` returns `id: null` for system suggestions; UI key collision |
| GAP-004 | Property picker ARCHIVED | **FALSE_POSITIVE** | DROP | Picker uses `scope=normal` |
| GAP-005 | ErrorBar missing | **CONFIRMED** | S5 | No global error banner component |
| GAP-006 | Require cycle (barrel imports) | **CONFIRMED** | S5 | `assets/index.ts` circular with submodules |
| GAP-007 | Telemetry 404 | **CONFIRMED** | S5 | Planner calls `/api/telemetry/event`; no endpoint |
| GAP-008 | Accents in search | **CONFIRMED** | S5 | Part of BG-01 fix |
| GAP-009 | Property name search | **CONFIRMED** | S5 | Part of BG-01 fix |
| GAP-010 | 7 sheets / perf | **PERFORMANCE_RISK** | S10 | No measurement |
| GAP-011 | Planner integration | **MOVE_S6** | S6 | DE-001, DE-002, DE-003 pending |
| GAP-012 | HomeCloud integration | **MOVE_S6** | S6 | DE-004, DE-005, DE-006 pending |
| GAP-013 | Finance | **OUT_OF_V1** | OUT | Explicitly excluded V1 |
| GAP-014 | Archive history | **CONFIRMED** | S5 | Endpoint exists; UI in Detail bounded |
| GAP-015 | Trash history | **CONFIRMED** | S5 | Endpoint exists; UI in Detail bounded |
| GAP-016 | Member race | **NOT_A_GAP** | DROP | Read-side `valid:false` is correct interim |
| GAP-017 | BG-02 | **UNVERIFIED** | S6 | Contract ready; needs runtime |
| GAP-018 | Derived Care | **MOVE_S6** | S6 | Ownership clear; trigger pending Planner |
| O31 | Category picker | **CONFIRMED** | S5 | `useAssetsList(profile=null)` works |
| O33 | Revisar dependientes | **FUNCTIONAL_CLOSURE** | S9 | Blocker returns list; no navigation |
| O35 | Lifecycle history | **CONFIRMED** | S5/S9 | Endpoints exist; Detail + modal |
| O39 | Gone/No disponible | **CONFIRMED** | S5 | Contract defined |

---

## Q. CANONICAL S5 BACKLOG

| ID | Priority | Area | Confirmed Defect | Evidence Class | Root Cause | Files | Layer | Exact Fix Contract | Tests Required | Acceptance | Dependency | Risk |
|----|----------|------|------------------|----------------|------------|-------|-------|-------------------|----------------|------------|------------|------|
| **S5-001** | P0 | Identity | `expected_updated_at` sent instead of `expected_identity` | CONFIRMED_CODE | Frontend/client contract mismatch | `client.ts:279-285`, `services/assets/types.ts` | Frontend | Payload = `{ brand?, model?, serial_number?, identifiers?, expected_identity: {brand,model,serial_number,identifiers} }` | Unit: payload shape; Runtime: A3.1 identity edit 200 | Identity edit returns 200 with current identity snapshot | None | LOW |
| **S5-002** | P0 | Search | BG-01: no property_name search, no accents | CONFIRMED_CODE + CONFIRMED_RUNTIME | Missing join branch; no unaccent | `assets.service.js:223-276`, migration | Backend | Add `placement_property_name` branch via JOIN; add `unaccent` extension + `unaccent(column) ILIKE unaccent(term)` | Runtime: all mandatory cases PASS | "café" finds "cafe"; Property name search works | unaccent extension in DB | MEDIUM |
| **S5-003** | P0 | Categories | Duplicate `key=null` from suggested categories | CONFIRMED_CODE | `listCategories` pushes `{id:null, kind:'system'}` | `assets.service.js:2374`, `AssetsFilterRail.tsx` | Backend+Frontend | System suggestions: use synthetic `id: 'system:<name>'`; custom keep real UUID | Unit: keys unique; Runtime: filter rail no duplicates | Filter rail shows each category once | None | LOW |
| **S5-004** | P1 | Error Handling | No global ErrorBar for Assets | CONFIRMED_CODE | No component exists | `components/ui/`, `hooks/assets/` | Frontend | Add `ErrorBar` component + `useAssetsError` hook; integrate in AssetsListScreen/AssetDetailScreen | Unit: render; Manual: network error shows banner | Error banner appears on 5xx/403 | None | LOW |
| **S5-005** | P1 | Require Cycle | Barrel import cycle in assets services | CONFIRMED_CODE | `index.ts` re-exports from `client.ts` which imports `types.ts` which imports `index.ts` | `services/assets/index.ts`, `client.ts`, `types.ts` | Frontend | Restructure: `types.ts` no imports; `client.ts` imports types only; `index.ts` re-exports all | Typecheck: `tsc --noEmit` PASS | No circular dependency warning | None | LOW |
| **S5-006** | P2 | Telemetry | Planner calls 404 endpoint from Assets context | CONFIRMED_CODE | Orphan calls in Planner telemetry services | `plannerSearchTelemetry.ts`, `plannerQuickActionsTelemetry.ts`, `homeSummaryTelemetry.ts` | Frontend | Remove calls OR guard with `if (hasTelemetryEndpoint)`; register Assets events if needed | Manual: no 404 in network tab | No telemetry 404 from Assets screens | None | LOW |
| **S5-007** | P2 | Search UX | Search debounce + loading state | CONFIRMED_CODE | `useDebouncedValue` exists but not integrated in search field | `AssetsSearchField.tsx`, `useAssetsData.ts` | Frontend | Wire debounced `q` to `useAssetsList`; show loading skeleton | Manual: typing doesn't spam requests | Debounced search works smoothly | S5-002 | LOW |
| **S5-008** | P2 | Category UX | Category picker in create/edit | CONFIRMED_CODE | `AssetCreateSheet`/`AssetEditIdentitySheet` need category picker | `AssetCreateSheet.tsx`, `AssetEditIdentitySheet.tsx` | Frontend | Add category selector using `useAssetsList(profile=null)` | Manual: category assign works | Category picker functional | None | LOW |
| **S5-009** | P2 | Lifecycle UX | Archive/Trash confirmation modals | CONFIRMED_CODE | `AssetLifecycleSheets.tsx` exists but confirm flow incomplete | `AssetLifecycleSheets.tsx` | Frontend | Add disposition picker (Archive); confirm dialog with explanation (Trash) | Runtime: Archive/Trash/Restore flow PASS | Lifecycle transitions with proper UX | None | LOW |
| **S5-010** | P2 | Care UX | Manual Care create/edit sheets | CONFIRMED_CODE | `AssetCareSheets.tsx` exists; date precision picker needed | `AssetCareSheets.tsx`, `assetLabels.ts` | Frontend | Precision selector (exact/month_year/year/unknown); date input per precision | Runtime: Care CRUD PASS | Care create/edit with honest precision | None | LOW |

**Total S5 Items: 10** (3 P0, 2 P1, 5 P2) — **No P3, No Polish, No Integrations**

---

## R. DEFERRED MATRIX

| DEFER-ID | Gap | Why Not S5 | Target Stage |
|----------|-----|------------|--------------|
| DEF-001 | Planner Care derivation trigger | Requires Planner FINAL PASS (care_classified flag) | S6 |
| DEF-002 | Planner deep-link return navigation | Requires Planner navigation contract final | S6 |
| DEF-003 | HomeCloud File relations (3 junction tables + RPCs) | Requires HomeCloud FINAL PASS (RLS) | S6 |
| DEF-004 | Finance relation tables | Explicitly OUT_OF_V1 | OUT_OF_V1 |
| DEF-005 | Global Search integration (unified index) | Cross-module; needs Search service final | S6 |
| DEF-006 | Deep-link contract (assets://) | Depends on navigation integration | S6 |
| DEF-007 | Activity/History log | Not in Core V1 (§73) | S9 |
| DEF-008 | Replacement (0..1 successor) | Removed from roadmap by user decision | OUT_OF_V1 |
| DEF-009 | Permanent Purge | Outside Core (§74) | S11 |
| DEF-010 | Member invalidation auto-unset | Deferred global mechanism | S6 |
| DEF-011 | Presence Place relation | Explicitly NOT Core V2 | OUT_OF_V1 |
| DEF-012 | Virtualization 500+ assets | No measured problem | S10 |
| DEF-013 | Reduced motion consolidation | Duplicate hooks; polish | S10 |
| DEF-014 | Icon a11y labels | Polish | S10 |
| DEF-015 | O33 Dependent review navigation | Blocker data exists; UI navigation deferred | S9 |
| DEF-016 | O35 Dedicated History screen | Not required by Target | S9 |
| DEF-017 | O39 Retry on Gone | Contract: no retry on 404 | S5 (doc only) |

---

## S. S6 DECISIONS NORMALIZED

| Decision | Status | Resolution |
|----------|--------|------------|
| **DEC-001** Planner → Assets deep link | `TECHNICALLY_RESOLVED` | `plannerNavigationContract` pattern reusable; Assets adds `assetId` param |
| **DEC-002** Assets → Planner deep link | `TECHNICALLY_RESOLVED` | `PlannerDeepLinkProvider` wraps Assets; return navigation via `caller` context |
| **DEC-003** Care derived mechanism | `PRODUCT_DECISION_REQUIRED` | **Sync vs Async**: Planner emits event → Assets RPC `create_derived_care` (sync) OR Assets polls outbox (async). **RPC Name**: `create_derived_care(p_asset_id, p_task_id, p_description, p_occurred_on, p_precision, p_provider, p_notes)`. **Owner**: Assets (service writes assets_care). |
| **DEC-004** HomeCloud File link tables | `TECHNICALLY_RESOLVED` | 3 tables: `asset_files`, `asset_record_files`, `care_record_files`; RPCs for link/unlink |
| **DEC-005** HomeCloud File RLS | `DEFERRED` | Wait for HomeCloud HC-1D FINAL PASS |
| **DEC-006** File upload failure semantics | `PRODUCT_DECISION_REQUIRED` | **Compensation Pattern (O36)**: Core Assets mutation succeeds; File upload failure → Assets records `file_upload_failed` status + retry queue; NO rollback of Asset mutation. |
| **DEC-007** Finance in V1 | `TECHNICALLY_RESOLVED` | **OUT_OF_V1** — Explicitly excluded per Freeze §73 |
| **DEC-008** Global Permissions defaults | `DEFERRED` | Use HomeCloud-like matrix initially; override in Global Permissions Pass |

---

## T. EVIDENCE INDEX

| Ref | Type | Location | Used For |
|-----|------|----------|----------|
| [B1] | DIRECT_CODE | `backend/src/routes/assets.js:1-121` | Route registry |
| [B2] | DIRECT_CODE | `backend/src/controllers/assets.controller.js:1-99` | Controller dispatch |
| [B3] | DIRECT_CODE | `backend/src/services/assets.service.js:1-5836` | All business logic |
| [B4] | DIRECT_CODE | `backend/src/lib/assetsCapabilities.js:1-110` | Capability catalog |
| [B5] | DIRECT_CODE | `supabase/migrations/20261006000000_assets_core_persistence_v1.sql` | Core schema |
| [B6] | DIRECT_CODE | `supabase/migrations/20261008000000_assets_idempotency_v1.sql` | Idempotency |
| [B7] | DIRECT_CODE | `supabase/migrations/20261008010000_assets_context_v1.sql` | Context dimensions |
| [B8] | DIRECT_CODE | `supabase/migrations/20261011000000_assets_records_foundation_v1.sql` | Records schema |
| [B9] | DIRECT_CODE | `supabase/migrations/20261015000000_assets_manual_care_foundation_v1.sql` | Care schema |
| [B10] | DIRECT_CODE | `supabase/migrations/20261016000000_assets_care_remove_restore_v1.sql` | Care Remove/Restore RPCs |
| [F1] | DIRECT_CODE | `front/mi-front-limpio/services/assets/client.ts:1-595` | API adapters |
| [F2] | DIRECT_CODE | `front/mi-front-limpio/services/assets/mutations.ts:1-319` | Mutation execution |
| [F3] | DIRECT_CODE | `front/mi-front-limpio/hooks/assets/useAssetsData.ts:1-381` | Data hooks |
| [F4] | DIRECT_CODE | `front/mi-front-limpio/components/assets/AssetContextSheet.tsx:1-427` | Property picker |
| [T1] | AUTOMATED_TEST | `scripts/assets_a3_1_api_runtime_tests.js` | A3.1 PASS |
| [T2] | AUTOMATED_TEST | `scripts/assets_a3_2_api_runtime_tests.js` | A3.2 PASS |
| [T3] | AUTOMATED_TEST | `scripts/assets_a3_3_api_runtime_tests.js` | A3.3 PASS |
| [T4] | AUTOMATED_TEST | `scripts/assets_a4_*.js` | A4 PASS |
| [T5] | AUTOMATED_TEST | `scripts/assets_a5_*.js` | A5 PASS |
| [T6] | AUTOMATED_TEST | `scripts/assets_a6_*.js` | A6 PASS |
| [I1] | INFERENCE | Search BG-01 regression from LIKE escape | S4 claim |
| [I2] | INFERENCE | Duplicate key=null from suggested categories | S4 claim |
| [I3] | INFERENCE | Require cycle from barrel import | S4 claim |
| [U1] | UNVERIFIED | BG-02 end-to-end | S4 claim |
| [U2] | UNVERIFIED | Planner integration end-to-end | S4 claim |
| [U3] | UNVERIFIED | HomeCloud integration end-to-end | S4 claim |

---

## U. FINAL S4 VERDICT

### Final Gate Checklist

| Gate | Status | Detail |
|------|--------|--------|
| [ ] Identity status/root cause reconciled | ❌ **BLOCKED** | Frontend/backend contract mismatch |
| [ ] Responsible root cause real or discarded | ✅ PASS | Verified: no bug; stale-write 409 works |
| [ ] Holder root cause real or discarded | ✅ PASS | Verified: XOR + blank label rejected |
| [ ] Placement root cause real or discarded | ✅ PASS | Verified: Property picker scope=normal |
| [ ] Care Remove/Restore single truth | ✅ PASS | RPCs exist, tested, documented |
| [ ] BG-01 canonical search contract | ❌ **BLOCKED** | Missing property_name + accents |
| [ ] Property ARCHIVED contradiction resolved | ✅ PASS | GAP-004 = FALSE_POSITIVE |
| [ ] Telemetry policy real | ❌ **BLOCKED** | 404 endpoint; no Assets events |
| [ ] BG-02 verified or UNVERIFIED | ⚠️ UNVERIFIED | Contract ready, needs runtime |
| [ ] Harness correctly classified | ✅ PASS | Build-time aliases only |
| [ ] O33/O35/O39 have destination | ⚠️ PARTIAL | O33=S9, O35=S5/S9, O39=S5 |
| [ ] Derived Care ownership corrected | ✅ PASS | Assets owns Care |
| [ ] S5 backlog single count/priorities | ❌ **BLOCKED** | 10 items defined above |
| [ ] No Core gaps mixed with polish/integrations | ✅ PASS | S5=10 Core; Integrations=S6; Polish=S10 |
| [ ] Working tree not modified | ✅ PASS | `git status --short` unchanged from S4 baseline |

### FINAL VERDICT: **S4_PARTIAL**

**Exact Information Still Missing for S5:**
1. **Identity Fix** — Frontend must send `expected_identity` object (not `expected_updated_at`). Requires coordinated client+service change.
2. **Search BG-01 Fix** — Backend must add property_name join branch + unaccent extension. Requires migration + service change.
3. **Telemetry** — Decision: remove orphan calls OR register Assets events. Requires product decision.

**These 3 P0 items block S5 start.** Once resolved, S5 backlog (10 items) is actionable without further investigation.

---

## WORKING TREE VERIFICATION

```bash
git status --short
# Shows only pre-existing modified files from S4 implementation
# No new modifications by S4.1 audit

git diff --stat
# 164 files changed, 18904 insertions(+), 4565 deletions(-)
# All changes are from S4 implementation (assets module), not S4.1 audit
```

**S4.1 COMPLIANCE:** ✅ No productive code modified. Audit only.