/**
 * HC-3E B1 — unified editor gesture machine (pure).
 *
 * ONE responder owns the whole canvas; the rendered image, overlay and handle
 * views are pointer-events="none" visuals. That is what removes the responder
 * conflicts for good: there is exactly one touch authority, and this module is
 * its complete state machine.
 *
 * Priority is resolved at grant time and is total:
 *   two fingers  -> pinch zoom
 *   one finger   -> crop-handle drag (if it hit a handle) -> image pan (zoomed)
 *
 * Touch coordinates arrive in CANVAS coordinates (pageX/pageY minus the canvas
 * page origin, captured at grant from the event whose target IS the canvas).
 * The machine never subtracts `locationX - locationX`-style same-event values:
 * deltas are computed between events (previous vs current position of the SAME
 * touch id), which is the only legitimate way to turn absolute positions into
 * motion.
 *
 * The machine is pure: React feeds it normalized input snapshots + the current
 * scene, and applies the returned effects. All gesture semantics are therefore
 * unit-testable without a device.
 */

import {
  clampTranslation,
  dragCropHandle,
  hitTestHandles,
  minEdgeNormalized,
  normalizedToViewport,
  orientedSize,
  viewportToNormalizedExact,
  zoomAbout,
  type CropHandleKey,
  type DisplayGeometry,
  type Point,
  type Rect,
  type RotationSteps,
  type Size,
} from './homecloudScannerGeometry';

export type GestureMode = 'idle' | 'pending' | 'pinch' | 'pan' | 'handle';

