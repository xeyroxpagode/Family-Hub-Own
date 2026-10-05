/**
 * HomeCloud MO-A3 — Memory COLLECTIONS read owner (framework free).
 *
 * ONE OWNER, ONE ACTIVE COLLECTION
 * ---------------------------------
 * Selecting Memories across Recuerdos and Colecciones must not create a second
 * library. This controller owns exactly ONE active collection read at a time
 * and follows the same proven framework-free pagination pattern the rest of
 * HomeCloud already uses (`homecloudAlbumsPagination`,
 * `homecloudAlbumDetailPagination`): a generation counter, replace vs append,
 * dedupe by `contentId`, the SERVER `nextOffset`, and rejection of a stale
 * answer.
 *
 * CHANGING COLLECTION RESETS THE DATA; CHANGING SELECTION DOES NOT
 * ---------------------------------------------------------------
 * The generation is bumped when the COLLECTION changes, never when a Memory is
 * selected. That separation is the whole contract of cross-view selection: the
 * pending `selectedIds` live in `homecloudMemorySelection` and are untouched by
 * any read here.
 *
 * THE READ CONTRACTS ARE THE EXISTING ONES
 * -----------------------------------------
 * Every collection is the SAME Memories read model with a different filter. No
 * backend change, no new endpoint, no client re-sort:
 *
 *   Fotos   -> listMemories(token, { kind: 'image',  order: 'timeline', limit, offset })
 *   Videos  -> listMemories(token, { kind: 'video',  order: 'timeline', limit, offset })
 *   Audios  -> listMemories(token, { kind: 'audio',  order: 'timeline', limit, offset })
 *   Notas   -> listMemories(token, { kind: 'written', order: 'timeline', limit, offset })
 *   Album X -> listMemories(token, { albumId: X,     order: 'album',    limit, offset })
 *
 * `kind: 'written'` is the contract; `note` is NOT a Memory kind and is never
 * sent. There is deliberately NO People / Pets / Trips / Places / Faces /
 * Objects / OCR / semantic / Homi collection: MO-A3 ships Albums plus the four
 * deterministic type collections and nothing else.
 */

import type { HomeCloudMemoriesQuery, HomeCloudMemoryKind, HomeCloudMemoryListItem } from './homecloudTypes';

/**
 * A collection identity.
 *
 * `type` is one of the four deterministic kind collections; `album` is an Album
 * of the CURRENT household. The discriminated union is what makes it impossible
 * to build a read for an Album without `order: 'album'`, or a type read with an
 * `albumId`.
 */
export type MemoryCollectionRef =
  | { readonly kind: 'type'; readonly memoryKind: HomeCloudMemoryKind }
  | { readonly kind: 'album'; readonly albumId: string };

/** A `type` collection ref, narrowed out of the union by construction. */
export type MemoryTypeCollectionRef = { readonly kind: 'type'; readonly memoryKind: HomeCloudMemoryKind };

/**
 * The four deterministic type collections, in their frozen product order.
 *
 * Their ORDER is data on purpose: the Memories root renders this array verbatim
 * as its `Tipos` section, so the product order can never drift between surfaces.
 *
 * The element type is NARROWED to the `type` branch on purpose. This array
 * genuinely contains only type refs, and declaring the wider union forced every
 * consumer to re-check a discriminant that cannot be false.
 */
export const MEMORY_TYPE_COLLECTIONS: readonly MemoryTypeCollectionRef[] = [
  { kind: 'type', memoryKind: 'image' },
  { kind: 'type', memoryKind: 'video' },
  { kind: 'type', memoryKind: 'audio' },
  { kind: 'type', memoryKind: 'written' },
] as const;

/** Stable, opaque id. Local source state — NOT a route and NOT a nav param. */
export function memoryCollectionId(ref: MemoryCollectionRef): string {
  return ref.kind === 'album' ? `album:${ref.albumId}` : `type:${ref.memoryKind}`;
}

