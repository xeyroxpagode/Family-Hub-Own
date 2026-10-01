export type PrivateTreeDecision = 'private_stack' | 'auth_loading' | 'auth_me_error' | 'experience_loading';

export interface PrivateTreeDecisionInput {
  authMeLoading: boolean;
  hasAuthMe: boolean;
  hasAuthMeError: boolean;
  experienceReady: boolean;
}

/**
 * Initial auth resolution may gate the private tree. Revalidation may not:
 * once a usable auth projection exists, keeping that tree mounted is what
 * preserves in-progress application state while the projection is refreshed.
 */
export function resolvePrivateTreeDecision(input: PrivateTreeDecisionInput): PrivateTreeDecision {
  if (!input.hasAuthMe) {
    if (input.authMeLoading || !input.hasAuthMeError) return 'auth_loading';
    return 'auth_me_error';
  }
  if (!input.experienceReady) return 'experience_loading';
  return 'private_stack';
}

/** A transient projection refresh cannot invalidate an already-authenticated tree. */
export function shouldPreserveAuthMeAfterLoadFailure(hadExistingAuthMe: boolean): boolean {
  return hadExistingAuthMe;
}
