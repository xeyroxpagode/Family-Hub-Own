import { hasCapability, type CapabilityProjection } from './core/capabilities';

export const INVENTORY_CAPABILITIES = [
  'inventory.view', 'inventory.use', 'inventory.manage', 'inventory.destroy',
] as const;
export type InventoryCapability = typeof INVENTORY_CAPABILITIES[number];
export type InventoryCapabilities = CapabilityProjection<InventoryCapability>;
export const canInventory = (
  projection: Partial<InventoryCapabilities> | null | undefined,
  capability: InventoryCapability,
) => hasCapability(projection, capability);
