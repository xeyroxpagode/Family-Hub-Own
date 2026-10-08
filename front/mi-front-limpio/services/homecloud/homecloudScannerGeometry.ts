/**
 * HC-3E B1 — authoritative image geometry for the Scanner editor.
 *
 * ONE model, six declared coordinate spaces, no implicit screen offsets.
 *
 *   1. original pixels   source capture, as stored: `source` (Size)
 *   2. oriented pixels   source rotated by `rotationSteps` * 90deg clockwise
 *                        -> `oriented` (Size). Odd steps swap width/height.
 *   3. normalized        crop selection, 0..1, RELATIVE TO THE ORIENTED IMAGE.
 *                        This is the single canonical selection authority:
 *                        every handle position, the overlay and the processing
 *                        plan are derived from it and from nothing else.
 *   4. box               the oriented image's on-screen rect inside the canvas,
 *                        letterboxed by `computeBoxRect`.
 *   5. visual            box after zoom/pan: RN scales about the box CENTRE,
 *                        so viewport = centre + scale * (local - centre)
 *                        + translate. See `normalizedToViewport`.
 *   6. viewport          canvas coordinates, the only space touches live in.
 *
 * Why normalized is relative to the ORIENTED image:
 * the editor draws the already-rotated image, so what the user selects is a
 * region of the oriented frame. Processing then rotates first and crops second,
 * which makes the crop rectangle valid against the post-rotation dimensions
 * with no coordinate remapping at all. `rotateNormalizedRect` re-expresses the
 * selection in the new frame when the user rotates, so the crop keeps tracking
 * the same physical content.
 *
 * Pure module: no React, no native imports. Every function is total and
 * deterministic; degenerate input is rejected explicitly rather than clamped
 * into something silently wrong.
 */

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Axis-aligned rectangle. Units are declared by the caller (px or normalized). */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type CropHandleKey = 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft';

export const CROP_HANDLE_KEYS: readonly CropHandleKey[] = [
  'topLeft',
  'topRight',
  'bottomRight',
  'bottomLeft',
] as const;

export type RotationSteps = 0 | 1 | 2 | 3;

export const FULL_CROP_RECT: Rect = { x: 0, y: 0, width: 1, height: 1 };

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 6;

/**
 * Smallest selection edge, in PIXELS of the oriented image. A crop smaller than
 * this is rejected as degenerate instead of being rounded up to 1px garbage.
 */
export const MIN_CROP_EDGE_PX = 24;

/** Empty canvas margin around the letterboxed image, so handles are never flush. */
export const CANVAS_PADDING = 24;

// ---------------------------------------------------------------------------
// primitives
// ---------------------------------------------------------------------------

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function isUsableSize(size: Size | null | undefined): size is Size {
  return (
    !!size
    && Number.isFinite(size.width)
    && Number.isFinite(size.height)
    && size.width > 0
    && size.height > 0
  );
}

function rectRight(rect: Rect): number {
  return rect.x + rect.width;
}

function rectBottom(rect: Rect): number {
  return rect.y + rect.height;
}

// ---------------------------------------------------------------------------
// space 1 -> 2 : original pixels to oriented pixels
// ---------------------------------------------------------------------------

/**
 * Dimensions after `steps` clockwise quarter turns.
 * Quarter and three-quarter turns exchange the axes; half turns do not.
 */
export function orientedSize(source: Size, steps: RotationSteps): Size {
  if (!isUsableSize(source)) return { width: 0, height: 0 };
  return steps % 2 === 0
    ? { width: source.width, height: source.height }
    : { width: source.height, height: source.width };
}

export function degreesForSteps(steps: RotationSteps): number {
  return steps * 90;
}

/**
 * Re-express a selection expressed in the current oriented frame in the frame
 * produced by ONE more clockwise quarter turn.
 *
 * A point at normalized (x, y) of the old frame sits at (1 - y, x) of the new
 * one, so the x-span maps from the old y-span mirrored, and the y-span maps from
 * the old x-span. Because the map is affine and axis-aligned this stays exact.
 */
export function rotateNormalizedRectOnce(rect: Rect): Rect {
  return {
    x: 1 - rectBottom(rect),
    y: rect.x,
    width: rect.height,
    height: rect.width,
  };
}

/** Compose `rotateNormalizedRectOnce` `steps` times (0..3). */
export function rotateNormalizedRect(rect: Rect, steps: RotationSteps): Rect {
  let next = normalizeCropRect(rect);
  for (let i = 0; i < steps % 4; i += 1) next = rotateNormalizedRectOnce(next);
  return next;
}

