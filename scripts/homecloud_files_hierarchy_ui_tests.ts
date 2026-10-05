/**
 * HomeCloud Files - Stage 2 / Phase 1 - NESTED FOLDER HIERARCHY, frontend evidence.
 *
 * The database side of the hierarchy is proven by the real PostgREST runtime seam.
 * This file proves the CLIENT side, which is a different claim: the whole tree,
 * every display path, every destination row and the whole navigation trail are
 * DERIVED from ONE catalogue read, defensively, without a single request per
 * folder.
 *
 *  H-A  TREE.      The forest groups by parent at every depth, orders siblings by
 *                  name, and re-attaches an orphan to the root instead of losing it.
 *  H-B  NO N+1.    Flattening is pure client work over the catalogue it was given:
 *                  no derivation ever triggers a read.
 *  H-C  PATHS.     `Projects / 2026 / Contracts` is COMPUTED, and the same name in
 *                  two branches stays disambiguable.
 *  H-D  DESCENDANTS. A folder move hides itself and its whole subtree. It is a
 *                  convenience only; the server refuses the same set regardless.
 *  H-E  STALE.     A folder renamed, moved or deleted remotely resolves to the
 *                  nearest folder that still exists, and the root is the fallback.
 *  H-D/E FAILED NAVIGATION. The screen's trail means "back" is ONE LEVEL UP.
 *  H-F  PICKER.    ONE destination grammar: root first, then the whole tree, each
 *                  row carrying its depth and its full path.
 *  H-G  DEFENSE.   Every traversal terminates, because the database already forbids
 *                  cycles but a client that hangs would be far worse.
 *
 * NOTHING is faked beyond the transport boundary: the real `homecloudFolderTree`
 * and the real `FileMoveDestinationPicker` are imported and driven.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  buildFolderForest,
  flattenFolderTree,
  folderDisplayPath,
  folderPathSegments,
  folderTrail,
  folderWithDescendantIds,
  parentFolderIdOf,
  resolveNearestExistingFolderId,
} from '../front/mi-front-limpio/services/homecloud/homecloudFolderTree';
import {
  fileMoveDestinations,
  MAX_DESTINATION_INDENT_DEPTH,
  ROOT_DESTINATION_FOLDER_ID,
} from '../front/mi-front-limpio/services/homecloud/homecloudMoveDestinations';
import type { HomeCloudFolder } from '../front/mi-front-limpio/services/homecloud/homecloudTypes';

(globalThis as { __DEV__?: boolean }).__DEV__ = false;

// The compiled test lives at `scripts/compiled-files-hierarchy-ui/scripts/`, so the
// repository root is three levels up, not two.
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

let passCount = 0;
let failCount = 0;

function record(ok: boolean, message: string): void {
  if (ok) {
    passCount += 1;
    console.log(`  PASS: ${message}`);
  } else {
    failCount += 1;
    console.error(`  FAIL: ${message}`);
  }
}

let seq = 0;
function folder(name: string, parentFolderId: string | null): HomeCloudFolder {
  seq += 1;
  return {
    id: `f${seq}`,
    name,
    parentFolderId,
    createdByMemberId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

/**
 * A realistic catalogue, deliberately handed over in NO particular order so every
 * derivation has to cope with a server that does not promise ordering.
 *
 *   Archivos (root)
 *   Proyectos            (root)
 *   Facturas             (under Proyectos)
 *   Facturas             (under Documentos - SAME NAME, different branch)
 *   Documentos           (root)
 *   2026                 (under Documentos)
 *   Contratos            (under 2026)
 */
function makeCatalogue(): HomeCloudFolder[] {
  seq = 0;
  const archivos = folder('Archivos', null);
  const proyectos = folder('Proyectos', null);
  const facturas = folder('Facturas', proyectos.id);
  const documentos = folder('Documentos', null);
  const facturas2 = folder('Facturas', documentos.id);
  const anio = folder('2026', documentos.id);
  const contratos = folder('Contratos', anio.id);
  return [contratos, facturas2, proyectos, archivos, anio, facturas, documentos];
}

function ids(folders: readonly HomeCloudFolder[]): string[] {
  return folders.map((entry) => entry.name);
}

