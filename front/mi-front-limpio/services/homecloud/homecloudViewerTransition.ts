/**
 * HomeCloud HC-POL-012 / HC-POL-057 — THE ONE File Viewer transition engine.
 *
 * Opening the File Viewer and closing it are the SAME transition, owned by the
 * SAME module, used by every File kind (image, video, audio, PDF, text, Office).
 * There is deliberately no second implementation for Office and none for the
 * PDF: a member who taps a DOCX and a member who taps a JPG get the same
 * continuity, and only ONE place needs to change when the timing is revised.
 *
 * WHAT IS ORIGIN-AWARE AND WHAT IS NOT
 * -----------------------------------
 * Only a File whose tile can be MEASURED and is still visible gets the origin
 * expansion. A File that left the window, a document that never had a preview
 * (PDF, audio, text, Office) and a reduced-motion device all get the honest
 * short fade instead — the transition never claims a spatial continuity the
 * navigator cannot actually show.
 */

/** Content: 240-280 ms, spring. The V2 contract's opening band. */
export const VIEWER_OPEN_ORIGIN_MS = 260;
/** Fallback opacity: 180-220 ms. */
export const VIEWER_OPEN_FADE_MS = 200;
/** Closing: 180-220 ms, ease-in. */
export const VIEWER_CLOSE_MS = 200;
/** Reduced motion: 50 ms linear, no transform. */
export const VIEWER_REDUCED_MS = 50;

/**
 * The smallest the opening layer is allowed to start at. A tile is ~130 pt in a
 * ~390 pt layer, so the expansion starts around a third: big enough to read as
 * "that cell grew", small enough that the member still sees it as a transition
 * and not as a zoomed-in tile.
 */
export const VIEWER_OPEN_MIN_SCALE = 0.32;

export type ViewerOpenKind = 'origin' | 'fade';

/** The opening duration for a kind, already resolved against reduced motion. */
export function viewerOpenDurationMs(kind: ViewerOpenKind, reducedMotion: boolean): number {
  if (reducedMotion) return VIEWER_REDUCED_MS;
  return kind === 'origin' ? VIEWER_OPEN_ORIGIN_MS : VIEWER_OPEN_FADE_MS;
}

/** The closing duration for a File, already resolved against reduced motion. */
export function viewerCloseDurationMs(reducedMotion: boolean): number {
  return reducedMotion ? VIEWER_REDUCED_MS : VIEWER_CLOSE_MS;
}

/** Whether a measured tile may drive the origin expansion at all. */
export function viewerOpenKindForFile(input: {
  /** True when a real, renderable preview exists for this File. */
  readonly hasPreview: boolean;
  /** True when the tapped tile was measured and is inside the viewport. */
  readonly tileVisible: boolean;
}): ViewerOpenKind {
  return input.hasPreview && input.tileVisible ? 'origin' : 'fade';
}
