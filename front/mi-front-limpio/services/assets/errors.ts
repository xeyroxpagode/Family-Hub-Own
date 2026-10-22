/**
 * HOMePLUS Assets — F0 Foundation. Errores tipados y regla de retry.
 *
 * Regla crítica (Target §13): NUNCA generar una Idempotency-Key nueva
 * automáticamente tras timeout/5xx. La identidad del intento pertenece al
 * caller (intent.ts); ante outcome desconocido se conserva, se reconcilia
 * (releer) y sólo se hace replay con la MISMA clave según contrato.
 *
 * Clasificación de outcome ante un fallo:
 * - definitive: rechazo final (4xx salvo 409/429/408). No reintentar igual.
 * - stale_write: 409 de concurrencia. Releer, conservar draft, mostrar
 *   diferencia, nueva decisión del usuario. Nunca last-write-wins.
 * - transient_retryable: 408/429/5xx tipado como transitorio. Reintento
 *   seguro SÓLO con la misma Idempotency-Key del intento original.
 * - unknown_outcome: timeout, red caída, respuesta ilegible. El servidor
 *   pudo haber aplicado la escritura. Conservar identidad, reconciliar
 *   (GET), replay sólo con la misma clave y confirmación del contrato.
 * - forbidden: 401/403 o assets_forbidden. Gating + sesión, no retry ciego.
 */

import { ApiError } from '../api';

export type AssetsOutcomeKind =
  | 'definitive'
  | 'stale_write'
  | 'transient_retryable'
  | 'unknown_outcome'
  | 'forbidden';

export type AssetsFailure = {
  kind: AssetsOutcomeKind;
  /** Mensaje listo para UI (es-AR), sin tecnicismos. */
  message: string;
  /** Código canónico del backend (`assets_*`) o de transporte. */
  code: string | null;
  status: number | null;
  requestId: string | null;
  /** El draft del usuario DEBE conservarse en todos los kinds. */
  retryAllowed: boolean;
  /** Sólo true cuando el retry con la MISMA Idempotency-Key es seguro. */
  retryWithSameKeyAllowed: boolean;
  details: unknown;
};

const STALE_WRITE_CODES = new Set([
  'assets_conflict',
  'assets_stale_write',
  'assets_expected_updated_at_mismatch',
  'assets_record_correction_conflict',
  'assets_period_correction_conflict',
  'assets_care_correction_conflict',
  'assets_version_conflict',
]);

const BLOCKED_RESOLUTION_CODES = new Set([
  'assets_archive_blocked_dependents',
  'assets_trash_blocked_dependents',
  'assets_profile_change_dependents',
  'assets_property_dependents_block',
  'assets_record_restore_no_valid_asset',
  'assets_care_restore_owner_not_valid',
  'assets_placement_blocked',
]);

/**
 * S9 — the DEPENDENT blockers (O33).
 *
 * A lifecycle operation on a PROPERTY is blocked while other Assets of the
 * same Household are located in it. The backend answers a typed 409 with the
 * list of blocking dependents; these codes are the ones that carry it.
 */
export const ASSET_DEPENDENT_BLOCKER_CODES = new Set([
  'assets_archive_blocked_dependents',
  'assets_trash_blocked_dependents',
  'assets_profile_change_dependents',
]);

/** One blocking dependent, as the backend reports it. */
export type AssetDependent = {
  id: string;
  name: string | null;
  lifecycle_status: string | null;
  dependent_type: 'asset';
};

