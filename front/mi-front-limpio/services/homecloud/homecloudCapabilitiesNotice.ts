/**
 * HomeCloud W1-A — capabilities failure notice (pure, no React).
 *
 * W1-A rule: the DENY-ALL fallback must stay deny-safe WITHOUT being silent. A
 * member whose capabilities could not be resolved must not be left believing
 * the home simply grants them no actions, so every surface states the reason
 * and offers a revalidation.
 *
 * This lives in its own module, with no React and no transport, for two
 * reasons: Files and Memories can share ONE wording (it cannot drift), and the
 * behaviour is directly testable without a renderer.
 */

import type { HomeCloudReadFailure } from './homecloudReadFailure';

export type HomeCloudCapabilitiesNoticeInput = {
  readonly status: 'unresolved' | 'ready' | 'denied';
  readonly failure: HomeCloudReadFailure | null;
  readonly message: string | null;
};

/**
 * The one-line notice for a surface, or null when there is nothing to report.
 *
 * `unresolved` is intentionally silent: it means the scope is not known yet, so
 * there is no failure to explain and the deny-all state is simply still
 * resolving. Only an actual refusal/outage produces a notice.
 */
export function homeCloudCapabilitiesNotice(input: HomeCloudCapabilitiesNoticeInput): string | null {
  if (input.status !== 'denied') return null;
  const reason = input.failure === 'permission'
    ? 'No pudimos confirmar tu acceso a HomeCloud.'
    : 'No pudimos confirmar tus permisos de HomeCloud.';
  const detail = (input.message ?? '').trim();
  return detail ? `${reason} ${detail}` : reason;
}