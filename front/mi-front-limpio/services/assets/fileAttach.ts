/**
 * HOMePLUS Assets — S8-09: O36 partial success (File attach) state machine.
 *
 * Authority: S6 INTEGRATION FREEZE (O36).
 *
 * ROOT RULE (frozen): **THE CORE NEVER ROLLS BACK BECAUSE THE FILE FAILED.**
 *
 * A Record created successfully with a failed File upload STAYS created. A
 * Care created successfully with a failed link STAYS created. An Asset Core
 * update with a failed attach STAYS updated. There is no distributed
 * transaction and there never will be one.
 *
 * WHERE THE TRUTH LIVES
 * --------------------
 * There is NO attachment-job table. The durable truth is exactly two things:
 *   1. the HomeCloud DURABLE upload job (homecloudUploadJobStorage), and
 *   2. the presence/absence of the Assets relation row.
 * A second durable truth is never invented.
 *
 * IDENTITY (frozen)
 * -----------------
 * One user intent has ONE identity:
 *   - `idempotencyKey`  -> the Assets Idempotency-Key of the link operation.
 *   - `intakeRequestId` -> 'intake_assets_attach_' + that key, so HomeCloud's
 *                          register step is idempotent for the same intent and
 *                          resolves to the SAME contentId.
 * A retry of the SAME intent reuses both, so it NEVER registers a second File.
 * A NEW deliberate attach uses a NEW key (and therefore a new contentId).
 *
 * RECONCILIATION (frozen)
 * -----------------------
 * An unknown outcome is NEVER resolved by uploading again. It is reconciled
 * BY contentId: the File is read first, and only the missing step is performed.
 * Never by filename. Never by hash. Never a duplicate blob.
 */

import { OPERATION_KINDS, requestJson } from '../api';
import { createAssetsIntent } from './intent';
import { toAssetsFailure, type AssetsFailure } from './errors';
import {
  invalidateAssetFiles,
  linkAssetFile,
  listAssetFiles,
  type AssetFileOwnerType,
  type AssetFileRelation,
  type LinkAssetFileResponse,
} from './assetsFiles';
import type { UploadJobState } from '../homecloud/homecloudUploadTypes';

// ── O36 state machine ─────────────────────────────────────────────────────────

/**
 * The frozen O36 File-attach phases.
 *
 * CORE_DONE is the Assets Core fact (the Record/Care/Asset already exists).
 * The File phases describe ONLY the File side of the operation.
 */
export type AssetsFileAttachPhase =
  | 'CORE_DONE'
  | 'FILE_INTENT_OPEN'
  | 'FILE_UPLOADING'
  | 'FILE_CREATED'
  | 'FILE_LINKED'
  | 'FILE_FAILED_RETRYABLE'
  | 'FILE_FAILED_TERMINAL'
  | 'FILE_UNKNOWN'
  | 'FILE_ABANDONED';

/**
 * The frozen transition table.
 *
 * CORE_DONE never rolls back: there is no transition OUT of the Core fact.
 */
export const ASSETS_FILE_ATTACH_TRANSITIONS: Readonly<
  Record<AssetsFileAttachPhase, readonly AssetsFileAttachPhase[]>
> = Object.freeze({
  CORE_DONE: Object.freeze(['FILE_INTENT_OPEN'] as const),
  FILE_INTENT_OPEN: Object.freeze(['FILE_UPLOADING', 'FILE_ABANDONED'] as const),
  FILE_UPLOADING: Object.freeze([
    'FILE_CREATED',
    'FILE_FAILED_RETRYABLE',
    'FILE_FAILED_TERMINAL',
    'FILE_UNKNOWN',
    'FILE_ABANDONED',
  ] as const),
  FILE_CREATED: Object.freeze([
    'FILE_LINKED',
    'FILE_FAILED_RETRYABLE',
    'FILE_FAILED_TERMINAL',
    'FILE_UNKNOWN',
    'FILE_ABANDONED',
  ] as const),
  FILE_LINKED: Object.freeze([] as const),
  FILE_FAILED_RETRYABLE: Object.freeze([
    'FILE_UPLOADING',
    'FILE_LINKED',
    'FILE_UNKNOWN',
    'FILE_ABANDONED',
  ] as const),
  FILE_FAILED_TERMINAL: Object.freeze(['FILE_ABANDONED'] as const),
  FILE_UNKNOWN: Object.freeze(['FILE_LINKED', 'FILE_UPLOADING', 'FILE_ABANDONED'] as const),
  FILE_ABANDONED: Object.freeze([] as const),
});

/** True when `to` is a legal successor of `from`. */
export function canTransitionAssetsFileAttach(
  from: AssetsFileAttachPhase,
  to: AssetsFileAttachPhase,
): boolean {
  if (from === to) return true;
  return ASSETS_FILE_ATTACH_TRANSITIONS[from].includes(to);
}

