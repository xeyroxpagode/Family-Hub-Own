/**
 * HomeCloud W1-C — Scanner durable acceptance and completed-save regression tests.
 *
 * THE DEFECT
 * ----------
 * Durable acceptance transfers execution to the household coordinator, while
 * the Patch 1 scanner keeps its recoverable review session until the job reports
 * completed. Only then may it publish the saved File, clean local drafts and
 * return to the chosen destination. A failure before or after acceptance keeps
 * the pages available for retry.
 *
 * WHAT IS ACTUALLY EXERCISED HERE
 * -------------------------------
 * The real FileIntake service, the real durable store, the real household
 * coordinator, the real upload engine and the real W1-C reconciliation registry.
 * Only the native edges are substituted: the transport (fetch), the file copy,
 * the byte upload and the PDF. The acceptance DECISION itself is the real
 * policy module the screen obeys.
 *
 * The one thing these tests CANNOT prove is the native byte upload/verify/
 * finalize round trip: `createFileIntakeService` hard-wires the Expo
 * FileSystem transport, which does not exist in Node. Completion is therefore
 * driven through the real engine with a fake transport — the same technique the
 * T1 stale-job suite already uses. The native transport itself remains DEVICE
 * QA.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  createScannerSubmitGuard,
  planScannerCleanupAfterAcceptance,
  scannerAcceptanceOutcome,
} from '../front/mi-front-limpio/services/homecloud/homecloudScannerAcceptance';
import { buildScannerArtifact } from '../front/mi-front-limpio/services/homecloud/homecloudScanner';
import { createFileIntakeService } from '../front/mi-front-limpio/services/homecloud/homecloudFileIntakeService';
import { createUploadEngine } from '../front/mi-front-limpio/services/homecloud/homecloudUploadEngine';
import { createSharedUploadQueue } from '../front/mi-front-limpio/services/homecloud/homecloudUploadQueue';
import { getUploadCoordinator } from '../front/mi-front-limpio/services/homecloud/homecloudUploadCoordinator';
import { __resetSharedUploadQueueForTests } from '../front/mi-front-limpio/services/homecloud/homecloudUploadQueue';
import { __resetUploadRuntimeForTests } from '../front/mi-front-limpio/services/homecloud/homecloudUploadRuntime';
import {
  subscribeHomeCloudReadReconciliation,
  __resetHomeCloudReadReconciliationForTests,
  type HomeCloudReadReconciliationEvent,
} from '../front/mi-front-limpio/services/homecloud/homecloudReadReconciliation';
import { createAsyncStorageUploadJobStore, __setSharedUploadJobStoreForTests } from '../front/mi-front-limpio/storage/homecloudUploadJobStorage';
import type { UploadJobStore } from '../front/mi-front-limpio/storage/homecloudUploadJobStorage';
import type { FileIntakeState } from '../front/mi-front-limpio/services/homecloud/homecloudFileIntakeTypes';
import type { HomeCloudCapabilityDescriptor } from '../front/mi-front-limpio/services/homecloud/homecloudCapabilitiesAdapter';
import { DENY_ALL_HOME_CLOUD_CAPABILITIES } from '../front/mi-front-limpio/services/homecloud/homecloudCapabilitiesAdapter';
import type { UploadJob, UploadLocalArtifact } from '../front/mi-front-limpio/services/homecloud/homecloudUploadTypes';

(globalThis as { __DEV__?: boolean }).__DEV__ = false;

let passCount = 0;
let failCount = 0;

function record(ok: boolean, message: string) {
  if (ok) {
    passCount += 1;
    console.log(`  PASS: ${message}`);
  } else {
    failCount += 1;
    console.error(`  FAIL: ${message}`);
  }
}

const FULL: HomeCloudCapabilityDescriptor = {
  view: true, contribute: true, organize: true, delete: true, anyWrite: true,
};
const SCANNER_SOURCE = 'homecloud:scanner';

// ── transport stub ──────────────────────────────────────────────────────────

class Backend {
  readonly calls: string[] = [];
  failRegister = false;
  hangRegister = false;
  countOf(needle: string): number {
    return this.calls.filter((call) => call.includes(needle)).length;
  }
  install(): void {
    (globalThis as unknown as { fetch: typeof fetch }).fetch = (async (input: unknown) => {
      const url = String(input);
      this.calls.push(url);
      if (url.includes('/api/homecloud/register')) {
        if (this.hangRegister) return new Promise<Response>(() => {});
        if (this.failRegister) return json(500, { code: 'server_error', message: 'register down' });
        return json(200, { content: { id: 'content-1', role: 'file', lifecycle: 'staging' } });
      }
      if (url.includes('/upload')) return json(200, { signedUploadUrl: 'https://signed.example/up', path: 'p', expiresIn: 60, contentId: 'content-1' });
      if (url.includes('/verify')) return json(200, { verified: true });
      if (url.includes('/finalize')) return json(200, { content: { id: 'content-1', role: 'file', lifecycle: 'active' } });
      if (url.includes('/api/homecloud/folders')) return json(200, { folders: [] });
      return json(200, {});
    }) as typeof fetch;
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function fakeAsyncStorage() {
  const data = new Map<string, string>();
  return {
    getItem: async (key: string) => data.get(key) ?? null,
    setItem: async (key: string, value: string) => { data.set(key, value); },
    removeItem: async (key: string) => { data.delete(key); },
    getAllKeys: async () => [...data.keys()],
  };
}

let currentStore: UploadJobStore | null = null;

function resetWorld(): UploadJobStore {
  __setSharedUploadJobStoreForTests(null);
  __resetSharedUploadQueueForTests();
  __resetUploadRuntimeForTests();
  __resetHomeCloudReadReconciliationForTests();
  const store = createAsyncStorageUploadJobStore(fakeAsyncStorage());
  __setSharedUploadJobStoreForTests(store as never);
  currentStore = store;
  return store;
}

function scannerArtifact(name = 'scan'): UploadLocalArtifact {
  return buildScannerArtifact({ localUri: `file:///scan/${name}.pdf`, sizeBytes: 2048, displayName: `${name}.pdf` });
}

/**
 * The real Scanner path: a real FileIntake service over the real shared store.
 * Only the durable copy is substituted (no native filesystem in Node).
 */
