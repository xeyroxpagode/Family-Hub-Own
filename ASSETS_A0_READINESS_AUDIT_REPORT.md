# HOMePLUS ASSETS A0 READINESS AUDIT REPORT

**Worktree:** `C:\hpa2`  
**Branch:** `assets/from-homecloud-files`  
**Source SHA:** `ce25f69a980228d56aa430c6b49b40700c6a1ba1`  
**Source Branch:** `homecloud/files-lane`  
**Freeze Target:** `HOMePLUS_ASSETS_PRODUCT_FREEZE_V2.0.md`  
**Audit Date:** 2026-10-07

---

## 1. PREFLIGHT SUMMARY (Phase 0)

| Check | Result | Evidence |
|-------|--------|----------|
| `C:\hpf2` exists | ✅ PASS | Backend + `front/mi-front-limpio` present |
| Git toplevel valid | ✅ PASS | Worktree of shared repo at `C:\Users\thega\Desktop\HomePlus-worktrees\Family-Hub-Own-integration` |
| Single repository | ✅ PASS | Both backend & frontend in same worktree |
| Current branch | ✅ `homecloud/files-lane` | `git branch` shows `* homecloud/files-lane` |
| HEAD SHA | ✅ `ce25f69a980228d56aa430c6b49b40700c6a1ba1` | `git rev-parse HEAD` |
| Working tree clean | ✅ PASS | `git status --short` → no output |
| Staged/unstaged/untracked | ✅ NONE | Confirmed clean |
| Common git directory | ✅ `C:/Users/thega/Desktop/HomePlus-worktrees/Family-Hub-Own-integration/.git` | `.git` file points there |
| Registered worktrees | ✅ 7 total | `git worktree list` |
| Branch `assets/from-homecloud-files` exists | ❌ NO (pre-creation) | `git branch -a` no match |
| `C:\hpa2` exists | ❌ NO (pre-creation) | `Test-Path C:\hpa2` → False |
| Processes modifying `C:\hpf2` | ❌ NONE | `Get-Process` no matches |

**GATE 0: PASSED** — All preconditions met.

---

## 2. WORKTREE CREATION VALIDATION (Phase 1)

| Validation | Result | Evidence |
|------------|--------|----------|
| `C:\hpf2` unchanged | ✅ PASS | Still on `homecloud/files-lane` at `ce25f69` |
| `C:\hpa2` created | ✅ PASS | `git worktree add` succeeded |
| `C:\hpa2` at correct SHA | ✅ PASS | `ce25f69a980228d56aa430c6b49b40700c6a1ba1` |
| New branch active | ✅ PASS | `* assets/from-homecloud-files` |
| Backend exists in dest | ✅ PASS | `backend/` with prisma, src, sql |
| Frontend exists in dest | ✅ PASS | `front/mi-front-limpio/` |
| Dest working tree clean | ✅ PASS | `git status --short` → no output |
| No secrets/build artifacts copied | ✅ PASS | No `.env`, no `node_modules` in dest |
| Both worktrees registered | ✅ PASS | `git worktree list` shows both |
| Files can continue on origin | ✅ PASS | Origin untouched |

**GATE 1: PASSED** — New worktree fully valid.

---

## 3. SOURCE MAP — BACKEND

```
C:\hpa2\backend\
├── prisma/
│   └── schema.prisma          # EMPTY — no models defined
├── sql/
│   ├── migration_001_auth_base.sql       # users, households, household_members, invitations
│   ├── migration_002_rls_auth.sql        # grupos_familiares, miembros_grupo, perfiles (legacy)
│   ├── migration_001_verify.sql          # verification script
│   └── rls_test.sql                      # RLS test script
└── src/
    ├── index.js                          # Express entry
    ├── config/
    │   ├── supabase.js
    │   ├── telemetry.js
    │   └── featureFlags.js
    ├── constants/
    │   ├── coreTelemetryEvents.js
    │   ├── householdConstants.js
    │   ├── planner.constants.js
    │   ├── plannerFeatureFlags.js
    │   └── finance.constants.js
    ├── controllers/                      # 50+ controller files
    │   ├── homecloud.*.controller.js
    │   ├── planner.*.controller.js
    │   ├── finance.*.controller.js
    │   ├── inventory.controller.js
    │   └── ...
    ├── routes/
    │   ├── auth.js
    │   ├── households.js
    │   ├── homecloud.js                  # /capabilities, /content, /files, /folders, /albums, /register, /upload, /verify, /finalize
    │   ├── planner.js                    # /capabilities, /tasks, /events, /goals, /plans, /schedules, /responsibilities, /trash, /search, /attention, /activity, /calendar, /summary
    │   ├── finance.js                    # /accounts, /categories, /expenses, /incomes, /transfers, /payments, /pools, /spending-limits, /analysis, /trash, /movements
    │   ├── inventory.js                  # /templates, /items, /restock-requests, /alerts
    │   ├── presence.js
    │   └── ...
    ├── services/                         # 40+ service files
    │   ├── homecloud*.service.js
    │   ├── planner.*.service.js
    │   ├── finance.*.service.js
    │   ├── inventory.service.js
    │   ├── presence.*.service.js
    │   └── ...
    ├── lib/
    │   ├── capabilityEngine.js           # Core capability primitives
    │   ├── homecloudCapabilities.js      # HC-1D canonical (view, contribute, organize, delete)
    │   ├── plannerCapabilities.js        # Planner V0.2 canonical (40+ capabilities)
    │   ├── householdPermissions.js       # Global permissions authority
    │   ├── plannerObservability.js
    │   └── ...
    ├── middleware/
    │   ├── authMiddleware.js
    │   ├── authFinalMiddleware.js
    │   ├── errorEnvelopeMiddleware.js
    │   ├── multipartForm.js
    │   └── requestContextMiddleware.js
    ├── domain/
    │   ├── planner.responsibilities.domain.js
    │   └── planner.presets.domain.js
    └── adapters/
        └── planner.presets-drafts.adapters.js
```

