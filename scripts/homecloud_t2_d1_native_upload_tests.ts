/** Focused executable contracts for T2-D1 native PUT progress/cancellation. */
import fs from 'node:fs';
import path from 'node:path';
import { createExpoFileSystemUploadTransport, createUploadEngine } from '../front/mi-front-limpio/services/homecloud/homecloudUploadEngine';
import { createUploadJob, transition } from '../front/mi-front-limpio/services/homecloud/homecloudUploadJob';
import { ensureUploadCoordinator, __resetUploadCoordinatorsForTests } from '../front/mi-front-limpio/services/homecloud/homecloudUploadCoordinator';
import { createInMemoryUploadJobStore } from '../front/mi-front-limpio/storage/homecloudUploadJobStorage';
import type { UploadJob, UploadTransport } from '../front/mi-front-limpio/services/homecloud/homecloudUploadTypes';

let passed = 0;
let failed = 0;
function check(value: unknown, message: string): void {
  if (value) { passed += 1; console.log(`  PASS: ${message}`); }
  else { failed += 1; console.error(`  FAIL: ${message}`); }
}
const artifact = { localUri: 'file:///durable/movie.mov', displayName: 'movie.mov', mimeType: 'video/quicktime', sizeBytes: 100, extension: 'mov' };
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (error: unknown) => void; const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; }); return { promise, resolve, reject }; }

function installFetch(verified: () => boolean): void {
  (globalThis as unknown as { fetch: typeof fetch }).fetch = (async (url: unknown, init?: { method?: string }) => {
    const pathname = String(url).replace(/^https?:\/\/[^/]+/, '');
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    if (/\/verify$/.test(pathname)) return json({ verified: verified() });
    if (/\/upload$/.test(pathname)) return json({ signedUploadUrl: 'https://signed.example/object?token=SECRET', path: 'hh/object', expiresIn: 60, contentId: 'content-1' });
    if (/\/finalize$/.test(pathname)) return json({ content: { id: 'content-1', role: 'file' } });
    return json({ code: 'unexpected', message: `${init?.method} ${pathname}` }, 500);
  }) as typeof fetch;
}

function uploadingJob(store: ReturnType<typeof createInMemoryUploadJobStore>, suffix = ''): UploadJob {
  let job = createUploadJob('hh-1', { role: 'file', intakeSource: 'test' }, { ...artifact, displayName: `movie${suffix}.mov` });
  job = transition(job, 'registering');
  job = transition(job, 'registered', { contentId: 'content-1' });
  job = transition(job, 'uploading');
  store.put(job);
  return job;
}

async function nativeTransportContract(): Promise<void> {
  let captured: { url: string; uri: string; options: Record<string, unknown> } | null = null;
  let progressCallback: ((value: { totalBytesSent: number; totalBytesExpectedToSend: number }) => void) | null = null;
  let cancelCalls = 0;
  const upload = deferred<{ status: number } | undefined>();
  const fakeFs = {
    FileSystemUploadType: { BINARY_CONTENT: 0 },
    FileSystemSessionType: { BACKGROUND: 0 },
    createUploadTask(url: string, uri: string, options: Record<string, unknown>, callback: typeof progressCallback) {
      captured = { url, uri, options }; progressCallback = callback;
      return { uploadAsync: () => upload.promise, cancelAsync: async () => { cancelCalls += 1; upload.resolve(undefined); } };
    },
  };
  const transport = createExpoFileSystemUploadTransport(async () => fakeFs as never);
  const controller = new AbortController();
  const seen: number[] = [];
  const pending = transport({ signedUploadUrl: 'https://signed.example/x?a=1', localUri: artifact.localUri, mimeType: artifact.mimeType, signal: controller.signal, onProgress: (p) => seen.push(p.bytesSent) });
  await tick();
  const capturedValue = captured as unknown as { url: string; uri: string; options: { httpMethod?: string; uploadType?: number; headers?: Record<string, string> } };
  const options = capturedValue.options;
  check(capturedValue.url === 'https://signed.example/x?a=1', 'A. signed URL is passed verbatim');
  check(options?.httpMethod === 'PUT', 'B. native task uses PUT');
  check(options?.headers?.['x-upsert'] === 'false', 'C. x-upsert:false is preserved');
  check(options?.headers?.['content-type'] === artifact.mimeType, 'D. content-type is preserved');
  check(capturedValue.uri === artifact.localUri && options?.uploadType === 0, 'E. file URI goes directly to binary native upload');
  (progressCallback as unknown as (value: { totalBytesSent: number; totalBytesExpectedToSend: number }) => void)({ totalBytesSent: 25, totalBytesExpectedToSend: 100 });
  check(seen[0] === 25, 'G. native progress callback is forwarded');
  controller.abort(); controller.abort();
  await pending.catch(() => undefined);
  check(cancelCalls === 1, 'L. abort invokes native cancel exactly once');
}

