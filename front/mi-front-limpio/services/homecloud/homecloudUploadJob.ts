/**
 * HomeCloud HC-2A — Upload Job model: factory, state machine, serialization.
 *
 * Pure, dependency-free module (no react-native / requestJson imports) so it is
 * trivially unit-testable and compiles standalone. The engine (separate module)
 * owns networking; this module owns durable identity, lifecycle legality and
 * (de)serialization.
 */

import type {
  UploadJob,
  UploadJobState,
  UploadLocalArtifact,
  UploadIntakeContext,
  UploadJobError,
} from './homecloudUploadTypes';

// ── State machine ─────────────────────────────────────────────────────────────

/** Allowed forward/recover transitions (explicit, no dozens of states). */
const FORWARD_TRANSITIONS: Readonly<Record<UploadJobState, UploadJobState[]>> = {
  pending: ['registering'],
  registering: ['registered'],
  registered: ['uploading'],
  uploading: ['verifying'],
  verifying: ['finalizing'],
  finalizing: ['completed'],
  completed: [],
  failed: ['registering', 'uploading', 'verifying', 'finalizing'],
  cancelled: [],
};

/** A job may transition to failed from any non-terminal state. */
const FAILABLE_STATES: ReadonlySet<UploadJobState> = new Set([
  'pending',
  'registering',
  'registered',
  'uploading',
  'verifying',
  'finalizing',
]);

/** A job may be cancelled from any state before finalizing/completed. */
const CANCELLABLE_STATES: ReadonlySet<UploadJobState> = new Set([
  'pending',
  'registering',
  'registered',
  'uploading',
  'verifying',
]);

export const TERMINAL_STATES: ReadonlySet<UploadJobState> = new Set([
  'completed',
  'cancelled',
]);

/**
 * True if `to` is a legal next state from `from`. Terminal reached.
 * `failed` is reachable from any non-terminal state; recovery is from `failed`
 * back into a resume point (registering/uploading/verifying/finalizing).
 */
export function canTransition(from: UploadJobState, to: UploadJobState): boolean {
  if (from === to) return false;
  if (to === 'failed') return FAILABLE_STATES.has(from);
  if (to === 'cancelled') return CANCELLABLE_STATES.has(from);
  const allowed = FORWARD_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

/**
 * Transition a job. Never mutates the input: returns a new object (or throws on
 * illegal transition). resetError is implied when leaving a failed state.
 */
export function transition(
  job: UploadJob,
  to: UploadJobState,
  patch?: Partial<Pick<UploadJob, 'contentId' | 'error'>>,
): UploadJob {
  if (!canTransition(job.state, to)) {
    throw new Error(`Illegal upload job transition: ${job.state} -> ${to}`);
  }
  return {
    ...job,
    state: to,
    contentId: patch?.contentId !== undefined ? patch.contentId : job.contentId,
    error: to === 'failed' ? (patch?.error ?? job.error) : null,
    updatedAt: new Date().toISOString(),
  };
}

// ── Factory ──────────────────────────────────────────────────────────────────

let localIdCounter = 0;

function generateLocalJobId(): string {
  localIdCounter += 1;
  const random = Math.random().toString(36).slice(2, 10);
  return `job_${Date.now()}_${localIdCounter}_${random}`;
}

function generateIntakeRequestId(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `intake_${Date.now()}_${random}`;
}

/**
 * Create a new durable job bound to a Household + role. The artifact is the
 * caller's local representation; the engine never cares how it was produced.
 */
export function createUploadJob(
  householdId: string,
  ctx: UploadIntakeContext,
  artifact: UploadLocalArtifact,
): UploadJob {
  if (!householdId || typeof householdId !== 'string') {
    throw new Error('householdId is required to create an upload job');
  }
  const now = new Date().toISOString();
  return {
    id: generateLocalJobId(),
    householdId,
    role: ctx.role,
    intakeSource: ctx.intakeSource,
    initialFolderId: ctx.initialFolderId ?? null,
    initialAlbumId: ctx.initialAlbumId ?? null,
    caption: ctx.caption ?? null,
    capturedAt: ctx.capturedAt ?? null,
    capturedYear: ctx.capturedYear ?? null,
    capturedMonth: ctx.capturedMonth ?? null,
    capturePrecision: ctx.capturePrecision ?? null,
    artifact: { ...artifact },
    state: 'pending',
    contentId: null,
    intakeRequestId: generateIntakeRequestId(),
    error: null,
    createdAt: now,
    updatedAt: now,
  };
}

// ── Immutability guards (ownership identity) ─────────────────────────────────

/**
 * Guards against silently retargeting a job to another Household, role or
 * contentId. Returns the offending reason or null when safe to proceed.
 */
export function guardOwnership(
  job: UploadJob,
  next: { householdId?: string; role?: UploadJob['role']; contentId?: string | null },
): string | null {
  if (next.householdId !== undefined && next.householdId !== job.householdId) {
    return `household switch would retarget job ${job.id}`;
  }
  if (next.role !== undefined && next.role !== job.role) {
    return `role change would retarget job ${job.id}`;
  }
  if (next.contentId !== undefined && job.contentId !== null && next.contentId !== job.contentId) {
    return `contentId change would retarget registered job ${job.id}`;
  }
  return null;
}

// ── Serialization ────────────────────────────────────────────────────────────

/** Serialize a job to a stable JSON string (durable persistence boundary). */
export function serializeUploadJob(job: UploadJob): string {
  return JSON.stringify(job);
}

/**
 * Deserialize a job string back into an UploadJob. Returns null on malformed
 * input (caller decides how to surface recovery).
 */
export function deserializeUploadJob(json: string): UploadJob | null {
  try {
    const parsed = JSON.parse(json) as UploadJob;
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof parsed.id !== 'string' ||
      typeof parsed.householdId !== 'string' ||
      typeof parsed.role !== 'string' ||
      typeof parsed.state !== 'string' ||
      !parsed.artifact ||
      typeof parsed.artifact.localUri !== 'string'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Minimal validity check for a restored job (identity + role + artifact). */
export function isRestorableJob(job: UploadJob | null | undefined): job is UploadJob {
  if (!job) return false;
  return (
    typeof job.id === 'string' &&
    job.id.length > 0 &&
    typeof job.householdId === 'string' &&
    job.householdId.length > 0 &&
    (job.role === 'file' || job.role === 'memory') &&
    typeof job.state === 'string' &&
    job.artifact !== null &&
    typeof job.artifact === 'object' &&
    typeof job.artifact.localUri === 'string'
  );
}

/**
 * Determine a safe recoverable entry point for a persisted job that was left
 * mid-flight (e.g. app restart). Never trusts a partial finalize.
 */
export function recoverEntryPoint(job: UploadJob): UploadJobState {
  switch (job.state) {
    case 'registering':
      return 'registering';
    case 'registered':
      return 'uploading';
    case 'uploading':
      return 'uploading';
    case 'verifying':
    case 'finalizing':
      return job.state;
    case 'failed':
      // With a contentId the engine re-enters through the upload stage, which
      // checks verify first and re-uploads to the SAME content when needed.
      if (job.contentId) return 'uploading';
      return 'registering';
    default:
      return job.state;
  }
}

/** Build the engine-level error object. */
export function makeUploadJobError(code: string, message?: string): UploadJobError {
  return { code, message };
}
