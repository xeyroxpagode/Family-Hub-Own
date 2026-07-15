export type CapabilityProjection<TCapability extends string> = Record<TCapability, boolean>;

export function hasCapability<TCapability extends string>(
  projection: Partial<CapabilityProjection<TCapability>> | null | undefined,
  capability: TCapability,
): boolean {
  return projection?.[capability] === true;
}

export function hasAllCapabilities<TCapability extends string>(
  projection: Partial<CapabilityProjection<TCapability>> | null | undefined,
  capabilities: readonly TCapability[],
): boolean {
  return capabilities.every((capability) => hasCapability(projection, capability));
}

export function hasAnyCapability<TCapability extends string>(
  projection: Partial<CapabilityProjection<TCapability>> | null | undefined,
  capabilities: readonly TCapability[],
): boolean {
  return capabilities.some((capability) => hasCapability(projection, capability));
}
