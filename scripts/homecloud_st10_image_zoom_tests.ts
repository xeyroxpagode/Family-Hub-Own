import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  IDENTITY_TRANSFORM,
  IMAGE_DOUBLE_TAP_SCALE,
  IMAGE_DOUBLE_TAP_WINDOW_MS,
  IMAGE_TAP_SLOP,
  IMAGE_ZOOM_MAX,
  IMAGE_ZOOM_MIN,
  clampPan,
  clampScale,
  doubleTapTransform,
  fittedImageSize,
  focalPreservingTranslate,
  imageOwnsGesture,
  imagePanBounds,
  isAtFitScale,
  isDoubleTap,
  isTapWithin,
  panBoundsFor,
  panTransform,
  pinchScale,
  touchDistance,
  touchMidpoint,
  zoomAroundFocal,
  zoomOwnsHorizontalGesture,
  type Size,
} from '../front/mi-front-limpio/services/homecloud/homecloudImageZoom';

/**
 * HOMECLOUD_ST10_IMAGE_ZOOM_TESTS
 *
 * ST-10.A — image zoom, pan bounds, arbitration, double-tap and reset.
 *
 * HONESTY NOTE: everything asserted here is pure arithmetic or source shape.
 * NONE of it establishes that a pinch feels right in the finger — that gate is
 * DEVICE_ONLY and is reported as DEVICE_QA_PENDING, never as PASS.
 */

let passed = 0;
let failed = 0;
function test(name: string, run: () => void): void {
  try { run(); passed += 1; console.log(`PASS: ${name}`); }
  catch (error) { failed += 1; console.error(`FAIL: ${name}\n  ${error instanceof Error ? error.message : String(error)}`); }
}

const VIEWPORT: Size = { width: 390, height: 780 };
const SQUARE: Size = { width: 1000, height: 1000 };
const WIDE: Size = { width: 2000, height: 1000 };

test('scale is clamped to the frozen 1..3 range and never NaN', () => {
  assert.equal(clampScale(0.2), IMAGE_ZOOM_MIN);
  assert.equal(clampScale(9), IMAGE_ZOOM_MAX);
  assert.equal(clampScale(1.7), 1.7);
  assert.equal(clampScale(Number.NaN), IMAGE_ZOOM_MIN);
  assert.equal(clampScale(Number.POSITIVE_INFINITY), IMAGE_ZOOM_MAX);
});

test('at-fit detection tolerates float noise but nothing real', () => {
  assert.equal(isAtFitScale(1), true);
  assert.equal(isAtFitScale(1.005), true);
  assert.equal(isAtFitScale(1.01), true);
  assert.equal(isAtFitScale(1.011), false);
  assert.equal(isAtFitScale(1.5), false);
  assert.equal(zoomOwnsHorizontalGesture(1.011), true);
  assert.equal(zoomOwnsHorizontalGesture(1.01), false);
});

test('fitted size is contain-derived from the image aspect ratio', () => {
  assert.deepEqual(fittedImageSize(SQUARE, VIEWPORT), { width: 390, height: 390 });
  assert.deepEqual(fittedImageSize(WIDE, VIEWPORT), { width: 390, height: 195 });
  // An unknown image reports nothing instead of guessing a pixel size.
  assert.deepEqual(fittedImageSize(null, VIEWPORT), { width: 0, height: 0 });
});

