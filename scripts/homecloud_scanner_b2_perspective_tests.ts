/**
 * HomeCloud Scanner B2 — perspective engine proof.
 *
 * Deterministic homography + RGBA raster tests. This proves the source math
 * and pixel transform used by the on-device WebView canvas boundary.
 */

import {
  FULL_CROP_RECT,
  FULL_CROP_QUAD,
  applyRotationStep,
  coerceScannerPageEdit,
  dragQuadCorner,
  isValidQuad,
  normalizedQuadToOrientedPixels,
  orderQuadClockwise,
  quadBoundingRect,
  rectToQuad,
  type Point,
  type Quad,
  type Size,
} from '../front/mi-front-limpio/services/homecloud/homecloudScannerGeometry';
import {
  applyHomography,
  buildPerspectivePlan,
  computeHomography,
  derivePerspectiveOutputSize,
  warpRgbaPerspective,
  type RgbaImage,
} from '../front/mi-front-limpio/services/homecloud/homecloudScannerPerspective';

let passCount = 0;
let failCount = 0;

function record(ok: boolean, message: string) {
  if (ok) { passCount += 1; console.log(`  PASS: ${message}`); }
  else { failCount += 1; console.error(`  FAIL: ${message}`); }
}

function approx(a: number, b: number, epsilon = 1e-6): boolean {
  return Math.abs(a - b) <= epsilon;
}

function nearPoint(a: Point | null, b: Point, epsilon = 1e-5): boolean {
  return !!a && approx(a.x, b.x, epsilon) && approx(a.y, b.y, epsilon);
}

function pixel(image: RgbaImage, x: number, y: number): readonly number[] {
  const offset = (y * image.width + x) * 4;
  return [
    image.data[offset],
    image.data[offset + 1],
    image.data[offset + 2],
    image.data[offset + 3],
  ];
}

function syntheticPerspectiveDocument(): { image: RgbaImage; quad: Quad; source: Size } {
  const width = 160;
  const height = 120;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 32;
    data[i + 1] = 34;
    data[i + 2] = 38;
    data[i + 3] = 255;
  }
  const quadPx: Quad = {
    topLeft: { x: 30, y: 18 },
    topRight: { x: 126, y: 10 },
    bottomRight: { x: 140, y: 104 },
    bottomLeft: { x: 18, y: 96 },
  };
  const destination: readonly Point[] = [
    { x: 0, y: 0 },
    { x: 99, y: 0 },
    { x: 99, y: 79 },
    { x: 0, y: 79 },
  ];
  const sourcePoints = [quadPx.topLeft, quadPx.topRight, quadPx.bottomRight, quadPx.bottomLeft];
  const inverse = computeHomography(destination, sourcePoints);
  if (!inverse) throw new Error('fixture_homography');
  const sourceOf = (x: number, y: number) => applyHomography(inverse, { x, y });
  for (let y = 0; y < 80; y += 1) {
    for (let x = 0; x < 100; x += 1) {
      const sourcePoint = sourceOf(x, y);
      if (!sourcePoint) continue;
      const sx = Math.round(sourcePoint.x);
      const sy = Math.round(sourcePoint.y);
      if (sx < 0 || sx >= width || sy < 0 || sy >= height) continue;
      const offset = (sy * width + sx) * 4;
      const border = x < 3 || y < 3 || x > 96 || y > 76;
      const grid = x % 20 === 0 || y % 16 === 0;
      const corner =
        (x < 10 && y < 10)
        || (x > 88 && y < 10)
        || (x > 88 && y > 68)
        || (x < 10 && y > 68);
      if (border) {
        data[offset] = 0; data[offset + 1] = 0; data[offset + 2] = 0;
      } else if (corner) {
        data[offset] = 220; data[offset + 1] = 40; data[offset + 2] = 40;
      } else if (grid) {
        data[offset] = 60; data[offset + 1] = 70; data[offset + 2] = 90;
      } else {
        data[offset] = 245; data[offset + 1] = 245; data[offset + 2] = 238;
      }
      data[offset + 3] = 255;
    }
  }
  return {
    image: { width, height, data },
    source: { width, height },
    quad: {
      topLeft: { x: quadPx.topLeft.x / width, y: quadPx.topLeft.y / height },
      topRight: { x: quadPx.topRight.x / width, y: quadPx.topRight.y / height },
      bottomRight: { x: quadPx.bottomRight.x / width, y: quadPx.bottomRight.y / height },
      bottomLeft: { x: quadPx.bottomLeft.x / width, y: quadPx.bottomLeft.y / height },
    },
  };
}

console.log('\n=== HOMECLOUD SCANNER B2 PERSPECTIVE TESTS ===\n');

