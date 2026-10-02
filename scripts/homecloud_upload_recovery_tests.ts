/**
 * HomeCloud — Shared Upload Engine runtime recovery tests (compiled).
 *
 * P1 shared intake defect: register 201 + upload 200, then the client never
 * reached verify/finalize (remount/lazy-reload discarded the engine closure
 * while durable state could not resume it). These tests prove, with fakes and
 * no emulator:
 *
 *  A. interruption after register      -> resume does not register twice
 *  B. interruption after successful PUT -> resume continues at verify/finalize
 *  C. reload with job in verifying      -> completes safely
 *  D. reload with job in finalizing     -> completes safely/idempotently
 *  E. retry failed upload               -> same job/content_id
 *  F. no concurrent duplicate runner    (engine + recovery single-flight)
 *  G. terminal completed job            -> never reruns
 *  H. household/user scope isolation
 *  I. ordinary picker filename          -> `.pdf` exactly once
 *
 * Run: `EXPO_PUBLIC_API_URL=http://localhost:9999 node
 *   scripts/compiled/scripts/homecloud_upload_recovery_tests.js`
 * (compile first via `npm exec tsc -- -p scripts/tsconfig.test.json`).
 */

import { createUploadEngine } from '../front/mi-front-limpio/services/homecloud/homecloudUploadEngine';
import { transition } from '../front/mi-front-limpio/services/homecloud/homecloudUploadJob';
import {
  AUTO_RECOVERABLE_STATES,
  __resetUploadRecoveryForTests,
  listRecoverableJobs,
  recoverUploadJobs,
} from '../front/mi-front-limpio/services/homecloud/homecloudUploadRecovery';
import { ensureSingleExtension } from '../front/mi-front-limpio/services/homecloud/homecloudPickerNaming';
import { createInMemoryUploadJobStore } from '../front/mi-front-limpio/storage/homecloudUploadJobStorage';
import type { UploadJob } from '../front/mi-front-limpio/services/homecloud/homecloudUploadTypes';

let passCount = 0;
let failCount = 0;

function record(ok: boolean, message: string) {
  if (ok) { passCount += 1; console.log(`  PASS: ${message}`); }
  else { failCount += 1; console.error(`  FAIL: ${message}`); }
}

const ARTIFACT = {
  localUri: 'file:///durable/doc.pdf',
  displayName: 'doc.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 2048,
  extension: 'pdf',
};

interface FakeBackend {
  counts: { register: number; uploadAuth: number; verify: number; finalize: number; put: number };
  uploaded: Set<string>;
  byIntakeRequest: Map<string, string>;
  failUploadAuthOnce: boolean;
}

/** In-memory HomeCloud intake backend behind the global fetch stub. */
function makeBackend(): FakeBackend {
  return {
    counts: { register: 0, uploadAuth: 0, verify: 0, finalize: 0, put: 0 },
    uploaded: new Set(),
    byIntakeRequest: new Map(),
    failUploadAuthOnce: false,
  };
}

function installFetch(backend: FakeBackend) {
  (globalThis as unknown as { fetch: typeof fetch }).fetch = (async (url: unknown, init?: { method?: string; body?: string }) => {
    const raw = String(url);
    const method = (init?.method ?? 'GET').toUpperCase();
    const path = raw.replace(/^https?:\/\/[^/]+/, '');
    const json = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

    if (path === '/api/homecloud/register' && method === 'POST') {
      backend.counts.register += 1;
      const body = JSON.parse(init?.body ?? '{}') as { intakeRequestId?: string; role?: string };
      const key = body.intakeRequestId ?? '';
      const existing = backend.byIntakeRequest.get(key);
      if (existing) return json(200, { content: { id: existing, role: body.role ?? 'file' } });
      const id = `content-${backend.byIntakeRequest.size + 1}`;
      backend.byIntakeRequest.set(key, id);
      return json(200, { content: { id, role: body.role ?? 'file' } });
    }

    const uploadMatch = path.match(/^\/api\/homecloud\/content\/([^/]+)\/upload$/);
    if (uploadMatch && method === 'POST') {
      backend.counts.uploadAuth += 1;
      if (backend.failUploadAuthOnce) {
        backend.failUploadAuthOnce = false;
        return json(500, { code: 'boom', message: 'simulated upload-auth outage' });
      }
      const id = uploadMatch[1];
      return json(200, {
        signedUploadUrl: `https://storage.test/${id}/original`,
        path: `hh-1/${id}/original`,
        expiresIn: 7200,
        contentId: id,
      });
    }

    const verifyMatch = path.match(/^\/api\/homecloud\/content\/([^/]+)\/verify$/);
    if (verifyMatch && method === 'POST') {
      backend.counts.verify += 1;
      return json(200, { verified: backend.uploaded.has(verifyMatch[1]) });
    }

    const finalizeMatch = path.match(/^\/api\/homecloud\/content\/([^/]+)\/finalize$/);
    if (finalizeMatch && method === 'POST') {
      backend.counts.finalize += 1;
      return json(200, { content: { id: finalizeMatch[1], role: 'file' } });
    }

    return json(404, { code: 'not_found', message: `unexpected ${method} ${path}` });
  }) as typeof fetch;
}

