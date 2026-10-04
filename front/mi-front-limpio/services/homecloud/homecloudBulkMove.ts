/**
 * HomeCloud Files — BULK MOVE (Core basic operations, slice 1).
 *
 * The backend Move contract is ONE content per request
 * (`PATCH /api/homecloud/content/:contentId/file`) and it STAYS that way. Bulk
 * move is N of those existing single-file mutations, issued one at a time
 * through the existing `updateHomeCloudFile`. There is no bulk endpoint, no
 * transaction endpoint, no schema change, no migration and no byte movement:
 * Move stays metadata-only (`folder_id`).
 *
 * The batch is deliberately NOT atomic, and that is a product decision, not a
 * defect. A destination folder deleted mid-flight, a File that vanished, a
 * capability revoked mid-flight: those fail the Files they touch and only those.
 * The Files that already moved are NOT rolled back — undoing them would require
 * mutations nobody asked for and would report as undone something that is
 * already done. The result states both facts.
 */
import { ApiError } from '../api';

export interface BulkMoveFailure {
  readonly contentId: string;
  readonly code: string;
  readonly status: number | null;
  readonly message: string;
}

export interface BulkMoveResult {
  readonly destinationFolderId: string | null;
  readonly movedIds: readonly string[];
  readonly failures: readonly BulkMoveFailure[];
}

export type BulkMoveOneFile = (contentId: string, changes: { folderId: string | null }) => Promise<unknown>;

/**
 * Why one File could not be moved, in the member's terms. A typed backend error
 * is never reported as a generic success and never as a whole-batch failure.
 */
function moveFailureMessage(status: number | null, code: string): string {
  if (code === 'homecloud_folder_not_found') return 'La carpeta de destino ya no existe.';
  if (status === 403) return 'Ya no podés organizar estos archivos.';
  if (status === 404 || code === 'homecloud_content_not_found') return 'El archivo ya no está disponible.';
  return 'No se pudo mover.';
}

function describeMoveFailure(contentId: string, error: unknown): BulkMoveFailure {
  if (error instanceof ApiError) {
    const code = error.code ?? `http_${error.status}`;
    return { contentId, code, status: error.status, message: moveFailureMessage(error.status, code) };
  }
  return {
    contentId,
    code: 'homecloud_move_failed',
    status: null,
    message: error instanceof Error && error.message ? error.message : moveFailureMessage(null, 'homecloud_move_failed'),
  };
}

/**
 * Issue exactly one existing mutation per selected File, all to the same
 * destination, and aggregate the per-item outcomes honestly.
 *
 * The caller reconciles ONCE afterwards; this function never refreshes, never
 * retries and never re-issues a mutation for a File that already succeeded.
 */
export async function bulkMoveFiles(input: {
  contentIds: readonly string[];
  destinationFolderId: string | null;
  moveFile: BulkMoveOneFile;
}): Promise<BulkMoveResult> {
  // Selection is a Set, so ids are already unique; this makes the
  // "N selected -> N mutations" contract explicit rather than incidental.
  const contentIds = [...new Set(input.contentIds)];
  const movedIds: string[] = [];
  const failures: BulkMoveFailure[] = [];
  for (const contentId of contentIds) {
    try {
      // ONLY `folderId`: a move never carries a name, a note or a date.
      await input.moveFile(contentId, { folderId: input.destinationFolderId });
      movedIds.push(contentId);
    } catch (error) {
      failures.push(describeMoveFailure(contentId, error));
    }
  }
  return { destinationFolderId: input.destinationFolderId, movedIds, failures };
}

export interface BulkMoveFeedback {
  readonly tone: 'secondary' | 'success' | 'danger';
  readonly message: string;
}

/** The progress statement while the batch is in flight. */
export const bulkMoveInFlight = (count: number): BulkMoveFeedback => ({
  tone: 'secondary',
  message: count === 1 ? 'Moviendo 1 archivo…' : `Moviendo ${count} archivos…`,
});

/**
 * The honest aggregate of a finished batch. "7 movidos · 1 no se pudo mover"
 * states both halves: the seven stay moved, and the one did not happen. A batch
 * that partly failed is never presented as a failure of the whole, and the
 * failures of one batch are never presented as the success of another.
 */
export function bulkMoveFeedback(result: BulkMoveResult): BulkMoveFeedback {
  const moved = result.movedIds.length;
  const failed = result.failures.length;
  if (failed === 0) {
    return {
      tone: 'success',
      message: moved === 0 ? 'No había archivos para mover.' : moved === 1 ? '1 archivo movido.' : `${moved} archivos movidos.`,
    };
  }
  if (moved === 0) {
    return {
      tone: 'danger',
      message: failed === 1 ? '1 archivo no se pudo mover.' : `${failed} archivos no se pudieron mover.`,
    };
  }
  const movedPart = moved === 1 ? '1 movido' : `${moved} movidos`;
  const failurePart = failed === 1 ? '1 no se pudo mover' : `${failed} no se pudieron mover`;
  return { tone: 'danger', message: `${movedPart} · ${failurePart}.` };
}