export function parseMemoryCollectionId(collectionId: string): MemoryCollectionRef | null {
  if (collectionId.startsWith('album:')) {
    const albumId = collectionId.slice('album:'.length);
    return albumId.length > 0 ? { kind: 'album', albumId } : null;
  }
  if (collectionId.startsWith('type:')) {
    const memoryKind = collectionId.slice('type:'.length);
    const known = MEMORY_TYPE_COLLECTIONS.find(
      (ref): ref is { readonly kind: 'type'; readonly memoryKind: HomeCloudMemoryKind } =>
        ref.kind === 'type' && ref.memoryKind === memoryKind,
    );
    return known ?? null;
  }
  return null;
}

const TYPE_COLLECTION_TITLES: Readonly<Record<string, string>> = {
  image: 'Fotos',
  video: 'Videos',
  audio: 'Audios',
  written: 'Notas',
};

/** The content-level header of a collection detail. An Album uses its own name. */
export function memoryCollectionTitle(ref: MemoryCollectionRef, albumName?: string | null): string {
  if (ref.kind === 'album') return albumName ?? 'Álbum';
  return TYPE_COLLECTION_TITLES[ref.memoryKind] ?? 'Colección';
}

/**
 * THE EXACT READ QUERY.
 *
 * Built in ONE place so a collection can never be read with a contract it was
 * not designed for, and so the absence of `note` / semantic filters is a
 * property of the code rather than of a reviewer's memory.
 */
export function buildMemoryCollectionQuery(
  ref: MemoryCollectionRef,
  limit: number,
  offset: number,
): HomeCloudMemoriesQuery {
  if (ref.kind === 'album') {
    // The Album presentation order is the server's; `order: 'album'` REQUIRES
    // `albumId` and the backend rejects it without one instead of guessing.
    return { albumId: ref.albumId, order: 'album', limit, offset };
  }
  return { kind: ref.memoryKind, order: 'timeline', limit, offset };
}

export type MemoryCollectionsPage = {
  readonly memories: readonly HomeCloudMemoryListItem[];
  readonly nextOffset: number | null;
};

export type MemoryCollectionsState = {
  readonly collectionId: string | null;
  readonly memories: readonly HomeCloudMemoryListItem[];
  readonly nextOffset: number | null;
  readonly loading: boolean;
  readonly loadingMore: boolean;
  readonly refreshing: boolean;
  /** A failed later page. Never a reason to drop what is already loaded. */
  readonly pageError: string | null;
  /** A failed first page. */
  readonly error: string | null;
  /**
   * TERMINAL: the Album of this collection no longer exists (or is not
   * accessible). `homecloud_album_not_found` is classified by the existing
   * Album-scope helper; a type collection can never be missing.
   */
  readonly missing: boolean;
};

export const MEMORY_COLLECTIONS_INITIAL: MemoryCollectionsState = {
  collectionId: null,
  memories: [],
  nextOffset: null,
  loading: false,
  loadingMore: false,
  refreshing: false,
  pageError: null,
  error: null,
  missing: false,
};

export type MemoryCollectionsReadInput = {
  readonly collectionId: string;
  readonly ref: MemoryCollectionRef;
  readonly limit: number;
  readonly offset: number;
};

export type MemoryCollectionsOptions = {
  readonly read: (input: MemoryCollectionsReadInput) => Promise<MemoryCollectionsPage>;
  readonly limit: number;
  readonly onState: (state: MemoryCollectionsState) => void;
  readonly isMissing?: (error: unknown) => boolean;
  readonly errorMessage?: (error: unknown) => string;
  readonly pageErrorMessage?: (error: unknown) => string;
};

export type MemoryCollectionsController = {
  getState(): MemoryCollectionsState;
  /** Open a collection: reset every page and read offset 0. */
  open(ref: MemoryCollectionRef): Promise<void>;
  /** Authoritative page-0 re-read. */
  refresh(): Promise<void>;
  loadMore(): Promise<void>;
  /** Household switch / leaving Collections: drop everything, supersede pages. */
  reset(): void;
};

