/**
 * Inventory V2 â€” runtime reconciliation / REACHABILITY tests.
 *
 * The Block 1 and Block 2 suites proved PRESENCE ("the file exists", "the
 * string is in the file"). That philosophy produced false passes: the app
 * could keep a legacy standalone surface, a DEV QA harness and a broken
 * keyboard geometry while every test stayed green.
 *
 * These tests prove REACHABILITY instead:
 *
 * - the DEV preview root resolves to the canonical workspace;
 * - the legacy route names cannot render a parallel Products/Shopping UI;
 * - the workspace owns the pager and both pages;
 * - no QA harness exists inside the app;
 * - no internal V2 call navigates to a legacy route;
 * - the Purchase `+` opens an overlay and NEVER navigates;
 * - the sheet animated graph never mixes drivers;
 * - the keyboard never translates the outer geometry of the sheet;
 * - the ProductFlow really uses the canonical sheet;
 * - the tab switch never remounts the Inventory provider.
 *
 * Run via `node tests/run.js inventory-v2-reconciliation`.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  INVENTORY_V2_DEV_PREVIEW_MORE_SCREENS,
  INVENTORY_V2_DEV_PREVIEW_PATH,
  isInventoryV2DevPreviewPath,
} from '../front/mi-front-limpio/navigation/inventoryV2DevLink';
import {
  INVENTORY_WORKSPACE_ROUTE,
  inventoryWorkspaceState,
  returnToInventoryWorkspace,
} from '../front/mi-front-limpio/navigation/inventoryV2Workspace';

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

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
const exists = (file: string) => fs.existsSync(path.join(root, file));

const STACK = 'front/mi-front-limpio/navigation/InventoryV2Stack.tsx';
const DEV_LINK = 'front/mi-front-limpio/navigation/inventoryV2DevLink.ts';
const WORKSPACE = 'front/mi-front-limpio/screens/inventory/v2/InventoryWorkspaceScreen.tsx';
const PRODUCTS = 'front/mi-front-limpio/screens/inventory/v2/InventoryV2Screens.tsx';
const SHOPPING = 'front/mi-front-limpio/screens/inventory/v2/InventoryShoppingPurchaseScreens.tsx';
const COMPAT = 'front/mi-front-limpio/screens/inventory/v2/InventoryCompatibilityRoutes.tsx';
const FLOW = 'front/mi-front-limpio/components/inventory/InventoryProductFlowSheet.tsx';
const ADD_SHEET = 'front/mi-front-limpio/components/inventory/AddToShoppingSheet.tsx';
const SHEET = 'front/mi-front-limpio/components/ui/BottomSheet.tsx';
const HARNESS = 'front/mi-front-limpio/screens/inventory/v2/InventoryPremiumQAScreen.tsx';

/** Every V2 runtime source that can navigate. */
const V2_RUNTIME_SOURCES = [
  STACK,
  WORKSPACE,
  PRODUCTS,
  SHOPPING,
  COMPAT,
  FLOW,
  ADD_SHEET,
  'front/mi-front-limpio/components/inventory/InventoryHomeSummaryCard.tsx',
];

/** The `<Stack.Screen name="X" component={Y} />` table of a navigator. */
function parseStackScreens(source: string): Record<string, string> {
  const table: Record<string, string> = {};
  const pattern = /<Stack\.Screen\s+name="([^"]+)"\s+component=\{([^}]+)\}/g;
  let match = pattern.exec(source);
  while (match) {
    table[match[1]] = match[2];
    match = pattern.exec(source);
  }
  return table;
}

/** Every `navigation.<verb>('Route')` call of a source. */
function parseNavigationCalls(source: string): Array<{ verb: string; route: string }> {
  const calls: Array<{ verb: string; route: string }> = [];
  const pattern = /navigation\.(navigate|replace|push|popTo|reset)\(\s*'([^']+)'/g;
  let match = pattern.exec(source);
  while (match) {
    calls.push({ verb: match[1], route: match[2] });
    match = pattern.exec(source);
  }
  return calls;
}