// ---------------------------------------------------------------------------
// space 3 : normalized selection authority
// ---------------------------------------------------------------------------

/** Clamp a selection into 0..1 without changing its size unless it overflows. */
export function normalizeCropRect(rect: Rect): Rect {
  const width = clamp(rect.width, 0, 1);
  const height = clamp(rect.height, 0, 1);
  const x = clamp(rect.x, 0, 1 - width);
  const y = clamp(rect.y, 0, 1 - height);
  return { x, y, width, height };
}

export function isDegenerateCropRect(rect: Rect, minEdgeNormalized: number): boolean {
  return !(rect.width >= minEdgeNormalized) || !(rect.height >= minEdgeNormalized);
}

/**
 * Minimum selectable edge expressed in normalized units.
 *
 * A single scalar has to serve both axes, so it is derived from the SMALLER
 * image dimension: that is the binding constraint and it guarantees the
 * minimum holds as many pixels as `minEdgePx` on whichever side is tighter.
 */
export function minEdgeNormalized(oriented: Size, minEdgePx: number = MIN_CROP_EDGE_PX): number {
  if (!isUsableSize(oriented)) return 0;
  const shorter = Math.min(oriented.width, oriented.height);
  if (shorter <= 0) return 0;
  return clamp(minEdgePx / shorter, 0, 1);
}

/** Corner position of one handle, in normalized coordinates. */
export function handlePoint(rect: Rect, handle: CropHandleKey): Point {
  switch (handle) {
    case 'topLeft':
      return { x: rect.x, y: rect.y };
    case 'topRight':
      return { x: rectRight(rect), y: rect.y };
    case 'bottomRight':
      return { x: rectRight(rect), y: rectBottom(rect) };
    case 'bottomLeft':
      return { x: rect.x, y: rectBottom(rect) };
  }
}

/**
 * Move exactly one corner to `target`, keeping the selection inside the image
 * and never collapsing an edge below `minEdgeNormalized`.
 *
 * The opposite corner is the anchor and NEVER moves. When the requested corner
 * would violate a bound or the minimum edge, only the moving corner is pulled
 * back — the selection stays where the user left it instead of snapping to the
 * full frame.
 */
export function dragCropHandle(
  rect: Rect,
  handle: CropHandleKey,
  target: Point,
  minEdgeNormalized: number,
): Rect {
  // The anchor is the corner the user is NOT dragging; it never moves.
  const anchorX = handle === 'topLeft' || handle === 'bottomLeft' ? rectRight(rect) : rect.x;
  const anchorY = handle === 'topLeft' || handle === 'topRight' ? rectBottom(rect) : rect.y;

  let x = target.x;
  let y = target.y;

  // Keep the dragged corner inside the image.
  x = clamp(x, 0, 1);
  y = clamp(y, 0, 1);

  // Enforce the minimum edge against the fixed anchor, without letting the
  // selection invert.
  if (handle === 'topLeft' || handle === 'bottomLeft') {
    x = Math.min(x, anchorX - minEdgeNormalized);
    x = Math.max(x, 0);
  } else {
    x = Math.max(x, anchorX + minEdgeNormalized);
    x = Math.min(x, 1);
  }
  if (handle === 'topLeft' || handle === 'topRight') {
    y = Math.min(y, anchorY - minEdgeNormalized);
    y = Math.max(y, 0);
  } else {
    y = Math.max(y, anchorY + minEdgeNormalized);
    y = Math.min(y, 1);
  }

  const nextLeft = Math.min(x, anchorX);
  const nextRight = Math.max(x, anchorX);
  const nextTop = Math.min(y, anchorY);
  const nextBottom = Math.max(y, anchorY);

  return normalizeCropRect({
    x: nextLeft,
    y: nextTop,
    width: nextRight - nextLeft,
    height: nextBottom - nextTop,
  });
}

// ---------------------------------------------------------------------------
// space 3 -> 2 : normalized selection to oriented pixels
// ---------------------------------------------------------------------------

/**
 * Convert a normalized selection to oriented-image pixels, snapped OUTWARD so
 * the request is never narrower than what the user selected, then clamped so it
 * can never exceed the oriented image.
 */
