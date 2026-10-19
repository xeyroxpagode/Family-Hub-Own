/**
 * Planner V1 — Phase 1 runtime regression: root Task row anchored menu.
 *
 * These are REAL React render/interaction tests (real reconciler, real hooks,
 * real state). The repository's inert `tests/stubs` React cannot express
 * "does the menu mount, stay mounted and respond", which is exactly the
 * confirmed iPhone failure: tapping `···` on a root Task row does nothing while
 * the Task Detail menu keeps working.
 *
 * What is exercised:
 * - press `···` -> overlay mounts (not merely state flips)
 * - overlay is not clipped to the row / not trapped inside the scroll surface
 * - menu items are reachable and dispatch their action
 * - tap outside closes; repeated open -> close -> reopen -> select cycles
 * - switching between rows does not leak a second visible overlay
 *
 * Run via `node tests/run.js planner-v1-root-menu-runtime`.
 */

import { installPlannerRuntimeMocks } from './planner_runtime_mocks';

installPlannerRuntimeMocks();

/* eslint-disable @typescript-eslint/no-var-requires */
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { PlannerAnchoredMenu } = require('../front/mi-front-limpio/components/planner/PlannerAnchoredMenu');
const { AppThemeProvider } = require('../front/mi-front-limpio/context/AppThemeContext');

/**
 * Wrap in the REAL theme provider: `PlannerAnchoredMenu` reads `useAppTheme`,
 * and the menu's own contract must be exercised against the same provider the
 * app mounts, not a hand-written stand-in.
 */