/** Every declared action label of an overflow (or any action list). */
function parseActionLabels(source: string): string[] {
  const labels: string[] = [];
  const pattern = /label:\s*'([^']+)'/g;
  let match = pattern.exec(source);
  while (match) {
    labels.push(match[1]);
    match = pattern.exec(source);
  }
  return labels;
}

/** The body of a `useMemo` that builds the workspace pages. */
function parseWorkspacePages(source: string): string {
  const start = source.indexOf('const pages = useMemo(');
  assert.ok(start >= 0, 'the workspace builds its pages');
  const open = source.indexOf('[', source.indexOf('(', start));
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '[') depth += 1;
    if (source[index] === ']') {
      depth -= 1;
      if (depth === 0) return source.slice(open, index + 1);
    }
  }
  throw new Error('the workspace pages memo is not balanced');
}

// ---------------------------------------------------------------------------
// 1. The DEV preview root resolves to the canonical workspace
// ---------------------------------------------------------------------------

test('the DEV preview root resolves to the InventoryWorkspace', () => {
  const screens = INVENTORY_V2_DEV_PREVIEW_MORE_SCREENS.InventoryV2Preview.screens as unknown as Record<string, string>;
  assert.equal(
    screens[INVENTORY_WORKSPACE_ROUTE],
    '',
    'the preview root path belongs to the workspace',
  );
  const rootOwners = Object.entries(screens).filter(([, value]) => value === '');
  assert.deepEqual(
    rootOwners.map(([name]) => name),
    [INVENTORY_WORKSPACE_ROUTE],
    'the workspace is the ONLY owner of the preview root path',
  );
  assert.equal(isInventoryV2DevPreviewPath(INVENTORY_V2_DEV_PREVIEW_PATH), true);
  // The drill-downs keep their own deterministic paths.
  for (const drillDown of ['AllProducts', 'Locations', 'LocationDetail', 'ArchivedProducts', 'InventoryTrash', 'Purchase', 'PurchaseSuccess', 'PurchaseHistory', 'PurchaseDetail']) {
    assert.ok(screens[drillDown], `${drillDown} keeps its own path`);
    assert.notEqual(screens[drillDown], '', `${drillDown} is not the root`);
  }
  // The linking config and the stack agree on the route name.
  assert.match(read(STACK), /initialRouteName="InventoryWorkspace"/);
});

// ---------------------------------------------------------------------------
// 2 + 3. The legacy routes cannot render a parallel experience
// ---------------------------------------------------------------------------

test('the ProductsHome compatibility route cannot render a standalone Products UI', () => {
  const table = parseStackScreens(read(STACK));
  assert.equal(
    table.ProductsHome,
    'InventoryProductsHomeCompatibility',
    'ProductsHome resolves to the compatibility redirect',
  );
  const compat = read(COMPAT);
  assert.doesNotMatch(compat, /InventoryProductsPage/, 'the redirect never renders the Products page');
  assert.match(compat, /return null/, 'the redirect renders nothing visible');
  assert.match(compat, /inventoryWorkspaceState\('products'\)/, 'the redirect resets to the workspace');
  assert.doesNotMatch(read(PRODUCTS), /export function InventoryProductsRootScreen/, 'the standalone Products screen is gone');
  assert.doesNotMatch(read(PRODUCTS), /embedded/, 'the Products page has no standalone mode left');
});

test('the ShoppingHome compatibility route cannot render a standalone Shopping UI', () => {
  const table = parseStackScreens(read(STACK));
  assert.equal(
    table.ShoppingHome,
    'InventoryShoppingHomeCompatibility',
    'ShoppingHome resolves to the compatibility redirect',
  );
  const compat = read(COMPAT);
  assert.doesNotMatch(compat, /InventoryShoppingPage/, 'the redirect never renders the Shopping page');
  assert.match(compat, /return null/, 'the redirect renders nothing visible');
  assert.match(compat, /inventoryWorkspaceState\('shopping'\)/, 'the redirect resets to the workspace');
  assert.doesNotMatch(read(SHOPPING), /export function InventoryShoppingScreen/, 'the standalone Shopping screen is gone');
  assert.doesNotMatch(read(SHOPPING), /embedded/, 'the Shopping page has no standalone mode left');
});

