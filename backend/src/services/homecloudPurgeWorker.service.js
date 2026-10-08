'use strict';

/**
 * HomeCloud Files — LIFECYCLE V1 durable PURGE WORKER.
 *
 * Consumes homecloud_purge_operations rows using the same claim/lease shape
 * as the canonical outbox worker of this backend:
 *
 *   claim (FOR UPDATE SKIP LOCKED + lease) -> process -> complete | fail
 *
 * Processing one operation is FOUR idempotent steps, and NO step ever holds a
 * PostgreSQL transaction open across a remote call:
 *
 *   1. OWNERSHIP RE-PARSE. The snapshot paths must parse back to THIS
 *      operation's own household + content. A corrupted snapshot is a
 *      PERMANENT refusal that deletes nothing: the worker must never touch a
 *      path belonging to some other content, whatever a bad row says.
 *   2. PHYSICAL BYTE REMOVAL through the OFFICIAL Supabase Storage API
 *      (service role). Never SQL against storage.objects. An already-absent
 *      object is success, so a retry after an ambiguous network failure is
 *      always safe. After remove, the absence is VERIFIED with a list of the
 *      object's own folder: physical removal is proven, not assumed.
 *   3. CONTENT ROW DELETION (homecloud_contents by id). Cascades clean the
 *      Favorites and album memberships of the purged row. Idempotent: a row
 *      already deleted by a crashed previous attempt is success.
 *   4. COMPLETE the operation through the lease-owner CAS, so a crashed
 *      worker's late completion is refused by the database.
 *
 * Any failure is classified by the purge retry policy: retriable failures go
 * back to pending with exponential backoff; bounded attempts and the one
 * permanent class end in the durable `failed` state, which survives for
 * inspection and manual retry tooling.
 */
const crypto = require('node:crypto');
const { parseHomeCloudPath } = require('../lib/homecloudStoragePaths');
const { computePurgeRetryDecision } = require('../lib/homecloudPurgeRetryPolicy');

const DEFAULT_LEASE_SECONDS = 120;
const DEFAULT_BATCH_SIZE = 10;

function sanitizeErrorCode(error) {
  const candidate = typeof error?.code === 'string' ? error.code.trim().toLowerCase() : 'purge_failed';
  const normalized = candidate.replace(/[^a-z0-9_]/g, '_').slice(0, 128);
  return /^[a-z]/.test(normalized) ? normalized : `error_${normalized || 'unknown'}`;
}

/**
 * Decision E guard: the snapshot path must re-parse to this operation's own
 * household + content. The path contract is {household_id}/{content_id}/{variant},
 * so this can only fail on a corrupted snapshot - and the refusal must delete
 * nothing rather than guess.
 */
function assertSnapshotOwnsPath(operation, variant) {
  const bucket = variant === 'original' ? operation.original_bucket : operation.preview_bucket;
  const storagePath = variant === 'original' ? operation.original_path : operation.preview_path;
  const parsed = parseHomeCloudPath(storagePath);
  if (
    !parsed
    || parsed.householdId !== operation.household_id
    || parsed.contentId !== operation.content_id
    || parsed.variant !== variant
  ) {
    throw Object.assign(new Error(`purge snapshot path does not belong to operation (${variant})`), { code: 'purge_snapshot_invalid' });
  }
  if (!bucket || typeof bucket !== 'string') {
    throw Object.assign(new Error(`purge snapshot bucket missing (${variant})`), { code: 'purge_snapshot_invalid' });
  }
}

/**
 * Remove one object through the official Storage API and PROVE the removal.
 * `remove` of an already-absent object is not an error, so this whole step is
 * idempotent under retry. The verification is a list of the object's own
 * folder: the object name must be gone.
 */
