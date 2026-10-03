/**
 * HomeCloud S2-i — DURABLE HYGIENE + COLD START RECOVERY (focused behavioural suite).
 *
 * What this pins, behaviourally (no source-regex fakes for the behaviour itself):
 *
 *   GAP-1  cold start: an authenticated household scope opens the upload runtime
 *          and recovers a persisted `uploading` job with NO HomeCloud screen, NO
 *          MemoryIntake and NO FileIntake anywhere in the process; the runtime start
 *          is idempotent; readiness denies opening without auth/household; household
 *          switching and sign-out dispose the held scope.
 *   GAP-3  terminal job pruning: completed/cancelled are released, mid-flight and
 *          retryable-failed are retained, pruning is household-isolated and does not
 *          break W1 completion reconciliation.
 *   GAP-2  terminal `failed` policy: a `failed` job with `retryable: false` is NOT
 *          pruned and its artifact is NOT deleted, because manual retry of the SAME
 *          job is a live product capability that reuses those bytes. Proven end to end.
 *
 * Run: `EXPO_PUBLIC_API_URL=http://localhost:9999 NODE_PATH=<repo>/tests/stubs
 *   node scripts/compiled-s2i/scripts/homecloud_s2i_durable_recovery_tests.js`
 */

import fs from 'node:fs';
import path from 'node:path';

import {
  createUploadJob,
  makeUploadJobError,
  serializeUploadJob,
  transition,
} from '../front/mi-front-limpio/services/homecloud/homecloudUploadJob';
import { createUploadEngine } from '../front/mi-front-limpio/services/homecloud/homecloudUploadEngine';
import {
  ensureUploadCoordinator,
  __resetUploadCoordinatorsForTests,
} from '../front/mi-front-limpio/services/homecloud/homecloudUploadCoordinator';
import {
  getUploadRuntime,
  __resetUploadRuntimeForTests,
} from '../front/mi-front-limpio/services/homecloud/homecloudUploadRuntime';
import type { UploadRuntimeConnectivity } from '../front/mi-front-limpio/services/homecloud/homecloudUploadRuntime';
import {
  __resetHomeCloudReadReconciliationForTests,
  hasReconciledHomeCloudCompletion,
  subscribeHomeCloudReadReconciliation,
} from '../front/mi-front-limpio/services/homecloud/homecloudReadReconciliation';
import {
  isPrunableTerminalJob,
  listPrunableTerminalJobs,
  pruneTerminalUploadJobs,
} from '../front/mi-front-limpio/services/homecloud/homecloudUploadMaintenance';
import {
  decideHomeCloudUploadOwnerAction,
  openHomeCloudUploadRuntimeForScope,
  resolveHomeCloudUploadRuntimeReadiness,
} from '../front/mi-front-limpio/services/homecloud/homecloudUploadRuntimeOwnership';
import {
  createAsyncStorageUploadJobStore,
  createInMemoryUploadJobStore,
} from '../front/mi-front-limpio/storage/homecloudUploadJobStorage';
import type {
  UploadJob,
  UploadLocalArtifact,
  UploadTransport,
} from '../front/mi-front-limpio/services/homecloud/homecloudUploadTypes';

(globalThis as unknown as { __DEV__?: boolean }).__DEV__ ??= false;

let passed = 0;
let failed = 0;
function check(value: unknown, message: string): void {
  if (value) { passed += 1; console.log(`  PASS: ${message}`); }
  else { failed += 1; console.error(`  FAIL: ${message}`); }
}
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
async function flush(times = 20): Promise<void> {
  for (let i = 0; i < times; i += 1) await tick();
}
function resetAll(): void {
  __resetUploadRuntimeForTests();
  __resetUploadCoordinatorsForTests();
  __resetHomeCloudReadReconciliationForTests();
}

// ── Fakes ───────────────────────────────────────────────────────────────────

const ARTIFACT: UploadLocalArtifact = {
  localUri: 'file:///durable/recuerdo.jpg',
  displayName: 'recuerdo.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 100,
  extension: 'jpg',
};

