/**
 * HC-3E B1 — editor gesture machine tests (compiled).
 *
 * Deterministic coverage of the unified gesture architecture: touch delta
 * interpretation, gesture ownership and state transitions, pinch handling,
 * handle hit-testing, touch-count changes and cancellation.
 *
 * These tests prove the LOGIC the component runs. They are NOT a physical
 * device pass: physical acceptance stays pending until the iPhone QA run.
 *
 * Run via `node scripts/compiled-scannerb1/scripts/homecloud_scanner_b1_gesture_tests.js`.
 */

import {
  CANVAS_PADDING,
  FULL_CROP_RECT,
  computeBoxRect,
  dragCropHandle,
  handlePoint,
  hitTestHandles,
  normalizedToViewport,
  orientedSize,
  viewportToNormalizedExact,
  type CropHandleKey,
  type DisplayGeometry,
  type Rect,
  type Size,
} from '../front/mi-front-limpio/services/homecloud/homecloudScannerGeometry';
import {
  IDLE_GESTURE_STATE,
  gestureEnd,
  gestureGrant,
  gestureMove,
  touchDelta,
  type GestureScene,
  type TouchPoint,
} from '../front/mi-front-limpio/services/homecloud/homecloudScannerEditorGestures';

let passCount = 0;
let failCount = 0;

function record(ok: boolean, message: string) {
  if (ok) { passCount += 1; console.log(`  PASS: ${message}`); }
  else { failCount += 1; console.error(`  FAIL: ${message}`); }
}

function approx(a: number, b: number, epsilon = 1e-9): boolean {
  return Math.abs(a - b) <= epsilon;
}

const SOURCE: Size = { width: 1200, height: 1800 };
const VIEWPORT: Size = { width: 400, height: 600 };
const HIT_RADIUS = 44;

function makeScene(overrides: Partial<GestureScene> = {}): GestureScene {
  const box = computeBoxRect(VIEWPORT, orientedSize(SOURCE, 0), CANVAS_PADDING);
  const geometry: DisplayGeometry = { viewport: VIEWPORT, box, scale: 1, translate: { x: 0, y: 0 } };
  return {
    cropRect: FULL_CROP_RECT,
    geometry,
    source: SOURCE,
    rotationSteps: 0,
    handleHitRadius: HIT_RADIUS,
    handlesEnabled: true,
    zoomed: false,
    ...overrides,
  };
}

function touch(id: string, x: number, y: number): TouchPoint {
  return { id, x, y };
}

console.log('\n=== HC-3E SCANNER B1 GESTURE TESTS ===\n');

// ---------------------------------------------------------------------------
// touch delta interpretation
// ---------------------------------------------------------------------------

{
  const delta = touchDelta({ x: 100, y: 50 }, { x: 130, y: 42 });
  record(delta.x === 30 && delta.y === -8, 'touchDelta computes current minus previous (never same-event self-cancel)');
  const zero = touchDelta({ x: 100, y: 50 }, { x: 100, y: 50 });
  record(zero.x === 0 && zero.y === 0, 'touchDelta is zero only for a truly still touch');
}

// ---------------------------------------------------------------------------
// grant: priority and ownership
// ---------------------------------------------------------------------------

