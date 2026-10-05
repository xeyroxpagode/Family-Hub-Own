import type { HomeCloudFolder } from './homecloudTypes';

/**
 * HomeCloud Files - Stage 2 / Phase 1 - NESTED FOLDER HIERARCHY, derived client-side.
 *
 * The database stores ONE relationship per folder (`parentFolderId`) and NOTHING
 * else: no materialized path, no duplicated depth, no closure table. Everything a
 * surface needs beyond that - the tree, every display path, a destination list,
 * the set of a folder's descendants - is DERIVED here from ONE household
 * catalogue read.
 *
 * That is the whole point. The alternative, asking the server "who is my parent?"
 * once per folder, is an N+1 that turns into real latency as soon as a household
 * has more than a handful of folders, and it is the reason `GET /folders` returns
 * the ENTIRE tree at every depth rather than one level.
 *
 * DEFENSIVE BY CONSTRUCTION. The database already forbids cycles and cross
 * household parents, so none of the traversals below should ever hit one. They are
 * written to terminate anyway, because a client that hangs or drops a folder is a
 * far worse failure than a client that renders a slightly wrong tree: every walk
 * is bounded by the size of the catalogue and marks what it has visited. A folder
 * whose parent is missing is treated as a root rather than being dropped, so no
 * folder can ever become invisible.
 *
 * This module is framework-free and side-effect free, so it is testable without a
 * device, a renderer or a server.
 */

/** Hard ceiling on any traversal. A catalogue cannot legitimately exceed it. */
const MAX_WALK = 4096;

/** One catalogue read -> one id -> parent id map. Missing ids simply are absent. */
export function folderParentMap(folders: readonly HomeCloudFolder[]): ReadonlyMap<string, string | null> {
  const map = new Map<string, string | null>();
  for (const folder of folders) map.set(folder.id, folder.parentFolderId ?? null);
  return map;
}

export interface FolderNode {
  readonly folder: HomeCloudFolder;
  readonly depth: number;
  readonly childIds: readonly string[];
}

/**
 * The whole tree, as direct children of the synthetic ROOT.
 *
 * `childrenByParent` is keyed by parent id, with `null` for the root level, so a
 * caller can answer "what is inside X" without searching. A folder whose declared
 * parent is not in the catalogue is re-attached to the ROOT: a folder must never
 * vanish because its parent was deleted on another device, and the server is
 * already answering a typed 404 for that parent anyway.
 *
 * Any folder left outside the root after that re-attachment - which only a cycle
 * can produce, and the database forbids cycles - is emitted as a root too, so the
 * invariant "every catalogue folder is reachable" holds unconditionally. A client
 * that silently rendered fewer folders than exist is the one outcome that would be
 * impossible to debug from the outside.
 *
 * ORDERING IS THE SERVER'S, NOT OURS. The catalogue already arrives ordered by
 * name, so this only groups. Re-sorting client-side would duplicate a collation
 * the client cannot reproduce - Postgres and JavaScript do not agree on what
 * "name order" means for accents, case or embedded numbers - and a destination
 * list whose order disagreed with the order of the very folders it lists is a new
 * class of bug that the flat version never had.
 *
 * Returns `childrenByParent` and `roots`, both in catalogue order.
 */
