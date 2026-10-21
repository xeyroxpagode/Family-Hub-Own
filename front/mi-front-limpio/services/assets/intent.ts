/**
 * HOMePLUS Assets — F0 Foundation. Identidad de intento de mutación.
 *
 * La identidad (mutationId + Idempotency-Key) se crea UNA vez por intención
 * del usuario y viaja estable a través de todos los reintentos del MISMO
 * intento. El cliente (client.ts) nunca genera ni regenera claves: sólo las
 * transporta. Regenerar una clave tras timeout/5xx duplicaría creaciones,
 * renovaciones y Cares (Target §13).
 */

import { createIdempotencyKey as createGlobalIdempotencyKey } from '../idempotency';
import { generateMutationId } from '../api';

export type AssetsMutationIntent = {
  readonly mutationId: string;
  readonly idempotencyKey: string;
};

export type AssetsIntentOptions = {
  mutationId?: string;
  /** Reutilizar la clave de un intento previo (retry / reconciliación). */
  idempotencyKey?: string;
};

/**
 * Crea la identidad de un NUEVO intento (create / archive / trash / renew…).
 * Para reintentar un intento existente, pasar su idempotencyKey.
 */
export const createAssetsIntent = (
  operation: string,
  options?: AssetsIntentOptions,
): AssetsMutationIntent => ({
  mutationId: options?.mutationId ?? generateMutationId(),
  idempotencyKey: options?.idempotencyKey ?? createGlobalIdempotencyKey(`assets.${operation}`),
});

/** Intento para escrituras versionadas (llevan además expected_updated_at en body/header). */
export const createAssetsVersionedIntent = (
  operation: string,
  options?: AssetsIntentOptions,
): AssetsMutationIntent => createAssetsIntent(operation, options);