**Key Observations — Backend:**
- **No Assets tables/models exist** — Prisma schema empty, no Assets migrations in `supabase/migrations/`
- **Capability engine is mature** — `createCapabilityCatalog`, `projectCapabilities`, `hasCapability`, `assertCapability` reused by HomeCloud & Planner
- **Global permissions authority** — `householdPermissions.js` owns role→capability matrix; modules declare capability IDs only
- **HomeCloud capabilities** — 4 canonical: `homecloud.view`, `homecloud.contribute`, `homecloud.organize`, `homecloud.delete`
- **Planner capabilities** — 40+ canonical across tasks, events, goals, templates, audit, settings
- **RLS patterns established** — Household-scoped via `is_active_household_member(household_id)` helper
- **Trash/Restore pattern** — Implemented in Planner (tasks, events, goals) and Finance (transactions, transfers)
- **Idempotency infrastructure** — `planner_idempotency_keys` table + `idempotencyHelpers.js`
- **Activity/History pattern** — `planner_activity_log` table
- **Deep-link/navigation contracts** — Planner has canonical navigation contract (`plannerNavigationContract.ts`)

---

## 4. SOURCE MAP — FRONTEND

```
C:\hpa2\front\mi-front-limpio\
├── App.tsx
├── index.ts
├── navigation/
│   ├── AppNavigator.tsx            # Auth + Private stacks
│   ├── StandardShell.tsx           # → HomeTabNavigator
│   ├── HomeTabNavigator.tsx        # Bottom tabs: Home, Family, QuickAction, Planner, More
│   ├── SimpleShell.tsx / SimpleNavigator.tsx
│   ├── types.ts                    # All param lists (Auth, Private, HomeTab, More, Planner)
│   ├── plannerNavigationContract.ts
│   ├── plannerNavigationHelpers.ts
│   ├── financeNavigation.ts
│   └── simpleModuleRegistry.ts
├── screens/
│   ├── HomeCoordinador.tsx, HomeAdulto.tsx, HomeAdolescente.tsx, HomeAdultoMayor.tsx
│   ├── HomeCloudScreen.tsx, HomeCloudScannerScreen.tsx
│   ├── FinanceScreen.tsx, FinanceAccountsScreen.tsx, FinancePapeleraScreen.tsx, ...
│   ├── InventarioScreen.tsx
│   ├── PlannerScreen.tsx + 20+ planner detail screens
│   ├── MoreScreen.tsx              # Module cards: HomeCloud, Actividad, Finanzas, Inventario
│   ├── PresenceScreen.tsx
│   └── simple/Simple*.tsx
├── components/
│   ├── ui/                         # 30+ primitive components (AppCard, AppButton, AppScreen, etc.)
│   ├── homecloud/                  # MemoryIntake, FilePicker, Scanner, UploadRuntimeOwner
│   ├── planner/                    # PlannerSheetHost, Presets, QuickActions, Evidence, etc.
│   ├── finance/                    # PoolManagement, AccountSelector, CategorySelector, etc.
│   ├── family/
│   └── experience/
├── services/
│   ├── api.ts                      # Base requestJson with auth
│   ├── homecloudCapabilities.ts    # Frontend capability contract (mirrors backend)
│   ├── inventory.ts                # Typed API client for inventory
│   ├── households.ts
│   ├── planner/                    # 50+ planner service files
│   │   ├── plannerCapabilities.ts
│   │   ├── plannerCache.ts
│   │   ├── plannerKeys.ts
│   │   ├── plannerDeepLinkProvider.tsx
│   │   ├── plannerTasks.ts, plannerEvents.ts, plannerGoals.ts, ...
│   │   └── plannerSearch*.ts
│   ├── finance/                    # financeContext, financeAnalysis, etc.
│   ├── idempotency.ts
│   └── core/capabilities.ts        # Core capability helpers
├── context/
│   ├── AuthContext.tsx
│   ├── HouseholdContext.tsx
│   ├── ExperienceContext.tsx
│   ├── FeatureFlagsContext.tsx
│   └── PlannerSheetContext.tsx
├── storage/
│   ├── plannerDraftAutosaveStorage.ts
│   └── homecloudUploadJobStorage.ts
├── hooks/
├── utils/
├── constants/
│   ├── icons.tsx                   # HomePlusIconName includes 'cube' for assets
│   ├── theme.ts
│   └── plannerFeatureFlags.ts
└── types/
    ├── database.ts
    ├── planner*.ts
    └── react-native-compat.d.ts
```

