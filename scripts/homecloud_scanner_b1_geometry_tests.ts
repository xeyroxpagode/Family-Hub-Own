/**
 * HC-3E B1 — scanner editor geometry authority tests (compiled).
 *
 * Deterministic coverage of the ONE coordinate model: rectangular crop
 * conversions, aspect ratios/letterboxing, rotation at 0/90/180/270,
 * zoom/pan inversion, crop bounds at every image edge, random valid crops,
 * degenerate rejection and source-vs-operation dimensions.
 *
 * Run via `node scripts/compiled-scannerb1/scripts/homecloud_scanner_b1_geometry_tests.js`.
 */

import {
  CANVAS_PADDING,
  CROP_HANDLE_KEYS,
  FULL_CROP_RECT,
  MAX_ZOOM,
  MIN_CROP_EDGE_PX,
  MIN_ZOOM,
  applyRotationStep,
  buildImageProcessingPlan,
  clampScale,
  clampTranslation,
  coerceScannerPageEdit,
  computeBoxRect,
  defaultScannerPageEdit,
  dragCropHandle,
  degreesForSteps,
  handlePoint,
  hitTestHandles,
  isCropRectAcceptable,
  isUsableSize,
  minEdgeNormalized,
  normalizedRectToOrientedPixels,
  normalizedRectToOrientedPixelsExact,
  normalizedToViewport,
  normalizeCropRect,
  orientedSize,
  rotateNormalizedRect,
  rotateNormalizedRectOnce,
  rotatedImageSize,
  viewportToNormalized,
  viewportToNormalizedExact,
  zoomAbout,
  type CropHandleKey,
  type DisplayGeometry,
  type Rect,
  type RotationSteps,
  type Size,
} from '../front/mi-front-limpio/services/homecloud/homecloudScannerGeometry';

let passCount = 0;
let failCount = 0;

function record(ok: boolean, message: string) {
  if (ok) { passCount += 1; console.log(`  PASS: ${message}`); }
  else { failCount += 1; console.error(`  FAIL: ${message}`); }
}

function approx(a: number, b: number, epsilon = 1e-9): boolean {
  return Math.abs(a - b) <= epsilon;
}

function rectApprox(a: Rect, b: Rect, epsilon = 1e-9): boolean {
  return approx(a.x, b.x, epsilon) && approx(a.y, b.y, epsilon)
    && approx(a.width, b.width, epsilon) && approx(a.height, b.height, epsilon);
}

