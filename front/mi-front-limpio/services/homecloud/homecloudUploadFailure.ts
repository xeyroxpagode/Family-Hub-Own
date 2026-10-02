/**
 * HomeCloud T1 — Transient vs terminal failure classification.
 *
 * The 9-state UploadJob FSM is FROZEN: no new states. This module classifies
 * errors on the side so recovery/reconnect can decide:
 * - TRANSIENT: the job + artifact survive, reconnect auto-retries (single
 *   flight), no user action needed;
 * - TERMINAL: the job parks in failed/manual, never auto-loops.
 *
 * Grounded in the real stack (fetch/Supabase/FileSystem/AsyncStorage), not in
 * blind HTTP status buckets.
 */

export type UploadFailureClass = 'transient' | 'terminal';

/**
 * STALE SERVER-LIFECYCLE CONTRACT.
 *
 * `homecloud_not_staging` is a DOMAIN outcome, never a transient condition:
 * the backend answers it when `homecloud_contents.lifecycle !== 'staging'`
 * (`backend/src/services/homecloudIntakeService.js:378,444,565`), i.e. the
 * content already left the intake (it is `active`, or it was `trashed`).
 *
 * There is nothing to wait for and nothing to re-PUT. It is therefore ALWAYS
 * terminal: no automatic retry, no reconnect retry, no pump retry.
 */
export const STALE_LIFECYCLE_CODE = 'homecloud_not_staging';

/** Explicitly terminal domain codes (never inferred from an HTTP status). */
const TERMINAL_DOMAIN_CODES: ReadonlySet<string> = new Set([
  STALE_LIFECYCLE_CODE,
  'homecloud_content_not_found',
  'homecloud_content_has_no_binary',
  'homecloud_storage_path_mismatch',
]);

/** Codes the engine itself raises, kept terminal regardless of the message. */
const TRANSIENT_ERROR_CODES: ReadonlySet<string> = new Set([
  'upload_engine_error_transient',
  'network_error',
  'offline',
  'timeout',
]);

function domainCodeOf(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const record = error as { code?: unknown; status?: unknown; details?: { code?: unknown } };
  if (typeof record.code === 'string') return record.code;
  if (typeof record.details?.code === 'string') return record.details.code;
  return null;
}

/**
 * True when the SERVER refused because the content is no longer in intake.
 * This is the only signal that licenses a reconciliation read (§ STALE JOB
 * SEMANTICS); it is never a licence to try the PUT again.
 */
export function isStaleLifecycleError(error: unknown): boolean {
  return domainCodeOf(error)?.toLowerCase() === STALE_LIFECYCLE_CODE;
}

const TRANSIENT_MESSAGE_PATTERNS: readonly RegExp[] = [
  /network request failed/i,
  /network_error/i,
  /connection (lost|reset|aborted|refused|timed?\s?out)/i,
  /econn(reset|aborted|refused)/i,
  /enotfound|eai_again|enetunreach|ehostunreach|etimedout/i,
  /socket (hang up|timeout|closed)/i,
  /timeout|timed out/i,
  /failed to fetch|fetch failed|load failed/i,
  /offline|no internet|internet connection/i,
  /tunnel.*(unavailable|timeout|failed)|temporarily unavailable/i,
  /service unavailable/i,
  /too many requests|rate limit/i,
  /request aborted|aborted/i,
  /\b503\b|\b502\b|\b504\b/,
  /server hiccup|try again/i,
];

const TERMINAL_MESSAGE_PATTERNS: readonly RegExp[] = [
  /validation|invalid_|malformed/i,
  /permission|capability|forbidden|denied|unauthorized|401|403/i,
  /ownership|retarget|cross.household|household switch/i,
  /file_?too_?large|too large|exceeds.*(limit|quota|maximum)/i,
  /quota|enospc|no space left|storage.*full|disk.*full/i,
  /not[_\s-]?found|content_not_found|404/i,
  /conflict|already exists|duplicate|409/i,
  /unprocessable|422/i,
  /no access token|no active household|no household/i,
  /cancelled|abort/i,
];

/**
 * Classify an upload failure without new FSM states. Terminal wins on
 * ambiguity when the signal explicitly names a policy/ownership/capacity
 * cause; otherwise a connectivity/timeout signal is transient. Unknown
 * errors default to TERMINAL so recovery never auto-loops blindly.
 */
export function classifyUploadFailure(error: unknown): UploadFailureClass {
  const code = (error as { code?: unknown } | null)?.code;
  const status = (error as { status?: unknown } | null)?.status;
  const message = error instanceof Error ? error.message : String(error ?? '');

  // A typed domain code is authority: it is decided before any status or
  // message heuristic, so `homecloud_not_staging` can never be re-read as a
  // transient connectivity symptom.
  const domainCode = domainCodeOf(error);
  if (domainCode !== null) {
    const normalized = domainCode.toLowerCase();
    if (TERMINAL_DOMAIN_CODES.has(normalized)) return 'terminal';
    if (TRANSIENT_ERROR_CODES.has(normalized)) return 'transient';
  }

  if (typeof code === 'string') {
    const normalized = code.toLowerCase();
    if (
      normalized === 'upload_engine_error_transient' ||
      normalized === 'network_error' ||
      normalized === 'offline' ||
      normalized === 'timeout'
    ) {
      return 'transient';
    }
    if (
      normalized === 'file_too_large' ||
      normalized === 'homecloud_forbidden' ||
      normalized === 'durable_nospace' ||
      normalized === 'invalid_durable_artifact' ||
      normalized === 'upload_engine_error_terminal'
    ) {
      return 'terminal';
    }
  }

  if (typeof status === 'number') {
    // Only the narrow retryable transport band is transient. 4xx (including
    // 408/429 ambiguity) stays terminal here: the engine surfaces explicit
    // typed codes for the cases it really retries, and recovery must never
    // auto-loop validation/ownership/capacity failures.
    if (status === 502 || status === 503 || status === 504) return 'transient';
    if (status >= 400 && status < 500) return 'terminal';
  }

  const haystack = `${message}`;
  if (TRANSIENT_MESSAGE_PATTERNS.some((re) => re.test(haystack))) {
    // A terminal policy signal in the same message wins: e.g. "network
    // request failed: file too large" is a policy outcome, not a retry.
    if (TERMINAL_MESSAGE_PATTERNS.some((re) => re.test(haystack))) return 'terminal';
    return 'transient';
  }
  if (TERMINAL_MESSAGE_PATTERNS.some((re) => re.test(haystack))) return 'terminal';
  return 'terminal';
}

/** True when a failed job may auto-resume on reconnect/startup. */
export function isRetryableFailure(error: { retryable?: boolean | null } | null | undefined): boolean {
  return error?.retryable === true;
}