export function normalizedRectToOrientedPixels(rect: Rect, oriented: Size): Rect {
  if (!isUsableSize(oriented)) return { x: 0, y: 0, width: 0, height: 0 };
  const x = clamp(Math.floor(rect.x * oriented.width), 0, oriented.width);
  const y = clamp(Math.floor(rect.y * oriented.height), 0, oriented.height);
  const right = clamp(Math.ceil(rectRight(rect) * oriented.width), 0, oriented.width);
  const bottom = clamp(Math.ceil(rectBottom(rect) * oriented.height), 0, oriented.height);
  return { x, y, width: right - x, height: bottom - y };
}

/** Exact float conversion, used by tests and by callers that round themselves. */
export function normalizedRectToOrientedPixelsExact(rect: Rect, oriented: Size): Rect {
  return {
    x: rect.x * oriented.width,
    y: rect.y * oriented.height,
    width: rect.width * oriented.width,
    height: rect.height * oriented.height,
  };
}

// ---------------------------------------------------------------------------
// space 4 : letterboxed box
// ---------------------------------------------------------------------------

/**
 * Contain-fit the oriented image inside the canvas, centred, leaving `padding`
 * of empty margin on every side. The padding is what keeps the initial
 * topLeft/topRight handles inside the touchable viewport instead of flush
 * against (and half outside) the canvas edge.
 */
export function computeBoxRect(
  viewport: Size,
  oriented: Size,
  padding: number = CANVAS_PADDING,
): Rect {
  if (!isUsableSize(viewport) || !isUsableSize(oriented)) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  const pad = Math.min(padding, viewport.width / 2, viewport.height / 2);
  const availWidth = Math.max(1, viewport.width - pad * 2);
  const availHeight = Math.max(1, viewport.height - pad * 2);
  const scale = Math.min(availWidth / oriented.width, availHeight / oriented.height);
  const width = oriented.width * scale;
  const height = oriented.height * scale;
  return {
    x: (viewport.width - width) / 2,
    y: (viewport.height - height) / 2,
    width,
    height,
  };
}

/**
 * Size of the raw image element that, once rotated about its own centre by
 * `steps`, exactly covers the oriented box. Odd steps need the axes swapped.
 */
export function rotatedImageSize(box: Rect, steps: RotationSteps): Size {
  return steps % 2 === 0
    ? { width: box.width, height: box.height }
    : { width: box.height, height: box.width };
}

// ---------------------------------------------------------------------------
// space 5/6 : visual transform (zoom + pan)
// ---------------------------------------------------------------------------

export interface DisplayGeometry {
  /** Measured canvas size in viewport coordinates. */
  readonly viewport: Size;
  /** Oriented image box before zoom/pan. */
  readonly box: Rect;
  readonly scale: number;
  readonly translate: Point;
}

export function clampScale(scale: number): number {
  return clamp(Number.isFinite(scale) ? scale : MIN_ZOOM, MIN_ZOOM, MAX_ZOOM);
}

/**
 * Pan bounds. At zoom 1 the image exactly fills the box, so it must not move.
 * When zoomed, the image may not be dragged away from its edges.
 */
export function clampTranslation(
  geometry: Pick<DisplayGeometry, 'box' | 'scale'>,
  translate: Point,
): Point {
  const scale = clampScale(geometry.scale);
  const maxX = Math.max(0, (geometry.box.width * scale - geometry.box.width) / 2);
  const maxY = Math.max(0, (geometry.box.height * scale - geometry.box.height) / 2);
  return {
    x: clamp(Number.isFinite(translate.x) ? translate.x : 0, -maxX, maxX),
    y: clamp(Number.isFinite(translate.y) ? translate.y : 0, -maxY, maxY),
  };
}

/**
 * The visual transform, exactly as React Native renders
 * `transform: [{translateX}, {translateY}, {scale}]` on a view placed at `box`:
 * scale happens about the BOX CENTRE (RN's default transform origin), then the
 * result is translated.
 *
 *   viewport = centre + scale * (local - centre) + translate
 *
 * `local` is a point of the box rect (canvas coordinates). Everything else in
 * this section is a closed-form consequence of that one equation, so display,
 * hit-testing and gestures can never disagree.
 */
function boxCenter(geometry: Pick<DisplayGeometry, 'box'>): Point {
  return {
    x: geometry.box.x + geometry.box.width / 2,
    y: geometry.box.y + geometry.box.height / 2,
  };
}

/** normalized (oriented 0..1) -> viewport (canvas px). */
export function normalizedToViewport(point: Point, geometry: DisplayGeometry): Point {
  const scale = clampScale(geometry.scale);
  const center = boxCenter(geometry);
  // `local` is in CANVAS coordinates: the point's position inside the box rect.
  const localX = geometry.box.x + point.x * geometry.box.width;
  const localY = geometry.box.y + point.y * geometry.box.height;
  return {
    x: center.x + (localX - center.x) * scale + geometry.translate.x,
    y: center.y + (localY - center.y) * scale + geometry.translate.y,
  };
}

