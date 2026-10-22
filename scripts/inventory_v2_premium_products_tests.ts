/**
 * Inventory V2 — Block 2 Premium UX Products tests.
 *
 * Covers the PRODUCTS contracts frozen in
 * `docs/implementation/inventory/v2/03_INVENTORY_PREMIUM_UX_FREEZE.md` §14:
 *
 * - the collection and filter semantics (search AND filter, never one
 *   erasing the other);
 * - the SELECTION semantics, including the P0 "Todos = every real result of
 *   the collection, not only the loaded rows";
 * - the structural contracts of the Products surfaces (row layout, swipe,
 *   one-sheet product flow, unified location form, drag-only reorder, bottom
 *   chrome, offline vs permission, realtime patch).
 *
 * Run via `node tests/run.js inventory-v2-premium-products`.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  allProductSelection,
  buildProductCollectionQuery,
  chunkProductIds,
  countProductSelection,
  emptyProductSelection,
  explicitProductSelection,
  isProductFilterActive,
  isProductInCollection,
  isProductOnShoppingList,
  isProductSelectionComplete,
  matchesProductFilter,
  matchesProductLifecycle,
  matchesProductSearch,
  pruneProductSelection,
  productLifecycleOf,
  selectedProductIds,
  shoppingInventoryProductIds,
  toggleProductSelection,
  type ProductSelectionState,
} from '../front/mi-front-limpio/services/inventoryV2Products';

/**
 * Resolve the repository root. The suite is compiled into
 * `scripts/compiled/scripts`, so the root is NOT one level above `__dirname`.
 */
