/**
 * HomeCloud T1 — job store / corruption / queue contract tests (compiled).
 *
 * Proves the T1 exit-gate contracts with fakes and no emulator:
 *
 *  A. completed cleanup → terminal artifact cleanup invoked
 *  B. cancelled cleanup → terminal artifact cleanup invoked
 *  C. sweep deletes orphan >24h
 *  D. sweep preserves live/recoverable job folders
 *  E. rapid put A→B persists in real order (serialized chain)
 *  F. persistence failure surfaces (rejects, recorded)
 *  G. write-chain continues correctly after a handled failure
 *  H. second submit while busy is queued (never dropped/replaced)
 *  I. Files + Memories use the same queue authority
 *  J. queue FIFO within scope
 *  K. cross-household job never executes in the wrong scope
 *  L. transient error → reconnect stays failed → explicit Retry
 *  M. terminal error → no reconnect retry (no auto-loop)
 *  N. reconnect cannot spawn duplicate workers (single-flight)
 *  O. cancel middle/pending job doesn't drop neighbors
 *  P. hydration/kill restores the durable queue coherently
 *  Q. createFetchArtifactReader absent
 *  R. normalizeSignedUploadUrlForRuntime absent
 *  S. no whole-file JS heap fallback
 *  T. dev screen absent
 *
 * Run: `EXPO_PUBLIC_API_URL=http://localhost:9999 node
 *   scripts/compiled/scripts/homecloud_t1_queue_persistence_tests.js`
 * (compile first via `npm exec tsc -- -p scripts/tsconfig.test.json`).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { createUploadEngine } from '../front/mi-front-limpio/services/homecloud/homecloudUploadEngine';
import { createUploadJob, transition } from '../front/mi-front-limpio/services/homecloud/homecloudUploadJob';
import {
  createSharedUploadQueue,
  __resetSharedUploadQueueForTests,
  nextEligibleJob,
} from '../front/mi-front-limpio/services/homecloud/homecloudUploadQueue';
import { ensureUploadCoordinator } from '../front/mi-front-limpio/services/homecloud/homecloudUploadCoordinator';
import {
  __resetUploadRecoveryForTests,
  recoverUploadJobs,
} from '../front/mi-front-limpio/services/homecloud/homecloudUploadRecovery';
import {
  ensureHomeCloudUploadRuntime,
  __resetUploadRuntimeForTests,
} from '../front/mi-front-limpio/services/homecloud/homecloudUploadRuntime';
import { classifyUploadFailure } from '../front/mi-front-limpio/services/homecloud/homecloudUploadFailure';
import {
  filterOrphanWorkspaceFolders,
  isOrphanWorkspaceCandidate,
  sweepOrphanWorkspacesWithFs,
  workspaceFolderUriOf,
} from '../front/mi-front-limpio/services/homecloud/homecloudOrphanSweepPolicy';
import {
  createAsyncStorageUploadJobStore,
  createInMemoryUploadJobStore,
} from '../front/mi-front-limpio/storage/homecloudUploadJobStorage';

// Node has no Metro `__DEV__` global; memory-role engine traces read it.
// Define it (traces off) so Files+Memories queue tests exercise real roles.
(globalThis as unknown as { __DEV__?: boolean }).__DEV__ ??= false;

let passCount = 0;
let failCount = 0;

function record(ok: boolean, message: string) {
  if (ok) { passCount += 1; console.log(`  PASS: ${message}`); }
  else { failCount += 1; console.error(`  FAIL: ${message}`); }
}

function resetAll() {
  __resetSharedUploadQueueForTests();
  __resetUploadRecoveryForTests();
  __resetUploadRuntimeForTests();
}

const ARTIFACT_A = {
  localUri: 'file:///durable/a.pdf',
  displayName: 'a.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 2048,
  extension: 'pdf',
};

const artifactFor = (name: string) => ({
  localUri: `file:///durable/${name}`,
  displayName: name,
  mimeType: 'application/pdf',
  sizeBytes: 1024,
  extension: 'pdf',
});

// ── Fake HomeCloud intake backend behind the global fetch stub ──────────────

interface FakeBackend {
  counts: { register: number; uploadAuth: number; verify: number; finalize: number; put: number };
  uploaded: Set<string>;
  byIntakeRequest: Map<string, string>;
  failMode: null | 'transient-once' | 'terminal-once';
}

function makeBackend(): FakeBackend {
  return {
    counts: { register: 0, uploadAuth: 0, verify: 0, finalize: 0, put: 0 },
    uploaded: new Set(),
    byIntakeRequest: new Map(),
    failMode: null,
  };
}

function installFetch(backend: FakeBackend) {
  (globalThis as unknown as { fetch: typeof fetch }).fetch = (async (url: unknown, init?: { method?: string; body?: string }) => {
    const raw = String(url);
    const method = (init?.method ?? 'GET').toUpperCase();
    const pathOnly = raw.replace(/^https?:\/\/[^/]+/, '');
    const json = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

    if (pathOnly === '/api/homecloud/register' && method === 'POST') {
      backend.counts.register += 1;
      const body = JSON.parse(init?.body ?? '{}') as { intakeRequestId?: string; role?: string };
      const key = body.intakeRequestId ?? '';
      const existing = backend.byIntakeRequest.get(key);
      if (existing) return json(200, { content: { id: existing, role: body.role ?? 'file' } });
      const id = `content-${backend.byIntakeRequest.size + 1}`;
      backend.byIntakeRequest.set(key, id);
      return json(200, { content: { id, role: body.role ?? 'file' } });
    }

    const uploadMatch = pathOnly.match(/^\/api\/homecloud\/content\/([^/]+)\/upload$/);
    if (uploadMatch && method === 'POST') {
      backend.counts.uploadAuth += 1;
      if (backend.failMode === 'transient-once') {
        backend.failMode = null;
        throw new Error('Network request failed');
      }
      if (backend.failMode === 'terminal-once') {
        backend.failMode = null;
        return json(403, { code: 'homecloud_forbidden', message: 'forbidden' });
      }
      const id = uploadMatch[1];
      return json(200, {
        signedUploadUrl: `https://storage.test/${id}/original`,
        path: `hh-1/${id}/original`,
        expiresIn: 7200,
        contentId: id,
      });
    }

    const verifyMatch = pathOnly.match(/^\/api\/homecloud\/content\/([^/]+)\/verify$/);
    if (verifyMatch && method === 'POST') {
      backend.counts.verify += 1;
      return json(200, { verified: backend.uploaded.has(verifyMatch[1]) });
    }

    const finalizeMatch = pathOnly.match(/^\/api\/homecloud\/content\/([^/]+)\/finalize$/);
    if (finalizeMatch && method === 'POST') {
      backend.counts.finalize += 1;
      return json(200, { content: { id: finalizeMatch[1], role: 'file' } });
    }

    return json(404, { code: 'not_found', message: `unexpected ${method} ${pathOnly}` });
  }) as typeof fetch;
}

function makeTransport(
  backend: FakeBackend,
  opts?: { order?: string[]; gate?: () => Promise<void>; failTransientOnce?: boolean },
) {
  let failedOnce = false;
  return async ({ signedUploadUrl, localUri }: { signedUploadUrl: string; localUri: string; mimeType: string }) => {
    if (opts?.gate) await opts.gate();
    if (opts?.failTransientOnce && !failedOnce) {
      failedOnce = true;
      throw new Error('Network request failed');
    }
    backend.counts.put += 1;
    opts?.order?.push(localUri);
    const match = signedUploadUrl.match(/storage\.test\/([^/]+)\/original/);
    if (match) backend.uploaded.add(match[1]);
    return { status: 200, ok: true };
  };
}

// ── Controllable AsyncStorage fake (ordering + failure injection) ───────────

function makeFakeAsyncStorage(opts?: { failSetFor?: Set<string>; failAllSets?: boolean; delayMs?: number }) {
  const map = new Map<string, string>();
  const setOrder: string[] = [];
  return {
    map,
    setOrder,
    async getItem(key: string) { return map.has(key) ? map.get(key)! : null; },
    async setItem(key: string, value: string) {
      if (opts?.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
      if (opts?.failAllSets || opts?.failSetFor?.has(key)) {
        throw new Error('AsyncStorage setItem failed: quota/no space (injected)');
      }
      setOrder.push(key);
      map.set(key, value);
    },
    async removeItem(key: string) { map.delete(key); },
    async getAllKeys() { return [...map.keys()]; },
  };
}

const root = process.cwd();
const readSource = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');

async function main() {
  console.log('\n=== HOMECLOUD T1 QUEUE / PERSISTENCE TESTS ===\n');

  // ── Classification unit checks (no new FSM states) ──
  {
    resetAll();
    record(classifyUploadFailure(new Error('Network request failed')) === 'transient', 'classifier: offline is transient');
    record(classifyUploadFailure(new Error('upload transport failed: 503')) === 'transient', 'classifier: 503 is transient');
    record(classifyUploadFailure(new Error('file too large policy')) === 'terminal', 'classifier: policy is terminal');
    record(classifyUploadFailure(new Error('no access token')) === 'terminal', 'classifier: auth is terminal');
    record(classifyUploadFailure(new Error('something totally unknown')) === 'terminal', 'classifier: unknown defaults terminal (no auto-loop)');
  }

  // ── A. completed cleanup ──
  {
    resetAll();
    const backend = makeBackend();
    installFetch(backend);
    const store = createInMemoryUploadJobStore();
    const cleaned: string[] = [];
    const engine = createUploadEngine({
      store,
      uploadTransport: makeTransport(backend),
      getAccessToken: () => 'tok',
      getHouseholdId: () => 'hh-1',
      cleanupDurableArtifact: async (artifact) => { cleaned.push(artifact.localUri); },
    });
    const queue = createSharedUploadQueue({
      store,
      householdId: 'hh-1',
      run: (id) => engine.run(id),
      cleanupTerminalArtifact: async (artifact) => { cleaned.push(artifact.localUri); },
    });
    const job = await queue.enqueue({ role: 'file', intakeSource: 'files:picker' }, ARTIFACT_A);
    // enqueue is DECOUPLED from the worker: it returns once the job is durable,
    // not once the upload finished. `pump()` joins the in-flight execution
    // promise, so awaiting it is the durable drain point for assertions.
    await queue.pump();
    const done = store.get(job.id)!;
    record(done.state === 'completed', 'A: job completes through the shared queue');
    record(cleaned.includes(ARTIFACT_A.localUri), 'A: completed cleanup removes the durable workspace artifact');
  }

  // ── B. cancelled cleanup ──
  {
    resetAll();
    const store = createInMemoryUploadJobStore();
    const cleaned: string[] = [];
    const engine = createUploadEngine({
      store,
      uploadTransport: async () => ({ status: 200, ok: true }),
      getAccessToken: () => 'tok',
      getHouseholdId: () => 'hh-1',
      cleanupDurableArtifact: async (artifact) => { cleaned.push(artifact.localUri); },
    });
    const queue = createSharedUploadQueue({
      store,
      householdId: 'hh-1',
      run: (id) => engine.run(id),
      cleanupTerminalArtifact: async (artifact) => { cleaned.push(artifact.localUri); },
    });
    const job = createUploadJob('hh-1', { role: 'file', intakeSource: 'files:picker' }, artifactFor('b.pdf'));
    store.put(job);
    const cancelled = await queue.cancelJob(job.id);
    record(cancelled?.state === 'cancelled', 'B: pending job cancels without starting an upload');
    record(cleaned.includes('file:///durable/b.pdf'), 'B: cancelled cleanup removes the durable workspace artifact');
  }

  // ── C/D. orphan sweep policy ──
  {
    resetAll();
    const old = 25 * 60 * 60 * 1000;
    const fresh = 60 * 60 * 1000;
    const liveUri = 'file:///doc/homecloud-upload-jobs/pending_1700000000000_ab12cd34/clip.mov';
    const liveFolder = workspaceFolderUriOf(liveUri, 'file:///doc/')!;
    const candidates = [
      { folderName: 'pending_1699990000000_zz99yy88', folderUri: 'file:///doc/homecloud-upload-jobs/pending_1699990000000_zz99yy88/', ageMs: old },
      { folderName: 'pending_1700000000000_ab12cd34', folderUri: liveFolder, ageMs: old },
      { folderName: 'pending_1700000000000_fresh001', folderUri: 'file:///doc/homecloud-upload-jobs/pending_1700000000000_fresh001/', ageMs: fresh },
      { folderName: 'not-a-workspace-folder', folderUri: 'file:///doc/homecloud-upload-jobs/not-a-workspace-folder/', ageMs: old },
    ];
    const orphans = filterOrphanWorkspaceFolders(candidates, new Set([liveFolder]));
    record(orphans.length === 1 && orphans[0].folderName === 'pending_1699990000000_zz99yy88', 'C: sweep deletes ONLY the old unreferenced orphan');
    record(isOrphanWorkspaceCandidate(candidates[1], new Set([liveFolder])) === false, 'D: sweep preserves the live/recoverable job folder');
    record(isOrphanWorkspaceCandidate(candidates[2], new Set()) === false, 'D: sweep preserves fresh folders (<24h)');
    record(isOrphanWorkspaceCandidate(candidates[3], new Set()) === false, 'D: sweep never touches non-conforming names');

    // Full orchestration over a fake fs: orphan deleted, live kept, failure observed.
    const removed: string[] = [];
    const now = Date.now();
    const report = await sweepOrphanWorkspacesWithFs(
      {
        documentDirectory: 'file:///doc/',
        now: () => now,
        listWorkspace: async () => ['pending_1000000000000_old00001', 'pending_1000000000000_old00002', 'random-dir'],
        info: async () => ({ exists: true, modificationTime: (now - old) / 1000 }),
        remove: async (uri) => {
          if (uri.includes('old00002')) throw new Error('injected remove failure');
          removed.push(uri);
        },
      },
      new Set(),
    );
    record(report.scanned === 2 && report.deleted === 1, 'C: orchestration deletes orphans best-effort per artifact');
    record(report.errors.length === 1, 'C: sweep failure is observable (not swallowed)');
    void removed;
  }

  // ── E. rapid put A→B persists in order ──
  {
    resetAll();
    const fake = makeFakeAsyncStorage({ delayMs: 5 });
    const store = createAsyncStorageUploadJobStore(fake);
    const jobA = createUploadJob('hh-1', { role: 'file', intakeSource: 't' }, artifactFor('e-a.pdf'));
    // Force a deterministic creation order gap for FIFO-independent check.
    await new Promise((r) => setTimeout(r, 2));
    const jobB = createUploadJob('hh-1', { role: 'file', intakeSource: 't' }, artifactFor('e-b.pdf'));
    await Promise.all([store.putAsync(jobA), store.putAsync(jobB)]);
    const keys = fake.setOrder.filter((k) => k.endsWith(jobA.id) || k.endsWith(jobB.id));
    record(keys[0]?.endsWith(jobA.id) === true && keys[1]?.endsWith(jobB.id) === true, 'E: concurrent put A→B lands durable in real order');
    record(store.get(jobA.id)?.id === jobA.id && store.get(jobB.id)?.id === jobB.id, 'E: both jobs readable after ordered writes');
  }

  // ── F/G. persistence failure surfaces; chain survives ──
  {
    resetAll();
    const fake = makeFakeAsyncStorage();
    const store = createAsyncStorageUploadJobStore(fake);
    const bad = createUploadJob('hh-1', { role: 'file', intakeSource: 't' }, artifactFor('f-bad.pdf'));
    const failKey = `homecloud:upload-job:${bad.id}`;
    const origSet = fake.setItem.bind(fake);
    let failRemaining = 1;
    fake.setItem = async (key: string, value: string) => {
      if (key === failKey && failRemaining > 0) {
        failRemaining -= 1;
        throw new Error('AsyncStorage setItem failed: injected ENOSPC');
      }
      return origSet(key, value);
    };
    let threw = false;
    try {
      await store.putAsync(bad);
    } catch {
      threw = true;
    }
    record(threw, 'F: persistence failure rejects (visible to the caller)');
    record(store.getLastPersistenceError() !== null, 'F: persistence failure is recorded observably');
    const good = createUploadJob('hh-1', { role: 'file', intakeSource: 't' }, artifactFor('f-good.pdf'));
    await store.putAsync(good);
    record(store.get(good.id)?.id === good.id, 'G: write-chain continues correctly after a handled failure');
    await store.flush(bad);
    record(store.get(bad.id)?.id === bad.id, 'G: the failed write retries successfully on the next write');
  }

  // ── H/I/J. second submit queued; shared authority; FIFO ──
  {
    resetAll();
    const backend = makeBackend();
    installFetch(backend);
    const store = createInMemoryUploadJobStore();
    let releaseUpload!: () => void;
    const gate = () => new Promise<void>((resolve) => { releaseUpload = resolve; });
    let gateOpen = false;
    const order: string[] = [];
    const engine = createUploadEngine({
      store,
      uploadTransport: makeTransport(backend, {
        order,
        gate: async () => { if (!gateOpen) await gate(); },
      }),
      getAccessToken: () => 'tok',
      getHouseholdId: () => 'hh-1',
    });
    const queue = createSharedUploadQueue({ store, householdId: 'hh-1', run: (id) => engine.run(id) });
    const first = queue.enqueue({ role: 'file', intakeSource: 'files:picker' }, artifactFor('h-a.pdf'));
    // Let A reach the gated transport.
    await new Promise((r) => setTimeout(r, 50));
    const second = queue.enqueue({ role: 'memory', intakeSource: 'memories:picker' }, artifactFor('h-b.pdf'));
    await new Promise((r) => setTimeout(r, 50));
    const persistedB = store.all().find((j) => j.artifact.localUri.endsWith('h-b.pdf'));
    record(persistedB?.state === 'pending', 'H: second submit while busy persists as pending (never dropped)');
    record(store.all().filter((j) => j.householdId === 'hh-1').length === 2, 'I: Files + Memories share one queue authority (both jobs present)');
    void first; void second;
    gateOpen = true;
    releaseUpload();
    await queue.pump();
    const doneA = store.all().find((j) => j.artifact.localUri.endsWith('h-a.pdf'))!;
    const doneB = store.all().find((j) => j.artifact.localUri.endsWith('h-b.pdf'))!;
    record(doneA.state === 'completed' && doneB.state === 'completed', 'H: A completes, then queued B completes (no re-pick)');
    record(order[0]?.endsWith('h-a.pdf') === true && order[1]?.endsWith('h-b.pdf') === true, 'J: queue advances FIFO within scope');
  }

  // ── K. cross-household isolation ──
  {
    resetAll();
    const backend = makeBackend();
    installFetch(backend);
    const store = createInMemoryUploadJobStore();
    const engineHH1 = createUploadEngine({
      store,
      uploadTransport: makeTransport(backend),
      getAccessToken: () => 'tok',
      getHouseholdId: () => 'hh-1',
    });
    const queueHH1 = createSharedUploadQueue({ store, householdId: 'hh-1', run: (id) => engineHH1.run(id) });
    const foreign = createUploadJob('hh-2', { role: 'file', intakeSource: 'files:picker' }, artifactFor('k-foreign.pdf'));
    store.put(foreign);
    record(nextEligibleJob(store, 'hh-1') === null, 'K: foreign-household job is never eligible in this scope');
    await queueHH1.pump();
    record(store.get(foreign.id)?.state === 'pending', 'K: cross-household job never executes in the wrong scope');
    let threw = false;
    try {
      await engineHH1.run(foreign.id);
    } catch {
      threw = true;
    }
    record(threw, 'K: direct cross-household execution is denied by ownership guard');
  }

  // ── K2. a failed job is durable/manual-only and never blocks later work ──
  {
    resetAll();
    const store = createInMemoryUploadJobStore();
    const at = (name: string, createdAt: string) => ({
      ...createUploadJob('hh-1', { role: 'file' as const, intakeSource: 't' }, artifactFor(name)),
      createdAt,
      updatedAt: createdAt,
    });
    const jobA = at('k2-a.pdf', '2026-01-01T00:00:00.000Z');
    const jobB = at('k2-b.pdf', '2026-01-01T00:00:01.000Z');
    const jobC = at('k2-c.pdf', '2026-01-01T00:00:02.000Z');
    store.put(jobA); store.put(jobB); store.put(jobC);
    const attempts = new Map<string, number>();
    const queue = createSharedUploadQueue({
      store,
      householdId: 'hh-1',
      run: async (id) => {
        attempts.set(id, (attempts.get(id) ?? 0) + 1);
        const current = store.get(id)!;
        if (id === jobA.id && attempts.get(id) === 1) {
          const failed = transition(current, 'failed', {
            error: { code: 'network', message: 'offline', retryable: true },
          });
          store.put(failed);
          throw new Error('offline');
        }
        const completed = { ...current, state: 'completed' as const, error: null, updatedAt: new Date().toISOString() };
        store.put(completed);
        return completed;
      },
    });

    await queue.pump();
    record(store.get(jobA.id)?.state === 'failed', 'K2: retryable failure remains durable');
    record(store.get(jobB.id)?.state === 'completed' && store.get(jobC.id)?.state === 'completed', 'K2: retryable failure does not block later pending jobs');
    record(attempts.get(jobA.id) === 1, 'K2: failed job is not automatically retried while the pump drains');

    await queue.pump();
    record(attempts.get(jobA.id) === 1 && store.get(jobA.id)?.state === 'failed', 'K2: a later automatic pump still does not retry the failed job');

    const failedIdentity = store.get(jobA.id)?.id;
    const coordinator = ensureUploadCoordinator({ store, householdId: 'hh-1', run: async () => { throw new Error('unused'); } });
    // Reconfigure with the queue runner, then explicitly retry through the public coordinator contract.
    createSharedUploadQueue({
      store,
      householdId: 'hh-1',
      run: async (id) => {
        attempts.set(id, (attempts.get(id) ?? 0) + 1);
        const current = store.get(id)!;
        const completed = { ...current, state: 'completed' as const, error: null, updatedAt: new Date().toISOString() };
        store.put(completed);
        return completed;
      },
    });
    await coordinator.retry(jobA.id);
    record(store.get(jobA.id)?.state === 'completed' && store.get(jobA.id)?.id === failedIdentity, 'K2: manual Retry resumes the same durable job identity');
  }

  // ── K3. multiple failures and another household cannot form barriers ──
  {
    resetAll();
    const store = createInMemoryUploadJobStore();
    const make = (householdId: string, name: string, createdAt: string) => ({
      ...createUploadJob(householdId, { role: 'file' as const, intakeSource: 't' }, artifactFor(name)),
      createdAt,
      updatedAt: createdAt,
    });
    const failedRetryable = transition(make('hh-a', 'k3-retryable.pdf', '2026-01-01T00:00:00.000Z'), 'failed', {
      error: { code: 'network', message: 'offline', retryable: true },
    });
    const failedTerminal = transition(make('hh-a', 'k3-terminal.pdf', '2026-01-01T00:00:01.000Z'), 'failed', {
      error: { code: 'policy', message: 'forbidden', retryable: false },
    });
    const pendingA = make('hh-a', 'k3-a-pending.pdf', '2026-01-01T00:00:02.000Z');
    const pendingB = make('hh-b', 'k3-b-pending.pdf', '2026-01-01T00:00:00.000Z');
    store.put(failedRetryable); store.put(failedTerminal); store.put(pendingA); store.put(pendingB);
    const attempts: string[] = [];
    const complete = async (id: string) => {
      attempts.push(id);
      const current = store.get(id)!;
      const completed = { ...current, state: 'completed' as const, error: null, updatedAt: new Date().toISOString() };
      store.put(completed);
      return completed;
    };
    const queueA = createSharedUploadQueue({ store, householdId: 'hh-a', run: complete });
    const queueB = createSharedUploadQueue({ store, householdId: 'hh-b', run: complete });
    await Promise.all([queueA.pump(), queueB.pump()]);
    record(store.get(failedRetryable.id)?.state === 'failed' && store.get(failedTerminal.id)?.state === 'failed', 'K3: multiple failed records are retained unchanged');
    record(store.get(pendingA.id)?.state === 'completed', 'K3: retryable and non-retryable failures do not block a later pending job');
    record(store.get(pendingB.id)?.state === 'completed', 'K3: a failed job in Household A cannot block Household B');
    record(attempts.length === 2 && !attempts.includes(failedRetryable.id) && !attempts.includes(failedTerminal.id), 'K3: no failed job is duplicated or busy-looped');
  }

  // ── L/M/N. transient reconnect retry; terminal never loops; single-flight ──
  {
    resetAll();
    const backend = makeBackend();
    backend.failMode = 'transient-once';
    installFetch(backend);
    const store = createInMemoryUploadJobStore();
    const engine = createUploadEngine({
      store,
      uploadTransport: makeTransport(backend),
      getAccessToken: () => 'tok',
      getHouseholdId: () => 'hh-1',
    });
    const job = createUploadJob('hh-1', { role: 'file', intakeSource: 'files:picker' }, artifactFor('l-air.pdf'));
    store.put(job);
    await engine.run(job.id).catch(() => {});
    const parked = store.get(job.id)!;
    record(parked.state === 'failed' && parked.error?.retryable === true, 'L: airplane-style outage parks the job as transient-failed (artifact survives)');
    backend.failMode = null;
    let runs = 0;
    const countingRun = async (id: string) => { runs += 1; return engine.run(id); };
    const runtime = ensureHomeCloudUploadRuntime({
      store,
      householdId: 'hh-1',
      run: countingRun,
      sweepOrphans: async () => undefined,
    });
    await runtime.start();
    // Startup already recovers transient jobs; force the reconnect path too.
    runtime.notifyOffline();
    await runtime.notifyOnline();
    record(store.get(job.id)?.state === 'failed' && runs === 0, 'L: reconnect never automatically retries a failed job');
    const coordinator = ensureUploadCoordinator({ store, householdId: 'hh-1', run: countingRun });
    await coordinator.retry(job.id);
    record(store.get(job.id)?.state === 'completed', 'L: explicit Retry resumes the same transient job without re-picking');
    const afterReconnectRuns = runs;

    // Terminal failure: never auto-retries on reconnect.
    const backend2 = makeBackend();
    backend2.failMode = 'terminal-once';
    installFetch(backend2);
    const store2 = createInMemoryUploadJobStore();
    const engine2 = createUploadEngine({
      store: store2,
      uploadTransport: makeTransport(backend2),
      getAccessToken: () => 'tok',
      getHouseholdId: () => 'hh-1',
    });
    const bad = createUploadJob('hh-1', { role: 'file', intakeSource: 'files:picker' }, artifactFor('m-bad.pdf'));
    store2.put(bad);
    await engine2.run(bad.id).catch(() => {});
    const parkedBad = store2.get(bad.id)!;
    record(parkedBad.state === 'failed' && parkedBad.error?.retryable !== true, 'M: terminal failure parks as manual-only');
    let runs2 = 0;
    const runtime2 = ensureHomeCloudUploadRuntime({
      store: store2,
      householdId: 'hh-1b',
      run: async (id: string) => { runs2 += 1; return engine2.run(id); },
      sweepOrphans: async () => undefined,
    });
    // Note: hh-1b scope has no jobs; run the reconnect against the real scope.
    runtime2.dispose();
    const recBefore = backend2.counts.register;
    await recoverUploadJobs({ store: store2, householdId: 'hh-1', run: async (id: string) => { runs2 += 1; return engine2.run(id); } });
    record(backend2.counts.register === recBefore && runs2 === 0, 'M: terminal failure never auto-loops on recovery/reconnect');

    // M2: startup while OFFLINE must not spend the durable jobs on a doomed
    // pass. Hydration + orphan sweep still run (they are offline-safe); the
    // recovery pass waits for the first real online signal, exactly once.
    {
      resetAll();
      const backend4 = makeBackend();
      installFetch(backend4);
      const store4 = createInMemoryUploadJobStore();
      const engine4 = createUploadEngine({
        store: store4,
        uploadTransport: makeTransport(backend4),
        getAccessToken: () => 'tok',
        getHouseholdId: () => 'hh-1',
      });
      store4.put(createUploadJob('hh-1', { role: 'file', intakeSource: 't' }, artifactFor('m2-air.pdf')));
      const sink: { listener: ((online: boolean) => void) | null } = { listener: null };
      let online = false;
      let sweeps = 0;
      let runs4 = 0;
      const runtime4 = ensureHomeCloudUploadRuntime({
        store: store4,
        householdId: 'hh-1',
        run: async (id: string) => { runs4 += 1; return engine4.run(id); },
        sweepOrphans: async () => { sweeps += 1; },
        connectivity: {
          currentOnline: async () => online,
          subscribe: (listener) => { sink.listener = listener; return () => { sink.listener = null; }; },
        },
      });
      await runtime4.start();
      record(runs4 === 0 && backend4.counts.register === 0, 'M2: startup offline never starts an upload (no doomed pass)');
      record(sweeps === 1, 'M2: the orphan sweep still runs offline (it is offline-safe)');
      record(store4.all().filter((j) => j.householdId === 'hh-1').length === 1, 'M2: the durable job survives an offline start');
      online = true;
      sink.listener?.(true);
      await new Promise((r) => setTimeout(r, 100));
      record(store4.all()[0]?.state === 'completed', 'M2: the first online signal resumes the job to completion');
      record(runs4 === 1, `M2: the reconnect fires exactly one pass (runs=${runs4})`);
    }

    // N: concurrent reconnect triggers share one pass.
    resetAll();
    const backend3 = makeBackend();
    installFetch(backend3);
    const store3 = createInMemoryUploadJobStore();
    const engine3 = createUploadEngine({
      store: store3,
      uploadTransport: makeTransport(backend3),
      getAccessToken: () => 'tok',
      getHouseholdId: () => 'hh-n',
    });
    for (const name of ['n-1.pdf', 'n-2.pdf']) {
      store3.put(createUploadJob('hh-n', { role: 'file', intakeSource: 't' }, artifactFor(name)));
    }
    let runs3 = 0;
    const counting3 = async (id: string) => { runs3 += 1; return engine3.run(id); };
    await Promise.all([
      recoverUploadJobs({ store: store3, householdId: 'hh-n', run: counting3 }),
      recoverUploadJobs({ store: store3, householdId: 'hh-n', run: counting3 }),
    ]);
    record(runs3 === 2, `N: reconnect cannot spawn duplicate workers (each job ran once, runs=${runs3})`);
    void afterReconnectRuns;
  }

  // ── O. cancel middle job keeps neighbors ──
  {
    resetAll();
    const backend = makeBackend();
    installFetch(backend);
    const store = createInMemoryUploadJobStore();
    let releaseUpload!: () => void;
    const gate = () => new Promise<void>((resolve) => { releaseUpload = resolve; });
    let gateOpen = false;
    const engine = createUploadEngine({
      store,
      uploadTransport: makeTransport(backend, { gate: async () => { if (!gateOpen) await gate(); } }),
      getAccessToken: () => 'tok',
      getHouseholdId: () => 'hh-1',
    });
    const queue = createSharedUploadQueue({ store, householdId: 'hh-1', run: (id) => engine.run(id) });
    const pA = queue.enqueue({ role: 'file', intakeSource: 't' }, artifactFor('o-a.pdf'));
    await new Promise((r) => setTimeout(r, 50));
    const pB = queue.enqueue({ role: 'file', intakeSource: 't' }, artifactFor('o-b.pdf'));
    await new Promise((r) => setTimeout(r, 20));
    const pC = queue.enqueue({ role: 'file', intakeSource: 't' }, artifactFor('o-c.pdf'));
    await new Promise((r) => setTimeout(r, 20));
    const jobB = store.all().find((j) => j.artifact.localUri.endsWith('o-b.pdf'))!;
    // Cancel the PENDING middle job: must not start an upload to cancel it.
    const putsBefore = backend.counts.put;
    const cancelledB = await queue.cancelJob(jobB.id);
    record(cancelledB?.state === 'cancelled', 'O: pending middle job cancels directly');
    record(backend.counts.put === putsBefore, 'O: cancelling a pending job never starts an upload');
    gateOpen = true;
    releaseUpload();
    void pA; void pB; void pC;
    await queue.pump();
    const doneA = store.all().find((j) => j.artifact.localUri.endsWith('o-a.pdf'))!;
    const doneC = store.all().find((j) => j.artifact.localUri.endsWith('o-c.pdf'))!;
    record(doneA.state === 'completed' && doneC.state === 'completed', 'O: cancel of the middle job drops neither neighbor');
    record(store.get(jobB.id)?.state === 'cancelled', 'O: cancelled job stays cancelled after the queue drains');
  }

  // ── O2. cancel an ACTIVE job is final (no resurrection) ──
  {
    resetAll();
    const backend = makeBackend();
    installFetch(backend);
    const store = createInMemoryUploadJobStore();
    let releaseUpload!: () => void;
    const gate = () => new Promise<void>((resolve) => { releaseUpload = resolve; });
    let gateOpen = false;
    const engine = createUploadEngine({
      store,
      uploadTransport: makeTransport(backend, { gate: async () => { if (!gateOpen) await gate(); } }),
      getAccessToken: () => 'tok',
      getHouseholdId: () => 'hh-1',
    });
    const queue = createSharedUploadQueue({ store, householdId: 'hh-1', run: (id) => engine.run(id) });
    void queue.enqueue({ role: 'file', intakeSource: 't' }, artifactFor('o2-active.pdf'));
    // Let the job reach the gated transport, then cancel it mid-flight.
    await new Promise((r) => setTimeout(r, 50));
    const activeJob = store.all().find((j) => j.artifact.localUri.endsWith('o2-active.pdf'))!;
    const finalizesBefore = backend.counts.finalize;
    await queue.cancelJob(activeJob.id);
    record(store.get(activeJob.id)?.state === 'cancelled', 'O2: an active job can be cancelled mid-flight');
    gateOpen = true;
    releaseUpload();
    await queue.pump();
    const after = store.get(activeJob.id)!;
    record(after.state === 'cancelled', `O2: a cancelled job is never resurrected by the in-flight run (state=${after.state})`);
    record(backend.counts.finalize === finalizesBefore, 'O2: a cancelled job never reaches finalize');
  }

  // ── P. hydration/kill restores the durable queue ──
  {
    resetAll();
    const backend = makeBackend();
    installFetch(backend);
    const device = makeFakeAsyncStorage();
    const storeBeforeKill = createAsyncStorageUploadJobStore(device);
    const engineBefore = createUploadEngine({
      store: storeBeforeKill,
      uploadTransport: makeTransport(backend),
      getAccessToken: () => 'tok',
      getHouseholdId: () => 'hh-1',
    });
    const jobP = engineBefore.createJob({ role: 'memory', intakeSource: 'memories:picker' }, artifactFor('p-kill.pdf'));
    await storeBeforeKill.putAsync(jobP);
    // "Kill": drop every in-memory handle, keep the SAME durable backend.
    const storeAfterKill = createAsyncStorageUploadJobStore(device);
    record(storeAfterKill.all().length === 0, 'P: fresh mirror starts empty (kill drops memory)');
    const hydrated = await storeAfterKill.hydrate();
    record(hydrated.length === 1 && hydrated[0].id === jobP.id, 'P: hydrate restores the durable queue coherently');
    const report = storeAfterKill.getLastHydrationReport();
    record(report !== null && report.corruptKeys.length === 0, 'P: clean hydration reports zero corruption');
    // Corruption is reported, never silently an empty queue.
    device.map.set('homecloud:upload-job:corrupt-1', 'this is not a job{');
    await storeAfterKill.hydrate();
    const corruptReport = storeAfterKill.getLastHydrationReport();
    record(corruptReport !== null && corruptReport.corruptKeys.length === 1, 'P: corrupt rows are reported, not silently swallowed');
    // Recovery continues coherently after reopen.
    const engineAfter = createUploadEngine({
      store: storeAfterKill,
      uploadTransport: makeTransport(backend),
      getAccessToken: () => 'tok',
      getHouseholdId: () => 'hh-1',
    });
    const done = await engineAfter.run(jobP.id);
    record(done.state === 'completed', 'P: recovery continues the restored job to completion');
  }

  // ── Q/R/S/T. deleted hazards absent ──
  {
    resetAll();
    const engineSrc = readSource('front/mi-front-limpio/services/homecloud/homecloudUploadEngine.ts');
    const downloadSrc = readSource('front/mi-front-limpio/services/homecloud/homecloudDownloadService.ts');
    record(!engineSrc.includes('createFetchArtifactReader'), 'Q: createFetchArtifactReader absent');
    record(!engineSrc.includes('normalizeSignedUploadUrlForRuntime') && !downloadSrc.includes('normalizeSignedStorageUrlForRuntime'), 'R: signed-URL host rewriting absent');
    record(!/fetch\(localUri\)|fetch\(.*localUri.*\)/.test(engineSrc) && !engineSrc.includes('arrayBuffer()'), 'S: no whole-file JS heap fallback in the upload path');
    record(!downloadSrc.includes('arrayBuffer(') && downloadSrc.includes('File.createDownloadTask'), 'S: download stays native file-to-file');
    const fileServiceSrc = readSource('front/mi-front-limpio/services/homecloud/homecloudFileIntakeService.ts');
    const memoryServiceSrc = readSource('front/mi-front-limpio/services/homecloud/homecloudMemoryIntakeService.ts');
    record(!fileServiceSrc.includes('createFetchArtifactReader') && !memoryServiceSrc.includes('createFetchArtifactReader'), 'S: no intake service wires a fetch reader');
    let devGone = false;
    try {
      fs.accessSync(path.join(root, 'front/mi-front-limpio/screens/HomeCloudFileIntakeDevScreen.tsx'));
    } catch {
      devGone = true;
    }
    const navigatorSrc = readSource('front/mi-front-limpio/navigation/AppNavigator.tsx');
    const moreSrc = readSource('front/mi-front-limpio/screens/MoreScreen.tsx');
    record(devGone, 'T: historic dev intake screen file absent');
    record(!navigatorSrc.includes('HomeCloudFileIntakeDev'), 'T: dev screen navigation registration absent');
    record(!moreSrc.includes('HomeCloudFileIntakeDev'), 'T: dev screen entry point absent');
  }

  console.log(`\nHOMECLOUD_T1_QUEUE_PERSISTENCE_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    console.error('HOMECLOUD_T1_QUEUE_PERSISTENCE_TESTS=FAIL');
    process.exitCode = 1;
  } else {
    console.log('HOMECLOUD_T1_QUEUE_PERSISTENCE_TESTS=PASS');
  }
}

void main();

export {};