**Key Observations — Frontend:**
- **No Assets screens/components/services exist**
- **Module entry via "Más" screen** — `MoreScreen.tsx` renders module cards (HomeCloud, Actividad, Finanzas, Inventario)
- **Simple experience registry** — `simpleModuleRegistry.ts` lists modules with optional `requiredCapability`
- **Icons** — `constants/icons.tsx` includes `'cube'` for assets (already reserved)
- **Navigation** — HomeTabNavigator has 5 tabs; MoreStack has 12 screens including Inventory, Finance, HomeCloud, Presence
- **Capability-aware UI** — HomeCloud & Planner use cached capability projections for UX gating
- **Deep-link provider** — `PlannerDeepLinkProvider` wraps tab navigator
- **Sheet/Modal pattern** — `PlannerSheetProvider` + `PlannerSheetHost` for contextual actions

---

## 5. CURRENT STATE OF ASSETS

| Dimension | Status | Evidence |
|-----------|--------|----------|
| Database tables | ❌ NONE | No Assets migrations in `supabase/migrations/`; Prisma empty |
| Backend routes | ❌ NONE | No `assets.js` in routes; no Assets controllers |
| Backend services | ❌ NONE | No Assets services in `src/services/` |
| Frontend screens | ❌ NONE | No Assets screens in `screens/` |
| Frontend components | ❌ NONE | No Assets components in `components/` |
| Frontend services | ❌ NONE | No Assets services in `services/` |
| Navigation | ❌ NONE | No Assets param types in `navigation/types.ts`; not in MoreStack or SimpleModuleRegistry |
| Capabilities | ❌ NONE | No `assetsCapabilities.js` in backend lib; no frontend capability contract |
| Types | ❌ NONE | No Assets types in `types/` |
| Icons | ✅ RESERVED | `constants/icons.tsx` line 59: `assets: 'cube'` |

**VERIFIED FACT:** Assets module does not exist in codebase. Only the icon name is reserved.

---

## 6. REUSE / ADAPT / CREATE / WAIT / REMOVE MATRIX

### 6.1 Domain Model (Freeze §4-§13)

| Freeze Requirement | Classification | Evidence / Location |
|-------------------|----------------|---------------------|
| 3 Core Primitives: Asset, Asset Record, Care Record | **CREATE** | No tables exist |
| 4 System Profiles: STANDARD, VEHICLE, PET, PROPERTY | **CREATE** | No profile enum/type |
| Identity Mínima: Name + Profile | **CREATE** | No Asset create endpoint |
| Responsible (0..1 Member) | **CREATE** | No column/relation |
| Holder (0..1 Member or external label) | **CREATE** | No column/relation |
| Placement (Property+detail OR free-text) | **CREATE** | No column/relation |
| PROPERTY exception (no Holder/Placement) | **CREATE** | No logic |
| Independent R/H/P dimensions | **CREATE** | No validation logic |

### 6.2 Asset Records (Freeze §14-§16)

| Freeze Requirement | Classification | Evidence / Location |
|-------------------|----------------|---------------------|
| Record Types: WARRANTY, INSURANCE, REGISTRATION, INSPECTION, SERVICE_CONTRACT, OTHER | **CREATE** | No enum |
| Shared Record (canonical, 1..N Assets) | **CREATE** | No junction table |
| Correction ≠ Renewal | **CREATE** | No logic |
| Shared Renewal selects subset | **CREATE** | No logic |
| Active Record requires ≥1 Asset | **CREATE** | No constraint |

### 6.3 Care Records (Freeze §17-§19)

| Freeze Requirement | Classification | Evidence / Location |
|-------------------|----------------|---------------------|
| Care = factual past, 1 Asset | **CREATE** | No table |
| Date precision (exact/month_year/year/unknown) | **CREATE** | No precision column |
| Care ↔ Planner contract (Care-classified only) | **WAIT — PLANNER FINAL PASS** | Planner has `care` classification in tasks? Need verify |
| Verification-gated derivation | **WAIT — PLANNER FINAL PASS** | Planner has `verify` capability |
| Multi-Asset Task → no inferred Care | **CREATE** | Guard logic needed |
| Planner Reopen reconciles lineage | **WAIT — PLANNER FINAL PASS** | Planner has reopen |

### 6.4 Cross-Module Ownership (Freeze §20-§23)

