/**
 * HomeCloud Memories ST-10.A — IMAGE ZOOM AND GESTURE ARITHMETIC (pure).
 *
 * Every number that decides where a zoomed image may be dragged is computed
 * HERE, from the image's own dimensions and the real viewport. There is no
 * magic translation constant anywhere in the gesture path: the previous
 * implementation clamped the vertical axis with a hardcoded `±500`, which is
 * not a bound derived from anything the user can see, and it is exactly the
 * kind of constant that makes a panned image unrecoverable at the edge.
 *
 * This module owns NO react-native import on purpose. It is pure arithmetic,
 * so the contract (bounds, arbitration, double-tap) is assertable without a
 * device and without pretending a static assertion proved touch behaviour.
 * The device gate remains DEVICE_ONLY and is listed in the final report.
 *
 * Contract authority: Product Truth §14.2, §14.3, §14.4, §23.3.
 */

/** Product Truth §14.2: fit (1) .. a real zoom ceiling. */
export const IMAGE_ZOOM_MIN = 1;
export const IMAGE_ZOOM_MAX = 3;
/** Scale at which a double tap zooms IN. Below the ceiling, deliberately. */
export const IMAGE_DOUBLE_TAP_SCALE = 2;
/**
 * Below this scale the image is considered "at fit" and the horizontal pager
 * owns the gesture. It exists so float noise around 1 cannot steal or yield
 * the pager arbitrarily.
 */
export const IMAGE_FIT_EPSILON = 1.01;
/**
 * Same detector the Video page already proves for `±10s`
 * (`MemoryVideoPage.onZonePress`): a second tap inside this window is a double
 * tap. Reusing the constant keeps ONE double-tap vocabulary in the Viewer.
 */
export const IMAGE_DOUBLE_TAP_WINDOW_MS = 280;
/** Two taps further apart than this are two taps, not a double tap. */
export const IMAGE_DOUBLE_TAP_SLOP = 48;
/**
 * Finger travel above which a touch is a DRAG, not a tap. It exists so a
 * scroll/swipe over a page can never be reported as a tap (which would toggle
 * the Viewer chrome as a side effect of navigating).
 */
export const IMAGE_TAP_SLOP = 12;

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