/** What the surface observed about the File operation. */
export type AssetsFileAttachObservation = {
  /** The durable HomeCloud upload job state (null when no job exists yet). */
  jobState: UploadJobState | null;
  /** The HomeCloud content id, when it is known. */
  contentId: string | null;
  /** Whether the ACTIVE Assets relation for (owner, file) exists. */
  relationPresent: boolean;
  /** The last failure, when the last attempt failed. */
  failure?: AssetsFailure | null;
};

/**
 * Derive the O36 phase from what is OBSERVABLE.
 *
 * The relation is the strongest fact: if it exists, the operation is done.
 * Otherwise the durable HomeCloud job and the known content id decide.
 */
export function deriveAssetsFileAttachPhase(
  observation: AssetsFileAttachObservation,
): AssetsFileAttachPhase {
  if (observation.relationPresent) return 'FILE_LINKED';

  const failure = observation.failure ?? null;
  if (failure && failure.kind === 'unknown_outcome') return 'FILE_UNKNOWN';

  switch (observation.jobState) {
    case 'completed':
      return observation.contentId ? 'FILE_CREATED' : 'FILE_UNKNOWN';
    case 'failed':
      return failure?.retryAllowed ? 'FILE_FAILED_RETRYABLE' : 'FILE_FAILED_TERMINAL';
    case 'cancelled':
      return 'FILE_ABANDONED';
    case 'pending':
    case 'registering':
    case 'registered':
    case 'uploading':
    case 'verifying':
    case 'finalizing':
      return 'FILE_UPLOADING';
    default:
      break;
  }

  if (observation.contentId) return 'FILE_CREATED';
  return 'FILE_INTENT_OPEN';
}

// ── Identity ──────────────────────────────────────────────────────────────────

/** The prefix of the HomeCloud intake identity owned by an Assets attach. */
export const ASSETS_FILE_ATTACH_INTAKE_PREFIX = 'intake_assets_attach_';

/**
 * The HomeCloud intake identity of an Assets attach intent.
 *
 * It is DERIVED from the Assets Idempotency-Key, so the same user intent
 * always resolves to the same contentId and a retry never registers a second
 * File.
 */
export function deriveAssetsFileIntakeRequestId(idempotencyKey: string): string {
  return `${ASSETS_FILE_ATTACH_INTAKE_PREFIX}${idempotencyKey}`;
}

/** The ONE identity of a File-attach user intent. */
export type AssetsFileAttachIntent = {
  /** The Assets Idempotency-Key of the link operation. */
  readonly idempotencyKey: string;
  readonly mutationId: string;
  /** 'intake_assets_attach_' + idempotencyKey. */
  readonly intakeRequestId: string;
};

/** Create the identity of a NEW attach intent. */
export function createAssetsFileAttachIntent(
  options?: { idempotencyKey?: string; mutationId?: string },
): AssetsFileAttachIntent {
  const base = createAssetsIntent('file.link', {
    idempotencyKey: options?.idempotencyKey,
    mutationId: options?.mutationId,
  });
  return {
    idempotencyKey: base.idempotencyKey,
    mutationId: base.mutationId,
    intakeRequestId: deriveAssetsFileIntakeRequestId(base.idempotencyKey),
  };
}

/** Rebuild the identity of a PREVIOUS intent (retry / reconciliation). */
export function restoreAssetsFileAttachIntent(
  idempotencyKey: string,
  mutationId: string,
): AssetsFileAttachIntent {
  return {
    idempotencyKey,
    mutationId,
    intakeRequestId: deriveAssetsFileIntakeRequestId(idempotencyKey),
  };
}

// ── Owner ─────────────────────────────────────────────────────────────────────

export type AssetsFileAttachOwner = {
  readonly ownerType: AssetFileOwnerType;
  readonly ownerId: string;
};

// ── Outcomes ──────────────────────────────────────────────────────────────────

export type AssetsFileAttachOutcome =
  | { readonly status: 'linked'; readonly relation: AssetFileRelation; readonly duplicate: boolean }
  | { readonly status: 'failed'; readonly phase: AssetsFileAttachPhase; readonly failure: AssetsFailure }
  | { readonly status: 'unknown'; readonly phase: 'FILE_UNKNOWN'; readonly failure: AssetsFailure };

// ── Operations ────────────────────────────────────────────────────────────────

/**
 * Attach an EXISTING HomeCloud File to an owner.
 *
 * This performs ONLY the Assets side (the link). It never touches HomeCloud.
 */