function findRepositoryRoot(start: string): string {
  let current = start;
  for (let depth = 0; depth < 8; depth += 1) {
    const isRepositoryRoot =
      fs.existsSync(path.join(current, 'supabase', 'migrations'))
      && fs.existsSync(path.join(current, 'front', 'mi-front-limpio'))
      && fs.existsSync(path.join(current, 'docs'));
    if (isRepositoryRoot) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return start;
}

const root = findRepositoryRoot(__dirname);
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

const SCREENS = 'front/mi-front-limpio/screens/inventory/v2/InventoryV2Screens.tsx';
const WORKSPACE = 'front/mi-front-limpio/screens/inventory/v2/InventoryWorkspaceScreen.tsx';
const FLOW = 'front/mi-front-limpio/components/inventory/InventoryProductFlowSheet.tsx';
const ROW = 'front/mi-front-limpio/components/inventory/InventoryProductRow.tsx';
const SWIPE = 'front/mi-front-limpio/components/inventory/InventorySwipeRow.tsx';
const SELECTION_BAR = 'front/mi-front-limpio/components/inventory/InventorySelectionBar.tsx';
const LOCATION_FORM = 'front/mi-front-limpio/components/inventory/InventoryLocationForm.tsx';
const LOCATION_SHEET = 'front/mi-front-limpio/components/inventory/InventoryLocationFormSheet.tsx';
const CONTEXT = 'front/mi-front-limpio/context/InventoryV2Context.tsx';
const SHOPPING = 'front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx';

type FakeProduct = {
  id: string;
  name: string;
  quantity: number;
  low_stock_threshold: number;
  category_key: string;
  location_id: string | null;
  archived_at: string | null;
  trashed_at: string | null;
};

const product = (overrides: Partial<FakeProduct> = {}): FakeProduct => ({
  id: 'p-1',
  name: 'Leche',
  quantity: 2,
  low_stock_threshold: 1,
  category_key: 'food_drink',
  location_id: 'loc-1',
  archived_at: null,
  trashed_at: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// 1. Collection and filter semantics
// ---------------------------------------------------------------------------

test('the stock filter matches EXACTLY the server semantics', () => {
  assert.equal(matchesProductFilter(product({ quantity: 0 }) as never, { stock: 'out' }), true);
  assert.equal(matchesProductFilter(product({ quantity: 1 }) as never, { stock: 'out' }), false);
  assert.equal(matchesProductFilter(product({ quantity: 1, low_stock_threshold: 2 }) as never, { stock: 'low' }), true);
  assert.equal(matchesProductFilter(product({ quantity: 0, low_stock_threshold: 2 }) as never, { stock: 'low' }), false, 'zero is "out", never "low"');
  assert.equal(matchesProductFilter(product({ quantity: 3, low_stock_threshold: 2 }) as never, { stock: 'low' }), false);
});

test('the location filter is tri-state: none, a location, or no filter', () => {
  assert.equal(matchesProductFilter(product({ location_id: null }) as never, { location: null }), true);
  assert.equal(matchesProductFilter(product({ location_id: 'loc-1' }) as never, { location: null }), false);
  assert.equal(matchesProductFilter(product({ location_id: 'loc-1' }) as never, { location: 'loc-1' }), true);
  assert.equal(matchesProductFilter(product({ location_id: 'loc-1' }) as never, { location: undefined }), true);
  assert.equal(isProductFilterActive({}), false);
  assert.equal(isProductFilterActive({ location: undefined }), false);
  assert.equal(isProductFilterActive({ location: null }), true);
});

test('the search and the filters are an INTERSECTION: neither erases the other', () => {
  const query = buildProductCollectionQuery({
    lifecycle: 'active',
    search: 'leche',
    filter: { stock: 'low', category: 'food_drink', location: 'loc-1' },
  });
  assert.equal(query.search, 'leche');
  assert.equal(query.stock_state, 'low');
  assert.equal(query.category, 'food_drink');
  assert.equal(query.location_id, 'loc-1');
  assert.equal(query.lifecycle, 'active');

  const withoutLocation = buildProductCollectionQuery({
    lifecycle: 'active',
    search: 'leche',
    filter: { location: null },
  });
  assert.equal(withoutLocation.location_id, 'none', '"Sin lugar" keeps the canonical server contract');
  assert.equal(withoutLocation.search, 'leche', 'the search survives the filter');
});

test('the lifecycle of a product is derived from its lifecycle stamps', () => {
  assert.equal(productLifecycleOf(product() as never), 'active');
  assert.equal(productLifecycleOf(product({ archived_at: '2026-01-01' }) as never), 'archived');
  assert.equal(productLifecycleOf(product({ trashed_at: '2026-01-01' }) as never), 'trashed');
  assert.equal(matchesProductLifecycle(product({ archived_at: '2026-01-01' }) as never, 'archived'), true);
  assert.equal(matchesProductLifecycle(product({ archived_at: '2026-01-01' }) as never, 'active'), false);
});

test('a product that left the collection is detected by the collection predicate', () => {
  const archived = product({ archived_at: '2026-01-01' }) as never;
  assert.equal(
    isProductInCollection(archived, { lifecycle: 'active', filter: {}, search: '' }),
    false,
  );
  assert.equal(
    isProductInCollection(product() as never, { lifecycle: 'active', filter: { stock: 'out' }, search: '' }),
    false,
  );
  assert.equal(
    isProductInCollection(product() as never, { lifecycle: 'active', filter: {}, search: 'lech' }),
    true,
  );
  assert.equal(matchesProductSearch(product({ name: 'Leche entera' }) as never, 'LECHE'), true);
});

// ---------------------------------------------------------------------------
// 2. Selection semantics (the P0 "Todos" contract)
// ---------------------------------------------------------------------------

test('an explicit selection counts and toggles one product at a time', () => {
  let selection: ProductSelectionState = emptyProductSelection();
  assert.equal(countProductSelection(selection), 0);

  selection = toggleProductSelection(selection, 'a');
  selection = toggleProductSelection(selection, 'b');
  assert.equal(countProductSelection(selection), 2);
  assert.deepEqual(selectedProductIds(selection), ['a', 'b']);

  selection = toggleProductSelection(selection, 'a');
  assert.equal(countProductSelection(selection), 1);
  assert.deepEqual(selectedProductIds(selection), ['b']);
});

test('"Todos" holds EVERY id of the collection, not only the loaded rows', () => {
  const all = Array.from({ length: 200 }, (_, index) => `id-${index}`);
  const selection = allProductSelection(all);
  assert.equal(selection.mode, 'all');
  assert.equal(countProductSelection(selection), 200);
  assert.equal(isProductSelectionComplete(selection), true);
  assert.equal(selectedProductIds(selection).length, 200);
});

test('deselecting inside "Todos" keeps the collection complete but not the selection', () => {
  const selection = allProductSelection(['a', 'b', 'c']);
  const after = toggleProductSelection(selection, 'b');
  assert.equal(countProductSelection(after), 2);
  assert.deepEqual(selectedProductIds(after), ['a', 'c']);
  assert.equal(isProductSelectionComplete(after), false);
});

test('a product that leaves the collection leaves the selection', () => {
  const selection = explicitProductSelection(['a', 'b', 'c']);
  const pruned = pruneProductSelection(selection, (id) => id !== 'b');
  assert.deepEqual(pruned.ids, ['a', 'c']);
});

test('an unknown product is never dropped: a paginated selection survives', () => {
  const selection = allProductSelection(['a', 'b', 'c', 'd']);
  const pruned = pruneProductSelection(selection, (id) => id !== 'a');
  assert.deepEqual(pruned.allIds, ['b', 'c', 'd']);
  assert.equal(countProductSelection(pruned), 3);
});

test('an empty selection leaves Selection Mode automatically', () => {
  const selection = explicitProductSelection(['a']);
  const pruned = pruneProductSelection(selection, () => false);
  assert.equal(countProductSelection(pruned), 0);
  assert.deepEqual(selectedProductIds(pruned), []);
});

test('the batch is committed in bounded chunks', () => {
  const ids = Array.from({ length: 250 }, (_, index) => `id-${index}`);
  const chunks = chunkProductIds(ids, 100);
  assert.equal(chunks.length, 3);
  assert.equal(chunks[0].length, 100);
  assert.equal(chunks[2].length, 50);
  assert.equal(chunks.flat().length, 250);
  assert.deepEqual(chunkProductIds([], 100), []);
});

// ---------------------------------------------------------------------------
// 3. Shopping membership is DERIVED from the shared state
// ---------------------------------------------------------------------------

test('the membership of a product in the shopping list is derived, never a flag', () => {
  const shopping = {
    list: { id: 'l', household_id: 'h', assigned_to_person_id: null, version: 1, created_at: '', updated_at: '', assignee: null },
    items: [{ id: 'i-1', inventory_item_id: 'p-1' }],
    active_purchase: null,
  } as never;
  assert.equal(isProductOnShoppingList(shopping, 'p-1'), true);
  assert.equal(isProductOnShoppingList(shopping, 'p-2'), false);
  assert.equal(isProductOnShoppingList(null, 'p-1'), false);
  assert.deepEqual(shoppingInventoryProductIds(shopping), ['p-1']);
});

// ---------------------------------------------------------------------------
// 4. Product row layout contract
// ---------------------------------------------------------------------------

test('the product row keeps the frozen layout contract', () => {
  const source = read(ROW);
  assert.match(source, /row:\{height:64/, 'the row is 64 px tall');
  assert.match(source, /icon:\{width:40,height:40/, 'the leading slot is 40 px');
  assert.match(source, /gap:12/, 'the gap is 12 px');
  assert.match(source, /numberOfLines=\{1\}/, 'the name and the metadata are one line');
  assert.match(source, /fontVariant:\['tabular-nums'\]/, 'the quantity uses tabular numerals');
  assert.match(source, /accessibilityState=\{selection\?\{selected\}:undefined\}/, 'the selection state is exposed');
  assert.doesNotMatch(source, /row:\{[^}]*borderRadius/, 'the row is not a card');
  assert.doesNotMatch(source, /row:\{[^}]*elevation/, 'the row has no elevation');
  assert.doesNotMatch(source, /row:\{[^}]*shadow/, 'the row has no shadow');
});

test('the status is never color-only: the words carry the meaning', () => {
  const source = read(ROW);
  assert.match(source, /Agotado/, 'the status words exist');
  assert.match(source, /Poco stock/, 'the status words exist');
  assert.match(source, /tone=\{state==='Agotado'\?'danger':'warning'\}/, 'the color reinforces the status');
});

// ---------------------------------------------------------------------------
// 5. Swipe row
// ---------------------------------------------------------------------------

test('the swipe row exposes EXACTLY two actions and never a destructive full swipe', () => {
  const source = read(SWIPE);
  assert.match(source, /primaryLabel='Lista'/, 'the primary action adds to the shopping list');
  assert.match(source, /secondaryLabel='Más'/, 'the secondary action opens the context menu');
  assert.match(source, /primaryDone/, 'the primary action knows the "in list" state');
  assert.match(source, /En lista/, 'the "in list" state is visible');
  assert.doesNotMatch(source, /onFullSwipe/, 'there is no destructive full swipe');
  assert.doesNotMatch(source, /changeInventoryProductLifecycle|permanentlyDeleteInventoryProduct|emptyInventoryTrash/, 'the swipe never mutates a lifecycle');
  assert.doesNotMatch(source, /title="Archivar"|title="Mover a Papelera"|title="Eliminar/, 'the swipe never offers a destructive action');
});

test('the swipe follows the finger, never steals the vertical scroll and buzzes once', () => {
  const source = read(SWIPE);
  assert.match(source, /Math\.abs\(g\.dx\)>Math\.abs\(g\.dy\)\*INTENT_RATIO/, 'the horizontal intent is required');
  assert.doesNotMatch(source, /onMoveShouldSetPanResponderCapture/, 'the row never captures the gesture: the list keeps the scroll');
  assert.match(source, /hapticIntent\('selection'\)/, 'the threshold crossing buzzes');
  assert.match(source, /thresholdArmed/, 'the haptic has hysteresis');
  assert.match(source, /INVENTORY_SWIPE_OPEN_WIDTH/, 'the travel is bounded by the open width');
  assert.match(source, /registerOpenCloser/, 'only one row is open at a time');
  assert.match(source, /resolveMotionDuration\(reducedMotion,PREMIUM_MOTION\.state\)/, 'the settle uses the shared motion tokens');
});

// ---------------------------------------------------------------------------
// 6. Product flow: ONE sheet
// ---------------------------------------------------------------------------

test('the product flow is ONE shared sheet, never a sheet over a sheet', () => {
  const source = read(FLOW);
  assert.match(source, /<BottomSheet/, 'the flow uses the canonical sheet');
  assert.doesNotMatch(source, /<ActionSheet/, 'the flow never wraps a legacy sheet');
  assert.match(source, /variant="flow"/, 'the flow uses the flow preset');
  assert.match(source, /dirty=\{sheetDirty\}/, 'the dirty guard is delegated to the shared sheet');
  assert.match(source, /onRequestDismissGuard/, 'the dirty guard is wired');
  assert.match(source, /committing=\{saving\}/, 'the commit lock is delegated to the shared sheet');
  assert.equal((source.match(/<BottomSheet/g) ?? []).length, 1, 'there is exactly ONE sheet host');
});

test('the add product flow never autofocuses the search', () => {
  const source = read(FLOW);
  assert.match(source, /autoFocus=\{false\}/, 'the autofocus is explicitly disabled');
  assert.equal((source.match(/autoFocus/g) ?? []).length, 1, 'there is no other autofocus');
});

test('the catalog, the editor and the pickers are INTERNAL pages of the same flow', () => {
  const source = read(FLOW);
  for (const page of [
    'catalog',
    'editor',
    'location_picker',
    'category_picker',
    'create_location',
    'icon_picker',
    'duplicate',
    'conflict_review',
    'confirm_discard',
  ]) {
    assert.ok(source.includes(`'${page}'`), `the flow has the internal page ${page}`);
  }
  assert.match(source, /PREMIUM_MOTION\.localNav/, 'the internal transition uses the shared motion token');
});

test('the duplicate and the conflict are resolved INSIDE the flow', () => {
  const source = read(FLOW);
  assert.match(source, /Ya existe un producto parecido\./, 'the duplicate has concrete copy');
  assert.match(source, /Crear de todos modos/, 'the domain allows creating anyway');
  assert.match(source, /Ver producto existente/, 'the existing product can be reviewed');
  assert.match(source, /Este producto cambió en otro dispositivo\./, 'the conflict has concrete copy');
  assert.match(source, /Revisar cambios/, 'the conflict offers the review');
  assert.doesNotMatch(source, /Alert\.alert/, 'there is no generic error dialog');
});

// ---------------------------------------------------------------------------
// 7. A single authority for the location form
// ---------------------------------------------------------------------------

test('there is ONE location form authority, shared by the flow and the manager', () => {
  const form = read(LOCATION_FORM);
  const sheet = read(LOCATION_SHEET);
  const flow = read(FLOW);

  assert.match(flow, /from '\.\/InventoryLocationForm'/, 'the flow uses the shared form');
  assert.match(sheet, /from '\.\/InventoryLocationForm'/, 'the manager uses the shared form');
  assert.doesNotMatch(flow, /INVENTORY_LOCATION_ICONS\.map/, 'the flow does not duplicate the icon grid');
  assert.match(form, /INVENTORY_LOCATION_ICONS\.map/, 'the shared form owns the icon grid');
  assert.equal((read(LOCATION_FORM).match(/export function InventoryLocationIconGrid/g) ?? []).length, 1);
  assert.match(sheet, /validateInventoryLocationName|InventoryLocationForm/, 'the validation is not duplicated');
});

test('the standalone location sheet uses the shared sheet primitive', () => {
  const source = read(LOCATION_SHEET);
  assert.match(source, /<BottomSheet/, 'it is a shared sheet');
  assert.doesNotMatch(source, /<ActionSheet/, 'it never wraps a legacy sheet');
  assert.match(source, /variant="standard"/, 'it uses the standard preset');
  assert.match(source, /onRequestDismissGuard/, 'it honours the dirty guard');
  assert.match(source, /committing=\{saving\}/, 'it honours the commit lock');
});

// ---------------------------------------------------------------------------
// 8. The list surfaces
// ---------------------------------------------------------------------------

test('the root keeps the concept: vertical locations, compact chips, no dashboard', () => {
  const source = read(SCREENS);
  assert.match(source, /title="Lugares"/, 'the locations section stays');
  assert.match(source, /SectionTitle title="Lugares"/, 'the locations section keeps its action');
  assert.match(source, /Agotados \$\{state\.summary\.out_of_stock_count\}/, 'the stock chips stay compact');
  assert.match(source, /Poco stock \$\{state\.summary\.low_stock_count\}/, 'the stock chips stay compact');
  assert.match(source, /accessRow:\{height:56/, 'the access rows stay compact');
  assert.doesNotMatch(source, /metricCard|dashboardCard/i, 'there is no dashboard');
  assert.doesNotMatch(source, /horizontal[^.]{0,40}location/i, 'the locations are never a horizontal rail');
});

test('the empty root keeps BOTH the header add and the empty state CTA', () => {
  const source = read(SCREENS);
  assert.match(source, /Todavía no hay productos/, 'the empty copy stays');
  assert.match(source, /actionLabel=\{manage\?'Agregar producto':undefined\}/, 'the empty CTA stays');
  assert.match(source, /secondaryActionLabel=\{manage\?'Crear lugares':undefined\}/, 'the secondary CTA stays');
  // The header add lives in the CANONICAL shell: the workspace owns the
  // context header, and the empty-state CTA lives in the page. They coexist.
  const workspace = read(WORKSPACE);
  assert.match(workspace, /accessibilityLabel=\{addAccessibilityLabel\}/, 'the header add stays');
  assert.match(workspace, /settledTab === 'products' \? 'Agregar producto' : 'Agregar productos a la lista'/, 'the header add is labelled per tab');
  assert.match(workspace, /capabilitiesUnknown\s*&&\s*state\.networkStatus\s*!==\s*'online'/, 'the header add is disabled with a reason, never hidden');
});

test('the list screen uses the shared sheet, the shared chrome and the shared selection bar', () => {
  const source = read(SCREENS);
  assert.match(source, /<BottomSheet/, 'the batch sheets are shared sheets');
  assert.match(source, /<InventorySelectionBar/, 'the selection bar is the shared one');
  assert.match(source, /resolveContentBottomInset/, 'the content inset comes from the shared resolver');
  assert.doesNotMatch(source, /bottom:84/, 'there is no magic bottom offset');
  assert.doesNotMatch(source, /paddingBottom:1\d\d/, 'there is no magic content padding');
});

test('"Todos" walks the pages of the active collection', () => {
  const source = read(SCREENS);
  assert.match(source, /listInventoryProducts\(accessToken,\{\.\.\.query,limit:100,cursor\}\)/, 'the pages of the active query are walked');
  assert.match(source, /allProductSelection\(/, 'the selection holds every id of the collection');
  assert.match(source, /chunkProductIds\(/, 'the batch is committed in bounded chunks');
});

test('the reorder has ONE mechanism: drag, without up and down arrows', () => {
  const source = read(SCREENS);
  assert.doesNotMatch(source, /icon="chevron-up"/, 'there is no up arrow');
  assert.doesNotMatch(source, /icon="chevron-down"/, 'there is no down arrow');
  assert.match(source, /reorder-three-outline/, 'the drag handle stays');
  assert.match(source, /hapticIntent\('selection'\)/, 'crossing a position buzzes');
  assert.match(source, /ListHeaderComponent=\{!reorder\?<LocationRow name="Sin lugar"/, '"Sin lugar" never enters the reorder');
});

test('the offline and the stale notices are two different messages', () => {
  const source = read(SCREENS);
  assert.match(source, /Sin conexión/, 'the offline notice');
  assert.match(source, /Mostrando datos guardados\./, 'the offline notice');
  assert.match(source, /No pudimos actualizar\./, 'the stale notice');
  assert.match(source, /Mostrando datos anteriores\./, 'the stale notice');
});

test('an unknown capability does not hide the add action', () => {
  const workspace = read(WORKSPACE);
  assert.match(workspace, /capabilitiesUnknown/, 'the unknown capability state exists');
  assert.match(workspace, /disabled=\{addDisabled\}/, 'the action stays visible and is disabled with a reason');
  assert.match(workspace, /transitioning \|\| \(settledTab === 'products' && capabilitiesUnknown && state\.networkStatus !== 'online'\)/, 'the add action is disabled during a transition and with an unknown capability');
});

test('the selection bar position comes from the shared chrome metrics', () => {
  const source = read(SELECTION_BAR);
  assert.match(source, /BOTTOM_CHROME_METRICS\.bottomNavHeight\+BOTTOM_CHROME_METRICS\.selectionBarGap/, 'the offset is derived');
  assert.doesNotMatch(source, /bottom:\d\d/, 'there is no magic offset');
});

// ---------------------------------------------------------------------------
// 9. Workspace, state authority and scope
// ---------------------------------------------------------------------------

test('the pager is locked while a selection is active', () => {
  const source = read(WORKSPACE);
  assert.match(source, /disabled=\{selectionLocked\}/, 'the pager honours the selection lock');
  assert.match(source, /if \(selectionRef\.current\[settledTab\]\) return;/, 'the selector honours the selection lock');
});

test('the Inventory state authority stays a single provider', () => {
  const source = read(CONTEXT);
  for (const forbidden of ['ProductsStore', 'ShoppingStore', 'PurchaseStore']) {
    assert.doesNotMatch(source, new RegExp(forbidden), `${forbidden} does not exist`);
  }
  assert.match(source, /scopeKey=accountId&&householdId/, 'the household stays the hard boundary');
  assert.match(source, /refreshShopping/, 'the shopping state is refreshed inside the same authority');
  assert.match(source, /type:'shoppingState'/, 'the shopping patch is a state update, never a local flag');
});

test('the Products surfaces never touch the domain, the schema or the RPCs', () => {
  for (const file of [SCREENS, FLOW, ROW, SWIPE, LOCATION_FORM, LOCATION_SHEET]) {
    const source = read(file);
    assert.doesNotMatch(source, /create table|alter table|drop table/i, `${file} never writes SQL`);
    assert.doesNotMatch(source, /from '\.\.\/\.\.\/\.\.\/supabase'/, `${file} never talks to the database directly`);
  }
});

test('the Shopping and Purchase surfaces were not redesigned by this block', () => {
  const shopping = read(SHOPPING);
  assert.doesNotMatch(shopping, /InventoryProductFlowSheet|InventoryProductRow|InventorySwipeRow/, 'the shopping screens do not borrow the Products surfaces');
  const flow = read(FLOW);
  assert.doesNotMatch(flow, /InventoryShoppingPage|ShoppingHome/, 'the Products flow never navigates to Shopping');
});

test('the Products quick add uses the CANONICAL shopping mutation', () => {
  const source = read(SCREENS);
  assert.match(source, /addInventoryShoppingItem\(accessToken,\{source:'inventory',inventory_item_id:product\.id,quantity:1\}/, 'the canonical mutation is used');
  assert.match(source, /isProductOnShoppingList\(state\.shopping,item\.id\)/, 'the "in list" state is derived from the shared state');
  assert.doesNotMatch(source, /shopping-list\/items['"`]/, 'no parallel shopping endpoint is invented');
});