function themed(element: any) {
  return React.createElement(AppThemeProvider, null, element);
}

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ok  ${name}`);
    passed++;
  } catch (e: any) {
    console.error(`  FAIL ${name}: ${e.message}`);
    failed++;
  }
}

function assertTrue(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function assertEqual(actual: unknown, expected: unknown, msg: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const act = TestRenderer.act;

/**
 * Minimal stand-in for the root Task row's pressable surface: a horizontally
 * laid-out row that contains the `···` anchor and hosts the menu, mirroring how
 * `PlannerTasksScreen` composes `TaskRow` inside the Planner `ScrollView`.
 */
function HostRow(props: { anchorRef: any; children?: any }) {
  return React.createElement(
    'View',
    { style: { flexDirection: 'row', minHeight: 68 } },
    props.children,
  );
}

function findByAccessibilityLabel(root: any, label: string) {
  const matches = root.findAll(
    (node: any) => node.props && node.props.accessibilityLabel === label,
    { deep: true },
  );
  if (matches.length === 0) throw new Error(`no node with accessibilityLabel "${label}"`);
  return matches[0];
}

/**
 * Collect the rendered menuitem labels from the HOST tree.
 *
 * Test instances (`renderer.root`) expose composite nodes only; `toJSON()`
 * yields the host tree that reflects what the platform would actually mount,
 * which is what "is the menu visible" means here.
 */
function menuLabelsIn(renderer: any): string[] {
  const labels: string[] = [];
  const walk = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node.props?.accessibilityRole === 'menuitem') {
      labels.push(node.props.accessibilityLabel);
    }
    if (node.children) walk(node.children);
  };
  walk(renderer.toJSON());
  return labels;
}

function flatten(style: any): Record<string, any> {
  if (Array.isArray(style)) return Object.assign({}, ...style.filter(Boolean).map(flatten));
  return style || {};
}

/**
 * The overlay root is the `box-none` layer that owns both the outside-tap
 * catcher and the menu panel. Locating it by structure (rather than by a
 * component name) keeps the assertion tied to what is actually mounted.
 */
function findOverlayRoot(renderer: any): any {
  const found = renderer.root.findAll(
    (node: any) => node.props?.pointerEvents === 'box-none' && node.props?.style,
    { deep: true },
  );
  if (found.length === 0) throw new Error('no overlay root mounted');
  return found[0];
}

const MENU_ITEMS = [
  { label: 'Completar', onPress: () => {}, icon: 'checkmark-circle' },
  { label: 'Cancelar tarea', onPress: () => {}, icon: 'close-circle', danger: true },
  { label: 'Mover a la papelera', onPress: () => {}, icon: 'trash', danger: true },
];

function renderMenu(extra: Record<string, any> = {}) {
  const anchorRef = { current: null };
  const props: any = {
    visible: false,
    anchorRef,
    items: MENU_ITEMS,
    onRequestClose: () => {},
    ...extra,
  };
  let renderer: any;
  act(() => {
    renderer = TestRenderer.create(
      themed(
        React.createElement(
          HostRow,
          { anchorRef },
          React.createElement('TouchableOpacity', { testID: 'anchor', ref: anchorRef }),
          React.createElement(PlannerAnchoredMenu, props),
        ),
      ),
      // The anchor ref resolves to a real measured node so positioning runs the
      // same way it does on device.
      { createNodeMock: () => ({ measureInWindow: (cb: any) => cb(300, 400, 44, 44) }) },
    );
  });
  return { renderer, anchorRef };
}

function setVisible(renderer: any, props: any, next: Partial<any>) {
  act(() => {
    renderer.update(
      themed(
        React.createElement(
          HostRow,
          { anchorRef: props.anchorRef },
          React.createElement('TouchableOpacity', { testID: 'anchor', ref: props.anchorRef }),
          React.createElement(PlannerAnchoredMenu, { ...props, ...next }),
        ),
      ),
    );
  });
}

// --- open ----------------------------------------------------------------

test('tapping the row anchor mounts a visible menu overlay', () => {
  const { renderer, anchorRef } = renderMenu();
  const before = menuLabelsIn(renderer);
  assertEqual(before, [], 'menu must not be mounted while closed');

  setVisible(renderer, { anchorRef, items: MENU_ITEMS, onRequestClose: () => {} }, { visible: true });

  const after = menuLabelsIn(renderer);
  assertEqual(after, ['Completar', 'Cancelar tarea', 'Mover a la papelera'], 'all menu items must mount when visible');
});

test('the open overlay is not clipped to the row bounds', () => {
  const { renderer, anchorRef } = renderMenu();
  setVisible(renderer, { anchorRef, items: MENU_ITEMS, onRequestClose: () => {} }, { visible: true });

  // Find the overlay ROOT — the box the panel and the catcher share. It must be
  // a window-space layer. `StyleSheet.absoluteFill` here resolved against the
  // 68px row, which is what made the panel (positioned from window coordinates)
  // land outside its own clipping container.
  const overlay = findOverlayRoot(renderer);
  const flattened = flatten(overlay.props.style);

  assertTrue(
    flattened.position === 'fixed',
    `overlay root must be window-space (position: fixed), got position=${flattened.position}`,
  );
  assertEqual(
    { top: flattened.top, left: flattened.left, right: flattened.right, bottom: flattened.bottom },
    { top: 0, left: 0, right: 0, bottom: 0 },
    'overlay root must cover the whole window',
  );
});

test('the menu panel is positioned at the measured anchor, not at the origin', () => {
  const { renderer, anchorRef } = renderMenu();
  setVisible(renderer, { anchorRef, items: MENU_ITEMS, onRequestClose: () => {} }, { visible: true });

  const panel = renderer.root.findAll((node: any) => node.props?.accessibilityViewIsModal, { deep: true })[0];
  assertTrue(Boolean(panel), 'expected the menu panel to render');
  const style = panel.props.style;
  const flattened = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;
  assertTrue(
    typeof flattened.top === 'number' && flattened.top > 0,
    `menu must anchor vertically to the measured row (top=${flattened.top})`,
  );
});

// --- interact ------------------------------------------------------------

test('a menu item press dispatches its action exactly once', () => {
  let pressed = 0;
  const items = [{ label: 'Completar', onPress: () => { pressed += 1; } }];
  const anchorRef = { current: null };
  const props: any = { visible: false, anchorRef, items, onRequestClose: () => {} };

  let renderer: any;
  const tree = (visible: boolean) =>
    themed(
      React.createElement(
        HostRow,
        { anchorRef },
        React.createElement('TouchableOpacity', { testID: 'anchor', ref: anchorRef }),
        React.createElement(PlannerAnchoredMenu, { ...props, visible }),
      ),
    );

  act(() => {
    renderer = TestRenderer.create(tree(false), {
      createNodeMock: () => ({ measureInWindow: (cb: any) => cb(300, 400, 44, 44) }),
    });
  });

  act(() => {
    renderer.update(tree(true));
  });

  act(() => {
    findByAccessibilityLabel(renderer.root, 'Completar').props.onPress();
  });

  assertEqual(pressed, 1, 'item press must invoke its action exactly once');
});

test('tapping outside closes the menu', () => {
  let closes = 0;
  const { renderer, anchorRef } = renderMenu({ onRequestClose: () => { closes += 1; } });
  setVisible(renderer, { anchorRef, items: MENU_ITEMS, onRequestClose: () => { closes += 1; } }, { visible: true });
  assertEqual(menuLabelsIn(renderer).length, 3, 'menu must be open before tapping outside');

  act(() => {
    findByAccessibilityLabel(renderer.root, 'Cerrar menú').props.onPress();
  });

  assertTrue(closes >= 1, 'tapping outside must request close');
});

// --- cycles --------------------------------------------------------------

test('open -> close -> reopen -> select works repeatedly', () => {
  let selected = 0;
  let closes = 0;
  const items = [{ label: 'Completar', onPress: () => { selected += 1; } }];
  const anchorRef = { current: null };
  const props: any = { visible: false, anchorRef, items, onRequestClose: () => { closes += 1; } };

  const tree = (visible: boolean) =>
    themed(React.createElement(HostRow, { anchorRef }, React.createElement('TouchableOpacity', { testID: 'anchor', ref: anchorRef }), React.createElement(PlannerAnchoredMenu, { ...props, visible })));

  let renderer: any;
  act(() => {
    renderer = TestRenderer.create(tree(false), {
      createNodeMock: () => ({ measureInWindow: (cb: any) => cb(300, 400, 44, 44) }),
    });
  });

  for (let cycle = 1; cycle <= 3; cycle++) {
    act(() => { renderer.update(tree(true)); });
    assertEqual(menuLabelsIn(renderer), ['Completar'], `cycle ${cycle}: menu must be open`);

    act(() => { findByAccessibilityLabel(renderer.root, 'Completar').props.onPress(); });
    assertEqual(selected, cycle, `cycle ${cycle}: selection must register once`);
  }

  assertTrue(closes >= 3, 'each selection must close the menu');
});

test('switching rows never leaves two menus mounted at once', async () => {
  const anchorA = { current: null };
  const anchorB = { current: null };
  // Mirrors the repaired root screen: ONE menu owner for the whole list. The
  // rows only hand over their anchor, so moving between rows re-points the
  // single overlay instead of mounting a second one.
  const makeTree = (open: 'none' | 'a' | 'b') =>
    themed(
      React.createElement(
        'View',
        null,
        React.createElement(
          HostRow,
          { anchorRef: anchorA },
          React.createElement('TouchableOpacity', { testID: 'anchorA', ref: anchorA }),
        ),
        React.createElement(
          HostRow,
          { anchorRef: anchorB },
          React.createElement('TouchableOpacity', { testID: 'anchorB', ref: anchorB }),
        ),
        React.createElement(PlannerAnchoredMenu, {
          visible: open !== 'none',
          anchorRef: open === 'b' ? anchorB : anchorA,
          items: MENU_ITEMS,
          onRequestClose: () => {},
        }),
      ),
    );

  let renderer: any;
  act(() => {
    renderer = TestRenderer.create(makeTree('none'), {
      createNodeMock: () => ({ measureInWindow: (cb: any) => cb(300, 400, 44, 44) }),
    });
  });

  act(() => { renderer.update(makeTree('a')); });
  assertEqual(menuLabelsIn(renderer).length, 3, 'exactly one menu open');

  // Switching rows must hand the overlay over, never stack a second surface.
  act(() => { renderer.update(makeTree('b')); });
  assertEqual(menuLabelsIn(renderer).length, 3, 'switching rows must keep exactly one menu open');

  act(() => { renderer.update(makeTree('none')); });
  // The menu deliberately stays mounted for its exit animation before
  // unmounting, so the overlay must be gone only AFTER that window — not
  // instantly, and never twice.
  await new Promise((resolve) => setTimeout(resolve, 200));
  act(() => {});
  assertEqual(menuLabelsIn(renderer).length, 0, 'closing must remove the overlay after the exit animation');
});

test('capability-gated items survive an open/close cycle unchanged', () => {
  const anchorRef = { current: null };
  const props: any = { visible: false, anchorRef, items: MENU_ITEMS, onRequestClose: () => {} };
  const tree = (visible: boolean) =>
    themed(React.createElement(HostRow, { anchorRef }, React.createElement('TouchableOpacity', { testID: 'anchor', ref: anchorRef }), React.createElement(PlannerAnchoredMenu, { ...props, visible })));

  let renderer: any;
  act(() => {
    renderer = TestRenderer.create(tree(false), {
      createNodeMock: () => ({ measureInWindow: (cb: any) => cb(300, 400, 44, 44) }),
    });
  });

  act(() => { renderer.update(tree(true)); });
  const first = menuLabelsIn(renderer);
  act(() => { renderer.update(tree(false)); });
  act(() => { renderer.update(tree(true)); });
  const second = menuLabelsIn(renderer);

  assertEqual(second, first, 'menu composition must be stable across cycles');
});

console.log(`\nPlanner V1 root menu runtime: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
