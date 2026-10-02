/**
 * HomeCloud W1-B — Files pagination controller.
 *
 * WHY A CONTROLLER AND NOT SCREEN STATE
 * -------------------------------------
 * The audited defects of the Files list were all STATE defects, not layout ones:
 * a silent truncation at 100 items, an append that could duplicate a tile or
 * skip an item, a page error that destroyed the pages already loaded, and a
 * late answer for a previous query contaminating the current one. Every one of
 * them is decided by transitions between pages, so the transitions live HERE —
 * framework free, directly testable — and the screen only mirrors the state.
 *
 * THE CONTRACT IS THE EXISTING BACKEND ONE
 * ----------------------------------------
 * `GET /api/homecloud/files` already answers `nextOffset` = `offset + limit`
 * while a full page came back, and `null` on the last page. This controller
 * consumes exactly that: it invents no cursor, no protocol and no server change.
 *
 * THE TWO RULES THAT MATTER MOST
 * ------------------------------
 * 1. GENERATIONS. Every first page takes a new generation; a later page belongs
 *    to the generation that was current when it started. A response may only be
 *    applied by its own generation, so a slow answer for query A can never
 *    append into query B, and a household switch discards the previous
 *    household's in-flight pages. This is what makes the append safe without any
 *    query-comparison heuristics.
 * 2. A page failure is NOT a list failure. It leaves the loaded pages and
 *    `nextOffset` untouched, so the retry asks for exactly the same page again.
 */

import type { HomeCloudFile, HomeCloudFolder } from './homecloudTypes';

/** One page as the browser read returns it. */
export type FilesBrowserPage = {
  readonly folders: HomeCloudFolder[];
  readonly files: HomeCloudFile[];
  readonly nextOffset: number | null;
};

export type FilesPaginationState = {
  readonly folders: HomeCloudFolder[];
  readonly files: HomeCloudFile[];
  readonly nextOffset: number | null;
  readonly loading: boolean;
  readonly loadingMore: boolean;
  /** A failed LATER page. Never a reason to drop what is already on screen. */
  readonly pageError: string | null;
};

export const FILES_PAGINATION_INITIAL: FilesPaginationState = {
  folders: [],
  files: [],
  nextOffset: null,
  loading: true,
  loadingMore: false,
  pageError: null,
};

export type FilesPaginationOptions = {
  /**
   * One page read. The controller decides the offset; the reader owns transport
   * and must translate the backend page into `FilesBrowserPage`.
   */
  readonly read: (input: { limit: number; offset: number }) => Promise<FilesBrowserPage>;
  readonly limit: number;
  readonly onState: (state: FilesPaginationState) => void;
  /** Message for a failed later page. Never used for a first-page failure. */
  readonly pageErrorMessage?: (error: unknown) => string;
};

export type FilesPaginationController = {
  getState(): FilesPaginationState;
  /** First page at offset 0. Supersedes every request in flight. */
  load(): Promise<void>;
  /** The next page. A no-op when there is no next page. */
  loadMore(): Promise<void>;
  /** Drop everything (household switch) and supersede in-flight requests. */
  reset(): void;
};

const DEFAULT_PAGE_ERROR = 'No pudimos cargar más archivos.';

/**
 * Append a page, dropping ids already present.
 *
 * The server orders by (sort key, id), so pages cannot overlap by construction;
 * this guards the case where the underlying set moved between two requests, and
 * it guarantees a tile is never rendered twice. Order of what is already loaded
 * is never disturbed.
 */
export function appendUniqueFiles(
  previous: readonly HomeCloudFile[],
  incoming: readonly HomeCloudFile[],
): HomeCloudFile[] {
  const known = new Set(previous.map((file) => file.id));
  return [...previous, ...incoming.filter((file) => !known.has(file.id))];
}

/** Is there another page to ask for? `nextOffset === null` IS the last page. */
export function hasMoreFilesPages(state: FilesPaginationState): boolean {
  return state.nextOffset !== null;
}

export function createFilesPagination(options: FilesPaginationOptions): FilesPaginationController {
  const { read, limit, onState } = options;
  const pageErrorMessage = options.pageErrorMessage ?? (() => DEFAULT_PAGE_ERROR);

  let state: FilesPaginationState = FILES_PAGINATION_INITIAL;
  let generation = 0;
  // Mirrors the loading flags, because a stale response must be able to tell
  // that a newer generation already took over.
  let loadingMore = false;

  const publish = (patch: Partial<FilesPaginationState>) => {
    state = { ...state, ...patch };
    onState(state);
  };

  const controller: FilesPaginationController = {
    getState: () => state,

    async load() {
      const mine = ++generation;
      // A new first page supersedes any page still in flight, so the spinner
      // for "loading more" must not survive into the new query.
      loadingMore = false;
      publish({ loading: true, loadingMore: false, pageError: null });
      try {
        const page = await read({ limit, offset: 0 });
        if (mine !== generation) return;
        publish({
          folders: page.folders,
          files: appendUniqueFiles([], page.files),
          nextOffset: page.nextOffset,
          loading: false,
        });
      } catch (error) {
        if (mine !== generation) return;
        publish({ loading: false });
        // The FIRST page failing is the surface's own read failure (a refusal
        // must render as a refusal, never as an empty folder), so it is the
        // caller's to present.
        throw error;
      }
    },

    async loadMore() {
      const offset = state.nextOffset;
      // No next page: the final page shows no CTA, so this is a no-op.
      if (offset === null || loadingMore || state.loading) return;
      const mine = generation;
      loadingMore = true;
      publish({ loadingMore: true, pageError: null });
      try {
        const page = await read({ limit, offset });
        if (mine !== generation) return;
        publish({
          files: appendUniqueFiles(state.files, page.files),
          nextOffset: page.nextOffset,
          loadingMore: false,
        });
      } catch (error) {
        if (mine !== generation) return;
        // Loaded pages and `nextOffset` survive untouched, so the next attempt
        // asks for the very same page.
        publish({ pageError: pageErrorMessage(error), loadingMore: false });
      } finally {
        if (mine === generation) loadingMore = false;
      }
    },

    reset() {
      // Bumping the generation is what discards in-flight pages.
      generation += 1;
      loadingMore = false;
      state = FILES_PAGINATION_INITIAL;
      onState(state);
    },
  };

  return controller;
}
