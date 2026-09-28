/**
 * HomeCloud HC-2A — Frontend Upload Engine service.
 *
 * Reusable intake engine for all future HomeCloud intake flows. Picker/capture
 * agnostic: callers supply a local artifact + semantic context; the engine owns
 * the safe lifecycle (register -> upload -> verify -> finalize) over the
 * backend intake endpoints.
 *
 * It advances the durable UploadJob state machine and persists each transition
 * through an injected store so upstream UI can observe state cleanly without
 * embedding networking in screen components. Household/role/contentId ownership
 * is guarded (never retargeted).
 */

import { requestJson, createIdempotencyKey, OPERATION_KINDS } from '../api';
import type {
  UploadArtifactReader,
  UploadTransport,
  UploadJob,
  UploadJobRole,
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
import type { UploadJobStore } from '../../storage/homecloudUploadJobStorage';
import { memoryDevTrace } from './homecloudMemoryDiagnostics';

export interface UploadEngineDeps {
  /** Durable job store (native persistence wired at app layer). */
  store: UploadJobStore;
  /** Reads local artifact bytes from a local URI (picker/capture agnostic). */
  readArtifact: UploadArtifactReader;
  /** Uploads a local artifact to the server-issued signed URL. */
  uploadTransport?: UploadTransport;
  /** Current access token supplier (re-read at each step, never cached). */
  getAccessToken: () => string | null;
  /** Current canonical Household id (server-resolved by callers). */
  getHouseholdId: () => string | null;
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
}

/**
 * Build a "read bytes" reader using global fetch (works for web and many RN URI
 * schemes). Injectable so tests/scanner/recorder can supply their own.
 */
export function createFetchArtifactReader(): UploadArtifactReader {
  return async (localUri: string) => {
    const resp = await fetch(localUri);
    if (!resp.ok) throw new Error(`artifact read failed: ${resp.status}`);
    return resp.arrayBuffer();
  };
}

function getRuntimeSupabaseOrigin(): string | null {
  const raw = process.env.EXPO_PUBLIC_HOMECLOUD_STORAGE_URL
    ?? process.env.EXPO_PUBLIC_SUPABASE_URL
    ?? null;
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

/**
 * Supabase creates signed URLs with the backend Supabase origin. In local
 * Android, that origin may be host-local (localhost/127.0.0.1) even though the
 * device must reach Supabase through its runtime origin. Replace ONLY origin;
 * path and signed query stay byte-for-byte from the server authorization.
 */
export function normalizeSignedUploadUrlForRuntime(signedUploadUrl: string): string {
  const runtimeOrigin = getRuntimeSupabaseOrigin();
  if (!runtimeOrigin) return signedUploadUrl;

  try {
    const signed = new URL(signedUploadUrl);
    const runtime = new URL(runtimeOrigin);
    signed.protocol = runtime.protocol;
    signed.host = runtime.host;
    return signed.toString();
  } catch {
    return signedUploadUrl;
  }
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
 * first loading the original into JS memory.
 */
export function createExpoFileSystemUploadTransport(): UploadTransport {
  return async ({ signedUploadUrl, localUri, mimeType }) => {
    const FileSystem = await import('expo-file-system/legacy');
    const targetUrl = normalizeSignedUploadUrlForRuntime(signedUploadUrl);
    const response = await FileSystem.uploadAsync(targetUrl, localUri, {
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        'content-type': mimeType || 'application/octet-stream',
        'x-upsert': 'false',
      },
    });
    return { status: response.status, ok: response.status >= 200 && response.status < 300 };
  };
}

export function createUploadEngine(deps: UploadEngineDeps): UploadEngine {
  const { store, readArtifact, uploadTransport, getAccessToken, getHouseholdId } = deps;

  /**
   * Single-flight guard: concurrent run(jobId) calls for the SAME job share
   * one execution instead of racing register/upload/verify/finalize twice.
   * Keyed per engine instance; cross-instance duplicates are prevented by the
   * shared durable store + canonical recovery (one owner resumes each job).
   */
  const inFlight = new Map<string, Promise<UploadJob>>();

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

  function persist(job: UploadJob): void {
    store.put(job);
  }

  async function runRegister(job: UploadJob): Promise<UploadJob> {
    if (job.role === 'memory') memoryDevTrace('register_start', { jobId: job.id });
    const householdId = getHouseholdId();
    if (!householdId) throw new Error('no active household');
    const guard = guardOwnership(job, { householdId });
    if (guard) throw new Error(guard);

    let job2 = transition(job, 'registering');
    persist(job2);

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
    persist(job2);
    if (job.role === 'memory') memoryDevTrace('register_end', { jobId: job.id });
    return job2;
  }

  async function runUpload(job: UploadJob): Promise<UploadJob> {
    if (job.role === 'memory') memoryDevTrace('upload_start', { jobId: job.id });
    const accessToken = requireAccessToken();

    // Resume path: this job already left `uploading` persisted (interrupted
    // after a successful PUT, or remount before verify). Ask the idempotent
    // verify contract first: if the original is already there, skip the
    // re-upload (the signed PUT uses x-upsert=false, so a blind re-PUT could
    // fail on an object that already exists).
    if (job.state === 'uploading' && job.contentId) {
      try {
        const resumed = await requestJson<{ verified: boolean }>(
          `/api/homecloud/content/${job.contentId}/verify`,
          { method: 'POST', accessToken, operationKind: OPERATION_KINDS.NON_VERSIONED_MUTATION },
        );
        if (resumed.verified) {
          const verifyingJob = transition(job, 'verifying');
          persist(verifyingJob);
          if (job.role === 'memory') memoryDevTrace('upload_end', { jobId: job.id, resumed: true });
          return verifyingJob;
        }
      } catch {
        // Verify unavailable/negative on resume: fall through to re-upload.
      }
    }

    const uploadingJob = job.state === 'registered'
      ? transition(job, 'uploading')
      : job;
    persist(uploadingJob);

    const authResp = await requestJson<UploadAuthorization>(
      `/api/homecloud/content/${job.contentId}/upload`,
      { method: 'POST', accessToken, operationKind: OPERATION_KINDS.NON_VERSIONED_MUTATION },
    );

    if (uploadTransport) {
      const result = await uploadTransport({
        signedUploadUrl: authResp.signedUploadUrl,
        localUri: uploadingJob.artifact.localUri,
        mimeType: uploadingJob.artifact.mimeType,
      });
      if (!result.ok) {
        throw new Error(`upload transport failed: ${result.status}`);
      }
    } else {
      const bytes = await readArtifact(uploadingJob.artifact.localUri);
      const putResp = await fetch(normalizeSignedUploadUrlForRuntime(authResp.signedUploadUrl), {
        method: 'PUT',
        headers: {
          'content-type': uploadingJob.artifact.mimeType || 'application/octet-stream',
          'x-upsert': 'false',
        },
        body: bytes,
      });
      if (!putResp.ok) {
        throw new Error(`upload transport failed: ${putResp.status}`);
      }
    }

    // Durable BEFORE the next fragile step: a reload/remount here must resume
    // at verify, never strand the job at `uploading` again.
    const verifyingJob = transition(uploadingJob, 'verifying');
    persist(verifyingJob);
    if (job.role === 'memory') memoryDevTrace('upload_end', { jobId: job.id });
    return verifyingJob;
  }

  async function runVerify(job: UploadJob): Promise<UploadJob> {
    if (job.role === 'memory') memoryDevTrace('verify_start', { jobId: job.id });
    const accessToken = requireAccessToken();
    const resp = await requestJson<{ verified: boolean }>(
      `/api/homecloud/content/${job.contentId}/verify`,
      { method: 'POST', accessToken, operationKind: OPERATION_KINDS.NON_VERSIONED_MUTATION },
    );
    if (!resp.verified) {
      throw new Error('upload verification failed: original missing or mismatched');
    }
    const finalizingJob = transition(job, 'finalizing');
    persist(finalizingJob);
    if (job.role === 'memory') memoryDevTrace('verify_end', { jobId: job.id });
    return finalizingJob;
  }

  async function runFinalize(job: UploadJob): Promise<UploadJob> {
    if (job.role === 'memory') memoryDevTrace('finalize_start', { jobId: job.id });
    const accessToken = requireAccessToken();
    await requestJson<{ content: RegisterResponseContent }>(
      `/api/homecloud/content/${job.contentId}/finalize`,
      { method: 'POST', accessToken, operationKind: OPERATION_KINDS.NON_VERSIONED_MUTATION },
    );
    // finalize is idempotent server-side (staging -> active guarded; active
    // replay returns success), so persisting completed is always safe here.
    const completedJob = transition(job, 'completed');
    persist(completedJob);
    if (job.role === 'memory') memoryDevTrace('finalize_end', { jobId: job.id });
    return completedJob;
  }

  async function runInner(jobId: string): Promise<UploadJob> {
    let job = requireJob(jobId);
    // Terminal jobs never rerun: no network, no transition, no duplicate side
    // effects. Recovery filters these out; this is defense in depth.
    if (job.state === 'completed') return job;
    if (job.state === 'cancelled') throw new Error('job cancelled');
    try {
      if (job.state === 'pending' || job.state === 'registering' || (job.state === 'failed' && !job.contentId)) {
        job = await runRegister(job);
      }
      // A failed job that already owns a contentId re-enters through the
      // upload stage (verify-first): if the original never reached storage,
      // verify is negative and the bytes are re-uploaded to the SAME content;
      // if it did, the PUT is skipped and the job continues at verify.
      if (job.state === 'registered' || job.state === 'uploading' || (job.state === 'failed' && job.contentId)) {
        job = await runUpload(job.state === 'failed' ? transition(job, 'uploading') : job);
      }
      if (job.state === 'verifying') {
        job = await runVerify(job);
      }
      if (job.state === 'finalizing') {
        job = await runFinalize(job);
      }
      if (job.state === 'completed') {
        persist(job);
        return job;
      }
      if (job.state === 'cancelled') {
        throw new Error('job cancelled');
      }

      persist(job);
      return job;
    } catch (error) {
      const failed = transition(job, 'failed', {
        error: { code: 'upload_engine_error', message: error instanceof Error ? error.message : String(error) },
      });
      persist(failed);
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
      persist(job);
      return job;
    },
    getJob(id) {
      return store.get(id);
    },
    run,
    cancel(id) {
      const job = store.get(id);
      if (!job) return null;
      const cancelled = transition(job, 'cancelled');
      persist(cancelled);
      return cancelled;
    },
  };
}

export { serializeUploadJob };