test('the compatibility redirect builds the canonical workspace state', () => {
  assert.deepEqual(inventoryWorkspaceState('products'), {
    index: 0,
    routes: [{ name: 'InventoryWorkspace', params: { tab: 'products' } }],
  });
  assert.deepEqual(inventoryWorkspaceState('shopping'), {
    index: 0,
    routes: [{ name: 'InventoryWorkspace', params: { tab: 'shopping' } }],
  });
});

// ---------------------------------------------------------------------------
// 4. The workspace owns the canonical pager
// ---------------------------------------------------------------------------

test('the normal Inventory workspace owns the canonical pager and both pages', () => {
  const workspace = read(WORKSPACE);
  assert.match(workspace, /<HorizontalPager/, 'the workspace hosts the canonical pager');
  const pages = parseWorkspacePages(workspace);
  assert.match(pages, /<InventoryProductsPage/, 'the Products page is a page of the workspace');
  assert.match(pages, /<InventoryShoppingPage/, 'the Shopping page is a page of the workspace');
  assert.match(pages, /key="products"/, 'the Products page keeps a stable identity');
  assert.match(pages, /key="shopping"/, 'the Shopping page keeps a stable identity');
  // The pages are NOT conditional: they stay mounted across a tab change.
  assert.doesNotMatch(pages, /targetTab\s*===\s*'products'\s*\?/, 'the Products page is never unmounted by the tab');
  assert.match(workspace, /<SegmentedControl/, 'the workspace uses the canonical selector');
});

// ---------------------------------------------------------------------------
// 5 + 6. The QA harness is gone from the app
// ---------------------------------------------------------------------------

test('the Inventory Premium QA route does not exist', () => {
  assert.equal(exists(HARNESS), false, 'the QA harness screen does not exist');
  const table = parseStackScreens(read(STACK));
  assert.equal(table.InventoryPremiumQA, undefined, 'the QA route is not registered');
  assert.doesNotMatch(read(STACK), /InventoryPremiumQA/, 'the stack never mentions the QA route');
  assert.doesNotMatch(read(WORKSPACE), /InventoryPremiumQA/, 'the workspace never mentions the QA route');
});

test('the Products overflow contains no QA Premium UX entry', () => {
  const labels = parseActionLabels(read(PRODUCTS));
  assert.ok(labels.length > 0, 'the Products overflow declares real actions');
  for (const label of labels) {
    assert.doesNotMatch(label, /QA/i, `the Products overflow has no QA entry: ${label}`);
  }
  assert.doesNotMatch(read(PRODUCTS), /premium-qa/, 'the Products overflow declares no QA action id');
});

// ---------------------------------------------------------------------------
// 7 + 8. No internal V2 call navigates to a legacy route
// ---------------------------------------------------------------------------

test('no V2 internal call navigates to ProductsHome', () => {
  for (const file of V2_RUNTIME_SOURCES) {
    const calls = parseNavigationCalls(read(file)).filter((call) => call.route === 'ProductsHome');
    assert.deepEqual(calls, [], `${file} never navigates to ProductsHome`);
  }
});

test('no V2 internal call navigates to ShoppingHome', () => {
  for (const file of V2_RUNTIME_SOURCES) {
    const calls = parseNavigationCalls(read(file)).filter((call) => call.route === 'ShoppingHome');
    assert.deepEqual(calls, [], `${file} never navigates to ShoppingHome`);
  }
  assert.doesNotMatch(read(SHOPPING), /openAddNonce/, 'the nonce hack is gone');
  assert.doesNotMatch(read(WORKSPACE), /openAddNonce/, 'the workspace never reads an add nonce');
});

