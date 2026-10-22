import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';

import { inventoryWorkspaceState } from '../../../navigation/inventoryV2Workspace';

/**
 * Compatibility redirects for the legacy standalone Inventory routes.
 *
 * `ProductsHome` and `ShoppingHome` used to render a second, parallel version
 * of the Products and Shopping surfaces (legacy header + legacy segmented
 * control). That duality is what made the pager disappear depending on HOW the
 * user entered Inventory: the deep link resolved to `ProductsHome` while the
 * `Más > Inventario V2` row resolved to `InventoryWorkspace`.
 *
 * The legacy route NAMES are kept (deep links and external callers may still
 * use them) but they no longer render any Inventory surface: they reset the
 * Inventory stack to the canonical workspace, which is the ONLY conceptual
 * root of Productos and Compras.
 *
 * Contract source:
 * `docs/implementation/inventory/v2/06_BLOCK1_BLOCK2_RUNTIME_RECONCILIATION.md` §2.
 */

/** Redirect to the canonical workspace, on the Products tab. */
export function InventoryProductsHomeCompatibility() {
  const navigation = useNavigation<any>();
  useEffect(() => {
    navigation.reset(inventoryWorkspaceState('products'));
  }, [navigation]);
  return null;
}

/** Redirect to the canonical workspace, on the Shopping tab. */
export function InventoryShoppingHomeCompatibility() {
  const navigation = useNavigation<any>();
  useEffect(() => {
    navigation.reset(inventoryWorkspaceState('shopping'));
  }, [navigation]);
  return null;
}
