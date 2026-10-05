/**
 * HomeCloud HC-2A — Frontend Upload Engine service.
 *
 * Reusable intake engine for all future HomeCloud intake flows. Picker/capture
 * agnostic: callers supply a local artifact + semantic context; the engine owns
 * the safe lifecycle (register -> upload -> verify -> finalize) over the
 * backend intake endpoints.
 *
 * T1 hardening (FSM of 9 states FROZEN, guardOwnership kept):
 * - the native upload transport is REQUIRED: a consumer without a valid
 *   transport fails at construction, never falls back to loading the whole
 *   file into JS heap (no whole-file buffered read path exists anywhere here);
 * - signed upload URLs are server authority: used verbatim, never rewritten
 *   client-side (no scheme/host/port/path mutation);
 * - failures are classified transient vs terminal on the side and persisted
 *   with the job (`error.retryable`), without new FSM states;
 * - terminal completed/cancelled jobs clean their durable workspace bytes
 *   (best-effort, swept at startup when missed);
 * - persistence uses the serialized chain (`putAsync` when available) and
 *   surfaces failures instead of swallowing them.
 *
 * It advances the durable UploadJob state machine and persists each transition
 * through an injected store so upstream UI can observe state cleanly without
 * embedding networking in screen components. Household/role/contentId ownership
 * is guarded (never retargeted).
 */

import { requestJson, createIdempotencyKey, OPERATION_KINDS } from '../api';
import type {
  UploadTransport,
  UploadJob,
  UploadJobRole,
  UploadJobError,
  UploadLocalArtifact,
  UploadIntakeContext,
  UploadAuthorization,
} from './homecloudUploadTypes';
import {
  createUploadJob,
  transition,
  guardOwnership,
  serializeUploadJob,
} from './homecloudUploadJob';
import { classifyUploadFailure, isStaleLifecycleError, STALE_LIFECYCLE_CODE } from './homecloudUploadFailure';
import type { UploadJobStore } from '../../storage/homecloudUploadJobStorage';
import { memoryDevTrace } from './homecloudMemoryDiagnostics';
import { getUploadCoordinator } from './homecloudUploadCoordinator';

export interface UploadEngineDeps {
  /** Durable job store (native persistence wired at app layer). */
  store: UploadJobStore;
  /**
   * Native file-to-file upload transport. REQUIRED: Expo FileSystem streams
   * file:// content without loading the original into JS memory. There is
   * no JS-heap fallback; construction throws without it.
   */
  uploadTransport: UploadTransport;
  /** Current access token supplier (re-read at each step, never cached). */
  getAccessToken: () => string | null;
  /** Current canonical Household id (server-resolved by callers). */
  getHouseholdId: () => string | null;
  /** Terminal durable cleanup (completed/cancelled). Best-effort. */
  cleanupDurableArtifact?: (artifact: UploadLocalArtifact) => Promise<unknown>;
}

/** Register response (safe content DTO). */
interface RegisterResponseContent {
  id: string;
  role: UploadJobRole;
}

export interface UploadEngine {
  createJob(ctx: UploadIntakeContext, artifact: UploadLocalArtifact): UploadJob;
  getJob(id: string): UploadJob | null;
  /** Advance the full lifecycle to completion. Returns the final job. */
  run(jobId: string): Promise<UploadJob>;
  cancel(jobId: string): UploadJob | null;
  /** Abort only the current native transfer; durable cancellation is coordinator-owned. */
  cancelActiveUpload(jobId: string): void;
}

export function maskSignedUploadUrlForDiagnostics(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.forEach((_, key) => parsed.searchParams.set(key, '<redacted>'));
    return parsed.toString();
  } catch {
    return '<unparseable-signed-url>';
  }
}