function newScannerIntake(householdId: string, options: { copyFails?: boolean } = {}) {
  const store = currentStore!;
  const service = createFileIntakeService(
    {
      householdId,
      accessToken: 'tok',
      getAccessToken: () => 'tok',
      capabilities: FULL,
      initialFolderId: null,
      initialFolderName: null,
      intakeSource: SCANNER_SOURCE,
    },
    {
      copyToDurableWorkspace: async (artifact) => {
        if (options.copyFails) throw new Error('no space left on device');
        return artifact;
      },
    },
  );
  return { service, store };
}

/**
 * Take over household execution so the acceptance boundary is observable in
 * isolation: the pump parks until the test releases it, exactly as a real upload
 * would be in flight while the Scanner detaches.
 */
function parkExecution(householdId: string, store: UploadJobStore) {
  const coordinator = getUploadCoordinator(householdId);
  if (!coordinator) throw new Error('no coordinator for household');
  let release!: () => void;
  const parked = new Promise<UploadJob>((resolve) => {
    release = () => resolve(store.get('__none__') as UploadJob);
  });
  coordinator.configure({ store, householdId, run: () => parked });
  return { release: () => release() };
}

// ── 1. acceptance transfers execution; navigation waits for completed ───────

async function testDetachBeforeCompleted(): Promise<void> {
  console.log('\n=== SCANNER 1: accepted execution, completed navigation ===');
  const store = resetWorld();
  const backend = new Backend();
  // The register never answers: the job is accepted and mid-flight, exactly the
  // window in which the Scanner used to keep the user waiting.
  backend.hangRegister = true;
  backend.install();

  const { service } = newScannerIntake('hh-scan');
  const seen: FileIntakeState[] = [];
  service.subscribe((state) => seen.push(state));
  parkExecution('hh-scan', store);

  await service.submitArtifact(scannerArtifact());

  const jobId = service.getAcceptedJobId();
  record(jobId !== null, '1.1. the durable acceptance signal is set (the real accepted job id)');
  const job = jobId ? store.get(jobId) : null;
  record(job !== null && job?.state !== 'completed',
    '1.2. at the acceptance boundary the job is NOT completed (it is mid-flight)');
  record(seen.every((state) => state.status !== 'completed'),
    '1.3. and the surface has not seen a completed status at all');

  const outcome = scannerAcceptanceOutcome({ acceptedJobId: jobId, alreadyAccepted: false });
  record(outcome.kind === 'detach', '1.4. the durable job transfers execution ownership to the coordinator');

  // The policy must NOT detach while the job is merely uploading.
  const stillFlying = scannerAcceptanceOutcome({ acceptedJobId: jobId, alreadyAccepted: true });
  record(stillFlying.kind === 'stay', '1.5. a second observation never navigates twice (one-shot boundary)');

  // The structural half: accepted is not success. The Scanner publishes and
  // returns only when the durable job actually completed.
  const screen = readFront('screens/HomeCloudScannerScreen.tsx');
  record(/intake\.status !== 'completed'/.test(screen)
    && /publishHomeCloudScannerSaved/.test(screen)
    && /handleAccepted\(\)/.test(screen),
  '1.6. completed publishes the saved File and only then returns from Scanner');
  const saveBody = between(screen, 'const handleSave = useCallback', 'const handleRetrySave = useCallback');
  record(saveBody.includes('getAcceptedJobId()') && saveBody.includes('scannerAcceptanceOutcome'),
    '1.7. durable acceptance still comes from the REAL accepted signal, never a timer');
  record(!/setTimeout|savingRef/.test(saveBody), '1.8. acceptance is never inferred from a timer');

  __setSharedUploadJobStoreForTests(null);
}