| Freeze Requirement | Classification | Evidence / Location |
|-------------------|----------------|---------------------|
| Planner owns Task/Event/Recurrence | **REUSE** | Planner fully implemented |
| Finance owns monetary truth | **REUSE** | Finance fully implemented |
| HomeCloud owns Files | **REUSE** | HomeCloud HC-1A through HC-1F implemented |
| Inventory boundary (fungible vs identifiable) | **REUSE** | Inventory module exists |
| Relation ≠ duplication/ownership transfer | **CREATE** | Contract enforcement needed |

### 6.5 Household / Search / Navigation (Freeze §24-§28, §46-§50)

| Freeze Requirement | Classification | Evidence / Location |
|-------------------|----------------|---------------------|
| Household scoping (1 Asset = 1 Household) | **REUSE** | Pattern: `is_active_household_member(household_id)` in Inventory, HomeCloud, Planner |
| Member invalidation handling | **REUSE** | `householdPermissions.js` handles role/status; Planner has responsibilities pause/archive |
| Presence boundary (no GPS tracking) | **REUSE** | Presence module exists; no Asset-Placement coupling |
| Home summarizes/deep-links | **REUSE** | Home screens exist; deep-link pattern in Planner |
| Global Search permission-filtered | **REUSE** | Planner search exists; pattern established |
| Scopes: normal (ACTIVE+INACTIVE), Archived, Trash | **ADAPT** | Lifecycle states need implementation |
| Module entry: Más → Activos → Assets Root | **CREATE** | Add to MoreScreen + SimpleModuleRegistry |
| Caller-aware Back | **REUSE** | PlannerDeepLinkProvider pattern |
| Cross-module create return | **REUSE** | Planner/Finance/HomeCloud create→return pattern |
| Addressable targets: Asset, Record, Care | **CREATE** | Deep-link routes needed |
| Direct external deep link | **CREATE** | Revalidation logic needed |

### 6.6 Lifecycle (Freeze §30-§42)

| Freeze Requirement | Classification | Evidence / Location |
|-------------------|----------------|---------------------|
| ACTIVE ↔ INACTIVE ↔ ARCHIVED ↔ TRASH | **CREATE** | No lifecycle column/enum |
| Archive prerequisites (inspect→resolve→revalidate→commit) | **CREATE** | No blocker resolution logic |
| Disposition (SOLD, GIFTED, DISPOSED, LOST, STOLEN, REPLACED, DECEASED, OTHER) | **CREATE** | No disposition enum |
| Unarchive → previous valid lifecycle | **CREATE** | No restore logic |
| Trash prerequisites | **CREATE** | No blocker resolution |
| Restore → previous valid lifecycle | **CREATE** | No restore logic |
| Replacement (0..1 successor, acyclic) | **CREATE** | No replacement table |
| Property lifecycle ≠ cascade | **CREATE** | No Property profile logic |
| Record/Care recoverable remove/restore | **CREATE** | No soft-delete pattern for Records/Care |

### 6.7 Permissions (Freeze §43-§45)

| Freeze Requirement | Classification | Evidence / Location |
|-------------------|----------------|---------------------|
| VIEW / CONTRIBUTE / MANAGE | **CREATE** | Need 3 capability tiers in Global Permissions |
| MANAGE ⇒ CONTRIBUTE ⇒ VIEW | **ADAPT** | Capability engine supports hierarchy |
| Cross-module permission composition | **REUSE** | `resolveHouseholdCapabilities` pattern |
| Shared Record authority (all targets) | **CREATE** | No shared record logic |

### 6.8 UX / Navigation (Freeze §60-§71)

| Freeze Requirement | Classification | Evidence / Location |
|-------------------|----------------|---------------------|
| Assets Root: search-first, filters (Todos, Objetos, Vehículos, Mascotas, Propiedades) | **CREATE** | No Assets Root screen |
| Create UX: Name + Profile minimum | **CREATE** | No create flow |
| Detail hierarchy: IDENTIDAD → PERSONAS Y UBICACIÓN → PRÓXIMO → DATOS Y DOCUMENTOS → HISTORIAL | **CREATE** | No Detail screen |
| Detail+: 3 intents (Guardar info, Registrar cuidado, Programar) | **CREATE** | No Detail+ pattern |
| Progressive disclosure | **REUSE** | UI primitives exist (AppCard, ActionSheet, etc.) |
| Bounded Detail (Upcoming ≤2, Info ≤3, History ≤2) | **CREATE** | No bounded rendering logic |
| Empty/Error semantics (KNOWN EMPTY / INACCESSIBLE / FAILED TO LOAD) | **REUSE** | `EmptyState.tsx`, `ErrorState.tsx` exist |
| Dirty forms protection | **REUSE** | Planner draft autosave pattern |
| Destructive UX (explanation not just "sure?") | **REUSE** | Planner trash/archive modals pattern |
| Shared Record destructive distinction | **CREATE** | No shared record UI |
| Lifecycle copy (Inactivo/Archivar/Papelera) | **CREATE** | No lifecycle UI |
| Accessibility floor | **REUSE** | UI primitives accessible |

