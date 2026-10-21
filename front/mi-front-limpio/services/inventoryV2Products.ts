/**
 * Inventory V2 — Products premium domain helpers (pure).
 *
 * Everything the Products surfaces need to DECIDE — what belongs to the active
 * collection, what the filter chips mean, what "Todos" selects, what survives a
 * realtime mutation — is resolved here, without React and without a renderer,
 * so the semantics are unit-testable and there is exactly ONE authority for
 * them.
 *
 * Contract source:
 * `docs/implementation/inventory/v2/03_INVENTORY_PREMIUM_UX_FREEZE.md` §14.5,
 * §14.6, §14.9, §14.15, §14.15.1, §14.17.
 *
 * Hard rules encoded here:
 * - "Todos" means EVERY result of the active collection, NOT the loaded rows;
 * - the filter is an INTERSECTION with the search, and neither erases the
 *   other;
 * - a product that leaves the collection by realtime/domain mutation leaves
 *   the selection, and an empty selection leaves Selection Mode;
 * - the shopping membership of a product is DERIVED from the shared Inventory
 *   state, never from a local flag.
 */
import type {
  InventoryProductV2,
  InventoryShoppingItem,
  InventoryShoppingResponse,
  ProductListQuery,
} from './inventoryV2';

export type ProductLifecycle = 'active' | 'archived' | 'trashed';

export type ProductStockFilter = 'low' | 'out';

/**
 * The filter state of a list surface.
 *
 * `location` is tri-state on purpose:
 *   - `undefined` → no location filter;
 *   - `null`      → "Sin lugar" (the `location_id === 'none'` contract);
 *   - `string`    → a concrete location.
 */
export type ProductFilterState = {
  stock?: ProductStockFilter;
  category?: string;
  location?: string | null;
};

/** The lifecycle a product belongs to, derived from its lifecycle stamps. */
export function productLifecycleOf(product: InventoryProductV2): ProductLifecycle {
  if (product.trashed_at) return 'trashed';
  if (product.archived_at) return 'archived';
  return 'active';
}

/** Does the product belong to the requested lifecycle? */
export function matchesProductLifecycle(
  product: InventoryProductV2,
  lifecycle: ProductLifecycle,
): boolean {
  return productLifecycleOf(product) === lifecycle;
}

/** Is any filter chip active? */
export function isProductFilterActive(filter: ProductFilterState): boolean {
  return filter.stock !== undefined || filter.category !== undefined || filter.location !== undefined;
}

/**
 * Does the product satisfy the filter chips?
 *
 * The semantics are EXACTLY the server semantics of `inventory_products_list`:
 *   - `out`  → `quantity <= 0`
 *   - `low`  → `quantity > 0 and quantity <= low_stock_threshold`
 * so the client never disagrees with the server about the same collection.
 */
export function matchesProductFilter(
  product: InventoryProductV2,
  filter: ProductFilterState,
): boolean {
  if (filter.stock === 'out' && !(product.quantity <= 0)) return false;
  if (filter.stock === 'low' && !(product.quantity > 0 && product.quantity <= product.low_stock_threshold)) {
    return false;
  }
  if (filter.category !== undefined && product.category_key !== filter.category) return false;
  if (filter.location !== undefined && product.location_id !== filter.location) return false;
  return true;
}

/** Does the product match the free-text query of the collection? */
export function matchesProductSearch(product: InventoryProductV2, search: string): boolean {
  const term = search.trim().toLocaleLowerCase('es');
  if (!term) return true;
  return product.name.toLocaleLowerCase('es').includes(term);
}

/**
 * Does the product belong to the ACTIVE collection (lifecycle + filters +
 * search)? Used to prune the selection when a realtime mutation moves a
 * product out of the collection.
 */
export function isProductInCollection(
  product: InventoryProductV2,
  input: { lifecycle: ProductLifecycle; filter: ProductFilterState; search: string },
): boolean {
  if (!matchesProductLifecycle(product, input.lifecycle)) return false;
  if (!matchesProductFilter(product, input.filter)) return false;
  if (!matchesProductSearch(product, input.search)) return false;
  return true;
}

/**
 * Build the server query of a collection.
 *
 * The search and the filters are an INTERSECTION: both are sent, and neither
 * erases the other.
 */