// ── 2 + 3. the coordinator continues after detach, and Files reconciles ──────

async function testCoordinatorSurvivesDetach(): Promise<void> {
  console.log('\n=== SCANNER 2/3: execution survives the detach; Files reconciles ===');
  const store = resetWorld();
  const backend = new Backend();
  backend.hangRegister = true;
  backend.install();

  const events: HomeCloudReadReconciliationEvent[] = [];
  const stop = subscribeHomeCloudReadReconciliation('hh-scan', (event) => events.push(event));

  const { service } = newScannerIntake('hh-scan');
  await service.submitArtifact(scannerArtifact('accepted'));
  const jobId = service.getAcceptedJobId();
  record(jobId !== null, '2.1. the scanner job was durably accepted');
  const acceptedJob = jobId ? store.get(jobId) : null;
  record(acceptedJob?.intakeSource === SCANNER_SOURCE, '2.2. it is a real scanner job (not a picker job)');
  record(acceptedJob?.artifact.localUri.startsWith('file:///scan/') === true,
    '2.3. and it owns the durable artifact produced by the scanner');

  // ── THE DETACH: the Scanner instance goes away entirely. ──
  // Dropping every reference is the strongest available stand-in for unmount:
  // no listener, no service, no screen can influence the job from here on.
  const beforeDetach = store.get(jobId!)!.state;
  record(beforeDetach !== 'cancelled', '2.4. detaching did not cancel the accepted job');
  record(beforeDetach !== 'completed', '2.5. and it is still not completed (execution was pending)');

  // ── The coordinator resumes, with the REAL engine and a fake transport. ──
  backend.hangRegister = false;
  const engine = createUploadEngine({
    store: store as never,
    uploadTransport: async () => ({ status: 200, ok: true }),
    getAccessToken: () => 'tok',
    getHouseholdId: () => 'hh-scan',
  });
  // The household coordinator is the SAME singleton the Scanner used; only its
  // runner is re-pointed, exactly as production points it at the engine.
  getUploadCoordinator('hh-scan')!.configure({ store: store as never, householdId: 'hh-scan', run: (id) => engine.run(id) });
  await getUploadCoordinator('hh-scan')!.requestPump('resume_after_detach');

  const final = store.get(jobId!);
  record(final?.state === 'completed', '2.6. the coordinator carried the detached job all the way to completed');
  record(final?.contentId === 'content-1', '2.7. through the real register/upload/verify/finalize path');
  record(backend.countOf('/finalize') === 1, '2.8. finalize was called exactly once');

  // 3. The global reconciliation is what makes the file appear.
  record(events.length === 1, '3.1. the completed scanner file triggered ONE global reconciliation');
  record(events[0]?.role === 'file', '3.2. it reconciled the FILES read state');
  record(events[0]?.householdId === 'hh-scan', '3.3. scoped to the job\'s real household');
  record(events[0]?.jobId === jobId, '3.4. reported against the accepted scanner job');

  stop();
  __setSharedUploadJobStoreForTests(null);
}

