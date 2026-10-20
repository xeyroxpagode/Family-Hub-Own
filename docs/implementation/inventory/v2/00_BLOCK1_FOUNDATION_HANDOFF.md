# Inventory V2 — Block 1 Foundation Handoff

## Baseline

- Worktree: `C:\Users\thega\Desktop\HomePlus-worktrees\inventory`
- Source branch: `integration-planner-homecloud-final-20261018`
- Source SHA / remote baseline: `97ebf2f4dbe0201cffbe69b5dffbddd55cdb8d56`
- Implementation branch: `inventory-rework-v1-20261019`
- Final SHA: recorded by the final execution report after the handoff commit (a commit cannot embed its own SHA).

## Schema and migrations

- `20261019000001_inventory_v2_foundation.sql`: additive schema, indexes, legacy-template catalog seed, capability function, RLS/grants and audit hardening.
- `20261019000002_inventory_v2_atomic_rpc.sql`: idempotency helpers, search/list/summary reads, auto-restock reconciliation and atomic domain mutations.
- New tables: `inventory_catalog_items`, `inventory_catalog_aliases`, `inventory_catalog_household_stats`, `inventory_locations`, `inventory_shopping_lists`, `inventory_shopping_list_items`, `inventory_purchase_sessions`, `inventory_purchase_lines`, `inventory_idempotency_keys`.
- `inventory_items` additions: `catalog_item_id`, `location_id`, `notes`, `auto_restock_enabled`, `target_quantity`, `auto_restock_suppressed`, `archived_at`, `trashed_at`, `pre_trash_lifecycle`, `version` and additive actor reference when absent.
- `inventory_item_movements` additions: `source`, `correlation_id`, `purchase_session_id`, `item_name_snapshot`; item FK is nullable with `ON DELETE SET NULL` and vocabulary includes every V2 movement.
- Important constraints: normalized location uniqueness per household; one shopping list per household; shopping dedupe key; one active/paused purchase session per household; positive quantities/versions; stable catalog external identity; idempotency scope uniqueness.
- Search/read indexes cover trigram and prefix catalog search, aliases, household usage/recent ranking, product lifecycle/location/stock pages, location order, shopping order, purchase history and idempotency leases.
- Historical migrations were not edited. V1 tables, legacy columns, templates, restock rows and Planner links remain intact. No V1 row is converted to a Location, Shopping or Purchase record.

## Core

- `services/core/householdRequestContext.service.js` is the Planner-independent account → person → active household → active membership authority. Request body/query household IDs are never accepted as authority.
- `inventoryCapabilities.js` and the frontend projection define `inventory.view/use/manage/destroy` for all six canonical roles, with `household.config.permissions[capability][role]` boolean overrides.
- `IDEMPOTENT_MUTATION` was added to the shared backend/frontend mutation contract. It requires `X-Mutation-Id` and `Idempotency-Key`, never `If-Match`. Existing kinds retain their behavior and `VERSIONED_MUTATION` retains `version_conflict_v2` / HTTP 412.

## Catalog

- Existing `inventory_item_templates` are the first source. Stable mapping uses `external_source='legacy_inventory_template'` and template UUID as `external_key`; `template_id` on V1 products is unchanged.
- Pipeline lives at `data/inventory/catalog/ar`: adapter → accent/case normalization → validation → dedupe → catalog/alias upsert.
- The migration seeds it and `backend/scripts/import-inventory-catalog.js` repeats it operationally without duplicates.
- SQL ranking order: existing household relevance, household use/recency, canonical exact, alias exact, prefix, token/partial, fuzzy, then frequency/recency/global popularity/short match/name/id.
- Search is server-side and paginated (30 default); no runtime external API and no full-table frontend download.

## Products, Locations and API

New side-by-side endpoints:

- `GET /api/inventory/capabilities`, `GET /api/inventory/summary`
- `GET /api/inventory/catalog/search`, `GET /api/inventory/catalog/discovery`
- `GET/POST /api/inventory/locations`, `PATCH/DELETE /api/inventory/locations/:id`, reorder and atomic move-products actions
- `GET/POST /api/inventory/products`, `GET/PATCH /api/inventory/products/:id`, quantity adjust/set, archive/restore/trash/restore-from-trash/permanent delete and atomic batch

The V2 backend is modular under `backend/src/inventory`. Product pages are SQL-filtered and keyset-paginated (50 default). Catalog pages are ranked/paginated by SQL. No frontend mutation loops are introduced.

Atomic RPCs: product create/edit/quantity adjust/quantity set/lifecycle/batch; location create/edit/delete/reorder/move-products; auto-restock reconciliation; catalog search, product list and summary reads. Rows are locked in stable order. Quantity deltas compute against the locked value; sets/edits/lifecycle require the expected version. Location deletion moves products, audits them and deletes the location in one transaction. Any stale batch member rolls the whole batch back.

Idempotency reservation, mutation, audit/reconciliation and replay persistence occur in the same database transaction. Same payload replays; different payload conflicts; reserved keys report in-flight. No reserve/complete HTTP flow exists.

## RLS and audit

- Catalog: authenticated read; direct writes revoked.
- New household tables: reads require active membership plus `inventory.view`; productive writes are RPC-only.
- Product/location RPCs re-check `use/manage/destroy`; household is derived from the authenticated person.
- Idempotency rows have no arbitrary client access. Movement direct inserts are revoked.
- V1 audit compatibility is preserved through the controlled `inventory_legacy_log_movement` RPC used by the existing service.
- Quantity/lifecycle/location/batch movement rows are written in the same transaction as the mutation. Permanent delete preserves history through nullable FK plus name snapshot.