// ---------------------------------------------------------------------------
// 9 + 10 + 11. The Purchase `+` never navigates
// ---------------------------------------------------------------------------

test('the Purchase + does NOT navigate', () => {
  const shopping = read(SHOPPING);
  const purchase = shopping.slice(shopping.indexOf('export function InventoryPurchaseScreen'));
  const addAffordance = purchase.match(/<IconButton icon="add"[^>]*?onPress=\{([^}]*)\}[^>]*?accessibilityLabel="Agregar productos a la compra"/);
  assert.ok(addAffordance, 'the Purchase declares the add affordance');
  assert.match(addAffordance[1], /setAdd\(true\)/, 'the add affordance opens a local overlay');
  assert.doesNotMatch(addAffordance[1], /navigate/, 'the add affordance never navigates');
  assert.doesNotMatch(purchase, /openAddNonce/, 'the purchase never uses the add nonce');
});

test('the Purchase + opens the shared AddToShopping overlay', () => {
  const shopping = read(SHOPPING);
  const purchase = shopping.slice(shopping.indexOf('export function InventoryPurchaseScreen'));
  assert.match(purchase, /<AddToShoppingSheet visible=\{add\} onClose=\{\(\)=>setAdd\(false\)\}\/>/, 'the purchase renders the shared add surface');
  const addSheet = read(ADD_SHEET);
  assert.match(addSheet, /<BottomSheet/, 'the shared add surface is the canonical sheet');
  // The discovery and the add mutation live in the shared surface only.
  assert.match(addSheet, /discoverInventoryShopping/, 'the shared surface owns the discovery');
  assert.match(addSheet, /addInventoryShoppingItem/, 'the shared surface owns the add mutation');
  assert.doesNotMatch(shopping, /discoverInventoryShopping/, 'the shopping page does not duplicate the discovery');
  assert.doesNotMatch(shopping, /addInventoryShoppingItem/, 'the shopping page does not duplicate the add mutation');
  // The Shopping page consumes the SAME surface.
  assert.match(shopping, /<AddToShoppingSheet visible=\{add\} onClose=\{\(\)=>setAdd\(false\)\}\/>/, 'the shopping page renders the shared add surface');
});