async function engineProgressAndCancel(): Promise<void> {
  __resetUploadCoordinatorsForTests(); installFetch(() => false);
  const store = createInMemoryUploadJobStore();
  const job = uploadingJob(store);
  let params: Parameters<UploadTransport>[0] | null = null;
  let aborts = 0;
  const native = deferred<{ status: number; ok: boolean }>();
  const transport: UploadTransport = (value) => {
    params = value;
    value.signal.addEventListener('abort', () => { aborts += 1; }, { once: true });
    return native.promise;
  };
  const engine = createUploadEngine({ store, uploadTransport: transport, getAccessToken: () => 'tok', getHouseholdId: () => 'hh-1' });
  const coordinator = ensureUploadCoordinator({ store, householdId: 'hh-1', run: engine.run, cancelActiveUpload: engine.cancelActiveUpload });
  const pump = coordinator.requestPump('test');
  while (!params) await tick();
  const callback = (params as unknown as Parameters<UploadTransport>[0]).onProgress;
  callback({ bytesSent: 42, totalBytes: 100 });
  check(coordinator.getSnapshot().activeUpload?.progress === 0.42, 'H. bytes sent/total becomes the expected percentage');
  callback({ bytesSent: 40, totalBytes: 100 });
  check(coordinator.getSnapshot().activeUpload?.bytesSent === 42, 'I. progress cannot decrease within one attempt');
  await coordinator.cancel(job.id);
  callback({ bytesSent: 80, totalBytes: 100 });
  native.resolve({ status: 200, ok: true });
  await pump;
  const cancelled = store.get(job.id);
  check(aborts === 1, 'L. coordinator cancellation aborts the owned native attempt once');
  check(cancelled?.state === 'cancelled' && cancelled.error?.retryable !== true, 'M. cancelled job is terminal and not retryable');
  check(coordinator.getSnapshot().activeUpload === null, 'N/S. late progress is ignored and task progress is cleaned');
  check(store.get(job.id)?.state === 'cancelled', 'O. late native completion cannot resurrect a cancelled job');
}

async function recoveryContracts(): Promise<void> {
  __resetUploadCoordinatorsForTests();
  {
    installFetch(() => true);
    const store = createInMemoryUploadJobStore(); const job = uploadingJob(store, '-existing'); let puts = 0;
    const engine = createUploadEngine({ store, uploadTransport: async () => { puts += 1; return { status: 200, ok: true }; }, getAccessToken: () => 'tok', getHouseholdId: () => 'hh-1' });
    const done = await engine.run(job.id);
    check(puts === 0 && done.state === 'completed', 'Q. recovery verify=true skips PUT and completes');
  }
  __resetUploadCoordinatorsForTests();
  {
    installFetch(() => false);
    const store = createInMemoryUploadJobStore(); const job = uploadingJob(store, '-missing'); const samples: number[] = [];
    const engine = createUploadEngine({
      store,
      uploadTransport: async ({ onProgress }) => { onProgress({ bytesSent: 60, totalBytes: 100 }); return { status: 200, ok: true }; },
      getAccessToken: () => 'tok', getHouseholdId: () => 'hh-1',
    });
    const coordinator = ensureUploadCoordinator({ store, householdId: 'hh-1', run: engine.run, cancelActiveUpload: engine.cancelActiveUpload });
    coordinator.subscribe((value) => { if (value.activeUpload) samples.push(value.activeUpload.bytesSent); });
    await coordinator.requestPump('recovery');
    check(samples[0] === 0 && samples.includes(60), 'J/R. verify=false starts a fresh PUT at byte 0');
  }
}

