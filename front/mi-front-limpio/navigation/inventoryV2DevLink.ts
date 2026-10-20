/**
 * DEV-ONLY deep link contract for the Inventory V2 preview.
 *
 * The preview is a development surface. It must never be reachable in a
 * production build, so every artifact that exposes it is guarded by `__DEV__`
 * and the route itself is only registered by the More stack under `__DEV__`.
 *
 * Deterministic path (never a query param, never a console call):
 *
 *   http://localhost:8082/home/more/inventory-v2-preview
 *
 * The path is captured at module evaluation time, before React Navigation
 * rewrites the browser URL, so an authenticated user who opens the URL
 * directly lands on the preview and an unauthenticated user can still be
 * recovered after login.
 */

export const INVENTORY_V2_DEV_PREVIEW_PATH = '/home/more/inventory-v2-preview';

/**
 * Nested `MoreTab` screens of the root linking config. Only injected into the
 * linking config under `__DEV__`.
 *
 * The inner screens mirror the Inventory V2 stack routes so the browser URL
 * stays canonical: the preview root keeps `/home/more/inventory-v2-preview`
 * and every inner surface has its own deterministic segment.
 */
export const INVENTORY_V2_DEV_PREVIEW_MORE_SCREENS = {
  InventoryV2Preview: {
    path: 'inventory-v2-preview',
    screens: {
      ProductsHome: '',
      AllProducts: 'productos',
      Locations: 'lugares',
      LocationDetail: 'lugares/:locationId',
      ArchivedProducts: 'archivados',
      InventoryTrash: 'papelera',
      ShoppingHome: 'compras',
      Purchase: 'compra/:id',
      PurchaseSuccess: 'exito/:purchaseId',
      PurchaseHistory: 'historial',
      PurchaseDetail: 'detalle/:id',
    },
  },
};

/**
 * Minimal linking config able to resolve the DEV preview path into a
 * navigation state. It mirrors the root shape of the production linking
 * config (`HomeTabs` -> `MoreTab` -> `InventoryV2Preview`).
 */
export const INVENTORY_V2_DEV_PREVIEW_STATE_CONFIG = {
  screens: {
    HomeTabs: {
      path: 'home',
      screens: {
        MoreTab: {
          path: 'more',
          screens: { ...INVENTORY_V2_DEV_PREVIEW_MORE_SCREENS },
        },
      },
    },
  },
};

const normalizePath = (path: string | null | undefined): string => {
  if (!path) return '';
  const withoutQuery = path.split('?')[0].split('#')[0];
  if (withoutQuery.length <= 1) return withoutQuery;
  return withoutQuery.replace(/\/+$/, '');
};

export const isInventoryV2DevPreviewPath = (path: string | null | undefined): boolean => {
  const normalized = normalizePath(path);
  if (!normalized) return false;
  return (
    normalized === INVENTORY_V2_DEV_PREVIEW_PATH ||
    normalized.startsWith(`${INVENTORY_V2_DEV_PREVIEW_PATH}/`)
  );
};

/**
 * Reads the browser path once, at module evaluation time (before React
 * Navigation owns the URL). Returns the captured path only in development.
 */
export const captureInventoryV2DevPreviewPath = (): string | null => {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return null;
  if (typeof window === 'undefined') return null;
  const path = normalizePath(window.location?.pathname);
  return isInventoryV2DevPreviewPath(path) ? path : null;
};

/**
 * True when the navigation state already contains the DEV preview route.
 * Used to avoid re-applying a deep link that React Navigation already
 * resolved on its own.
 */
export const navigationStateContainsRoute = (
  state: { routes?: Array<{ name?: string; state?: unknown }> } | null | undefined,
  routeName: string,
): boolean => {
  if (!state || !Array.isArray(state.routes)) return false;
  return state.routes.some(
    (route) =>
      route?.name === routeName ||
      navigationStateContainsRoute(route?.state as never, routeName),
  );
};
