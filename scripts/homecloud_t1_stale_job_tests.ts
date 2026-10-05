/**
 * HomeCloud T1 — STALE JOB RECONCILIATION + PER-JOB UI OWNERSHIP.
 *
 * Behavioural tests (compiled, no emulator, fakes behind the global fetch and
 * a fake AsyncStorage). They pin the two device failures:
 *
 *   A. POISON STALE JOB — `homecloud_not_staging` is a DOMAIN refusal, never a
 *      transient condition. It must not be re-read as "not verified" (which
 *      turned into a PUT), must not auto-loop through pump/recovery/reconnect,
 *      and must never be declared completed from the 409 alone.
 *   B. UI FAILURE CONTAMINATION — a Review projects state/error ONLY for the
 *      job it accepted; a stale failed job of the same role can never paint
 *      its error over it.
 *
 * Run: `EXPO_PUBLIC_API_URL=http://localhost:9999 NODE_PATH=<repo>/tests/stubs
 *   node scripts/compiled/scripts/homecloud_t1_stale_job_tests.js`
 * (compile first via `npm exec tsc -- -p scripts/tsconfig.test.json`).
 */

import { createUploadEngine } from '../front/mi-front-limpio/services/homecloud/homecloudUploadEngine';
import { createUploadJob, transition, canTransition } from '../front/mi-front-limpio/services/homecloud/homecloudUploadJob';
import { createSharedUploadQueue, __resetSharedUploadQueueForTests } from '../front/mi-front-limpio/services/homecloud/homecloudUploadQueue';
import {
  ensureUploadCoordinator,
  getUploadCoordinator,
  isCoordinatorEligibleJob,
  __resetUploadCoordinatorsForTests,
} from '../front/mi-front-limpio/services/homecloud/homecloudUploadCoordinator';
import {
  ensureHomeCloudUploadRuntime,
  __resetUploadRuntimeForTests,
} from '../front/mi-front-limpio/services/homecloud/homecloudUploadRuntime';
import {
  __resetUploadRecoveryForTests,
  recoverUploadJobs,
} from '../front/mi-front-limpio/services/homecloud/homecloudUploadRecovery';
import {
  classifyUploadFailure,
  isStaleLifecycleError,
} from '../front/mi-front-limpio/services/homecloud/homecloudUploadFailure';
import { createMemoryIntakeService } from '../front/mi-front-limpio/services/homecloud/homecloudMemoryIntakeService';
import { createFileIntakeService } from '../front/mi-front-limpio/services/homecloud/homecloudFileIntakeService';
import type {
  BinaryMemoryDraft,
  BinaryMemoryMetadata,
  MemoryIntakeState,
} from '../front/mi-front-limpio/services/homecloud/homecloudMemoryIntakeTypes';
import type { FileIntakeState } from '../front/mi-front-limpio/services/homecloud/homecloudFileIntakeTypes';
import type { UploadJob } from '../front/mi-front-limpio/services/homecloud/homecloudUploadTypes';
import {
  createAsyncStorageUploadJobStore,
  __setSharedUploadJobStoreForTests,
} from '../front/mi-front-limpio/storage/homecloudUploadJobStorage';

(globalThis as unknown as { __DEV__?: boolean }).__DEV__ ??= false;

let passCount = 0;
let failCount = 0;

function record(ok: boolean, message: string) {
  if (ok) { passCount += 1; console.log(`  PASS: ${message}`); }
  else { failCount += 1; console.error(`  FAIL: ${message}`); }
}

const STALE_CONTENT = '2cd58b17-e222-412b-bd66-48abf0781fee';
const STALE_MESSAGE = 'El contenido ya no está en estado de ingesta.';

// ── Fake AsyncStorage ───────────────────────────────────────────────────────

function fakeAsyncStorage() {
  const map = new Map<string, string>();
  return {
    map,
    async getItem(key: string) { return map.has(key) ? map.get(key)! : null; },
    async setItem(key: string, value: string) { map.set(key, value); },
    async removeItem(key: string) { map.delete(key); },
    async getAllKeys() { return [...map.keys()]; },
  };
}

