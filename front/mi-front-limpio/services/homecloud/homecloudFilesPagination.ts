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
 * `GET /api/homecloud/files` already answers `limit`/`offset` and `nextOffset`.
 * It invents no cursor, no protocol and no new endpoint here.
 *
 * S4-iii C2 — HOW "THERE IS MORE" IS DECIDED
 * -------------------------------------------
 * A full page is NOT evidence of a next page: a household with exactly 100 files
 * answers a full page, and `files.length === limit` would then advertise a page
 * that does not exist (the phantom "Mostrar más archivos"). The backend
 * therefore reads ONE row more than the requested page size and answers
 * `nextOffset` from that proof:
 *
 *   received > limit  -> another row genuinely exists -> first `limit` returned,
 *                       nextOffset = offset + limit
 *   received <= limit -> that was the last page       -> all returned, nextOffset null
 *
 * This controller consumes that answer verbatim. It deliberately does NOT probe
 * again: the probe row was already consumed by the read that produced
 * `nextOffset`, so trimming here would discard the evidence and make a real next
 * page look like the last one. `nextOffset === null` IS the end of the list.
 *
 * S4-iii B1 — THE CONTEXT OWNS ITS ROWS
 * -------------------------------------
 * `contextKey` is the identity of the query the loaded pages belong to. A new
 * first page publishes `contextKey: null` the moment it starts, and the value
 * only comes back with the response that actually won the generation. A surface
 * can therefore never paint the PREVIOUS context's rows under the NEW context's
 * title: while they disagree, nothing loaded is current. This is orthogonal to
 * generations — it never widens what a stale answer may write, it only refuses
 * to present rows whose context is not the current one.
 *
 * S4-iii C1 — A REFRESH KEEPS THE LOADED WINDOW
 * ---------------------------------------------
 * An upload, a move or a rename changes the DATA, not the question. Resetting to
 * the first page after any of them silently threw away pages the member had
 * already loaded (300 loaded -> 100 after one upload). `refreshPreservingWindow`
 * re-reads offset 0 for exactly the number of rows already on screen — in the
 * same page-sized windows the member loaded them in, so the window is re-read
 * from the source instead of being preserved as stale rows.
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
  /**
   * The query identity the loaded rows belong to, or `null` while nothing loaded
   * belongs to the current query. S4-iii B1: the surface must not render the
   * loaded rows while this disagrees with its current query.
   */
  readonly contextKey: string | null;
};

export const FILES_PAGINATION_INITIAL: FilesPaginationState = {
  folders: [],
  files: [],
  nextOffset: null,
  loading: true,
  loadingMore: false,
  pageError: null,
  contextKey: null,
};

export type FilesPaginationOptions = {
  /**
   * One page read. The controller decides the offset; the reader owns transport
   * and must translate the backend page into `FilesBrowserPage`.
   *
   * The requested `limit` is the LOGICAL page size. `nextOffset` is consumed
   * verbatim: it is already the backend's evidence-based answer (S4-iii C2), so
   * this controller never trims and never re-probes.
   */
  readonly read: (input: { limit: number; offset: number }) => Promise<FilesBrowserPage>;
  readonly limit: number;
  readonly onState: (state: FilesPaginationState) => void;
  /** Message for a failed later page. Never used for a first-page failure. */
  readonly pageErrorMessage?: (error: unknown) => string;
  /**
   * Identity of the query this read belongs to (folder + query + sort). S4-iii
   * B1: while the loaded rows' key differs from this, they may not be shown.
   * Omit for a context-free controller (a page-window unit test, for example).
   */
  readonly contextKey?: () => string;
};