export async function attachExistingHomeCloudFile(params: {
  accessToken: string;
  householdId: string;
  owner: AssetsFileAttachOwner;
  fileId: string;
  intent: AssetsFileAttachIntent;
}): Promise<AssetsFileAttachOutcome> {
  const { accessToken, householdId, owner, fileId, intent } = params;
  try {
    const response: LinkAssetFileResponse = await linkAssetFile(
      accessToken,
      { owner_type: owner.ownerType, owner_id: owner.ownerId, file_id: fileId },
      { intent: { mutationId: intent.mutationId, idempotencyKey: intent.idempotencyKey } },
    );
    invalidateAssetFiles({ householdId }, owner.ownerType, owner.ownerId);
    return { status: 'linked', relation: response.relation, duplicate: response.duplicate };
  } catch (error) {
    const failure = toAssetsFailure(error);
    const phase: AssetsFileAttachPhase =
      failure.kind === 'unknown_outcome'
        ? 'FILE_UNKNOWN'
        : failure.retryAllowed
          ? 'FILE_FAILED_RETRYABLE'
          : 'FILE_FAILED_TERMINAL';
    return failure.kind === 'unknown_outcome'
      ? { status: 'unknown', phase: 'FILE_UNKNOWN', failure }
      : { status: 'failed', phase, failure };
  }
}

/**
 * The state of the File in HomeCloud, as seen through the canonical path.
 *
 *   'active'     -> the File is ACTIVE and can be linked.
 *   'staging'    -> the binary is there but the File is not finalized yet.
 *   'incomplete' -> the File exists but its binary is missing.
 *   'missing'    -> there is no File with that id.
 */
export type HomeCloudContentReconciliation = 'active' | 'staging' | 'incomplete' | 'missing';

/**
 * Reconcile the state of a File BY CONTENT ID.
 *
 * NEVER by filename. NEVER by hash. It reads the canonical HomeCloud paths
 * (GET /content/:id and the idempotent verify) so an interrupted upload is
 * recognised instead of being uploaded again.
 */
export async function reconcileHomeCloudContentState(
  accessToken: string,
  contentId: string,
): Promise<HomeCloudContentReconciliation> {
  try {
    await requestJson<{ content: { id: string } }>(`/api/homecloud/content/${contentId}`, {
      accessToken,
      operationKind: OPERATION_KINDS.READ_ONLY,
    });
    return 'active';
  } catch (error) {
    const status = (error as { status?: number } | null)?.status;
    if (status !== 404) throw error;
  }

  try {
    const verified = await requestJson<{ verified: boolean }>(
      `/api/homecloud/content/${contentId}/verify`,
      {
        accessToken,
        method: 'POST',
        operationKind: OPERATION_KINDS.NON_VERSIONED_MUTATION,
      },
    );
    return verified?.verified === true ? 'staging' : 'incomplete';
  } catch (error) {
    const status = (error as { status?: number } | null)?.status;
    if (status === 404) return 'missing';
    throw error;
  }
}

/**
 * Reconcile an attach whose outcome is UNKNOWN.
 *
 * The order is frozen:
 *   1. reconcile the File BY contentId (never upload again),
 *   2. if the File is ACTIVE, check the Assets relation,
 *   3. if the relation is missing, link with the SAME key,
 *   4. if the relation already exists, the operation already succeeded.
 *
 * The Core is never touched here.
 */
export async function reconcileAssetsFileAttach(params: {
  accessToken: string;
  householdId: string;
  owner: AssetsFileAttachOwner;
  intent: AssetsFileAttachIntent;
  contentId: string | null;
}): Promise<AssetsFileAttachOutcome> {
  const { accessToken, householdId, owner, intent, contentId } = params;

  if (!contentId) {
    // Nothing to reconcile by: the File was never registered. The upload step
    // must be resumed with the SAME identity.
    return {
      status: 'failed',
      phase: 'FILE_UPLOADING',
      failure: {
        kind: 'unknown_outcome',
        message:
          'No pudimos confirmar si el archivo quedó adjunto. Revisá antes de reintentar: es posible que ya esté.',
        code: 'unknown_outcome',
        status: null,
        requestId: null,
        retryAllowed: true,
        retryWithSameKeyAllowed: true,
        details: null,
      },
    };
  }

  const state = await reconcileHomeCloudContentState(accessToken, contentId);

  if (state === 'missing') {
    return {
      status: 'failed',
      phase: 'FILE_FAILED_TERMINAL',
      failure: {
        kind: 'definitive',
        message: 'No pudimos adjuntar el archivo.',
        code: 'homecloud_content_not_found',
        status: 404,
        requestId: null,
        retryAllowed: false,
        retryWithSameKeyAllowed: false,
        details: null,
      },
    };
  }

  if (state !== 'active') {
    // The File is not linkable yet: the upload must be resumed with the SAME
    // contentId. No new File is ever registered.
    return {
      status: 'failed',
      phase: 'FILE_UPLOADING',
      failure: {
        kind: 'unknown_outcome',
        message:
          'No pudimos confirmar si el archivo quedó adjunto. Revisá antes de reintentar: es posible que ya esté.',
        code: 'unknown_outcome',
        status: null,
        requestId: null,
        retryAllowed: true,
        retryWithSameKeyAllowed: true,
        details: null,
      },
    };
  }

  // The File is ACTIVE: does the relation already exist?
  const existing = await findAssetFileRelation(params.accessToken, owner, contentId);
  if (existing) {
    invalidateAssetFiles({ householdId }, owner.ownerType, owner.ownerId);
    return { status: 'linked', relation: existing, duplicate: true };
  }

  return attachExistingHomeCloudFile({
    accessToken: params.accessToken,
    householdId,
    owner,
    fileId: contentId,
    intent,
  });
}

