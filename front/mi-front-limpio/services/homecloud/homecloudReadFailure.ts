/**
 * HomeCloud W1-A — HomeCloud read failure classification.
 *
 * ONE job: never let two different truths share one UI.
 *
 * A HomeCloud read can fail because the SERVER refused (403 /
 * `homecloud_forbidden` / 401 — an access problem) or because the transport
 * did not answer (network/5xx — a recoverable load problem). Those are not the
 * same event and they must not collapse into one another:
 *
 * - a permission failure must NEVER read as "this folder is empty";
 * - a permission failure must NOT offer itself as a plain retry, because the
 *   honest next step is access, not another identical request;
 * - a transport failure must stay retryable.
 *
 * This module only CLASSIFIES. It grants nothing, infers no role and does not
 * consult the backend: the server remains the sole authority for household,
 * membership and capability.
 */

/** How a failed HomeCloud read must be presented. */
export type HomeCloudReadFailure =
  /** The server refused: access/permission problem, not a transient outage. */
  | 'permission'
  /** The read could not be completed and may be retried as-is. */
  | 'unavailable';

/** The canonical backend refusal code (`backend/src/lib/homecloudCapabilities.js`). */
export const HOMECLOUD_FORBIDDEN_CODE = 'homecloud_forbidden';

const PERMISSION_STATUSES: ReadonlySet<number> = new Set([401, 403]);

const PERMISSION_CODES: ReadonlySet<string> = new Set([
  HOMECLOUD_FORBIDDEN_CODE,
  'homecloud_forbidden_register_field',
  'permission_denied',
  'forbidden',
  'unauthorized',
  'membership_not_active',
  'household_access_denied',
]);

function readDomainCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const record = error as { code?: unknown; status?: unknown; details?: { code?: unknown } };
  if (typeof record.code === 'string') return record.code.toLowerCase();
  if (typeof record.details?.code === 'string') return record.details.code.toLowerCase();
  return null;
}

function readStatus(error: unknown): number | null {
  if (typeof error !== 'object' || error === null) return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : null;
}

/**
 * True when the server (not the network) refused the read.
 *
 * A typed domain code is authority and is read BEFORE the status, so a
 * `homecloud_forbidden` body can never be re-read as a transient symptom.
 */
export function isHomeCloudPermissionError(error: unknown): boolean {
  const code = readDomainCode(error);
  if (code !== null && PERMISSION_CODES.has(code)) return true;
  const status = readStatus(error);
  return status !== null && PERMISSION_STATUSES.has(status);
}

/** Map any thrown value onto the two honest presentations. */
export function classifyHomeCloudReadFailure(error: unknown): HomeCloudReadFailure {
  return isHomeCloudPermissionError(error) ? 'permission' : 'unavailable';
}

/** Is this a load failure a plain retry can actually recover from? */
export function isRetryableHomeCloudReadFailure(failure: HomeCloudReadFailure): boolean {
  return failure === 'unavailable';
}

/**
 * The copy for a failed HomeCloud read. `subject` is the surface noun
 * ("tus archivos", "tus recuerdos"), so one helper serves every surface and the
 * wording can never drift between them.
 */
export function homeCloudReadFailureTitle(failure: HomeCloudReadFailure, subject: string): string {
  return failure === 'permission'
    ? 'No tenés acceso a este contenido'
    : `No pudimos cargar ${subject}`;
}

export function homeCloudReadFailureDescription(failure: HomeCloudReadFailure): string {
  return failure === 'permission'
    ? 'Tu membresía no habilita esta vista de HomeCloud. Pedile a quien coordina el hogar que revise tu acceso.'
    : 'Revisá tu conexión o intentá de nuevo en un momento.';
}

/**
 * The honest detail line for the read failure.
 * A refusal carries the server reason (useful, actionable); a transport
 * failure only carries the client-side message.
 */
export function homeCloudReadFailureDetail(failure: HomeCloudReadFailure, error: unknown): string | undefined {
  if (failure !== 'permission') return undefined;
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return message ? message : undefined;
}