/**
 * Expo FileSystem native upload streams file:// content on Android/iOS without
 * first loading the original into JS memory. The server-issued signed URL is
 * used VERBATIM (server storage authority — never rewritten client-side). If
 * development needs a reachable host, it must be configured where the signed
 * URL is GENERATED (backend SUPABASE_URL), not patched here.
 *
 * V1 TRANSPORT (frozen): native PUT with REAL progress (native byte counters)
 * and REAL cancel (`cancelAsync`). There is NO byte resume in V1: every attempt
 * is a fresh PUT from byte 0; when a job resumes after an incomplete upload,
 * verify-first may skip retransmission if the complete object already exists.
 */
type ExpoLegacyFileSystem = typeof import('expo-file-system/legacy');

export function createExpoFileSystemUploadTransport(
  loadFileSystem: () => Promise<ExpoLegacyFileSystem> = () => import('expo-file-system/legacy'),
): UploadTransport {
  return async ({ signedUploadUrl, localUri, mimeType, signal, onProgress }) => {
    const FileSystem = await loadFileSystem();
    let abortRequested = signal.aborted;
    let nativeCancelStarted = false;
    let task: ReturnType<typeof FileSystem.createUploadTask> | null = null;
    const cancelNativeOnce = () => {
      abortRequested = true;
      if (!task || nativeCancelStarted) return;
      nativeCancelStarted = true;
      void task.cancelAsync().catch(() => undefined);
    };
    signal.addEventListener('abort', cancelNativeOnce, { once: true });
    if (abortRequested || signal.aborted) cancelNativeOnce();
    task = FileSystem.createUploadTask(signedUploadUrl, localUri, {
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      // Best-effort across a brief iOS suspension. Durable job recovery, not
      // this native session, remains the authority after process termination.
      sessionType: FileSystem.FileSystemSessionType.BACKGROUND,
      headers: {
        'content-type': mimeType || 'application/octet-stream',
        'x-upsert': 'false',
      },
    }, ({ totalBytesSent, totalBytesExpectedToSend }) => {
      if (!signal.aborted) onProgress({ bytesSent: totalBytesSent, totalBytes: totalBytesExpectedToSend });
    });
    if (signal.aborted) cancelNativeOnce();
    try {
      const response = await task.uploadAsync();
      if (!response) throw new Error(signal.aborted ? 'upload cancelled' : 'native upload ended without a response');
      return { status: response.status, ok: response.status >= 200 && response.status < 300 };
    } finally {
      signal.removeEventListener('abort', cancelNativeOnce);
      task = null;
    }
  };
}

type AsyncStore = UploadJobStore & {
  putAsync?: (job: UploadJob) => Promise<void>;
};