/** Find the ACTIVE relation of (owner, fileId), if any. */
export async function findAssetFileRelation(
  accessToken: string,
  owner: AssetsFileAttachOwner,
  fileId: string,
): Promise<AssetFileRelation | null> {
  const response = await listAssetFiles(accessToken, owner.ownerType, owner.ownerId);
  return (response.files ?? []).find((file) => file.file_id === fileId) ?? null;
}

// ── Error copy (frozen) ───────────────────────────────────────────────────────

export type AssetsFileAttachErrorKind =
  | 'transient_retryable'
  | 'unknown_outcome'
  | 'too_large'
  | 'forbidden_homecloud'
  | 'validation'
  | 'definitive';

export type AssetsFileAttachErrorCopy = {
  readonly message: string;
  /** 'retry' retries ONLY the File step; 'reconcile' reconciles first. */
  readonly action: 'retry' | 'reconcile' | 'none';
  readonly dismissLabel: string;
};

/** The frozen O36 ErrorBar copy. */
export function assetsFileAttachErrorCopy(
  kind: AssetsFileAttachErrorKind,
): AssetsFileAttachErrorCopy {
  switch (kind) {
    case 'transient_retryable':
      return {
        message: 'No pudimos adjuntar el archivo. Podés reintentar con seguridad.',
        action: 'retry',
        dismissLabel: 'Descartar archivo',
      };
    case 'unknown_outcome':
      return {
        message:
          'No pudimos confirmar si el archivo quedó adjunto. Revisá antes de reintentar: es posible que ya esté.',
        action: 'reconcile',
        dismissLabel: 'Descartar archivo',
      };
    case 'too_large':
      return {
        message: 'El archivo supera el tamaño máximo permitido.',
        action: 'none',
        dismissLabel: 'Descartar archivo',
      };
    case 'forbidden_homecloud':
      return {
        message: 'No tenés permiso para guardar archivos en HomeCloud.',
        action: 'none',
        dismissLabel: 'Descartar archivo',
      };
    case 'validation':
      return {
        message: 'No pudimos preparar el archivo para subirlo.',
        action: 'none',
        dismissLabel: 'Descartar archivo',
      };
    default:
      return {
        message: 'No pudimos adjuntar el archivo.',
        action: 'none',
        dismissLabel: 'Descartar archivo',
      };
  }
}

/** Classify a failure into the frozen O36 error kinds. */
export function classifyAssetsFileAttachFailure(failure: AssetsFailure): AssetsFileAttachErrorKind {
  if (failure.status === 413 || failure.code === 'file_too_large') return 'too_large';
  if (failure.status === 403) return 'forbidden_homecloud';
  if (failure.status === 400) return 'validation';
  if (failure.kind === 'unknown_outcome') return 'unknown_outcome';
  if (failure.kind === 'transient_retryable' || failure.retryAllowed) return 'transient_retryable';
  return 'definitive';
}

// ── Size pre-check ────────────────────────────────────────────────────────────

/**
 * The maximum upload size, when the installation publishes it.
 *
 * The BACKEND is always the authority (it answers 413 file_too_large at
 * register). This pre-check only avoids starting a transfer that is known to
 * be rejected.
 */
export function getHomeCloudMaxUploadBytes(): number | null {
  const raw = process.env.EXPO_PUBLIC_HOMECLOUD_MAX_UPLOAD_BYTES;
  if (typeof raw !== 'string' || !/^\d+$/.test(raw.trim())) return null;
  const value = Number(raw.trim());
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

/** True when the artifact is known to be too large to upload. */
export function isHomeCloudFileTooLarge(sizeBytes: number): boolean {
  const limit = getHomeCloudMaxUploadBytes();
  if (limit === null) return false;
  return sizeBytes > limit;
}