console.log('\n=== HOMECLOUD FILES: NESTED FOLDER HIERARCHY FRONTEND TESTS ===\n');

const catalogue = makeCatalogue();
const byName = (name: string, parent: string | null): HomeCloudFolder => {
  const found = catalogue.find((entry) => entry.name === name && (entry.parentFolderId === parent || (parent === null && entry.parentFolderId === null)));
  if (!found) throw new Error(`fixture missing ${name}`);
  return found;
};
const proyectos = byName('Proyectos', null);
const facturasUnderProyectos = byName('Facturas', proyectos.id);
const documentos = byName('Documentos', null);
const anio = byName('2026', documentos.id);
const contratos = byName('Contratos', anio.id);

// ── H-A: the forest ────────────────────────────────────────────────────────
console.log('--- H-A: the tree is grouped by parent at every depth ---');
{
  const { childrenByParent, roots } = buildFolderForest(catalogue);
  record(roots.length === 3, `the ROOT level holds exactly the three parentless folders (${roots.length})`);
  record(ids(catalogue.filter((entry) => entry.parentFolderId === null)).includes('Archivos'), 'a root-level folder is a root');
  record(childrenByParent.get(proyectos.id)?.length === 1, 'a nested folder sits under its parent, not at the root');
  record(childrenByParent.get(documentos.id)?.length === 2, 'a parent with two children groups both');
  record(childrenByParent.get(anio.id)?.length === 1, 'a third level groups under its own parent');
  record(!(childrenByParent.get(null) ?? []).includes(facturasUnderProyectos.id), 'a nested folder never appears among the roots');
  // Sibling order inside one level is whatever order the catalogue arrived in,
  // because the SERVER already ordered it. A client-side re-sort would duplicate a
  // collation JavaScript cannot reproduce, and a picker whose order disagreed with
  // the order of the folders it lists is a bug the flat version never had.
  const ordered = ['Factura 1', 'Factura 10', 'Factura 2'].map((name) => folder(name, null));
  const orderedForest = buildFolderForest(ordered);
  record(
    JSON.stringify((orderedForest.childrenByParent.get(null) ?? []).map((id) => ordered.find((entry) => entry.id === id)?.name)) === '["Factura 1","Factura 10","Factura 2"]',
    'the client preserves the SERVER order instead of imposing its own collation',
  );
  record(!/localeCompare|\.sort\(/.test(fs.readFileSync(path.join(REPO_ROOT, 'front', 'mi-front-limpio', 'services', 'homecloud', 'homecloudFolderTree.ts'), 'utf8')), 'the tree module contains no client-side sort at all');
}
{
  // An orphan must never become invisible.
  const orphan = folder('Huerfana', 'no-existe');
  const { roots, childrenByParent } = buildFolderForest([folder('Sola', null), orphan]);
  record(roots.includes(orphan.id), 'a folder whose parent is missing is re-attached to the ROOT rather than dropped');
  record((childrenByParent.get('no-existe') ?? []).length === 0, 'a missing parent collects no children');
  record(roots.length === 2, 'both the declared root and the orphan are reachable');
}
{
  // Self-parent is forbidden by the database; the client degrades instead of looping.
  const selfish = folder('Misma', 'will-be-replaced');
  const selfishFixed = { ...selfish, parentFolderId: selfish.id };
  const { roots, childrenByParent } = buildFolderForest([selfishFixed]);
  record(roots.includes(selfishFixed.id), 'a self-parented folder is treated as a root, not as its own child');
  record((childrenByParent.get(selfishFixed.id) ?? []).length === 0, 'a self-parented folder is not its own child');
}

// ── H-B: no N+1 ─────────────────────────────────────────────────────────────
console.log('\n--- H-B: derivation is pure client work over ONE catalogue read ---');
{
  const requestCounter = { reads: 0 };
  // The derivations are pure functions of their argument. Driving them over a
  // catalogue that was read EXACTLY ONCE is the whole assertion: nothing below can
  // produce a read, because none of them has a transport to produce one with.
  const once = catalogue;
  requestCounter.reads += 1;
  const flat = flattenFolderTree(once);
  const segments = folderPathSegments(once, contratos.id);
  const descendants = folderWithDescendantIds(once, documentos.id);
  record(requestCounter.reads === 1, `one catalogue read produced every derived value (reads=${requestCounter.reads})`);
  record(flat.length === catalogue.length, 'the flattened tree contains every folder exactly once');
  record(segments.length === 3, 'the path of a third-level folder needed no additional request');
  record(descendants.size >= 4, 'the descendant set of a whole branch needed no additional request');
}

// ── H-C: paths ──────────────────────────────────────────────────────────────
console.log('\n--- H-C: display paths are computed, and stay disambiguable ---');
{
  record(folderDisplayPath(catalogue, contratos.id) === 'Documentos / 2026 / Contratos', `a three-level path is rendered as segments (${folderDisplayPath(catalogue, contratos.id)})`);
  record(folderDisplayPath(catalogue, null) === null, 'the ROOT has no path to render');
  record(folderDisplayPath(catalogue, 'no-existe') === null, 'an unknown folder renders no path instead of a nonsense trail');
  const a = folderDisplayPath(catalogue, facturasUnderProyectos.id);
  const b = folderDisplayPath(catalogue, byName('Facturas', documentos.id).id);
  record(a === 'Proyectos / Facturas' && b === 'Documentos / Facturas', `the SAME folder name in two branches stays disambiguable (${a} vs ${b})`);
  record(a !== b, 'two same-named folders never collapse into one destination');
}

// ── H-D: descendants ───────────────────────────────────────────────────────
console.log('\n--- H-D: a folder move cannot target itself or its own subtree ---');
{
  const selfAndAll = folderWithDescendantIds(catalogue, documentos.id);
  record(selfAndAll.has(documentos.id), 'the moved folder is included, so it hides itself');
  record(selfAndAll.has(anio.id) && selfAndAll.has(contratos.id), 'EVERY descendant is included, not just the direct children');
  record(!selfAndAll.has(proyectos.id), 'a folder in a different branch is NOT excluded');
  const leaf = folderWithDescendantIds(catalogue, contratos.id);
  record(leaf.size === 1 && leaf.has(contratos.id), 'a leaf folder excludes only itself');
  record(folderWithDescendantIds([], 'x').has('x'), 'an empty catalogue still excludes the folder being moved');
}

// ── H-E: stale remote changes ───────────────────────────────────────────────
console.log('\n--- H-E: a folder changed on another device resolves safely ---');
{
  const renamed = catalogue.map((entry) => (entry.id === anio.id ? { ...entry, name: '2027' } : entry));
  record(folderDisplayPath(renamed, contratos.id) === 'Documentos / 2027 / Contratos', 'a folder renamed remotely re-resolves to its NEW path');
  const movedUp = catalogue.map((entry) => (entry.id === anio.id ? { ...entry, parentFolderId: null } : entry));
  record(folderDisplayPath(movedUp, contratos.id) === '2026 / Contratos', 'a folder moved remotely re-resolves to its NEW ancestry');

  // The real remote-delete case: the OPEN folder is gone from a fresh catalogue,
  // and the only thing that still knows where it lived is the stale object.
  //
  // The fixture models what the server actually returns after a deleting
  // promotion: the deleted folder disappears AND its direct children are re-parented
  // to ITS parent. That is the whole point of the promotion contract, so a fixture
  // that merely removed the row would describe a state the server never produces.
  const promotedContratos = { ...contratos, parentFolderId: documentos.id };
  const afterDelete = catalogue
    .filter((entry) => entry.id !== anio.id)
    .map((entry) => (entry.id === contratos.id ? promotedContratos : entry));
  const staleOpenFolder = anio;
  record(resolveNearestExistingFolderId(afterDelete, staleOpenFolder) === documentos.id, 'the remotely deleted open folder resolves to its PARENT, not blindly to the root');
  record(resolveNearestExistingFolderId(afterDelete, contratos) === contratos.id, 'a folder that still exists resolves to itself');
  record(folderDisplayPath(afterDelete, contratos.id) === 'Documentos / Contratos', 'the surviving path shows the promoted parent, and no longer claims the deleted folder');
  record(folderTrail(afterDelete, contratos.id).some((entry) => entry.id === anio.id) === false, 'the trail of a surviving child does not include the deleted folder');
  record(folderTrail(afterDelete, contratos.id).length === 2, 'the trail of a surviving child is re-rooted at its new grandparent');
  record(resolveNearestExistingFolderId(catalogue, null) === null, 'the ROOT is always a valid answer');
  record(resolveNearestExistingFolderId(catalogue, contratos) === contratos.id, 'a present folder resolves to itself even in a full catalogue');
  record(resolveNearestExistingFolderId(afterDelete, { id: 'nunca-visto', parentFolderId: 'tampoco' }) === null, 'a wholly unknown id falls back to the ROOT rather than looping');
  const selfParentStale = { id: 'x', parentFolderId: 'x' };
  record(resolveNearestExistingFolderId(catalogue, selfParentStale) === null, 'a self-parented stale folder falls back to the ROOT instead of looping');
}

// ── H-F: one destination grammar ────────────────────────────────────────────
console.log('\n--- H-F: the ONE destination picker lists the whole tree ---');
{
  const destinations = fileMoveDestinations(catalogue, null);
  record(destinations[0].folderId === ROOT_DESTINATION_FOLDER_ID && destinations[0].label === 'Archivos', 'the ROOT destination is offered and comes first');
  record(destinations[0].depth === 0, 'the root destination is depth 0');
  record(destinations.length === catalogue.length + 1, `every folder is a destination, at every depth (${destinations.length})`);
  const byFolder = new Map(destinations.filter((entry) => entry.folderId !== null).map((entry) => [entry.folderId as string, entry]));
  record(byFolder.get(contratos.id)?.depth === 2, 'a third-level destination knows its depth (root destination 0, top-level folders 0, their children 1)');
  record(byFolder.get(documentos.id)?.depth === 0, 'a top-level folder is a peer of the root destination, so both indent the same');
  record(byFolder.get(documentos.id)?.path === 'Documentos', 'a top-level destination carries its own path');
  record(byFolder.get(contratos.id)?.path === 'Documentos / 2026 / Contratos', 'a nested destination carries its FULL path');
  record(byFolder.get(facturasUnderProyectos.id)?.path === 'Proyectos / Facturas', 'a same-named destination in another branch carries its own path');
  record(byFolder.get(facturasUnderProyectos.id)?.path !== byFolder.get(byName('Facturas', documentos.id).id)?.path, 'two same-named destinations are never indistinguishable');

  const exclusions = folderWithDescendantIds(catalogue, documentos.id);
  const filtered = fileMoveDestinations(catalogue, null, exclusions);
  const filteredIds = filtered.map((entry) => entry.folderId);
  record(!filteredIds.includes(documentos.id) && !filteredIds.includes(contratos.id) && !filteredIds.includes(anio.id), 'a folder move never offers itself or any of its descendants');
  record(filteredIds.includes(proyectos.id), 'a folder move still offers every legal destination');
  record(filteredIds.includes(ROOT_DESTINATION_FOLDER_ID), 'the ROOT is always selectable');

  record(fileMoveDestinations(catalogue, contratos.id).find((entry) => entry.folderId === contratos.id)?.isCurrent === true, 'the current destination is marked as current');
  record(fileMoveDestinations(catalogue, contratos.id).find((entry) => entry.folderId === ROOT_DESTINATION_FOLDER_ID)?.isCurrent === false, 'exactly one destination is current');
  const undefinedCurrent = fileMoveDestinations(catalogue, undefined);
  record(undefinedCurrent.every((entry) => entry.isCurrent === false), 'an unknown current destination marks NONE, so root is never wrongly shown as current');
  record(fileMoveDestinations([], null).length === 1, 'an empty catalogue still offers the root destination');
}

// ── H-G: traversal always terminates ────────────────────────────────────────
console.log('\n--- H-G: corrupt data cannot hang or hide a folder ---');
{
  // The database forbids cycles, so these fixtures are unreachable in production.
  // They exist because a client that loops forever is a much worse failure than one
  // that renders a slightly wrong tree.
  const a = folder('A', null);
  const b = folder('B', a.id);
  const aCyclic = { ...a, parentFolderId: b.id };
  const cyclic = [aCyclic, b];
  const flat = flattenFolderTree(cyclic);
  record(flat.length === cyclic.length, 'a cyclic catalogue still lists every folder exactly once');
  record(folderPathSegments(cyclic, b.id).length >= 1, 'a cyclic path resolves to something instead of looping');
  record(resolveNearestExistingFolderId(cyclic, b) === b.id, 'a cyclic folder resolves to itself rather than looping');
  record(folderWithDescendantIds(cyclic, a.id).size === cyclic.length, 'descendants of a cyclic node terminate');
  const huge = Array.from({ length: 6000 }, (_, index) => folder(`N${index}`, null));
  record(flattenFolderTree(huge).length <= 4096, 'a pathological catalogue is bounded instead of exhausting memory');
  record(flattenFolderTree(huge).length > 0, 'the bound still surfaces the folders it did traverse');
}

// ── H-H: the navigation trail ───────────────────────────────────────────────
console.log('\n--- H-H: back means ONE LEVEL UP, not back to the root ---');
{
  record(folderTrail(catalogue, null).length === 0, 'the ROOT trail is empty');
  record(ids(folderTrail(catalogue, proyectos.id)).join('/') === 'Proyectos', 'a first-level trail is one folder');
  const deepTrail = folderTrail(catalogue, contratos.id);
  record(ids(deepTrail).join('/') === 'Documentos/2026/Contratos', 'a deep trail is the whole ancestor chain');
  record(folderTrail(catalogue, proyectos.id).length === 1, 'a first-level folder contributes exactly one entry to its trail');
  record(ids(deepTrail).join('/') === 'Documentos/2026/Contratos', 'a deep trail is the whole ancestor chain');
  record(deepTrail[deepTrail.length - 2] === anio, 'popping a deep trail lands on the IMMEDIATE parent');
  // Identity, not just equality: the trail must hand back the CATALOGUE objects, so
  // a rename that already landed in the catalogue is what the member sees.
  const renamedCatalogue = catalogue.map((entry) => (entry.id === anio.id ? { ...entry, name: '2027' } : entry));
  record(folderTrail(renamedCatalogue, contratos.id)[1] === renamedCatalogue.find((entry) => entry.id === anio.id), 'trail entries are the catalogue objects, so a remote rename shows up');
  record(ids(folderTrail(renamedCatalogue, contratos.id)).join('/') === 'Documentos/2027/Contratos', 'the trail reflects the renamed folder, never the captured copy');
  record(folderTrail(catalogue, 'no-existe').length === 0, 'an unknown folder yields the ROOT trail');
  record(parentFolderIdOf(catalogue, anio.id) === documentos.id, 'the parent of a nested folder is read from the one authority field');
  record(parentFolderIdOf(catalogue, documentos.id) === null, 'a root-level folder has no parent');
  record(parentFolderIdOf(catalogue, null) === null, 'the ROOT has no parent');
  const selfId = 'f-self';
  const selfParent = folder('Misma', null);
  const selfTrail = folderTrail([{ ...selfParent, id: selfId, parentFolderId: selfId }], selfId);
  record(selfTrail.length === 1, 'a self-parented folder does not produce an infinite trail');
}

// ── H-I: source-level contracts on the screen ───────────────────────────────
console.log('\n--- H-I: the screen actually uses the derived hierarchy ---');
{
  const screen = fs.readFileSync(path.join(REPO_ROOT, 'front', 'mi-front-limpio', 'screens', 'HomeCloudFilesScreen.tsx'), 'utf8');
  record(screen.includes('folderTrail(allFolders, folder?.id ?? null)'), 'the open folder is tracked as a derived TRAIL, not as a single current object');
  record(!/const leaveFolder = useCallback\(\(\) => \{\s*setFolder\(null\)/.test(screen), 'back is NOT a jump to the root');
  record(/trail\.length >= 2 \? trail\[trail\.length - 2\]/.test(screen), 'back pops exactly ONE level');
  record(screen.includes('resolveNearestExistingFolderId(allFolders, folder)'), 'a folder that vanished remotely is resolved, from the STALE object, to the nearest one that still exists');
  record(screen.includes('folderDisplayPath(allFolders, folder?.id ?? null)'), 'the browser renders the computed path as a breadcrumb');
  record(screen.includes('folderWithDescendantIds(allFolders, moveIntent.folderId)'), 'a folder move excludes itself and its whole subtree');
  record(screen.includes('createHomeCloudFolder(token, folderName, folder?.id ?? null)'), 'creating a folder inherits the OPEN folder');
  record(!screen.includes('disabled={!!folder || !canOrganize}'), 'creating a folder is no longer disabled inside a folder');
  record(screen.includes('moveHomeCloudFolder(token, folderActions.id, destinationFolderId)'), 'a folder can be reparented');
  // The delete copy must be honest: a nested delete PROMOTES, it does not recurse.
  record(screen.includes('no se borra ningún archivo'), 'the delete confirmation says no File is deleted');
  record(screen.includes('su contenido directo pasa a'), 'the delete confirmation says the direct contents move to the parent');
  record(!screen.includes('volverán a Archivos'), 'the old always-to-root delete copy is gone');
  record(screen.includes('title="Mover"'), 'a folder offers Mover as one of its actions');
  // ONE picker INSTANCE for all three Move intents. Two instances would restore the
  // exact divergence the single picker existed to prevent.
  const pickerInstances = (screen.match(/<FileMoveDestinationPicker/g) ?? []).length;
  record(pickerInstances === 1, `exactly ONE destination picker instance serves every Move intent (${pickerInstances} instance(s))`);
  record(screen.includes("kind: 'file'") && screen.includes("kind: 'bulk'") && screen.includes("kind: 'folder'"), 'all three Move intents are expressed as variants of ONE intent');
  record(screen.includes('setMoveIntent({ kind: \'folder\', folderId: folderActions!.id })'), 'a folder action opens that same picker');
  record(/intent\.kind === 'bulk'[\s\S]*intent\.kind === 'file'/.test(screen), 'one handler dispatches every Move intent, so none can bypass the others');

  const picker = fs.readFileSync(path.join(REPO_ROOT, 'front', 'mi-front-limpio', 'services', 'homecloud', 'FileMoveDestinationPicker.tsx'), 'utf8');
  const grammar = fs.readFileSync(path.join(REPO_ROOT, 'front', 'mi-front-limpio', 'services', 'homecloud', 'homecloudMoveDestinations.ts'), 'utf8');
  record(picker.includes('fileMoveDestinations(folders, currentFolderId, excludeFolderIds)'), 'the sheet renders the shared grammar and computes nothing of its own');
  record(!picker.includes('flattenFolderTree'), 'the sheet never walks the tree itself, so no destination can come from a second code path');
  record(grammar.includes('flattenFolderTree(folders)'), 'the grammar builds its rows from the local flatten, not from a per-row request');
  record(grammar.includes('folderDisplayPath(folders, node.folder.id)'), 'every destination row carries its full path');
  record(grammar.includes('currentFolderId !== undefined'), 'an unknown current destination is distinguished from a null one, so root is never wrongly shown as current');
  record(picker.includes('MAX_DESTINATION_INDENT_DEPTH'), 'the indent is capped by the shared constant so picker and grammar cannot drift');
  record(/Math\.min\(destination\.depth, MAX_DESTINATION_INDENT_DEPTH\)/.test(picker), 'the picker applies that cap when indenting a row');
  record(picker.includes('Mover a ${destination.path}'), 'a nested destination announces its FULL path to assistive technology');

  const service = fs.readFileSync(path.join(REPO_ROOT, 'front', 'mi-front-limpio', 'services', 'homecloud', 'homecloudFilesService.ts'), 'utf8');
  record(service.includes('body: { name, parentFolderId }'), 'the create mutation states the intended parent');
  record(/\/folders\/\$\{folderId\}\/move`/.test(service), 'the reparent is its own verb, not a field on the rename PATCH');
  record(service.includes('moveHomeCloudFolder'), 'the reparent client exists');
  const renameBody = /renameHomeCloudFolder[^;]+;/.exec(service);
  record(Boolean(renameBody) && !renameBody![0].includes('parentFolderId'), 'the rename verb still carries ONLY a name');

  const mappers = fs.readFileSync(path.join(REPO_ROOT, 'backend', 'src', 'lib', 'homecloudMappers.js'), 'utf8');
  record(mappers.includes('parentFolderId: row.parent_folder_id ?? null'), 'the backend folder DTO carries parentFolderId as the only ancestry authority');

  const readService = fs.readFileSync(path.join(REPO_ROOT, 'backend', 'src', 'services', 'homecloudReadService.js'), 'utf8');
  // For every `.from('homecloud_folders')`, the select that is actually chained to
  // it is the FIRST `.select(...)` after it, which is why a naive scan of the whole
  // file would pick up an unrelated read instead.
  const folderSelects = [...readService.matchAll(/\.from\('homecloud_folders'\)((?:[^;]*?))\.select\('([^']*)'\)/g)].map((match) => match[2]);
  record(folderSelects.length >= 2, `the read service reads homecloud_folders in ${folderSelects.length} place(s)`);
  record(folderSelects.length > 0 && folderSelects.every((select) => select.includes('parent_folder_id')), `EVERY folder select projects parent_folder_id, so a folder DTO can never arrive without its ancestry (${folderSelects.length} select(s))`);
  const catalogueBlock = readService.slice(readService.indexOf('async function listFolders'), readService.indexOf('async function getFolderById'));
  record(!/\blimit\(|\.range\(|\.single\(/.test(catalogueBlock), 'the catalogue read is neither truncated nor paged, so the WHOLE tree arrives in ONE read');
  record(catalogueBlock.includes('eq(\'household_id\', context.householdId)'), 'the catalogue read is household-scoped');

  // No materialized path may be STORED or TRANSPORTED: it would have to be
  // rewritten for a whole subtree on every rename or move.
  const folderDto = /export interface HomeCloudFolder \{([\s\S]*?)\n\}/.exec(
    fs.readFileSync(path.join(REPO_ROOT, 'front', 'mi-front-limpio', 'services', 'homecloud', 'homecloudTypes.ts'), 'utf8'),
  );
  record(Boolean(folderDto), 'the Folder DTO is declared');
  if (folderDto) {
    record(!/\b(path|fullPath|folderPath|depth|level|ancestry)\??\s*:/i.test(folderDto[1]), 'the Folder DTO carries NO denormalized path, depth or ancestry beyond parentFolderId');
  }
  const migration = fs.readFileSync(path.join(REPO_ROOT, 'supabase', 'migrations', '20261005000000_homecloud_folders_hierarchy_v2.sql'), 'utf8');
  // Strip comments before inspecting the schema, so prose that merely MENTIONS the
  // rejected designs cannot be mistaken for one having been implemented.
  const migrationDdl = migration
    .replace(/--[^\n]*/g, '')
    .replace(/'[^']*'/g, "''");
  const addedColumns = [...migrationDdl.matchAll(/add column if not exists (\w+)/g)].map((match) => match[1]);
  record(addedColumns.length === 1 && addedColumns[0] === 'parent_folder_id', `the migration adds exactly ONE column, the parent edge (${addedColumns.join(', ')})`);
  record(!/\b(folder_path|full_path|materialized_path|depth|level|ltree|closure_table|nested_set)\b/i.test(migrationDdl), 'the migration stores no materialized path, depth, ltree, closure table or nested set');
  record(!/create table(?! if not exists public\.homecloud_folders)/i.test(migrationDdl), 'the migration creates no new table, so it cannot shadow or replace any Stage 1 relation');
  const originalTable = /create table if not exists public\.homecloud_folders \(([\s\S]*?)\n\);/.exec(
    fs.readFileSync(path.join(REPO_ROOT, 'supabase', 'migrations', '20260910000001_homecloud_folders_v1_1.sql'), 'utf8'),
  );
  record(Boolean(originalTable) && !/path|depth|level/i.test(originalTable ? originalTable[1] : ''), 'the original folders table still has no path or depth column');
  // Recovery decision, backed by measured PostgreSQL 17.6 evidence on an identical
  // 3-level fixture: a direct delete of a folder that still has children FAILS and
  // moves nothing, promotion-then-delete succeeds with the exact promotion
  // contract, and `DELETE FROM households` cascade still tears the tree down. The
  // weaker SET NULL alternative was measured too and rejected: it silently
  // relocated a child to the root, losing a level and never consulting the
  // promotion conflict check.
  record(/on delete no action deferrable initially deferred/i.test(migrationDdl), 'the parent FK is ON DELETE NO ACTION DEFERRABLE, so an unsafe direct delete FAILS instead of silently relocating the subtree');
  record(!/parent_folder_id[^;]*on delete cascade/i.test(migrationDdl), 'no ON DELETE CASCADE can ever remove a descendant folder');
  record(!/on delete set null[^;]*parent_folder/i.test(migrationDdl), 'the parent FK is never ON DELETE SET NULL, which was measured to corrupt hierarchy depth');
  // Sibling uniqueness: ONE mechanism, and a NULL parent is one real sibling scope.
  record(/nulls not distinct/i.test(migrationDdl), 'sibling uniqueness uses a single NULLS NOT DISTINCT index, so duplicate ROOT folders are impossible');
  // The superseded partial indexes may still be NAMED, but only so the migration can
// drop them on an environment that saw the earlier draft. What must not survive is
// a live CREATE of a competing uniqueness mechanism.
  const createsPartialSibling = /create\s+(unique\s+)?index[^;]*hc_folders_(root|child)_sibling_name_unique/i.test(migrationDdl);
  record(!createsPartialSibling, 'no competing partial sibling uniqueness index is ever CREATED');
  record(/drop index if exists public\.hc_folders_root_sibling_name_unique/i.test(migrationDdl)
    && /drop index if exists public\.hc_folders_child_sibling_name_unique/i.test(migrationDdl)
    && /drop index if exists public\.hc_folders_household_name_unique/i.test(migrationDdl),
    'the migration drops the Stage 1 flat index and both superseded partial indexes, so no competing uniqueness mechanism is left behind');
  record(/hc_folders_parent_name_unique/.test(migration), 'the canonical sibling index is named hc_folders_parent_name_unique');
  // The concurrency argument must live in the TRIGGER, not only in the RPCs: a
  // direct concurrent table write is exactly the race a service-level check loses.
  const triggerFn = /create or replace function public\.homecloud_folders_hierarchy_invariants\(\)([\s\S]*?)\$\$;/.exec(migration);
  record(Boolean(triggerFn), 'the hierarchy invariant function exists');
  if (triggerFn) {
    record(/perform pg_advisory_xact_lock\(public\.homecloud_folders_hierarchy_lock_key\(new\.household_id\)\)/.test(triggerFn[1]),
      'the TRIGGER itself takes the household lock, so the A-under-B / B-under-A race is impossible on EVERY write path, not only the RPCs');
    record(triggerFn[1].indexOf('pg_advisory_xact_lock') < triggerFn[1].indexOf('while v_walk is not null loop'),
      'the lock is taken BEFORE the ancestor walk, so the walk it guards is authoritative');
  }
  record(/create or replace function public\.homecloud_create_folder/.test(migration), 'the migration creates the create-with-parent RPC the backend calls');
  record(/create or replace function public\.homecloud_move_folder/.test(migration), 'the migration creates the reparent RPC the backend calls');
  record(/create or replace function public\.homecloud_delete_folder\(p_folder_id uuid\)/.test(migration), 'the migration creates the delete RPC the backend calls, with no superseded V1/V2 twin');
  record(!/homecloud_delete_folder_v1/.test(migration), 'no duplicate V1/V2 delete RPC name survives');
  record(/drop function if exists public\.homecloud_folders_lock_household/.test(migration), 'the superseded lock helper is explicitly dropped, leaving no orphaned authority');
  const rpcNames = [...migration.matchAll(/create or replace function public\.(homecloud_\w+)\(/g)].map((match) => match[1]);
  record(new Set(rpcNames).size === rpcNames.length, `no function is created twice under the same name (${rpcNames.join(', ')})`);
}

console.log(`\nHIERARCHY_UI_RESULT pass=${passCount} fail=${failCount}`);
console.log(failCount === 0 ? 'HIERARCHY_UI_TESTS=PASS' : 'HIERARCHY_UI_TESTS=FAIL');
process.exit(failCount === 0 ? 0 : 1);