{
  const scene = makeScene();
  const tlOnScreen = normalizedToViewport(handlePoint(FULL_CROP_RECT, 'topLeft'), scene.geometry);

  // One finger ON the topLeft handle -> handle drag, instantly (D).
  const grab = gestureGrant(IDLE_GESTURE_STATE, scene, touch('t1', tlOnScreen.x + 5, tlOnScreen.y + 5), [touch('t1', tlOnScreen.x + 5, tlOnScreen.y + 5)]);
  record(grab.state.mode === 'handle' && grab.state.handle === 'topLeft', 'grant on a handle wins and identifies the corner');
  record(approx(grab.state.grabOffset.x, 5) && approx(grab.state.grabOffset.y, 5), 'grab offset keeps the finger-to-corner distance (no jump on grab)');
  record(grab.effect.kind === 'none', 'grant itself does not move anything');

  // A handle drag must NEVER move the image (gesture ownership).
  const midDrag = gestureMove(grab.state, scene, [touch('t1', tlOnScreen.x + 30, tlOnScreen.y + 30)]);
  record(midDrag.effect.kind === 'crop', 'handle moves emit crop effects only');
  if (midDrag.effect.kind === 'crop') {
    const expected = dragCropHandle(FULL_CROP_RECT, 'topLeft', viewportToNormalizedExact({ x: tlOnScreen.x + 30 - 5, y: tlOnScreen.y + 30 - 5 }, scene.geometry), 0);
    record(approx(midDrag.effect.cropRect.x, expected.x, 1e-9) && approx(midDrag.effect.cropRect.y, expected.y, 1e-9), 'handle target crosses the exact inverse transform incl. grab offset');
  }

  // Tracked finger lifted mid-drag -> gesture ends cleanly.
  const lost = gestureMove(midDrag.state, scene, [touch('other', 10, 10)]);
  record(lost.state.mode === 'idle', 'handle drag ends when its touch disappears (clean cancellation)');

  // One finger far from every handle -> pending.
  const center = normalizedToViewport({ x: 0.5, y: 0.5 }, scene.geometry);
  const pending = gestureGrant(IDLE_GESTURE_STATE, scene, touch('t1', center.x, center.y), [touch('t1', center.x, center.y)]);
  record(pending.state.mode === 'pending', 'grant away from handles starts pending');

  // Two fingers -> pinch has priority over everything else.
  const pinch = gestureGrant(IDLE_GESTURE_STATE, scene, touch('t2', 100, 100), [touch('t1', 100, 100), touch('t2', 300, 300)]);
  record(pinch.state.mode === 'pinch', 'grant with two live touches enters pinch mode');
  record(pinch.state.pinchStartDistance > 0, 'pinch anchors the start distance');

  // Grant while another gesture is live restarts from idle (total machine).
  const restart = gestureGrant(midDrag.state, scene, touch('t9', 100, 100), [touch('t9', 100, 100)]);
  record(restart.state.mode === 'pending', 'grant during a live gesture restarts cleanly');
}

// ---------------------------------------------------------------------------
// pending -> pan / pinch transitions
// ---------------------------------------------------------------------------

{
  // Not zoomed: a single finger move does nothing (image is fit).
  const scene = makeScene();
  const center = normalizedToViewport({ x: 0.5, y: 0.5 }, scene.geometry);
  const pending = gestureGrant(IDLE_GESTURE_STATE, scene, touch('t1', center.x, center.y), [touch('t1', center.x, center.y)]);
  const stillPending = gestureMove(pending.state, scene, [touch('t1', center.x + 20, center.y + 20)]);
  record(stillPending.state.mode === 'pending' && stillPending.effect.kind === 'none', 'single finger at zoom 1 never pans');

  // Zoomed: the same move becomes a pan of exactly the same delta.
  const zoomedScene = makeScene({
    geometry: { viewport: VIEWPORT, box: scene.geometry.box, scale: 2, translate: { x: 10, y: 10 } },
    zoomed: true,
  });
  const panStart = gestureMove(pending.state, zoomedScene, [touch('t1', center.x + 20, center.y + 20)]);
  record(panStart.state.mode === 'pan' && panStart.effect.kind === 'none', 'first zoomed move upgrades pending to pan and anchors the position');

  const panMove = gestureMove(panStart.state, zoomedScene, [touch('t1', center.x + 50, center.y + 14)]);
  record(panMove.effect.kind === 'zoom', 'pan emits a translate');
  if (panMove.effect.kind === 'zoom') {
    record(panMove.effect.translate.x === 10 + 30 && panMove.effect.translate.y === 10 - 6, 'pan translates by exactly the touch delta (interpretation gate)');
    record(panMove.effect.scale === 2, 'pan keeps the current scale');
  }

  // Pan clamps at the bounds instead of exposing canvas edges.
  const box = zoomedScene.geometry.box;
  const maxX = (box.width * 2 - box.width) / 2;
  const over = gestureMove(panMove.state, zoomedScene, [touch('t1', center.x + 5000, center.y + 5000)]);
  if (over.effect.kind === 'zoom') {
    record(over.effect.translate.x === maxX, 'pan clamps to the box bounds');
  } else {
    record(false, 'pan clamps to the box bounds');
  }

  // Second finger while panning -> pinch re-anchors from the current zoom.
  const reanchored = gestureMove(panMove.state, zoomedScene, [
    touch('t1', center.x + 50, center.y + 14),
    touch('t2', center.x - 60, center.y - 40),
  ]);
  record(reanchored.state.mode === 'pinch' && reanchored.effect.kind === 'none', 'second finger mid-pan hands over to pinch');

  // Second finger while pending -> pinch.
  const pendingPinch = gestureMove(pending.state, scene, [
    touch('t1', center.x, center.y),
    touch('t2', center.x + 100, center.y + 40),
  ]);
  record(pendingPinch.state.mode === 'pinch', 'second finger while pending becomes pinch');
}

