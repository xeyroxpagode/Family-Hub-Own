import { flattenFolderTree, folderDisplayPath } from './homecloudFolderTree';
import type { HomeCloudFolder } from './homecloudTypes';

/**
 * HomeCloud Files - Stage 2 (Phase 1) - THE MOVE DESTINATION GRAMMAR.
 *
 * There is exactly ONE destination grammar for a move. A single File's Move, a
 * bulk Move and a Folder's Move all resolve a destination through this shape, and
 * all send `folderId === null` for root. Nothing else in Files enumerates
 * destinations, so a move can never offer a destination the other move would not.
 *
 * `folderId === null` is the real root destination and is how the backend stores
 * it; it is not a synthetic id invented by this picker.
 *
 * It is deliberately a pure module with no React and no transport: the grammar is
 * the contract, the sheet that renders it is presentation, and separating them is
 * what makes the contract testable without a device, a renderer or a server.
 */
export const ROOT_DESTINATION_FOLDER_ID = null;
export const ROOT_DESTINATION_LABEL = 'Archivos';

export interface FileMoveDestination {
  readonly folderId: string | null;
  readonly label: string;
  /** Full `Projects / 2026 / Contracts` trail, or null at the root. */
  readonly path: string | null;
  /** 0 for the root destination, 1 for a top-level folder, and so on. */
  readonly depth: number;
  readonly isCurrent: boolean;
}

/**
 * Root first, then the household's folders as one depth-first tree.
 *
 * A flat list of names would be actively misleading once folders nest, because
 * `Projects / Facturas` and `Archivos / Facturas` are two different real
 * destinations that a flat list would render as two identical rows. Each row
 * therefore carries its DEPTH (for the indent) and its full PATH (for the
 * accessibility label), which is what disambiguates them.
 *
 * The whole list is computed from ONE household catalogue read, so a household
 * with a thousand folders costs the same single read a household with three does.
 *
 * `currentFolderId === undefined` means "no destination is current" - a bulk
 * selection whose Files do not all share one folder has no current destination,
 * and marking root as current would be a lie. It is distinct from `null`, which
 * means root IS the current destination.
 *
 * `excludeFolderIds` is how a FOLDER move hides the illegal targets (itself and
 * its whole subtree). It is a convenience, never the authority: the server's
 * trigger refuses the same set regardless of what a stale catalogue lets through,
 * so a race here produces a typed refusal rather than a cycle.
 */
export function fileMoveDestinations(
  folders: readonly HomeCloudFolder[],
  currentFolderId: string | null | undefined,
  excludeFolderIds?: ReadonlySet<string>,
): FileMoveDestination[] {
  const isCurrent = (folderId: string | null): boolean => currentFolderId !== undefined && folderId === currentFolderId;
  const excluded = excludeFolderIds ?? new Set<string>();
  const tree = flattenFolderTree(folders);
  return [
    {
      folderId: ROOT_DESTINATION_FOLDER_ID,
      label: ROOT_DESTINATION_LABEL,
      path: null,
      depth: 0,
      isCurrent: isCurrent(ROOT_DESTINATION_FOLDER_ID),
    },
    ...tree
      // A hidden folder hides its whole branch: reaching a descendant by stepping
      // through an excluded ancestor would be a destination the server refuses.
      .filter((node) => !excluded.has(node.folder.id))
      .map((node) => ({
        folderId: node.folder.id,
        label: node.folder.name,
        path: folderDisplayPath(folders, node.folder.id),
        depth: node.depth,
        isCurrent: isCurrent(node.folder.id),
      })),
  ];
}

/**
 * How deep a row may indent before the indentation stops.
 *
 * A phone cannot show twelve levels of indent usefully, and a row that keeps
 * shifting right is worse than one that stops. The cap is safe because the
 * ACCESSIBILITY LABEL always carries the full, uncapped path, so the row stays
 * unambiguous for anyone who cannot see the indent at all.
 */
export const MAX_DESTINATION_INDENT_DEPTH = 5;

/**
 * HC-POL-023 — the trail ABOVE one destination.
 *
 * A destination row shows the folder's own name; in a household with two
 * `Facturas` in different branches that name alone is ambiguous. This is the
 * part of the full path that DISAMBIGUATES without repeating the label: the
 * parent trail. It is null for the root and for top-level folders, whose name
 * is already unambiguous.
 */
export function destinationParentPath(destination: FileMoveDestination): string | null {
  if (destination.path === null) return null;
  const segments = destination.path.split(' / ');
  return segments.length <= 1 ? null : segments.slice(0, -1).join(' / ');
}
