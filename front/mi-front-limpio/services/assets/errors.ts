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
  'assets_property_dependents_block',
  'assets_record_restore_no_valid_asset',
  'assets_care_restore_owner_not_valid',
  'assets_placement_blocked',
]);

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