// ---------------------------------------------------------------------------
// pinch: ratio, focal stability, clamps, touch-count changes
// ---------------------------------------------------------------------------

{
  const scene = makeScene();
  const geometry = scene.geometry;
  const focalBefore = viewportToNormalizedExact({ x: 200, y: 300 }, geometry);

  const a = touch('t1', 100, 200);
  const b = touch('t2', 300, 400);
  const grant = gestureGrant(IDLE_GESTURE_STATE, scene, b, [a, b]);
  const startDistance = grant.state.pinchStartDistance;

  // Spread fingers 2x -> scale 2x, focal (midpoint) content stays fixed.
  const spread = gestureMove(grant.state, scene, [
    touch('t1', 0, 100),
    touch('t2', 400, 500),
  ]);
  record(spread.effect.kind === 'zoom', 'pinch emits zoom');
  if (spread.effect.kind === 'zoom') {
    record(approx(spread.effect.scale, 2, 1e-9), 'pinch scale equals the distance ratio from the anchor');
    const after = viewportToNormalizedExact(
      { x: (0 + 400) / 2, y: (100 + 500) / 2 },
      { ...geometry, scale: spread.effect.scale, translate: spread.effect.translate },
    );
    record(approx(after.x, focalBefore.x, 1e-6) && approx(after.y, focalBefore.y, 1e-6), 'pinch keeps the content under the midpoint fixed');
  }

  // Over-spread clamps at MAX zoom.
  const huge = gestureMove(grant.state, scene, [
    touch('t1', -5000, -5000),
    touch('t2', 5000, 5000),
  ]);
  record(huge.effect.kind === 'zoom' && huge.effect.scale === 6, 'pinch scale clamps at MAX_ZOOM');

  // Collapse to zero distance: no effect (guard against div-by-zero jumps).
  const collapse = gestureMove(grant.state, scene, [
    touch('t1', 200, 300),
    touch('t2', 200, 300),
  ]);
  record(collapse.effect.kind === 'none', 'zero-distance pinch emits nothing');

  // Lift one finger -> pan continues from the remaining touch.
  const lift = gestureMove(grant.state, scene, [touch('t2', 300, 400)]);
  record(lift.state.mode === 'pan' && lift.effect.kind === 'none', 'lifting one pinch finger continues as pan');
  const panAfter = gestureMove(lift.state, scene, [touch('t2', 320, 380)]);
  record(panAfter.effect.kind === 'zoom', 'pinch->pan keeps moving the image');

  // Extra finger joins mid-pinch: tracked pair still drives the gesture.
  const third = gestureMove(grant.state, scene, [
    touch('t1', 100, 200),
    touch('t2', 300, 400),
    touch('t3', 10, 10),
  ]);
  record(third.state.mode === 'pinch' && third.state.trackedIds[0] === 't1' && third.state.trackedIds[1] === 't2', 'extra fingers do not disturb the tracked pinch pair');

  // One tracked finger replaced by another -> re-anchored pinch, no jump.
  const swap = gestureMove(grant.state, scene, [touch('t2', 300, 400), touch('t3', 10, 10)]);
  record(swap.state.mode === 'pinch' && swap.state.trackedIds[0] === 't2' && swap.state.trackedIds[1] === 't3', 'losing a tracked finger re-anchors pinch on the survivors');
  record(swap.effect.kind === 'none', 're-anchoring does not move the image');
}

// ---------------------------------------------------------------------------
// handle hit-testing through zoom/pan (D: correct transforms for hit-testing)
// ---------------------------------------------------------------------------