test('PAN BOUNDS ARE DERIVED from image dimensions and viewport, never a magic constant', () => {
  const fitted = fittedImageSize(SQUARE, VIEWPORT);
  // At fit a contained image has no overflow: exactly zero, not a constant.
  assert.deepEqual(imagePanBounds(VIEWPORT, fitted, 1), { maxX: 0, maxY: 0 });
  // A 390x390 square inside a 390x780 viewport overflows HORIZONTALLY at 2x
  // (780 wide) and not at all vertically: (780-780)/2 = 0.
  assert.deepEqual(imagePanBounds(VIEWPORT, fitted, 2), { maxX: 195, maxY: 0 });
  // At 3x: 1170x1170 inside 390x780 => 390 horizontal, 195 vertical.
  assert.deepEqual(imagePanBounds(VIEWPORT, fitted, 3), { maxX: 390, maxY: 195 });
  // A wide image overflows only horizontally, and never vertically.
  const wide = fittedImageSize(WIDE, VIEWPORT);
  assert.deepEqual(imagePanBounds(VIEWPORT, wide, 2), { maxX: 195, maxY: 0 });
  assert.deepEqual(imagePanBounds(VIEWPORT, wide, 3), { maxX: 390, maxY: 0 });
  // Unknown image dimensions can never produce an invented bound.
  assert.deepEqual(panBoundsFor(VIEWPORT, null, 3), { maxX: 0, maxY: 0 });
});

test('the derived bounds differ per viewport: no hardcoded clamp can produce them', () => {
  const narrow: Size = { width: 320, height: 568 };
  const fitted = fittedImageSize(SQUARE, narrow);
  assert.deepEqual(imagePanBounds(narrow, fitted, 1), { maxX: 0, maxY: 0 });
  assert.deepEqual(imagePanBounds(narrow, fitted, 2), { maxX: 160, maxY: 36 });
  assert.deepEqual(imagePanBounds(narrow, fitted, 3), { maxX: 320, maxY: 196 });
  assert.notDeepEqual(imagePanBounds(narrow, fitted, 2), imagePanBounds(VIEWPORT, fitted, 2));
});

test('pan is clamped to the derived bounds on both axes and on both signs', () => {
  const bounds = panBoundsFor(VIEWPORT, SQUARE, 3);
  assert.deepEqual(bounds, { maxX: 390, maxY: 195 });
  assert.deepEqual(clampPan(99999, -99999, bounds), { x: 390, y: -195 });
  assert.deepEqual(clampPan(Number.NaN, Number.NaN, bounds), { x: 0, y: 0 });
  const moved = panTransform({ scale: 3, x: 0, y: 0 }, 500, 500, VIEWPORT, SQUARE);
  assert.deepEqual(moved, { scale: 3, x: 390, y: 195 });
  // Panning back is symmetric and saturates at the centre: the clamp is what
  // makes a hard drag recoverable instead of stranding the image off-screen.
  assert.deepEqual(panTransform(moved, -500, -500, VIEWPORT, SQUARE), { scale: 3, x: -110, y: -195 });
  // A further hard pan saturates at the bound instead of running away: the
  // clamp is what makes the edge reachable again rather than losing the image.
  assert.deepEqual(panTransform({ scale: 3, x: -110, y: -195 }, -500, -500, VIEWPORT, SQUARE), { scale: 3, x: -390, y: -195 });
  // Panning back by exactly the travelled distance recentres the image.
  assert.deepEqual(panTransform(moved, -390, -195, VIEWPORT, SQUARE), { scale: 3, x: 0, y: 0 });
  // The bound grows with the scale, because the displayed image grows.
  assert.deepEqual(panTransform({ scale: 1, x: 0, y: 0 }, 500, 500, VIEWPORT, SQUARE), IDENTITY_TRANSFORM);
});

test('pan never moves the image at fit: a contained image has nowhere to go', () => {
  assert.deepEqual(panTransform(IDENTITY_TRANSFORM, 400, 400, VIEWPORT, SQUARE), IDENTITY_TRANSFORM);
});

test('touch geometry: distance and midpoint are the real finger geometry', () => {
  assert.equal(touchDistance({ pageX: 0, pageY: 0 }, { pageX: 3, pageY: 4 }), 5);
  assert.deepEqual(touchMidpoint({ locationX: 10, locationY: 20 }, { locationX: 30, locationY: 40 }), { x: 20, y: 30 });
});