function fakeAsyncStorage(seed: Record<string, string> = {}) {
  const map = new Map<string, string>(Object.entries(seed));
  return {
    map,
    reads: [] as string[],
    async getItem(key: string) {
      this.reads.push(key);
      return map.has(key) ? map.get(key)! : null;
    },
    async setItem(key: string, value: string) { map.set(key, value); },
    async removeItem(key: string) { map.delete(key); },
    async getAllKeys() { return [...map.keys()]; },
  };
}

/** Register/staging, verify and finalize, counted so a repeat pass is visible. */
function installFetch(verified: () => boolean): { registers: number; finalizes: number } {
  const counter = { registers: 0, finalizes: 0 };
  (globalThis as unknown as { fetch: typeof fetch }).fetch = (async (url: unknown, init?: { method?: string }) => {
    const pathname = String(url).replace(/^https?:\/\/[^/]+/, '');
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    if (/\/verify$/.test(pathname)) return json({ verified: verified() });
    if (/\/upload$/.test(pathname)) {
      counter.registers += 1;
      return json({ signedUploadUrl: 'https://signed.example/o?t=1', path: 'hh/o', expiresIn: 60, contentId: 'content-1' });
    }
    if (/\/finalize$/.test(pathname)) {
      counter.finalizes += 1;
      return json({ content: { id: 'content-1', role: 'file' } });
    }
    return json({ code: 'unexpected', message: `${init?.method} ${pathname}` }, 500);
  }) as typeof fetch;
  return counter;
}