{
  for (const handle of ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as CropHandleKey[]) {
    const geometry: DisplayGeometry = {
      viewport: VIEWPORT,
      box: computeBoxRect(VIEWPORT, orientedSize(SOURCE, 0), CANVAS_PADDING),
      scale: 1,
      translate: { x: 0, y: 0 },
    };
    const cropRect: Rect = { x: 0.15, y: 0.2, width: 0.6, height: 0.5 };
    const onScreen = normalizedToViewport(handlePoint(cropRect, handle), geometry);
    const scene: GestureScene = {
      cropRect,
      geometry,
      source: SOURCE,
      rotationSteps: 0,
      handleHitRadius: HIT_RADIUS,
      handlesEnabled: true,
      zoomed: false,
    };
    const grant = gestureGrant(IDLE_GESTURE_STATE, scene, touch('t1', onScreen.x, onScreen.y), [touch('t1', onScreen.x, onScreen.y)]);
    record(grant.state.mode === 'handle' && grant.state.handle === handle, `${handle} is grabbable at its exact position`);
    // A touch far from EVERY corner (canvas bottom-left area) must not be
    // claimed by any handle.
    const miss = hitTestHandles({ x: 8, y: 580 }, cropRect, geometry, HIT_RADIUS);
    record(miss === null, `${handle} far touch does not hit any handle`);
  }

  // Zoomed + panned: hit-testing uses the transformed positions.
  const base = makeScene();
  const zoomGeometry: DisplayGeometry = { viewport: VIEWPORT, box: base.geometry.box, scale: 2, translate: { x: 15, y: -25 } };
  const cropRect: Rect = { x: 0.1, y: 0.1, width: 0.3, height: 0.3 };
  const scene = { ...base, geometry: zoomGeometry, zoomed: true, cropRect, handlesEnabled: true };
  const brScreen = normalizedToViewport(handlePoint(cropRect, 'bottomRight'), zoomGeometry);
  const grant = gestureGrant(IDLE_GESTURE_STATE, scene, touch('t1', brScreen.x, brScreen.y), [touch('t1', brScreen.x, brScreen.y)]);
  record(grant.state.mode === 'handle' && grant.state.handle === 'bottomRight', 'handle hit-test works through zoom + pan');

  // Dragging through the zoomed transform lands on the right normalized target.
  const moved = gestureMove(grant.state, scene, [touch('t1', brScreen.x + 40, brScreen.y + 40)]);
  record(moved.effect.kind === 'crop', 'zoomed handle drag emits crop');
  if (moved.effect.kind === 'crop') {
    const expectedTarget = viewportToNormalizedExact({ x: brScreen.x + 40, y: brScreen.y + 40 }, zoomGeometry);
    const expectedRect = dragCropHandle(cropRect, 'bottomRight', expectedTarget, 0);
    record(approx(moved.effect.cropRect.x, expectedRect.x, 1e-9) && approx(moved.effect.cropRect.width, expectedRect.width, 1e-9), 'zoomed handle drag inverts the transform correctly');
    record(moved.effect.cropRect.x === cropRect.x && moved.effect.cropRect.y === cropRect.y, 'dragging bottomRight leaves the topLeft anchor untouched');
  }
}

// ---------------------------------------------------------------------------
// preview mode: handles are display-only (canonical re-edit gate)
// ---------------------------------------------------------------------------

{
  const scene = makeScene({ handlesEnabled: false });
  const tlOnScreen = normalizedToViewport(handlePoint(scene.cropRect, 'topLeft'), scene.geometry);
  const grab = gestureGrant(
    IDLE_GESTURE_STATE,
    scene,
    touch('t1', tlOnScreen.x, tlOnScreen.y),
    [touch('t1', tlOnScreen.x, tlOnScreen.y)],
  );
  record(grab.state.mode === 'pending' && grab.state.handle === null, 'preview mode: a corner touch starts pending, never a handle drag');
  record(grab.effect.kind === 'none', 'preview mode: grabbing a visible corner emits nothing');
  // Pinch still works while previewing (pure viewing zoom).
  const pinch = gestureGrant(IDLE_GESTURE_STATE, scene, touch('t2', 300, 300), [touch('t1', 100, 100), touch('t2', 300, 300)]);
  record(pinch.state.mode === 'pinch', 'preview mode: pinch zoom still works');
}

// ---------------------------------------------------------------------------
// cancellation
// ---------------------------------------------------------------------------

{
  const scene = makeScene();
  const tlOnScreen = normalizedToViewport(handlePoint(FULL_CROP_RECT, 'topLeft'), scene.geometry);
  const grab = gestureGrant(IDLE_GESTURE_STATE, scene, touch('t1', tlOnScreen.x, tlOnScreen.y), [touch('t1', tlOnScreen.x, tlOnScreen.y)]);
  const ended = gestureEnd(grab.state);
  record(ended.mode === 'idle' && ended.handle === null, 'gestureEnd resets to idle from handle mode');

  const pinchGrant = gestureGrant(IDLE_GESTURE_STATE, scene, touch('t2', 300, 300), [touch('t1', 100, 100), touch('t2', 300, 300)]);
  record(gestureEnd(pinchGrant.state).mode === 'idle', 'gestureEnd resets to idle from pinch (system termination included)');

  const idleEnd = gestureEnd(IDLE_GESTURE_STATE);
  record(idleEnd.mode === 'idle', 'gestureEnd on idle is a no-op');
}

console.log(`\nSCANNER_B1_GESTURE_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) { process.exitCode = 1; console.error('SCANNER_B1_GESTURE_TESTS=FAIL'); }
else { console.log('SCANNER_B1_GESTURE_TESTS=PASS'); }