/** One live touch, in canvas coordinates. `id` matches RN's `identifier` (string). */
export interface TouchPoint {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

/**
 * What the gesture machine needs to know about the world. Mirrors the live
 * component state at event time; the machine never mutates it.
 */
export interface GestureScene {
  /** Current normalized selection (oriented 0..1). */
  readonly cropRect: Rect;
  /** Letterboxed box + live zoom/pan. */
  readonly geometry: DisplayGeometry;
  /** Source image size, original pixels. */
  readonly source: Size;
  /** Current rotation steps. */
  readonly rotationSteps: RotationSteps;
  /** Touch distance at which a crop handle is grabbable, canvas px. */
  readonly handleHitRadius: number;
  /**
   * False while a processed preview is on screen. The preview IS the applied
   * edit, so its full-frame handles are display-only: grabbing them could only
   * crop the processed output, which would break canonical re-edit (edits
   * always apply to the ORIGINAL). The user exits the preview explicitly.
   */
  readonly handlesEnabled: boolean;
  /** Zoomed state at grant decides whether one finger pans. */
  readonly zoomed: boolean;
}

export interface GestureState {
  readonly mode: GestureMode;
  readonly handle: CropHandleKey | null;
  /** touch position minus handle position at grant; keeps the grab stable. */
  readonly grabOffset: Point;
  /** Touch ids this gesture tracks. */
  readonly trackedIds: readonly string[];
  /** Pinch anchors. */
  readonly pinchStartDistance: number;
  readonly pinchStartScale: number;
  readonly pinchStartTranslate: Point;
  /** Previous position of the tracked touch; the ONLY source of deltas. */
  readonly panLast: Point | null;
}

export const IDLE_GESTURE_STATE: GestureState = {
  mode: 'idle',
  handle: null,
  grabOffset: { x: 0, y: 0 },
  trackedIds: [],
  pinchStartDistance: 0,
  pinchStartScale: 1,
  pinchStartTranslate: { x: 0, y: 0 },
  panLast: null,
};

export type GestureEffect =
  | { readonly kind: 'none' }
  | { readonly kind: 'crop'; readonly cropRect: Rect }
  | { readonly kind: 'zoom'; readonly scale: number; readonly translate: Point };

export interface GestureResolution {
  readonly state: GestureState;
  readonly effect: GestureEffect;
}

const NO_EFFECT: GestureEffect = { kind: 'none' };

function touchesById(touches: readonly TouchPoint[], id: string): TouchPoint | undefined {
  return touches.find((touch) => touch.id === id);
}

function distanceBetween(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Delta between two absolute positions of the same touch. */
export function touchDelta(previous: Point, current: Point): Point {
  return { x: current.x - previous.x, y: current.y - previous.y };
}

/**
 * Resolution at responder grant. Priority: pinch (>= 2 live touches) beats
 * handle beats pending pan. A single finger that hit no handle starts `pending`
 * and only becomes a real gesture later (pinch when a second finger lands, pan
 * once it moves while zoomed).
 */
export function gestureGrant(
  state: GestureState,
  scene: GestureScene,
  active: TouchPoint,
  touches: readonly TouchPoint[],
): GestureResolution {
  if (state.mode !== 'idle') {
    // A grant while a gesture is live should not happen (one responder), but
    // the machine stays total: treat it as a fresh start.
    return gestureGrant(IDLE_GESTURE_STATE, scene, active, touches);
  }

  if (touches.length >= 2) {
    return beginPinch(IDLE_GESTURE_STATE, scene, touches);
  }

  const handle = scene.handlesEnabled
    ? hitTestHandles(active, scene.cropRect, scene.geometry, scene.handleHitRadius)
    : null;
  if (handle) {
    const handlePos = normalizedToViewport(
      handlePointOf(scene.cropRect, handle),
      scene.geometry,
    );
    return {
      state: {
        mode: 'handle',
        handle,
        grabOffset: { x: active.x - handlePos.x, y: active.y - handlePos.y },
        trackedIds: [active.id],
        pinchStartDistance: 0,
        pinchStartScale: scene.geometry.scale,
        pinchStartTranslate: scene.geometry.translate,
        panLast: null,
      },
      effect: NO_EFFECT,
    };
  }

  return {
    state: { ...IDLE_GESTURE_STATE, mode: 'pending', trackedIds: [active.id] },
    effect: NO_EFFECT,
  };
}

function handlePointOf(rect: Rect, handle: CropHandleKey): Point {
  switch (handle) {
    case 'topLeft':
      return { x: rect.x, y: rect.y };
    case 'topRight':
      return { x: rect.x + rect.width, y: rect.y };
    case 'bottomRight':
      return { x: rect.x + rect.width, y: rect.y + rect.height };
    case 'bottomLeft':
      return { x: rect.x, y: rect.y + rect.height };
  }
}

function beginPinch(
  state: GestureState,
  scene: GestureScene,
  touches: readonly TouchPoint[],
): GestureResolution {
  const first = touches[0];
  const second = touches[1];
  const startDistance = distanceBetween(first, second);
  if (!(startDistance > 0)) {
    return { state: { ...IDLE_GESTURE_STATE, mode: 'pending', trackedIds: [first.id] }, effect: NO_EFFECT };
  }
  return {
    state: {
      ...state,
      mode: 'pinch',
      handle: null,
      trackedIds: [first.id, second.id],
      pinchStartDistance: startDistance,
      pinchStartScale: scene.geometry.scale,
      pinchStartTranslate: scene.geometry.translate,
      panLast: null,
    },
    effect: NO_EFFECT,
  };
}

/**
 * Resolution for a move event. All decisions flow from the tracked touch ids,
 * so finger lifts/extra fingers are handled explicitly instead of producing
 * accidental jumps.
 */
export function gestureMove(
  state: GestureState,
  scene: GestureScene,
  touches: readonly TouchPoint[],
): GestureResolution {
  switch (state.mode) {
    case 'idle':
      return { state, effect: NO_EFFECT };

    case 'pending': {
      // Second finger landed: pinch.
      if (touches.length >= 2) return beginPinch(state, scene, touches);
      // Single finger moving while zoomed: pan.
      const active = touchesById(touches, state.trackedIds[0] ?? '');
      if (!active) return { state: IDLE_GESTURE_STATE, effect: NO_EFFECT };
      if (!scene.zoomed) return { state, effect: NO_EFFECT };
      return {
        state: { ...state, mode: 'pan', panLast: { x: active.x, y: active.y } },
        effect: NO_EFFECT,
      };
    }

    case 'pan': {
      const active = touchesById(touches, state.trackedIds[0] ?? '');
      if (!active) return { state: IDLE_GESTURE_STATE, effect: NO_EFFECT };
      // A second finger landed mid-pan: hand over to pinch from current zoom.
      if (touches.length >= 2) return beginPinch(state, scene, touches);
      const delta = state.panLast ? touchDelta(state.panLast, active) : { x: 0, y: 0 };
      const translate = clampTranslation(scene.geometry, {
        x: scene.geometry.translate.x + delta.x,
        y: scene.geometry.translate.y + delta.y,
      });
      return {
        state: { ...state, panLast: { x: active.x, y: active.y } },
        effect: { kind: 'zoom', scale: scene.geometry.scale, translate },
      };
    }

    case 'pinch': {
      const first = touchesById(touches, state.trackedIds[0] ?? '');
      const second = touchesById(touches, state.trackedIds[1] ?? '');
      if (first && second) {
        const currentDistance = distanceBetween(first, second);
        if (!(currentDistance > 0)) return { state, effect: NO_EFFECT };
        const ratio = currentDistance / state.pinchStartDistance;
        const focal = midpoint(first, second);
        const zoom = zoomAbout(
          { box: scene.geometry.box, translate: state.pinchStartTranslate },
          state.pinchStartScale,
          state.pinchStartScale * ratio,
          focal,
        );
        return {
          state: {
            ...state,
            trackedIds: [first.id, second.id],
          },
          effect: { kind: 'zoom', scale: zoom.scale, translate: zoom.translate },
        };
      }
      // Touch count changed while pinching.
      if (touches.length >= 2) return beginPinch(state, scene, touches);
      const remaining = first ?? second;
      if (remaining) {
        // One finger lifted: continue as a pan anchored at the remaining touch.
        return {
          state: { ...state, mode: 'pan', trackedIds: [remaining.id], panLast: { x: remaining.x, y: remaining.y } },
          effect: NO_EFFECT,
        };
      }
      return { state: IDLE_GESTURE_STATE, effect: NO_EFFECT };
    }

    case 'handle': {
      const active = touchesById(touches, state.trackedIds[0] ?? '');
      if (!active) return { state: IDLE_GESTURE_STATE, effect: NO_EFFECT };
      if (!state.handle) return { state: IDLE_GESTURE_STATE, effect: NO_EFFECT };
      const targetViewport = { x: active.x - state.grabOffset.x, y: active.y - state.grabOffset.y };
      const targetNormalized = viewportToNormalizedExact(targetViewport, scene.geometry);
      const oriented = orientedSize(scene.source, scene.rotationSteps);
      const nextRect = dragCropHandle(
        scene.cropRect,
        state.handle,
        targetNormalized,
        minEdgeNormalized(oriented),
      );
      return {
        state,
        effect: { kind: 'crop', cropRect: nextRect },
      };
    }
  }
}

/** Release / termination: the gesture ends, nothing moves. */
export function gestureEnd(state: GestureState): GestureState {
  return IDLE_GESTURE_STATE;
}