/**
 * viewport (canvas px) -> normalized (oriented 0..1), CLAMPED into the image.
 * This is the ONLY place screen pixels become selection coordinates, so screen
 * offsets (letterboxing, zoom, pan) cannot leak into the normalized crop.
 */
export function viewportToNormalized(point: Point, geometry: DisplayGeometry): Point {
  const exact = viewportToNormalizedExact(point, geometry);
  return { x: clamp(exact.x, 0, 1), y: clamp(exact.y, 0, 1) };
}

/** The exact (unclamped) inverse, for handle dragging and round-trip assertions. */
export function viewportToNormalizedExact(point: Point, geometry: DisplayGeometry): Point {
  const scale = clampScale(geometry.scale);
  const center = boxCenter(geometry);
  const localX = (point.x - geometry.translate.x - center.x) / scale + center.x;
  const localY = (point.y - geometry.translate.y - center.y) / scale + center.y;
  return {
    x: geometry.box.width === 0 ? 0 : (localX - geometry.box.x) / geometry.box.width,
    y: geometry.box.height === 0 ? 0 : (localY - geometry.box.y) / geometry.box.height,
  };
}

/**
 * Zoom about a focal point in viewport coordinates, keeping whatever is under
 * the fingers under the fingers.
 *
 * Derived from the transform equation holding the focal point fixed:
 * translate' = focal - centre - (scale'/scale) * (focal - translate - centre).
 */
export function zoomAbout(
  geometry: Pick<DisplayGeometry, 'box' | 'translate'>,
  currentScale: number,
  nextScale: number,
  focalViewport: Point,
): { scale: number; translate: Point } {
  const from = clampScale(currentScale);
  const to = clampScale(nextScale);
  const center = boxCenter(geometry);
  const ratio = to / from;
  const translate = {
    x: focalViewport.x - center.x - (focalViewport.x - geometry.translate.x - center.x) * ratio,
    y: focalViewport.y - center.y - (focalViewport.y - geometry.translate.y - center.y) * ratio,
  };
  return { scale: to, translate: clampTranslation({ box: geometry.box, scale: to }, translate) };
}

/**
 * Which crop handle, if any, owns a touch. Handles win over panning, so a finger
 * that lands on a corner never also drags the image.
 *
 * Returns null when no handle is within `threshold` viewport px.
 */
