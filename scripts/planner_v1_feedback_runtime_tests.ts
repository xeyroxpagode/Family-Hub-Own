/**
 * Planner V1 — Phase 1 runtime regression: productive feedback pipeline.
 *
 * Traces the real chain, end to end, through a real reconciler:
 *
 *   productive mutation -> pushToast -> provider store -> ToastHost
 *   subscription -> overlay mount -> presentation -> Undo -> inverse mutation
 *
 * The confirmed iPhone defect is that NO toast is ever visible after a Task
 * action, including a confirmed "Move to Trash" from Task Detail. A mounted
 * ToastHost proves nothing, so every assertion below checks what the platform
 * would actually render and what a tap actually invokes.
 *
 * Run via `node tests/run.js planner-v1-feedback-runtime`.
 */

import { installPlannerRuntimeMocks } from './planner_runtime_mocks';

installPlannerRuntimeMocks();

/* eslint-disable @typescript-eslint/no-var-requires */
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { PlannerSheetProvider, usePlannerSheet } = require('../front/mi-front-limpio/context/PlannerSheetContext');
const { ToastHost } = require('../front/mi-front-limpio/components/planner/ToastHost');
const { AppThemeProvider } = require('../front/mi-front-limpio/context/AppThemeContext');

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      console.log(`  ok  ${name}`);
      passed++;
    })
    .catch((e: any) => {
      if (process.env.PLANNER_RUNTIME_TRACE === '1') console.error(e);
      console.error(`  FAIL ${name}: ${e.message}`);
      failed++;
    });
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
 * Harness with the same ownership as the app: one `PlannerSheetProvider`
 * (the single feedback owner for every Task entry point) wrapping one
 * `ToastHost`. A controller ref lets a test dispatch a REAL `pushToast`
 * exactly as `PlannerTasksScreen` / `TaskDetailScreen` do.
 *
 * `setSheetOpen` reproduces the sheet's own transition, which is what decides
 * whether a toast may be presented.
 */
function createHarness(initialSheetOpen = false) {
  const controllerRef: { current: any } = { current: null };

  function CaptureController() {
    controllerRef.current = usePlannerSheet();
    return null;
  }

  const build = (sheetOpen: boolean) =>
    React.createElement(
      AppThemeProvider,
      null,
      React.createElement(
        PlannerSheetProvider,
        null,
        React.createElement(CaptureController),
        // Mirrors `PlannerSheetHost`: the toast host lives OUTSIDE the Modal, so
        // a mutation performed while a sheet owns the surface must still be able
        // to report after the sheet closes.
        React.createElement(ToastHost, { sheetOpen }),
      ),
    );

  let renderer: any;
  let sheetOpen = initialSheetOpen;
  act(() => {
    renderer = TestRenderer.create(build(sheetOpen));
  });

  return {
    renderer,
    controllerRef,
    isSheetOpen: () => sheetOpen,
    setSheetOpen: (next: boolean) => {
      sheetOpen = next;
      act(() => { renderer.update(build(sheetOpen)); });
    },
  };
}

/** Read the visible toast message(s) from the rendered host tree. */
function renderedToastMessages(renderer: any): string[] {
  const messages: string[] = [];
  const walk = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    };
    if (node.props?.accessibilityLiveRegion === 'polite' || node.props?.role === 'status') {
      const text: string[] = [];
      const collect = (child: any) => {
        if (typeof child === 'string') text.push(child);
        else if (Array.isArray(child)) child.forEach(collect);
        else if (child && child.children) collect(child.children);
      };
      collect(node.children);
      const message = text.join(' ').trim();
      // The toast's own chrome ("Descartar", the Undo label) is not the message.
      const withoutChrome = message
        .replace(/\s*Descartar$/, '')
        .replace(/^Deshacer\s*/, '')
        .replace(/\s*Deshacer$/, '')
        .trim();
      if (withoutChrome) messages.push(withoutChrome);
    }
    if (node.children) walk(node.children);
  };
  walk(renderer.toJSON());
  return messages;
}

function findPressableWithLabel(renderer: any, label: string) {
  const matches = renderer.root.findAll(
    (node: any) => node.props?.accessibilityRole === 'button' && node.props?.accessibilityLabel === label,
    { deep: true },
  );
  return matches[0];
}