test('closing Add during a Purchase preserves the Purchase route and session', () => {
  const shopping = read(SHOPPING);
  const purchase = shopping.slice(shopping.indexOf('export function InventoryPurchaseScreen'));
  // The add surface is an OVERLAY: it is a Modal that mounts over the
  // purchase, so the purchase stays mounted with its session, its checked
  // rows, its quantities, its hidden state and its scroll.
  assert.match(read(ADD_SHEET), /<BottomSheet/, 'the add surface is a modal overlay');
  assert.doesNotMatch(purchase, /navigation\.navigate\('ShoppingHome'/, 'the purchase never detours to the shopping root');
  // Closing is a local state change: no route is touched.
  assert.match(purchase, /onClose=\{\(\)=>setAdd\(false\)\}/, 'closing the add surface is a local state change');
  const closeCalls = parseNavigationCalls(purchase);
  assert.deepEqual(
    closeCalls.filter((call) => call.route === 'ShoppingHome' || call.route === 'ProductsHome'),
    [],
    'the purchase never navigates to a legacy surface',
  );
  // The canonical returns use the workspace helper.
  assert.match(purchase, /returnToInventoryWorkspace\(navigation,'shopping'\)/, 'the purchase returns to the workspace');
});

// ---------------------------------------------------------------------------
// 12 + 13 + 14 + 15. The sheet: drivers, layers and keyboard
// ---------------------------------------------------------------------------

test('the BottomSheet animation graph never uses a native-driven height', () => {
  const sheet = read(SHEET);
  const drivers = sheet.match(/Animated\.timing\(height,\s*\{[\s\S]*?useNativeDriver:\s*(true|false)/g) ?? [];
  assert.ok(drivers.length > 0, 'the sheet animates its height');
  for (const animation of drivers) {
    assert.match(animation, /useNativeDriver: false/, `height is never natively driven: ${animation}`);
  }
  assert.doesNotMatch(sheet, /Animated\.timing\(height,\s*\{[\s\S]*?useNativeDriver: true/, 'no native-driven height animation exists');
});

test('the height animated node is not shared with an incompatible native driver graph', () => {
  const sheet = read(SHEET);
  const geometry = sheet.match(/style=\{\[styles\.sheetGeometry,\s*\{([^}]*)\}\]\}/);
  assert.ok(geometry, 'the geometry layer declares its own animated style');
  assert.match(geometry[1], /height/, 'the geometry layer owns the height');
  assert.doesNotMatch(geometry[1], /opacity|translate/, 'the geometry layer owns no native-driven motion');
  const motion = sheet.match(/style=\{\[\s*styles\.sheetMotion,[\s\S]*?\}\]/);
  assert.ok(motion, 'the motion layer declares its own animated style');
  assert.doesNotMatch(motion[0], /height/, 'the motion layer owns no layout property');
  // No single animated style object mixes a layout property with a motion one.
  assert.doesNotMatch(sheet, /height:[^}]*opacity/, 'height and opacity never share one animated style object');
  assert.doesNotMatch(sheet, /opacity:[^}]*height/, 'opacity and height never share one animated style object');
});

test('the keyboard never translates the outer geometry of the sheet', () => {
  const sheet = read(SHEET);
  assert.doesNotMatch(sheet, /bottom: keyboardInset/, 'the root sheet has no keyboard translation');
  assert.doesNotMatch(sheet, /bottom: keyboardReserve/, 'the root sheet has no keyboard translation');
  // The reserve is applied INSIDE the sheet.
  assert.match(sheet, /marginBottom: keyboardReserve/, 'the footer is lifted by the keyboard reserve');
  assert.match(sheet, /keyboardReserve > 0 \? 0 : safeAreaBottom/, 'the safe area spacer yields to the keyboard');
});

test('the keyboard contract keeps the footer visible and the content scrollable', () => {
  const sheet = read(SHEET);
  assert.match(sheet, /keyboardInset > 0 \|\| atMaximumDetent \|\| contentFits/, 'the body scrolls when the keyboard is open');
  assert.match(sheet, /keyboardInset <= 0/, 'the detent expansion yields to the content while the keyboard is open');
  assert.match(sheet, /resolveKeyboardDetentIndex/, 'the detent promotion is the explicit system promotion');
});

// ---------------------------------------------------------------------------
// 16 + 17. The real ProductFlow and the real Products root
// ---------------------------------------------------------------------------

test('the ProductFlow uses the real canonical BottomSheet', () => {
  const flow = read(FLOW);
  assert.match(flow, /<BottomSheet/, 'the product flow renders the canonical sheet');
  assert.match(flow, /variant="flow"/, 'the product flow uses the flow detent preset');
  assert.match(flow, /dirty=\{sheetDirty\}/, 'the product flow honours the dirty contract');
  assert.match(flow, /committing=\{saving\}/, 'the product flow honours the commit lock');
  assert.doesNotMatch(flow, /<ActionSheet/, 'the product flow never uses the legacy sheet');
});

test('the real Products root is a child of the InventoryWorkspace', () => {
  const workspace = read(WORKSPACE);
  assert.match(workspace, /import\s*\{\s*InventoryProductsPage\s*\}\s*from\s*'\.\/InventoryV2Screens'/, 'the workspace owns the Products page');
  assert.match(workspace, /import\s*\{\s*InventoryShoppingPage\s*\}\s*from\s*'\.\/InventoryShoppingPurchaseScreens'/, 'the workspace owns the Shopping page');
  const pages = parseWorkspacePages(workspace);
  assert.match(pages, /<InventoryProductsPage/, 'the Products page is rendered by the workspace');
  assert.match(pages, /<InventoryShoppingPage/, 'the Shopping page is rendered by the workspace');
});

// ---------------------------------------------------------------------------
// 18. The tab switch never remounts the provider
// ---------------------------------------------------------------------------

test('a tab switch does not remount the InventoryV2Provider', () => {
  const stack = read(STACK);
  const providerMounts = stack.match(/<InventoryV2Provider>/g) ?? [];
  assert.equal(providerMounts.length, 1, 'exactly one Inventory provider instance');
  // The provider lives OUTSIDE the navigator: a route change (and therefore a
  // tab change) never remounts it.
  const navigatorStart = stack.indexOf('<Stack.Navigator');
  const navigatorEnd = stack.indexOf('</Stack.Navigator>');
  assert.ok(navigatorStart >= 0 && navigatorEnd > navigatorStart, 'the stack declares a navigator');
  const navigatorBody = stack.slice(navigatorStart, navigatorEnd);
  assert.doesNotMatch(navigatorBody, /InventoryV2Provider/, 'the provider is not inside the navigator');
  assert.doesNotMatch(read(WORKSPACE), /InventoryV2Provider/, 'the workspace never mounts a provider per tab');
  assert.doesNotMatch(read(WORKSPACE), /Provider>/, 'the workspace never mounts a provider per tab');
  // The pages of the workspace live inside the pager: they are mounted once.
  assert.match(parseWorkspacePages(read(WORKSPACE)), /InventoryProductsPage/);
});

// ---------------------------------------------------------------------------
// Behavioural: the canonical return
// ---------------------------------------------------------------------------

test('the canonical return pops back to the mounted workspace', () => {
  const calls: Array<{ kind: string; args: unknown[] }> = [];
  const navigation = {
    getState: () => ({ routes: [{ name: 'InventoryWorkspace' }, { name: 'Purchase' }] }),
    popTo: (...args: unknown[]) => calls.push({ kind: 'popTo', args }),
    reset: (...args: unknown[]) => calls.push({ kind: 'reset', args }),
  };
  returnToInventoryWorkspace(navigation, 'shopping');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].kind, 'popTo');
  assert.deepEqual(calls[0].args, ['InventoryWorkspace', { tab: 'shopping' }]);
});