### 6.9 Reliability / Conflict (Freeze §51-§59)

| Freeze Requirement | Classification | Evidence / Location |
|-------------------|----------------|---------------------|
| Primary operation rule (primary success + secondary failure → primary survives) | **REUSE** | Planner/Finance composition pattern |
| Partial success explanation | **REUSE** | Error envelope pattern |
| Idempotence | **REUSE** | `planner_idempotency_keys` + `idempotencyHelpers.js` |
| Timeout/unknown outcome reconciliation | **REUSE** | Planner attention/outbox pattern |
| Offline mutation ≠ confirmed | **REUSE** | Draft autosave pattern |
| Stale writes / concurrency (dimension-level) | **CREATE** | Need optimistic locking per dimension |
| Destructive revalidation | **REUSE** | Archive/trash prerequisite pattern |
| Permission revoked mid-flow | **REUSE** | AuthFinalMiddleware revalidates |
| Household switch mid-flow | **REUSE** | HouseholdContext + navigation guards |

### 6.10 Explicitly NOT Core V2 (Freeze §73) — Confirm Absence

| Excluded Feature | Current Status | Verdict |
|------------------|----------------|---------|
| Additional Responsible Members | Not implemented | ✅ CONFIRMED ABSENT |
| Presence Place relation | Not implemented | ✅ CONFIRMED ABSENT |
| Formal lending/checkout | Not implemented | ✅ CONFIRMED ABSENT |
| MaintenancePlan owned by Assets | Not implemented | ✅ CONFIRMED ABSENT |
| Assets-owned money truth | Not implemented | ✅ CONFIRMED ABSENT |
| Asset-generated Task automatically | Not implemented | ✅ CONFIRMED ABSENT |
| Asset Record as child copy per Asset | Not implemented | ✅ CONFIRMED ABSENT |
| Care inferred from multi-Asset Task | Not implemented | ✅ CONFIRMED ABSENT |
| GPS Asset tracking | Not implemented | ✅ CONFIRMED ABSENT |
| Cross-Household Asset transfer | Not implemented | ✅ CONFIRMED ABSENT |
| ... (all 41 items) | Not implemented | ✅ CONFIRMED ABSENT |

---

## 7. REAL GAP AGAINST FREEZE V2

| Area | Gap Size | Priority |
|------|----------|----------|
| **Database Schema** | 100% — 0 of ~15 tables exist | P0 |
| **Backend API** | 100% — 0 endpoints exist | P0 |
| **Backend Services** | 100% — 0 services exist | P0 |
| **Frontend Screens** | 100% — 0 screens exist | P0 |
| **Frontend Components** | 100% — 0 components exist | P0 |
| **Navigation Integration** | 100% — Not in More/Simple/Tab | P0 |
| **Capabilities** | 100% — Not in Global Permissions | P0 |
| **RLS Policies** | 100% — No tables to protect | P0 |
| **Planner Integration (Care derivation)** | 80% — Planner has verify/reopen but no Care classification | P1 (WAIT) |
| **HomeCloud Integration (File relations)** | 60% — HomeCloud has content ID, but no Asset↔File relation table | P1 (WAIT) |
| **Finance Integration (Expense projection)** | 60% — Finance has transactions, but no Asset↔Transaction relation | P1 (WAIT) |
| **Search Integration** | 100% — No Assets search index | P1 |
| **Activity/History** | 100% — No Assets activity log | P1 |

---

## 8. DEPENDENCY ANALYSIS

### 8.1 Planner (WAIT — PLANNER FINAL PASS)

| Assets Needs | Planner Current State | Gap |
|--------------|----------------------|-----|
| Care-classified Task/Event | Planner has tasks/events with `verify` capability | Need `care` classification flag on tasks |
| Upcoming (next Care work) | Planner has calendar/summary | Need Assets-specific projection |
| Deep links to Task/Event | `plannerNavigationContract` canonical | REUSE — add Asset context |
| Care derivation from Verified completion | Planner has `verifyTask` + `verifyTaskFulfillmentV1` | Need derivation trigger |
| Recurrence for Care scheduling | Planner has `schedules` + `responsibilities` | REUSE — create Care-classified recurring tasks |
| Verification gate | `task.verify` capability exists | REUSE |

**Status:** Planner infrastructure is **READY**. Only needs Assets-specific `care` classification flag and derivation trigger. This is a **Planner FINAL PASS** item, not a blocker for Assets core.

### 8.2 HomeCloud (WAIT — HOMECLOUD FINAL PASS)

| Assets Needs | HomeCloud Current State | Gap |
|--------------|------------------------|-----|
| File canonical identity | `homecloud_contents` table (HC-1A) | REUSE |
| Upload/intake engine | `/register`, `/upload`, `/verify`, `/finalize` | REUSE |
| File relations (File↔Asset, File↔Record, File↔Care) | No relation tables exist | **CREATE** junction tables |
| Viewer/preview | `/content/:id/access` signed URL | REUSE |
| Folders/albums | HC-1B folders, HC-1F albums | REUSE |
| Trash/restore preserves Asset facts | HomeCloud has lifecycle (staging/active/trashed) | REUSE — no cascade |