/** The typed payload of a dependent blocker. */
export type AssetDependentBlocker = {
  dependents: AssetDependent[];
  dependent_count: number;
  resolution_hint: string | null;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * True when the failure is a DEPENDENT blocker (the world must change
 * before the operation can succeed).
 *
 * This is decided by the CODE only: even if the payload is malformed the
 * retry still has to be a NEW decision.
 */
export const isAssetDependentBlocker = (
  failure: AssetsFailure | null | undefined,
): boolean => Boolean(failure?.code && ASSET_DEPENDENT_BLOCKER_CODES.has(failure.code));

/**
 * The typed review payload of a dependent blocker.
 *
 * Returns null when the failure is not a dependent blocker (or when the
 * payload carries no usable dependent). The projection NEVER invents a
 * dependent: a row without an id is dropped, because it cannot be opened.
 */
export const getAssetDependentBlocker = (
  failure: AssetsFailure | null | undefined,
): AssetDependentBlocker | null => {
  if (!isAssetDependentBlocker(failure)) return null;
  const details = isPlainObject(failure?.details) ? failure.details : null;
  const rawDependents = details && Array.isArray(details.dependents) ? details.dependents : [];
  const dependents: AssetDependent[] = rawDependents
    .filter(isPlainObject)
    .map((row) => ({
      id: typeof row.id === 'string' ? row.id : '',
      name: typeof row.name === 'string' ? row.name : null,
      lifecycle_status: typeof row.lifecycle_status === 'string' ? row.lifecycle_status : null,
      dependent_type: 'asset' as const,
    }))
    .filter((row) => row.id !== '');
  const dependentCount =
    details && typeof details.dependent_count === 'number'
      ? details.dependent_count
      : dependents.length;
  const resolutionHint =
    details && typeof details.resolution_hint === 'string' ? details.resolution_hint : null;
  return { dependents, dependent_count: dependentCount, resolution_hint: resolutionHint };
};

const isStaleWrite = (status: number | null, code: string | null): boolean => {
  if (status === 409) return true;
  if (status === 412) return true;
  return code !== null && STALE_WRITE_CODES.has(code);
};

const isForbidden = (status: number | null, code: string | null): boolean => {
  if (status === 401 || status === 403) return true;
  return code === 'assets_forbidden' || code === 'not_active_household_member';
};

const isTransient = (status: number | null, code: string | null): boolean => {
  if (status === 408 || status === 429) return true;
  if (status !== null && status >= 500 && status <= 599) return true;
  if (code === 'assets_transient' || code === 'assets_retryable') return true;
  return false;
};

export const toAssetsFailure = (error: unknown): AssetsFailure => {
  if (error instanceof ApiError) {
    const { status, code, requestId, details } = error;
    if (isForbidden(status, code)) {
      return {
        kind: 'forbidden',
        message: error.message,
        code,
        status,
        requestId,
        retryAllowed: false,
        retryWithSameKeyAllowed: false,
        details,
      };
    }
    if (isStaleWrite(status, code)) {
      return {
        kind: 'stale_write',
        message:
          code && BLOCKED_RESOLUTION_CODES.has(code)
            ? error.message
            : 'Esto cambió mientras lo editabas. Actualizá y volvé a intentarlo.',
        code,
        status,
        requestId,
        retryAllowed: true,
        retryWithSameKeyAllowed: false,
        details,
      };
    }
    if (isTransient(status, code)) {
      return {
        kind: 'transient_retryable',
        message: 'Hubo un problema temporal. Podés reintentar con seguridad.',
        code,
        status,
        requestId,
        retryAllowed: true,
        retryWithSameKeyAllowed: true,
        details,
      };
    }
    return {
      kind: 'definitive',
      message: error.message,
      code,
      status,
      requestId,
      retryAllowed: status === 429,
      retryWithSameKeyAllowed: false,
      details,
    };
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return {
      kind: 'unknown_outcome',
      message: 'La operación se canceló. Nada se perdió: tu borrador sigue acá.',
      code: 'aborted',
      status: null,
      requestId: null,
      retryAllowed: true,
      retryWithSameKeyAllowed: true,
      details: null,
    };
  }
  // Timeout, caída de red, JSON ilegible: el servidor PUDO haber aplicado
  // la escritura. Outcome desconocido → reconciliar antes de reintentar.
  return {
    kind: 'unknown_outcome',
    message:
      'No pudimos confirmar el resultado. Revisá la ficha antes de reintentar: es posible que ya se haya guardado.',
    code: 'unknown_outcome',
    status: null,
    requestId: null,
    retryAllowed: true,
    retryWithSameKeyAllowed: true,
    details: null,
  };
};

/** Mensaje de error contextual para formularios (draft siempre conservado). */
export const assetsErrorMessage = (error: unknown, fallback: string): string => {
  try {
    return toAssetsFailure(error).message;
  } catch {
    return fallback;
  }
};