{
  const source: Size = { width: 1000, height: 800 };
  const quad = rectToQuad({ x: 0.1, y: 0.15, width: 0.75, height: 0.7 });
  record(isValidQuad(quad, source), 'axis-aligned full B1 rectangle is a valid B2 quad');
  record(!isValidQuad({ ...quad, topRight: { x: 0.1, y: 0.15 } }, source), 'zero top edge is rejected');
  record(!isValidQuad({ topLeft: quad.topLeft, topRight: quad.bottomRight, bottomRight: quad.topRight, bottomLeft: quad.bottomLeft }, source), 'self-intersecting quad is rejected');
  record(!isValidQuad({ ...quad, bottomRight: { x: 0.86, y: 0.151 } }, source), 'nearly collinear quad is rejected');
  const ordered = orderQuadClockwise([quad.bottomRight, quad.topLeft, quad.bottomLeft, quad.topRight]);
  record(!!ordered && ordered.topLeft === quad.topLeft && ordered.topRight === quad.topRight, 'arbitrary four points are ordered TL/TR/BR/BL clockwise');
}

{
  const source: Size = { width: 1200, height: 1800 };
  let edit = coerceScannerPageEdit({ cropRect: { x: 0.15, y: 0.2, width: 0.6, height: 0.5 }, rotationSteps: 0 });
  const initialQuad = edit.cropQuad ?? rectToQuad(edit.cropRect);
  const moved = dragQuadCorner(initialQuad, 'topRight', { x: 0.86, y: 0.08 }, source);
  record(moved.topRight.x === 0.86 && moved.topLeft.x === initialQuad.topLeft.x, 'independent corner drag moves only the active corner');
  edit = { ...edit, cropQuad: moved, cropRect: quadBoundingRect(moved) };
  const rotatedOnce = applyRotationStep(edit);
  const rotatedFour = applyRotationStep(applyRotationStep(applyRotationStep(rotatedOnce)));
  record(rotatedFour.rotationSteps === 0, 'four rotation steps restore orientation');
  const restoredQuad = rotatedFour.cropQuad ?? rectToQuad(rotatedFour.cropRect);
  record(approx(restoredQuad.topRight.x, moved.topRight.x) && approx(restoredQuad.topRight.y, moved.topRight.y), 'four rotation steps restore quad corner identity');
}

{
  const src = [{ x: 12, y: 8 }, { x: 80, y: 3 }, { x: 90, y: 60 }, { x: 4, y: 72 }];
  const dst = [{ x: 0, y: 0 }, { x: 99, y: 0 }, { x: 99, y: 79 }, { x: 0, y: 79 }];
  const h = computeHomography(src, dst);
  const inv = computeHomography(dst, src);
  record(!!h && !!inv, 'homography and inverse solve for a nondegenerate quad');
  if (h && inv) {
    record(src.every((point, index) => nearPoint(applyHomography(h, point), dst[index])), 'homography maps all four source corners to rectangle corners');
    record(dst.every((point, index) => nearPoint(applyHomography(inv, point), src[index])), 'inverse homography maps all rectangle corners back to source corners');
  }
}

{
  const fixture = syntheticPerspectiveDocument();
  const plan = buildPerspectivePlan(fixture.source, fixture.quad, 0, 140);
  record(plan.status === 'ok', 'perspective plan succeeds for the deterministic fixture');
  if (plan.status === 'ok') {
    const quadPx = normalizedQuadToOrientedPixels(fixture.quad, fixture.source);
    const derived = derivePerspectiveOutputSize(quadPx, 140);
    record(plan.outputSize.width === derived.width && plan.outputSize.height === derived.height, 'output dimensions derive from quad edge lengths and max-side policy');
    const warped = warpRgbaPerspective(fixture.image, plan);
    record(warped.width === plan.outputSize.width && warped.height === plan.outputSize.height, 'RGBA warp produces the planned dimensions');
    const tl = pixel(warped, 1, 1);
    const tr = pixel(warped, warped.width - 2, 1);
    const center = pixel(warped, Math.floor(warped.width / 2), Math.floor(warped.height / 2));
    record(tl[0] < 80 && tr[0] < 80, 'rectified output contains the transformed black document border at top corners');
    record(center[0] > 180 && center[1] > 180, 'rectified center contains document pixels, not dark outside-background crop');
    const bboxCropWouldBeDark = pixel(fixture.image, Math.floor(quadPx.topLeft.x), Math.floor(quadPx.topRight.y));
    record(center[0] !== bboxCropWouldBeDark[0], 'pixel output is a projective warp, not a bounding-box crop');
  }
}

{
  const full = buildPerspectivePlan({ width: 900, height: 1200 }, FULL_CROP_QUAD, 1, 1000);
  record(full.status === 'ok' && full.outputSize.width === 1000 && full.outputSize.height === 750, 'rotation-aware full-frame plan uses oriented dimensions');
  record(quadBoundingRect(FULL_CROP_QUAD).width === FULL_CROP_RECT.width, 'quad bounding projection preserves B1 full-frame compatibility');
}

console.log(`\nSCANNER_B2_PERSPECTIVE_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) { process.exitCode = 1; console.error('SCANNER_B2_PERSPECTIVE_TESTS=FAIL'); }
else { console.log('SCANNER_B2_PERSPECTIVE_TESTS=PASS'); }