export function buildProductCollectionQuery(input: {
  lifecycle: ProductLifecycle;
  search?: string;
  filter?: ProductFilterState;
  limit?: number;
  cursor?: string | null;
}): ProductListQuery {
  const filter = input.filter ?? {};
  const search = input.search?.trim();
  return {
    lifecycle: input.lifecycle,
    search: search || undefined,
    stock_state: filter.stock,
    category: filter.category,
    location_id: filter.location === undefined ? undefined : filter.location === null ? 'none' : filter.location,
    limit: input.limit ?? 50,
    cursor: input.cursor ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

/**
 * The selection of a list surface.
 *
 * `mode: 'all'` is what makes "Todos" honest: it holds the COMPLETE id list of
 * the active collection, so the counter and the batch mutations see every real
 * result and not only the loaded page.
 */
export type ProductSelectionState = {
  mode: 'explicit' | 'all';
  /** Ids selected one by one (mode `explicit`). */
  ids: string[];
  /** EVERY id of the active collection (mode `all`). */
  allIds: string[];
  /** Ids deselected while in mode `all`. */
  excluded: string[];
};

export const emptyProductSelection = (): ProductSelectionState => ({
  mode: 'explicit',
  ids: [],
  allIds: [],
  excluded: [],
});

export const explicitProductSelection = (ids: string[]): ProductSelectionState => ({
  mode: 'explicit',
  ids: [...new Set(ids)],
  allIds: [],
  excluded: [],
});

export const allProductSelection = (allIds: string[]): ProductSelectionState => ({
  mode: 'all',
  ids: [],
  allIds: [...new Set(allIds)],
  excluded: [],
});

export function isProductSelected(selection: ProductSelectionState, id: string): boolean {
  return selection.mode === 'all'
    ? !selection.excluded.includes(id)
    : selection.ids.includes(id);
}

export function countProductSelection(selection: ProductSelectionState): number {
  return selection.mode === 'all'
    ? Math.max(0, selection.allIds.length - selection.excluded.length)
    : selection.ids.length;
}

/** The ids that are CURRENTLY selected, whatever the mode. */
export function selectedProductIds(selection: ProductSelectionState): string[] {
  if (selection.mode !== 'all') return selection.ids;
  return selection.allIds.filter((id) => !selection.excluded.includes(id));
}

/** Is EVERY result of the collection selected? */
export function isProductSelectionComplete(selection: ProductSelectionState): boolean {
  return selection.mode === 'all' && selection.excluded.length === 0 && selection.allIds.length > 0;
}

/** Toggle one product, keeping the selection semantics intact. */
export function toggleProductSelection(
  selection: ProductSelectionState,
  id: string,
): ProductSelectionState {
  if (selection.mode === 'all') {
    const excluded = selection.excluded.includes(id)
      ? selection.excluded.filter((value) => value !== id)
      : [...selection.excluded, id];
    return { ...selection, excluded };
  }
  const ids = selection.ids.includes(id)
    ? selection.ids.filter((value) => value !== id)
    : [...selection.ids, id];
  return { ...selection, ids };
}

/**
 * Remove the products that LEFT the collection.
 *
 * `isStillInCollection` answers only about products the client KNOWS: an
 * unknown product (not loaded yet) is never dropped, so a paginated selection
 * is not silently truncated.
 */
export function pruneProductSelection(
  selection: ProductSelectionState,
  isStillInCollection: (id: string) => boolean,
): ProductSelectionState {
  if (selection.mode === 'all') {
    const allIds = selection.allIds.filter(isStillInCollection);
    const excluded = selection.excluded.filter(isStillInCollection);
    return { ...selection, allIds, excluded };
  }
  return { ...selection, ids: selection.ids.filter(isStillInCollection) };
}

/**
 * Split an id list into batches the backend can commit one by one.
 *
 * The batch RPC has no item limit, but a single unbounded transaction over
 * hundreds of rows is not a safe default: the ids are committed in bounded
 * chunks so one conflict cannot lose the whole intent.
 */
export function chunkProductIds(ids: string[], size = 100): string[][] {
  const limit = Math.max(1, Math.floor(size));
  const chunks: string[][] = [];
  for (let index = 0; index < ids.length; index += limit) {
    chunks.push(ids.slice(index, index + limit));
  }
  return chunks;
}

// ---------------------------------------------------------------------------
// Shopping membership (derived from the shared state, never a local flag)
// ---------------------------------------------------------------------------

/** Is the product already a line of the active shopping list? */
export function isProductOnShoppingList(
  shopping: InventoryShoppingResponse | null | undefined,
  productId: string,
): boolean {
  if (!shopping) return false;
  return shopping.items.some((item) => item.inventory_item_id === productId);
}

/** The ids of the inventory products that are already on the shopping list. */
export function shoppingInventoryProductIds(
  shopping: InventoryShoppingResponse | null | undefined,
): string[] {
  if (!shopping) return [];
  const ids: string[] = [];
  shopping.items.forEach((item: InventoryShoppingItem) => {
    if (item.inventory_item_id && !ids.includes(item.inventory_item_id)) {
      ids.push(item.inventory_item_id);
    }
  });
  return ids;
}