**Status:** HomeCloud file infrastructure is **READY**. Only needs Assets-specific relation tables. This is a **HomeCloud FINAL PASS** item.

### 8.3 Finance

| Assets Needs | Finance Current State | Gap |
|--------------|----------------------|-----|
| Create expense from Asset/Care | `/expenses` endpoint exists | REUSE — add `asset_id`, `care_id` optional fields |
| Transaction ↔ 0..N Assets | No relation table | **CREATE** junction table |
| Transaction ↔ 0..N Care Records | No relation table | **CREATE** junction table |
| Canonical monetary projection | Finance owns all money truth | REUSE — never duplicate |
| Correction/refund projects truth | `correction`, `refund` endpoints | REUSE |
| Navigate from/to Assets | Deep-link pattern in Finance | REUSE |

**Status:** Finance infrastructure is **READY**. Only needs relation tables. No blocker.

### 8.4 Household / Search / Navigation

| Assets Needs | Current State | Gap |
|--------------|---------------|-----|
| Household scoping | `is_active_household_member` helper used everywhere | REUSE |
| Member invalidation | `householdPermissions` handles role/status | REUSE |
| Global Search | Planner search + HomeCloud search patterns | ADAPT — add Assets to search index |
| Navigation contracts | Planner has canonical contract | ADAPT — create Assets contract |

---

## 9. IMPLEMENTATION READINESS PLAN

### A. CORE INDEPENDENT (Can start immediately — no external dependencies)

| Slice | Objective | Affected Files (Planned) | Reusable Infra | Acceptance Criteria |
|-------|-----------|-------------------------|----------------|---------------------|
| **A1: Domain Schema** | Create Asset, AssetRecord, CareRecord tables with RLS | `supabase/migrations/YYYYMMDD_assets_core.sql`, `backend/prisma/schema.prisma` | `capabilityEngine`, `householdPermissions`, `set_updated_at` trigger, RLS pattern | All 3 primitives queryable; household-scoped; lifecycle enum |
| **A2: Capability Catalog** | Register `assets.view`, `assets.contribute`, `assets.manage` in Global Permissions | `backend/src/lib/householdPermissions.js` (add to DEFAULT), `backend/src/lib/assetsCapabilities.js` (new) | `createCapabilityCatalog`, `projectCapabilities`, `resolveHouseholdCapabilities` | Capabilities resolvable per role; frontend can fetch projection |
| **A3: Asset CRUD** | Create/Read/Update/Delete Asset (Name + Profile minimum) | `backend/src/routes/assets.js`, `backend/src/controllers/assets.controller.js`, `backend/src/services/assets.service.js` | Auth middleware, error envelope, capability assertions | `POST /api/assets` with `{name, profile}` → 201; RLS enforced |
| **A4: Asset Records CRUD** | Create/Read/Update/Delete Records (shared, Correction vs Renewal) | `backend/src/services/assetRecords.service.js`, controllers, routes | Idempotency helpers, capability engine | Shared Record links 1..N Assets; Correction preserves; Renewal creates new validity |
| **A5: Care Records CRUD** | Manual Care create/read/update/restore (factual, 1 Asset) | `backend/src/services/careRecords.service.js`, controllers, routes | Idempotency, date precision enum | Care with precision; restore blocked if Asset Trashed |
| **A6: Lifecycle Engine** | ACTIVE↔INACTIVE, Archive (with prerequisites), Trash, Restore, Disposition, Replacement | `backend/src/services/assets.lifecycle.service.js` | Planner archive/trash pattern, `is_active_household_member` | All transitions validated; blockers revalidated at commit |
| **A7: Frontend Capability Contract** | `assetsCapabilities.ts` mirroring backend | `front/mi-front-limpio/services/assetsCapabilities.ts` | `homecloudCapabilities.ts` pattern | Projection fetch + cache; `hasCapability` helpers |
| **A8: Assets Root Screen** | Search-first list with Profile filters | `front/mi-front-limpio/screens/AssetsRootScreen.tsx` | `AppScreen`, `SearchField`, `FilterChip`, `EmptyState`, `ErrorState` | Filters: Todos/Objetos/Vehículos/Mascotas/Propiedades; scopes |
| **A9: Asset Detail Screen** | Semantic hierarchy (Identidad → Personas → Próximo → Datos → Historial) | `front/mi-front-limpio/screens/AssetDetailScreen.tsx` | `AppCard`, `AppTopBar`, `PlannerSheetHost` pattern | Bounded sections; progressive disclosure |
| **A10: Create/Edit Flow** | Minimal create (Name+Profile); progressive enrichment | `front/mi-front-limpio/screens/AssetCreateScreen.tsx`, `AssetEditScreen.tsx` | `AppInput`, `ActionSheet`, `SegmentedControl` for Profile | Dirty form protection; caller-aware Back |
| **A11: Records & Care UI** | Record create/correct/renew; Care manual entry | `front/mi-front-limpio/components/assets/` | `QuickActionSheet`, `AppInput`, date precision picker | Correction≠Renewal UI; shared Record multi-select |
| **A12: Navigation Integration** | Add to MoreScreen, SimpleModuleRegistry, types.ts, HomeTabNavigator | `navigation/types.ts`, `MoreScreen.tsx`, `simpleModuleRegistry.ts` | Existing module card pattern | "Activos" appears in Más; Simple experience includes it |