// ── 4. failure BEFORE acceptance ─────────────────────────────────────────────

async function testFailureBeforeAcceptance(): Promise<void> {
  console.log('\n=== SCANNER 4: failure before acceptance keeps the Scanner open ===');
  resetWorld();
  const backend = new Backend();
  backend.hangRegister = true;
  backend.install();

  // The durable copy fails: this happens BEFORE any UploadJob exists.
  const { service } = newScannerIntake('hh-scan', { copyFails: true });
  const seen: FileIntakeState[] = [];
  service.subscribe((state) => seen.push(state));

  await service.submitArtifact(scannerArtifact('no-space'));
  record(service.getAcceptedJobId() === null, '4.1. nothing was accepted (no durable job id)');
  record(seen.some((state) => state.status === 'failed'), '4.2. the failure is projected to the surface');
  const outcome = scannerAcceptanceOutcome({ acceptedJobId: service.getAcceptedJobId(), alreadyAccepted: false });
  record(outcome.kind === 'stay', '4.3. so the policy says STAY: no navigation on this path');
  record(currentStore!.all().filter((job) => job.intakeSource === SCANNER_SOURCE).length === 0,
    '4.4. and no UploadJob was created at all');

  // Retry is possible precisely because the local PDF and the pages survive.
  const retryService = newScannerIntake('hh-scan').service;
  parkExecution('hh-scan', currentStore!);
  await retryService.submitArtifact(scannerArtifact('no-space-retry'));
  record(retryService.getAcceptedJobId() !== null,
    '4.5. retrying the preserved local artifact reaches acceptance (the draft was never lost)');

  __setSharedUploadJobStoreForTests(null);
}

// ── 5. failure AFTER acceptance ──────────────────────────────────────────────