/** A fully resolved zoom/pan transform. There is no fourth field. */
export interface ZoomTransform {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

/**
 * How far the image may travel from centre on each axis at a given scale.
 * `maxX`/`maxY` are HALF the overflow, so the image can never be dragged
 * completely out of the viewport and never past its own edge.
 */
export interface ImagePanBounds {
  readonly maxX: number;
  readonly maxY: number;
}

export const IDENTITY_TRANSFORM: ZoomTransform = { scale: IMAGE_ZOOM_MIN, x: 0, y: 0 };

/** At fit, or effectively at fit: the pager owns the horizontal gesture. */
export function isAtFitScale(scale: number): boolean {
  return !(scale > IMAGE_FIT_EPSILON);
}

/** Zoom belongs to the image (never to the pager) whenever it is really zoomed. */
export function zoomOwnsHorizontalGesture(scale: number): boolean {
  return scale > IMAGE_FIT_EPSILON;
}

export function clampScale(scale: number): number {
  // `Number.isFinite` alone would send +Infinity to the floor, which is the
  // wrong direction: an unbounded scale must saturate at the ceiling, and only
  // NaN (no measurement at all) falls back to fit.
  if (Number.isNaN(scale)) return IMAGE_ZOOM_MIN;
  if (scale === Number.POSITIVE_INFINITY) return IMAGE_ZOOM_MAX;
  if (scale === Number.NEGATIVE_INFINITY) return IMAGE_ZOOM_MIN;
  if (!Number.isFinite(scale)) return IMAGE_ZOOM_MIN;
  return Math.min(IMAGE_ZOOM_MAX, Math.max(IMAGE_ZOOM_MIN, scale));
}

/**
 * Euclidean distance between two touches. Uses page coordinates, which is the
 * only pair of coordinates two fingers always share.
 */
export function touchDistance(a: { pageX: number; pageY: number }, b: { pageX: number; pageY: number }): number {
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
}

/** Midpoint of two touches, in viewport-local coordinates. */
export function touchMidpoint(
  a: { locationX: number; locationY: number },
  b: { locationX: number; locationY: number },
): Point {
  return { x: (a.locationX + b.locationX) / 2, y: (a.locationY + b.locationY) / 2 };
}

/**
 * The size the image actually occupies at fit: `resizeMode="contain"` inside
 * the viewport, preserving the aspect ratio and never upscaling past the
 * viewport. Deriving this from the image's OWN reported dimensions is what
 * removes the need for any assumed pixel size.
 */
export function fittedImageSize(image: Size | null, viewport: Size): Size {
  if (!image || image.width <= 0 || image.height <= 0 || viewport.width <= 0 || viewport.height <= 0) {
    return { width: 0, height: 0 };
  }
  const ratio = Math.min(viewport.width / image.width, viewport.height / image.height);
  return { width: image.width * ratio, height: image.height * ratio };
}

/**
 * PAN BOUNDS — derived, never assumed.
 *
 * At fit the bounds are exactly zero, which is the honest answer: a contained
 * image has no overflow, so there is nothing to drag. Above fit the bound is
 * half of the real overflow of the DISPLAYED image, so the image edge can
 * always be brought back to the viewport edge and no further.
 */
export function imagePanBounds(viewport: Size, fitted: Size, scale: number): ImagePanBounds {
  if (fitted.width <= 0 || fitted.height <= 0 || viewport.width <= 0 || viewport.height <= 0) {
    return { maxX: 0, maxY: 0 };
  }
  const displayedWidth = fitted.width * clampScale(scale);
  const displayedHeight = fitted.height * clampScale(scale);
  return {
    maxX: Math.max(0, (displayedWidth - viewport.width) / 2),
    maxY: Math.max(0, (displayedHeight - viewport.height) / 2),
  };
}

/** Convenience: bounds straight from the raw image size plus the viewport. */
export function panBoundsFor(viewport: Size, image: Size | null, scale: number): ImagePanBounds {
  return imagePanBounds(viewport, fittedImageSize(image, viewport), scale);
}

/** Clamp a translation into the derived bounds, on both axes. */
export function clampPan(x: number, y: number, bounds: ImagePanBounds): Point {
  return {
    x: Math.min(bounds.maxX, Math.max(-bounds.maxX, Number.isFinite(x) ? x : 0)),
    y: Math.min(bounds.maxY, Math.max(-bounds.maxY, Number.isFinite(y) ? y : 0)),
  };
}

/**
 * THE FOCAL INVARIANT.
 *
 * A scale change from `from` to `to` must keep the content point that was
 * under `focal` under `focal`. Because the transform is applied around the
 * viewport centre `c`:
 *
 *     screen = c + translate + (content - c) * scale
 *
 * solving for the translate that preserves the focal point gives
 *
 *     translate' = translate * (to / from) + (focal - c) * (1 - to / from)
 *
 * This is what makes a pinch feel attached to the fingers and a double tap
 * zoom IN around the tapped point instead of around the screen centre.
 */
export function focalPreservingTranslate(
  translate: Point,
  from: number,
  to: number,
  focal: Point,
  viewport: Size,
): Point {
  const start = clampScale(from);
  const end = clampScale(to);
  if (start <= 0 || end <= 0 || !Number.isFinite(start) || !Number.isFinite(end)) return { x: 0, y: 0 };
  const ratio = end / start;
  const centre: Point = { x: viewport.width / 2, y: viewport.height / 2 };
  const offset: Point = { x: focal.x - centre.x, y: focal.y - centre.y };
  return {
    x: translate.x * ratio + offset.x * (1 - ratio),
    y: translate.y * ratio + offset.y * (1 - ratio),
  };
}

/**
 * Apply a new scale while preserving the focal point, then clamp the result to
 * the bounds that scale actually has. A scale change can never leave the image
 * parked outside the viewport, because the clamp runs with the NEW scale.
 */
export function zoomAroundFocal(
  current: ZoomTransform,
  nextScale: number,
  focal: Point,
  viewport: Size,
  image: Size | null,
): ZoomTransform {
  const scale = clampScale(nextScale);
  const translate = focalPreservingTranslate({ x: current.x, y: current.y }, current.scale, scale, focal, viewport);
  const bounds = panBoundsFor(viewport, image, scale);
  const clamped = clampPan(translate.x, translate.y, bounds);
  return { scale, x: clamped.x, y: clamped.y };
}

/**
 * PINCH — scale only. The focal point of the pinch is preserved by the caller
 * through `zoomAroundFocal`, so this returns just the clamped factor and never
 * invents a translation of its own.
 */
export function pinchScale(startScale: number, startDistance: number, distance: number): number {
  if (!(startDistance > 0) || !Number.isFinite(distance) || distance <= 0) return clampScale(startScale);
  return clampScale(startScale * (distance / startDistance));
}

/** ONE-FINGER PAN — translation only, always clamped to the real bounds. */
export function panTransform(current: ZoomTransform, dx: number, dy: number, viewport: Size, image: Size | null): ZoomTransform {
  const bounds = panBoundsFor(viewport, image, current.scale);
  const clamped = clampPan(current.x + dx, current.y + dy, bounds);
  return { scale: current.scale, x: clamped.x, y: clamped.y };
}

export interface DoubleTapDecisionInput {
  readonly lastTapAt: number;
  readonly lastTap: Point | null;
  readonly now: number;
  readonly tap: Point;
}

/**
 * DOUBLE-TAP DETECTION (timing + proximity), the same shape the Video page
 * uses for its `±10s` zones. It is a DECISION, never a side effect: the caller
 * is the only thing allowed to mutate zoom or chrome.
 */
export function isDoubleTap(input: DoubleTapDecisionInput): boolean {
  if (input.lastTap === null) return false;
  const elapsed = input.now - input.lastTapAt;
  if (!(elapsed >= 0) || elapsed > IMAGE_DOUBLE_TAP_WINDOW_MS) return false;
  return Math.hypot(input.tap.x - input.lastTap.x, input.tap.y - input.lastTap.y) <= IMAGE_DOUBLE_TAP_SLOP;
}

/**
 * THE FROZEN DOUBLE-TAP CONTRACT (Product Truth §14.2).
 *
 *  - at fit, a double tap zooms IN around (near) the tapped point;
 *  - while zoomed, a double tap returns to fit;
 *  - at fit a horizontal swipe still pages, because the resulting scale is 1.
 *
 * The returned transform is clamped with the scale it produces, so the zoomed
 * double-tap state is always recoverable.
 */
export function doubleTapTransform(
  current: ZoomTransform,
  tap: Point,
  viewport: Size,
  image: Size | null,
): ZoomTransform {
  if (isAtFitScale(current.scale)) return zoomAroundFocal(current, IMAGE_DOUBLE_TAP_SCALE, tap, viewport, image);
  return { ...IDENTITY_TRANSFORM };
}

/**
 * ARBITRATION — one function, so the pager and the image can never disagree
 * about who owns the gesture. `pinching` is explicit because two fingers at
 * fit scale are unambiguously a zoom and must never become a page turn.
 */
export function imageOwnsGesture(scale: number, pinching: boolean): boolean {
  return pinching || zoomOwnsHorizontalGesture(scale);
}

/**
 * DRAG DETECTION — a touch is a tap only while it has stayed within
 * `IMAGE_TAP_SLOP` of where it started.
 */
export function isTapWithin(start: Point, end: Point, slop: number = IMAGE_TAP_SLOP): boolean {
  if (!Number.isFinite(start.x) || !Number.isFinite(start.y) || !Number.isFinite(end.x) || !Number.isFinite(end.y)) return false;
  return Math.hypot(end.x - start.x, end.y - start.y) <= slop;
}