function makeTransport(backend: FakeBackend) {
  return async ({ signedUploadUrl }: { signedUploadUrl: string; localUri: string; mimeType: string }) => {
    backend.counts.put += 1;
    const match = signedUploadUrl.match(/storage\.test\/([^/]+)\/original/);
    if (match) backend.uploaded.add(match[1]);
    return { status: 200, ok: true };
  };
}

function makeEngine(
  backend: FakeBackend,
  store: ReturnType<typeof createInMemoryUploadJobStore>,
  householdId = 'hh-1',
) {
  return createUploadEngine({
    store,
    uploadTransport: makeTransport(backend),
    getAccessToken: () => 'tok-test',
    getHouseholdId: () => householdId,
  });
}

function strandAtUploading(store: ReturnType<typeof createInMemoryUploadJobStore>, engine: ReturnType<typeof makeEngine>): UploadJob {
  const job = engine.createJob({ role: 'file', intakeSource: 'files:picker' }, ARTIFACT);
  let j: UploadJob = transition(job, 'registering');
  j = transition(j, 'registered', { contentId: 'content-stranded' });
  j = transition(j, 'uploading');
  store.put(j);
  return j;
}

async function main() {
  console.log('\n=== HOMECLOUD SHARED UPLOAD RUNTIME RECOVERY TESTS ===\n');

  // ── A. interruption after register -> resume does not register twice ──
  {
    __resetUploadRecoveryForTests();
    const backend = makeBackend();
    backend.failUploadAuthOnce = true;
    installFetch(backend);
    const store = createInMemoryUploadJobStore();
    const engine = makeEngine(backend, store);
    const job = engine.createJob({ role: 'file', intakeSource: 'files:picker' }, ARTIFACT);
    const intakeRequestId = job.intakeRequestId;
    await engine.run(job.id).catch(() => {});
    record(backend.counts.register === 1, 'A: first run registers once before the outage');
    const restart = makeEngine(backend, store); // new instance, same durable store
    backend.failUploadAuthOnce = false;
    const done = await restart.run(job.id);
    record(backend.counts.register === 1, 'A: resume after register never registers twice');
    record(done.state === 'completed', 'A: resumed job completes');
    record(done.intakeRequestId === intakeRequestId, 'A: intakeRequestId stable across resume');
  }

  // ── B. interruption after successful PUT -> resume at verify/finalize ──
  {
    __resetUploadRecoveryForTests();
    const backend = makeBackend();
    installFetch(backend);
    const store = createInMemoryUploadJobStore();
    const engine = makeEngine(backend, store);
    // Persisted reality at interruption: `uploading` + contentId (verifying
    // was never persisted), bytes already in storage.
    const stranded = strandAtUploading(store, engine);
    backend.uploaded.add('content-stranded');
    const done = await makeEngine(backend, store).run(stranded.id);
    record(backend.counts.register === 0, 'B: resume performs zero registers');
    record(backend.counts.put === 0, 'B: resume skips re-upload when verify proves the original');
    record(backend.counts.verify >= 1 && backend.counts.finalize === 1, 'B: resume continues at verify/finalize');
    record(done.state === 'completed' && done.contentId === 'content-stranded', 'B: stranded job completes on the SAME content');
  }

  // ── C. reload with job in verifying -> completes safely ──
  {
    __resetUploadRecoveryForTests();
    const backend = makeBackend();
    installFetch(backend);
    const store = createInMemoryUploadJobStore();
    const engine = makeEngine(backend, store);
    const stranded = strandAtUploading(store, engine);
    backend.uploaded.add('content-stranded');
    const verifying = transition(store.get(stranded.id)!, 'verifying');
    store.put(verifying);
    const done = await makeEngine(backend, store).run(stranded.id);
    record(backend.counts.register === 0 && backend.counts.put === 0, 'C: verifying resume needs no register/upload');
    record(done.state === 'completed', 'C: verifying job completes');
  }

  // ── D. reload with job in finalizing -> completes idempotently ──
  {
    __resetUploadRecoveryForTests();
    const backend = makeBackend();
    installFetch(backend);
    const store = createInMemoryUploadJobStore();
    const engine = makeEngine(backend, store);
    const stranded = strandAtUploading(store, engine);
    backend.uploaded.add('content-stranded');
    let j = transition(store.get(stranded.id)!, 'verifying');
    j = transition(j, 'finalizing');
    store.put(j);
    const done = await makeEngine(backend, store).run(stranded.id);
    record(done.state === 'completed' && backend.counts.finalize === 1, 'D: finalizing job completes with one finalize');
    const again = await makeEngine(backend, store).run(stranded.id);
    record(again.state === 'completed' && backend.counts.finalize === 1, 'D: rerun of completed job is a no-op (idempotent)');
  }

  // ── E. retry failed upload -> same job/content_id ──
  {
    __resetUploadRecoveryForTests();
    const backend = makeBackend();
    backend.failUploadAuthOnce = true;
    installFetch(backend);
    const store = createInMemoryUploadJobStore();
    const engine = makeEngine(backend, store);
    const job = engine.createJob({ role: 'file', intakeSource: 'files:picker' }, ARTIFACT);
    await engine.run(job.id).catch(() => {});
    const failed = store.get(job.id)!;
    record(failed.state === 'failed', 'E: outage parks the job in failed');
    const contentId = failed.contentId;
    record(contentId !== null, 'E: failed job keeps its contentId');
    backend.failUploadAuthOnce = false;
    const done = await makeEngine(backend, store).run(job.id);
    record(done.state === 'completed', 'E: retry of the same job completes');
    record(done.id === job.id && done.contentId === contentId, 'E: retry reuses the SAME job and content_id');
    record(backend.counts.register === 1, 'E: retry never registers a second content row');
  }

  // ── F. no concurrent duplicate runner ──
  {
    __resetUploadRecoveryForTests();
    const backend = makeBackend();
    installFetch(backend);
    const store = createInMemoryUploadJobStore();
    const engine = makeEngine(backend, store);
    const job = engine.createJob({ role: 'file', intakeSource: 'files:picker' }, ARTIFACT);
    const [r1, r2] = await Promise.all([engine.run(job.id), engine.run(job.id)]);
    record(r1.state === 'completed' && r2.state === 'completed', 'F: concurrent runs both resolve completed');
    record(backend.counts.register === 1 && backend.counts.put === 1 && backend.counts.finalize === 1, 'F: concurrent runs share ONE backend execution');

    const backend2 = makeBackend();
    installFetch(backend2);
    const store2 = createInMemoryUploadJobStore();
    const engine2 = makeEngine(backend2, store2);
    const job2 = engine2.createJob({ role: 'file', intakeSource: 'files:picker' }, ARTIFACT);
    // Park it mid-flight so recovery has something to resume.
    let parked = transition(job2, 'registering');
    parked = transition(parked, 'registered', { contentId: 'content-rec' });
    parked = transition(parked, 'uploading');
    store2.put(parked);
    backend2.uploaded.add('content-rec');
    let runs = 0;
    const countingRun = async (id: string) => { runs += 1; return engine2.run(id); };
    const [c1, c2] = await Promise.all([
      recoverUploadJobs({ store: store2, householdId: 'hh-1', role: 'file', run: countingRun }),
      recoverUploadJobs({ store: store2, householdId: 'hh-1', role: 'file', run: countingRun }),
    ]);
    record(c1.resumed === 1 && c2.resumed === 1, 'F: concurrent recoveries share one pass');
    record(runs === 1, 'F: recovery single-flight runs each job once');
  }

  // ── G. terminal completed job never reruns ──
  {
    __resetUploadRecoveryForTests();
    const backend = makeBackend();
    installFetch(backend);
    const store = createInMemoryUploadJobStore();
    const engine = makeEngine(backend, store);
    const job = engine.createJob({ role: 'file', intakeSource: 'files:picker' }, ARTIFACT);
    await engine.run(job.id);
    const countsAfter = { ...backend.counts };
    const again = await engine.run(job.id);
    record(again.state === 'completed', 'G: completed job stays completed');
    record(JSON.stringify(backend.counts) === JSON.stringify(countsAfter), 'G: rerun performs zero backend calls');
    const rec = await recoverUploadJobs({ store, householdId: 'hh-1', role: 'file', run: (id) => engine.run(id) });
    record(rec.resumed === 0, 'G: recovery skips terminal jobs');
  }

  // ── H. household/user scope isolation ──
  {
    __resetUploadRecoveryForTests();
    const backend = makeBackend();
    installFetch(backend);
    const store = createInMemoryUploadJobStore();
    const engineA = makeEngine(backend, store, 'hh-1');
    const engineB = makeEngine(backend, store, 'hh-2');
    const jobA = engineA.createJob({ role: 'file', intakeSource: 'files:picker' }, ARTIFACT);
    const jobB = engineB.createJob({ role: 'file', intakeSource: 'files:picker' }, ARTIFACT);
    void jobB;
    const mine = listRecoverableJobs(store, 'hh-1', 'file');
    record(mine.length === 1 && mine[0].id === jobA.id, 'H: recovery lists only same-household jobs');
    const otherHouseholdRun = makeEngine(backend, store, 'hh-9');
    let threw = false;
    try { await otherHouseholdRun.run(jobA.id); } catch { threw = true; }
    record(threw, 'H: cross-household execution is denied, never retargeted');
    record(AUTO_RECOVERABLE_STATES.has('failed') === false, 'H: failed jobs stay out of automatic resume (explicit retry only)');
  }

  // ── I. ordinary picker filename -> `.pdf` exactly once ──
  {
    record(ensureSingleExtension('SANJU- punto 1.pdf', 'pdf') === 'SANJU- punto 1.pdf', 'I: picker name keeps a single .pdf');
    record(ensureSingleExtension('SANJU- punto 1.pdf.pdf', 'pdf') === 'SANJU- punto 1.pdf', 'I: duplicated .pdf.pdf collapses to one');
    record(ensureSingleExtension('informe.PDF', 'pdf') === 'informe.pdf', 'I: extension match is case-insensitive');
    record(ensureSingleExtension('informe', 'pdf') === 'informe', 'I: extensionless names untouched');
    const twice = ensureSingleExtension(ensureSingleExtension('x.pdf.pdf', 'pdf'), 'pdf');
    record(twice === 'x.pdf', 'I: normalization is idempotent');
    record(ensureSingleExtension('foto.jpg', 'pdf') === 'foto.jpg', 'I: unrelated extension untouched');
  }

  // ── J. live token supplier crosses a refresh between engine steps ──
  {
    __resetUploadRecoveryForTests();
    const backend = makeBackend();
    const observedTokens: string[] = [];
    let token = 'token-A';
    (globalThis as unknown as { fetch: typeof fetch }).fetch = (async (url: unknown, init?: { method?: string; body?: string; headers?: HeadersInit }) => {
      const raw = String(url);
      const method = (init?.method ?? 'GET').toUpperCase();
      const path = raw.replace(/^https?:\/\/[^/]+/, '');
      const headers = new Headers(init?.headers);
      if (path.startsWith('/api/homecloud/')) observedTokens.push(headers.get('Authorization') ?? '');
      const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
      if (path === '/api/homecloud/register' && method === 'POST') {
        token = 'token-B'; // Supabase refresh completed after registration.
        return json(201, { content: { id: 'content-live-token', role: 'file' } });
      }
      if (path === '/api/homecloud/content/content-live-token/upload' && method === 'POST') return json(200, { signedUploadUrl: 'https://storage.test/content-live-token/original', contentId: 'content-live-token', expiresIn: 7200 });
      if (path === '/api/homecloud/content/content-live-token/verify' && method === 'POST') return json(200, { verified: true });
      if (path === '/api/homecloud/content/content-live-token/finalize' && method === 'POST') return json(200, { content: { id: 'content-live-token', role: 'file' } });
      return json(404, { code: 'not_found', message: `unexpected ${method} ${path}` });
    }) as typeof fetch;
    const store = createInMemoryUploadJobStore();
    const engine = createUploadEngine({
      store,
      uploadTransport: async () => ({ status: 200, ok: true }),
      getAccessToken: () => token,
      getHouseholdId: () => 'hh-1',
    });
    const job = engine.createJob({ role: 'file', intakeSource: 'files:picker' }, ARTIFACT);
    const done = await engine.run(job.id);
    record(done.state === 'completed', 'J: live-token job completes');
    record(observedTokens[0] === 'Bearer token-A', 'J: register reads token A at service creation');
    record(observedTokens.slice(1).every((value) => value === 'Bearer token-B'), 'J: next engine server steps read refreshed token B');
  }

  console.log(`\nHOMECLOUD_UPLOAD_RECOVERY_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    console.error('HOMECLOUD_UPLOAD_RECOVERY_TESTS=FAIL');
    process.exitCode = 1;
  } else {
    console.log('HOMECLOUD_UPLOAD_RECOVERY_TESTS=PASS');
  }
}

void main();

export {};