export function buildFolderForest(folders: readonly HomeCloudFolder[]): {
  readonly childrenByParent: ReadonlyMap<string | null, readonly string[]>;
  readonly roots: readonly string[];
} {
  const byId = new Map<string, HomeCloudFolder>();
  for (const folder of folders) byId.set(folder.id, folder);

  const groups = new Map<string | null, HomeCloudFolder[]>();
  const push = (parentKey: string | null, folder: HomeCloudFolder): void => {
    const bucket = groups.get(parentKey);
    if (bucket) bucket.push(folder);
    else groups.set(parentKey, [folder]);
  };

  for (const folder of folders) {
    const declaredParent = folder.parentFolderId ?? null;
    // An unknown parent, or a self-parent, degrades to ROOT rather than being
    // lost. The database forbids both, so this is only ever corruption defense.
    const effectiveParent = declaredParent !== null && byId.has(declaredParent) && declaredParent !== folder.id
      ? declaredParent
      : null;
    push(effectiveParent, folder);
  }

  const childrenByParent = new Map<string | null, readonly string[]>();
  for (const [parentKey, bucket] of groups) {
    childrenByParent.set(parentKey, bucket.map((folder) => folder.id));
  }

  // Anything a cycle left UNREACHABLE from the root is promoted to a root, so
  // "every catalogue folder is reachable" holds unconditionally. Only a cycle can
  // produce such a component, and the database forbids cycles, but a client that
  // silently rendered fewer folders than exist is the one failure nobody could
  // diagnose from the outside.
  const reachable = new Set<string>();
  const walk = (ids: readonly string[]): void => {
    for (const id of ids) {
      if (reachable.has(id)) continue;
      reachable.add(id);
      walk(childrenByParent.get(id) ?? []);
    }
  };
  const roots = (groups.get(null) ?? []).map((folder) => folder.id);
  walk(roots);
  const orphans = folders.filter((folder) => !reachable.has(folder.id));
  if (orphans.length > 0) {
    roots.push(...orphans.map((folder) => folder.id));
    childrenByParent.set(null, [...(childrenByParent.get(null) ?? []), ...orphans.map((folder) => folder.id)]);
  }
  return { childrenByParent, roots };
}

/**
 * Every folder as a DEPTH-FIRST, depth-annotated list.
 *
 * This is the single shape both destination pickers render: one ordered list,
 * each row already knowing how deep it sits, so a nested destination is
 * unambiguous and there is never one backend request per visible row.
 */
export function flattenFolderTree(folders: readonly HomeCloudFolder[]): readonly FolderNode[] {
  const byId = new Map<string, HomeCloudFolder>();
  for (const folder of folders) byId.set(folder.id, folder);
  const { childrenByParent, roots } = buildFolderForest(folders);
  const out: FolderNode[] = [];
  const visited = new Set<string>();

  const walk = (ids: readonly string[], depth: number): void => {
    for (const id of ids) {
      // The bound is checked INSIDE the loop, not only between calls, so a single
      // enormous level is truncated too. A pathological catalogue must cost a
      // bounded amount of work, not exhaust memory.
      if (out.length >= MAX_WALK) return;
      if (visited.has(id)) continue;
      visited.add(id);
      const folder = byId.get(id);
      if (!folder) continue;
      const childIds = childrenByParent.get(id) ?? [];
      out.push({ folder, depth, childIds });
      walk(childIds, depth + 1);
    }
  };
  walk(roots, 0);
  return out;
}

/**
 * The path from the root down to `folderId`, as display segments.
 *
 * `Projects / 2026 / Contracts` is COMPUTED, never stored: a persisted path string
 * would have to be rewritten for an entire subtree on every rename or move, which
 * is exactly the recursive mutation this hierarchy model exists to avoid.
 *
 * Returns `[]` for an unknown folder, so a stale id can never render as a
 * nonsense trail.
 */
export function folderPathSegments(folders: readonly HomeCloudFolder[], folderId: string | null | undefined): readonly string[] {
  if (!folderId) return [];
  const parents = folderParentMap(folders);
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const segments: string[] = [];
  const visited = new Set<string>();
  let cursor: string | null | undefined = folderId;
  while (cursor !== null && cursor !== undefined && segments.length < MAX_WALK) {
    if (visited.has(cursor)) break;
    visited.add(cursor);
    const folder: HomeCloudFolder | undefined = byId.get(cursor);
    if (!folder) break;
    segments.unshift(folder.name);
    cursor = parents.get(cursor) ?? null;
  }
  return segments;
}

/** `Projects / 2026 / Contracts`, or `null` for the root level. */
export function folderDisplayPath(folders: readonly HomeCloudFolder[], folderId: string | null | undefined): string | null {
  const segments = folderPathSegments(folders, folderId);
  return segments.length === 0 ? null : segments.join(' / ');
}