// ── Fake HomeCloud backend ──────────────────────────────────────────────────

interface Backend {
  counts: { register: number; uploadAuth: number; verify: number; finalize: number; put: number };
  /** contentIds the server answers `homecloud_not_staging` for. */
  stale: Set<string>;
  /** stale contentIds the server reports as already ACTIVE (finalize replays OK). */
  staleButActive: Set<string>;
  uploaded: Set<string>;
  next: number;
}

function makeBackend(): Backend {
  return { counts: { register: 0, uploadAuth: 0, verify: 0, finalize: 0, put: 0 }, stale: new Set(), staleButActive: new Set(), uploaded: new Set(), next: 0 };
}

function installFetch(backend: Backend) {
  (globalThis as unknown as { fetch: typeof fetch }).fetch = (async (url: unknown, init?: { method?: string }) => {
    const pathOnly = String(url).replace(/^https?:\/\/[^/]+/, '');
    const method = (init?.method ?? 'GET').toUpperCase();
    const json = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    const notStaging = (message = STALE_MESSAGE) => json(409, { code: 'homecloud_not_staging', message });

    if (pathOnly === '/api/homecloud/register' && method === 'POST') {
      backend.counts.register += 1;
      backend.next += 1;
      return json(200, { content: { id: `content-${backend.next}`, role: 'memory' } });
    }
    const upload = pathOnly.match(/^\/api\/homecloud\/content\/([^/]+)\/upload$/);
    if (upload && method === 'POST') {
      backend.counts.uploadAuth += 1;
      if (backend.stale.has(upload[1])) return notStaging();
      // The real flow authorizes a single object and the client PUTs it, so a
      // later verify of an authorized content finds the original in storage.
      backend.uploaded.add(upload[1]);
      return json(200, { signedUploadUrl: `https://storage.test/${upload[1]}/original`, path: `hh-1/${upload[1]}/original`, expiresIn: 7200, contentId: upload[1] });
    }
    const verify = pathOnly.match(/^\/api\/homecloud\/content\/([^/]+)\/verify$/);
    if (verify && method === 'POST') {
      backend.counts.verify += 1;
      if (backend.stale.has(verify[1])) return notStaging();
      return json(200, { verified: backend.uploaded.has(verify[1]) });
    }
    const finalize = pathOnly.match(/^\/api\/homecloud\/content\/([^/]+)\/finalize$/);
    if (finalize && method === 'POST') {
      backend.counts.finalize += 1;
      // Idempotent server contract: an ACTIVE content replays finalize as 200.
      if (backend.stale.has(finalize[1])) {
        if (backend.staleButActive.has(finalize[1])) return json(200, { content: { id: finalize[1], role: 'memory' } });
        return notStaging('El contenido no puede finalizarse desde su estado actual.');
      }
      return json(200, { content: { id: finalize[1], role: 'memory' } });
    }
    return json(404, { code: 'not_found', message: `unexpected ${method} ${pathOnly}` });
  }) as typeof fetch;
}

function memoryArtifact(name: string) {
  return { localUri: `file:///durable/${name}.jpg`, displayName: `${name}.jpg`, mimeType: 'image/jpeg', sizeBytes: 1024, extension: 'jpg' };
}

function fileArtifact(name: string) {
  return { localUri: `file:///durable/${name}.pdf`, displayName: `${name}.pdf`, mimeType: 'application/pdf', sizeBytes: 2048, extension: 'pdf' };
}

const CAPABILITIES = { view: true, contribute: true, organize: true, delete: true, anyWrite: true };

const EMPTY_METADATA: BinaryMemoryMetadata = {
  caption: null,
  initialAlbumId: null,
  capturedAt: null,
  capturedYear: null,
  capturedMonth: null,
  capturePrecision: 'unknown',
};

function cameraDraft(name: string): BinaryMemoryDraft {
  return {
    artifact: memoryArtifact(name),
    source: 'camera',
    capture: { capturedAt: null, capturedYear: null, capturedMonth: null, capturePrecision: 'unknown' },
  };
}

