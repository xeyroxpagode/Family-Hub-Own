/**
 * HomeCloud MO-A3 — the Album membership MUTATION COMPOSER (pure, no React).
 *
 * ONE composer, three callers
 * ---------------------------
 * The very same function performs every bulk membership change MO-A3 can
 * produce: adding N Memories to an Album from the Album surface, adding N to a
 * destination chosen from a generic Timeline selection, and removing N from the
 * open Album. There is no second mutation path, so a partial failure can never
 * be reported differently depending on how the operation was started.
 *
 * THE BACKEND IS PER contentId, AND THAT STAYS TRUE
 * -------------------------------------------------
 * `addMemoryToAlbum` / `removeMemoryFromAlbum` are the MO-A1 mutations: one
 * membership per request. There is no bulk endpoint and MO-A3 does not invent
 * one. The selections run SEQUENTIALLY on purpose — it is the only order in
 * which a failure can be attributed to the exact Memory that caused it.
 *
 * PARTIAL FAILURE IS THE HONEST DEFAULT
 * -------------------------------------
 * A successful membership STAYS successful. Nothing is ever rolled back, because
 * undoing a committed membership would be a second mutation per item and a lie
 * about what the server already accepted. The failed ids are named and returned,
 * and the caller keeps exactly those selected, so a retry IS the retry.
 *
 * TERMINAL DESTINATION
 * --------------------
 * If the destination Album is gone (`homecloud_album_not_found`), continuing would
 * submit N more doomed requests, so the run STOPS and reports the terminal
 * condition. §41 requires no mutation to be sent for a destination that no
 * longer exists.
 */

import { isAlbumMissingFailure } from './homecloudAlbumScope';

export type MemoryMutationDirection = 'add' | 'remove';

export interface MemoryMutationFailure {
  readonly contentId: string;
  /** An honest short label for the Memory, when one is available. */
  readonly label: string;
  readonly message: string;
}

export interface MemoryMutationOutcome {
  /** Memberships that DID change. They are committed and are never undone. */
  readonly committed: readonly string[];
  readonly failures: readonly MemoryMutationFailure[];
  /** True when the destination Album no longer exists: a terminal state. */
  readonly destinationMissing: boolean;
}

export type MemorySelectionFailure = MemoryMutationOutcome & {
  readonly direction: MemoryMutationDirection;
  /** The honest one-line band above the grid. */
  readonly summary: string;
};

const FALLBACK_LABEL = 'Un recuerdo';

function defaultMessage(direction: MemoryMutationDirection, error: unknown): string {
  if (error instanceof Error && error.message.length > 0) return error.message;
  return direction === 'add' ? 'No pudimos agregarlo.' : 'No pudimos quitarlo del álbum.';
}

/**
 * `2 recuerdos no se pudieron agregar` / `1 recuerdo no se pudo quitar del álbum`.
 *
 * The copy never says `eliminar`, `borrar`, `papelera` or `quitar de HomeCloud`:
 * what failed is a MEMBERSHIP change, and the Memory itself is untouched.
 */
export function memoryMutationFailureSummary(
  direction: MemoryMutationDirection,
  failureCount: number,
  committedCount: number,
): string {
  const verb = direction === 'add' ? 'agregar' : 'quitar del álbum';
  const head =
    failureCount === 1
      ? `1 recuerdo no se pudo ${verb}`
      : `${failureCount} recuerdos no se pudieron ${verb}`;
  if (committedCount <= 0) return head;
  // The settled clause is what tells the user their other choices were NOT lost,
  // and it is the reason no rollback is ever attempted.
  const settled =
    direction === 'add'
      ? 'Los que sí se agregaron ya están en el álbum.'
      : 'Los que sí se quitaron ya no están en el álbum.';
  return `${head}. ${settled}`;
}

export type MemoryAlbumMutationInput = {
  readonly direction: MemoryMutationDirection;
  readonly albumId: string;
  readonly contentIds: readonly string[];
  /** One membership mutation. The ONLY network call per contentId. */
  readonly mutate: (albumId: string, contentId: string) => Promise<void>;
  /** Latest-value label lookup, so a failure can NAME the Memory. */
  readonly labelFor: (contentId: string) => string;
  readonly isMissing?: (error: unknown) => boolean;
};

/**
 * Run 1..N membership mutations sequentially and report exactly what happened.
 *
 * It never throws for a per-item failure: a refusal is data, and the caller
 * decides what to present. A missing albumId is a caller bug, not a per-item
 * failure, and is reported as a single terminal failure.
 */
export async function runMemoryAlbumMutation(
  input: MemoryAlbumMutationInput,
): Promise<MemoryMutationOutcome> {
  const isMissing = input.isMissing ?? isAlbumMissingFailure;
  const committed: string[] = [];
  const failures: MemoryMutationFailure[] = [];

  if (typeof input.albumId !== 'string' || input.albumId.length === 0) {
    return {
      committed,
      destinationMissing: true,
      failures: input.contentIds.map((contentId) => ({
        contentId,
        label: safeLabel(input.labelFor, contentId),
        message: 'El álbum ya no está disponible.',
      })),
    };
  }

  for (const contentId of input.contentIds) {
    try {
      await input.mutate(input.albumId, contentId);
      committed.push(contentId);
    } catch (error) {
      if (isMissing(error)) {
        // The destination is gone: stop instead of firing N doomed requests.
        failures.push({
          contentId,
          label: safeLabel(input.labelFor, contentId),
          message: 'El álbum ya no está disponible.',
        });
        return { committed, failures, destinationMissing: true };
      }
      failures.push({
        contentId,
        label: safeLabel(input.labelFor, contentId),
        message: defaultMessage(input.direction, error),
      });
    }
  }

  return { committed, failures, destinationMissing: false };
}

function safeLabel(labelFor: (contentId: string) => string, contentId: string): string {
  try {
    const label = labelFor(contentId);
    return typeof label === 'string' && label.length > 0 ? label : FALLBACK_LABEL;
  } catch {
    return FALLBACK_LABEL;
  }
}

/** Build the failure band the Selection Surface renders inline. */
export function toMemorySelectionFailure(
  direction: MemoryMutationDirection,
  outcome: MemoryMutationOutcome,
): MemorySelectionFailure {
  return {
    ...outcome,
    direction,
    summary: memoryMutationFailureSummary(direction, outcome.failures.length, outcome.committed.length),
  };
}

/**
 * A DESTINATION that no longer exists is terminal, not retryable.
 *
 * There is nothing to retry: the Album is gone, so no request would succeed. The
 * caller shows an honest state and returns to the Memories / Album origin.
 */
export function isTerminalDestinationFailure(failure: MemorySelectionFailure | null): boolean {
  return failure !== null && failure.destinationMissing;
}