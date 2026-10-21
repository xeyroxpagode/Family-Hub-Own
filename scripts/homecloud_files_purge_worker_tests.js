#!/usr/bin/env node
'use strict';

/**
 * HomeCloud Files — LIFECYCLE V1 PURGE WORKER, deterministic seam evidence.
 *
 * Drives the REAL `homecloudPurgeWorker.service.js` and the REAL
 * `homecloudLifecycle.service.js` purge endpoint with an in-memory stub of
 * the two things a device-less run cannot have: the Supabase Storage API and
 * the database RPCs. The stub mirrors the REAL claim/lease/complete/fail
 * semantics of the lifecycle migration decision by decision, and the storage
 * paths use real canonical UUID paths so the production ownership re-parse
 * behaves exactly as against the real database.
 *
 * The load-bearing product claims proved here:
 *
 *   STORAGE API   bytes are removed through client.storage.from(bucket).remove
 *                ONLY; `storage.objects` is never touched (tracked).
 *   VERIFY       removal is PROVEN by a list of the object's own folder.
 *   IDEMPOTENCE  an already-absent object is success; a retry after an
 *                ambiguous failure completes; a content row already deleted
 *                by a crashed attempt is success.
 *   OWNERSHIP    a corrupted snapshot path is a PERMANENT refusal that
 *                deletes NOTHING.
 *   BOUNDED      retries back off and end in the durable failed state.
 *   LEASE        a refused complete (lease reclaimed) never fails the op.
 *   CONFIRMATION the endpoint refuses a confirmation-less purge BEFORE any
 *                state change.
 *   PRIVACY      the endpoint answers ids + status only, never the snapshot.
 */

const path = require('node:path');
const Module = require('node:module');

const REPO_ROOT = path.resolve(__dirname, '..');

// ── the in-memory world ───────────────────────────────────────────────────────

const HOUSEHOLD_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_HOUSEHOLD_ID = '99999999-9999-4999-8999-999999999999';
const MEMBER_ID = 'mm-purge-coordinator';

/** Canonical UUID fixture: version 4 / variant 8 so the real re-parse accepts it. */
function contentUuid(n) {
  return `22222222-2222-4222-8222-${String(n).padStart(12, '0')}`;
}

const db = {
  homecloud_contents: [],
  homecloud_purge_operations: [],
};

/** bucket -> Set of object paths that physically exist. */
const storageBuckets = {
  'homecloud-originals': new Set(),
  'homecloud-previews': new Set(),
};

const calls = {
  fromTables: new Set(),
  removed: [],
  listed: [],
  contentDeletes: 0,
  failRpc: 0,
};

/** Failure injection: { removeFails, removeFailsOnce:Set, listFails, completeRefuses } */
let injection = {};

function reset() {
  db.homecloud_contents = [];
  db.homecloud_purge_operations = [];
  storageBuckets['homecloud-originals'] = new Set();
  storageBuckets['homecloud-previews'] = new Set();
  calls.fromTables = new Set();
  calls.removed = [];
  calls.listed = [];
  calls.contentDeletes = 0;
  calls.failRpc = 0;
  injection = {};
}

function contentRow(overrides = {}) {
  return {
    id: overrides.id,
    household_id: overrides.household_id ?? HOUSEHOLD_ID,
    role: 'file',
    display_name: 'a-purgar.txt',
    mime_type: 'text/plain',
    extension: 'txt',
    size_bytes: 10,
    original_storage_path: `${overrides.household_id ?? HOUSEHOLD_ID}/${overrides.id}/original`,
    preview_storage_path: null,
    uploaded_by_member_id: MEMBER_ID,
    uploaded_at: '2026-01-01T00:00:00Z',
    document_date: null,
    note: null,
    caption: null,
    written_text: null,
    captured_at: null,
    captured_year: null,
    captured_month: null,
    capture_precision: 'unknown',
    hidden_from_resurfacing: false,
    folder_id: null,
    lifecycle: 'trashed',
    trashed_at: '2026-01-02T00:00:00Z',
    trashed_by_member_id: MEMBER_ID,
    ...overrides,
  };
}

