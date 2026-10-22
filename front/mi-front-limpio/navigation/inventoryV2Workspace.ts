/**
 * Canonical Inventory V2 workspace navigation.
 *
 * `InventoryWorkspace` is the ONLY conceptual root of Productos and Compras.
 * Every return to Inventory (purchase back, pause, cancel, purchase success)
 * goes through this helper, so the app never lands on a legacy standalone
 * surface again.
 *
 * Contract source:
 * `docs/implementation/inventory/v2/06_BLOCK1_BLOCK2_RUNTIME_RECONCILIATION.md` §2.
 */

export type InventoryWorkspaceTab = 'products' | 'shopping';

export const INVENTORY_WORKSPACE_ROUTE = 'InventoryWorkspace';

/**
 * The navigation state that makes the workspace the ONLY root of the stack.
 *
 * Pure on purpose: the compatibility redirects and the canonical returns build
 * the exact same state, so a legacy route can never produce a different
 * experience than the canonical one.
 */
export const inventoryWorkspaceState = (tab: InventoryWorkspaceTab) => ({
  index: 0,
  routes: [{ name: INVENTORY_WORKSPACE_ROUTE, params: { tab } }],
});

/**
 * Return to the canonical workspace, on the requested tab.
 *
 * When the workspace is already in the stack it is POPPED back to (the mounted
 * workspace keeps its state, so the shell never flickers and never duplicates).
 * When it is not (a deep link straight into a legacy route) the stack is reset
 * to the workspace.
 */
export const returnToInventoryWorkspace = (
  navigation: any,
  tab: InventoryWorkspaceTab,
): void => {
  if (!navigation) return;
  const routes: Array<{ name?: string }> = navigation?.getState?.()?.routes ?? [];
  const mounted = routes.some((route) => route?.name === INVENTORY_WORKSPACE_ROUTE);
  if (mounted && typeof navigation.popTo === 'function') {
    navigation.popTo(INVENTORY_WORKSPACE_ROUTE, { tab });
    return;
  }
  navigation.reset(inventoryWorkspaceState(tab));
};
