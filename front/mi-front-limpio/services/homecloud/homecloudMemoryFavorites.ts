/**
 * HomeCloud ST-5 — batch favorite updates (pure composer, no React).
 *
 * One mutation per contentId (the backend is PATCH per Memory); partial
 * failures are reported honestly and the failed ids remain selectable for
 * retry. Never rewrites `favorite` outside this composer.
 */

export type FavoriteDirection = 'mark' | 'unmark';

export interface FavoriteUpdateFailure {
  readonly contentId: string;
  readonly label: string;
  readonly message: string;
}

export interface FavoriteUpdateOutcome {
  readonly committed: readonly string[];
  readonly failures: readonly FavoriteUpdateFailure[];
}

export interface FavoriteUpdateInput {
  readonly direction: FavoriteDirection;
  readonly contentIds: readonly string[];
  /** The single per-item PATCH. Injectable for tests. */
  readonly mutate: (contentId: string, favorite: boolean) => Promise<void>;
  readonly labelFor: (contentId: string) => string;
}

export async function runMemoryFavoriteUpdate(input: FavoriteUpdateInput): Promise<FavoriteUpdateOutcome> {
  const committed: string[] = [];
  const failures: FavoriteUpdateFailure[] = [];
  const target = input.direction === 'mark';
  for (const contentId of input.contentIds) {
    try {
      await input.mutate(contentId, target);
      committed.push(contentId);
    } catch (error) {
      failures.push({
        contentId,
        label: safeLabel(input.labelFor, contentId),
        message: 'No se pudo actualizar favorito.',
      });
    }
  }
  return { committed, failures };
}

/** 'mark' affects non-favorites only; 'unmark' affects favorites only. */
export function favoriteTargetsFor(
  direction: FavoriteDirection,
  selected: readonly { readonly id: string; readonly favorite: boolean }[],
): string[] {
  return selected
    .filter((memory) => (direction === 'mark' ? memory.favorite !== true : memory.favorite === true))
    .map((memory) => memory.id);
}

export function favoriteUpdateSummary(direction: FavoriteDirection, failureCount: number, committedCount: number): string {
  if (failureCount === 0) {
    return direction === 'mark' ? 'Agregado a favoritos' : 'Quitado de favoritos';
  }
  if (committedCount === 0) {
    return 'No se pudo actualizar favorito.';
  }
  return direction === 'mark'
    ? `Agregado a favoritos: ${committedCount}. No se pudo actualizar favorito.: ${failureCount}.`
    : `Quitado de favoritos: ${committedCount}. No se pudo actualizar favorito.: ${failureCount}.`;
}

export function favoriteMutationMessage(error: unknown): string {
  return 'No se pudo actualizar favorito.';
}

function safeLabel(labelFor: (contentId: string) => string, contentId: string): string {
  try {
    const label = labelFor(contentId);
    return typeof label === 'string' && label.length > 0 ? label : 'Un recuerdo';
  } catch {
    return 'Un recuerdo';
  }
}