export function hitTestHandles(
  viewportPoint: Point,
  rect: Rect,
  geometry: DisplayGeometry,
  threshold: number,
): CropHandleKey | null {
  let best: CropHandleKey | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const key of CROP_HANDLE_KEYS) {
    const normalized = handlePoint(rect, key);
    const onScreen = normalizedToViewport(normalized, geometry);
    const distance = Math.hypot(onScreen.x - viewportPoint.x, onScreen.y - viewportPoint.y);
    if (distance <= threshold && distance < bestDistance) {
      best = key;
      bestDistance = distance;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// space 2 -> processing : the image manipulator plan
// ---------------------------------------------------------------------------

export type ProcessingStep =
  | { readonly kind: 'rotate'; readonly degrees: number; readonly sourceSize: Size; readonly resultSize: Size }
  | { readonly kind: 'crop'; readonly sourceSize: Size; readonly rect: Rect };

export type ImageProcessingPlanFailure =
  | 'unknown-source-size'
  | 'degenerate'
  | 'out-of-bounds';

export type ImageProcessingPlan =
  | {
      readonly status: 'ok';
      readonly steps: readonly ProcessingStep[];
      readonly crop: Rect;
      readonly resultSize: Size;
    }
  | {
      readonly status: 'invalid';
      readonly reason: ImageProcessingPlanFailure;
      readonly message: string;
    };

export const PROCESSING_ERROR_MESSAGES: Readonly<Record<ImageProcessingPlanFailure, string>> = {
  'unknown-source-size': 'No pudimos leer las dimensiones de la imagen.',
  degenerate: 'El área de recorte es demasiado pequeña.',
  'out-of-bounds': 'El área de recorte excede la imagen.',
};

/**
 * Build the ordered `expo-image-manipulator` plan for a normalized selection.
 *
 * Order is ROTATE FIRST, CROP SECOND. The crop rectangle is therefore validated
 * against the POST-ROTATION dimensions (the dimensions the crop actually
 * operates on), and the result size is the crop size, which already accounts
 * for rotation — no second remapping is needed.
 *
 * Every intermediate step records the size it operates on so the plan can be
 * asserted in tests without touching a native module.
 */
export function buildImageProcessingPlan(
  source: Size,
  normalizedRect: Rect,
  steps: RotationSteps,
  minEdgePx: number = MIN_CROP_EDGE_PX,
): ImageProcessingPlan {
  if (!isUsableSize(source)) {
    return { status: 'invalid', reason: 'unknown-source-size', message: PROCESSING_ERROR_MESSAGES['unknown-source-size'] };
  }

  const clamped = normalizeCropRect(normalizedRect);
  if (!(clamped.width > 0) || !(clamped.height > 0)) {
    return { status: 'invalid', reason: 'degenerate', message: PROCESSING_ERROR_MESSAGES.degenerate };
  }

  const oriented = orientedSize(source, steps);
  const planSteps: ProcessingStep[] = [];
  let currentSize = source;

  const degrees = degreesForSteps(steps);
  if (degrees !== 0) {
    const resultSize = oriented;
    planSteps.push({ kind: 'rotate', degrees, sourceSize: currentSize, resultSize });
    currentSize = resultSize;
  }

  const crop = normalizedRectToOrientedPixels(clamped, currentSize);

  if (!(crop.width >= minEdgePx) || !(crop.height >= minEdgePx)) {
    return { status: 'invalid', reason: 'degenerate', message: PROCESSING_ERROR_MESSAGES.degenerate };
  }
  if (
    crop.x < 0
    || crop.y < 0
    || crop.x + crop.width > currentSize.width
    || crop.y + crop.height > currentSize.height
  ) {
    return { status: 'invalid', reason: 'out-of-bounds', message: PROCESSING_ERROR_MESSAGES['out-of-bounds'] };
  }

  planSteps.push({ kind: 'crop', sourceSize: currentSize, rect: crop });

  return { status: 'ok', steps: planSteps, crop, resultSize: { width: crop.width, height: crop.height } };
}

/** True when the normalized selection can be turned into a valid plan. */
export function isCropRectAcceptable(
  source: Size,
  normalizedRect: Rect,
  steps: RotationSteps,
  minEdgePx: number = MIN_CROP_EDGE_PX,
): boolean {
  return buildImageProcessingPlan(source, normalizedRect, steps, minEdgePx).status === 'ok';
}

// ---------------------------------------------------------------------------
// edit parameter helpers (serializable, safe to store on a page)
// ---------------------------------------------------------------------------

export interface ScannerPageEditLike {
  readonly cropRect: Rect;
  readonly rotationSteps: RotationSteps;
}

export function defaultScannerPageEdit(): ScannerPageEditLike {
  return { cropRect: FULL_CROP_RECT, rotationSteps: 0 };
}

/**
 * Coerce anything that came out of navigation state into a valid edit. Never
 * throws: a malformed edit degrades to "no crop, no rotation" instead of
 * breaking the editor on open.
 */
export function coerceScannerPageEdit(value: unknown): ScannerPageEditLike {
  if (typeof value !== 'object' || value === null) return defaultScannerPageEdit();
  const candidate = value as Partial<ScannerPageEditLike>;
  const rawSteps = typeof candidate.rotationSteps === 'number' ? Math.trunc(candidate.rotationSteps) : 0;
  const steps = (((rawSteps % 4) + 4) % 4) as RotationSteps;
  const rect = candidate.cropRect;
  if (typeof rect !== 'object' || rect === null) {
    return { cropRect: FULL_CROP_RECT, rotationSteps: steps };
  }
  const r = rect as Partial<Rect>;
  const hasAll =
    typeof r.x === 'number' && typeof r.y === 'number'
    && typeof r.width === 'number' && typeof r.height === 'number';
  if (!hasAll) return { cropRect: FULL_CROP_RECT, rotationSteps: steps };
  return { cropRect: normalizeCropRect({ x: r.x as number, y: r.y as number, width: r.width as number, height: r.height as number }), rotationSteps: steps };
}

/**
 * Apply a quarter turn to BOTH the orientation and the selection, so the crop
 * keeps covering the same physical content after the image turns.
 */
export function applyRotationStep(edit: ScannerPageEditLike): ScannerPageEditLike {
  const nextSteps = ((edit.rotationSteps + 1) % 4) as RotationSteps;
  return { cropRect: rotateNormalizedRectOnce(edit.cropRect), rotationSteps: nextSteps };
}