/**
 * `folderId` plus EVERY descendant of it.
 *
 * Used by the folder-move destination picker to hide the illegal targets. It is a
 * UI convenience and deliberately NOT the authority: the server's trigger refuses
 * the same set regardless of what this returns, so a stale catalogue can never
 * produce a cycle.
 */
export function folderWithDescendantIds(folders: readonly HomeCloudFolder[], folderId: string): ReadonlySet<string> {
  const { childrenByParent } = buildFolderForest(folders);
  const out = new Set<string>([folderId]);
  const queue: string[] = [folderId];
  while (queue.length > 0 && out.size <= MAX_WALK) {
    const current = queue.shift() as string;
    for (const childId of childrenByParent.get(current) ?? []) {
      if (out.has(childId)) continue;
      out.add(childId);
      queue.push(childId);
    }
  }
  return out;
}

/**
 * The nearest ancestor of the stale folder that still EXISTS in the catalogue, or
 * null for the root.
 *
 * This is what makes a stale open folder safe. If the folder was renamed remotely
 * the catalogue carries the new name; if it was MOVED remotely the path
 * re-resolves from the new parent; if it was DELETED remotely the browser
 * resolves to the closest folder that still exists instead of staying in a ghost
 * folder or querying a deleted id forever.
 *
 * It takes the STALE FOLDER OBJECT rather than a bare id on purpose. After a
 * remote delete the stale object is the only thing that still knows where the
 * folder used to live: the catalogue no longer contains the folder, so its parent
 * could not be recovered from the catalogue alone. Reading the first hop from the
 * stale object is what lets the answer be "the folder's parent" instead of a blind
 * fall back to the root.
 *
 * The walk is bounded and cycle-guarded, and the ROOT is the always-valid answer,
 * so an unknown or unresolvable id degrades to root rather than looping.
 */
export function resolveNearestExistingFolderId(
  folders: readonly HomeCloudFolder[],
  staleFolder: Pick<HomeCloudFolder, 'id' | 'parentFolderId'> | null | undefined,
): string | null {
  if (!staleFolder) return null;
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  if (byId.has(staleFolder.id)) return staleFolder.id;
  const parents = folderParentMap(folders);
  const visited = new Set<string>([staleFolder.id]);
  let cursor: string | null | undefined = staleFolder.parentFolderId ?? null;
  while (cursor !== null && cursor !== undefined) {
    if (byId.has(cursor)) return cursor;
    if (visited.has(cursor)) return null;
    visited.add(cursor);
    cursor = parents.get(cursor) ?? null;
  }
  return null;
}

/**
 * The navigation trail from the root down to `folderId`, as folder OBJECTS.
 *
 * Kept as a STACK rather than a single current folder so "back" means one level
 * up instead of jumping to the root, which is what a hierarchy needs and what a
 * one-level flat list never had to express.
 *
 * The trail is rebuilt from the catalogue whenever the current folder changes, so
 * it can never disagree with the tree. A folder whose chain cannot be completed
 * yields the root, which is the safest landing place.
 */
export function folderTrail(folders: readonly HomeCloudFolder[], folderId: string | null | undefined): readonly HomeCloudFolder[] {
  if (!folderId) return [];
  const parents = folderParentMap(folders);
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const trail: HomeCloudFolder[] = [];
  const visited = new Set<string>();
  let cursor: string | null | undefined = folderId;
  while (cursor !== null && cursor !== undefined) {
    if (visited.has(cursor)) break;
    visited.add(cursor);
    const folder: HomeCloudFolder | undefined = byId.get(cursor);
    if (!folder) break;
    trail.unshift(folder);
    cursor = parents.get(cursor) ?? null;
  }
  return trail;
}

/** The parent of `folderId`, or null when it is a root-level folder. */
export function parentFolderIdOf(folders: readonly HomeCloudFolder[], folderId: string | null | undefined): string | null {
  if (!folderId) return null;
  return folderParentMap(folders).get(folderId) ?? null;
}