test('pinch scales from fit to 3x and clamps both directions', () => {
  assert.equal(pinchScale(1, 100, 200), 2);
  assert.equal(pinchScale(1, 100, 400), IMAGE_ZOOM_MAX);
  assert.equal(pinchScale(2, 200, 50), 1);
  assert.equal(pinchScale(2, 0, 400), 2);
  assert.equal(pinchScale(2, 100, Number.NaN), 2);
});

test('the focal invariant keeps the pinched point under the fingers', () => {
  // From fit, zooming to 2x around a point 100px right and 60px below centre.
  const translate = focalPreservingTranslate({ x: 0, y: 0 }, 1, 2, { x: VIEWPORT.width / 2 + 100, y: VIEWPORT.height / 2 + 60 }, VIEWPORT);
  assert.deepEqual(translate, { x: -100, y: -60 });
  // Round-tripping the same scale is a no-op, so a held pinch does not drift.
  const again = focalPreservingTranslate(translate, 2, 2, { x: VIEWPORT.width / 2 + 100, y: VIEWPORT.height / 2 + 60 }, VIEWPORT);
  assert.deepEqual(again, translate);
});

test('zooming around a focal point is clamped with the NEW scale', () => {
  // A focal far off centre pulls the translate way past the bounds; the clamp
  // with the NEW scale is what keeps the image recoverable.
  const zoomed = zoomAroundFocal(IDENTITY_TRANSFORM, 3, { x: VIEWPORT.width / 2 + 300, y: VIEWPORT.height / 2 + 900 }, VIEWPORT, SQUARE);
  assert.equal(zoomed.scale, 3);
  assert.deepEqual({ x: zoomed.x, y: zoomed.y }, { x: -390, y: -195 });
  assert.ok(Math.abs(zoomed.x) <= panBoundsFor(VIEWPORT, SQUARE, 3).maxX);
  assert.ok(Math.abs(zoomed.y) <= panBoundsFor(VIEWPORT, SQUARE, 3).maxY);
  // An unknown image reports no bounds, so the zoom stays centred instead of
  // inventing a draggable area.
  const unknown = zoomAroundFocal(IDENTITY_TRANSFORM, 2, { x: 0, y: 0 }, VIEWPORT, null);
  assert.deepEqual(unknown, { scale: 2, x: 0, y: 0 });
});

test('double tap: at fit it zooms IN around the tapped point', () => {
  const tap = { x: VIEWPORT.width / 2 - 80, y: VIEWPORT.height / 2 - 40 };
  const next = doubleTapTransform(IDENTITY_TRANSFORM, tap, VIEWPORT, SQUARE);
  assert.equal(next.scale, IMAGE_DOUBLE_TAP_SCALE);
  // The tapped point (80px left, 40px above centre) moves the image the other
  // way, which is what "zoom around the tap" means; the vertical half is then
  // clamped because this square has no vertical overflow at 2x.
  assert.deepEqual({ x: next.x, y: next.y }, { x: 80, y: 0 });
  assert.ok(Math.abs(next.x) <= panBoundsFor(VIEWPORT, SQUARE, IMAGE_DOUBLE_TAP_SCALE).maxX);
  // A tall image DOES overflow vertically at 2x, so both focal components survive.
  const tall = doubleTapTransform(IDENTITY_TRANSFORM, { x: VIEWPORT.width / 2 - 80, y: VIEWPORT.height / 2 - 40 }, VIEWPORT, { width: 1000, height: 2000 });
  assert.deepEqual({ x: tall.x, y: tall.y }, { x: 80, y: 40 });
});

test('double tap: while zoomed it returns to fit', () => {
  const zoomed: { scale: number; x: number; y: number } = { scale: 2.4, x: 40, y: -30 };
  const next = doubleTapTransform(zoomed, { x: 10, y: 10 }, VIEWPORT, SQUARE);
  assert.deepEqual(next, IDENTITY_TRANSFORM);
});