/** Flush the Animated entrance and any pending state updates. */
function settle() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function run() {
  // --- dispatch -> presentation -------------------------------------------

  await test('a confirmed mutation surfaces a visible toast', async () => {
    const { renderer, controllerRef } = createHarness();
    assertEqual(renderedToastMessages(renderer), [], 'no toast before the mutation');

    act(() => {
      controllerRef.current.pushToast({ id: 't1', message: 'Tarea movida a la papelera', kind: 'warning' });
    });
    await settle();

    assertEqual(
      renderedToastMessages(renderer),
      ['Tarea movida a la papelera'],
      'a confirmed mutation must render its feedback',
    );
  });

  await test('feedback confirmed inside a sheet survives and appears once it closes', async () => {
    // FLOW C in miniature: the confirm sheet is open, the mutation is confirmed
    // from inside it, the sheet then closes. The user must still be told.
    const { renderer, controllerRef, setSheetOpen, isSheetOpen } = createHarness(true);
    assertTrue(isSheetOpen(), 'harness must start with the sheet owning the surface');

    act(() => {
      controllerRef.current.pushToast({
        id: 't2',
        message: 'Tarea movida a la papelera',
        kind: 'warning',
        undoLabel: 'Deshacer',
        onUndo: () => {},
      });
    });
    await settle();

    // Figma §52.9: nothing may be drawn while the sheet owns the surface.
    assertEqual(
      renderedToastMessages(renderer),
      [],
      'the toast must not be drawn over an open sheet',
    );

    // The sheet closes (as `attemptClose` does after `onConfirm`).
    setSheetOpen(false);
    await settle();

    assertEqual(
      renderedToastMessages(renderer),
      ['Tarea movida a la papelera'],
      'deferred feedback must be presented once the sheet releases the surface',
    );

    // And it must remain actionable — Undo survives the navigation transition.
    assertTrue(
      Boolean(findPressableWithLabel(renderer, 'Deshacer')),
      'Undo must still be reachable after the sheet closed',
    );
  });

  await test('a new toast replaces the previous one instead of stacking', async () => {
    const { renderer, controllerRef } = createHarness();

    act(() => {
      controllerRef.current.pushToast({ id: 'a', message: 'Tarea completada', kind: 'success' });
    });
    await settle();
    act(() => {
      controllerRef.current.pushToast({ id: 'b', message: 'Tarea verificada', kind: 'success' });
    });
    await settle();

    assertEqual(
      renderedToastMessages(renderer),
      ['Tarea verificada'],
      'single-toast contract: the newest message replaces the old one',
    );
  });

  // --- Undo ---------------------------------------------------------------

  await test('Undo invokes the real inverse mutation exactly once', async () => {
    const { renderer, controllerRef } = createHarness();
    let restores = 0;
    const onUndo = () => { restores += 1; };

    act(() => {
      controllerRef.current.pushToast({
        id: 'trash-1',
        message: 'Tarea movida a la papelera',
        kind: 'warning',
        undoLabel: 'Deshacer',
        onUndo,
      });
    });
    await settle();

    const undoButton = findPressableWithLabel(renderer, 'Deshacer');
    assertTrue(Boolean(undoButton), 'a reversible mutation must offer Undo');

    act(() => { undoButton.props.onPress(); });
    await settle();

    assertEqual(restores, 1, 'Undo must invoke the inverse mutation exactly once');
    assertEqual(renderedToastMessages(renderer), [], 'Undo must dismiss the toast');
  });

  await test('repeated Undo presses do not duplicate the inverse write', async () => {
    const { renderer, controllerRef } = createHarness();
    let restores = 0;

    act(() => {
      controllerRef.current.pushToast({
        id: 'trash-2',
        message: 'Tarea movida a la papelera',
        kind: 'warning',
        undoLabel: 'Deshacer',
        onUndo: () => { restores += 1; },
      });
    });
    await settle();

    // Rapid taps, as in FLOW E. Each press re-queries the LIVE node: once the
    // first press dismisses the toast there is nothing left to press, which is
    // what stops a double write on a real device.
    for (let tap = 0; tap < 3; tap++) {
      const live = renderer.root.findAll(
        (node: any) => node.props?.accessibilityLabel === 'Deshacer',
        { deep: true },
      );
      if (live.length === 0) break;
      act(() => { live[0].props.onPress(); });
      await settle();
    }

    assertEqual(restores, 1, 'Undo must stay idempotent under rapid taps');
  });

  await test('an irreversible mutation offers no Undo', async () => {
    const { renderer, controllerRef } = createHarness();

    act(() => {
      controllerRef.current.pushToast({ id: 'v', message: 'Tarea verificada', kind: 'success' });
    });
    await settle();

    assertEqual(
      renderer.root.findAll((node: any) => node.props?.accessibilityLabel === 'Deshacer', { deep: true }).length,
      0,
      'no Undo when there is no real inverse mutation',
    );
  });

  // --- dismissal ----------------------------------------------------------

  await test('the toast auto-dismisses and unmounts its overlay', async () => {
    const { renderer, controllerRef } = createHarness();

    act(() => {
      controllerRef.current.pushToast({ id: 'd', message: 'Tarea cancelada', kind: 'warning', durationMs: 20 });
    });
    await settle();
    assertEqual(renderedToastMessages(renderer).length, 1, 'toast must be visible before auto-dismiss');

    await new Promise((resolve) => setTimeout(resolve, 120));
    act(() => {});
    assertEqual(renderedToastMessages(renderer), [], 'toast must auto-dismiss');
  });

  await test('explicit dismiss removes the overlay', async () => {
    const { renderer, controllerRef } = createHarness();

    act(() => {
      controllerRef.current.pushToast({ id: 'x', message: 'Tarea reactivada', kind: 'success' });
    });
    await settle();

    const dismiss = findPressableWithLabel(renderer, 'Descartar');
    assertTrue(Boolean(dismiss), 'the toast must expose a dismiss control');
    act(() => { dismiss.props.onPress(); });
    await new Promise((resolve) => setTimeout(resolve, 250));
    act(() => {});

    assertEqual(renderedToastMessages(renderer), [], 'dismiss must remove the overlay');
  });

  await test('the toast overlay is mounted once and does not trap pointer events', async () => {
    const { renderer, controllerRef } = createHarness();
    act(() => {
      controllerRef.current.pushToast({ id: 'z', message: 'Tarea actualizada', kind: 'success' });
    });
    await settle();

    // `deep: true` yields both the composite and its host instance; count only
    // real mounted nodes.
    const statusNodes = renderer.root.findAll(
      (node: any) => node.props?.role === 'status' && typeof node.type === 'string',
      { deep: true },
    );
    assertTrue(statusNodes.length === 1, `expected exactly one live-region toast node, got ${statusNodes.length}`);
    assertTrue(
      statusNodes[0].props.pointerEvents !== 'none',
      'the toast must not disable pointer events',
    );
  });

  console.log(`\nPlanner V1 feedback runtime: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void run();