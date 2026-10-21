/**
 * HomeCloud MO-A2 — Album detail pagination controller (framework free).
 *
 * WHY A CONTROLLER
 * ---------------
 * An Album detail is a paginated read of the SAME Memories read model in the
 * SAME presentation order (oldest -> newest), and every defect worth preventing
 * here is a page-transition decision:
 *
 *  - a page answer for a previous Album must never append into the current one;
 *  - appending must never duplicate a Memory even if the underlying set moved
 *    between two requests;
 *  - a LATER page failure is not a list failure: the loaded pages and
 *    `nextOffset` survive so the retry asks for exactly the same page again;
 *  - `homecloud_album_not_found` is TERMINAL in this scope, so it must not become
 *    a retry spin or a fake empty Album.
 *
 * The transitions live HERE so they are directly testable; the view only mirrors
 * the state.
 *
 * THE READ CONTRACT IS THE EXISTING BACKEND ONE
 * ---------------------------------------------
 * `listMemories(token, { albumId, order: 'album', limit, offset })` already
 * answers `nextOffset` = `offset + limit` while a full page came back and `null`
 * on the last page. This controller invents no cursor and no protocol, and it
 * NEVER re-sorts: the server order is the Album presentation order.
 */

import type { HomeCloudMemoryListItem } from './homecloudTypes';
import { isAlbumMissingFailure } from './homecloudAlbumScope';

export type AlbumDetailPage = {
  readonly memories: readonly HomeCloudMemoryListItem[];
  readonly nextOffset: number | null;
};

export type AlbumDetailState = {
  /** The Album currently open, or null when the detail is closed. */
  readonly albumId: string | null;
  readonly memories: readonly HomeCloudMemoryListItem[];
  readonly nextOffset: number | null;
  /** True while the FIRST page of the current Album has never resolved. */
  readonly loading: boolean;
  readonly loadingMore: boolean;
  /** Authoritative page-0 re-read while memories are already on screen. */
  readonly refreshing: boolean;
  /** A failed later page. Never a reason to drop what is already loaded. */
  readonly pageError: string | null;
  /** A failed first page that is NOT the terminal missing-Album condition. */
  readonly error: string | null;
  /**
   * TERMINAL: the Album no longer exists (or is not accessible). The surface
   * renders the unavailable state and the way back to Recuerdos. It must never
   * retry this condition, and it must never render a fake empty Album.
   */
  readonly missing: boolean;
};

export const ALBUM_DETAIL_INITIAL: AlbumDetailState = {
  albumId: null,
  memories: [],
  nextOffset: null,
  loading: false,
  loadingMore: false,
  refreshing: false,
  pageError: null,
  error: null,
  missing: false,
};

export type AlbumDetailReadInput = {
  readonly albumId: string;
  readonly limit: number;
  readonly offset: number;
};

export type AlbumDetailOptions = {
  /** One page read. The controller owns the Album, the limit and the offset. */
  readonly read: (input: AlbumDetailReadInput) => Promise<AlbumDetailPage>;
  readonly limit: number;
  readonly onState: (state: AlbumDetailState) => void;
  readonly isMissing?: (error: unknown) => boolean;
  readonly errorMessage?: (error: unknown) => string;
  readonly pageErrorMessage?: (error: unknown) => string;
};

export type AlbumDetailController = {
  getState(): AlbumDetailState;
  /** Open an Album: reset every page and read offset 0. */
  open(albumId: string): Promise<void>;
  /** Authoritative page-0 re-read (focus / pull-to-refresh / post-mutation). */
  refresh(): Promise<void>;
  /** The next page. A no-op when there is no next page. */
  loadMore(): Promise<void>;
  /** Household switch (or close): drop everything and supersede in-flight pages. */
  reset(): void;
};

const DEFAULT_ERROR = 'No pudimos cargar este álbum.';
const DEFAULT_PAGE_ERROR = 'No pudimos cargar más recuerdos del álbum.';

/**
 * Append a page, dropping Memories already loaded.
 *
 * The server order is a total order, so pages cannot overlap by construction;
 * this guards the case where the underlying set moved between two requests and
 * it guarantees a Memory is never rendered twice. What is already loaded keeps
 * its order.
 */