async function retryAndAttemptIdentity(): Promise<void> {
  __resetUploadCoordinatorsForTests(); let uploaded = false; installFetch(() => uploaded);
  const store = createInMemoryUploadJobStore(); const job = uploadingJob(store, '-retry');
  const second = deferred<{ status: number; ok: boolean }>();
  const callbacks: Array<(value: { bytesSent: number; totalBytes: number }) => void> = [];
  let calls = 0;
  const engine = createUploadEngine({
    store,
    uploadTransport: async ({ onProgress }) => {
      calls += 1; callbacks.push(onProgress);
      if (calls === 1) { onProgress({ bytesSent: 50, totalBytes: 100 }); throw new Error('network request failed'); }
      const result = await second.promise; uploaded = true; return result;
    },
    getAccessToken: () => 'tok', getHouseholdId: () => 'hh-1',
  });
  const coordinator = ensureUploadCoordinator({ store, householdId: 'hh-1', run: engine.run, cancelActiveUpload: engine.cancelActiveUpload });
  await coordinator.requestPump('first');
  check(store.get(job.id)?.state === 'failed' && store.get(job.id)?.error?.retryable === true, 'P. transient native failure remains recoverable');
  const retry = coordinator.retry(job.id);
  while (calls < 2) await tick();
  check(coordinator.getSnapshot().activeUpload?.bytesSent === 0, 'J. a new attempt resets visible progress to zero');
  callbacks[0]({ bytesSent: 90, totalBytes: 100 });
  check(coordinator.getSnapshot().activeUpload?.bytesSent === 0, 'U. old task callback cannot mutate the new attempt');
  callbacks[1]({ bytesSent: 10, totalBytes: 100 });
  second.resolve({ status: 200, ok: true });
  await retry;
  check(store.get(job.id)?.state === 'completed' && coordinator.getSnapshot().activeUpload === null, 'S. successful terminal attempt releases its runtime reference');
}

async function singleWorkerContract(): Promise<void> {
  __resetUploadCoordinatorsForTests(); installFetch(() => false);
  const store = createInMemoryUploadJobStore(); uploadingJob(store, '-one'); uploadingJob(store, '-two');
  const gates = [deferred<{ status: number; ok: boolean }>(), deferred<{ status: number; ok: boolean }>()];
  let started = 0; let active = 0; let maxActive = 0;
  const engine = createUploadEngine({
    store,
    uploadTransport: async () => { const index = started++; active += 1; maxActive = Math.max(maxActive, active); const result = await gates[index].promise; active -= 1; return result; },
    getAccessToken: () => 'tok', getHouseholdId: () => 'hh-1',
  });
  const coordinator = ensureUploadCoordinator({ store, householdId: 'hh-1', run: engine.run, cancelActiveUpload: engine.cancelActiveUpload });
  const pump = coordinator.requestPump('fifo');
  while (started < 1) await tick();
  check(started === 1, 'T. only one native task starts while the first is active');
  gates[0].resolve({ status: 200, ok: true });
  while (started < 2) await tick();
  gates[1].resolve({ status: 200, ok: true });
  await pump;
  check(maxActive === 1, 'T. coordinator remains a single native-task worker');
}

function staticBoundaries(): void {
  const root = path.resolve(__dirname, '..', '..', '..');
  const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');
  const engine = read('front/mi-front-limpio/services/homecloud/homecloudUploadEngine.ts');
  const product = [engine, read('front/mi-front-limpio/services/homecloud/homecloudUploadCoordinator.ts'), read('front/mi-front-limpio/services/homecloud/homecloudFileIntakeService.ts'), read('front/mi-front-limpio/services/homecloud/homecloudMemoryIntakeService.ts')].join('\n');
  check(!/\b(Blob|base64|readAsStringAsync|ArrayBuffer)\b/.test(engine), 'F. production transport has no whole-file JS buffering API');
  check(!/tus-js-client|expo-blob|spikes\/t2Tus/.test(product), 'V. product upload path imports no TUS spike/dependency');
  check(/HomeCloudUploadActivity/.test(read('front/mi-front-limpio/screens/HomeCloudScreen.tsx')), 'K. upload authority remains mounted outside initiating intake UI');
}

async function main(): Promise<void> {
  console.log('\n=== HOMECLOUD T2-D1 NATIVE UPLOAD TESTS ===\n');
  await nativeTransportContract();
  await engineProgressAndCancel();
  await recoveryContracts();
  await retryAndAttemptIdentity();
  await singleWorkerContract();
  staticBoundaries();
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}
void main();
