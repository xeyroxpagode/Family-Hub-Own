import { removeMemoryFromAlbum } from './homecloudReadService';

/**
 * HomeCloud HC2-C — removing ONE Memory↔Album membership.
 *
 * WHY THIS EXISTS AS ITS OWN MODULE
 * --------------------------------
 * This used to be an inline callback in `HomeCloudMemoriesScreen`, and its only
 * caller was the PERMANENT `X` that every Album card rendered. HC2-C removes that
 * affordance (BUG D), which removes the caller — and the helper must NOT be
 * deleted with it.
 *
 * The product reason is that the Membership contract outlives any one affordance:
 * removing a Memory from an Album is a membership change that the Memory
 * survives, and Run B reconnects this exact operation to the single-Memory action
 * inside the Viewer (§30 "Reconectar `removeMemoryFromOpenAlbum` al Viewer").
 * Deleting a future-valid helper just because its direct caller vanished would
 * trade one defect for another.
 *
 * It is a plain async function on purpose: no React, no hook identity, no store,
 * and therefore directly testable. The screen keeps ownership of the in-flight
 * marker, which is presentation, not domain.
 *
 * THE CONTRACT, UNCHANGED
 * ----------------------
 *  - ONLY the Memory↔Album membership is removed. The Memory, its bytes, its
 *    preview and its membership in every other Album all survive.
 *  - There is no Trash, no binary delete and no lifecycle transition. The verb is
 *    `Quitar`, never `Eliminar` / `Borrar` / `Papelera`.
 *  - A FAILURE IS HONEST and is REPORTED, not swallowed: the caller keeps the
 *    Memory rendered and releases its affordance, because a failed removal never
 *    removes a row and never invents a success.
 *  - `{ householdId }` scope is MANDATORY, or the existing household
 *    invalidation is a no-op and the rail keeps showing the pre-mutation truth.
 *  - Bulk removal does NOT go through here: it goes through the one shared
 *    composer, which reports partial failures per Memory.
 */

export type MemoryAlbumRemovalInput = {
  readonly accessToken: string | null;
  /** `null` when there is no scope: without a household nothing can be removed. */
  readonly scope: { readonly householdId: string } | null;
  /** The open Album, or `null` when none is open. */
  readonly openAlbumId: string | null;
  readonly memoryId: string;
  /** Re-read the Album detail after a committed removal. */
  readonly refreshAlbumDetail: () => Promise<unknown>;
  /** Re-read the Albums rail after a committed removal. */
  readonly reloadAlbums: () => Promise<unknown>;
  /** Re-read Timeline page 0, whose projected `albumIds` changed. */
  readonly reloadTimeline: () => Promise<unknown>;
};

/**
 * `true` when the removal was committed.
 *
 * `false` covers BOTH "there was nothing to do" (no scope, no open Album, no
 * token) and "the mutation failed". The two are deliberately not distinguished
 * here: neither one removed anything, and the caller's response is identical.
 */
export async function removeMemoryFromOpenAlbum(
  input: MemoryAlbumRemovalInput,
): Promise<boolean> {
  if (!input.accessToken || !input.scope || !input.openAlbumId) return false;
  try {
    await removeMemoryFromAlbum(input.accessToken, input.openAlbumId, input.memoryId, input.scope);
  } catch {
    return false;
  }
  // The exact refetch table, identical to the bulk composer's. A failure in a
  // refetch does NOT undo a committed membership, so it must not be reported as a
  // failed removal.
  await input.refreshAlbumDetail().catch(() => undefined);
  await input.reloadAlbums().catch(() => undefined);
  await input.reloadTimeline().catch(() => undefined);
  return true;
}