/** A durable job already parked mid-lifecycle owning `contentId` (device fixture). */
function staleFixture(contentId: string, name: string): UploadJob {
  const base = createUploadJob('hh-1', { role: 'memory', intakeSource: 'memories:picker' }, memoryArtifact(name));
  const registered = transition(transition(base, 'registering'), 'registered', { contentId });
  return transition(registered, 'uploading');
}

function resetWorld() {
  __resetSharedUploadQueueForTests();
  __resetUploadCoordinatorsForTests();
  __resetUploadRecoveryForTests();
  __resetUploadRuntimeForTests();
}

async function main() {
  console.log('\n=== HOMECLOUD T1 STALE JOB / UI OWNERSHIP TESTS ===\n');

  // ── 0. The frozen FSM really does reject failed -> failed (root cause) ──
  {
    record(canTransition('failed', 'failed') === false, '0: the 9-state FSM rejects failed -> failed (why a retry failure could not be persisted)');
  }

  // ── 1. verify-first receiving homecloud_not_staging never spends a PUT ──
  {
    resetWorld();
    const backend = makeBackend();
    backend.stale.add(STALE_CONTENT);
    backend.staleButActive.add(STALE_CONTENT);
    installFetch(backend);
    const device = fakeAsyncStorage();
    const store = createAsyncStorageUploadJobStore(device);
    const job = staleFixture(STALE_CONTENT, 'verify-first');
    await store.putAsync(job);
    let transportCalls = 0;
    const engine = createUploadEngine({
      store,
      uploadTransport: async () => { transportCalls += 1; return { status: 200, ok: true }; },
      getAccessToken: () => 'tok',
      getHouseholdId: () => 'hh-1',
    });
    const queue = createSharedUploadQueue({ store, householdId: 'hh-1', run: (id) => engine.run(id) });
    await queue.pump();
    record(transportCalls === 0, '1: verify-first homecloud_not_staging → uploadTransport NOT invoked');
    record(backend.counts.uploadAuth === 0, '1: verify-first homecloud_not_staging → no upload-authorization request either');
    record(backend.counts.verify === 1, '1: exactly one verify attempt, no verify/upload ping-pong');
  }

  // ── 2. homecloud_not_staging parks the job terminal, retryable = false ──
  {
    resetWorld();
    const backend = makeBackend();
    backend.stale.add(STALE_CONTENT);
    installFetch(backend);
    const device = fakeAsyncStorage();
    const store = createAsyncStorageUploadJobStore(device);
    const job = staleFixture(STALE_CONTENT, 'terminal');
    await store.putAsync(job);
    const engine = createUploadEngine({
      store,
      uploadTransport: async () => ({ status: 200, ok: true }),
      getAccessToken: () => 'tok',
      getHouseholdId: () => 'hh-1',
    });
    const queue = createSharedUploadQueue({ store, householdId: 'hh-1', run: (id) => engine.run(id) });
    await queue.pump();
    const parked = store.get(job.id)!;
    const durable = JSON.parse(device.map.get(`homecloud:upload-job:${job.id}`) ?? '{}') as UploadJob;
    record(parked.state === 'failed', `2: stale job parks as failed (state=${parked.state})`);
    record(parked.error?.retryable === false, '2: stale job error.retryable === false');
    record(parked.error?.code === 'homecloud_not_staging', '2: the terminal error keeps the server domain code');
    record(durable.state === 'failed' && durable.error?.retryable === false, '2: the terminal failure is DURABLE (not only in memory)');
    record(isCoordinatorEligibleJob(parked) === false, '2: a terminal stale job is not coordinator-eligible');
    record(classifyUploadFailure({ code: 'homecloud_not_staging', status: 409, message: STALE_MESSAGE }) === 'terminal', '2: homecloud_not_staging classifies as terminal');
    record(isStaleLifecycleError({ code: 'homecloud_not_staging', status: 409, message: STALE_MESSAGE }) === true, '2: homecloud_not_staging is recognised as the stale lifecycle signal');
  }

  // ── 3. a terminal stale job is never selected again (20 pumps) ──
  {
    resetWorld();
    const backend = makeBackend();
    backend.stale.add(STALE_CONTENT);
    installFetch(backend);
    const device = fakeAsyncStorage();
    const store = createAsyncStorageUploadJobStore(device);
    const job = staleFixture(STALE_CONTENT, 'no-reselect');
    await store.putAsync(job);
    const engine = createUploadEngine({
      store,
      uploadTransport: async () => ({ status: 200, ok: true }),
      getAccessToken: () => 'tok',
      getHouseholdId: () => 'hh-1',
    });
    const queue = createSharedUploadQueue({ store, householdId: 'hh-1', run: (id) => engine.run(id) });
    await queue.pump();
    const afterFirst = { ...backend.counts };
    let selections = 0;
    for (let i = 0; i < 20; i += 1) {
      await queue.pump();
      if (getUploadCoordinator('hh-1')!.getSnapshot().activeJobId === job.id) selections += 1;
    }
    const total = backend.counts.verify + backend.counts.uploadAuth + backend.counts.finalize;
    record(total === afterFirst.verify + afterFirst.uploadAuth + afterFirst.finalize, `3: 20 further pumps issue ZERO new requests for the stale content (total=${total})`);
    record(selections === 0, `3: the terminal stale job is never selected again (selections=${selections})`);
  }

  // ── 4. reconnect x20 never retries the stale job ──
  {
    resetWorld();
    const backend = makeBackend();
    backend.stale.add(STALE_CONTENT);
    installFetch(backend);
    const device = fakeAsyncStorage();
    const store = createAsyncStorageUploadJobStore(device);
    const job = staleFixture(STALE_CONTENT, 'reconnect');
    await store.putAsync(job);
    let runs = 0;
    const engine = createUploadEngine({
      store,
      uploadTransport: async () => ({ status: 200, ok: true }),
      getAccessToken: () => 'tok',
      getHouseholdId: () => 'hh-1',
    });
    const runtime = ensureHomeCloudUploadRuntime({
      store,
      householdId: 'hh-1',
      run: (id) => { runs += 1; return engine.run(id); },
      sweepOrphans: async () => undefined,
      connectivity: { currentOnline: async () => true, subscribe: () => () => undefined },
    });
    await runtime.start();
    for (let i = 0; i < 20; i += 1) { runtime.notifyOffline(); await runtime.notifyOnline(); }
    await recoverUploadJobs({ store, householdId: 'hh-1', run: (id) => { runs += 1; return engine.run(id); } });
    record(runs === 1, `4: startup + 20 reconnects + a recovery pass execute the stale job exactly once (runs=${runs})`);
    record(backend.counts.uploadAuth === 0, '4: no upload authorization is ever requested for the stale content');
  }

  // ── 5. a job already `failed` + retryable (legacy row) stays manual-only ──
  {
    resetWorld();
    const backend = makeBackend();
    backend.stale.add(STALE_CONTENT);
    installFetch(backend);
    const device = fakeAsyncStorage();
    const store = createAsyncStorageUploadJobStore(device);
    // Durable row left behind by an older build: failed + transient flag.
    const job = { ...staleFixture(STALE_CONTENT, 'legacy-failed'), state: 'failed' as const, error: { code: 'upload_engine_error', message: 'network', retryable: true } };
    await store.putAsync(job);
    const engine = createUploadEngine({
      store,
      uploadTransport: async () => ({ status: 200, ok: true }),
      getAccessToken: () => 'tok',
      getHouseholdId: () => 'hh-1',
    });
    const queue = createSharedUploadQueue({ store, householdId: 'hh-1', run: (id) => engine.run(id) });
    await queue.pump();
    const afterFirst = { ...backend.counts };
    for (let i = 0; i < 20; i += 1) await queue.pump();
    const final = store.get(job.id)!;
    record(backend.counts.verify === 0 && backend.counts.verify === afterFirst.verify, `5: a failed+retryable legacy row is never automatically selected (verify=${backend.counts.verify})`);
    record(final.error?.retryable === true && isCoordinatorEligibleJob(final) === false, '5: retryable remains an actionable UI marker, not automatic eligibility');
  }

  // ── 6. reconciliation proves completion instead of trusting the 409 ──
  {
    resetWorld();
    const backend = makeBackend();
    backend.stale.add(STALE_CONTENT);
    backend.staleButActive.add(STALE_CONTENT);
    installFetch(backend);
    const device = fakeAsyncStorage();
    const store = createAsyncStorageUploadJobStore(device);
    const job = staleFixture(STALE_CONTENT, 'reconcile');
    await store.putAsync(job);
    const cleaned: string[] = [];
    const engine = createUploadEngine({
      store,
      uploadTransport: async () => ({ status: 200, ok: true }),
      getAccessToken: () => 'tok',
      getHouseholdId: () => 'hh-1',
      cleanupDurableArtifact: async (artifact) => { cleaned.push(artifact.localUri); },
    });
    const queue = createSharedUploadQueue({ store, householdId: 'hh-1', run: (id) => engine.run(id) });
    await queue.pump();
    const reconciled = store.get(job.id)!;
    record(reconciled.state === 'completed', `6: an ACTIVE stale content reconciles to completed (state=${reconciled.state})`);
    record(reconciled.contentId === STALE_CONTENT, '6: the reconciled job keeps its own contentId (never retargeted)');
    record(backend.counts.finalize === 1, '6: reconciliation spends exactly ONE bounded finalize read-back');
    record(cleaned.includes(job.artifact.localUri), '6: the reconciled job releases its durable workspace bytes');

    // Same 409, but the content is NOT active: completion must NOT be declared.
    resetWorld();
    const backend2 = makeBackend();
    backend2.stale.add(STALE_CONTENT);
    installFetch(backend2);
    const store2 = createAsyncStorageUploadJobStore(fakeAsyncStorage());
    const job2 = staleFixture(STALE_CONTENT, 'no-proof');
    await store2.putAsync(job2);
    const engine2 = createUploadEngine({
      store: store2,
      uploadTransport: async () => ({ status: 200, ok: true }),
      getAccessToken: () => 'tok',
      getHouseholdId: () => 'hh-1',
    });
    const queue2 = createSharedUploadQueue({ store: store2, householdId: 'hh-1', run: (id) => engine2.run(id) });
    await queue2.pump();
    const unproven = store2.get(job2.id)!;
    record(unproven.state === 'failed' && unproven.error?.retryable === false, '6: without proof of completion the job is terminal-failed, never completed');
    record(backend2.counts.finalize === 1, '6: the unprovable stale job spends the same single bounded read-back');
  }

  // ── 7. a fresh job still completes register → upload → verify → finalize ──
  {
    resetWorld();
    const backend = makeBackend();
    installFetch(backend);
    const store = createAsyncStorageUploadJobStore(fakeAsyncStorage());
    const order: string[] = [];
    const engine = createUploadEngine({
      store,
      uploadTransport: async ({ signedUploadUrl }) => {
        order.push('put');
        const id = signedUploadUrl.match(/storage\.test\/([^/]+)\/original/)?.[1];
        if (id) backend.uploaded.add(id);
        return { status: 200, ok: true };
      },
      getAccessToken: () => 'tok',
      getHouseholdId: () => 'hh-1',
    });
    const queue = createSharedUploadQueue({ store, householdId: 'hh-1', run: (id) => engine.run(id) });
    const job = await queue.enqueue({ role: 'memory', intakeSource: 'memories:picker' }, memoryArtifact('fresh'));
    await queue.pump();
    const done = store.get(job.id)!;
    record(done.state === 'completed', `7: a fresh job still completes end-to-end (state=${done.state})`);
    record(backend.counts.register === 1 && backend.counts.uploadAuth === 1 && backend.counts.verify === 1 && backend.counts.finalize === 1,
      `7: exactly one register/upload-auth/verify/finalize (${JSON.stringify(backend.counts)})`);
    record(order.length === 1, '7: the native transport ran exactly once');
  }

  // ── 8. legacy duplicate backlog drains FIFO, stale terminal never blocks ──
  {
    resetWorld();
    const backend = makeBackend();
    backend.stale.add(STALE_CONTENT);
    installFetch(backend);
    const device = fakeAsyncStorage();
    const store = createAsyncStorageUploadJobStore(device);
    const engine = createUploadEngine({
      store,
      uploadTransport: async ({ signedUploadUrl }) => {
        const id = signedUploadUrl.match(/storage\.test\/([^/]+)\/original/)?.[1];
        if (id) backend.uploaded.add(id);
        return { status: 200, ok: true };
      },
      getAccessToken: () => 'tok',
      getHouseholdId: () => 'hh-1',
    });
    const queue = createSharedUploadQueue({ store, householdId: 'hh-1', run: (id) => engine.run(id) });
    // Historical duplicates from the broken build, queued BEFORE the fresh ones.
    const legacy: UploadJob[] = [];
    for (let i = 1; i <= 3; i += 1) {
      const j = await queue.enqueue({ role: 'file', intakeSource: 'files:picker' }, {
        localUri: `file:///durable/legacy-${i}.pdf`, displayName: `legacy-${i}.pdf`, mimeType: 'application/pdf', sizeBytes: 512, extension: 'pdf',
      });
      legacy.push(store.get(j.id)!);
    }
    const stale = staleFixture(STALE_CONTENT, 'blocking');
    await store.putAsync(stale);
    const fresh: UploadJob[] = [];
    for (let i = 1; i <= 2; i += 1) {
      const j = await queue.enqueue({ role: 'memory', intakeSource: 'memories:picker' }, memoryArtifact(`fresh-${i}`));
      fresh.push(store.get(j.id)!);
    }
    await queue.pump();
    const legacyDone = legacy.map((j) => store.get(j.id)!.state);
    const freshDone = fresh.map((j) => store.get(j.id)!.state);
    record(legacyDone.every((s) => s === 'completed'), `8: legacy duplicate backlog drains to completion (${legacyDone.join(',')})`);
    record(freshDone.every((s) => s === 'completed'), `8: jobs queued behind the stale terminal job still complete (${freshDone.join(',')})`);
    record(store.get(stale.id)!.state === 'failed', '8: the stale terminal job stays terminal and blocks nothing');
    const finalizesForFresh = backend.counts.finalize;
    for (let i = 0; i < 5; i += 1) await queue.pump();
    record(backend.counts.finalize === finalizesForFresh, '8: further pumps re-run nothing (no stale re-entry)');
  }

  // ── 9/10. Memory UI ownership: the Review projects ITS OWN job only ──
  {
    resetWorld();
    const backend = makeBackend();
    backend.stale.add(STALE_CONTENT);
    installFetch(backend);
    const device = fakeAsyncStorage();
    const store = createAsyncStorageUploadJobStore(device);
    __setSharedUploadJobStoreForTests(store);

    // Stale job A: older, memory role, terminally failed with the 409 message.
    const jobA = { ...staleFixture(STALE_CONTENT, 'stale-a'), state: 'failed' as const, error: { code: 'homecloud_not_staging', message: STALE_MESSAGE, retryable: false } };
    await store.putAsync(jobA);

    const service = createMemoryIntakeService({
      householdId: 'hh-1',
      accessToken: 'tok',
      capabilities: CAPABILITIES,
      getAccessToken: () => 'tok',
      intakeSource: 'memories:camera',
    });
    const seen: MemoryIntakeState[] = [];
    service.subscribe((state) => seen.push({ ...state }));

    await service.createBinaryMemory(cameraDraft('camera-b'), EMPTY_METADATA);
    const acceptedJobId = service.getAcceptedJobId();
    record(acceptedJobId !== null && acceptedJobId !== jobA.id, '9: the Review binds to the job it accepted, not to the stale job');
    // Let the accepted job drain through the coordinator.
    for (let i = 0; i < 10 && store.get(acceptedJobId!)?.state !== 'completed'; i += 1) {
      await ensureUploadCoordinator({ store, householdId: 'hh-1', run: () => Promise.reject(new Error('unused')) }).requestPump('test');
      await new Promise((r) => setTimeout(r, 20));
    }
    const accepted = store.get(acceptedJobId!)!;
    record(accepted.state === 'completed', `9: the accepted job B completes (state=${accepted.state})`);
    record(!seen.some((s) => s.status === 'failed'), '9: the Review NEVER emitted failed while stale job A was failing');

    // Stale job A changes again AFTER B completed: B's UI must not move.
    const before = seen[seen.length - 1];
    await store.putAsync({ ...store.get(jobA.id)!, error: { code: 'homecloud_not_staging', message: `${STALE_MESSAGE} (otro intento)`, retryable: false } });
    getUploadCoordinator('hh-1')!.notifyJob();
    const after = seen[seen.length - 1];
    record(after.status === before.status && after.contentId === before.contentId && after.error === before.error,
      `10: a later failure of stale job A never overwrites B's projected UI (${before.status}/${String(before.contentId)} → ${after.status}/${String(after.contentId)})`);
    record(after.status === 'completed' && after.contentId === accepted.contentId, '10: B stays completed on its own contentId');

    // A fresh, unsubmitted Review must not look busy because of a stale job.
    resetWorld();
    const backend2 = makeBackend();
    backend2.stale.add(STALE_CONTENT);
    installFetch(backend2);
    const store2 = createAsyncStorageUploadJobStore(fakeAsyncStorage());
    __setSharedUploadJobStoreForTests(store2);
    await store2.putAsync(jobA);
    const idle = createMemoryIntakeService({
      householdId: 'hh-1',
      accessToken: 'tok',
      capabilities: CAPABILITIES,
      getAccessToken: () => 'tok',
      intakeSource: 'memories:camera',
    });
    record(idle.hasActiveJob() === false, '10: a stale job in the household never makes an unsubmitted Review look active');
    __setSharedUploadJobStoreForTests(null);
  }

  // ── 11. Durable acceptance detaches from execution + rapid submit ──
  {
    resetWorld();
    const backend = makeBackend();
    installFetch(backend);
    const installedFetch = globalThis.fetch;
    let releaseRegister!: () => void;
    const registerGate = new Promise<void>((resolve) => { releaseRegister = resolve; });
    (globalThis as unknown as { fetch: typeof fetch }).fetch = (async (url: unknown, init?: RequestInit) => {
      if (String(url).includes('/api/homecloud/register')) await registerGate;
      return installedFetch(url as RequestInfo | URL, init);
    }) as typeof fetch;
    const store = createAsyncStorageUploadJobStore(fakeAsyncStorage());
    __setSharedUploadJobStoreForTests(store);
    const service = createMemoryIntakeService({ householdId: 'hh-1', accessToken: 'tok', capabilities: CAPABILITIES, getAccessToken: () => 'tok', intakeSource: 'memories:camera' });
    const draft = cameraDraft('accept-detach');
    const attempt = { id: 'attempt-one', source: 'camera' as const, kind: 'image' as const, label: 'camera_photo' as const };
    const accepted = await Promise.all(Array.from({ length: 20 }, () => service.createBinaryMemory(draft, EMPTY_METADATA, attempt)));
    const jobs = store.all().filter((job) => job.role === 'memory');
    record(jobs.length === 1, `11: 20 rapid submits create exactly one durable job (jobs=${jobs.length})`);
    record(new Set(accepted).size === 1 && accepted[0] === jobs[0]?.id, '11: all rapid submits join one acceptedJobId');
    record(new Set(jobs.map((job) => job.intakeRequestId)).size === 1, '11: one accepted draft owns exactly one intakeRequestId');
    record(jobs[0]?.state !== 'completed' && backend.counts.register === 0, '11: acceptance resolves while register/upload remain blocked');
    // Presentation detach never cancels the accepted durable job.
    service.dismiss();
    record(store.get(jobs[0].id)?.state !== 'cancelled', '11: dismiss after acceptance does not cancel the job');
    releaseRegister();
    await getUploadCoordinator('hh-1')!.requestPump('test-drain');
    record(store.get(jobs[0].id)?.state === 'completed', '11: detached job continues to completion');
    __setSharedUploadJobStoreForTests(null);
  }

  // ── 12. File picker return always releases the local gate before upload ──
  {
    resetWorld();
    const backend = makeBackend();
    installFetch(backend);
    const installedFetch = globalThis.fetch;
    let releaseRegister!: () => void;
    const registerGate = new Promise<void>((resolve) => { releaseRegister = resolve; });
    (globalThis as unknown as { fetch: typeof fetch }).fetch = (async (url: unknown, init?: RequestInit) => {
      if (String(url).includes('/api/homecloud/register')) await registerGate;
      return installedFetch(url as RequestInfo | URL, init);
    }) as typeof fetch;
    const store = createAsyncStorageUploadJobStore(fakeAsyncStorage());
    __setSharedUploadJobStoreForTests(store);
    let pickerCalls = 0;
    let resolvePicker!: (value: { success: true; artifact: ReturnType<typeof fileArtifact> }) => void;
    const pendingPicker = new Promise<{ success: true; artifact: ReturnType<typeof fileArtifact> }>((resolve) => { resolvePicker = resolve; });
    const states: FileIntakeState[] = [];
    const service = createFileIntakeService(
      { householdId: 'hh-1', accessToken: 'tok', capabilities: CAPABILITIES, getAccessToken: () => 'tok', intakeSource: 'files:picker' },
      { pickFile: async () => { pickerCalls += 1; return pendingPicker; }, copyToDurableWorkspace: async (artifact) => artifact },
    );
    service.subscribe((state) => states.push({ ...state }));
    const firstPick = service.pickFile();
    await service.pickFile();
    record(pickerCalls === 1, '12: a pending picker ignores re-entry, including an inactive/active return race');
    resolvePicker({ success: true, artifact: fileArtifact('picker-return') });
    await firstPick;
    const acceptedJobId = service.getAcceptedJobId();
    record(acceptedJobId !== null && store.get(acceptedJobId)?.state !== 'completed' && backend.counts.register === 0,
      '12: file acceptance persists before upload completion and releases the picker state');
    record(states[states.length - 1]?.status !== 'picking', '12: resolved picker never leaves FileIntake in selecting state');

    // A cancelled native picker is terminal for that attempt only; a new one may
    // open immediately. The same holds for a thrown picker error.
    let recoveryCalls = 0;
    const recoveryStates: FileIntakeState[] = [];
    const recovery = createFileIntakeService(
      { householdId: 'hh-2', accessToken: 'tok', capabilities: CAPABILITIES, getAccessToken: () => 'tok', intakeSource: 'files:picker' },
      {
        pickFile: async () => {
          recoveryCalls += 1;
          if (recoveryCalls === 1) return { success: false, cancelled: true };
          if (recoveryCalls === 2) throw new Error('native picker closed unexpectedly');
          return { success: false, cancelled: true };
        },
      },
    );
    recovery.subscribe((state) => recoveryStates.push({ ...state }));
    await recovery.pickFile();
    await recovery.pickFile();
    await recovery.pickFile();
    record(recoveryCalls === 3, '12: cancel and picker error both release the guard so the picker reopens');
    record(recoveryStates[recoveryStates.length - 1]?.status === 'cancelled', '12: reopened picker returns a coherent non-blocking state');
    releaseRegister();
    await getUploadCoordinator('hh-1')!.requestPump('file-picker-test-drain');
    record(store.get(acceptedJobId!)?.state === 'completed', '12: accepted File job continues after its intake detaches');
    __setSharedUploadJobStoreForTests(null);
  }

  console.log(`\nHOMECLOUD_T1_STALE_JOB_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    console.error('HOMECLOUD_T1_STALE_JOB_TESTS=FAIL');
    process.exitCode = 1;
  } else {
    console.log('HOMECLOUD_T1_STALE_JOB_TESTS=PASS');
  }
}

void main();

export {};
