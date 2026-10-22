/**
 * Inventory V2 — Block 1 Premium UX shared system tests.
 *
 * Covers the SHARED SYSTEM contracts frozen in
 * `docs/implementation/inventory/v2/03_INVENTORY_PREMIUM_UX_FREEZE.md`:
 *
 * - the detent model (presets, settle, rubber band, dismiss, keyboard
 *   promotion);
 * - the overlay registry (primary overlay blocks, popover closes on gesture);
 * - the bottom chrome model (content inset, toast anchor, overlay relation);
 * - the motion token authority;
 * - the haptic intent vocabulary;
 * - the structural contracts of the pager, the sheet, the canonical selector,
 *   the workspace and the single Inventory state authority.
 *
 * Run via `node tests/run.js inventory-v2-premium`.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  DETENT_SETTLE_VELOCITY,
  KEYBOARD_MIN_USABLE_HEIGHT,
  NEAR_FULL_TOP_GAP,
  applyRubberBand,
  closestDetentIndex,
  resolveDismissIntent,
  resolveKeyboardDetentIndex,
  resolveSettledDetentIndex,
  resolveSheetDetents,
  resolveUsableViewportHeight,
} from '../front/mi-front-limpio/services/core/sheetDetents';
import {
  closeAllOverlays,
  closeOpenPopovers,
  getOverlaySnapshot,
  hasOpenOverlay,
  hasOpenPopover,
  hasPrimaryOverlay,
  registerOverlay,
  resetOverlayRegistry,
  unregisterOverlay,
} from '../front/mi-front-limpio/services/core/overlayRegistry';
import {
  BOTTOM_CHROME_METRICS,
  resolveContentBottomInset,
  resolveOverlayRelationship,
  resolveToastBottomAnchor,
} from '../front/mi-front-limpio/services/core/bottomChrome';

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

const VIEWPORT = 800;
const SAFE_TOP = 47;

// ---------------------------------------------------------------------------
// 1. Detent model
// ---------------------------------------------------------------------------

test('compact, standard and flow are presets of the same detent model', () => {
  const compact = resolveSheetDetents('compact', VIEWPORT, SAFE_TOP);
  const standard = resolveSheetDetents('standard', VIEWPORT, SAFE_TOP);
  const flow = resolveSheetDetents('flow', VIEWPORT, SAFE_TOP);

  assert.equal(compact.length, 2, 'compact has a natural and a medium detent');
  assert.equal(standard.length, 3, 'standard has two detents plus the near-full one');
  assert.equal(flow.length, 2, 'flow has a tall detent plus the near-full one');

  for (const detents of [compact, standard, flow]) {
    assert.deepEqual(
      detents,
      [...detents].sort((a, b) => a - b),
      'detents are sorted ascending',
    );
    assert.ok(detents[detents.length - 1] <= VIEWPORT - SAFE_TOP, 'no detent invades the unsafe top area');
  }
});

test('the preset defaults match the frozen percentages', () => {
  const compact = resolveSheetDetents('compact', VIEWPORT, SAFE_TOP);
  const standard = resolveSheetDetents('standard', VIEWPORT, SAFE_TOP);
  const flow = resolveSheetDetents('flow', VIEWPORT, SAFE_TOP);

  const ratio = (value: number) => value / VIEWPORT;
  assert.ok(ratio(compact[0]) >= 0.30 && ratio(compact[0]) <= 0.35, 'compact natural is 30-35%');
  assert.ok(ratio(compact[1]) >= 0.55 && ratio(compact[1]) <= 0.60, 'compact medium is 55-60%');
  assert.ok(ratio(standard[0]) >= 0.45 && ratio(standard[0]) <= 0.50, 'standard first is 45-50%');
  assert.ok(ratio(standard[1]) >= 0.70 && ratio(standard[1]) <= 0.75, 'standard second is 70-75%');
  assert.ok(ratio(flow[0]) >= 0.70 && ratio(flow[0]) <= 0.75, 'flow first is 70-75%');
});

test('the near-full detent keeps the safe area and the top separation', () => {
  const standard = resolveSheetDetents('standard', VIEWPORT, SAFE_TOP);
  const nearFull = standard[standard.length - 1];
  assert.equal(nearFull, VIEWPORT - SAFE_TOP - NEAR_FULL_TOP_GAP);
});

test('a release settles on a detent using position, direction and velocity', () => {
  const detents = resolveSheetDetents('standard', VIEWPORT, SAFE_TOP);
  const [low, mid, high] = detents;

  assert.equal(closestDetentIndex(detents, low), 0);
  assert.equal(closestDetentIndex(detents, high), 2);

  // Slow release: the closest detent wins.
  assert.equal(resolveSettledDetentIndex({ detents, currentHeight: low + 20 }), 0);
  assert.equal(resolveSettledDetentIndex({ detents, currentHeight: mid + 20 }), 1);
  // Fast flick up: it travels to the next detent even with a short travel.
  assert.equal(
    resolveSettledDetentIndex({ detents, currentHeight: mid - 5, velocity: -DETENT_SETTLE_VELOCITY - 0.1 }),
    2,
  );
  // Fast flick down.
  assert.equal(
    resolveSettledDetentIndex({ detents, currentHeight: mid + 5, velocity: DETENT_SETTLE_VELOCITY + 0.1 }),
    0,
  );
  // A single detent never moves.
  assert.equal(resolveSettledDetentIndex({ detents: [low], currentHeight: low, velocity: -1 }), 0);
});

test('the rubber band resists progressively and never returns more than it was given', () => {
  const resisted = applyRubberBand(120, 800);
  assert.ok(resisted > 0, 'the overflow keeps its direction');
  assert.ok(resisted < 120, 'the overflow is resisted');
  assert.ok(resisted > applyRubberBand(40, 800), 'the resistance grows with the overflow');
  assert.equal(applyRubberBand(0, 800), 0);
});

test('a dismissal needs the minimum detent plus distance or velocity', () => {
  const detents = resolveSheetDetents('standard', VIEWPORT, SAFE_TOP);
  const minimum = Math.min(...detents);

  assert.equal(
    resolveDismissIntent({ detents, currentHeight: minimum + 10, travel: 10, velocity: 2 }),
    'snap-back',
    'a sheet that did not cross the minimum never dismisses',
  );
  assert.equal(
    resolveDismissIntent({ detents, currentHeight: minimum - 10, travel: 10, velocity: 0 }),
    'snap-back',
    'a small travel without velocity snaps back',
  );
  assert.equal(
    resolveDismissIntent({ detents, currentHeight: minimum - 10, travel: 120, velocity: 0 }),
    'dismiss',
    'a long travel below the minimum dismisses',
  );
  assert.equal(
    resolveDismissIntent({ detents, currentHeight: minimum - 10, travel: 30, velocity: 0.8 }),
    'dismiss',
    'a fast flick below the minimum dismisses',
  );
});

test('the keyboard promotes the sheet instead of collapsing it', () => {
  const detents = resolveSheetDetents('standard', VIEWPORT, SAFE_TOP);
  const keyboardInset = 500;

  const promoted = resolveKeyboardDetentIndex({ detents, currentIndex: 0, keyboardInset });
  assert.ok(promoted > 0, 'the sheet is promoted to a taller detent');
  assert.ok(detents[promoted] - keyboardInset >= KEYBOARD_MIN_USABLE_HEIGHT, 'the promoted detent stays usable');

  assert.equal(
    resolveKeyboardDetentIndex({ detents, currentIndex: 0, keyboardInset: 0 }),
    0,
    'without a keyboard nothing is promoted',
  );
  assert.equal(
    resolveUsableViewportHeight(600, 200),
    400,
    'the usable viewport is the detent minus the keyboard',
  );
});

// ---------------------------------------------------------------------------
// 2. Overlay registry
// ---------------------------------------------------------------------------

test('a primary overlay blocks the pager and a popover does not', () => {
  resetOverlayRegistry();
  assert.equal(hasPrimaryOverlay(), false);

  const unregisterSheet = registerOverlay({ id: 'sheet-1', kind: 'sheet' });
  assert.equal(hasPrimaryOverlay(), true, 'an open sheet blocks the pager');
  unregisterSheet();
  assert.equal(hasPrimaryOverlay(), false, 'closing the sheet releases the pager');

  let popoverClosed = false;
  const unregisterPopover = registerOverlay({
    id: 'popover-1',
    kind: 'popover',
    close: () => { popoverClosed = true; },
  });
  assert.equal(hasPrimaryOverlay(), false, 'a popover never blocks the pager');
  assert.equal(hasOpenPopover(), true);
  unregisterPopover();
  assert.equal(hasOpenPopover(), false);
  resetOverlayRegistry();
});

test('starting a pager gesture closes the open popovers only', () => {
  resetOverlayRegistry();
  let popoverClosed = false;
  let sheetClosed = false;
  registerOverlay({ id: 'popover-1', kind: 'popover', close: () => { popoverClosed = true; } });
  registerOverlay({ id: 'sheet-1', kind: 'sheet', close: () => { sheetClosed = true; } });

  closeOpenPopovers();
  assert.equal(popoverClosed, true, 'the popover is closed by the gesture');
  assert.equal(sheetClosed, false, 'a primary overlay is not closed by the pager');
  assert.equal(hasPrimaryOverlay(), true, 'the primary overlay still blocks the pager');

  closeAllOverlays();
  assert.equal(sheetClosed, true);
  assert.equal(hasOpenOverlay(), false);
  resetOverlayRegistry();
});

test('an overlay can be unregistered by id', () => {
  resetOverlayRegistry();
  registerOverlay({ id: 'sheet-2', kind: 'sheet' });
  unregisterOverlay('sheet-2');
  assert.equal(getOverlaySnapshot().count, 0);
  resetOverlayRegistry();
});

// ---------------------------------------------------------------------------
// 3. Bottom chrome
// ---------------------------------------------------------------------------

test('the bottom chrome owns the content inset of every frozen surface', () => {
  const base = { keyboardVisible: false, safeAreaBottom: 0 };
  const nav = resolveContentBottomInset({ ...base, slot: 'bottom-nav' });
  const selection = resolveContentBottomInset({ ...base, slot: 'selection-bar' });
  const sticky = resolveContentBottomInset({ ...base, slot: 'sticky-cta' });

  assert.equal(nav, BOTTOM_CHROME_METRICS.bottomNavHeight + BOTTOM_CHROME_METRICS.bottomNavGap);
  assert.ok(selection > nav, 'the selection bar reserves more room than the nav alone');
  assert.ok(sticky > nav, 'the sticky CTA reserves more room than the nav alone');
  assert.equal(
    resolveContentBottomInset({ ...base, slot: 'none' }),
    0,
    'a surface without chrome reserves nothing',
  );
});

test('a toast always floats above the chrome that is visible', () => {
  const base = { keyboardVisible: false, safeAreaBottom: 0 };
  for (const slot of ['none', 'bottom-nav', 'selection-bar', 'sticky-cta'] as const) {
    const anchor = resolveToastBottomAnchor({ ...base, slot });
    const inset = resolveContentBottomInset({ ...base, slot });
    assert.ok(anchor >= inset, `the toast of ${slot} never hides behind its own chrome`);
    assert.ok(anchor > inset, `the toast of ${slot} floats above its own chrome`);
  }
});

test('an overlay covers the chrome, except the sheet footer it owns', () => {
  const base = { keyboardVisible: false, safeAreaBottom: 0 };
  assert.equal(resolveOverlayRelationship({ ...base, slot: 'bottom-nav' }, true), 'covers-chrome');
  assert.equal(resolveOverlayRelationship({ ...base, slot: 'bottom-nav' }, false), 'below-chrome');
  assert.equal(resolveOverlayRelationship({ ...base, slot: 'sheet-footer' }, true), 'below-chrome');
});

// ---------------------------------------------------------------------------
// 4. Motion tokens
// ---------------------------------------------------------------------------

test('the motion authority keeps the frozen Premium UX durations', () => {
  const theme = read('front/mi-front-limpio/constants/theme.ts');
  assert.match(theme, /premium:\s*\{/, 'the shared MOTION token owns the premium vocabulary');
  for (const [token, value] of Object.entries({
    press: 80,
    micro: 120,
    state: 150,
    content: 170,
    localNav: 180,
    popoverIn: 130,
    popoverOut: 100,
    sheetIn: 200,
    sheetOut: 175,
    route: 200,
    success: 190,
  })) {
    assert.match(theme, new RegExp(`${token}:\\s*${value}\\b`), `${token} is ${value}ms`);
  }
});

test('the motion system exposes the three frozen curves', () => {
  const motionSystem = read('front/mi-front-limpio/constants/motionSystem.ts');
  assert.match(motionSystem, /standardOut/);
  assert.match(motionSystem, /standardInOut/);
  assert.match(motionSystem, /direct:\s*Easing\.linear/);
  assert.match(motionSystem, /resolveMotionDuration/);
  assert.match(motionSystem, /MOTION\.premium/, 'the system reads the single shared motion authority');
});

// ---------------------------------------------------------------------------
// 5. Haptic contract
// ---------------------------------------------------------------------------

test('the haptic vocabulary is centralized and semantic', () => {
  const haptics = read('front/mi-front-limpio/utils/haptics.ts');
  assert.match(
    haptics,
    /export type HapticIntent = 'none' \| 'selection' \| 'light' \| 'success' \| 'warning' \| 'error'/,
    'the frozen minimum vocabulary is declared once',
  );
  assert.match(haptics, /export function hapticIntent\(intent: HapticIntent\)/);
  assert.match(haptics, /case 'none':\s*return;/, 'none never vibrates');

  const planner = read('front/mi-front-limpio/utils/plannerHaptics.ts');
  assert.match(planner, /from '\.\/haptics'/, 'the planner vocabulary delegates to the shared authority');
  assert.doesNotMatch(planner, /Haptics\.selectionAsync/, 'the planner does not call the device directly');
});

// ---------------------------------------------------------------------------
// 6. Canonical primitives
// ---------------------------------------------------------------------------

test('the canonical selector supports an external interactive progress', () => {
  const segmented = read('front/mi-front-limpio/components/ui/SegmentedControl.tsx');
  assert.match(segmented, /interactiveProgress\?: number/);
  assert.match(segmented, /interpolateRunGeometry/);
  assert.match(segmented, /haptic="selection"/, 'the canonical selector declares the selection intent');
});

test('the shared sheet exposes the detent, grabber, dirty and commit contracts', () => {
  const sheet = read('front/mi-front-limpio/components/ui/BottomSheet.tsx');
  assert.match(sheet, /resolveSheetDetents/);
  assert.match(sheet, /resolveSettledDetentIndex/);
  assert.match(sheet, /resolveDismissIntent/);
  assert.match(sheet, /resolveKeyboardDetentIndex/);
  assert.match(sheet, /applyRubberBand/);
  assert.match(sheet, /minHeight: 44/, 'the grabber touch area is at least 44px');
  assert.match(sheet, /onRequestDismissGuard/, 'the dirty guard is honoured');
  assert.match(sheet, /committingRef\.current/, 'the commit lock is honoured');
  assert.doesNotMatch(sheet, /autoFocus/, 'the primitive never imposes autofocus');
  assert.doesNotMatch(sheet, /KeyboardAvoidingView/, 'the keyboard never moves the sheet');
  assert.doesNotMatch(sheet, /bottom: keyboardInset/, 'the keyboard never translates the outer geometry of the sheet');
  assert.match(sheet, /keyboardReserve/, 'the keyboard reserves space INSIDE the sheet');
  assert.match(sheet, /marginBottom: keyboardReserve/, 'the footer stays above the keyboard');
  assert.match(sheet, /registerOverlay\(\{/, 'a sheet registers as a primary overlay');
});

test('the sheet animated graph never mixes a layout property with the native driver', () => {
  const sheet = read('front/mi-front-limpio/components/ui/BottomSheet.tsx');
  // The height is a LAYOUT property: it can only be driven by the JS thread.
  const heightAnimations = sheet.match(/Animated\.timing\(height,\s*\{[\s\S]*?useNativeDriver:\s*(true|false)/g) ?? [];
  assert.ok(heightAnimations.length > 0, 'the sheet animates its height');
  for (const animation of heightAnimations) {
    assert.match(animation, /useNativeDriver: false/, `the height is never natively driven: ${animation}`);
  }
  assert.doesNotMatch(sheet, /Animated\.timing\(height,\s*\{[\s\S]*?useNativeDriver: true/, 'no native-driven height animation exists');
  // The geometry layer and the motion layer are two DIFFERENT nodes.
  assert.match(sheet, /sheetGeometry/, 'the sheet owns a geometry layer');
  assert.match(sheet, /sheetMotion/, 'the sheet owns a motion layer');
  const geometryStyle = sheet.match(/style=\{\[styles\.sheetGeometry,[^\]]*\]\}/);
  assert.ok(geometryStyle, 'the geometry layer declares its own style');
  assert.doesNotMatch(geometryStyle[0], /opacity|translate/, 'the geometry layer carries no native-driven motion');
  assert.doesNotMatch(sheet, /height:[^,}]*,\s*opacity/, 'height and opacity never share one animated style object');
});

test('the shared pager owns the gesture intent, the edge back and the popover', () => {
  const pager = read('front/mi-front-limpio/components/ui/HorizontalPager.tsx');
  assert.match(pager, /hasPrimaryOverlay\(\)/, 'a primary overlay disables the pager');
  assert.match(pager, /closeOpenPopovers\(\)/, 'starting a gesture closes the popovers');
  assert.match(pager, /edgeBackZone/, 'the native edge back keeps priority');
  assert.match(pager, /intentRatio/, 'the horizontal intent is a token');
  assert.match(pager, /settleVelocity/, 'the settle velocity is a token');
  assert.match(pager, /applyRubberBand/, 'the pager resists past the boundaries');
});

test('the legacy sheet delegates to the canonical primitive without changing its own path', () => {
  const actionSheet = read('front/mi-front-limpio/components/ui/ActionSheet.tsx');
  assert.match(actionSheet, /<BottomSheet/);
  assert.match(actionSheet, /function ActionSheetLegacy/);
  assert.match(actionSheet, /interactive\?: 'compact' \| 'standard' \| 'flow'/);
});

test('no Inventory prefixed clone of a global primitive exists', () => {
  const uiDir = path.join(root, 'front/mi-front-limpio/components/ui');
  const offenders = fs
    .readdirSync(uiDir)
    .filter((file) => /^Inventory(Button|Motion|Sheet|Popover|Special|Custom)/.test(file));
  assert.deepEqual(offenders, [], 'the shared primitives are reused, not cloned');

  const inventoryComponents = path.join(root, 'front/mi-front-limpio/components/inventory');
  const cloned = fs
    .readdirSync(inventoryComponents)
    .filter((file) => /^(InventoryButton|InventoryMotion|InventoryBottomSheet|InventoryPager)\./.test(file));
  assert.deepEqual(cloned, [], 'the Inventory feature folder owns no primitive clone');
});

// ---------------------------------------------------------------------------
// 7. Workspace, header contract and state authority
// ---------------------------------------------------------------------------

test('the workspace owns the shell and the canonical selector', () => {
  const workspace = read('front/mi-front-limpio/screens/inventory/v2/InventoryWorkspaceScreen.tsx');
  assert.match(workspace, /SegmentedControl/, 'the workspace uses the canonical selector');
  assert.match(workspace, /HorizontalPager/, 'the workspace hosts the pager');
  assert.match(workspace, /Inventario/, 'the context header is stable');
  assert.match(workspace, /disabled=\{transitioning\}/, 'the header actions are not actionable during a transition');
  assert.match(workspace, /onSettled=/, 'the active tab changes only when the pager settles');
  assert.doesNotMatch(workspace, /navigate\('ProductsHome'\)|navigate\('ShoppingHome'\)/, 'the workspace never navigates to simulate a tab change');
});

test('the Inventory state authority is a single provider for the whole stack', () => {
  const stack = read('front/mi-front-limpio/navigation/InventoryV2Stack.tsx');
  const providerMounts = stack.match(/<InventoryV2Provider>/g) ?? [];
  assert.equal(providerMounts.length, 1, 'exactly one Inventory provider instance');
  assert.match(stack, /initialRouteName="InventoryWorkspace"/, 'the workspace is the Inventory entry');
  assert.match(stack, /<BottomChromeProvider>/, 'the bottom chrome contract wraps the stack');

  const workspace = read('front/mi-front-limpio/screens/inventory/v2/InventoryWorkspaceScreen.tsx');
  assert.doesNotMatch(workspace, /InventoryV2Provider/, 'the workspace never mounts a provider per tab');
  assert.doesNotMatch(workspace, /Provider>/, 'the workspace never mounts a provider per tab');

  const context = read('front/mi-front-limpio/context/InventoryV2Context.tsx');
  assert.match(context, /scopeKey=accountId&&householdId/, 'the household stays the hard boundary');
  assert.match(context, /type:'reset',scopeKey,online/, 'a household change resets the authority');
});

test('the Inventory feature owns no independent store', () => {
  const context = read('front/mi-front-limpio/context/InventoryV2Context.tsx');
  for (const forbidden of ['ProductsStore', 'ShoppingStore', 'PurchaseStore']) {
    assert.doesNotMatch(context, new RegExp(forbidden), `${forbidden} does not exist`);
  }
  const provider = read('front/mi-front-limpio/context/InventoryV2Context.tsx');
  assert.match(provider, /export function InventoryV2Provider/, 'there is a single authority');
});

// ---------------------------------------------------------------------------
// 8. Reduced motion
// ---------------------------------------------------------------------------

test('reduced motion is a single shared store with a DEV override', () => {
  const hook = read('front/mi-front-limpio/hooks/useReducedMotion.ts');
  assert.match(hook, /useSyncExternalStore/, 'the shared external store is the authority');
  assert.match(hook, /export function setReducedMotionOverride/, 'the QA harness can force the state in DEV');
  assert.match(hook, /if \(typeof __DEV__ === 'undefined' \|\| !__DEV__\) return;/, 'the override never exists in production');
});

// ---------------------------------------------------------------------------
// 9. QA harness
// ---------------------------------------------------------------------------

test('the QA harness is GONE from the app: the real Inventory is the evidence', () => {
  const stack = read('front/mi-front-limpio/navigation/InventoryV2Stack.tsx');
  assert.doesNotMatch(stack, /InventoryPremiumQA/, 'the QA route does not exist at all');
  const harnessPath = path.join(
    root,
    'front/mi-front-limpio/screens/inventory/v2/InventoryPremiumQAScreen.tsx',
  );
  assert.equal(fs.existsSync(harnessPath), false, 'the QA harness screen does not exist');

  const products = read('front/mi-front-limpio/screens/inventory/v2/InventoryV2Screens.tsx');
  assert.doesNotMatch(products, /QA Premium UX/, 'the Products overflow has no QA entry');
  assert.doesNotMatch(products, /premium-qa/, 'the Products overflow declares no QA action');

  // The DEV preview entry itself SURVIVES: Inventory V2 has no production
  // cutover yet, so `Más > Inventario V2` is still the temporary entry.
  const more = read('front/mi-front-limpio/screens/MoreScreen.tsx');
  assert.match(more, /navigation\.navigate\('InventoryV2Preview'\)/, 'the DEV preview entry survives');
});

// ---------------------------------------------------------------------------
// 10. Bottom chrome wiring
// ---------------------------------------------------------------------------

test('the toast anchor follows the declared chrome', () => {
  const toast = read('front/mi-front-limpio/components/ui/AppToastHost.tsx');
  assert.match(toast, /useBottomChrome\(\)/);
  assert.match(toast, /bottomOffset \?\? chrome\.toastBottomAnchor/, 'an explicit offset still wins');
  const chromeContext = read('front/mi-front-limpio/context/BottomChromeContext.tsx');
  assert.match(chromeContext, /resolveContentBottomInset/);
  assert.match(chromeContext, /resolveToastBottomAnchor/);
});