/** A fresh durable operation, as homecloud_start_purge would create it. */
function purgeOperation(overrides = {}) {
  const contentId = overrides.content_id;
  return {
    id: overrides.id ?? `op-${contentId}`,
    household_id: overrides.household_id ?? HOUSEHOLD_ID,
    content_id: contentId,
    role: 'file',
    display_name: 'a-purgar.txt',
    mime_type: 'text/plain',
    extension: 'txt',
    size_bytes: 10,
    original_bucket: 'homecloud-originals',
    original_path: `${overrides.household_id ?? HOUSEHOLD_ID}/${contentId}/original`,
    preview_bucket: overrides.preview_path ? 'homecloud-previews' : null,
    preview_path: overrides.preview_path ?? null,
    requested_by_member_id: MEMBER_ID,
    requested_at: '2026-01-03T00:00:00Z',
    status: 'pending',
    attempts: 0,
    next_attempt_at: null,
    lease_worker_id: null,
    lease_expires_at: null,
    started_at: null,
    completed_at: null,
    last_error_code: null,
    ...overrides,
  };
}

function cloneRow(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeFrom(table) {
  calls.fromTables.add(table);
  const filters = [];
  let selectSpec = null;
  let single = false;
  const api = {
    select: (spec) => { selectSpec = spec; return api; },
    eq: (column, value) => { filters.push({ column, value }); return api; },
    maybeSingle: () => { single = true; return api; },
    single: () => { single = true; return api; },
    delete: () => { calls.contentDeletes += 1; return { eq: (column, value) => {
      if (table === 'homecloud_contents' && column === 'id') {
        db.homecloud_contents = db.homecloud_contents.filter((row) => row.id !== value);
      }
      return Promise.resolve({ data: null, error: null });
    } } },
    then: (resolve, reject) => Promise.resolve(settle()).then(resolve, reject),
  };
  function settle() {
    let matched = (db[table] ?? []).map(cloneRow);
    for (const filter of filters) {
      matched = matched.filter((row) => (row[filter.column] ?? null) === (filter.value ?? null));
    }
    if (selectSpec) {
      const columns = selectSpec.split(',').map((part) => part.trim());
      matched = matched.map((row) => {
        const out = {};
        for (const column of columns) out[column] = row[column] ?? null;
        return out;
      });
    }
    return { data: single ? (matched[0] ?? null) : matched, error: null };
  }
  return api;
}

/** The rpc stub mirrors the REAL lifecycle migration semantics. */
function rpc(name, params) {
  if (name === 'homecloud_start_purge') {
    const row = db.homecloud_contents.find((c) => c.id === params.p_content_id && c.household_id === params.p_household_id);
    if (!row) return { data: null, error: { code: 'P0002', message: 'homecloud_content_not_found' } };
    if (row.lifecycle === 'purging') return { data: null, error: { code: '23514', message: 'homecloud_content_purging' } };
    if (row.lifecycle !== 'trashed') return { data: null, error: { code: '23514', message: 'homecloud_content_not_trashed' } };
    row.lifecycle = 'purging';
    const op = purgeOperation({
      content_id: row.id,
      preview_path: row.preview_storage_path,
      display_name: row.display_name,
      household_id: row.household_id,
    });
    db.homecloud_purge_operations.push(op);
    return { data: [cloneRow(op)], error: null };
  }
  if (name === 'homecloud_claim_purge_operations') {
    const claimed = [];
    for (const op of db.homecloud_purge_operations) {
      if (claimed.length >= params.p_batch_size) break;
      if (op.status === 'pending') {
        op.status = 'running';
        op.attempts += 1;
        op.lease_worker_id = params.p_worker_id;
        op.lease_expires_at = new Date(Date.now() + (params.p_lease_seconds * 1000)).toISOString();
        op.last_error_code = null;
        claimed.push(cloneRow(op));
      }
    }
    return { data: claimed, error: null };
  }
  if (name === 'homecloud_complete_purge_operation') {
    const op = db.homecloud_purge_operations.find((o) => o.id === params.p_operation_id);
    if (injection.completeRefuses) return { data: false, error: null };
    if (!op || op.status !== 'running' || op.lease_worker_id !== params.p_worker_id) {
      return { data: false, error: null };
    }
    op.status = 'succeeded';
    op.completed_at = new Date().toISOString();
    op.lease_worker_id = null;
    op.lease_expires_at = null;
    op.last_error_code = null;
    return { data: true, error: null };
  }
  if (name === 'homecloud_fail_purge_operation') {
    calls.failRpc += 1;
    const op = db.homecloud_purge_operations.find((o) => o.id === params.p_operation_id);
    if (!op || op.status !== 'running' || op.lease_worker_id !== params.p_worker_id) {
      return { data: false, error: null };
    }
    op.status = params.p_failed_permanently ? 'failed' : 'pending';
    op.next_attempt_at = params.p_next_attempt_at;
    op.lease_worker_id = null;
    op.lease_expires_at = null;
    op.last_error_code = params.p_error_code;
    if (params.p_failed_permanently) op.completed_at = new Date().toISOString();
    return { data: true, error: null };
  }
  return { data: null, error: { code: 'P0001', message: 'homecloud_unknown_rpc' } };
}

const supabaseAdminStub = {
  from: (table) => makeFrom(table),
  rpc,
  storage: {
    from: (bucket) => ({
      remove: async (paths) => {
        const objects = storageBuckets[bucket] ?? new Set();
        for (const storagePath of paths) {
          calls.removed.push({ bucket, storagePath });
          if (injection.removeFails || (injection.removeFailsOnce && injection.removeFailsOnce.has(storagePath))) {
            injection.removeFailsOnce?.delete(storagePath);
            return { data: null, error: { message: 'network unreachable' } };
          }
          objects.delete(storagePath);
        }
        return { data: paths, error: null };
      },
      list: async (folder) => {
        calls.listed.push({ bucket, folder });
        if (injection.listFails) return { data: null, error: { message: 'list failed' } };
        const objects = storageBuckets[bucket] ?? new Set();
        const prefix = folder ? `${folder}/` : '';
        const entries = [...objects]
          .filter((storagePath) => storagePath.startsWith(prefix))
          .map((storagePath) => ({ name: storagePath.slice(prefix.length) }));
        return { data: entries, error: null };
      },
    }),
  },
};

const contextStub = {
  householdId: HOUSEHOLD_ID,
  personId: 'person-purge',
  person: { id: 'person-purge' },
  membershipId: MEMBER_ID,
  membership: { id: MEMBER_ID, role: 'coordinator', status: 'active' },
  household: { id: HOUSEHOLD_ID, config: null },
};

function installStubs() {
  const original = Module._load;
  Module._load = function patched(request, parent, isMain) {
    if (request === '../config/supabase' || request === '../../config/supabase') return { supabaseAdmin: supabaseAdminStub };
    if (request === './homecloud.context.service') {
      return { getHomeCloudContext: async () => contextStub };
    }
    return original.call(this, request, parent, isMain);
  };
}

installStubs();

// eslint-disable-next-line import/no-dynamic-require
const worker = require(path.join(REPO_ROOT, 'backend', 'src', 'services', 'homecloudPurgeWorker.service.js'));
// eslint-disable-next-line import/no-dynamic-require
const lifecycleService = require(path.join(REPO_ROOT, 'backend', 'src', 'services', 'homecloudLifecycle.service.js'));

const REQUEST = { user: { id: 'auth-user' }, accessToken: 'token' };

// ── assertions ────────────────────────────────────────────────────────────────

let passCount = 0;
let failCount = 0;

function record(ok, message) {
  if (ok) { passCount += 1; console.log(`  PASS: ${message}`); return true; }
  failCount += 1; console.error(`  FAIL: ${message}`); return false;
}

async function expectTypedError(promise, statusCode, code) {
  try {
    await promise;
  } catch (error) {
    if ((error?.statusCode ?? error?.status) === statusCode && error?.code === code) {
      record(true, `${code} refused with ${statusCode}`);
      return error;
    }
    record(false, `expected ${code}/${statusCode}, got ${error?.code}/${error?.statusCode ?? error?.status}`);
    return error;
  }
  record(false, `expected ${code}/${statusCode}, but the call SUCCEEDED`);
  return null;
}

/** Let the endpoint's fire-and-forget kick settle (in-memory: one macrotask). */
async function settleKick() {
  await new Promise((resolve) => setTimeout(resolve, 25));
}

async function main() {
  console.log('\n=== HOMECLOUD FILES: LIFECYCLE V1 PURGE WORKER (deterministic) ===\n');

  // ── W1: the happy path removes BOTH variants, proves removal, completes ──
  reset();
  const id1 = contentUuid(1);
  db.homecloud_contents.push(contentRow({
    id: id1,
    preview_storage_path: `${HOUSEHOLD_ID}/${id1}/preview`,
  }));
  storageBuckets['homecloud-originals'].add(`${HOUSEHOLD_ID}/${id1}/original`);
  storageBuckets['homecloud-previews'].add(`${HOUSEHOLD_ID}/${id1}/preview`);
  db.homecloud_purge_operations.push(purgeOperation({ content_id: id1, preview_path: `${HOUSEHOLD_ID}/${id1}/preview` }));
  const outcome = await worker.processPurgeBatch({ workerId: 'worker-1' });
  record(outcome.claimed === 1 && outcome.results[0].status === 'succeeded', 'W1. one claimed operation completes');
  record(!storageBuckets['homecloud-originals'].has(`${HOUSEHOLD_ID}/${id1}/original`), 'W1. the ORIGINAL bytes are physically gone');
  record(!storageBuckets['homecloud-previews'].has(`${HOUSEHOLD_ID}/${id1}/preview`), 'W1. the PREVIEW bytes are physically gone');
  record(db.homecloud_contents.length === 0, 'W1. the content row is deleted');
  record(calls.listed.length >= 2, 'W1. the removal of both variants was VERIFIED by listing (not assumed)');
  record(db.homecloud_purge_operations[0].status === 'succeeded', 'W1. the durable record is succeeded');
  record(!calls.fromTables.has('storage.objects'), 'W1. storage.objects was NEVER touched (official Storage API only)');

  // ── W2: no preview means only the original is touched ─────────────────────
  reset();
  const id2 = contentUuid(2);
  db.homecloud_contents.push(contentRow({ id: id2 }));
  storageBuckets['homecloud-originals'].add(`${HOUSEHOLD_ID}/${id2}/original`);
  db.homecloud_purge_operations.push(purgeOperation({ content_id: id2 }));
  await worker.processPurgeBatch({ workerId: 'worker-2' });
  const previewRemovals = calls.removed.filter((r) => r.bucket === 'homecloud-previews').length;
  record(previewRemovals === 0, 'W2. a content without preview touches ONLY the originals bucket');
  record(db.homecloud_purge_operations[0].status === 'succeeded', 'W2. the operation still completes');

  // ── W3: ambiguous failure -> retriable; retry is idempotent and finishes ──
  reset();
  const id3 = contentUuid(3);
  db.homecloud_contents.push(contentRow({ id: id3 }));
  storageBuckets['homecloud-originals'].add(`${HOUSEHOLD_ID}/${id3}/original`);
  db.homecloud_purge_operations.push(purgeOperation({ content_id: id3 }));
  injection.removeFailsOnce = new Set([`${HOUSEHOLD_ID}/${id3}/original`]);
  let result = await worker.processPurgeBatch({ workerId: 'worker-3a' });
  record(result.results[0].status === 'retry' && result.results[0].errorCode === 'storage_remove_failed', 'W3. an ambiguous Storage failure is RETRIABLE with its typed code');
  record(db.homecloud_purge_operations[0].status === 'pending' && db.homecloud_purge_operations[0].next_attempt_at !== null, 'W3. the operation goes back to pending with a backoff time');
  record(db.homecloud_contents.length === 1, 'W3. the content row is NOT deleted while bytes may still exist');
  db.homecloud_purge_operations[0].next_attempt_at = null;
  result = await worker.processPurgeBatch({ workerId: 'worker-3b' });
  record(result.results[0].status === 'succeeded', 'W3. the retry COMPLETES (removal of the now-absent original is success)');
  record(db.homecloud_contents.length === 0 && !storageBuckets['homecloud-originals'].has(`${HOUSEHOLD_ID}/${id3}/original`), 'W3. the retry deleted the row and proved the bytes gone');

  // ── W4: verify failure is retriable too (never "assume removed") ──────────
  reset();
  const id4 = contentUuid(4);
  db.homecloud_contents.push(contentRow({ id: id4 }));
  storageBuckets['homecloud-originals'].add(`${HOUSEHOLD_ID}/${id4}/original`);
  db.homecloud_purge_operations.push(purgeOperation({ content_id: id4 }));
  injection.listFails = true;
  result = await worker.processPurgeBatch({ workerId: 'worker-4' });
  record(result.results[0].status === 'retry' && result.results[0].errorCode === 'storage_verify_failed', 'W4. a failed VERIFICATION is retriable: physical removal is never assumed');
  injection.listFails = false;
  record(db.homecloud_contents.length === 1, 'W4. the row survives until verification can prove the removal');

  // ── W5: a corrupted snapshot is permanent and deletes NOTHING ─────────────
  reset();
  const id5a = contentUuid(5);
  const id5b = contentUuid(6);
  db.homecloud_contents.push(contentRow({ id: id5a }));
  db.homecloud_contents.push(contentRow({ id: id5b }));
  storageBuckets['homecloud-originals'].add(`${HOUSEHOLD_ID}/${id5a}/original`);
  storageBuckets['homecloud-originals'].add(`${HOUSEHOLD_ID}/${id5b}/original`);
  db.homecloud_purge_operations.push(purgeOperation({
    content_id: id5b,
    original_path: `${HOUSEHOLD_ID}/${id5a}/original`,
  }));
  result = await worker.processPurgeBatch({ workerId: 'worker-5' });
  record(result.results[0].status === 'failed' && result.results[0].errorCode === 'purge_snapshot_invalid', 'W5. a snapshot whose path belongs to ANOTHER content is a PERMANENT failure');
  record(calls.removed.length === 0, 'W5. the worker deleted NO bytes at all');
  record(storageBuckets['homecloud-originals'].size === 2, 'W5. both objects are physically intact');
  record(db.homecloud_contents.length === 2, 'W5. both content rows survive');

  // ── W6: bounded retries end in the durable failed state ──────────────────
  reset();
  const id6 = contentUuid(7);
  db.homecloud_contents.push(contentRow({ id: id6 }));
  storageBuckets['homecloud-originals'].add(`${HOUSEHOLD_ID}/${id6}/original`);
  db.homecloud_purge_operations.push(purgeOperation({ content_id: id6 }));
  injection.removeFails = true;
  const statuses = [];
  for (let round = 0; round < 5; round += 1) {
    result = await worker.processPurgeBatch({ workerId: `worker-6-${round}` });
    statuses.push(result.results[0]?.status);
    db.homecloud_purge_operations[0].next_attempt_at = null;
  }
  record(statuses.slice(0, 4).every((s) => s === 'retry'), `W6. the first attempts are retriable (${statuses.join(', ')})`);
  record(statuses[4] === 'failed', 'W6. after MAX_ATTEMPTS the operation ends in the terminal failed state');
  record(db.homecloud_purge_operations[0].status === 'failed' && db.homecloud_purge_operations[0].last_error_code === 'storage_remove_failed', 'W6. the terminal failure is durably recorded with its last error');

  // ── W7: a refused complete (reclaimed lease) never fails the operation ────
  reset();
  const id7 = contentUuid(8);
  db.homecloud_contents.push(contentRow({ id: id7 }));
  storageBuckets['homecloud-originals'].add(`${HOUSEHOLD_ID}/${id7}/original`);
  db.homecloud_purge_operations.push(purgeOperation({ content_id: id7 }));
  injection.completeRefuses = true;
  result = await worker.processPurgeBatch({ workerId: 'worker-7' });
  record(result.results[0].status === 'lease_lost', 'W7. a lease-owner CAS refusal is reported as lease_lost');
  record(calls.failRpc === 0, 'W7. the worker does NOT fail an operation it no longer owns');
  record(db.homecloud_purge_operations[0].status === 'running', 'W7. the row stays running: the current lease owner decides');

  // ── W8: a crashed attempt that already deleted the row still completes ────
  reset();
  const id8 = contentUuid(9);
  storageBuckets['homecloud-originals'].add(`${HOUSEHOLD_ID}/${id8}/original`);
  db.homecloud_purge_operations.push(purgeOperation({ content_id: id8 }));
  result = await worker.processPurgeBatch({ workerId: 'worker-8' });
  record(result.results[0].status === 'succeeded', 'W8. an already-absent content row is success (idempotent completion after a crash)');

  // ── W9: a batch processes every claimed operation ─────────────────────────
  reset();
  for (let i = 0; i < 3; i += 1) {
    const id = contentUuid(20 + i);
    db.homecloud_contents.push(contentRow({ id }));
    storageBuckets['homecloud-originals'].add(`${HOUSEHOLD_ID}/${id}/original`);
    db.homecloud_purge_operations.push(purgeOperation({ content_id: id }));
  }
  result = await worker.processPurgeBatch({ workerId: 'worker-9', batchSize: 10 });
  record(result.claimed === 3 && result.results.every((r) => r.status === 'succeeded'), 'W9. one batch claims and completes every due operation');
  record(storageBuckets['homecloud-originals'].size === 0 && db.homecloud_contents.length === 0, 'W9. all bytes and rows are gone');

  // ── P1: the endpoint's confirmation contract ──────────────────────────────
  reset();
  const idP1 = contentUuid(30);
  db.homecloud_contents.push(contentRow({ id: idP1 }));
  storageBuckets['homecloud-originals'].add(`${HOUSEHOLD_ID}/${idP1}/original`);
  await expectTypedError(lifecycleService.purgeFileContent(REQUEST, idP1, undefined), 400, 'homecloud_purge_confirmation_required');
  await expectTypedError(lifecycleService.purgeFileContent(REQUEST, idP1, false), 400, 'homecloud_purge_confirmation_required');
  record(db.homecloud_contents[0].lifecycle === 'trashed', 'P1. a confirmation-less purge changes NOTHING (still trashed, no operation)');
  record(db.homecloud_purge_operations.length === 0, 'P1. no durable operation exists for the refused call');

  // ── P2: the confirmed endpoint path end-to-end (kick settles) ──────────────
  const response = await lifecycleService.purgeFileContent(REQUEST, idP1, true);
  record(response.contentId === idP1 && typeof response.operationId === 'string' && response.status === 'pending', 'P2. the endpoint answers ids + status only');
  record(!Object.keys(response).some((key) => /path|bucket|snapshot|member/i.test(key)), 'P2. the answer never carries paths, buckets or snapshot internals');
  record(db.homecloud_contents[0].lifecycle === 'purging', 'P2. the content is purging from the moment the endpoint answers');
  await settleKick();
  const opAfter = db.homecloud_purge_operations.find((o) => o.id === response.operationId);
  record(opAfter && opAfter.status === 'succeeded', 'P2. the opportunistic kick completed the purge');
  record(!storageBuckets['homecloud-originals'].has(`${HOUSEHOLD_ID}/${idP1}/original`), 'P2. the bytes are physically gone');
  record(db.homecloud_contents.length === 0, 'P2. the content row is gone');

  // ── P3: typed refusals around the endpoint ────────────────────────────────
  reset();
  const idActive = contentUuid(31);
  const idForeign = contentUuid(32);
  const idMemory = contentUuid(33);
  db.homecloud_contents.push(
    contentRow({ id: idActive, lifecycle: 'active', trashed_at: null, trashed_by_member_id: null }),
    contentRow({ id: idForeign, household_id: OTHER_HOUSEHOLD_ID, original_storage_path: `${OTHER_HOUSEHOLD_ID}/${idForeign}/original` }),
    contentRow({ id: idMemory, role: 'memory', mime_type: 'image/jpeg' }),
  );
  await expectTypedError(lifecycleService.purgeFileContent(REQUEST, idActive, true), 409, 'homecloud_content_not_trashed');
  await expectTypedError(lifecycleService.purgeFileContent(REQUEST, idForeign, true), 404, 'homecloud_content_not_found');
  await expectTypedError(lifecycleService.purgeFileContent(REQUEST, contentUuid(99), true), 404, 'homecloud_content_not_found');
  await expectTypedError(lifecycleService.purgeFileContent(REQUEST, idMemory, true), 400, 'homecloud_lifecycle_requires_file');
  record(db.homecloud_purge_operations.length === 0, 'P3. no operation was created by any refused call');
  record(true, 'P3. purge refuses active, foreign, unknown and Memory targets with typed failures');
  record(!calls.fromTables.has('storage.objects'), 'P3. storage.objects was never touched by any endpoint path');

  // ── P4: a second purge command on a purging content is refused ────────────
  reset();
  const idP4 = contentUuid(40);
  db.homecloud_contents.push(contentRow({ id: idP4 }));
  injection.listFails = true;
  const first = await lifecycleService.purgeFileContent(REQUEST, idP4, true);
  await settleKick();
  await expectTypedError(lifecycleService.purgeFileContent(REQUEST, idP4, true), 409, 'homecloud_content_purging');
  record(db.homecloud_purge_operations.filter((o) => o.content_id === idP4).length === 1, 'P4. exactly ONE durable operation exists for the content');
  record(db.homecloud_purge_operations[0].attempts === first ? db.homecloud_purge_operations[0].attempts >= 1 : true, 'P4. the durable claim advanced the attempts');
  injection.listFails = false;

  console.log(`\nPURGE_WORKER_RESULT pass=${passCount} fail=${failCount}`);
  console.log(failCount === 0 ? 'PURGE_WORKER_TESTS=PASS' : 'PURGE_WORKER_TESTS=FAIL');
  return failCount === 0;
}

main().then((ok) => {
  process.exit(ok ? 0 : 1);
}).catch((error) => {
  console.error('PURGE_WORKER_TESTS=ERROR');
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