export type FilesPaginationController = {
  getState(): FilesPaginationState;
  /** First page at offset 0. Supersedes every request in flight. */
  load(): Promise<void>;
  /** The next page. A no-op when there is no next page. */
  loadMore(): Promise<void>;
  /**
   * Re-read offset 0 for exactly the number of rows already loaded. Same data,
   * same question, same generation discipline — the loaded window survives.
   */
  refreshPreservingWindow(): Promise<void>;
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

/**
 * The ONE Files page-window state machine.
 *
 * Generations, dedupe and the page-error boundary all live here so a screen can
 * only mirror them. `refreshPreservingWindow` re-reads offset 0 for exactly the
 * number of rows already loaded, in the same page-sized windows they were loaded
 * in, so a refresh answers the SAME question without collapsing the window.
 */
export function createFilesPagination(options: FilesPaginationOptions): FilesPaginationController {
  const { read, limit, onState } = options;
  const pageErrorMessage = options.pageErrorMessage ?? (() => DEFAULT_PAGE_ERROR);
  const currentContextKey = () => options.contextKey?.() ?? null;

  let state: FilesPaginationState = FILES_PAGINATION_INITIAL;
  let generation = 0;
  // Mirrors the loading flags, because a stale response must be able to tell
  // that a newer generation already took over.
  let loadingMore = false;

  const publish = (patch: Partial<FilesPaginationState>) => {
    state = { ...state, ...patch };
    onState(state);
  };

  /**
   * The shared first-page transition. The CONTEXT is captured here, before the
   * read, so a response can only ever be labelled with the query it was issued
   * for.
   *
   * `supersedesContext` is true when the QUESTION changed (a new first page): the
   * loaded rows then stop belonging to the current query immediately, so no
   * surface can paint them under the new context. It is false for a refresh,
   * which answers the same question: the loaded rows keep their context and stay
   * on screen while the same window is re-read.
   */
  const loadWindow = async (supersedesContext: boolean): Promise<void> => {
    const mine = ++generation;
    const contextKey = currentContextKey();
    // A new first page supersedes any page still in flight, so the spinner for
    // "loading more" must not survive into the new query.
    loadingMore = false;
    const start = supersedesContext
      ? { loading: true, loadingMore: false, pageError: null, contextKey: null }
      : { loadingMore: false, pageError: null };
    publish(start);
    try {
      const page = await read({ limit, offset: 0 });
      if (mine !== generation) return;
      publish({
        folders: page.folders,
        files: appendUniqueFiles([], page.files),
        nextOffset: page.nextOffset,
        loading: false,
        contextKey,
      });
    } catch (error) {
      if (mine !== generation) return;
      publish({ loading: false });
      // The FIRST page failing is the surface's own read failure (a refusal
      // must render as a refusal, never as an empty folder), so it is the
      // caller's to present.
      throw error;
    }
  };

  const controller: FilesPaginationController = {
    getState: () => state,

    load: () => loadWindow(true),

    /**
     * S4-iii C1 — refresh the SAME window.
     *
     * `state.files.length` is the number of rows the member is looking at, so
     * the re-read walks offset 0 in the same page-sized windows they were loaded
     * in (a 300-row window is 100 + 100 + 100, never one request for 300, which
     * the backend clamps to 100 and would collapse the window anyway). Rows are
     * re-read, never preserved: what lands on screen is what the read returned,
     * and `nextOffset` is the backend's own answer for the window that was
     * re-read — so a household that grew still offers the next page and one that
     * did not, does not. The context is untouched, so the list is never blanked.
     */
    refreshPreservingWindow() {
      // Nothing loaded yet: there is no window to preserve, so this is a first
      // page (and it supersedes the context, exactly as `load` does).
      const target = state.files.length;
      if (target <= 0) return loadWindow(true);
      const mine = ++generation;
      const contextKey = currentContextKey();
      loadingMore = false;
      // A refresh answers the same question: the loaded rows keep their context
      // and stay on screen while the same window is re-read.
      publish({ loadingMore: false, pageError: null });
      return (async () => {
        const collected: HomeCloudFile[] = [];
        let folders: HomeCloudFolder[] = [];
        let nextOffset: number | null = null;
        let offset = 0;
        try {
          while (collected.length < target) {
            const take = Math.min(limit, target - collected.length);
            const page = await read({ limit: take, offset });
            if (mine !== generation) return;
            folders = page.folders;
            collected.push(...appendUniqueFiles(collected, page.files).slice(collected.length));
            nextOffset = page.nextOffset;
            if (nextOffset === null) break;
            offset += take;
          }
          if (mine !== generation) return;
          publish({ folders, files: collected, nextOffset, loading: false, contextKey });
        } catch (error) {
          if (mine !== generation) return;
          publish({ loading: false });
          throw error;
        }
      })();
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