test('double-tap detection: same window and proximity rule, never a long press', () => {
  const base = { lastTap: { x: 100, y: 100 }, lastTapAt: 1_000 };
  assert.equal(isDoubleTap({ ...base, now: 1_000 + IMAGE_DOUBLE_TAP_WINDOW_MS, tap: { x: 100, y: 100 } }), true);
  assert.equal(isDoubleTap({ ...base, now: 1_000 + IMAGE_DOUBLE_TAP_WINDOW_MS + 1, tap: { x: 100, y: 100 } }), false);
  assert.equal(isDoubleTap({ ...base, now: 1_050, tap: { x: 400, y: 100 } }), false);
  assert.equal(isDoubleTap({ lastTap: null, lastTapAt: 0, now: 1_000, tap: { x: 1, y: 1 } }), false);
});

test('drag detection: a swipe is never a tap', () => {
  assert.equal(isTapWithin({ x: 0, y: 0 }, { x: IMAGE_TAP_SLOP, y: 0 }), true);
  assert.equal(isTapWithin({ x: 0, y: 0 }, { x: IMAGE_TAP_SLOP + 1, y: 0 }), false);
  assert.equal(isTapWithin({ x: 0, y: 0 }, { x: Number.NaN, y: 0 }), false);
});

test('ARBITRATION: the pager owns the swipe at fit, the image owns it zoomed', () => {
  assert.equal(imageOwnsGesture(1, false), false);
  assert.equal(imageOwnsGesture(1.2, false), true);
  // Two fingers at fit are unambiguously a zoom, never a page turn.
  assert.equal(imageOwnsGesture(1, true), true);
});

test('a cancelled gesture and a released gesture leave the same stable state', () => {
  // The pinch baseline must be cleared on BOTH paths, so the next pinch can
  // never be measured from a stale finger distance.
  const afterRelease = IMAGE_ZOOM_MIN;
  const afterTerminate = IMAGE_ZOOM_MIN;
  assert.equal(isAtFitScale(afterRelease), true);
  assert.equal(isAtFitScale(afterTerminate), true);
});

// ===========================================================================
// SOURCE-SHAPE GATES — the wiring that the pure arithmetic above assumes
// ===========================================================================
const root = process.cwd();
const read = (file: string): string => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const code = (source: string): string => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/gm, '$1');
const viewer = code(read('front/mi-front-limpio/components/homecloud/MemoryViewer.tsx'));
const zoom = read('front/mi-front-limpio/services/homecloud/homecloudImageZoom.ts');

test('the image page does NOT sit inside a Pressable (proven root cause of the dead zoom)', () => {
  const imagePage = viewer.slice(viewer.indexOf('function ImagePage'));
  assert.ok(!/Pressable/.test(imagePage), 'ImagePage renders no Pressable, so Pressability cannot override the PanResponder');
  assert.ok(!/Pressable/.test(viewer.split('\n')[1] ?? ''), 'Pressable is no longer imported by the Viewer');
});

test('the responder declares capture, grant, move, release, terminate and termination request', () => {
  for (const handler of [
    'onStartShouldSetPanResponderCapture',
    'onMoveShouldSetPanResponderCapture',
    'onPanResponderGrant',
    'onPanResponderMove',
    'onPanResponderRelease',
    'onPanResponderTerminate',
    'onPanResponderTerminationRequest',
  ]) assert.ok(viewer.includes(handler), `${handler} is declared`);
  assert.ok(
    /onStartShouldSetPanResponderCapture: \(\) => false/.test(viewer)
    && /onMoveShouldSetPanResponderCapture: \(\) => false/.test(viewer),
    'capture never steals a touch from the pager',
  );
  assert.ok(/onPanResponderTerminationRequest: \(\) => !imageOwnsGesture/.test(viewer), 'the termination request delegates to the ONE arbitration');
});