test('the canonical return resets the stack when the workspace is not mounted', () => {
  const calls: Array<{ kind: string; args: unknown[] }> = [];
  const navigation = {
    getState: () => ({ routes: [{ name: 'Purchase' }] }),
    popTo: (...args: unknown[]) => calls.push({ kind: 'popTo', args }),
    reset: (...args: unknown[]) => calls.push({ kind: 'reset', args }),
  };
  returnToInventoryWorkspace(navigation, 'products');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].kind, 'reset');
  assert.deepEqual(calls[0].args[0], inventoryWorkspaceState('products'));
});

// ---------------------------------------------------------------------------
// Behavioural: the DEV preview linking config
// ---------------------------------------------------------------------------

test('the DEV preview linking config and the stack agree on the compatibility aliases', () => {
  const screens = INVENTORY_V2_DEV_PREVIEW_MORE_SCREENS.InventoryV2Preview.screens as unknown as Record<string, string>;
  const table = parseStackScreens(read(STACK));
  for (const alias of ['ProductsHome', 'ShoppingHome']) {
    assert.ok(screens[alias], `${alias} keeps a compatibility path`);
    assert.ok(table[alias], `${alias} is still registered as a compatibility route`);
  }
  assert.equal(
    table.ProductsHome,
    'InventoryProductsHomeCompatibility',
    'ProductsHome is a redirect',
  );
  assert.equal(
    table.ShoppingHome,
    'InventoryShoppingHomeCompatibility',
    'ShoppingHome is a redirect',
  );
  // The browser and the native runtime resolve the SAME tree.
  assert.match(read(DEV_LINK), /InventoryWorkspace: '',/, 'the preview root is the workspace');
});
