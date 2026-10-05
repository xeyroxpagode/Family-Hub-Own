/**
 * HomeCloud HC2-B — Memory MEDIA PLAYBACK contracts (framework-free).
 *
 * WHY THIS FILE IS PURE
 * ---------------------
 * Every rule that decides whether a native player is allowed to exist, or what
 * the user is honestly told about it, lives HERE and not inside a component.
 * `expo-video` / `expo-audio` cannot be instantiated honestly in a Node test,
 * so the parts that must never be wrong are the parts that do not need a native
 * module at all. The components then stay thin adapters.
 *
 * THE INVARIANT (§ "MEDIA OWNERSHIP")
 * ----------------------------------
 * ONLY the page whose `contentId` matches `activeContentId` is authorized to
 * instantiate a native media player. This module is the single place that
 * decides it, so Video and Audio cannot drift apart, and so a Viewer that is
 * closed, blurred, backgrounded or mid-swipe can never keep an authorization
 * that a plain boolean forgot to revoke.
 *
 * RELEASE AUTHORITY
 * -----------------
 * `useVideoPlayer` / `useAudioPlayer` build their player through
 * `useReleasingSharedObject`, so the HOOK owns the native release and releases
 * on unmount. Nothing here releases anything, and nothing may call a player
 * after its owning component unmounted — touching a released shared object
 * raises `NotFoundException: Unable to find native shared object`. Pausing is
 * different: it is allowed while the owner is still mounted.
 */

import type { HomeCloudMemoryKind } from './homecloudTypes';

/** The kinds that own a native media player in the Viewer. */
export type MemoryMediaKind = Extract<HomeCloudMemoryKind, 'video' | 'audio'>;

/** Canonical Memory kind names. Same grammar as the rest of the Memories UI. */
export const MEMORY_MEDIA_KIND_LABEL: Readonly<Record<MemoryMediaKind, string>> = {
  video: 'Video',
  audio: 'Audio',
};

export function isMemoryMediaKind(kind: HomeCloudMemoryKind): kind is MemoryMediaKind {
  return kind === 'video' || kind === 'audio';
}

/**
 * ONE lifecycle intent for the whole Viewer (§ "ONE LIFECYCLE INTENT").
 *
 * Every global event that must stop audible media — a pager drag, a settled
 * page change, HomeCloud losing focus, the app leaving the foreground, the
 * Viewer closing — is expressed here as one boolean. There is deliberately no
 * per-media AppState listener and no media event bus: Video and Audio read the
 * SAME answer, so they cannot compete.
 */
export type MemoryMediaLifecycle = {
  /** This page is the one the pager settled on. */
  readonly isActivePage: boolean;
  /** The Viewer overlay is still mounted. */
  readonly viewerOpen: boolean;
  /** `AppState.currentState === 'active'`. */
  readonly appActive: boolean;
  /** The HomeCloud screen still holds navigation focus. */
  readonly screenFocused: boolean;
  /** The user has a finger down on the pager. */
  readonly dragging: boolean;
};

/**
 * Is a native player allowed to be playing right now?
 *
 * Returning `false` means the media components PAUSE. It never means they
 * resume: nothing in this codebase calls `play()` outside an explicit user
 * press, so returning to the foreground cannot restart audio by accident.
 */
export function mediaPlaybackAuthorized(lifecycle: MemoryMediaLifecycle): boolean {
  return lifecycle.isActivePage
    && lifecycle.viewerOpen
    && lifecycle.appActive
    && lifecycle.screenFocused
    && !lifecycle.dragging;
}

/**
 * A duration is only a duration when the player REPORTED one.
 *
 * `undefined`, `NaN`, `Infinity` and negatives are all rejected, so no surface
 * can render a lying position or divide by a non-number.
 */
export function validMediaDuration(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return value;
}

/**
 * Progress as an honest 0..1 ratio, or `null` when it cannot be computed.
 *
 * A ratio is only meaningful against a POSITIVE duration: `0` means "not yet
 * known", so a player reporting `duration = 0` gets `null`, never a divide.
 */
export function mediaProgressRatio(currentTime: unknown, duration: unknown): number | null {
  const total = validMediaDuration(duration);
  const position = validMediaDuration(currentTime);
  if (total === null || total <= 0 || position === null) return null;
  return Math.min(1, Math.max(0, position / total));
}

/**
 * How a media failure is described to the user.
 *
 * - `access`: the canonical original could not be obtained.
 * - `unsupported`: ONLY when the installed player API actually reports that
 *   this device cannot play the media.
 * - `playback`: everything else, because calling an unknown error
 *   "unsupported" is a claim we cannot prove.
 */
export type MemoryMediaFailure = 'access' | 'playback' | 'unsupported';

/**
 * `VideoTrack.isSupported` is documented `@platform android` in the installed
 * `expo-video` types. Reading it on iOS would be reading a field that carries no
 * evidence there, so `unsupported` is reachable ONLY from the platform whose
 * API actually reports it.
 */
export type MemoryMediaPlatform = 'ios' | 'android' | 'web' | 'windows' | 'macos';

export function resolveMemoryMediaFailure(input: {
  readonly access: 'ok' | 'failed';
  readonly platform: MemoryMediaPlatform;
  /** `expo-video` `availableVideoTracks`; `isSupported` is Android-only. */
  readonly videoTracks: readonly { readonly isSupported?: boolean }[];
}): MemoryMediaFailure {
  if (input.access === 'failed') return 'access';
  if (input.platform !== 'android') return 'playback';
  const tracks = input.videoTracks;
  if (tracks.length === 0) return 'playback';
  return tracks.every((track) => track.isSupported === false) ? 'unsupported' : 'playback';
}

/**
 * Component-local authority for the signed-original request.
 *
 * A signed URL request can resolve after the page lost ownership (the user
 * swiped away, the Viewer closed, the household changed). This is deliberately
 * NOT a global cancellation architecture: each active media page owns one of
 * these, and `isCurrent` is the only question it is allowed to ask before
 * touching any state.
 */
export class MemoryMediaAccess {
  private generation = 0;

  /** Claim ownership for a new request and return its generation. */
  begin(): number {
    this.generation += 1;
    return this.generation;
  }

  /** Is `generation` still the newest claim? */
  isCurrent(generation: number): boolean {
    return this.generation === generation;
  }

  /** Revoke every outstanding claim (unmount, close, page change). */
  invalidate(): void {
    this.generation += 1;
  }
}