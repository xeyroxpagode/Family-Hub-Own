/**
 * HOMePLUS Assets — F0 Foundation. Barrel público del módulo.
 * Único punto de importación para UI: `import { … } from '../services/assets'`.
 */
export * from './types';
export * from './errors';
export * from './capabilities';
export {
  assetsKeys,
  classifyAssetsKey,
  assetsHouseholdOf,
} from './assetsKeys';
export type { AssetsHouseholdScope, AssetsKeyKind } from './assetsKeys';
export { assetsCache } from './assetsCache';
export type { AssetsMutation as AssetsCacheMutation } from './assetsCache';
export * from './intent';
export * from './client';
export * from './plannerItems';
export * from './motion';
export * from './assetsFiles';
export * from './fileAttach';
export { mutations } from './mutations';
export type { MutationOutcome } from './mutations';
