/**
 * HomeCloud MO-A2 — Albums rail controller (framework free, no React).
 *
 * WHY A CONTROLLER
 * ---------------
 * The Albums rail is a small surface with a small contract, but every one of its
 * failure modes is a STATE decision, not a layout one:
 *
 *  - an answer for a household that is being left must never paint inside the
 *    next household;
 *  - a focus / post-mutation reload must be AUTHORITATIVE, while the first paint
 *    may legitimately resolve from the existing cached household read;
 *  - a refusal is an access problem, not "this home has no Albums".
 *
 * Those transitions are decided here — directly testable, no renderer — and the
 * screen only mirrors the state.
 *
 * FRESHNESS, NOT A NEW CACHE
 * --------------------------
 * `fetchHomeCloudAlbumsCached` has the existing 30s household TTL. `load()` may
 * resolve from it (that is the point of the cache). `reload()` is the AUTHORITATIVE
 * path used on focus, on manual refresh and after every Album mutation, and it
 * asks the caller for an uncached read: after a mutation the shared invalidation
 * has already dropped the Album keys, so the authoritative read can never be a
 * fresh-cache short circuit that hides the change the user just made.
 *
 * NO PAGINATION INVENTED
 * ----------------------
 * `GET /albums` is unpaginated server-side, so this controller invents no cursor
 * and no page protocol. It owns generations, loading, error, reload and reset —
 * exactly what the surface needs — and nothing more.
 */

import type { HomeCloudAlbum } from './homecloudTypes';

export type AlbumsRailState = {
  readonly albums: readonly HomeCloudAlbum[];
  /** True only for a read that has never produced an answer yet. */
  readonly loading: boolean;
  /** True for a reload that is re-reading while albums are already on screen. */
  readonly refreshing: boolean;
  /** Message of a failed read. Never a permission denial rendered as "empty". */
  readonly error: string | null;
};

export const ALBUMS_RAIL_INITIAL: AlbumsRailState = {
  albums: [],
  loading: true,
  refreshing: false,
  error: null,
};

export type AlbumsRailReadInput = {
  /**
   * True when the surface needs the SERVER truth right now (focus, manual
   * refresh, after a mutation). False allows the existing cached household read
   * to answer, which is only correct for the first paint of a mount.
   */
  readonly authoritative: boolean;
};

export type AlbumsRailOptions = {
  readonly read: (input: AlbumsRailReadInput) => Promise<readonly HomeCloudAlbum[]>;
  readonly onState: (state: AlbumsRailState) => void;
  readonly errorMessage?: (error: unknown) => string;
};

export type AlbumsRailController = {
  getState(): AlbumsRailState;
  /** First read of a mount. May resolve from the existing cached read. */
  load(): Promise<void>;
  /** Authoritative re-read. Supersedes any read still in flight. */
  reload(): Promise<void>;
  /** Household switch: drop everything and supersede in-flight reads. */
  reset(): void;
};

const DEFAULT_ERROR = 'No pudimos cargar tus álbumes.';

/**
 * THE FIVE MUTUALLY EXCLUSIVE STATES of the Albums surface (HC2-C §23).
 *
 * This is a RESOLVER, not a set of booleans the surface re-derives by hand: the
 * whole BUG B report was one boolean (`loading`) standing in for four different
 * situations, which is how a real read failure came to be rendered as a
 * permanent pair of grey blocks.
 *
 *  - `loading`     — real initial content is expected and has never arrived;
 *  - `ready-empty` — the read SUCCEEDED and the household genuinely has none;
 *  - `ready-data`  — real Albums on screen;
 *  - `error`       — the read FAILED with nothing to show beside it;
 *  - `refreshing`  — a re-read while valid Albums are already on screen.
 *
 * Two rules do the real work:
 *
 *  1. A FAILURE WITH CONTENT beside it is `refreshing`, not `error`: the
 *     already-valid tiles stay and the message is published next to them. A
 *     dropped connection is never read as "this home has no Albums".
 *  2. `refreshing` can never render a skeleton: an `ALBUMS_RAIL_INITIAL` with
 *     `refreshing: true` and no albums is not reachable, because a refresh by
 *     definition follows a successful first paint.
 */
export type AlbumsRailPhase = 'loading' | 'ready-empty' | 'ready-data' | 'error' | 'refreshing';

export function solveAlbumsRailPhase(state: AlbumsRailState): AlbumsRailPhase {
  if (state.albums.length > 0) return state.refreshing ? 'refreshing' : 'ready-data';
  if (state.error !== null) return 'error';
  if (state.refreshing) return 'loading';
  return state.loading ? 'loading' : 'ready-empty';
}

/**
 * Does a page-0 RE-READ have to show a skeleton?
 *
 * HC2-C §9 / §23.8: re-reading page 0 with data already on screen must NOT
 * re-render the skeleton, or a focus refresh empties a Timeline the user is
 * reading. `hasContent` is read from a REF by the caller, never from a state
 * dependency, so the decision can never re-fire the effect that made it.
 */
export function solveAlbumsRailShowsSkeleton(hasContent: boolean): boolean {
  return !hasContent;
}

/**
 * A failed read never invents an empty household: the previous albums stay on
 * screen and the error is published next to them, so a dropped connection is
 * never read as "this home has no Albums".
 */
export function createAlbumsRailController(options: AlbumsRailOptions): AlbumsRailController {
  const { read, onState } = options;
  const errorMessage = options.errorMessage ?? (() => DEFAULT_ERROR);

  let state: AlbumsRailState = ALBUMS_RAIL_INITIAL;
  // The one generation counter. Bumping it is what makes every in-flight answer
  // stale, so no query comparison heuristic is ever needed.
  let generation = 0;
  let hasLoadedOnce = false;

  const publish = (patch: Partial<AlbumsRailState>) => {
    state = { ...state, ...patch };
    onState(state);
  };

  const run = async (authoritative: boolean) => {
    const mine = ++generation;
    const firstPaint = !hasLoadedOnce;
    publish({
      loading: firstPaint,
      refreshing: !firstPaint,
      error: null,
    });
    try {
      const albums = await read({ authoritative });
      if (mine !== generation) return;
      hasLoadedOnce = true;
      publish({ albums, loading: false, refreshing: false });
    } catch (error) {
      if (mine !== generation) return;
      // `albums` is deliberately NOT part of this patch: whatever is already on
      // screen survives the failure, so the surface can always tell "never
      // loaded" (empty + error) from "loaded, then failed" (tiles + error).
      publish({ loading: false, refreshing: false, error: errorMessage(error) });
    }
  };

  return {
    getState: () => state,
    load: () => run(false),
    reload: () => run(true),
    reset() {
      generation += 1;
      hasLoadedOnce = false;
      state = ALBUMS_RAIL_INITIAL;
      onState(state);
    },
  };
}