export function createUploadEngine(deps: UploadEngineDeps): UploadEngine {
  const { store, uploadTransport, getAccessToken, getHouseholdId } = deps;
  // Terminal cleanup is injected by the intake services (which already own
  // the native durable module). The no-op fallback keeps plain-Node tests
  // native-free; the startup orphan sweep backstops any missed delete.
  const cleanupDurableArtifact = deps.cleanupDurableArtifact ?? (async () => undefined);

  if (!uploadTransport || typeof uploadTransport !== 'function') {
    throw new Error('createUploadEngine requires a native uploadTransport (no JS-heap fallback)');
  }

  /**
   * Single-flight guard: concurrent run(jobId) calls for the SAME job share
   * one execution instead of racing register/upload/verify/finalize twice.
   * Keyed per engine instance; cross-instance duplicates are prevented by the
   * shared durable store + canonical recovery (one owner resumes each job).
   */
  const inFlight = new Map<string, Promise<UploadJob>>();
  type ActiveAttempt = { attemptId: string; controller: AbortController; lastBytesSent: number; closed: boolean };
  const activeAttempts = new Map<string, ActiveAttempt>();
  let attemptSequence = 0;

  function cancelActiveUpload(jobId: string): void {
    const attempt = activeAttempts.get(jobId);
    if (!attempt || attempt.closed || attempt.controller.signal.aborted) return;
    attempt.closed = true;
    attempt.controller.abort();
    getUploadCoordinator(requireJob(jobId).householdId)?.clearProgress(jobId, attempt.attemptId);
  }

  function requireAccessToken(): string {
    const token = getAccessToken();
    if (!token) throw new Error('no access token');
    return token;
  }

  function requireJob(id: string): UploadJob {
    const job = store.get(id);
    if (!job) throw new Error(`unknown job ${id}`);
    return job;
  }

  /**
   * The single finalize call site (canonical lifecycle close AND stale
   * reconciliation read-back), so both paths can never drift apart.
   */
  function requestFinalize(job: UploadJob, accessToken: string): Promise<{ content: RegisterResponseContent }> {
    return requestJson<{ content: RegisterResponseContent }>(
      `/api/homecloud/content/${job.contentId}/finalize`,
      { method: 'POST', accessToken, operationKind: OPERATION_KINDS.NON_VERSIONED_MUTATION },
    );
  }

  /** Terminal workspace cleanup. Never fails an already-terminal job. */
  async function cleanupTerminalArtifact(job: UploadJob): Promise<void> {
    try {
      await cleanupDurableArtifact(job.artifact);
    } catch {
      // Never fail a terminal job on storage cleanup; the sweep is the backstop.
    }
  }

  /**
   * Record a terminal failure WITHOUT ever losing it.
   *
   * `transition` rejects a same-state edge (`canTransition` returns false when
   * `from === to`), and `failed -> failed` is exactly the edge a RETRY needs:
   * a job that already failed transiently, is resumed, and fails again. Calling
   * `transition(job, 'failed')` there threw `Illegal upload job transition`
   * BEFORE the new classification was persisted, so the job kept its previous
   * `retryable` flag, stayed eligible and was re-selected by every following
   * pump — the endless `verify -> upload -> 409` cycle.
   *
   * The frozen 9-state FSM is untouched: this only refreshes the error of a job
   * that is already `failed`, which is data, not a new state.
   */
  function failJob(job: UploadJob, error: UploadJob['error']): UploadJob {
    if (job.state === 'failed') {
      return { ...job, state: 'failed', error, updatedAt: new Date().toISOString() };
    }
    return transition(job, 'failed', { error });
  }

  /**
   * T1: cancel authority. The coordinator/UI owns `cancelled`, so an in-flight
   * `run` must never resurrect a job the user cancelled while a network step
   * was pending. Returns the terminal job when the durable store says the job
   * already reached a terminal state that this execution must not overwrite.
   */
  function terminalElse(job: UploadJob): UploadJob | null {
    const latest = store.get(job.id);
    if (latest && (latest.state === 'cancelled' || latest.state === 'completed')) return latest;
    return null;
  }

  async function persist(job: UploadJob): Promise<void> {
    // A cancelled/completed job is final: writing a stale intermediate
    // transition over it would silently restart work the user stopped.
    const terminal = terminalElse(job);
    if (terminal) return;
    const asyncStore = store as AsyncStore;
    if (typeof asyncStore.putAsync === 'function') {
      await asyncStore.putAsync(job);
      getUploadCoordinator(job.householdId)?.notifyJob();
      return;
    }
    store.put(job);
    getUploadCoordinator(job.householdId)?.notifyJob();
  }

  /**
   * The artifact identity each memory phase actually hands to the backend.
   * Allow-listed scalars only — never tokens, signed URLs, household IDs, file
   * bytes or paths — so `register`/`upload`/`verify` can be compared from logs
   * when a memory does not land. Once per job per phase, so it stays quiet.
   */
  function memoryArtifactTraceFields(job: UploadJob): { jobId: string; kind: string; mimeType: string | null; extension: string | null; sizeBytes: number | null } | null {
    if (job.role !== 'memory') return null;
    const mimeType = job.artifact.mimeType ?? '';
    return {
      jobId: job.id,
      kind: mimeType.startsWith('image/') ? 'image' : mimeType.startsWith('video/') ? 'video' : mimeType.startsWith('audio/') ? 'audio' : 'other',
      mimeType: mimeType || null,
      extension: job.artifact.extension ?? null,
      sizeBytes: job.artifact.sizeBytes ?? null,
    };
  }

  async function runRegister(job: UploadJob): Promise<UploadJob> {
    const traceFields = memoryArtifactTraceFields(job);
    if (traceFields) memoryDevTrace('register_start', traceFields);
    const householdId = getHouseholdId();
    if (!householdId) throw new Error('no active household');
    const guard = guardOwnership(job, { householdId });
    if (guard) throw new Error(guard);

    // Recovery may already be parked at `registering`, and an explicit retry
    // without a content id re-enters from `failed`. Transition exactly once.
    let job2 = job.state === 'registering' ? job : transition(job, 'registering');
    await persist(job2);

    const accessToken = requireAccessToken();
    const payload = {
      role: job2.role,
      displayName: job2.artifact.displayName,
      mimeType: job2.artifact.mimeType,
      sizeBytes: job2.artifact.sizeBytes,
      extension: job2.artifact.extension,
      intakeRequestId: job2.intakeRequestId,
      ...(job2.role === 'file'
        ? {
            folderId: job2.initialFolderId ?? null,
          }
        : {}),
      ...(job2.role === 'memory'
        ? {
            initialAlbumId: job2.initialAlbumId ?? null,
            caption: job2.caption ?? undefined,
            capturedAt: job2.capturedAt ?? undefined,
            capturedYear: job2.capturedYear ?? undefined,
            capturedMonth: job2.capturedMonth ?? undefined,
            capturePrecision: job2.capturePrecision ?? undefined,
          }
        : {}),
    };

    const resp = await requestJson<{ content: RegisterResponseContent }>(
      '/api/homecloud/register',
      {
        method: 'POST',
        accessToken,
        body: payload,
        operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
        idempotencyKey: createIdempotencyKey('homecloud.register'),
        mutationId: job2.intakeRequestId,
      },
    );

    job2 = transition(job2, 'registered', { contentId: resp.content.id });
    await persist(job2);
    if (job.role === 'memory') memoryDevTrace('register_end', { jobId: job.id });
    return job2;
  }

  async function runUpload(job: UploadJob): Promise<UploadJob> {
    const traceFields = memoryArtifactTraceFields(job);
    if (traceFields) memoryDevTrace('upload_start', traceFields);
    const accessToken = requireAccessToken();

    // Resume path: this job already left `uploading` persisted (interrupted
    // after a successful PUT, or remount before verify). Ask the idempotent
    // verify contract first: if the original is already there, skip the
    // re-upload (the signed PUT uses x-upsert=false, so a blind re-PUT could
    // fail on an object that already exists).
    //
    // VERIFY-FIRST ERROR HANDLING: only a NEGATIVE verify
    // (`verified === false`, i.e. the object is missing) authorises spending a
    // PUT. A thrown error is NOT "not verified": it is classified and
    // propagated. A domain refusal such as `homecloud_not_staging` is terminal
    // and must never be converted into "let's upload again" — that conversion
    // is what produced the endless `verify 409 → upload 409` pair on stale
    // content. A transient transport condition still falls through, because
    // re-issuing the PUT is exactly the right response to it.
    if (job.state === 'uploading' && job.contentId) {
      try {
        const resumed = await requestJson<{ verified: boolean }>(
          `/api/homecloud/content/${job.contentId}/verify`,
          { method: 'POST', accessToken, operationKind: OPERATION_KINDS.NON_VERSIONED_MUTATION },
        );
        if (resumed.verified) {
          const verifyingJob = transition(job, 'verifying');
          await persist(verifyingJob);
          if (job.role === 'memory') memoryDevTrace('upload_end', { jobId: job.id, resumed: true });
          return verifyingJob;
        }
        // `verified === false`: the original is genuinely absent. Fall through.
      } catch (error) {
        if (classifyUploadFailure(error) === 'terminal') throw error;
        // Transient: fall through to re-upload (retryable transport condition).
      }
    }

    const uploadingJob = job.state === 'registered'
      ? transition(job, 'uploading')
      : job;
    await persist(uploadingJob);

    const attempt: ActiveAttempt = {
      attemptId: `${uploadingJob.id}:${++attemptSequence}`,
      controller: new AbortController(),
      lastBytesSent: 0,
      closed: false,
    };
    activeAttempts.set(uploadingJob.id, attempt);
    const coordinator = getUploadCoordinator(uploadingJob.householdId);
    const expectedSize = uploadingJob.artifact.sizeBytes;
    coordinator?.reportProgress({
      jobId: uploadingJob.id,
      attemptId: attempt.attemptId,
      contentId: uploadingJob.contentId,
      displayName: uploadingJob.artifact.displayName,
      status: 'uploading',
      bytesSent: 0,
      totalBytes: expectedSize,
      progress: 0,
      canCancel: true,
    });

    try {
      const authResp = await requestJson<UploadAuthorization>(
        `/api/homecloud/content/${job.contentId}/upload`,
        { method: 'POST', accessToken, operationKind: OPERATION_KINDS.NON_VERSIONED_MUTATION },
      );
      if (attempt.controller.signal.aborted || terminalElse(uploadingJob)) return store.get(job.id) ?? uploadingJob;

      const result = await uploadTransport({
        signedUploadUrl: authResp.signedUploadUrl,
        localUri: uploadingJob.artifact.localUri,
        mimeType: uploadingJob.artifact.mimeType,
        signal: attempt.controller.signal,
        onProgress: ({ bytesSent, totalBytes }) => {
          if (activeAttempts.get(uploadingJob.id) !== attempt || attempt.closed || attempt.controller.signal.aborted) return;
          if (!Number.isFinite(bytesSent) || !Number.isFinite(totalBytes)) return;
          if (bytesSent < attempt.lastBytesSent || bytesSent < 0) return;
          // The durable artifact size is authority. A native callback claiming
          // a different known total cannot be presented as truthful progress.
          if (expectedSize > 0 && totalBytes > 0 && totalBytes !== expectedSize) return;
          const trustedTotal = expectedSize > 0 ? expectedSize : totalBytes;
          if (trustedTotal <= 0 || bytesSent > trustedTotal) return;
          attempt.lastBytesSent = bytesSent;
          coordinator?.reportProgress({
            jobId: uploadingJob.id,
            attemptId: attempt.attemptId,
            contentId: uploadingJob.contentId,
            displayName: uploadingJob.artifact.displayName,
            status: 'uploading',
            bytesSent,
            totalBytes: trustedTotal,
            progress: Math.max(0, Math.min(1, bytesSent / trustedTotal)),
            canCancel: true,
          });
        },
      });
      if (attempt.controller.signal.aborted || terminalElse(uploadingJob)) return store.get(job.id) ?? uploadingJob;
    if (!result.ok) {
      if (job.role === 'memory') memoryDevTrace('upload_end', { jobId: job.id, ok: false, status: result.status });
      throw new Error(`upload transport failed: ${result.status}`);
    }

    // Durable BEFORE the next fragile step: a reload/remount here must resume
    // at verify, never strand the job at `uploading` again.
    const verifyingJob = transition(uploadingJob, 'verifying');
    await persist(verifyingJob);
    if (job.role === 'memory') memoryDevTrace('upload_end', { jobId: job.id, ok: true });
    return verifyingJob;
    } finally {
      attempt.closed = true;
      if (activeAttempts.get(uploadingJob.id) === attempt) activeAttempts.delete(uploadingJob.id);
      coordinator?.clearProgress(uploadingJob.id, attempt.attemptId);
    }
  }

  async function runVerify(job: UploadJob): Promise<UploadJob> {
    if (job.role === 'memory') memoryDevTrace('verify_start', { jobId: job.id });
    const accessToken = requireAccessToken();
    const resp = await requestJson<{ verified: boolean }>(
      `/api/homecloud/content/${job.contentId}/verify`,
      { method: 'POST', accessToken, operationKind: OPERATION_KINDS.NON_VERSIONED_MUTATION },
    );
    if (!resp.verified) {
      if (job.role === 'memory') memoryDevTrace('verify_end', { jobId: job.id, verified: false });
      throw new Error('upload verification failed: original missing or mismatched');
    }
    const finalizingJob = transition(job, 'finalizing');
    await persist(finalizingJob);
    if (job.role === 'memory') memoryDevTrace('verify_end', { jobId: job.id, verified: true });
    return finalizingJob;
  }

  async function runFinalize(job: UploadJob): Promise<UploadJob> {
    if (job.role === 'memory') memoryDevTrace('finalize_start', { jobId: job.id });
    const accessToken = requireAccessToken();
    await requestFinalize(job, accessToken);
    // finalize is idempotent server-side (staging -> active guarded; active
    // replay returns success), so persisting completed is always safe here.
    const completedJob = transition(job, 'completed');
    await persist(completedJob);
    // Terminal cleanup: completed jobs must not retain workspace bytes.
    // Best-effort: the startup orphan sweep is the backstop.
    await cleanupTerminalArtifact(completedJob);
    if (job.role === 'memory') memoryDevTrace('finalize_end', { jobId: job.id });
    return completedJob;
  }

  /**
   * STALE JOB RECONCILIATION (bounded, exactly one extra request).
   *
   * The server answered `homecloud_not_staging` for the content THIS job
   * registered. That alone proves nothing, so completion is never declared
   * from the 409 itself. `finalize` is the existing idempotent read-back on the
   * same contentId: when the content is already `active` it returns 200 with
   * the content DTO (a binary `finalize` also re-checks that the original
   * exists before flipping the lifecycle), which is positive proof that this
   * intake already landed. When it refuses again (trashed, foreign, missing)
   * the caller keeps the job TERMINAL — no completion is inferred.
   *
   * No new endpoint, no new state, no retry loop: at most ONE finalize.
   */
  async function reconcileStaleContent(job: UploadJob): Promise<UploadJob | null> {
    if (!job.contentId) return null;
    const accessToken = getAccessToken();
    if (!accessToken) return null;
    try {
      await requestFinalize(job, accessToken);
    } catch {
      // Completion could not be proven: the caller parks the job as terminal.
      return null;
    }
    // `failed -> finalizing -> completed` are both legal transitions of the
    // frozen 9-state FSM, so the reconciliation needs no new state and the
    // durable record only ever stores the real terminal outcome.
    const parked = failJob(job, { code: STALE_LIFECYCLE_CODE, message: 'stale content reconciled', retryable: false });
    const finalizing = transition(parked, 'finalizing');
    const completed = transition(finalizing, 'completed');
    await persist(completed);
    await cleanupTerminalArtifact(completed);
    if (job.role === 'memory') memoryDevTrace('finalize_end', { jobId: job.id, reconciled: true });
    return completed;
  }

  async function runInner(jobId: string): Promise<UploadJob> {
    let job = requireJob(jobId);
    // Terminal jobs never rerun: no network, no transition, no duplicate side
    // effects. Recovery filters these out; this is defense in depth.
    if (job.state === 'completed') return job;
    if (job.state === 'cancelled') throw new Error('job cancelled');
    // A cancel that landed while this execution awaited a network step wins:
    // stop before spending another request on a job the user already stopped.
    const stopIfCancelled = (): UploadJob | null => {
      const latest = store.get(jobId);
      return latest?.state === 'cancelled' ? latest : null;
    };
    try {
      if (job.state === 'pending' || job.state === 'registering' || (job.state === 'failed' && !job.contentId)) {
        job = await runRegister(job);
        const stopped = stopIfCancelled();
        if (stopped) return stopped;
      }
      // A failed job that already owns a contentId re-enters through the
      // upload stage (verify-first): if the original never reached storage,
      // verify is negative and the bytes are re-uploaded to the SAME content;
      // if it did, the PUT is skipped and the job continues at verify.
      if (job.state === 'registered' || job.state === 'uploading' || (job.state === 'failed' && job.contentId)) {
        job = await runUpload(job.state === 'failed' ? transition(job, 'uploading') : job);
        const stopped = stopIfCancelled();
        if (stopped) return stopped;
      }
      if (job.state === 'verifying') {
        job = await runVerify(job);
        const stopped = stopIfCancelled();
        if (stopped) return stopped;
      }
      if (job.state === 'finalizing') {
        job = await runFinalize(job);
      }
      if (job.state === 'completed') {
        await persist(job);
        return job;
      }
      if (job.state === 'cancelled') {
        throw new Error('job cancelled');
      }

      await persist(job);
      return job;
    } catch (error) {
      const terminal = terminalElse(job);
      if (terminal) return terminal;
      // STALE SERVER-LIFECYCLE: `homecloud_not_staging` is terminal by contract.
      // Before parking it, spend the ONE bounded reconciliation request that
      // can PROVE this same content already landed (idempotent finalize). If the
      // proof fails, the job is terminal-failed with `retryable: false` and can
      // never be selected again by a pump, a reconnect or a remount.
      if (isStaleLifecycleError(error) && job.contentId && job.state !== 'completed' && job.state !== 'cancelled') {
        const reconciled = await reconcileStaleContent(job).catch(() => null);
        if (reconciled) return reconciled;
      }
      // T1: classify transient vs terminal on the side (FSM unchanged) and
      // persist the flag with the failure so reconnect/startup eligibility
      // can auto-retry transient jobs without ever auto-looping terminal
      // ones. Persistence failures stay VISIBLE (thrown to the caller).
      const failureClass = classifyUploadFailure(error);
      const failed = failJob(job, {
        code: isStaleLifecycleError(error) ? STALE_LIFECYCLE_CODE : 'upload_engine_error',
        message: error instanceof Error ? error.message : String(error),
        retryable: failureClass === 'transient',
      });
      await persist(failed);
      throw error;
    }
  }

  async function run(jobId: string): Promise<UploadJob> {
    const ongoing = inFlight.get(jobId);
    if (ongoing) return ongoing;
    const execution = runInner(jobId).finally(() => {
      if (inFlight.get(jobId) === execution) inFlight.delete(jobId);
    });
    inFlight.set(jobId, execution);
    return execution;
  }

  return {
    createJob(ctx, artifact) {
      const householdId = getHouseholdId();
      if (!householdId) throw new Error('no active household');
      const job = createUploadJob(householdId, ctx, artifact);
      const asyncStore = store as AsyncStore;
      if (typeof asyncStore.putAsync === 'function') {
        // Durable-first callers await pump/enqueue; fire-and-observe here for
        // the legacy sync return shape (failure recorded on the chain).
        void asyncStore.putAsync(job).catch(() => {});
      } else {
        store.put(job);
      }
      return job;
    },
    getJob(id) {
      return store.get(id);
    },
    run,
    cancel(id) {
      cancelActiveUpload(id);
      const job = store.get(id);
      if (!job) return null;
      if (job.state === 'cancelled' || job.state === 'completed') return job;
      let cancelled: UploadJob;
      try { cancelled = transition(job, 'cancelled'); } catch { return store.get(id); }
      const asyncStore = store as AsyncStore;
      if (typeof asyncStore.putAsync === 'function') {
        void asyncStore.putAsync(cancelled).catch(() => {});
      } else {
        store.put(cancelled);
      }
      // Terminal cleanup best-effort; the sweep backstops missed deletes.
      void cleanupDurableArtifact(cancelled.artifact).catch(() => {});
      return cancelled;
    },
    cancelActiveUpload,
  };
}

export { serializeUploadJob };