async function removeAndVerifyBytes(client, bucket, storagePath) {
  const { error: removeError } = await client.storage.from(bucket).remove([storagePath]);
  if (removeError) {
    throw Object.assign(new Error(removeError.message), { code: 'storage_remove_failed' });
  }
  const folder = storagePath.split('/').slice(0, -1).join('/');
  const objectName = storagePath.split('/').pop();
  const { data: entries, error: listError } = await client.storage.from(bucket).list(folder, { limit: 100 });
  if (listError) {
    throw Object.assign(new Error(listError.message), { code: 'storage_verify_failed' });
  }
  const stillThere = (entries ?? []).some((entry) => entry?.name === objectName);
  if (stillThere) {
    throw Object.assign(new Error('object still present after removal'), { code: 'storage_verify_failed' });
  }
}

async function processClaimedPurgeOperation({ client, operation, workerId, now }) {
  try {
    assertSnapshotOwnsPath(operation, 'original');
    if (operation.preview_path) {
      assertSnapshotOwnsPath(operation, 'preview');
    }

    await removeAndVerifyBytes(client, operation.original_bucket, operation.original_path);
    if (operation.preview_path) {
      await removeAndVerifyBytes(client, operation.preview_bucket, operation.preview_path);
    }

    const { error: deleteError } = await client
      .from('homecloud_contents')
      .delete()
      .eq('id', operation.content_id);
    if (deleteError) {
      throw Object.assign(new Error(deleteError.message), { code: 'content_row_delete_failed' });
    }

    const { data: completed, error: completeError } = await client.rpc('homecloud_complete_purge_operation', {
      p_operation_id: operation.id,
      p_worker_id: workerId,
    });
    if (completeError) {
      throw Object.assign(new Error(completeError.message), { code: 'purge_complete_failed' });
    }
    if (completed !== true) {
      // The lease-owner CAS refused us: another worker owns the operation
      // (crash recovery reclaimed it). We must NOT fail it - the current
      // owner decides. The durable row is untouched and will finish.
      return Object.freeze({ id: operation.id, status: 'lease_lost' });
    }
    return Object.freeze({ id: operation.id, status: 'succeeded' });
  } catch (error) {
    const errorCode = sanitizeErrorCode(error);
    const decision = computePurgeRetryDecision({ operationId: operation.id, attempt: operation.attempts, errorCode, now });
    const { data: failed, error: failError } = await client.rpc('homecloud_fail_purge_operation', {
      p_operation_id: operation.id,
      p_worker_id: workerId,
      p_error_code: errorCode,
      p_failed_permanently: decision.failedPermanently,
      p_next_attempt_at: decision.nextAttemptAt ? decision.nextAttemptAt.toISOString() : null,
    });
    if (failError || failed !== true) {
      // The CAS refused the failure transition too: the lease was reclaimed
      // mid-processing. The current owner will decide; report and move on.
      return Object.freeze({ id: operation.id, status: 'fail_transition_lost', errorCode });
    }
    return Object.freeze({
      id: operation.id,
      status: decision.failedPermanently ? 'failed' : 'retry',
      errorCode,
    });
  }
}

async function processPurgeBatch(options = {}) {
  const client = options.client ?? require('../config/supabase').supabaseAdmin;
  if (!client) throw Object.assign(new Error('Supabase service role is required.'), { code: 'purge_admin_required' });
  const workerId = options.workerId ?? `purge-worker-${crypto.randomUUID()}`;
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const leaseSeconds = options.leaseSeconds ?? DEFAULT_LEASE_SECONDS;
  const now = options.now ?? new Date();

  const { data, error } = await client.rpc('homecloud_claim_purge_operations', {
    p_worker_id: workerId,
    p_batch_size: batchSize,
    p_lease_seconds: leaseSeconds,
  });
  if (error) throw Object.assign(new Error('Unable to claim purge operations.'), { code: 'purge_claim_failed', cause: error });

  const results = [];
  for (const operation of data ?? []) {
    results.push(await processClaimedPurgeOperation({ client, operation, workerId, now }));
  }
  return Object.freeze({
    workerId,
    claimed: data?.length ?? 0,
    results: Object.freeze(results),
  });
}

module.exports = {
  DEFAULT_BATCH_SIZE,
  DEFAULT_LEASE_SECONDS,
  processPurgeBatch,
  processClaimedPurgeOperation,
  removeAndVerifyBytes,
  assertSnapshotOwnsPath,
  sanitizeErrorCode,
};