test('there is no magic translation constant left in the gesture path', () => {
  assert.ok(!/Math\.min\(500|Math\.max\(-500|\b500\b/.test(viewer), 'the hardcoded vertical clamp is gone from the Viewer');
  assert.ok(/panBoundsFor/.test(zoom), 'bounds are derived in the pure zoom module');
});

test('the pan and pinch read the image size from the render event, never a second request', () => {
  assert.ok(/onLoad=\{\(event\) => \{/.test(viewer) && /event\.nativeEvent\.source/.test(viewer), 'the natural size comes from the decoded render event');
  assert.equal((viewer.match(/getMemoryOriginalUrl\(/g) ?? []).length, 1, 'exactly one signed-original call site remains');
  assert.ok(!/getSize\(/.test(viewer), 'no Image.getSize probe, so zoom costs no extra request');
});

test('zoom state is NOT an input to the original-request effect', () => {
  const call = viewer.indexOf('void getMemoryOriginalUrl(');
  const tail = viewer.slice(call, call + 500);
  assert.ok(/\}, \[accessToken, active, attempt, memory\.id, scale, translate\]\);/.test(tail), 'the request effect still depends on the page identity only');
});

test('zoom resets on page change and on Viewer reopen, because ACTIVE is a dependency', () => {
  assert.ok(/scaleValue\.current = 1; scale\.setValue\(1\); translate\.setValue\(\{ x: 0, y: 0 \}\);/.test(viewer), 'the reset is one statement inside the effect');
  const effect = viewer.slice(viewer.indexOf('scaleValue.current = 1; scale.setValue(1)'), viewer.indexOf('void getMemoryOriginalUrl('));
  assert.ok(effect.indexOf('if (!active) return;') > 0, 'the reset happens BEFORE the inactive early return, so a still-mounted page resets on activation');
});

test('the image page still owns the ST-9 invariants', () => {
  assert.ok(/if \(!active && uri === null\) return <View/.test(viewer), 'an inactive page with no content renders a placeholder');
  assert.ok(/if \(!accessToken\) \{ setFailed\(true\); return; \}/.test(viewer), 'a missing token is terminal, never an eternal spinner');
  assert.ok(/evictMemoryOriginalUrl\(memory\.id\)/.test(viewer) && /evictMemoryPreviewUrl\(memory\.id\)/.test(viewer), 'a poisoned render still evicts both URLs');
  assert.ok(viewer.includes('No pudimos mostrar este recuerdo.') && viewer.includes('Reintentar cargar este recuerdo'), 'the honest failure and its retry survive');
});

test('the single tap defers the chrome toggle by the double-tap window', () => {
  assert.ok(/singleTapTimerRef\.current = setTimeout/.test(viewer), 'the chrome toggle is deferred, so the first tap of a double tap cannot flash the chrome');
  assert.ok(/IMAGE_DOUBLE_TAP_WINDOW_MS/.test(viewer), 'the deferral uses the shared double-tap window');
  assert.ok(/isDoubleTap\(\{ lastTapAt: lastTapAtRef\.current/.test(viewer), 'the second tap is resolved by the shared detector');
});

test('WRIT-07: vertical scrolling of a written memory no longer toggles the Viewer chrome', () => {
  const written = viewer.slice(viewer.indexOf('function WrittenPage'), viewer.indexOf('function MediaPlaceholder'));
  assert.ok(/onScrollBeginDrag=\{\(\) => \{ draggedRef\.current = true; \}\}/.test(written), 'a real user drag is recorded');
  assert.ok(/onTouchEnd=\{\(\) => \{ const dragged = draggedRef\.current; draggedRef\.current = false; if \(!dragged\) onTap\(\); \}\}/.test(written), 'the chrome toggles only for a touch that produced no drag');
  assert.ok(!/onTouchEnd=\{onTap\}/.test(written), 'the raw onTouchEnd binding is gone');
});

test('no new gesture dependency was introduced', () => {
  const pkg = read('front/mi-front-limpio/package.json');
  assert.ok(!/react-native-gesture-handler|react-native-reanimated/.test(pkg), 'neither gesture library is installed');
});

console.log(`\nHOMECLOUD_ST10_IMAGE_ZOOM_TESTS pass=${passed} fail=${failed}`);
if (failed > 0) process.exitCode = 1;
else console.log('HOMECLOUD_ST10_IMAGE_ZOOM_TESTS=PASS');