### B. STABLE INTEGRATIONS (Can implement once core exists — contracts stable)

| Slice | Objective | Contract Dependency | Reusable Infra |
|-------|-----------|---------------------|----------------|
| **B1: Asset ↔ File Relations** | Junction table `asset_files` + UI to link/unlink HomeCloud files | HomeCloud `homecloud_contents.id` stable | HomeCloud read controller, signed URL access |
| **B2: Record ↔ File Relations** | Junction table `asset_record_files` | HomeCloud content ID stable | Same as B1 |
| **B3: Care ↔ File Relations** | Junction table `care_record_files` | HomeCloud content ID stable | Same as B1 |
| **B4: Asset ↔ Transaction Relations** | Junction table `asset_transactions` (0..N) | Finance `transactions.id` stable | Finance read controller |
| **B5: Care ↔ Transaction Relations** | Junction table `care_transactions` (0..N) | Finance `transactions.id` stable | Finance read controller |
| **B6: Expense Create from Asset/Care** | "Registrar gasto" deep-link to Finance create | Finance `/expenses` + `financeNavigation` contract | Planner create→return pattern |
| **B7: Planner Care-classified Tasks** | Flag on tasks for Care derivation | Planner `tasks` table (add `care_classified` boolean) | Planner tasks service, verification |
| **B8: Care Derivation Trigger** | On Verified completion → create Care Record | Planner `verifyTask` + webhook/outbox | Planner activity log, outbox processor |
| **B9: Global Search Integration** | Add Assets to search index | Search service pattern | Planner/HomeCloud search services |
| **B10: Deep-link Contract** | `assets://asset/:id`, `assets://record/:id`, `assets://care/:id` | `plannerNavigationContract` pattern | `PlannerDeepLinkProvider` |

### C. BLOCKED DEPENDENCIES (Must wait for upstream FINAL PASS)

| Slice | Blocker | Upstream Owner | Mitigation |
|-------|---------|----------------|------------|
| **C1: Care derivation from Planner** | Planner needs `care_classified` flag + derivation trigger | Planner FINAL PASS | Design junction table now; implement trigger when Planner ready |
| **C2: HomeCloud File relations** | HomeCloud final RLS/capabilities (HC-1D) | HomeCloud FINAL PASS | Schema ready; policies wait for HC-1D |
| **C3: Finance relation policies** | Finance global permissions finalization | Finance FINAL PASS | Junction tables ready; RLS waits |
| **C4: Global Permissions matrix for Assets** | Global Permissions Pass (deferred decision §76) | Global Permissions | Use sensible defaults (like HomeCloud); override later |

### D. SLICES ORDERED BY TECHNICAL DEPENDENCY

```
A1 Domain Schema
    ↓
A2 Capability Catalog
    ↓
A3 Asset CRUD ──→ A4 Asset Records CRUD ──→ A5 Care Records CRUD
    ↓                    ↓                        ↓
    └──────────────────→ A6 Lifecycle Engine ←─┘
    ↓
A7 Frontend Capability Contract
    ↓
A8 Assets Root Screen ──→ A9 Asset Detail Screen ──→ A10 Create/Edit Flow
    ↓                         ↓                        ↓
    └──────────────────────→ A11 Records & Care UI ←─┘
    ↓
A12 Navigation Integration
    ↓
──────────────────────────────────────────────
    ↓
B1–B3 File Relations (parallel, after A1+A4+A5)
B4–B5 Finance Relations (parallel, after A1+A5)
B6 Expense Create (after B4)
B7–B8 Planner Care Integration (after A5 + Planner FINAL PASS)
B9 Search (after A1)
B10 Deep-links (after A12)
    ↓
C1–C4 (when upstream FINAL PASS lands)
```

---

## 10. STOP GATES FOR IMPLEMENTATION

