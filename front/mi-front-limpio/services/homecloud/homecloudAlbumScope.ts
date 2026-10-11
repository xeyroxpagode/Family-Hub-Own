/**
 * HomeCloud MO-A2 — Album SCOPE presentation contract (pure, no React).
 *
 * An Album is a shared ORGANIZATION over Memories. This module owns only the
 * two truths that are decided OUTSIDE the server payload and would otherwise be
 * re-invented (and drift) in every Album surface:
 *
 * 1. THE TERMINAL FAILURE. Inside the Album scope, `homecloud_album_not_found`
 *    is not a retryable read failure: the grouping is gone, so retrying forever
 *    would be a lie and rendering an empty Album would be a bigger one. It is
 *    classified HERE, locally, on purpose — the shared `homecloudReadFailure`
 *    module models only `permission` vs `unavailable` for ordinary reads and is
 *    NOT widened by MO-A2.
 *
 * 2. THE COPY THAT IS PART OF THE CONTRACT. Deleting an Album removes the
 *    grouping and its memberships and NOTHING else, so the delete confirmation
 *    must say so in words. That sentence is frozen: it is the only thing that
 *    tells the user their Memories survive.
 *
 * It also renders the EXACT server `itemCount`. The number is never derived
 * from loaded Memories: it is an aggregate, and an approximation would be a
 * different (wrong) truth.
 */

/** Canonical backend refusal code for a missing / inaccessible Album. */
export const HOMECLOUD_ALBUM_NOT_FOUND_CODE = 'homecloud_album_not_found';

/** Frozen copy of the Albums rail header. */
export const ALBUMS_RAIL_TITLE = 'Álbumes';

/**
 * Mandatory explanatory copy for the Album delete confirmation.
 *
 * Deleting an Album is a HARD delete of the grouping ONLY. It never deletes,
 * trashes or alters a Memory, and it never touches memberships in other
 * Albums. This sentence is the contract, not decoration.
 */
export const ALBUM_DELETE_MEMORIES_SURVIVE_COPY =
  'Los recuerdos no se eliminan: van a seguir en Recuerdos.';

/** Frozen copy for the terminal missing-Album state. */
export const ALBUM_MISSING_TITLE = 'Este álbum ya no está disponible';
/** Frozen copy for the terminal missing-Album escape. */
export const ALBUM_MISSING_BACK_LABEL = 'Volver a los recuerdos';

/** Frozen copy for an Album that exists but has no Memory yet. */
export const ALBUM_EMPTY_TITLE = 'Este álbum todavía no tiene recuerdos';

/** Frozen copy for the honest zero-Album state of a household. */
export const ALBUMS_EMPTY_TITLE = 'Todavía no hay álbumes';
/** Frozen copy for the honest zero-Album state of a household. */
export const ALBUMS_EMPTY_BODY =
  'Creá uno para empezar a organizar tus recuerdos.';

function readDomainCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const record = error as { code?: unknown; details?: { code?: unknown } };
  if (typeof record.code === 'string') return record.code.toLowerCase();
  if (typeof record.details?.code === 'string') return record.details.code.toLowerCase();
  return null;
}

/**
 * Is this the TERMINAL "this Album no longer exists / is not accessible"
 * condition? Inside the Album scope the answer is final: the detail renders the
 * unavailable state and offers the way back to Recuerdos instead of retrying.
 *
 * A cross-household Album answers with the same code on purpose, so this can
 * never be used to disclose or infer the existence of a foreign Album.
 */
export function isAlbumMissingFailure(error: unknown): boolean {
  return readDomainCode(error) === HOMECLOUD_ALBUM_NOT_FOUND_CODE;
}

/**
 * The exact count line of an Album tile.
 *
 * `itemCount` is the server's EXACT aggregate of active Memories. It is used
 * verbatim: never the length of a loaded page, never a locally computed total.
 */
export function albumItemCountLabel(itemCount: number): string {
  if (!Number.isInteger(itemCount) || itemCount < 0) {
    // An impossible aggregate is still never invented client-side: it is shown
    // as "no recuerdos" rather than as a fabricated number.
    return 'Sin recuerdos';
  }
  if (itemCount === 0) return 'Sin recuerdos';
  if (itemCount === 1) return '1 recuerdo';
  return `${itemCount} recuerdos`;
}

/**
 * `Quitar 1 del álbum` / `Quitar N del álbum` — the frozen copy of the bulk
 * removal confirmation inside an Album.
 *
 * The verb is `Quitar` and the object is `del álbum`: a MEMBERSHIP change. It is
 * never `Eliminar`, `Borrar`, `Papelera`, `Trash`, `Purge` nor `Quitar de
 * HomeCloud`, because none of those is what happens — the Memory, its bytes and
 * every other Album membership survive untouched.
 */
export function albumRemoveSelectionLabel(selectedCount: number): string {
  if (!Number.isInteger(selectedCount) || selectedCount <= 0) return 'Quitar del álbum';
  return `Quitar ${selectedCount} del álbum`;
}