function fakeConnectivity(initial: boolean) {
  let online = initial;
  const listeners = new Set<(value: boolean) => void>();
  return {
    async currentOnline() { return online; },
    subscribe(listener: (value: boolean) => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    emit(value: boolean) {
      if (value === online) return;
      online = value;
      listeners.forEach((listener) => listener(value));
    },
  };
}

function uploadingJob(store: { put(job: UploadJob): void }, householdId = 'hh-1', suffix = ''): UploadJob {
  let job = createUploadJob(
    householdId,
    { role: 'file', intakeSource: 's2i_test' },
    { ...ARTIFACT, displayName: `recuerdo${suffix}.jpg` },
  );
  job = transition(job, 'registering');
  job = transition(job, 'registered', { contentId: 'content-1' });
  job = transition(job, 'uploading');
  store.put(job);
  return job;
}

const noSweep = async () => undefined;
const okTransport: UploadTransport = async () => ({ status: 200, ok: true });

// ── 1. Readiness / ownership decision (GAP-1 gate, §10) ──────────────────────

function readinessContract(): void {
  const noToken = resolveHomeCloudUploadRuntimeReadiness({ accessToken: null, authMeLoading: false, activeHouseholdId: 'hh-1' });
  check(noToken.scopeState === 'auth_unresolved' && !noToken.ready, 'A1. no access token never opens a runtime');
  const loading = resolveHomeCloudUploadRuntimeReadiness({ accessToken: 'tok', authMeLoading: true, activeHouseholdId: 'hh-1' });
  check(loading.scopeState === 'auth_loading' && !loading.ready, 'A2. unresolved auth never opens a runtime');
  const noHousehold = resolveHomeCloudUploadRuntimeReadiness({ accessToken: 'tok', authMeLoading: false, activeHouseholdId: null });
  check(noHousehold.scopeState === 'no_household' && !noHousehold.ready, 'B1. no active household never opens a runtime');
  const ready = resolveHomeCloudUploadRuntimeReadiness({ accessToken: 'tok', authMeLoading: false, activeHouseholdId: 'hh-1' });
  check(ready.scopeState === 'household_active' && ready.ready, 'A3. auth resolved + household opens the runtime');

  check(
    decideHomeCloudUploadOwnerAction({ readiness: loading, heldHouseholdId: 'hh-1', nextHouseholdId: null }) === 'wait',
    'A4. a transient authMe reload preserves the held runtime (no destructive recovery)',
  );
  check(
    decideHomeCloudUploadOwnerAction({ readiness: noToken, heldHouseholdId: 'hh-1', nextHouseholdId: null }) === 'dispose',
    'A5. sign-out disposes the held scope',
  );
  check(
    decideHomeCloudUploadOwnerAction({ readiness: noHousehold, heldHouseholdId: 'hh-1', nextHouseholdId: null }) === 'dispose',
    'B2. leaving a household disposes the held scope',
  );
  check(
    decideHomeCloudUploadOwnerAction({ readiness: noHousehold, heldHouseholdId: null, nextHouseholdId: null }) === 'wait',
    'B3. nothing held and no household is a no-op',
  );
  check(
    decideHomeCloudUploadOwnerAction({ readiness: ready, heldHouseholdId: 'hh-1', nextHouseholdId: 'hh-1' }) === 'keep',
    'C1. an unchanged household is a no-op (idempotent ownership)',
  );
  check(
    decideHomeCloudUploadOwnerAction({ readiness: ready, heldHouseholdId: null, nextHouseholdId: 'hh-1' }) === 'open',
    'C2. a first resolved household opens',
  );
  check(
    decideHomeCloudUploadOwnerAction({ readiness: ready, heldHouseholdId: 'hh-0', nextHouseholdId: 'hh-1' }) === 'dispose_then_open',
    'K1. a household switch disposes then reopens for the new scope',
  );
}

// ── 2. Cold start recovery without any HomeCloud screen (GAP-1, §12) ─────────

async function coldStartRecoveryWithoutScreens(): Promise<void> {
  resetAll();
  const fetches = installFetch(() => true);

  // A job that was mid-PUT when the process died: durable, `uploading`, with a
  // contentId. Nothing in this test imports a screen, an intake service or React.
  const seedStore = createInMemoryUploadJobStore();
  const seeded = uploadingJob(seedStore, 'hh-cold');
  const storage = fakeAsyncStorage({ [`homecloud:upload-job:${seeded.id}`]: serializeUploadJob(seeded) });
  const store = createAsyncStorageUploadJobStore(storage as never);

  let sweptLiveStates: string[] = [];
  const cleaned: UploadLocalArtifact[] = [];
  const reconciled: string[] = [];
  const unsubscribe = subscribeHomeCloudReadReconciliation('hh-cold', (event) => reconciled.push(event.jobId));

  const result = await openHomeCloudUploadRuntimeForScope({
    householdId: 'hh-cold',
    accessToken: 'tok',
    store,
    uploadTransport: okTransport,
    sweepOrphans: async (liveJobs) => { sweptLiveStates = liveJobs.map((job) => job.state); },
    cleanupTerminalArtifact: async (artifact) => { cleaned.push(artifact); },
    connectivity: fakeConnectivity(true) as UploadRuntimeConnectivity,
  });
  unsubscribe();

  check(getUploadRuntime('hh-cold') !== null, 'A6. the authenticated scope owns a runtime with no HomeCloud screen mounted');
  check(storage.reads.includes(`homecloud:upload-job:${seeded.id}`), 'D1. cold start hydrates the durable job from storage');
  check(sweptLiveStates.includes('uploading'), 'D2. the orphan sweep sees the mid-flight job as live');
  check(fetches.registers === 0, 'D3. verify-first recovery completes without re-PUTting the object');
  check(fetches.finalizes === 1, 'D4. recovery finalizes the interrupted job exactly once');
  check(store.get(seeded.id) === null, 'E1. the completed job is pruned by the cold-start maintenance pass');
  check(result.prunedJobIds.includes(seeded.id), 'E2. the prune pass reports the completed job id');
  check(hasReconciledHomeCloudCompletion('hh-cold', seeded.id), 'J1. W1 reconciliation ran for the completed job');
  check(reconciled.includes(seeded.id), 'J2. the reconciliation listener was notified before the row was pruned');
  check(cleaned.length >= 1 && cleaned.every((artifact) => artifact.displayName === 'recuerdo.jpg'),
    'E3. terminal artifact bytes are released for the completed job (idempotently)');
}

// ── 3. Runtime start idempotency (GAP-1, §11) ───────────────────────────────

async function runtimeStartIsIdempotent(): Promise<void> {
  resetAll();
  const fetches = installFetch(() => true);
  const store = createInMemoryUploadJobStore();
  const job = uploadingJob(store, 'hh-idem', '-a');

  const params = {
    householdId: 'hh-idem',
    accessToken: 'tok',
    store,
    uploadTransport: okTransport,
    sweepOrphans: noSweep,
    cleanupTerminalArtifact: async () => undefined,
    connectivity: fakeConnectivity(true) as UploadRuntimeConnectivity,
  };
  const first = await openHomeCloudUploadRuntimeForScope(params);
  const firstHandle = getUploadRuntime('hh-idem');
  check(first.prunedJobIds.includes(job.id), 'C3. the first open recovers the job and releases its terminal row');
  check(hasReconciledHomeCloudCompletion('hh-idem', job.id), 'C3b. the recovered completion reconciled exactly once');

  await openHomeCloudUploadRuntimeForScope(params);
  await openHomeCloudUploadRuntimeForScope(params);
  check(getUploadRuntime('hh-idem') === firstHandle, 'C4. repeated opens reuse ONE runtime handle per household');
  check(fetches.finalizes === 1, 'C5. repeated opens never re-execute or re-finalize a completed job');
  check(store.all().filter((row) => row.state === 'completed').length === 0, 'E4. the second open converges the completed row away');
}

// ── 4. Household switch / sign-out dispose (§10) ────────────────────────────

async function scopeChangeDisposesHeldRuntime(): Promise<void> {
  resetAll();
  installFetch(() => true);
  const store = createInMemoryUploadJobStore();
  uploadingJob(store, 'hh-old');

  await openHomeCloudUploadRuntimeForScope({
    householdId: 'hh-old',
    accessToken: 'tok',
    store,
    uploadTransport: okTransport,
    sweepOrphans: noSweep,
    cleanupTerminalArtifact: async () => undefined,
    connectivity: fakeConnectivity(true) as UploadRuntimeConnectivity,
  });
  check(getUploadRuntime('hh-old') !== null, 'K2. the first household runtime is open');

  getUploadRuntime('hh-old')?.dispose();
  check(getUploadRuntime('hh-old') === null, 'K3. disposing the held scope removes it from the runtime registry');

  resetAll();
  const storeB = createInMemoryUploadJobStore();
  const jobB = uploadingJob(storeB, 'hh-new');
  const opened = await openHomeCloudUploadRuntimeForScope({
    householdId: 'hh-new',
    accessToken: 'tok',
    store: storeB,
    uploadTransport: okTransport,
    sweepOrphans: noSweep,
    cleanupTerminalArtifact: async () => undefined,
    connectivity: fakeConnectivity(true) as UploadRuntimeConnectivity,
  });
  check(opened.prunedJobIds.includes(jobB.id), 'K4. the new household scope recovers and reconciles on its own rows');
  check(getUploadRuntime('hh-old') === null, 'K5. the previous scope did not come back');
}

// ── 5. Offline cold start and single reconnect pass (§13) ───────────────────

async function offlineThenReconnect(): Promise<void> {
  resetAll();
  installFetch(() => true);
  const store = createInMemoryUploadJobStore();
  const job = uploadingJob(store, 'hh-net');
  const connectivity = fakeConnectivity(false);
  const events: string[] = [];

  await openHomeCloudUploadRuntimeForScope({
    householdId: 'hh-net',
    accessToken: 'tok',
    store,
    uploadTransport: okTransport,
    sweepOrphans: noSweep,
    cleanupTerminalArtifact: async () => undefined,
    connectivity: connectivity as UploadRuntimeConnectivity,
    onEvent: (event) => { events.push(event); },
  });

  check(events.includes('recover_skipped_offline'), 'L1. an offline cold start skips the doomed recovery pass');
  check(!events.includes('recover_start'), 'L2. an offline cold start spends no recover pass');
  check(store.get(job.id)?.state === 'uploading', 'L3. an offline cold start leaves the job recoverable and unadvanced');
  check(store.get(job.id)?.error === null, 'L4. an offline cold start burns no retry on the job');

  connectivity.emit(true);
  await flush();
  check(store.get(job.id)?.state === 'completed', 'M1. reconnect recovers the interrupted job');
  check(events.filter((event) => event === 'recover_start').length === 1, 'M2. reconnect issues exactly ONE recover pass');
  check(events.includes('recover_skipped_offline') && events.includes('recover_start'), 'M3. the online pass is a genuine reconnect pass');

  await flush(40);
  check(events.filter((event) => event === 'recover_start').length === 1, 'M4. reconnect does not loop');
}

// ── 6. Terminal job pruning policy (GAP-3, §7/§8) ──────────────────────────

async function pruningPolicy(): Promise<void> {
  resetAll();
  const store = createInMemoryUploadJobStore();

  const completed = uploadingJob(store, 'hh-1', '-completed');
  const cancelled = uploadingJob(store, 'hh-1', '-cancelled');
  const pending = createUploadJob('hh-1', { role: 'file', intakeSource: 's2i' }, { ...ARTIFACT, displayName: 'pending.jpg' });
  const uploading = uploadingJob(store, 'hh-1', '-uploading');
  const failedRetryable = transition(
    uploadingJob(store, 'hh-1', '-transient'),
    'failed',
    { error: makeUploadJobError('network', 'offline', true) },
  );
  const failedTerminal = transition(
    uploadingJob(store, 'hh-1', '-stale'),
    'failed',
    { error: makeUploadJobError('homecloud_not_staging', 'ya no esta en staging', false) },
  );
  const otherHousehold = uploadingJob(store, 'hh-2', '-other');

  store.put(transition(transition(transition(completed, 'verifying'), 'finalizing'), 'completed'));
  store.put(transition(store.get(cancelled.id)!, 'cancelled'));
  store.put(pending);

  const cleaned: UploadLocalArtifact[] = [];
  const result = await pruneTerminalUploadJobs({
    store,
    householdId: 'hh-1',
    cleanupTerminalArtifact: async (artifact) => { cleaned.push(artifact); },
  });

  check(result.prunedJobIds.includes(completed.id), 'E5. completed jobs are pruned');
  check(result.prunedJobIds.includes(cancelled.id), 'F1. cancelled jobs are pruned');
  check(store.get(completed.id) === null && store.get(cancelled.id) === null, 'F2. pruned rows are gone from the durable store');
  check(cleaned.map((artifact) => artifact.displayName).sort().join(',') === 'recuerdo-cancelled.jpg,recuerdo-completed.jpg',
    'F3. artifact bytes are released exactly for the pruned terminal jobs');

  check(result.retainedJobIds.includes(pending.id), 'G1. a pending job is never pruned');
  check(result.retainedJobIds.includes(uploading.id), 'G2. an uploading job is never pruned');
  check(result.retainedJobIds.includes(failedRetryable.id), 'H1. a retryable failure is never pruned');
  check(store.get(pending.id) !== null && store.get(uploading.id) !== null, 'G3. mid-flight rows survive the pass');
  check(store.get(failedRetryable.id) !== null, 'H2. the retryable failure row survives the pass');
  check(cleaned.every((artifact) => !artifact.displayName.includes('transient')), 'H3. a retryable failure never loses its artifact');

  check(result.retainedJobIds.includes(failedTerminal.id), 'I1. a terminal failure is not pruned (manual retry still needs the row)');
  check(store.get(failedTerminal.id) !== null, 'I2. the terminal failure row survives the pass');
  check(cleaned.every((artifact) => !artifact.displayName.includes('stale')), 'I3. a terminal failure never loses its artifact');

  check(!result.prunedJobIds.includes(otherHousehold.id) && store.get(otherHousehold.id) !== null,
    'K6. pruning is household-isolated');
  check(listPrunableTerminalJobs(store, 'hh-1').length === 0, 'E5b. a second pass finds nothing left to prune');
  check(isPrunableTerminalJob({ state: 'completed' }) && isPrunableTerminalJob({ state: 'cancelled' }), 'E5c. completed/cancelled are prunable');
  check(!isPrunableTerminalJob({ state: 'failed' }) && !isPrunableTerminalJob({ state: 'verifying' }), 'G4. failed and mid-flight are never prunable');
}

// ── 7. Terminal failure manual retry still works (GAP-2 policy, §6) ─────────

async function terminalFailureManualRetrySurvives(): Promise<void> {
  resetAll();
  installFetch(() => true);
  const store = createInMemoryUploadJobStore();
  const stale = uploadingJob(store, 'hh-retry', '-stale');
  const failedTerminal = transition(stale, 'failed', {
    error: makeUploadJobError('homecloud_not_staging', 'ya no esta en estado de ingesta', false),
  });
  store.put(failedTerminal);

  const cleaned: UploadLocalArtifact[] = [];
  await pruneTerminalUploadJobs({
    store,
    householdId: 'hh-retry',
    cleanupTerminalArtifact: async (artifact) => { cleaned.push(artifact); },
  });
  check(store.get(failedTerminal.id)?.state === 'failed', 'I4. a terminal failure survives maintenance');
  check(cleaned.length === 0, 'I5. a terminal failure artifact is never deleted (NO DATA LOSS)');

  let transportedFrom: string | null = null;
  const engine = createUploadEngine({
    store,
    uploadTransport: async ({ localUri }) => { transportedFrom = localUri; return { status: 200, ok: true }; },
    getAccessToken: () => 'tok',
    getHouseholdId: () => 'hh-retry',
    cleanupDurableArtifact: async () => undefined,
  });
  const coordinator = ensureUploadCoordinator({ store, householdId: 'hh-retry', run: engine.run, cancelActiveUpload: engine.cancelActiveUpload });
  await coordinator.retry(failedTerminal.id);

  check(store.get(failedTerminal.id)?.state === 'completed', 'I6. manual retry of a terminal failure still completes');
  check(store.get(failedTerminal.id)?.contentId === 'content-1', 'I7. the manual retry reuses the same contentId, never a new registration');
  check(transportedFrom === null || transportedFrom === ARTIFACT.localUri, 'I8. the manual retry reuses the same durable artifact bytes');
}

// ── 8. Frozen foundation boundaries (§4 / §20) ──────────────────────────────

function frozenBoundaries(): void {
  const root = path.resolve(__dirname, '..', '..', '..');
  const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');
  const runtimeOwner = read('front/mi-front-limpio/components/homecloud/HomeCloudUploadRuntimeOwner.tsx');
  const navigator = read('front/mi-front-limpio/navigation/AppNavigator.tsx');

  check(/<HomeCloudUploadRuntimeOwner/.test(navigator), 'A7. the private authenticated shell mounts the upload runtime owner');
  check(
    navigator.indexOf('<HomeCloudUploadRuntimeOwner') < navigator.lastIndexOf('<PrivateStack.Navigator'),
    'A8. the owner sits ABOVE the private stack, so it does not depend on any screen',
  );
  check(/return <>\{children\}<\/>/.test(runtimeOwner), 'A9. the owner renders nothing and only owns side effects');
  check(
    !/^import .*(MemoryIntake|FileIntake|HomeCloudMemoriesScreen|HomeCloudFilesScreen)/m.test(runtimeOwner),
    'A10. the owner imports no intake surface and no HomeCloud screen',
  );
  check(
    /ensureHomeCloudUploadRuntime/.test(read('front/mi-front-limpio/services/homecloud/homecloudUploadRuntime.ts'))
      && /if \(started\) return;/.test(read('front/mi-front-limpio/services/homecloud/homecloudUploadRuntime.ts')),
    'C6. the runtime keeps its idempotent start guard',
  );
  check(
    !/uset_|tus-js-client|base64|readAsStringAsync/.test(
      read('front/mi-front-limpio/services/homecloud/homecloudUploadEngine.ts'),
    ),
    '§4. T2 native PUT transport is untouched by this slice',
  );
}

async function main(): Promise<void> {
  console.log('\n=== HOMECLOUD S2-i DURABLE RECOVERY / COLD START TESTS ===\n');
  readinessContract();
  await coldStartRecoveryWithoutScreens();
  await runtimeStartIsIdempotent();
  await scopeChangeDisposesHeldRuntime();
  await offlineThenReconnect();
  await pruningPolicy();
  await terminalFailureManualRetrySurvives();
  frozenBoundaries();
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

void main();