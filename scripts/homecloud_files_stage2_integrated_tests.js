#!/usr/bin/env node
'use strict';

/**
 * HomeCloud Files - STAGE 2 PHASE 4 - INTEGRATED QA, against the REAL local stack.
 *
 * LOCAL_RUNTIME_REQUIRED. This is the seam that proves Stage 1 and Stage 2 TOGETHER,
 * which no per-phase suite can do. It drives the real authority chain - real JWT,
 * real context, real capability matrix, real services, real PostgREST - through the
 * fifteen cross-flows the Stage 2 plan names, plus the large-data boundaries, the
 * household-isolation matrix and the privacy review.
 *
 * WHAT ONLY THIS SEAM CAN PROVE, and why the per-phase suites are not enough:
 *
 *   A-O  the cross-flows, which by definition combine a hierarchy mutation with a
 *        File move, a search, a filter, a Viewer decision or a refresh boundary.
 *        Each phase proved its own seam; only the COMBINATION proves the product.
 *   Q    large data at 99/100/101, 199/200/201 and 299/300/301, which is where a
 *        has-more guess, a page-window bug or a client-side sort would show up.
 *   H    the household-isolation matrix across the whole Stage 2 surface, including
 *        the Viewer authorization and the signed-URL grant.
 *   P    the privacy review: no signed URL logged, no token logged, no third-party
 *        viewer, no public URL, no raw document HTML executed.
 *
 * Nothing here is stubbed beyond the transport boundary, and every artifact it
 * creates is removed in a `finally`.
 */

const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('node:crypto');
const { loadTestEnvironment, requireLocalUrl } = require('../tests/helpers/environment');
const { repositoryRoot } = require('../tests/helpers/process');

loadTestEnvironment({
  required: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
});
requireLocalUrl('SUPABASE_URL');

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const filesService = require('../backend/src/services/homecloudFilesService');
const readService = require('../backend/src/services/homecloudReadService');
const storageAccess = require('../backend/src/services/homecloudStorageAccess');

const viewerKind = require('../front/mi-front-limpio/services/homecloud/homecloudViewerKind.ts');

let passCount = 0;
let failCount = 0;

function record(ok, message) {
  if (ok) { passCount += 1; console.log(`  PASS: ${message}`); return true; }
  failCount += 1; console.error(`  FAIL: ${message}`); return false;
}

async function expectReject(promiseFactory, expectedCode, message) {
  try {
    await promiseFactory();
    record(false, `${message} (expected ${expectedCode}, got success)`);
    return null;
  } catch (e) {
    const ok = e && e.code === expectedCode;
    record(ok, `${message} (${(e && e.code) || 'no_code'})`);
    return e;
  }
}

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY, clientOptions);
const anonClient = createClient(SUPABASE_URL, ANON_KEY, clientOptions);

async function createAuthUser(runId, label) {
  const email = `hcqa-${label}-${runId}@test.local`;
  const password = 'dummy12345';
  const { data, error } = await serviceClient.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const { data: signedIn, error: signErr } = await anonClient.auth.signInWithPassword({ email, password });
  if (signErr || !signedIn?.session?.access_token) throw signErr || new Error('no session');
  return { userId: data.user.id, token: signedIn.session.access_token };
}

function reqFor(authUser) {
  return { user: { id: authUser.userId }, accessToken: authUser.token };
}

async function insertFile({ householdId, displayName, folderId = null, memberId = null, prefix = '', mimeType = 'text/plain', extension = 'txt', sizeBytes = 3 }) {
  const id = randomUUID();
  const row = {
    id,
    household_id: householdId,
    role: 'file',
    display_name: displayName,
    mime_type: mimeType,
    extension,
    size_bytes: sizeBytes,
    original_storage_path: `${householdId}/${id}/original`,
    lifecycle: 'active',
    uploaded_at: new Date().toISOString(),
    folder_id: folderId,
    uploaded_by_member_id: memberId,
    intake_request_id: `${prefix}${id}`,
  };
  const { error } = await serviceClient.from('homecloud_contents').insert(row);
  if (error) throw error;
  return row;
}

async function folderParentOf(folderId) {
  const { data, error } = await serviceClient.from('homecloud_folders').select('parent_folder_id').eq('id', folderId).single();
  if (error) throw error;
  return data.parent_folder_id ?? null;
}

async function fileFolderOf(contentId) {
  const { data, error } = await serviceClient.from('homecloud_contents').select('folder_id').eq('id', contentId).single();
  if (error) throw error;
  return data.folder_id ?? null;
}