async function testFailureAfterAcceptance(): Promise<void> {
  console.log('\n=== SCANNER 5: failure after acceptance is global, not a Scanner return ===');
  const store = resetWorld();
  const backend = new Backend();
  backend.failRegister = true;
  backend.install();

  const events: HomeCloudReadReconciliationEvent[] = [];
  const stop = subscribeHomeCloudReadReconciliation('hh-scan', (event) => events.push(event));

  const { service } = newScannerIntake('hh-scan');
  await service.submitArtifact(scannerArtifact('will-fail'));
  const jobId = service.getAcceptedJobId();
  record(jobId !== null, '5.1. the job WAS accepted first, so the Scanner detached');

  // The upload then fails, long after the Scanner is gone.
  const engine = createUploadEngine({
    store: store as never,
    uploadTransport: async () => ({ status: 200, ok: true }),
    getAccessToken: () => 'tok',
    getHouseholdId: () => 'hh-scan',
  });
  getUploadCoordinator('hh-scan')!.configure({ store: store as never, householdId: 'hh-scan', run: (id) => engine.run(id) });
  await getUploadCoordinator('hh-scan')!.requestPump('fail_after_detach');

  const failed = store.get(jobId!);
  record(failed?.state === 'failed', '5.2. the failure is recorded on the DURABLE job (a global fact)');
  record(failed?.error !== null, '5.3. with its error, so Upload Activity can present it');
  record(events.length === 0,
    '5.4. a failure is NOT a completion: Files is never reconciled for a file that did not land');

  // Navigating TO the Scanner is correct (the user asks for it explicitly). What
  // must not exist is any path that RE-ENTERS it because of a job outcome, so
  // the Scanner itself may only ever leave: it must contain no `navigate(`.
  const screen = readFront('screens/HomeCloudScannerScreen.tsx');
  const filesScreen = readFront('screens/HomeCloudFilesScreen.tsx');
  // B1: the Scanner gained ONE navigation — the explicit, user-driven push to
  // the image editor ("Editar página"). It is outbound, synchronous and
  // triggered only by a user tap, so no job outcome can traverse it. Every
  // OTHER navigate( stays forbidden exactly as before.
  const allPushes = (screen.match(/\bnavigate\(/g) ?? []).length;
  const editorPushes = (screen.match(/navigate\('ScannerImageEditor'/g) ?? []).length;
  record(allPushes === editorPushes,
    '5.5. the Scanner only navigates via the explicit user-driven editor push (B1); no failure can push it back on screen');
  const acceptedBody = between(screen, 'const handleAccepted = useCallback', '// Refresh the permission snapshot');
  record(!/\bnavigate\(/.test(acceptedBody),
    '5.5b. the acceptance/detach path itself still navigates nowhere');
  const entries = (filesScreen.match(/navigate\('HomeCloudScanner'/g) ?? []).length;
  record(entries === 1,
    '5.6. the only way into the Scanner is the single explicit user action in Files');
  record(!/intake|retry|status/.test(acceptedBody),
    '5.7. the detach handler owns no intake status, so a later failure cannot reopen it');

  stop();
  __setSharedUploadJobStoreForTests(null);
}

// ── 6. double tap "Guardar" ──────────────────────────────────────────────────

async function testDoubleTap(): Promise<void> {
  console.log('\n=== SCANNER 6: a double tap creates exactly one UploadJob ===');
  const store = resetWorld();
  const backend = new Backend();
  backend.hangRegister = true;
  backend.install();

  const guard = createScannerSubmitGuard();
  record(guard.tryBegin(), '6.1. the first tap is admitted');
  record(!guard.tryBegin(), '6.2. the second tap in the same frame is refused');
  guard.end();

  // End-to-end flavour: a FRESH guard (6.1/6.2 already consumed the first one),
  // and only ONE submit reaches the service, so only ONE job is created.
  const tapsGuard = createScannerSubmitGuard();
  const { service } = newScannerIntake('hh-scan');
  parkExecution('hh-scan', store);
  const taps = await Promise.all([tapsGuard.tryBegin(), tapsGuard.tryBegin(), tapsGuard.tryBegin()]);
  let submits = 0;
  for (const admitted of taps) {
    if (!admitted) continue;
    submits += 1;
    await service.submitArtifact(scannerArtifact('double-tap'));
  }
  tapsGuard.end();
  record(submits === 1, '6.3. three taps produced exactly ONE submit');
  record(store.all().filter((job) => job.intakeSource === SCANNER_SOURCE).length === 1,
    '6.4. and therefore exactly one durable UploadJob (no duplicate scan)');
  record(tapsGuard.tryBegin(), '6.5. the guard releases after the submit settles, so a later retry still works');

  __setSharedUploadJobStoreForTests(null);
}

// ── 7. no implicit cancel on navigation/unmount ──────────────────────────────

async function testNoImplicitCancel(): Promise<void> {
  console.log('\n=== SCANNER 7: navigation/unmount after acceptance never cancels ===');
  const store = resetWorld();
  const backend = new Backend();
  backend.hangRegister = true;
  backend.install();

  const { service } = newScannerIntake('hh-scan');
  const unsubscribe = service.subscribe(() => {});
  await service.submitArtifact(scannerArtifact('detach-clean'));
  const jobId = service.getAcceptedJobId()!;
  parkExecution('hh-scan', store);

  // Unmount: the subscription is dropped and the service is abandoned.
  unsubscribe();

  const plan = planScannerCleanupAfterAcceptance({
    captureUris: ['file:///scan/page-1.jpg', 'file:///scan/page-2.jpg'],
    generatedPdfUri: 'file:///scan/detach-clean.pdf',
  });
  record(plan.preservesDurableArtifact === true, '7.1. the cleanup plan preserves the durable artifact');
  record(plan.cancelsJob === false, '7.2. and it carries no way to cancel the job');
  record(!plan.deleteTempCaptureUris.includes(store.get(jobId)!.artifact.localUri),
    '7.3. the durable workspace copy is not in the deletable list');
  record(plan.deleteTempCaptureUris.length === 2 && plan.deleteGeneratedPdfUri !== null,
    '7.4. only the local captures and the source PDF are cleaned');

  const afterUnmount = store.get(jobId)!;
  record(afterUnmount.state !== 'cancelled', '7.5. unmounting did not cancel the accepted job');
  record(afterUnmount.state !== 'completed', '7.6. and did not fake a completion either');

  // The job is still fully executable by the global owner.
  backend.hangRegister = false;
  const engine = createUploadEngine({
    store: store as never,
    uploadTransport: async () => ({ status: 200, ok: true }),
    getAccessToken: () => 'tok',
    getHouseholdId: () => 'hh-scan',
  });
  getUploadCoordinator('hh-scan')!.configure({ store: store as never, householdId: 'hh-scan', run: (id) => engine.run(id) });
  await getUploadCoordinator('hh-scan')!.requestPump('after_unmount');
  record(store.get(jobId)!.state === 'completed',
    '7.7. the job still completed normally after the surface was gone');

  // Structural: the Scanner's back guard must not block its own detach.
  const screen = readFront('screens/HomeCloudScannerScreen.tsx');
  const acceptedBody = between(screen, 'const handleAccepted = useCallback', '// Refresh the permission snapshot');
  record(acceptedBody.includes('allowLeaveRef.current = true'),
    '7.8. the detach sets the leave permission, so beforeRemove cannot intercept it');

  __setSharedUploadJobStoreForTests(null);
}

// ── policy unit checks ───────────────────────────────────────────────────────

function testPolicy(): void {
  console.log('\n=== SCANNER policy units ===');
  record(scannerAcceptanceOutcome({ acceptedJobId: null, alreadyAccepted: false }).kind === 'stay',
    'P1. no accepted id ⇒ stay (never detach on a guess)');
  record(scannerAcceptanceOutcome({ acceptedJobId: 'job-1', alreadyAccepted: false }).kind === 'detach',
    'P2. an accepted id ⇒ detach');
  record(scannerAcceptanceOutcome({ acceptedJobId: 'job-1', alreadyAccepted: true }).kind === 'stay',
    'P3. the boundary is one-shot');
  const guard = createScannerSubmitGuard();
  record(guard.tryBegin() && !guard.tryBegin(), 'P4. the guard admits exactly one submit at a time');
  guard.end();
  record(guard.tryBegin(), 'P5. and releases afterwards');
  const empty = planScannerCleanupAfterAcceptance({ captureUris: [], generatedPdfUri: null });
  record(empty.deleteGeneratedPdfUri === null && empty.preservesDurableArtifact && !empty.cancelsJob,
    'P6. an empty cleanup still preserves the durable artifact and never cancels');
}

// ── helpers ──────────────────────────────────────────────────────────────────

function readFront(relative: string): string {
  const root = path.join(__dirname, '..', '..', '..', 'front', 'mi-front-limpio');
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function between(source: string, from: string, to: string): string {
  const start = source.indexOf(from);
  const end = source.indexOf(to, start);
  return start === -1 || end === -1 ? '' : source.slice(start, end);
}

async function main(): Promise<void> {
  console.log('=== HOMECLOUD W1-C SCANNER ACCEPTANCE → COMPLETED SAVE TESTS ===');
  testPolicy();
  await testDetachBeforeCompleted();
  await testCoordinatorSurvivesDetach();
  await testFailureBeforeAcceptance();
  await testFailureAfterAcceptance();
  await testDoubleTap();
  await testNoImplicitCancel();

  console.log(`\nHOMECLOUD_W1C_SCANNER_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    console.error('HOMECLOUD_W1C_SCANNER_TESTS=FAIL');
    process.exitCode = 1;
  } else {
    console.log('HOMECLOUD_W1C_SCANNER_TESTS=PASS');
  }
}

void main();