## Shared UI and frontend service

- Adaptive menu layout authority moved to `services/core`; HomeCloud path is a compatibility re-export and its popover/sheet behavior remains unchanged.
- `ActionSheet` keeps native defaults and adds opt-in controlled 220 ms open / 190 ms close motion, Reduce Motion and `onDidDismiss`; keyboard-first backdrop behavior remains.
- `HouseholdMemberPicker` is ID-agnostic and supports empty/single/multiple selection. `PlannerMemberPicker` is a compatibility wrapper.
- `AppToastHost` provides one toast, undo, live-region semantics, 150/110 ms motion, bottom offset and sheet deferral without Planner context.
- `ConfirmActionSheet` provides neutral/destructive, busy and close-disabled contracts.
- `services/inventoryV2.ts` provides typed clients for capabilities, summary, catalog, locations and products exclusively through `requestJson` and Core operation kinds. Legacy `services/inventory.ts` is untouched.

## Verification evidence

- `supabase db reset`: PASS from scratch, 144 unique migrations; repeated after runtime fixes.
- `node scripts/inventory_v2_foundation_tests.js`: PASS, 25 deterministic tests.
- `node scripts/inventory_v2_database_tests.js`: PASS, 51 assertions against real local Postgres/RLS/RPC/concurrency.
- Catalog importer executed twice: PASS; both runs returned 51 items / 51 aliases and final tables remained 51 / 51.
- `npx tsc -p front/mi-front-limpio/tsconfig.json --noEmit`: PASS.
- `npx tsc -p scripts/tsconfig.test.json`: PASS.
- Backend/test syntax: PASS, 2,318 JavaScript files.
- Migration uniqueness: PASS, 144 versions.
- Home representative: PASS, 53 assertions.
- Core backend/frontend direct steps: PASS, 23 / 19 assertions.
- Planner P1 structure direct step: PASS, 44 assertions.
- Finance 1B direct step: PASS, 33 assertions.
- HomeCloud representative ran 100 favorites + 155 favorites UI + 264 selection + 102 freshness + 339 viewer assertions before a pre-existing runner/tsconfig omission (`FileSelectionBar` not emitted) stopped its UX aggregate.
- Pre-existing harness defects: same-name suite/command cycles for Core, Planner P1 and Finance 1B/1C; direct steps pass. Finance 1C runtime passes ownership/privacy but its static migration allowlist is stale relative to already-baselined later Finance migrations.

## Exact changed files

Backend/core:

- `backend/scripts/import-inventory-catalog.js`
- `backend/src/inventory/catalog/catalog.service.js`
- `backend/src/inventory/integrations/index.js`
- `backend/src/inventory/inventory.controller.js`
- `backend/src/inventory/locations/locations.service.js`
- `backend/src/inventory/products/products.service.js`
- `backend/src/inventory/purchases/purchases.service.js`
- `backend/src/inventory/shared/inventory.errors.js`
- `backend/src/inventory/shared/inventory.permissions.js`
- `backend/src/inventory/shared/inventory.validation.js`
- `backend/src/inventory/shopping/shopping.service.js`
- `backend/src/inventory/summary/summary.service.js`
- `backend/src/lib/inventoryCapabilities.js`
- `backend/src/lib/mutationContracts.js`
- `backend/src/routes/inventory.js`
- `backend/src/services/core/householdRequestContext.service.js`
- `backend/src/services/inventory.service.js`

Database/data:

- `data/inventory/catalog/ar/README.md`
- `data/inventory/catalog/ar/legacyTemplates.js`
- `supabase/migrations/20261019000001_inventory_v2_foundation.sql`
- `supabase/migrations/20261019000002_inventory_v2_atomic_rpc.sql`

Frontend/shared:

- `front/mi-front-limpio/components/planner/PlannerMemberPicker.tsx`
- `front/mi-front-limpio/components/ui/ActionSheet.tsx`
- `front/mi-front-limpio/components/ui/AdaptiveActionMenu.tsx`
- `front/mi-front-limpio/components/ui/AppToastHost.tsx`
- `front/mi-front-limpio/components/ui/ConfirmActionSheet.tsx`
- `front/mi-front-limpio/components/ui/HouseholdMemberPicker.tsx`
- `front/mi-front-limpio/components/ui/index.ts`
- `front/mi-front-limpio/services/api.ts`
- `front/mi-front-limpio/services/core/adaptiveActionMenuLayout.ts`
- `front/mi-front-limpio/services/homecloud/adaptiveActionMenuLayout.ts`
- `front/mi-front-limpio/services/inventoryCapabilities.ts`
- `front/mi-front-limpio/services/inventoryV2.ts`

Tests/docs:

- `docs/implementation/inventory/v2/00_BLOCK1_FOUNDATION_HANDOFF.md`
- `package.json`
- `scripts/inventory_v2_database_tests.js`
- `scripts/inventory_v2_foundation_tests.js`
- `tests/run.js`

## Deferred work

- Block 2: Products Root and Locations UI consuming this foundation.
- Block 3: Shopping/Purchase UI and public shopping/purchase mutation surface; Finance/Planner cutovers only when verified.
- Block 4: complete Product → Catalog backfill/cutover, legacy removal and navigation/Home cutovers.
- No main Inventory screen, navigation, Home card, Planner behavior or Finance integration is cut over in this block.

## Final commands

```powershell
npm run test:inventory-v2
supabase db reset
node scripts/inventory_v2_database_tests.js
npx tsc -p front/mi-front-limpio/tsconfig.json --noEmit
git diff --check
git status
git rev-parse HEAD
git ls-remote origin refs/heads/inventory-rework-v1-20261019
```