/** Deterministic PRNG (mulberry32) so "random" crops are reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

console.log('\n=== HC-3E SCANNER B1 GEOMETRY TESTS ===\n');

// ---------------------------------------------------------------------------
// oriented dimensions (space 1 -> 2) at 0/90/180/270
// ---------------------------------------------------------------------------

const PORTRAIT: Size = { width: 1200, height: 1800 };
const LANDSCAPE: Size = { width: 1800, height: 1200 };
const SQUARE: Size = { width: 1000, height: 1000 };
const STEPS: RotationSteps[] = [0, 1, 2, 3];

for (const [label, size] of [['portrait', PORTRAIT], ['landscape', LANDSCAPE], ['square', SQUARE]] as const) {
  record(orientedSize(size, 0).width === size.width && orientedSize(size, 0).height === size.height, `0deg keeps ${label} dims`);
  record(orientedSize(size, 1).width === size.height && orientedSize(size, 1).height === size.width, `90deg swaps ${label} dims`);
  record(orientedSize(size, 2).width === size.width && orientedSize(size, 2).height === size.height, `180deg keeps ${label} dims`);
  record(orientedSize(size, 3).width === size.height && orientedSize(size, 3).height === size.width, `270deg swaps ${label} dims`);
}

record(degreesForSteps(0) === 0 && degreesForSteps(1) === 90 && degreesForSteps(2) === 180 && degreesForSteps(3) === 270, 'degreesForSteps maps 0..3 to 0/90/180/270');
record(!isUsableSize({ width: 0, height: 100 }) && !isUsableSize({ width: 100, height: -1 }) && !isUsableSize(null as unknown as Size), 'unusable sizes rejected');

// ---------------------------------------------------------------------------
// rotation of the selection (crop tracking)
// ---------------------------------------------------------------------------

{
  const rect: Rect = { x: 0.2, y: 0.3, width: 0.4, height: 0.5 };
  // Point map for one CW quarter turn: (x,y) -> (1-y, x).
  // x-span [0.2,0.6] maps from mirrored y-span [0.3,0.8] -> [0.2,0.7]; y-span <- old x-span.
  const once = rotateNormalizedRectOnce(rect);
  record(approx(once.x, 0.2) && approx(once.y, 0.2) && approx(once.width, 0.5) && approx(once.height, 0.4), 'one CW quarter turn maps the rect through (x,y)->(1-y,x)');

  // Two quarter turns = 180deg: (x,y) -> (1-x, 1-y).
  const twice = rotateNormalizedRect(once, 1);
  record(approx(twice.x, 1 - (rect.x + rect.width)) && approx(twice.y, 1 - (rect.y + rect.height)) && approx(twice.width, rect.width) && approx(twice.height, rect.height), 'two quarter turns equal the 180deg mirror');

  // Four taps return to the starting orientation with the same selection.
  let composed = rect;
  for (let i = 0; i < 4; i += 1) composed = rotateNormalizedRectOnce(composed);
  record(rectApprox(composed, rect), 'four quarter turns return the selection to its start (E: four taps = identity)');

  // applyRotationStep composes rect + steps together.
  let edit = { cropRect: rect, rotationSteps: 0 as RotationSteps };
  for (let i = 0; i < 4; i += 1) edit = applyRotationStep(edit);
  record(edit.rotationSteps === 0 && rectApprox(edit.cropRect, rect), 'applyRotationStep x4 returns edit to its start');
  record(applyRotationStep({ cropRect: rect, rotationSteps: 3 }).rotationSteps === 0, 'rotation steps wrap 3 -> 0');
}

// ---------------------------------------------------------------------------
// crop rect primitives
// ---------------------------------------------------------------------------

{
  record(rectApprox(normalizeCropRect({ x: -0.1, y: -0.1, width: 1.3, height: 1.3 }), { x: 0, y: 0, width: 1, height: 1 }), 'normalizeCropRect clamps overflow into the image');
  record(rectApprox(normalizeCropRect({ x: 0.6, y: 0.6, width: 0.6, height: 0.6 }), { x: 0.4, y: 0.4, width: 0.6, height: 0.6 }), 'normalizeCropRect keeps the size and pulls the origin back');
  record(rectApprox(defaultScannerPageEdit().cropRect, FULL_CROP_RECT), 'default edit selects the full frame');

  const minEdge = minEdgeNormalized(PORTRAIT);
  record(approx(minEdge, MIN_CROP_EDGE_PX / Math.min(PORTRAIT.width, PORTRAIT.height)), 'min edge normalized derives from the shorter image side');
  record(minEdgeNormalized({ width: 0, height: 0 }) === 0, 'min edge is 0 for unusable size');

  const tl = handlePoint({ x: 0.1, y: 0.2, width: 0.3, height: 0.4 }, 'topLeft');
  record(tl.x === 0.1 && tl.y === 0.2, 'handlePoint topLeft');
  const br = handlePoint({ x: 0.1, y: 0.2, width: 0.3, height: 0.4 }, 'bottomRight');
  record(approx(br.x, 0.4) && approx(br.y, 0.6), 'handlePoint bottomRight');
}

// ---------------------------------------------------------------------------
// handle dragging: anchor never moves, min edge enforced, never snaps to full
// ---------------------------------------------------------------------------

{
  const base: Rect = { x: 0.25, y: 0.25, width: 0.5, height: 0.5 };
  const minEdge = 0.05;
  for (const handle of CROP_HANDLE_KEYS) {
    const target = { x: 0, y: 0 };
    const next = dragCropHandle(base, handle, target, minEdge);
    const anchor = handlePoint({
      x: handle === 'topLeft' || handle === 'bottomLeft' ? base.x + base.width : base.x,
      y: handle === 'topLeft' || handle === 'topRight' ? base.y + base.height : base.y,
      width: 0,
      height: 0,
    }, 'topLeft');
    const anchorAfter = handlePoint(next, ((): CropHandleKey => {
      if (handle === 'topLeft') return 'bottomRight';
      if (handle === 'topRight') return 'bottomLeft';
      if (handle === 'bottomRight') return 'topLeft';
      return 'topRight';
    })());
    record(anchorAfter.x === anchor.x && anchorAfter.y === anchor.y, `dragging ${handle} never moves the opposite corner`);
    record(next.width >= minEdge - 1e-9 && next.height >= minEdge - 1e-9, `dragging ${handle} to the far edge keeps the minimum size`);
    record(next.x >= 0 && next.y >= 0 && next.x + next.width <= 1.0000001 && next.y + next.height <= 1.0000001, `dragging ${handle} stays inside the image`);
  }

  // Dragging a corner towards the middle stops at min edge WITHOUT inverting.
  const squeezed = dragCropHandle(base, 'topLeft', { x: 0.6, y: 0.6 }, 0.05);
  record(squeezed.x <= 0.75 - 0.05 && squeezed.y <= 0.75 - 0.05 && squeezed.width >= 0.05 && squeezed.height >= 0.05, 'min edge stops the corner before inverting');

  // Unlike the B1 rectifyQuad, a hard squeeze must NOT reset to the full frame.
  const hard = dragCropHandle(base, 'topLeft', { x: 5, y: 5 }, 0.05);
  record(!rectApprox(hard, FULL_CROP_RECT), 'an extreme drag clamps instead of snapping back to the full frame');

  // Interior drag moves only that corner.
  const moved = dragCropHandle(base, 'topRight', { x: 0.9, y: 0.1 }, 0.05);
  record(moved.x === base.x && moved.y === 0.1 && approx(moved.width, 0.9 - base.x) && approx(moved.height, base.y + base.height - 0.1), 'interior drag moves exactly one corner');
}

// ---------------------------------------------------------------------------
// letterboxing (space 4)
// ---------------------------------------------------------------------------

{
  const viewport: Size = { width: 400, height: 600 };
  for (const [label, size] of [['portrait', PORTRAIT], ['landscape', LANDSCAPE], ['square', SQUARE]] as const) {
    const box = computeBoxRect(viewport, size, CANVAS_PADDING);
    record(box.width <= viewport.width - CANVAS_PADDING * 2 + 1e-6 && box.height <= viewport.height - CANVAS_PADDING * 2 + 1e-6, `contain: ${label} image fits inside the padded viewport`);
    record(approx(box.x + box.width / 2, viewport.width / 2) && approx(box.y + box.height / 2, viewport.height / 2), `contain: ${label} image is centered`);
    const aspect = box.width / box.height;
    const targetAspect = size.width / size.height;
    record(approx(aspect, targetAspect, 1e-6), `contain: ${label} aspect is preserved (no stretch, no cover)`);
  }

  // Wide image in narrow viewport: height letterboxed.
  const wideBox = computeBoxRect({ width: 300, height: 1000 }, LANDSCAPE, 20);
  record(approx(wideBox.width, 260, 1e-6) && wideBox.height < 1000 - 40, 'wide image letterboxes vertically');
  record(approx(wideBox.width / wideBox.height, LANDSCAPE.width / LANDSCAPE.height, 1e-6), 'letterboxed wide image keeps its aspect');

  // Padding guarantees the initial full-frame handles are INSIDE the canvas.
  const fullBox = computeBoxRect(viewport, PORTRAIT, CANVAS_PADDING);
  record(fullBox.x >= CANVAS_PADDING && fullBox.y >= CANVAS_PADDING, 'box origin respects the padding margin (handles reachable, C)');

  // rotatedImageSize: odd steps swap the element axes so rotation covers the box.
  record(rotatedImageSize({ x: 0, y: 0, width: 300, height: 200 }, 0).width === 300, 'rotatedImageSize even keeps axes');
  record(rotatedImageSize({ x: 0, y: 0, width: 300, height: 200 }, 1).width === 200 && rotatedImageSize({ x: 0, y: 0, width: 300, height: 200 }, 1).height === 300, 'rotatedImageSize odd swaps axes');
}

// ---------------------------------------------------------------------------
// zoom/pan transform + inversion (spaces 5/6) — the screen-offset leak gate
// ---------------------------------------------------------------------------

{
  const viewport: Size = { width: 400, height: 600 };
  const box = computeBoxRect(viewport, PORTRAIT, CANVAS_PADDING);
  const geometry: DisplayGeometry = { viewport, box, scale: 2.5, translate: { x: 30, y: -20 } };

  // Inverse(forward(p)) === p across the image.
  let roundTrips = true;
  for (let i = 0; i <= 10; i += 1) {
    for (let j = 0; j <= 10; j += 1) {
      const p = { x: i / 10, y: j / 10 };
      const v = normalizedToViewport(p, geometry);
      const back = viewportToNormalizedExact(v, geometry);
      if (!approx(back.x, p.x, 1e-6) || !approx(back.y, p.y, 1e-6)) roundTrips = false;
    }
  }
  record(roundTrips, 'normalizedToViewport o viewportToNormalizedExact = identity at scale 2.5 + pan');

  // THE letterbox-offset gate: the box does NOT sit at the canvas origin, yet
  // the normalized coordinates of the image's own corners/center must be exact
  // (identity transform: no zoom to conflate canvas position with image point).
  const identityGeometry: DisplayGeometry = { viewport, box, scale: 1, translate: { x: 0, y: 0 } };
  const corner = viewportToNormalizedExact({ x: box.x, y: box.y }, identityGeometry);
  record(approx(corner.x, 0, 1e-9) && approx(corner.y, 0, 1e-9), 'box top-left maps to normalized (0,0) despite letterbox offset');
  const center = viewportToNormalizedExact(
    { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    identityGeometry,
  );
  record(approx(center.x, 0.5, 1e-9) && approx(center.y, 0.5, 1e-9), 'box center maps to normalized (0.5,0.5)');

  // Under zoom+pan the inverse still lands on the image point that the forward
  // map produced — no screen offset can leak into normalized space.
  const zoomedCorner = normalizedToViewport({ x: 0, y: 0 }, geometry);
  const zoomedCornerBack = viewportToNormalizedExact(zoomedCorner, geometry);
  record(approx(zoomedCornerBack.x, 0, 1e-6) && approx(zoomedCornerBack.y, 0, 1e-6), 'zoomed image corner round-trips to normalized (0,0)');

  // Clamped variant.
  const clamped = viewportToNormalized({ x: -500, y: -500 }, geometry);
  record(clamped.x === 0 && clamped.y === 0, 'viewportToNormalized clamps outside touches into the image');

  // Identity transform sanity.
  const identity: DisplayGeometry = { viewport, box, scale: 1, translate: { x: 0, y: 0 } };
  const imagePoint = normalizedToViewport({ x: 0.25, y: 0.75 }, identity);
  record(approx(imagePoint.x, box.x + 0.25 * box.width) && approx(imagePoint.y, box.y + 0.75 * box.height), 'identity transform maps normalized straight into the box');

  // Zoom clamps.
  record(clampScale(0.2) === MIN_ZOOM && clampScale(99) === MAX_ZOOM && clampScale(NaN) === MIN_ZOOM, 'scale clamps to [1,6] and survives NaN');

  // Pan bounds: 0 at zoom 1, half the grown size when zoomed.
  const noPan = clampTranslation({ box, scale: 1 }, { x: 100, y: 100 });
  record(noPan.x === 0 && noPan.y === 0, 'pan is locked at zoom 1');
  const maxPan = clampTranslation({ box, scale: 3 }, { x: 10000, y: 10000 });
  record(approx(maxPan.x, box.width) && approx(maxPan.y, box.height), 'pan is bounded to half the grown size');

  // Focal zoom: the point under the fingers stays under the fingers.
  const focal = { x: box.x + 40, y: box.y + 60 };
  const before = viewportToNormalizedExact(focal, { viewport, box, scale: 1, translate: { x: 0, y: 0 } });
  const zoomed = zoomAbout({ box, translate: { x: 0, y: 0 } }, 1, 3, focal);
  const after = viewportToNormalizedExact(focal, { viewport, box, scale: zoomed.scale, translate: zoomed.translate });
  record(approx(before.x, after.x, 1e-6) && approx(before.y, after.y, 1e-6), 'zoomAbout keeps the focal point fixed');
  record(zoomed.scale === 3, 'zoomAbout applies the requested scale');

  // Handle hit-testing through the full transform, nearest corner wins.
  const cropRect: Rect = { x: 0.2, y: 0.2, width: 0.3, height: 0.3 };
  const tlOnScreen = normalizedToViewport(handlePoint(cropRect, 'topLeft'), geometry);
  const hit = hitTestHandles({ x: tlOnScreen.x + 10, y: tlOnScreen.y + 10 }, cropRect, geometry, 44);
  record(hit === 'topLeft', 'hit-test finds the topLeft handle through zoom/pan');
  const miss = hitTestHandles({ x: 20, y: 500 }, cropRect, geometry, 44);
  record(miss === null, 'hit-test away from every handle returns null');
  const tr = normalizedToViewport(handlePoint(cropRect, 'topRight'), geometry);
  record(hitTestHandles({ x: tr.x + 2, y: tr.y + 1 }, cropRect, geometry, 44) === 'topRight', 'nearest handle wins inside the radius');
}

// ---------------------------------------------------------------------------
// normalized -> oriented pixels
// ---------------------------------------------------------------------------

{
  const oriented = orientedSize(PORTRAIT, 0);
  const px = normalizedRectToOrientedPixels({ x: 0.1, y: 0.1, width: 0.25, height: 0.3 }, oriented);
  record(px.x === Math.floor(0.1 * 1200) && px.y === Math.floor(0.1 * 1800), 'pixel crop floors the origin');
  record(px.width === Math.ceil(0.35 * 1200) - px.x && px.height === Math.ceil(0.4 * 1800) - px.y, 'pixel crop snaps outward so it never shrinks the selection');

  const exact = normalizedRectToOrientedPixelsExact({ x: 0.5, y: 0.5, width: 0.25, height: 0.25 }, { width: 800, height: 600 });
  record(exact.x === 400 && exact.y === 300 && exact.width === 200 && exact.height === 150, 'exact pixel conversion multiplies without rounding');

  // Edge crops: the four image corners never go out of bounds.
  const corners: Rect[] = [
    { x: 0, y: 0, width: 0.1, height: 0.1 },
    { x: 0.9, y: 0, width: 0.1, height: 0.1 },
    { x: 0, y: 0.9, width: 0.1, height: 0.1 },
    { x: 0.9, y: 0.9, width: 0.1, height: 0.1 },
    FULL_CROP_RECT,
  ];
  let edgesOk = true;
  for (const corner of corners) {
    const rect = normalizedRectToOrientedPixels(corner, oriented);
    if (rect.x < 0 || rect.y < 0 || rect.x + rect.width > oriented.width || rect.y + rect.height > oriented.height) edgesOk = false;
    if (rect.width < 1 || rect.height < 1) edgesOk = false;
  }
  record(edgesOk, 'crop bounds at all four image edges stay inside the source');
}

// ---------------------------------------------------------------------------
// processing plan: order, operation dimensions, validation
// ---------------------------------------------------------------------------

{
  const rect: Rect = { x: 0.1, y: 0.1, width: 0.5, height: 0.4 };

  for (const steps of STEPS) {
    const plan = buildImageProcessingPlan(PORTRAIT, rect, steps);
    record(plan.status === 'ok', `plan ok at ${steps * 90}deg`);
    if (plan.status !== 'ok') continue;
    const oriented = orientedSize(PORTRAIT, steps);
    const rotate = plan.steps.find((step) => step.kind === 'rotate');
    const crop = plan.steps.find((step) => step.kind === 'crop');
    if (steps === 0) {
      record(!rotate && !!crop, 'no rotation: single crop step');
    } else {
      record(!!rotate && rotate.kind === 'rotate' && rotate.degrees === steps * 90, `rotate step carries ${steps * 90}deg`);
      record(plan.steps[0].kind === 'rotate' && plan.steps[1].kind === 'crop', 'rotation happens FIRST, crop second (operation order)');
      if (rotate?.kind === 'rotate') {
        record(rotate.resultSize.width === oriented.width && rotate.resultSize.height === oriented.height, 'rotate result size equals the oriented dims');
      }
    }
    record(!!crop, 'plan always contains a crop step');
    if (crop?.kind === 'crop') {
      // THE B1 failure class: crop must be validated against POST-rotation dims.
      record(crop.sourceSize.width === oriented.width && crop.sourceSize.height === oriented.height, `crop validated against post-rotation dimensions at ${steps * 90}deg`);
      record(crop.rect.width <= oriented.width && crop.rect.height <= oriented.height, 'crop rect fits the operation source');
      record(plan.resultSize.width === crop.rect.width && plan.resultSize.height === crop.rect.height, 'result size is the crop size');
      record(crop.rect.x + crop.rect.width <= crop.sourceSize.width && crop.rect.y + crop.rect.height <= crop.sourceSize.height, 'crop never exceeds its operation source');
    }
  }

  // Rotation at 90: normalized crop against oriented 1800x1200 must NOT use 1200x1800.
  const plan90 = buildImageProcessingPlan(PORTRAIT, rect, 1);
  if (plan90.status === 'ok') {
    const crop = plan90.steps[plan90.steps.length - 1];
    if (crop.kind === 'crop') {
      record(crop.sourceSize.width === 1800, '90deg crop width axis is the post-rotation 1800px axis');
      record(crop.rect.width <= 1800, '90deg crop width bounded by post-rotation width');
    }
  }

  // Degenerate / invalid rejection.
  record(buildImageProcessingPlan(PORTRAIT, { x: 0, y: 0, width: 0, height: 0.5 }, 0).status === 'invalid', 'zero-width crop rejected');
  record(buildImageProcessingPlan(PORTRAIT, { x: 0, y: 0, width: 0.5, height: -1 }, 0).status === 'invalid', 'negative-height crop rejected');
  record(buildImageProcessingPlan({ width: 0, height: 0 }, rect, 0).status === 'invalid', 'unknown source size rejected');
  record(buildImageProcessingPlan(PORTRAIT, { x: 0.45, y: 0.45, width: 0.01, height: 0.5 }, 0).status === 'invalid', `crop below ${MIN_CROP_EDGE_PX}px rejected as degenerate`);
  record(buildImageProcessingPlan(PORTRAIT, { x: 0.45, y: 0.45, width: 0.01, height: 0.5 }, 0).status === 'invalid', 'isCropRectAcceptable gate covered');
  record(!isCropRectAcceptable(PORTRAIT, { x: 0, y: 0, width: 0.001, height: 0.001 }, 0), 'tiny random crop rejected');
  record(isCropRectAcceptable(PORTRAIT, rect, 0), 'valid crop accepted');
}

// ---------------------------------------------------------------------------
// random valid crops (seeded): plans always valid, bounds always hold
// ---------------------------------------------------------------------------

{
  const rand = mulberry32(20261008);
  let allOk = true;
  let validated = 0;
  for (let i = 0; i < 500; i += 1) {
    const source: Size = { width: 300 + Math.floor(rand() * 2000), height: 300 + Math.floor(rand() * 2000) };
    const steps = Math.floor(rand() * 4) as RotationSteps;
    const x = rand() * 0.6;
    const y = rand() * 0.6;
    const width = 0.15 + rand() * (0.85 - x);
    const height = 0.15 + rand() * (0.85 - y);
    const plan = buildImageProcessingPlan(source, { x, y, width, height }, steps);
    if (plan.status !== 'ok') { allOk = false; continue; }
    validated += 1;
    const oriented = orientedSize(source, steps);
    const crop = plan.steps[plan.steps.length - 1];
    if (crop.kind !== 'crop') { allOk = false; continue; }
    if (crop.rect.x < 0 || crop.rect.y < 0) allOk = false;
    if (crop.rect.x + crop.rect.width > oriented.width || crop.rect.y + crop.rect.height > oriented.height) allOk = false;
    if (crop.rect.width < MIN_CROP_EDGE_PX || crop.rect.height < MIN_CROP_EDGE_PX) allOk = false;
  }
  record(allOk && validated === 500, '500 seeded random valid crops: plan ok, in bounds, above min edge');
}

// ---------------------------------------------------------------------------
// edit coercion (re-edit entry)
// ---------------------------------------------------------------------------

{
  const stored = { cropRect: { x: 0.2, y: 0.2, width: 0.3, height: 0.3 }, rotationSteps: 2 };
  record(coerceScannerPageEdit(stored).rotationSteps === 2, 'coercion keeps a stored edit');
  const garbage = coerceScannerPageEdit({ cropRect: { x: 'x' }, rotationSteps: 9 });
  record(garbage.rotationSteps === 1 && rectApprox(garbage.cropRect, FULL_CROP_RECT), 'coercion wraps steps and drops a malformed rect to full frame');
  const nullish = coerceScannerPageEdit(null);
  record(rectApprox(nullish.cropRect, FULL_CROP_RECT) && nullish.rotationSteps === 0, 'coercion of null falls back to the default edit');
  const partial = coerceScannerPageEdit({ cropRect: { x: -5, y: 0.2, width: 4, height: 0.3 }, rotationSteps: 0 });
  record(rectApprox(partial.cropRect, { x: 0, y: 0.2, width: 1, height: 0.3 }), 'coercion clamps an overflowing stored crop');
}

console.log(`\nSCANNER_B1_GEOMETRY_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) { process.exitCode = 1; console.error('SCANNER_B1_GEOMETRY_TESTS=FAIL'); }
else { console.log('SCANNER_B1_GEOMETRY_TESTS=PASS'); }