const DEFAULT_ERROR = 'No pudimos cargar esta colección.';
const DEFAULT_PAGE_ERROR = 'No pudimos cargar más recuerdos.';

/** Append a page, dropping Memories already loaded. Never reorders. */
export function appendUniqueCollectionMemories(
  previous: readonly HomeCloudMemoryListItem[],
  incoming: readonly HomeCloudMemoryListItem[],
): HomeCloudMemoryListItem[] {
  const known = new Set(previous.map((memory) => memory.id));
  return [...previous, ...incoming.filter((memory) => !known.has(memory.id))];
}

export function createMemoryCollectionsController(
  options: MemoryCollectionsOptions,
): MemoryCollectionsController {
  const { read, limit, onState } = options;
  const isMissing = options.isMissing ?? (() => false);
  const errorMessage = options.errorMessage ?? (() => DEFAULT_ERROR);
  const pageErrorMessage = options.pageErrorMessage ?? (() => DEFAULT_PAGE_ERROR);

  let state: MemoryCollectionsState = MEMORY_COLLECTIONS_INITIAL;
  let ref: MemoryCollectionRef | null = null;
  // ONE generation for the whole controller. Opening another collection, a
  // refresh and a household reset all supersede every page still in flight.
  let generation = 0;
  let loadingMore = false;

  const publish = (patch: Partial<MemoryCollectionsState>) => {
    state = { ...state, ...patch };
    onState(state);
  };

  const readFirstPage = async () => {
    const active = ref;
    if (active === null) return;
    const collectionId = memoryCollectionId(active);
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
      const page = await read({ collectionId, ref: active, limit, offset: 0 });
      if (mine !== generation) return;
      publish({
        memories: appendUniqueCollectionMemories([], page.memories),
        nextOffset: page.nextOffset,
        loading: false,
        refreshing: false,
        missing: false,
        error: null,
      });
    } catch (error) {
      if (mine !== generation) return;
      if (isMissing(error)) {
        publish({ memories: [], nextOffset: null, loading: false, refreshing: false, missing: true, error: null });
        return;
      }
      publish({ loading: false, refreshing: false, error: errorMessage(error) });
    }
  };

  return {
    getState: () => state,

    async open(next) {
      // A collection change resets the DATA before the read, so the previous
      // collection's Memories can never render under the new header.
      generation += 1;
      loadingMore = false;
      ref = next;
      state = { ...MEMORY_COLLECTIONS_INITIAL, collectionId: memoryCollectionId(next), loading: true };
      onState(state);
      await readFirstPage();
    },

    refresh: () => readFirstPage(),

    async loadMore() {
      const active = ref;
      const offset = state.nextOffset;
      if (active === null || offset === null || loadingMore || state.loading || state.missing) return;
      const mine = generation;
      loadingMore = true;
      publish({ loadingMore: true, pageError: null });
      try {
        const page = await read({ collectionId: memoryCollectionId(active), ref: active, limit, offset });
        if (mine !== generation) return;
        publish({
          memories: appendUniqueCollectionMemories(state.memories, page.memories),
          nextOffset: page.nextOffset,
          loadingMore: false,
        });
      } catch (error) {
        if (mine !== generation) return;
        if (isMissing(error)) {
          publish({ memories: [], nextOffset: null, loadingMore: false, missing: true, error: null });
          return;
        }
        // Loaded pages and `nextOffset` survive, so the retry asks for the very
        // same page instead of skipping one.
        publish({ pageError: pageErrorMessage(error), loadingMore: false });
      } finally {
        if (mine === generation) loadingMore = false;
      }
    },

    reset() {
      generation += 1;
      loadingMore = false;
      ref = null;
      state = MEMORY_COLLECTIONS_INITIAL;
      onState(state);
    },
  };
}