export function appendUniqueMemories(
  previous: readonly HomeCloudMemoryListItem[],
  incoming: readonly HomeCloudMemoryListItem[],
): HomeCloudMemoryListItem[] {
  const known = new Set(previous.map((memory) => memory.id));
  return [...previous, ...incoming.filter((memory) => !known.has(memory.id))];
}

export function createAlbumDetailController(options: AlbumDetailOptions): AlbumDetailController {
  const { read, limit, onState } = options;
  const isMissing = options.isMissing ?? isAlbumMissingFailure;
  const errorMessage = options.errorMessage ?? (() => DEFAULT_ERROR);
  const pageErrorMessage = options.pageErrorMessage ?? (() => DEFAULT_PAGE_ERROR);

  let state: AlbumDetailState = ALBUM_DETAIL_INITIAL;
  // One generation counter for the whole controller: opening another Album, a
  // refresh and a household reset all supersede every page still in flight.
  let generation = 0;
  let loadingMore = false;

  const publish = (patch: Partial<AlbumDetailState>) => {
    state = { ...state, ...patch };
    onState(state);
  };

  /** Read page 0 and REPLACE the pages. This is also a refresh, by definition. */
  const readFirstPage = async () => {
    const albumId = state.albumId;
    if (albumId === null) return;
    const mine = ++generation;
    loadingMore = false;
    const firstPaint = state.memories.length === 0;
    publish({
      loading: firstPaint,
      refreshing: !firstPaint,
      loadingMore: false,
      pageError: null,
      error: null,
      missing: false,
    });
    try {
      const page = await read({ albumId, limit, offset: 0 });
      if (mine !== generation) return;
      publish({
        memories: appendUniqueMemories([], page.memories),
        nextOffset: page.nextOffset,
        loading: false,
        refreshing: false,
        missing: false,
        error: null,
      });
    } catch (error) {
      if (mine !== generation) return;
      if (isMissing(error)) {
        // TERMINAL. The grouping is gone: there is nothing to retry and nothing
        // to empty out. The pages of the Album that no longer exists are dropped
        // so nothing from it can be shown again.
        publish({ memories: [], nextOffset: null, loading: false, refreshing: false, missing: true, error: null });
        return;
      }
      publish({ loading: false, refreshing: false, error: errorMessage(error) });
    }
  };

  return {
    getState: () => state,

    async open(albumId) {
      // An Album change resets every page BEFORE the read, so the previous
      // Album's Memories can never be visible under the new Album's header.
      generation += 1;
      loadingMore = false;
      state = { ...ALBUM_DETAIL_INITIAL, albumId, loading: true };
      onState(state);
      await readFirstPage();
    },

    refresh: () => readFirstPage(),

    async loadMore() {
      const albumId = state.albumId;
      const offset = state.nextOffset;
      // No next page: the final page shows no CTA, so this is a no-op.
      if (albumId === null || offset === null || loadingMore || state.loading || state.missing) return;
      const mine = generation;
      loadingMore = true;
      publish({ loadingMore: true, pageError: null });
      try {
        const page = await read({ albumId, limit, offset });
        if (mine !== generation) return;
        publish({
          memories: appendUniqueMemories(state.memories, page.memories),
          nextOffset: page.nextOffset,
          loadingMore: false,
        });
      } catch (error) {
        if (mine !== generation) return;
        if (isMissing(error)) {
          // The Album was deleted by another actor WHILE paging. That is the
          // same terminal condition as on the first page.
          publish({ memories: [], nextOffset: null, loadingMore: false, missing: true, error: null });
          return;
        }
        // Loaded pages and `nextOffset` survive untouched, so the next attempt
        // asks for the very same page.
        publish({ pageError: pageErrorMessage(error), loadingMore: false });
      } finally {
        if (mine === generation) loadingMore = false;
      }
    },

    reset() {
      generation += 1;
      loadingMore = false;
      state = ALBUM_DETAIL_INITIAL;
      onState(state);
    },
  };
}