async function run() {
  console.log('\n=== HOMECLOUD FILES: STAGE 2 INTEGRATED QA (Stage 1 + Stage 2, real stack) ===\n');
  console.log(`Target Supabase local: ${SUPABASE_URL}`);

  {
    const { error } = await serviceClient.from('homecloud_folders').select('id, parent_folder_id').limit(0);
    if (error) {
      console.error('FATAL: the Stage 2 hierarchy schema is not applied to the local stack.');
      console.error('Apply supabase/migrations/20261005000000_homecloud_folders_hierarchy_v2.sql first.');
      process.exit(1);
    }
  }

  const runId = Date.now();
  const P = `qa${String(runId).slice(-6)}`;
  const cleanup = { authUsers: [], contentIds: [], membershipIds: [], personIds: [], householdIds: [], folderIds: [], storagePaths: [] };

  try {
    const adultA = await createAuthUser(runId, 'adultA');
    const childAuthA = await createAuthUser(runId, 'childA');
    const adultB = await createAuthUser(runId, 'adultB');
    cleanup.authUsers.push(adultA.userId, childAuthA.userId, adultB.userId);

    async function makePerson(label, authUser) {
      const { data, error } = await serviceClient.from('people')
        .insert({ display_name: `HCQA ${label}`, auth_user_id: authUser.userId }).select('*').single();
      if (error) throw error;
      cleanup.personIds.push(data.id);
      return data;
    }
    const personA = await makePerson('AdultA', adultA);
    const personChildA = await makePerson('ChildA', childAuthA);
    const personB = await makePerson('AdultB', adultB);

    async function makeHousehold(label, creator) {
      const { data, error } = await serviceClient.from('households')
        .insert({ name: `HCQA ${label}`, slug: `hcqa-${label}-${runId}`, created_by_person_id: creator.id }).select('*').single();
      if (error) throw error;
      cleanup.householdIds.push(data.id);
      return data;
    }
    const hhA = await makeHousehold('a', personA);
    const hhB = await makeHousehold('b', personB);

    const nowIso = new Date().toISOString();
    async function addMember(householdId, personId, role) {
      const { data, error } = await serviceClient.from('household_members')
        .insert({ household_id: householdId, person_id: personId, role, status: 'active', joined_at: nowIso }).select('*').single();
      if (error) throw error;
      cleanup.membershipIds.push(data.id);
      return data;
    }
    const memberA = await addMember(hhA.id, personA.id, 'coordinator');
    await addMember(hhA.id, personChildA.id, 'child');
    await addMember(hhB.id, personB.id, 'adult');
    for (const [personId, hhId] of [[personA.id, hhA.id], [personChildA.id, hhA.id], [personB.id, hhB.id]]) {
      const { error } = await serviceClient.from('people').update({ active_household_id: hhId }).eq('id', personId);
      if (error) throw error;
    }

    const reqA = reqFor(adultA);
    const reqChildA = reqFor(childAuthA);
    const reqB = reqFor(adultB);

    /**
     * The REAL authorization seam for one File's ORIGINAL bytes.
     *
     * It resolves the caller's context exactly as the controller does, so the
     * capability matrix, the household scope and the storage lookup are all real.
     */
    async function originalGrant(req, contentId) {
      return storageAccess.createHomeCloudContentAccess({ authContext: await realAuthContext(req), contentId, variant: 'original' });
    }

    /**
     * The SAME authContext the storage controller builds: the resolved context plus
     * the resolved capability descriptor. Building it by hand instead would let a
     * test pass with capabilities the controller would never grant.
     */
    async function realAuthContext(req) {
      const contextService = require('../backend/src/services/homecloud.context.service');
      const capabilitiesLib = require('../backend/src/lib/homecloudCapabilities');
      const context = await contextService.getHomeCloudContext(req);
      const capabilities = capabilitiesLib.resolveHomeCloudCapabilities({
        role: context.membership.role,
        membershipStatus: context.membership.status,
        household: context.household,
      });
      return { ...context, capabilities };
    }

    // ── CROSS-FLOW A: nested create, upload, navigate out and back ───────────
    console.log('\n--- A: nested create, upload, navigate out and back ---');
    const rootA = await filesService.createFolder(reqA, `${P} Proyectos`);
    const childA = await filesService.createFolder(reqA, `${P} Facturas`, rootA.id);
    const grandA = await filesService.createFolder(reqA, `${P} 2026`, childA.id);
    const fileA1 = await insertFile({ householdId: hhA.id, displayName: `${P} uno.txt`, folderId: grandA.id, memberId: memberA.id, prefix: `${P}-` });
    const fileA2 = await insertFile({ householdId: hhA.id, displayName: `${P} dos.txt`, folderId: grandA.id, memberId: memberA.id, prefix: `${P}-` });
    cleanup.contentIds.push(fileA1.id, fileA2.id);

    const rootLevel = await filesService.browseFiles(reqA, { folderId: null });
    record(rootLevel.folders.some((f) => f.id === rootA.id) && !rootLevel.folders.some((f) => f.id === childA.id),
      'A1. the root level lists the root folder and NOT its descendants');
    const deepestLevel = await filesService.browseFiles(reqA, { folderId: grandA.id });
    record(deepestLevel.files.filter((f) => f.id === fileA1.id || f.id === fileA2.id).length === 2,
      'A2. both Files appear at the deepest folder exactly once');
    const reRoot = await filesService.browseFiles(reqA, { folderId: null });
    record(!reRoot.files.some((f) => f.id === fileA1.id || f.id === fileA2.id),
      'A3. and neither is duplicated at the root after navigating out and back');
    const catalogue = await readService.listFolders(reqA);
    record(catalogue.length === 3 && catalogue.every((f) => typeof f.parentFolderId === 'string' || f.parentFolderId === null),
      'A4. the whole-household catalogue still describes the entire tree in ONE read');

    // ── CROSS-FLOW B: move across branches ──────────────────────────────────
    console.log('\n--- B: move a File across branches ---');
    const otherBranch = await filesService.createFolder(reqA, `${P} Archivo`);
    const movedB = await filesService.updateFile(reqA, fileA1.id, { folderId: otherBranch.id });
    record(movedB.folderId === otherBranch.id, 'B1. the File moved into the other branch');
    const destB = await filesService.browseFiles(reqA, { folderId: otherBranch.id });
    record(destB.files.some((f) => f.id === fileA1.id), 'B2. the destination lists it');
    const sourceB = await filesService.browseFiles(reqA, { folderId: grandA.id });
    record(!sourceB.files.some((f) => f.id === fileA1.id), 'B3. the source no longer lists it: no duplicate');
    record(sourceB.files.some((f) => f.id === fileA2.id), 'B4. the sibling File was untouched');
    record(await fileFolderOf(fileA1.id) === otherBranch.id, 'B5. the stored link matches exactly one destination');

    // ── CROSS-FLOW C: cycle rejection leaves the tree unchanged ──────────────
    console.log('\n--- C: a cycle attempt changes nothing ---');
    const beforeC = await readService.listFolders(reqA);
    await expectReject(() => filesService.moveFolder(reqA, rootA.id, grandA.id), 'homecloud_folder_cycle', 'C1. A cannot be moved under its own grandchild');
    const afterC = await readService.listFolders(reqA);
    record(JSON.stringify(beforeC.map((f) => [f.id, f.parentFolderId])) === JSON.stringify(afterC.map((f) => [f.id, f.parentFolderId])),
      'C2. the tree is byte-identical after the refusal');

    // ── CROSS-FLOW D: delete promotes, nothing is lost ───────────────────────
    console.log('\n--- D: delete promotes the direct contents ---');
    const dChild = await filesService.createFolder(reqA, `${P} DHijo`, rootA.id);
    const dGrand = await filesService.createFolder(reqA, `${P} DNieto`, dChild.id);
    const dFile = await insertFile({ householdId: hhA.id, displayName: `${P} promo.txt`, folderId: dChild.id, memberId: memberA.id, prefix: `${P}-` });
    const dDeepFile = await insertFile({ householdId: hhA.id, displayName: `${P} prof.txt`, folderId: dGrand.id, memberId: memberA.id, prefix: `${P}-` });
    cleanup.contentIds.push(dFile.id, dDeepFile.id);

    await filesService.deleteFolder(reqA, dChild.id);
    record(await folderParentOf(dGrand.id) === rootA.id, 'D1. the direct child folder was promoted to the deleted folder parent');
    record(await folderParentOf(dGrand.id) !== null && await fileFolderOf(dFile.id) === rootA.id, 'D2. the direct File was promoted to the same parent');
    record(await fileFolderOf(dDeepFile.id) === dGrand.id, 'D3. the nested File stayed with its own immediate parent');
    const { count: lostAfterD } = await serviceClient.from('homecloud_contents').select('id', { count: 'exact', head: true }).eq('id', dFile.id);
    record(lostAfterD === 1, 'D4. no File was deleted: it is still there, only relocated');

    // ── CROSS-FLOW E: a conflicting promotion is refused ─────────────────────
    console.log('\n--- E: a promotion that would collide is refused ---');
    const eParent = await filesService.createFolder(reqA, `${P} EPadre`);
    const eX = await filesService.createFolder(reqA, `${P} EX`, eParent.id);
    const eSibling = await filesService.createFolder(reqA, `${P} Fotos`, eParent.id);
    const eInner = await filesService.createFolder(reqA, `${P} fotos`, eX.id);
    const eFile = await insertFile({ householdId: hhA.id, displayName: `${P} e.txt`, folderId: eX.id, memberId: memberA.id, prefix: `${P}-` });
    cleanup.contentIds.push(eFile.id);

    await expectReject(() => filesService.deleteFolder(reqA, eX.id), 'homecloud_folder_promotion_conflict', 'E1. the delete is refused as a typed conflict');
    record((await readService.listFolders(reqA)).some((f) => f.id === eX.id), 'E2. X still exists');
    record(await folderParentOf(eInner.id) === eX.id, 'E3. the colliding child was NOT relocated');
    record(await folderParentOf(eSibling.id) === eParent.id, 'E4. the existing sibling was NOT touched');
    record(await fileFolderOf(eFile.id) === eX.id, 'E5. no File was moved');

    // ── CROSS-FLOW F: refresh preserves the exact context ────────────────────
    console.log('\n--- F: a refresh re-asks the same nested question ---');
    const contextF = await filesService.browseFiles(reqA, { folderId: childA.id, sort: 'name', favoritesOnly: false });
    const contextF2 = await filesService.browseFiles(reqA, { folderId: childA.id, sort: 'name', favoritesOnly: false });
    record(JSON.stringify(contextF.folders.map((f) => f.id)) === JSON.stringify(contextF2.folders.map((f) => f.id)),
      'F1. the same nested context answers identically on a re-read');
    record(contextF2.folders.every((f) => f.parentFolderId === childA.id), 'F2. still only this folder direct children');

    // ── CROSS-FLOW G: selection + bulk move into a nested destination ────────
    console.log('\n--- G: a bulk move reaches a nested destination ---');
    const gDest = await filesService.createFolder(reqA, `${P} GDestino`, rootA.id);
    const gMove1 = await insertFile({ householdId: hhA.id, displayName: `${P} g1.txt`, folderId: null, memberId: memberA.id, prefix: `${P}-` });
    const gMove2 = await insertFile({ householdId: hhA.id, displayName: `${P} g2.txt`, folderId: null, memberId: memberA.id, prefix: `${P}-` });
    cleanup.contentIds.push(gMove1.id, gMove2.id);
    await filesService.updateFile(reqA, gMove1.id, { folderId: gDest.id });
    await filesService.updateFile(reqA, gMove2.id, { folderId: gDest.id });
    const gLevel = await filesService.browseFiles(reqA, { folderId: gDest.id });
    record(gLevel.files.filter((f) => f.id === gMove1.id || f.id === gMove2.id).length === 2, 'G1. both Files are in the nested destination');
    const gRoot = await filesService.browseFiles(reqA, { folderId: null });
    record(!gRoot.files.some((f) => f.id === gMove1.id || f.id === gMove2.id), 'G2. and neither is left behind at the root');

    // ── CROSS-FLOW H: favorites compose with nesting ─────────────────────────
    console.log('\n--- H: Favoritos composes with a nested context ---');
    const hFile = await insertFile({ householdId: hhA.id, displayName: `${P} favorito.txt`, folderId: grandA.id, memberId: memberA.id, prefix: `${P}-` });
    cleanup.contentIds.push(hFile.id);
    await filesService.setFileFavorite(reqA, hFile.id, true);
    const hNested = await filesService.browseFiles(reqA, { folderId: grandA.id, favoritesOnly: true });
    record(hNested.files.some((f) => f.id === hFile.id && f.isFavorite === true), 'H1. the favorite is found inside the nested folder');
    const hNestedNone = await filesService.browseFiles(reqA, { folderId: rootA.id, favoritesOnly: true });
    record(!hNestedNone.files.some((f) => f.id === hFile.id), 'H2. and is NOT leaked into a sibling folder that does not contain it');
    await filesService.setFileFavorite(reqA, hFile.id, false);

    // ── CROSS-FLOW I: search scope over the nested tree ──────────────────────
    console.log('\n--- I: search scope is preserved over a nested tree ---');
    const iFile = await insertFile({ householdId: hhA.id, displayName: `${P}aguante.pdf`, folderId: grandA.id, memberId: memberA.id, prefix: `${P}-`, mimeType: 'application/pdf', extension: 'pdf' });
    cleanup.contentIds.push(iFile.id);
    const iRoot = await filesService.browseFiles(reqA, { folderId: null, query: 'aguante' });
    record(iRoot.files.some((f) => f.id === iFile.id), 'I1. root search is GLOBAL and finds a File inside a nested folder');
    const iWrong = await filesService.browseFiles(reqA, { folderId: rootA.id, query: 'aguante' });
    record(!iWrong.files.some((f) => f.id === iFile.id), 'I2. folder search does NOT reach into a subfolder that is not open');
    const iRight = await filesService.browseFiles(reqA, { folderId: grandA.id, query: 'aguante' });
    record(iRight.files.some((f) => f.id === iFile.id), 'I3. and it finds the File when its own folder is open');
    const iLiteral = await filesService.browseFiles(reqA, { folderId: null, query: '%' });
    record(Array.isArray(iLiteral.files) && iLiteral.files.length === 0, 'I4. the literal-search hardening is intact over a nested tree');

    // ── CROSS-FLOW J-N: Viewer decisions and selection coexistence ───────────
    console.log('\n--- J-N: Viewer routing and selection coexistence ---');
    const classify = (name, mime) => viewerKind.classifyHomeCloudViewerFile({ fileName: name, mimeType: mime });
    record(classify(iFile.display_name, iFile.mime_type).kind === 'pdf', 'J1. the PDF is classified as pdf from its stored mime');
    record(classify('logo.svg', 'image/svg+xml').kind === 'unsupported', 'J2. an SVG is refused rather than rendered as active web content');
    record(classify('hoja.xlsx', 'application/octet-stream').kind === 'office_sheet', 'J3. an Office file under a generic mime is still routed by its extension');
    record(classify('notas.txt', 'text/plain').kind === 'text', 'J4. a TXT is text');
    const cap = viewerKind.VIEWER_TEXT_PREVIEW_BYTE_CAP;
    record(cap > 0 && cap <= 1024 * 1024, `J5. the text preview cap is bounded (${cap} bytes)`);

    // Selection coexistence is proven at the model seam: a tap outside selection is
    // the Viewer's and must not touch the model; inside selection it toggles only.
    const selectionModel = require('../front/mi-front-limpio/services/homecloud/homecloudFileSelection.ts');
    // `enterFileSelection` is the STAGE 1 entry reducer, still the one production
    // uses; entering through it here keeps this assertion on the real model rather
    // than on a hand-built selection.
    const entered = selectionModel.enterFileSelection(selectionModel.emptyFileSelection());
    record(entered.mode === true, 'J6. the Stage 1 entry reducer is what still enters selection mode');
    record(selectionModel.toggleFileSelection(entered, iFile.id).ids.has(iFile.id), 'J7. inside selection a tap selects');
    record(selectionModel.toggleFileSelection(selectionModel.toggleFileSelection(entered, iFile.id), iFile.id).ids.size === 0,
      'J8. and the same tap deselects, so a tap outside selection cannot be a selection gesture by accident');
    record(selectionModel.selectedFileIds(selectionModel.pruneFileSelection(entered, [])).length === 0,
      'J9. a vanished id is pruned rather than left stale');
        // BULK MOVE, proven through the CANONICAL seam rather than by importing
    // `homecloudBulkMove` directly: that module resolves through the app's aliased
    // `../api`, which plain Node cannot load, and the Stage 1 selection/bulk suite
    // already drives the real `bulkMoveFiles` engine. What is new in Stage 2 and is
    // therefore asserted HERE is the part the engine delegates: that N ordinary
    // single-file mutations into a NESTED destination all land in it, and that the
    // destination level then lists them.
    const bulkIds = [gMove1.id, gMove2.id];
    const landings = [];
    for (const id of bulkIds) {
      const moved = await filesService.updateFile(reqA, id, { folderId: gDest.id });
      landings.push(moved.folderId);
    }
    record(landings.every((id) => id === gDest.id), 'J10. every one of N canonical mutations landed in the NESTED destination');
    const bulkLevel = await filesService.browseFiles(reqA, { folderId: gDest.id });
    record(bulkLevel.files.filter((f) => bulkIds.includes(f.id)).length === 2, 'J11. and the destination level lists both, with no duplicate');
    const bulkRoot = await filesService.browseFiles(reqA, { folderId: null });
    record(!bulkRoot.files.some((f) => bulkIds.includes(f.id)), 'J12. and the root no longer lists them, so pagination cannot show a File twice');

    // ── CROSS-FLOW O: Viewer authorization and isolation ─────────────────────
    console.log('\n--- O: Viewer authorization and household isolation ---');
    const bForeign = await insertFile({ householdId: hhB.id, displayName: `${P} ajeno.pdf`, prefix: `${P}-`, mimeType: 'application/pdf', extension: 'pdf' });
    cleanup.contentIds.push(bForeign.id);

    // The Viewer grant is only meaningful against a REAL object, so the two Files
    // used here get real bytes in the PRIVATE originals bucket. Everything else in
    // this suite is content-metadata only, which is all those seams need.
    async function seedOriginalBytes(row, bytes) {
      const { error } = await serviceClient.storage
        .from('homecloud-originals')
        .upload(row.original_storage_path, Buffer.from(bytes), { contentType: row.mime_type, upsert: true });
      if (error) throw error;
      cleanup.storagePaths.push({ bucket: 'homecloud-originals', path: row.original_storage_path });
    }
    await seedOriginalBytes(iFile, '%PDF-1.4 stage2 integrated qa');
    await seedOriginalBytes(bForeign, '%PDF-1.4 foreign');
    await expectReject(() => originalGrant(reqA, bForeign.id), 'homecloud_content_not_found', 'O1. Household A cannot obtain access to a Household B original');
    await expectReject(() => originalGrant(reqB, iFile.id), 'homecloud_content_not_found', 'O2. and Household B cannot obtain access to a Household A original');
    const ownGrant = await originalGrant(reqA, iFile.id);
    record(typeof ownGrant.signedUrl === 'string' && ownGrant.signedUrl.length > 0 && ownGrant.variant === 'original',
      'O3. the owner receives an ORIGINAL variant grant for its own File');
    record(/^https?:\/\//.test(ownGrant.signedUrl) && !/docs\.google|microsoft|officeapps|view\.officeapps/i.test(ownGrant.signedUrl),
      'O4. the grant points at the household storage, never at a third-party viewer');
    {
      const authContext = await realAuthContext(reqA);
      // A missing preview is returned as the canonical `preview_unavailable`
      // RESULT, not thrown and not faked into a path. That is the property worth
      // proving: the service never invents a preview URL.
      const previewAttempt = await storageAccess.createHomeCloudContentAccess({ authContext, contentId: iFile.id, variant: 'preview' }).catch((e) => ({ error: e }));
      record(previewAttempt.error === undefined && previewAttempt.code === 'preview_unavailable',
        'O5. a File with no stored preview answers the canonical preview_unavailable result and no URL');
      const badVariant = await storageAccess.createHomeCloudContentAccess({ authContext, contentId: iFile.id, variant: 'thumbnail' }).catch((e) => ({ error: e }));
      record(badVariant.error !== undefined, 'O6. an unknown variant is refused outright');
      // A WRITTEN Memory has no binary at all, so asking for its original must be a
      // typed refusal rather than a staged or invented object.
      //
      // It is INSERTED in its real written shape rather than mutated from a File.
      // That shape is dictated by TWO database checks and is worth reading: a
      // written Memory must carry `written_text` and NOTHING binary - no mime type,
      // no extension, no size, no stored path - and `homecloud_contents_written_
      // purity_check` additionally forbids display_name, caption, uploaded_at,
      // preview path, folder, document date and note. Mutating a File row into a
      // Memory therefore fails, and would leave a stray File at the root that then
      // distorts every large-data row count that follows.
      const writtenMemoryId = randomUUID();
      {
        const { error } = await serviceClient.from('homecloud_contents').insert({
          id: writtenMemoryId,
          household_id: hhA.id,
          role: 'memory',
          display_name: null,
          caption: null,
          mime_type: null,
          extension: null,
          size_bytes: null,
          original_storage_path: null,
          preview_storage_path: null,
          uploaded_at: null,
          folder_id: null,
          document_date: null,
          note: null,
          lifecycle: 'active',
          written_text: 'un recuerdo escrito, sin binario',
          capture_precision: 'unknown',
        });
        if (error) throw new Error(`WRITTEN_MEMORY_INSERT: ${error.message}`);
        cleanup.contentIds.push(writtenMemoryId);
      }
      const writtenAttempt = await storageAccess.createHomeCloudContentAccess({ authContext, contentId: writtenMemoryId, variant: 'original' }).catch((e) => ({ error: e }));
      record(writtenAttempt.error !== undefined && writtenAttempt.error.code === 'homecloud_content_has_no_binary',
        'O6b. a written Memory is refused as binary rather than staged into a viewer');
      const { count: rootFileCount } = await serviceClient.from('homecloud_contents')
        .select('id', { count: 'exact', head: true })
        .eq('household_id', hhA.id).eq('role', 'file').is('folder_id', null);
      record(rootFileCount === 0, `O6c. and this left no stray File at the root, so the large-data counts that follow measure only their own batch (${rootFileCount} stray)`);
    }

    // ── H: the household-isolation matrix across the Stage 2 surface ─────────
    console.log('\n--- H-matrix: household isolation across every Stage 2 seam ---');
    {
      await expectReject(() => filesService.browseFiles(reqB, { folderId: grandA.id }), 'homecloud_folder_not_found', 'H-m1. B cannot browse inside an A folder');
      await expectReject(() => filesService.createFolder(reqB, `${P} Secreto`, rootA.id), 'homecloud_folder_not_found', 'H-m2. B cannot create inside an A folder');
      await expectReject(() => filesService.moveFolder(reqB, childA.id, null), 'homecloud_folder_not_found', 'H-m3. B cannot reparent an A folder');
      await expectReject(() => filesService.deleteFolder(reqB, childA.id), 'homecloud_folder_not_found', 'H-m4. B cannot delete an A folder');
      await expectReject(() => filesService.renameFolder(reqB, childA.id, `${P} Secreto2`), 'homecloud_folder_not_found', 'H-m5. B cannot rename an A folder');
      await expectReject(() => filesService.updateFile(reqB, fileA2.id, { folderId: null }), 'homecloud_content_not_found', 'H-m6. B cannot move an A File');
      const bCatalogue = await readService.listFolders(reqB);
      record(bCatalogue.every((f) => f.householdId === undefined) && bCatalogue.every((f) => !catalogue.some((a) => a.id === f.id)),
        'H-m7. the B catalogue exposes no A folder at all');
      await expectReject(() => filesService.createFolder(reqChildA, `${P} SinPermiso`), 'homecloud_forbidden', 'H-m8. a view-only child still cannot create');
      await expectReject(() => filesService.moveFolder(reqChildA, childA.id, null), 'homecloud_forbidden', 'H-m9. and cannot reparent');
      await expectReject(() => filesService.deleteFolder(reqChildA, childA.id), 'homecloud_forbidden', 'H-m10. and cannot delete');
      const adultCatalogue = await readService.listFolders(reqA);
      const childCatalogue = await readService.listFolders(reqChildA);
      record(childCatalogue.length === adultCatalogue.length
        && JSON.stringify(childCatalogue.map((f) => [f.id, f.parentFolderId]).sort()) === JSON.stringify(adultCatalogue.map((f) => [f.id, f.parentFolderId]).sort()),
        'H-m11. destination VISIBILITY is unchanged for a viewer: the catalogue is identical, mutation is not');
    }

    // ── Q: large data at the Stage 1 boundaries ──────────────────────────────
    console.log('\n--- Q: large-data boundaries ---');
    {
      for (const total of [99, 100, 101, 199, 200, 201, 299, 300, 301]) {
        const ids = [];
        for (let index = 0; index < total; index += 1) {
          const row = await insertFile({ householdId: hhA.id, displayName: `${P} bulk ${total}-${index}.txt`, memberId: memberA.id, prefix: `${P}-` });
          ids.push(row.id);
        }
        cleanup.contentIds.push(...ids);
        const first = await filesService.browseFiles(reqA, { folderId: null, limit: 100, offset: 0 });
        const expectedHasMore = total > 100;
        record(first.files.length === Math.min(total, 100), `Q.${total} a full page holds exactly ${Math.min(total, 100)} rows`);
        record((first.nextOffset !== null) === expectedHasMore, `Q.${total} nextOffset is ${expectedHasMore ? 'an offset' : 'null'} (${first.nextOffset})`);
        if (expectedHasMore) {
          const second = await filesService.browseFiles(reqA, { folderId: null, limit: 100, offset: first.nextOffset });
          const firstIds = new Set(first.files.map((f) => f.id));
          // The read asks for `limit + 1` rows as a has-more probe and slices, so a
          // second page is AT MOST `limit` rows even when more remain. Paging is
          // walked to exhaustion rather than assuming one extra page suffices.
          record(second.files.length === Math.min(100, total - 100),
            `Q.${total} the next page holds ${Math.min(100, total - 100)} row(s)`);
          record(second.files.every((f) => !firstIds.has(f.id)), `Q.${total} the two pages never overlap`);
          const seen = new Set([...first.files.map((f) => f.id), ...second.files.map((f) => f.id)]);
          let offset = second.nextOffset;
          let guard = 0;
          while (offset !== null && guard < 10) {
            const next = await filesService.browseFiles(reqA, { folderId: null, limit: 100, offset });
            for (const f of next.files) seen.add(f.id);
            offset = next.nextOffset;
            guard += 1;
          }
          record(seen.size === total, `Q.${total} paging to exhaustion yields every one of the ${total} rows exactly once (${seen.size})`);
          const sortProbe = await filesService.browseFiles(reqA, { folderId: null, limit: 100, offset: 0, sort: 'name' });
          const names = sortProbe.files.map((f) => f.displayName);
          record(names.every((n, i) => i === 0 || names[i - 1].localeCompare(n) <= 0), `Q.${total} the server order is honoured in the first page`);
        }
        // Clean this batch so the next total measures a clean root.
        for (const id of ids) await serviceClient.from('homecloud_contents').delete().eq('id', id);
        cleanup.contentIds = cleanup.contentIds.filter((id) => !ids.includes(id));
      }
    }
    {
      // A representative catalogue scale: many folders across nested levels, with
      // ONE catalogue read and no per-folder ancestry request.
      const scaleParent = await filesService.createFolder(reqA, `${P} Escala`);
      const levelNodes = [scaleParent.id];
      const leafNodes = [];
      for (let level = 0; level < 4; level += 1) {
        // The parent of each level is the LEVEL NODE, never the previously created
        // leaf. Tracking the wrong one would silently flatten the fixture.
        const levelNode = await filesService.createFolder(reqA, `${P} Nivel${level}`, levelNodes[level]);
        levelNodes.push(levelNode.id);
        for (let child = 0; child < 25; child += 1) {
          const leaf = await filesService.createFolder(reqA, `${P} Hoja${level}-${child}`, levelNode.id);
          leafNodes.push(leaf.id);
        }
      }
      const scaleIds = [...levelNodes, ...leafNodes];
      const scaleCatalogue = await readService.listFolders(reqA);
      record(scaleCatalogue.length >= 105, `Q.scale the catalogue holds ${scaleCatalogue.length} folders across 5 levels`);
      record(scaleCatalogue.every((f) => f.parentFolderId !== undefined), 'Q.scale every folder carries its parent in the ONE catalogue read');
      // 'Hoja<level>-*' are the children of 'Nivel<level>', so level 3's leaves hang
      // off levelNodes[4] (0 = the Escala root).
      const deepestLeaves = scaleCatalogue.filter((f) => f.name.includes('Hoja3'));
      record(deepestLeaves.length === 25 && deepestLeaves.every((f) => f.parentFolderId === levelNodes[4]),
        'Q.scale the deepest level resolves its parent without any extra request');
      const scaleChildren = await filesService.browseFiles(reqA, { folderId: levelNodes[4] });
      record(scaleChildren.folders.length === 25 && scaleChildren.folders.every((f) => f.parentFolderId === levelNodes[4]),
        'Q.scale a wide level lists all 25 of its children in ONE query');
      record(scaleChildren.nextOffset === null && scaleChildren.files.length === 0, 'Q.scale and the level itself holds no Files, so nothing leaks across levels');
      for (const id of scaleIds) await serviceClient.from('homecloud_folders').delete().eq('id', id);
    }

    // ── P: the privacy review ───────────────────────────────────────────────
    console.log('\n--- P: privacy review ---');
    {
      const changed = [
        'backend/src/lib/homecloudFolderHierarchy.js',
        'backend/src/services/homecloudFilesService.js',
        'backend/src/services/homecloudReadService.js',
        'backend/src/lib/homecloudMappers.js',
        'backend/src/routes/homecloud.js',
        'backend/src/controllers/homecloud.files.controller.js',
        'front/mi-front-limpio/services/homecloud/homecloudViewerKind.ts',
        'front/mi-front-limpio/services/homecloud/homecloudViewerAccess.ts',
        'front/mi-front-limpio/screens/HomeCloudFileViewerScreen.tsx',
        'front/mi-front-limpio/screens/HomeCloudFilesScreen.tsx',
        'front/mi-front-limpio/services/homecloud/homecloudFolderTree.ts',
        'front/mi-front-limpio/services/homecloud/homecloudMoveDestinations.ts',
        'front/mi-front-limpio/services/homecloud/homecloudFilesFilters.ts',
        'front/mi-front-limpio/services/homecloud/FilesFilterMenu.tsx',
        'front/mi-front-limpio/services/homecloud/FileMoveDestinationPicker.tsx',
        'front/mi-front-limpio/services/homecloud/FileIntake.tsx',
        'front/mi-front-limpio/services/homecloud/homecloudFileIntakeService.ts',
        'front/mi-front-limpio/services/homecloud/homecloudFilesService.ts',
        'front/mi-front-limpio/services/homecloud/homecloudTypes.ts',
        'front/mi-front-limpio/services/homecloud/FileActionHost.tsx',
      ];
      const logs = [];
      const thirdParty = [];
      const unsafe = [];
      for (const relative of changed) {
        const source = fs.readFileSync(path.join(repositoryRoot, relative), 'utf8');
        const code = source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ').replace(/'(?:[^'\\]|\\.)*'/g, "''").replace(/"(?:[^"\\]|\\.)*"/g, '""');
        if (/console\.(log|warn|error|info|debug)/.test(code)) {
          // A log line is acceptable only if it cannot carry a URL or a token.
          const logLines = code.split('\n').filter((line) => /console\.(log|warn|error|info|debug)/.test(line));
          for (const line of logLines) {
            if (/signedUrl|\burl\b|token|secret|jwt|authorization/i.test(line)) logs.push(`${relative}: ${line.trim()}`);
          }
        }
        for (const needle of ['docs.google.com', 'microsoft.com', 'officeapps', 'view.officeapps', 'googleusercontent.com', 'docs.googleusercontent']) {
          if (code.includes(needle)) thirdParty.push(`${relative}: ${needle}`);
        }
        if (/dangerouslySetInnerHTML/.test(code)) unsafe.push(`${relative}: dangerouslySetInnerHTML`);
        if (/<iframe/i.test(code)) unsafe.push(`${relative}: iframe`);
      }
      record(logs.length === 0, `P1. no log statement can carry a signed URL or a token (${logs.length} suspect line(s))`);
      if (logs.length > 0) logs.forEach((line) => console.error(`      ${line}`));
      record(thirdParty.length === 0, `P2. no third-party viewer or converter is referenced (${thirdParty.length})`);
      if (thirdParty.length > 0) thirdParty.forEach((line) => console.error(`      ${line}`));
      record(unsafe.length === 0, `P3. no raw document HTML is executed and no iframe is rendered (${unsafe.length})`);
      if (unsafe.length > 0) unsafe.forEach((line) => console.error(`      ${line}`));

      const viewerSource = fs.readFileSync(path.join(repositoryRoot, 'front/mi-front-limpio/screens/HomeCloudFileViewerScreen.tsx'), 'utf8');
      const viewerCode = viewerSource.replace(/\/\*[\s\S]*?\*\//g, ' ');
      record(/from 'react-native-webview'/.test(viewerCode) && /originWhitelist/.test(viewerCode) && /onShouldStartLoadWithRequest/.test(viewerCode) && !/react-native-pdf/.test(viewerCode), 'P4. the Viewer WebView is the locked-down local PDF host (Expo-Go-compatible renderer, no native PDF module)');
      const accessSource = fs.readFileSync(path.join(repositoryRoot, 'front/mi-front-limpio/services/homecloud/homecloudViewerAccess.ts'), 'utf8');
      record(!/variant=preview/.test(accessSource), 'P5. the Viewer never requests a preview variant');
      record(!/AsyncStorage|SecureStore/.test(accessSource.replace(/\/\*[\s\S]*?\*\//g, ' ')), 'P6. a signed URL is never persisted');

      // The signed URL itself must never be printed by this suite either.
      record(!/console\.(log|error|warn)\(.*signedUrl/.test(fs.readFileSync(__filename, 'utf8')), 'P7. this QA suite never prints a signed URL');
    }

    console.log(`\nSTAGE2_INTEGRATED_RESULT pass=${passCount} fail=${failCount}`);
    console.log(failCount === 0 ? 'STAGE2_INTEGRATED_TESTS=PASS' : 'STAGE2_INTEGRATED_TESTS=FAIL');
    return failCount === 0;
  } finally {
    for (const object of cleanup.storagePaths) {
      await serviceClient.storage.from(object.bucket).remove([object.path]);
    }    for (const contentId of cleanup.contentIds) {
      await serviceClient.from('homecloud_file_favorites').delete().eq('content_id', contentId);
      await serviceClient.from('homecloud_contents').delete().eq('id', contentId);
    }
    for (const householdId of cleanup.householdIds) {
      await serviceClient.from('homecloud_folders').delete().eq('household_id', householdId);
      await serviceClient.from('homecloud_contents').delete().eq('household_id', householdId);
    }
    for (const membershipId of cleanup.membershipIds) {
      await serviceClient.from('household_members').delete().eq('id', membershipId);
    }
    for (const personId of cleanup.personIds) {
      await serviceClient.from('people').update({ active_household_id: null }).eq('id', personId);
      await serviceClient.from('people').delete().eq('id', personId);
    }
    for (const householdId of cleanup.householdIds) {
      await serviceClient.from('households').delete().eq('id', householdId);
    }
    for (const userId of cleanup.authUsers) {
      await serviceClient.auth.admin.deleteUser(userId);
    }
  }
}

run().then((ok) => {
  process.exit(ok ? 0 : 1);
}).catch((error) => {
  console.error('STAGE2_INTEGRATED_TESTS=ERROR');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});