| Gate | Condition | Validation |
|------|-----------|------------|
| **GATE A1** | Domain schema migration applied & verified | `migration_verify.sql` pattern; all 3 tables + indexes + RLS + triggers |
| **GATE A2** | Capabilities resolve for all roles | Unit test `resolveHomeCloudCapabilities` pattern for Assets |
| **GATE A3** | Asset CRUD passes contract tests | `POST /api/assets` → 201; RLS blocks cross-household; capabilities enforced |
| **GATE A4** | Shared Record semantics work | Create Record → link 2 Assets → unlink one → Record persists; last unlink blocked |
| **GATE A5** | Care precision + derivation guard | Manual Care with `unknown` precision accepted; multi-Asset Task → no Care |
| **GATE A6** | Lifecycle transitions validated | Archive with future Planner work → blocked; Trash with relations → blocked; Restore to invalid prev → blocked |
| **GATE A7** | Frontend capability fetch caches correctly | `fetchAssetsCapabilitiesCached` returns projection; stale-while-revalidate |
| **GATE A8** | Assets Root search + filters work | "Objetos" filter shows only STANDARD; "Archivado" scope shows Archived |
| **GATE A9** | Detail bounded rendering | History >2 items → "Ver más"; Upcoming ≤2; Info ≤3 |
| **GATE A10** | Create minimal + dirty protection | Name+Profile → Asset; Back with dirty → confirm dialog |
| **GATE A11** | Correction≠Renewal UI distinct | Correction edits same Record; Renewal creates new validity row |
| **GATE A12** | Module appears in Más & Simple | `MoreScreen` shows "Activos"; `SimpleModuleRegistry` includes assets |
| **GATE B1** | File link/unlink preserves HomeCloud truth | Unlink File → File stays in HomeCloud; Trash File → Asset facts preserved |
| **GATE B7** | Care derivation only from Verified Care-classified task | Non-Care completion → no Care; Event elapsed → no Care; multi-Asset → single Care |
| **GATE FINAL** | All 113 Use Cases V2 pass + 98 Invariants V2 hold | Run canonical test suite (TBD) |

---

## 11. SUMMARY OF KEY FINDINGS

### Verified Facts (Evidence-Backed)
1. **Assets module does not exist** — Zero implementation in backend or frontend
2. **Infrastructure is mature** — Capability engine, Global Permissions, RLS patterns, Idempotency, Trash/Restore, Deep-links all proven in Planner/HomeCloud/Finance/Inventory
3. **No legacy Assets code to remove** — No REMOVE or ADAPT for legacy Assets
4. **Icon reserved** — `cube` icon already in `constants/icons.tsx`
5. **Planner ready for Care integration** — Has verification, recurrence, responsibilities, attention, activity log
6. **HomeCloud ready for File relations** — Canonical content ID, intake engine, signed URLs, folders/albums
7. **Finance ready for projections** — Transactions, corrections, refunds, trash/restore, pools
8. **Household/RLS pattern proven** — `is_active_household_member` used consistently

### Hypotheses (Require Validation)
1. **Planner `care_classified` flag** — Not yet in schema; needs Planner FINAL PASS confirmation
2. **Global Permissions defaults for Assets** — Deferred decision (§76); will use HomeCloud-like matrix initially
3. **Search integration approach** — Whether to extend Planner search or build separate index
4. **Performance at scale targets** — 500 Assets, 50+ info items, 20 years history — needs load testing

### Decisions Made (This Audit)
1. **No fourth primitive** — Confirmed: only Asset, AssetRecord, CareRecord
2. **No Assets-owned scheduler** — Care scheduling via Planner responsibilities/schedules
3. **No Assets-owned money** — All monetary via Finance relations
4. **No Assets-owned Files** — All Files via HomeCloud relations
5. **Profile = STANDARD/VEHICLE/PET/PROPERTY** — No DEVICE, no GENERAL
6. **Shared Record is canonical** — Junction table `asset_asset_records` with `asset_record_id` + `asset_id`
7. **Replacement = 0..1 successor** — New table `asset_replacements` with `source_asset_id`, `successor_asset_id`, unique on source

---

## 12. RECOMMENDED NEXT STEPS

1. **Immediate (This Sprint):**
   - Create `A1` migration + Prisma models
   - Add Assets capabilities to `householdPermissions.js`
   - Create `assetsCapabilities.js` backend lib
   - Scaffold `assets.service.js` + `assets.controller.js` + `assets.js` routes

2. **Sprint 2:**
   - Asset CRUD + Records CRUD + Care CRUD
   - Lifecycle engine with blocker resolution
   - Frontend capability contract + cache

3. **Sprint 3:**
   - Assets Root + Detail + Create/Edit screens
   - Navigation integration (Más + Simple)
   - Records & Care UI

4. **Parallel (when Planner/HomeCloud FINAL PASS):**
   - File/Finance/Planner junction tables
   - Care derivation trigger
   - Search integration

---

**AUDIT STATUS:** `READY_FOR_IMPLEMENTATION`  
**BLOCKERS:** None for Core Independent (A-slices)  
**EXTERNAL DEPENDENCIES:** Planner FINAL PASS (care classification), HomeCloud FINAL PASS (RLS), Global Permissions Pass (role defaults)

---

*This audit distinguishes verified facts (✅ EVIDENCE) from hypotheses (⚠️ HYPOTHESIS) and deferred decisions (⏳ DEFERRED). No implementation has been performed.*